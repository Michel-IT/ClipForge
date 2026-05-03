import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ProgressBar } from "./ProgressBar";
import { LogPanel } from "./LogPanel";
import { LogEvent } from "../types";
import { cancelDownload, openDir } from "../api";

export type ModalStatus =
  | { kind: "running"; phaseKey: string; phaseLegacy: string; step?: number; total?: number; percent: number; speed: string; eta: string }
  | { kind: "done"; outputPath: string }
  | { kind: "error"; message: string }
  | { kind: "canceled"; filesRemoved: number };

interface Props {
  isOpen: boolean;
  jobKind: "video" | "audio" | "subs";
  jobId: string | null;
  status: ModalStatus;
  logs: LogEvent[];
  onClose: () => void;
}

export function DownloadModal({ isOpen, jobKind, jobId, status, logs, onClose }: Props) {
  const { t } = useTranslation();
  const [showDetails, setShowDetails] = useState(false);

  // On state transitions: auto-expand on error (show context), auto-collapse
  // on done/canceled (the user no longer cares about the noisy log).
  useEffect(() => {
    if (status.kind === "error") setShowDetails(true);
    else if (status.kind === "done" || status.kind === "canceled") setShowDetails(false);
  }, [status.kind]);

  // Esc closes modal only when finished — don't let the user accidentally
  // dismiss an in-flight download.
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (status.kind === "done" || status.kind === "error" || status.kind === "canceled")) {
        onClose();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, status.kind, onClose]);

  if (!isOpen) return null;

  const headerKey =
    status.kind === "canceled" ? "modal.download.canceledTitle" :
    jobKind === "video" ? "modal.download.titleVideo" :
    jobKind === "audio" ? "modal.download.titleAudio" :
    "modal.download.titleSubs";
  const header = t(headerKey, {
    defaultValue:
      status.kind === "canceled" ? "Canceled" :
      jobKind === "video" ? "Downloading video" :
      jobKind === "audio" ? "Extracting MP3" :
      "Extracting subtitles",
  });

  const handleCancel = async () => {
    if (jobId) await cancelDownload(jobId);
  };

  const handleOpenFolder = async () => {
    if (status.kind === "done" && status.outputPath) {
      // Strip filename to get the folder.
      const sep = status.outputPath.includes("\\") ? "\\" : "/";
      const idx = status.outputPath.lastIndexOf(sep);
      const folder = idx > 0 ? status.outputPath.slice(0, idx) : status.outputPath;
      await openDir(folder).catch(() => {});
    }
  };

  return (
    <div className="modal-overlay download-overlay">
      <div className={`download-modal ${showDetails ? "expanded" : "compact"} download-${status.kind}`}>
        <header className="dm-header">
          {status.kind === "done"     && <span className="dm-icon dm-icon-done">✓</span>}
          {status.kind === "error"    && <span className="dm-icon dm-icon-error">✕</span>}
          {status.kind === "canceled" && <span className="dm-icon dm-icon-canceled">⊘</span>}
          <h2>{header}</h2>
        </header>

        {status.kind === "running" && (
          <>
            <ProgressBar
              percent={status.percent}
              speed={status.speed}
              eta={status.eta}
              status={
                status.step && status.total
                  ? `[${status.step}/${status.total}] ${t(status.phaseKey, { defaultValue: status.phaseLegacy })}`
                  : t(status.phaseKey, { defaultValue: status.phaseLegacy })
              }
              state="running"
            />
            <div className="dm-actions">
              <button onClick={() => setShowDetails(s => !s)} className="dm-toggle">
                {showDetails
                  ? t("modal.download.hideDetails", { defaultValue: "Hide details" })
                  : t("modal.download.showDetails", { defaultValue: "Show details" })}
              </button>
              <button onClick={handleCancel} className="dm-cancel">
                {t("modal.download.cancel", { defaultValue: "Cancel" })}
              </button>
            </div>
          </>
        )}

        {status.kind === "done" && (
          <>
            <p className="dm-path">{status.outputPath}</p>
            <div className="dm-actions">
              <button onClick={() => setShowDetails(s => !s)} className="dm-toggle">
                {showDetails
                  ? t("modal.download.hideDetails", { defaultValue: "Hide details" })
                  : t("modal.download.showDetails", { defaultValue: "Show details" })}
              </button>
              <div style={{ display: "flex", gap: "var(--space-2)" }}>
                <button onClick={handleOpenFolder} className="dm-open">
                  {t("modal.download.openFolder", { defaultValue: "Open folder" })}
                </button>
                <button onClick={onClose} className="modal-accept">
                  {t("modal.download.close", { defaultValue: "Close" })}
                </button>
              </div>
            </div>
          </>
        )}

        {status.kind === "error" && (
          <>
            <p className="dm-error-msg">{status.message}</p>
            <div className="dm-actions">
              <button onClick={() => setShowDetails(s => !s)} className="dm-toggle">
                {showDetails
                  ? t("modal.download.hideDetails", { defaultValue: "Hide details" })
                  : t("modal.download.showDetails", { defaultValue: "Show details" })}
              </button>
              <button onClick={onClose} className="modal-accept">
                {t("modal.download.close", { defaultValue: "Close" })}
              </button>
            </div>
          </>
        )}

        {status.kind === "canceled" && (
          <>
            <p className="dm-canceled-msg">
              {t("modal.download.canceledMsg", {
                count: status.filesRemoved,
                defaultValue: status.filesRemoved === 0
                  ? "Canceled. No partial files to remove."
                  : `Canceled. Removed ${status.filesRemoved} partial file${status.filesRemoved === 1 ? "" : "s"}.`,
              })}
            </p>
            <div className="dm-actions">
              <span />
              <button onClick={onClose} className="modal-accept">
                {t("modal.download.close", { defaultValue: "Close" })}
              </button>
            </div>
          </>
        )}

        {showDetails && <LogPanel lines={logs} />}
      </div>
    </div>
  );
}
