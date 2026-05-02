import { useTranslation, Trans } from "react-i18next";
import { COOKIE_BROWSERS } from "../types";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  cookieBrowser: string;
  onCookieBrowserChange: (b: string) => void;
  onLangChange: (lang: string) => void;
}

export function SettingsPanel({ cookieBrowser, onCookieBrowserChange, onLangChange }: Props) {
  const { t } = useTranslation();
  return (
    <details className="settings-panel">
      <summary>{t("settings.title")}</summary>
      <div className="settings-body">
        <label>
          {t("settings.language")}
          <LanguagePicker onChange={onLangChange} />
        </label>
        <label>
          {t("settings.cookieBrowser.label")}
          <select
            value={cookieBrowser}
            onChange={(e) => onCookieBrowserChange(e.target.value)}
          >
            {COOKIE_BROWSERS.map((b) => (
              <option key={b || "none"} value={b}>
                {b ? b[0].toUpperCase() + b.slice(1) : t("settings.cookieBrowser.none")}
              </option>
            ))}
          </select>
        </label>
        {cookieBrowser && (
          <p className="settings-note">
            <Trans
              i18nKey="settings.cookieBrowser.warning"
              values={{ browser: cookieBrowser }}
              components={{ strong: <strong /> }}
            />
          </p>
        )}
      </div>
    </details>
  );
}
