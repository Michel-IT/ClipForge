# Banco di prova, manuale, per la correzione dei sottotitoli via KuramaLab.
#
#   python tauri/scripts/test-subtitle-fix.py <kl_...> [modello]
#
# Serve una chiave vera e costa qualche decimo di millesimo di euro a giro.
# Non gira in CI: e' pensato per rispondere a "questo modello e' ancora buono
# per la correzione?" prima di cambiare i default in SubtitleEnhancer.tsx.
#
# L'ipotesi da verificare: con abbastanza contesto attorno, il modello ricava la
# parola giusta invece di indovinarne una plausibile. Il test precedente dava
# due righe isolate, che e' il caso peggiore possibile.
#
# Gli errori qui sotto imitano quelli veri di Whisper: sono tutti PLAUSIBILI
# FONETICAMENTE, perche' Whisper trascrive quello che sente. Nessun refuso da
# tastiera (lettere scambiate, dita fuori posto): quelli non esistono nell'ASR.
import io, json, sys, os, subprocess

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# (corrotto, verita') per ogni battuta. La verita' serve solo a dare un voto:
# al modello non viene mai mostrata.
CUES = [
    ("Ciaro a tutti e benvenuti su questo canale",
     "Ciao a tutti e benvenuti su questo canale"),
    ("oggi parliamo di una delle mackine piu iconiche degli anni novanta",
     "oggi parliamo di una delle macchine più iconiche degli anni novanta"),
    ("sto parlando ovviamente della boggini diblo",
     "sto parlando ovviamente della Lamborghini Diablo"),
    ("prodotta a santagata bolognese dal millenovecentonovanta",
     "prodotta a Sant'Agata Bolognese dal millenovecentonovanta"),
    ("il motore e un vu dodici da cinque virgola sette litri",
     "il motore è un V12 da cinque virgola sette litri"),
    ("che eroga circa quattrocentonovantadue cavalli",
     "che eroga circa quattrocentonovantadue cavalli"),
    ("la velocita massima superava i trecento venti chilometri orari",
     "la velocità massima superava i trecentoventi chilometri orari"),
    ("il nome diblo viene da un toro da combattimento spagnolo",
     "il nome Diablo viene da un toro da combattimento spagnolo"),
    ("come tradizione per la casa del toro",
     "come tradizione per la casa del toro"),
    ("il desing fu curato da marcello gandini",
     "il design fu curato da Marcello Gandini"),
    ("lo stesso della countack e della miura",
     "lo stesso della Countach e della Miura"),
    ("anche se poi la crisler modifico parecchio il progetto",
     "anche se poi la Chrysler modificò parecchio il progetto"),
    ("le porte a forbice sono rimaste il marcio di fabrica",
     "le porte a forbice sono rimaste il marchio di fabbrica"),
    ("ne furono prodotti circa duemila novecento esemplari",
     "ne furono prodotti circa duemilanovecento esemplari"),
    ("fino al duemila uno quando arrivo la murcielago",
     "fino al duemilauno quando arrivò la Murciélago"),
    ("se il video vi e piaciuto lasciate un like e iscrivetevi",
     "se il video vi è piaciuto lasciate un like e iscrivetevi"),
]

SYSTEM = (
    "You repair subtitle files produced by automatic speech recognition. "
    "The words were transcribed by SOUND, so every error is phonetically close to the intended word: "
    "recover the word that SOUNDS like what is written. "
    "Use the surrounding subtitles as context to identify proper nouns, brands, places and technical terms. "
    "Prefer the phonetically nearest real-world name that fits the topic being discussed. "
    "Fix punctuation, accents and casing. Keep the original language and the speaker's wording. "
    "Return the SRT blocks exactly as given: same cue numbers, same timestamps, same block order, "
    "same number of blocks. Change only the subtitle text. Output nothing but the SRT blocks."
)


def ts(i):
    s = i * 4
    return f"00:00:{s:02d},000 --> 00:00:{s + 3:02d},500"


def build(col):
    return "\n\n".join(f"{i+1}\n{ts(i)}\n{c[col]}" for i, c in enumerate(CUES))


def call(model, system, user, key, max_tokens=2048):
    body = json.dumps({
        "model": model, "temperature": 0.2, "max_tokens": max_tokens, "stream": False,
        "messages": [{"role": "system", "content": system},
                     {"role": "user", "content": user}],
    }, ensure_ascii=False)
    d = os.path.dirname(os.path.abspath(__file__))
    rq, hh, rr = (os.path.join(d, n) for n in ("rq.json", "hh.txt", "rr.json"))
    io.open(rq, "w", encoding="utf-8").write(body)
    subprocess.run([
        "curl", "-s", "-D", hh, "--max-time", "240",
        "-H", f"Authorization: Bearer {key}",
        "-H", "Content-Type: application/json",
        "-H", "X-Client-Name: ClipForge/0.1.4",
        "--data-binary", f"@{rq}",
        "https://api.kuramalab.net/api/v1/chat/completions",
        "-o", rr,
    ], check=True, capture_output=True)
    cost = 0.0
    for line in io.open(hh, encoding="utf-8", errors="replace"):
        if line.lower().startswith("x-credits-charged"):
            cost = float(line.split(":", 1)[1].strip())
    resp = json.load(io.open(rr, encoding="utf-8"))
    ch = resp["choices"][0]
    return ch["message"]["content"], ch.get("finish_reason"), cost


def text_of(block):
    return "\n".join(block.strip().split("\n")[2:]).strip()


def main():
    key = sys.argv[1]
    model = sys.argv[2] if len(sys.argv) > 2 else "gemma4:31b"

    broken, truth = build(0), build(1)
    user = (f"Process these {len(CUES)} SRT blocks and return exactly {len(CUES)} blocks:"
            f"\n\n{broken}")

    out, finish, cost = call(model, SYSTEM, user, key)
    if out is None:
        print(f"{model}: nessun output (finish={finish}, costo {cost:.6f} EUR)")
        return

    got = [b for b in out.replace("\r\n", "\n").split("\n\n") if b.strip()]
    exp = [b for b in truth.split("\n\n") if b.strip()]
    print(f"modello {model} | blocchi attesi {len(exp)} ottenuti {len(got)} "
          f"| finish={finish} | costo {cost:.6f} EUR\n")

    if len(got) != len(exp):
        print("!! numero di blocchi diverso: in ClipForge questo scatta la protezione")
        return

    hits = 0
    for i, (g, e) in enumerate(zip(got, exp)):
        gt, et = text_of(g), text_of(e)
        ok = gt.lower() == et.lower()
        hits += ok
        if not ok:
            print(f"  {i+1:>2} ATTESO : {et}")
            print(f"     OTTENUTO: {gt}")
    print(f"\nbattute identiche alla verita': {hits}/{len(exp)}")


if __name__ == "__main__":
    main()
