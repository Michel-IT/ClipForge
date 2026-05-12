import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { downloadUpdate, onUpdateDownloadProgress, revealInFolder } from "../api";
import { UpdateInfo } from "../types";

interface Props {
  info: UpdateInfo;
  onDismiss: () => void;
}

type Phase =
  | { kind: "idle" }
  | { kind: "downloading"; percent: number }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string };

// Non-blocking strip shown when the GitHub API reports a newer tauri-v* release.
// Half-auto flow: click Download → backend streams the OS-specific asset into
// %TEMP%\ClipForge-update\, banner shows progress, then offers to reveal the
// installer in the file manager. User quits ClipForge manually and runs the
// installer. No auto-replace, no signing keys required.
export function UpdateBanner({ info, onDismiss }: Props) {
  const { t } = useTranslation();
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });

  useEffect(() => {
    if (phase.kind !== "downloading") return;
    let unlisten: (() => void) | undefined;
    onUpdateDownloadProgress((e) => setPhase({ kind: "downloading", percent: e.percent }))
      .then((un) => { unlisten = un; });
    return () => { unlisten?.(); };
  }, [phase.kind]);

  const startDownload = async () => {
    const url = info.directAssetUrl;
    if (!url) {
      // No OS-specific asset → fall back to opening the GitHub release page.
      openExternal(info.htmlUrl);
      return;
    }
    setPhase({ kind: "downloading", percent: 0 });
    try {
      const path = await downloadUpdate(url);
      setPhase({ kind: "done", path });
    } catch (e: any) {
      setPhase({ kind: "error", message: e?.message ?? String(e) });
    }
  };

  return (
    <div className="update-banner" role="status">
      {phase.kind === "idle" && (
        <>
          <span className="update-banner-text">
            {t("update.available", {
              defaultValue: "Version {{latest}} available (you are on {{current}}).",
              latest: info.latestVersion,
              current: info.currentVersion,
            })}
          </span>
          <button className="update-banner-action" onClick={startDownload}>
            {t("update.download", { defaultValue: "Download" })}
          </button>
        </>
      )}

      {phase.kind === "downloading" && (
        <>
          <span className="update-banner-text">
            {t("update.downloading", {
              defaultValue: "Downloading… {{percent}}%",
              percent: phase.percent.toFixed(0),
            })}
          </span>
          <div className="update-banner-progress" aria-hidden>
            <div className="update-banner-progress-fill" style={{ width: `${phase.percent}%` }} />
          </div>
        </>
      )}

      {phase.kind === "done" && (
        <>
          <span className="update-banner-text">
            ✓ {t("update.ready", {
              defaultValue: "Installer downloaded. Quit ClipForge and run it.",
            })}
          </span>
          <button className="update-banner-action" onClick={() => revealInFolder(phase.path)}>
            {t("update.openFolder", { defaultValue: "Open folder" })}
          </button>
        </>
      )}

      {phase.kind === "error" && (
        <span className="update-banner-text update-banner-text-error">
          {t("update.error", { defaultValue: "Download failed: {{message}}", message: phase.message })}
        </span>
      )}

      <button
        className="update-banner-dismiss"
        onClick={onDismiss}
        aria-label={t("update.dismiss", { defaultValue: "Dismiss" })}
      >
        ✕
      </button>
    </div>
  );
}
