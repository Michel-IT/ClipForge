import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useTranslation } from "react-i18next";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  onLangChange: (lang: string) => void;
}

export function Titlebar({ onLangChange }: Props) {
  const { t } = useTranslation();
  const [maxed, setMaxed] = useState(false);
  const win = getCurrentWindow();

  useEffect(() => {
    let unlisten: (() => void) | null = null;
    win.onResized(async () => setMaxed(await win.isMaximized()))
      .then((u) => { unlisten = u; });
    win.isMaximized().then(setMaxed);
    return () => { if (unlisten) unlisten(); };
  }, []);

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-left" data-tauri-drag-region>
        <img src="/logo.png" className="titlebar-logo" alt="" data-tauri-drag-region />
        <span className="titlebar-title">{t("app.title")}</span>
      </div>
      <div className="titlebar-right">
        <LanguagePicker onChange={onLangChange} compact />
        <button
          className="tb-btn"
          onClick={() => win.minimize()}
          aria-label={t("titlebar.minimize")}
          title={t("titlebar.minimize")}
        >
          —
        </button>
        <button
          className="tb-btn"
          onClick={() => win.toggleMaximize()}
          aria-label={t(maxed ? "titlebar.restore" : "titlebar.maximize")}
          title={t(maxed ? "titlebar.restore" : "titlebar.maximize")}
        >
          {maxed ? "❐" : "☐"}
        </button>
        <button
          className="tb-btn tb-close"
          onClick={() => win.close()}
          aria-label={t("titlebar.close")}
          title={t("titlebar.close")}
        >
          ✕
        </button>
      </div>
    </div>
  );
}
