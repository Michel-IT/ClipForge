import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { downloadSubs, cancelDownload, transcribe, whisperCheck, preflightInstall, gpuStatus } from "../api";
import { GpuStatus, PlaylistSelectionResult, VideoInfo } from "../types";

/** Whisper model sizes, smallest first. Bigger is more accurate and slower; on
 *  a CPU-only torch build the jump from `small` up is steep.
 *
 *  The download column matters: Whisper fetches the weights itself the first
 *  time a given size is used, so picking `large` means a ~2.9 GB download
 *  before anything is transcribed. Showing it here stops that being a surprise. */
const WHISPER_MODELS = [
  { id: "tiny", size: "72 MB" },
  { id: "base", size: "139 MB" },
  { id: "small", size: "462 MB" },
  { id: "medium", size: "1.5 GB" },
  { id: "large", size: "2.9 GB" },
] as const;

interface Props {
  url: string;
  outDir: string;
  langs: string;
  playlist: boolean;
  cookieBrowser: string;
  activeJobId: string | null;
  videoInfo: VideoInfo | null;
  onLangsChange: (l: string) => void;
  onPlaylistChange: (v: boolean) => void;
  onJobStarted: (jobId: string) => void;
  onRequestPlaylistSelection: (url: string) => Promise<PlaylistSelectionResult>;
  disabled: boolean;
}

