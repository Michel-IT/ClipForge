import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getCurrentWindow, LogicalSize, currentMonitor } from "@tauri-apps/api/window";
import { ProgressBar } from "./ProgressBar";
import { LogPanel } from "./LogPanel";
import { LogEvent } from "../types";
import { cancelDownload, openDir } from "../api";

export type DockStatus =
  | { kind: "running"; phaseKey: string; phaseLegacy: string; step?: number; total?: number; percent: number; speed: string; eta: string }
  | { kind: "done"; outputPath: string }
  | { kind: "error"; message: string; errorKey?: string }
  | { kind: "canceled"; filesRemoved: number };

interface Props {
  isOpen: boolean;
  jobKind: "video" | "audio" | "subs";
  jobId: string | null;
  status: DockStatus;
  logs: LogEvent[];
  engineNote?: string;
  onClose: () => void;
}

// Height the console block adds to the dock, in logical pixels. Kept in sync
// with `.dock-console` in App.css: the window grows by exactly this much when
// the console opens, so the layout never has to produce a scrollbar to fit it.
const CONSOLE_H = 188;

// Grow/shrink the OS window instead of squeezing the console into the existing
// height — the app has no page-level scrolling by design, so revealing the
// console has to come out of the window, not out of the content.
async function resizeWindowBy(delta: number) {
  try {
    const win = getCurrentWindow();
    const [size, factor] = await Promise.all([
      win.innerSize(),
      win.scaleFactor(),
    ]);
    const logical = size.toLogical(factor);
    let target = logical.height + delta;

    // Never grow past the monitor's usable height, or the dock would end up
    // under the taskbar with the buttons unreachable.
    if (delta > 0) {
      const mon = await currentMonitor();
      if (mon) {
        const maxH = mon.size.toLogical(mon.scaleFactor).height - 80;
        target = Math.min(target, maxH);
      }
    }
    await win.setSize(new LogicalSize(logical.width, Math.round(target)));
  } catch {
    // Pure-browser dev (vite without Tauri): no window to resize, and the
    // console just expands in place. Not worth surfacing.
  }
}

export function DownloadDock({ isOpen, jobKind, jobId, status, logs, engineNote, onClose }: Props) {
  const { t } = useTranslation();
  const [showConsole, setShowConsole] = useState(false);
  const [copied, setCopied] = useState(false);
  // The window resize is a side effect of *changing* the toggle, so it must not
  // fire on mount or on re-render — only on a real transition.
  const prevShown = useRef(showConsole);

  useEffect(() => {
    if (prevShown.current === showConsole) return;
    prevShown.current = showConsole;
    resizeWindowBy(showConsole ? CONSOLE_H : -CONSOLE_H);
  }, [showConsole]);

  // Give back the window height when the dock itself goes away, otherwise the
  // window keeps the console's extra rows after the job is dismissed.
  useEffect(() => {
    if (isOpen) return;
    if (!prevShown.current) return;
    prevShown.current = false;
    setShowConsole(false);
    resizeWindowBy(-CONSOLE_H);
  }, [isOpen]);

  // Esc dismisses a finished job. It never interrupts a running one — the dock
  // is not blocking, so there is nothing to escape from mid-download.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (status.kind === "done" || status.kind === "error" || status.kind === "canceled") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, status.kind, onClose]);

  const handleCopyLog = useCallback(async () => {
    const text = logs.map((l) => l.line).join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* clipboard blocked — nothing useful to say */ }
  }, [logs]);

  if (!isOpen) return null;

  const handleCancel = async () => { if (jobId) await cancelDownload(jobId); };

  const handleOpenFolder = async () => {
    if (status.kind !== "done" || !status.outputPath) return;
    const sep = status.outputPath.includes("\\") ? "\\" : "/";
    const idx = status.outputPath.lastIndexOf(sep);
    await openDir(idx > 0 ? status.outputPath.slice(0, idx) : status.outputPath).catch(() => {});
  };

  const title = t(
    status.kind === "canceled" ? "modal.download.canceledTitle"
      : jobKind === "video" ? "modal.download.titleVideo"
      : jobKind === "audio" ? "modal.download.titleAudio"
      : "modal.download.titleSubs",
  );

  const toggleLabel = showConsole
    ? t("modal.download.hideDetails")
    : t("modal.download.showDetails");

  return (
    <div className={`download-dock dock-${status.kind}`} role="region" aria-label={title}>
      <div className="dock-row">
        <div className="dock-id">
          {status.kind === "done"     && <span className="dock-icon dock-icon-done">✓</span>}
          {status.kind === "error"    && <span className="dock-icon dock-icon-error">✕</span>}
          {status.kind === "canceled" && <span className="dock-icon dock-icon-canceled">⊘</span>}
          <span className="dock-title">{title}</span>
        </div>
        <div className="dock-actions">
          <button className="dock-toggle" onClick={() => setShowConsole((s) => !s)} aria-expanded={showConsole}>
            <span className="dock-caret" aria-hidden="true">{showConsole ? "▾" : "▸"}</span>
            {toggleLabel}
          </button>
          {status.kind === "running" && (
            <button className="dock-cancel" onClick={handleCancel}>{t("modal.download.cancel")}</button>
          )}
          {status.kind === "done" && (
            <button className="dock-open" onClick={handleOpenFolder}>{t("modal.download.openFolder")}</button>
          )}
          {status.kind !== "running" && (
            <button className="dock-close" onClick={onClose}>{t("modal.download.close")}</button>
          )}
        </div>
      </div>

      {status.kind === "running" && (
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
      )}

      {status.kind === "done" && <p className="dock-path">{status.outputPath}</p>}

      {status.kind === "error" && (
        <p className="dock-error">
          {/* Headline is translated when the backend named the failure; the raw
              text stays in the console, where it is actually diagnosable. */}
          {status.errorKey ? t(status.errorKey, { defaultValue: status.message }) : status.message}
        </p>
      )}

      {status.kind === "canceled" && (
        <p className="dock-canceled">
          {t("modal.download.canceledMsg", { count: status.filesRemoved })}
        </p>
      )}

      {showConsole && (
        <div className="dock-console">
          <LogPanel lines={logs} />
          <div className="dock-console-foot">
            <span className="dock-engine">{engineNote}</span>
            <button className="dock-copy" onClick={handleCopyLog} disabled={logs.length === 0}>
              {copied ? t("log.copied") : t("log.copy")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
