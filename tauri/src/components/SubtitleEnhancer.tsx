import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openFileDialog } from "@tauri-apps/plugin-dialog";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { kuramaEnhance, kuramaModels, kuramaVerify, onKuramaProgress, openDir } from "../api";
import { EnhanceResult } from "../types";
import { ApiKeyModal } from "./ApiKeyModal";

const PRICING_URL = "https://api.kuramalab.net/pricing";

/** Defaults recommended by the API for each task. The full catalogue is loaded
 *  at runtime — prices and availability change, so nothing is hardcoded beyond
 *  these starting points. */
const SUGGESTED: Record<string, string> = {
  fix: "gemma4:31b",
  translate: "qwen3.5:397b",
  summary: "deepseek-v4-flash:0731",
};

interface Props {
  apiKey: string;
  model: string;
  targetLang: string;
  onApiKeyChange: (k: string) => void;
  onModelChange: (m: string) => void;
  onTargetLangChange: (l: string) => void;
}

type Mode = "fix" | "translate" | "summary";

/**
 * Sends a subtitle file to the KuramaLab hub to be repaired, translated or
 * summarised. Whisper transcribes phonetically and mangles proper nouns, which
 * a language model fixes well — but the subtitles are the user's content, so
 * nothing leaves the machine without an explicit press here.
 */
