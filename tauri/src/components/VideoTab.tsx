import { useTranslation } from "react-i18next";
import { downloadVideo, cancelDownload } from "../api";
import { VIDEO_QUALITIES, VideoQuality } from "../types";

interface Props {
  url: string;
  outDir: string;
  quality: VideoQuality;
  playlist: boolean;
  cookieBrowser: string;
  activeJobId: string | null;
  onQualityChange: (q: VideoQuality) => void;
  onPlaylistChange: (v: boolean) => void;
  onJobStarted: (jobId: string) => void;
  disabled: boolean;
}

export function VideoTab({
  url,
  outDir,
  quality,
  playlist,
  cookieBrowser,
  activeJobId,
  onQualityChange,
  onPlaylistChange,
  onJobStarted,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const start = async () => {
    const { job_id } = await downloadVideo({
      url,
      quality,
      outDir,
      cookiesBrowser: cookieBrowser || undefined,
      playlist,
    });
    onJobStarted(job_id);
  };

  const cancel = async () => {
    if (activeJobId) await cancelDownload(activeJobId);
  };

  return (
    <div className="tab-content">
      <label>
        {t("video.quality")}
        <select
          value={quality}
          onChange={(e) => onQualityChange(e.target.value as VideoQuality)}
        >
          {VIDEO_QUALITIES.map((q) => (
            <option key={q} value={q}>
              {q === "Auto" ? t("video.qualityAuto") : q}
            </option>
          ))}
        </select>
      </label>
      <label>
        <input
          type="checkbox"
          checked={playlist}
          onChange={(e) => onPlaylistChange(e.target.checked)}
        />
        {t("video.playlist")}
      </label>
      <div className="tab-actions">
        <button onClick={start} disabled={disabled || !url || activeJobId !== null}>
          {t("video.start")}
        </button>
        <button onClick={cancel} disabled={!activeJobId}>
          {t("video.cancel")}
        </button>
      </div>
    </div>
  );
}
