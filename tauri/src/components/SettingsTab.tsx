import { useEffect, useState } from "react";
import { useTranslation, Trans } from "react-i18next";
import { COOKIE_BROWSERS, FfmpegStatus, Theme, UpdateInfo } from "../types";
import { ffmpegStatus } from "../api";
import { LanguagePicker } from "./LanguagePicker";

interface Props {
  cookieBrowser: string;
  onCookieBrowserChange: (b: string) => void;
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  playlist: boolean;
  onPlaylistChange: (v: boolean) => void;
  autoPaste: boolean;
  onAutoPasteChange: (v: boolean) => void;
  autoUpdateCheck: boolean;
  onAutoUpdateCheckChange: (v: boolean) => void;
  onCheckUpdatesNow: () => Promise<UpdateInfo | null>;
  onLangChange: (lang: string) => void;
  onShowDisclaimer: () => void;
}

const THEMES: Theme[] = ["dark", "light", "system"];

export function SettingsTab({
  cookieBrowser, onCookieBrowserChange,
  theme, onThemeChange,
  playlist, onPlaylistChange,
  autoPaste, onAutoPasteChange,
  autoUpdateCheck, onAutoUpdateCheckChange,
  onCheckUpdatesNow,
  onLangChange, onShowDisclaimer,
}: Props) {
  const { t } = useTranslation();
  const [ffmpeg, setFfmpeg] = useState<FfmpegStatus | null>(null);
  const [updateStatus, setUpdateStatus] = useState<
    { kind: "idle" } | { kind: "checking" } | { kind: "uptodate"; version: string } | { kind: "available"; version: string } | { kind: "error" }
  >({ kind: "idle" });

  useEffect(() => {
    ffmpegStatus().then(setFfmpeg).catch(() => setFfmpeg({ available: false, path: "" }));
  }, []);

  const handleCheckNow = async () => {
    setUpdateStatus({ kind: "checking" });
    try {
      const info = await onCheckUpdatesNow();
      if (!info) {
        setUpdateStatus({ kind: "error" });
        return;
      }
      setUpdateStatus(
        info.available
          ? { kind: "available", version: info.latestVersion }
          : { kind: "uptodate", version: info.currentVersion }
      );
    } catch {
      setUpdateStatus({ kind: "error" });
    }
  };

  return (
    <div className="tab-content settings-tab">
      <div className="settings-row">
        <label>{t("settings.theme", { defaultValue: "Theme:" })}</label>
        <select
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as Theme)}
        >
          {THEMES.map((th) => (
            <option key={th} value={th}>
              {t(`settings.themeOption.${th}`, { defaultValue: th[0].toUpperCase() + th.slice(1) })}
            </option>
          ))}
        </select>
        <span className={`ffmpeg-status ${ffmpeg?.available ? "ok" : "missing"}`}>
          {ffmpeg === null
            ? "…"
            : ffmpeg.available
              ? t("ffmpeg.bundled", { defaultValue: "ffmpeg: bundled" })
              : t("ffmpeg.missing", { defaultValue: "ffmpeg: missing" })}
        </span>
      </div>

      <div className="settings-row">
        <label>{t("settings.language")}</label>
        <LanguagePicker onChange={onLangChange} />
      </div>

      <div className="settings-row">
        <label>{t("settings.cookieBrowser.label")}</label>
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
      </div>
      {cookieBrowser && (
        <p className="settings-note">
          <Trans
            i18nKey="settings.cookieBrowser.warning"
            values={{ browser: cookieBrowser }}
            components={{ strong: <strong /> }}
          />
        </p>
      )}

      <div className="settings-row">
        <label>
          <input
            type="checkbox"
            checked={playlist}
            onChange={(e) => onPlaylistChange(e.target.checked)}
          />
          {t("settings.playlist", { defaultValue: "Download whole playlist (when URL contains &list=)" })}
        </label>
      </div>

      <div className="settings-row">
        <label>
          <input
            type="checkbox"
            checked={autoPaste}
            onChange={(e) => onAutoPasteChange(e.target.checked)}
          />
          {t("settings.autoPaste", { defaultValue: "Auto-paste URL from clipboard at startup" })}
        </label>
      </div>

      <div className="settings-row">
        <label>
          <input
            type="checkbox"
            checked={autoUpdateCheck}
            onChange={(e) => onAutoUpdateCheckChange(e.target.checked)}
          />
          {t("settings.autoUpdateCheck", { defaultValue: "Check for updates at startup" })}
        </label>
        <button onClick={handleCheckNow} disabled={updateStatus.kind === "checking"}>
          {updateStatus.kind === "checking"
            ? t("settings.update.checking", { defaultValue: "Checking…" })
            : t("settings.update.checkNow", { defaultValue: "Check now" })}
        </button>
        {updateStatus.kind === "uptodate" && (
          <span className="settings-update-msg ok">
            {t("settings.update.upToDate", {
              defaultValue: "Up to date (v{{version}}).",
              version: updateStatus.version,
            })}
          </span>
        )}
        {updateStatus.kind === "available" && (
          <span className="settings-update-msg new">
            {t("settings.update.availableShort", {
              defaultValue: "v{{version}} available — see banner.",
              version: updateStatus.version,
            })}
          </span>
        )}
        {updateStatus.kind === "error" && (
          <span className="settings-update-msg err">
            {t("settings.update.error", { defaultValue: "Check failed." })}
          </span>
        )}
      </div>

      <div className="settings-row">
        <label>{t("settings.legal", { defaultValue: "Legal:" })}</label>
        <button onClick={onShowDisclaimer}>
          {t("settings.viewDisclaimer", { defaultValue: "View legal disclaimer" })}
        </button>
      </div>
    </div>
  );
}
