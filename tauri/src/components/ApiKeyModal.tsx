import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { kuramaVerify } from "../api";

const REGISTER_URL = "https://api.kuramalab.net/register";
const KEYS_URL = "https://api.kuramalab.net/dashboard/api-keys";

interface Props {
  initialKey: string;
  onSave: (key: string) => void;
  onClose: () => void;
}

/**
 * Guided setup for the KuramaLab key. The steps are numbered because they are a
 * real sequence performed in another application — the user leaves ClipForge,
 * does something on a website, and comes back with a string to paste.
 */
export function ApiKeyModal({ initialKey, onSave, onClose }: Props) {
  const { t } = useTranslation();
  const [key, setKey] = useState(initialKey);
  const [state, setState] = useState<"idle" | "checking" | "ok" | "bad">("idle");
  const [balance, setBalance] = useState<number | null>(null);
  const [detail, setDetail] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Keys are `kl_` + 48 hex. Catching the shape locally avoids spending a round
  // trip (and a confusing 401) on an obvious paste mistake.
  const looksValid = /^kl_[0-9a-f]{48}$/i.test(key.trim());

  const verify = async () => {
    setState("checking");
    setDetail("");
    try {
      const acc = await kuramaVerify(key.trim());
      setState("ok");
      setBalance(acc.balance >= 0 ? acc.balance : null);
    } catch (e) {
      setState("bad");
      const raw = String(e);
      setDetail(t(raw, { defaultValue: raw }));
    }
  };

  const save = () => { onSave(key.trim()); onClose(); };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal apikey-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("apikey.title")}</h2>
        <p className="apikey-lede">{t("apikey.lede")}</p>

        <ol className="apikey-steps">
          <li>
            <span>{t("apikey.step1")}</span>
            <button className="link-btn" onClick={() => openExternal(REGISTER_URL)}>
              {REGISTER_URL}
            </button>
          </li>
          <li>
            <span>{t("apikey.step2")}</span>
            <button className="link-btn" onClick={() => openExternal(KEYS_URL)}>
              {KEYS_URL}
            </button>
          </li>
          <li><span>{t("apikey.step3")}</span></li>
          <li><span>{t("apikey.step4")}</span></li>
        </ol>

        <div className="apikey-field">
          <input
            type="text"
            value={key}
            spellCheck={false}
            autoFocus
            placeholder="kl_…"
            onChange={(e) => { setKey(e.target.value); setState("idle"); }}
            onKeyDown={(e) => { if (e.key === "Enter" && looksValid) void verify(); }}
          />
          <button onClick={verify} disabled={!looksValid || state === "checking"}>
            {state === "checking" ? t("apikey.checking") : t("apikey.verify")}
          </button>
        </div>

        <p className={`apikey-state key-${state}`}>
          {key.trim() && !looksValid && t("apikey.badShape")}
          {state === "ok" && (balance !== null
            ? t("apikey.okBalance", { balance: balance.toFixed(2) })
            : t("apikey.ok"))}
          {state === "bad" && (detail || t("apikey.bad"))}
        </p>

        <div className="modal-actions">
          <button onClick={onClose}>{t("modal.download.close")}</button>
          {/* Saving an unverified key is allowed: the check needs the network,
              and refusing to store it offline would be a dead end. */}
          <button className="modal-accept" onClick={save} disabled={!looksValid}>
            {t("apikey.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
