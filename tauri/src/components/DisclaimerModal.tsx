import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getDisclaimer } from "../api";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  onAccept: () => void;
  onLangChange: (lang: string) => void;
}

// Mirror of the Python flow (clipforge.py:_show_disclaimer): full-screen modal
// shown at every launch; user must scroll to bottom and click Accept before
// the main UI is unlocked. Acceptance is per-session, not persisted.
export function DisclaimerModal({ onAccept, onLangChange }: Props) {
  const { t } = useTranslation();
  const [text, setText] = useState<string>(t("modal.disclaimer.loading"));
  const [scrolled, setScrolled] = useState(false);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    getDisclaimer()
      .then(setText)
      .catch((e) => setText(t("modal.disclaimer.loadError", { error: String(e) })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleScroll = () => {
    const el = bodyRef.current;
    if (!el) return;
    const reachedBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 4;
    if (reachedBottom) setScrolled(true);
  };

  const decline = async () => {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().close();
  };

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{t("modal.disclaimer.title")}</h2>
        <div className="modal-lang">
          <span>{t("modal.disclaimer.languageLabel")}</span>
          <LanguagePicker onChange={onLangChange} />
        </div>
        <div className="modal-body" ref={bodyRef} onScroll={handleScroll}>
          <pre>{text}</pre>
        </div>
        <div className="modal-actions">
          <button onClick={decline} className="modal-decline">
            {t("modal.disclaimer.disagree")}
          </button>
          <button
            onClick={onAccept}
            disabled={!scrolled}
            title={scrolled ? "" : t("modal.disclaimer.scrollHint")}
            className="modal-accept"
          >
            {t("modal.disclaimer.agree")}
          </button>
        </div>
      </div>
    </div>
  );
}