export function SubtitleEnhancer({
  apiKey, model, targetLang,
  onApiKeyChange, onModelChange, onTargetLangChange,
}: Props) {
  const { t } = useTranslation();
  const [srtPath, setSrtPath] = useState("");
  const [mode, setMode] = useState<Mode>("fix");
  const [models, setModels] = useState<string[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [keyState, setKeyState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [progress, setProgress] = useState<{ done: number; total: number; cost: number } | null>(null);
  const [result, setResult] = useState<EnhanceResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [keyModal, setKeyModal] = useState(false);

  useEffect(() => {
    let un: (() => void) | undefined;
    onKuramaProgress((p) => setProgress({ done: p.done, total: p.total, cost: p.cost_eur }))
      .then((f) => { un = f; })
      .catch(() => {});
    return () => { un?.(); };
  }, []);

  // Catalogue is readable without a key, so the model list is populated even
  // before the user has signed up.
  useEffect(() => {
    kuramaModels(apiKey || undefined)
      .then((raw) => {
        const parsed = JSON.parse(raw);
        const list: string[] = (parsed.data ?? parsed.models ?? parsed ?? [])
          .map((m: unknown) => (typeof m === "string" ? m : (m as { id?: string; name?: string }).id ?? (m as { name?: string }).name))
          .filter(Boolean);
        if (list.length) setModels(list);
      })
      .catch(() => { /* offline or shape changed — keep the suggested defaults */ });
  }, [apiKey]);

  const verify = useCallback(async (key: string) => {
    if (!key.trim()) { setKeyState("idle"); setBalance(null); return; }
    setKeyState("checking");
    try {
      // GET /me is free, so checking on every paste costs the user nothing.
      const acc = await kuramaVerify(key.trim());
      setKeyState("ok");
      setBalance(acc.balance >= 0 ? acc.balance : null);
    } catch {
      setKeyState("bad");
      setBalance(null);
    }
  }, []);

  const pickFile = async () => {
    const picked = await openFileDialog({
      multiple: false,
      filters: [{ name: "Subtitles", extensions: ["srt", "vtt"] }],
    });
    if (typeof picked === "string") { setSrtPath(picked); setResult(null); setError(null); }
  };

  const run = async () => {
    setError(null); setResult(null); setProgress(null);
    try {
      const r = await kuramaEnhance({
        apiKey: apiKey.trim(),
        srtPath,
        mode,
        targetLang: targetLang.trim() || "English",
        model: model || SUGGESTED[mode],
      });
      setResult(r);
    } catch (e) {
      // Rust hands back a translation key for the documented failures and a raw
      // message for anything else; t() falls through when it is not a key.
      const raw = String(e);
      setError(t(raw, { defaultValue: raw }));
    } finally {
      setProgress(null);
    }
  };

  const hasKey = apiKey.trim().length > 0;
  const busy = progress !== null;

  return (
    <section className="card enhancer">
      <h3 className="card-title">{t("enhance.title")}</h3>

      {!hasKey && (
        <p className="enhance-lede">{t("enhance.guide.lede")}</p>
      )}

      <div className="settings-row">
        <label htmlFor="kurama-key">{t("enhance.apiKey")}</label>
        <input
          id="kurama-key"
          type="password"
          value={apiKey}
          placeholder="kl_…"
          onChange={(e) => { onApiKeyChange(e.target.value); setKeyState("idle"); }}
          onBlur={(e) => verify(e.target.value)}
        />
        <span className={`key-state key-${keyState}`}>
          {keyState === "checking" && t("enhance.key.checking")}
          {keyState === "ok" && (balance !== null
            ? t("enhance.key.okBalance", { balance: balance.toFixed(2) })
            : t("enhance.key.ok"))}
          {keyState === "bad" && t("enhance.key.bad")}
        </span>
        <button className="link-btn" onClick={() => setKeyModal(true)}>
          {hasKey ? t("enhance.changeKey") : t("enhance.setupKey")}
        </button>
      </div>

      <div className="settings-row">
        <label>{t("enhance.file")}</label>
        <span className="enhance-path" title={srtPath}>{srtPath || t("enhance.noFile")}</span>
        <button onClick={pickFile}>{t("enhance.browse")}</button>
      </div>

      <div className="settings-row">
        <label htmlFor="kurama-mode">{t("enhance.modeLabel")}</label>
        <select
          id="kurama-mode"
          value={mode}
          onChange={(e) => {
            const m = e.target.value as Mode;
            setMode(m);
            onModelChange(SUGGESTED[m]);
          }}
        >
          <option value="fix">{t("enhance.modes.fix")}</option>
          <option value="translate">{t("enhance.modes.translate")}</option>
          <option value="summary">{t("enhance.modes.summary")}</option>
        </select>
      </div>

      {mode !== "fix" && (
        <div className="settings-row">
          <label htmlFor="kurama-lang">{t("enhance.targetLang")}</label>
          <input
            id="kurama-lang"
            type="text"
            value={targetLang}
            placeholder={t("enhance.targetLangPlaceholder")}
            onChange={(e) => onTargetLangChange(e.target.value)}
          />
        </div>
      )}

      <div className="settings-row">
        <label htmlFor="kurama-model">{t("enhance.model")}</label>
        <select id="kurama-model" value={model} onChange={(e) => onModelChange(e.target.value)}>
          {(models.length ? models : Object.values(SUGGESTED)).map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <button className="link-btn" onClick={() => openExternal(PRICING_URL)}>
          {t("enhance.pricing")}
        </button>
      </div>

      <p className="enhance-privacy">{t("enhance.privacy")}</p>

      <div className="tab-actions">
        <button onClick={run} disabled={!hasKey || !srtPath || busy}>
          {busy
            ? t("enhance.running", { done: progress!.done, total: progress!.total })
            : t("enhance.start")}
        </button>
        {result && (
          <button onClick={() => openDir(result.output_path.replace(/[\\/][^\\/]+$/, ""))}>
            {t("modal.download.openFolder")}
          </button>
        )}
      </div>

      {busy && (
        <p className="enhance-cost">
          {t("enhance.spent", { cost: progress!.cost.toFixed(4) })}
        </p>
      )}
      {result && (
        <p className="enhance-done">
          {t("enhance.done", { path: result.output_path, cost: result.cost_eur.toFixed(4) })}
        </p>
      )}
      {error && <p className="enhance-error">{error}</p>}

      {keyModal && (
        <ApiKeyModal
          initialKey={apiKey}
          onSave={onApiKeyChange}
          onClose={() => setKeyModal(false)}
        />
      )}
    </section>
  );
}