export function SubsTab({
  url,
  outDir,
  langs,
  playlist,
  cookieBrowser,
  activeJobId,
  videoInfo,
  onLangsChange,
  onPlaylistChange,
  onJobStarted,
  onRequestPlaylistSelection,
  disabled,
}: Props) {
  const { t } = useTranslation();
  // "existing" pulls subtitles the platform already has (fast, exact, but often
  // absent); "whisper" transcribes the audio locally (always possible, slower).
  const [source, setSource] = useState<"existing" | "whisper">("existing");
  const [model, setModel] = useState<string>("small");
  const [setup, setSetup] = useState<"checking" | "installing" | null>(null);
  const [blocked, setBlocked] = useState<string[]>([]);
  const [gpu, setGpu] = useState<GpuStatus | null>(null);
  const [gpuBusy, setGpuBusy] = useState(false);

  // Only probed when the transcription path is actually on screen: it shells
  // out to nvidia-smi and python, which is wasted work for someone who only
  // downloads videos.
  useEffect(() => {
    if (source !== "whisper" || gpu) return;
    gpuStatus().then(setGpu).catch(() => {});
  }, [source, gpu]);

  const enableGpu = async () => {
    setGpuBusy(true);
    try {
      await preflightInstall("cuda");
      setGpu(await gpuStatus());
    } catch { /* surfaced by the re-check below staying upgradable */ }
    setGpuBusy(false);
  };

  /**
   * Whisper is installed the first time someone actually asks for it, not at
   * launch: it is an opt-in feature behind a large Python download, and most
   * users only ever download videos. Returns false when the toolchain cannot
   * be completed, so the caller does not start a job that would fail.
   */
  const ensureWhisper = async (): Promise<boolean> => {
    setSetup("checking");
    setBlocked([]);
    let report = await whisperCheck();

    if (!report.ok) {
      const missing = report.deps.filter((d) => d.required && !d.found);
      // Python and pip cannot be bootstrapped for the user; anything else with
      // a recipe is installed straight away, as agreed.
      const manual = missing.filter((d) => !d.installable);
      if (manual.length > 0) {
        setBlocked(manual.map((d) => d.id));
        setSetup(null);
        return false;
      }
      setSetup("installing");
      for (const dep of missing) {
        try {
          await preflightInstall(dep.id);
        } catch {
          setBlocked([dep.id]);
          setSetup(null);
          return false;
        }
      }
      // Re-check rather than trusting pip's exit code: what matters is whether
      // the executable resolves now.
      report = await whisperCheck();
      if (!report.ok) {
        setBlocked(report.deps.filter((d) => d.required && !d.found).map((d) => d.id));
        setSetup(null);
        return false;
      }
    }
    setSetup(null);
    return true;
  };

  const start = async () => {
    if (source === "whisper") {
      if (!(await ensureWhisper())) return;
      const { job_id } = await transcribe({
        url,
        outDir,
        model,
        // A single language code means "don't auto-detect"; a list is only
        // meaningful for the download path, so anything else is left to Whisper.
        language: langs.includes(",") ? undefined : langs.trim() || undefined,
        durationSecs: videoInfo?.duration ?? undefined,
        cookiesBrowser: cookieBrowser || undefined,
      });
      onJobStarted(job_id);
      return;
    }

    let playlistItems: string | undefined;
    if (playlist) {
      const r = await onRequestPlaylistSelection(url);
      if (r.kind === "cancel") return;
      if (r.kind === "items") playlistItems = r.value;
    }
    const { job_id } = await downloadSubs({
      url,
      langs,
      outDir,
      cookiesBrowser: cookieBrowser || undefined,
      playlist,
      playlistItems,
    });
    onJobStarted(job_id);
  };

  const cancel = async () => {
    if (activeJobId) await cancelDownload(activeJobId);
  };

  return (
    <div className="tab-content">
      <label>
        {t("subs.source")}
        <select value={source} onChange={(e) => setSource(e.target.value as typeof source)}>
          <option value="existing">{t("subs.sourceExisting")}</option>
          <option value="whisper">{t("subs.sourceWhisper")}</option>
        </select>
      </label>

      <label>
        {source === "whisper" ? t("subs.language") : t("subs.languages")}
        <input
          type="text"
          value={langs}
          onChange={(e) => onLangsChange(e.target.value)}
          placeholder={t("subs.langsPlaceholder")}
        />
      </label>

      {source === "whisper" && (
        <label>
          {t("subs.model")}
          <select value={model} onChange={(e) => setModel(e.target.value)}>
            {WHISPER_MODELS.map((m) => (
              <option key={m.id} value={m.id}>{`${m.id} — ${m.size}`}</option>
            ))}
          </select>
        </label>
      )}

      {source === "existing" && (
        <label>
          <input
            type="checkbox"
            checked={playlist}
            onChange={(e) => onPlaylistChange(e.target.checked)}
          />
          {t("subs.playlist")}
        </label>
      )}

      {source === "whisper" && <p className="tab-note">{t("subs.whisperNote")}</p>}

      {source === "whisper" && gpu?.cuda_ready && (
        <p className="tab-note gpu-ready">{t("subs.gpuReady", { gpu: gpu.gpu_name })}</p>
      )}
      {source === "whisper" && gpu?.upgradable && (
        <div className="gpu-offer">
          <p>{t("subs.gpuOffer", { gpu: gpu.gpu_name })}</p>
          <button onClick={enableGpu} disabled={gpuBusy}>
            {gpuBusy ? t("subs.gpuInstalling") : t("subs.gpuEnable")}
          </button>
        </div>
      )}

      {setup === "checking" && <p className="tab-note">{t("subs.setupChecking")}</p>}
      {setup === "installing" && <p className="tab-note">{t("subs.setupInstalling")}</p>}
      {blocked.length > 0 && (
        <div className="subs-blocked">
          <p>{t("subs.setupBlocked")}</p>
          <pre className="preflight-cmd">
            {blocked.map((id) => t(`preflight.install.${id}`, { defaultValue: id })).join("\n")}
          </pre>
        </div>
      )}

      <div className="tab-actions">
        <button onClick={start} disabled={disabled || !url || activeJobId !== null || setup !== null}>
          {source === "whisper" ? t("subs.startWhisper") : t("subs.start")}
        </button>
        <button onClick={cancel} disabled={!activeJobId}>
          {t("subs.cancel")}
        </button>
      </div>
    </div>
  );
}
