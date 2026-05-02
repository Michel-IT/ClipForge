import { downloadAudio, cancelDownload } from "../api";
import { BITRATES, Bitrate } from "../types";

interface Props {
  url: string;
  outDir: string;
  bitrate: Bitrate;
  playlist: boolean;
  cookieBrowser: string;
  activeJobId: string | null;
  onBitrateChange: (b: Bitrate) => void;
  onPlaylistChange: (v: boolean) => void;
  onJobStarted: (jobId: string) => void;
  disabled: boolean;
}

export function AudioTab({
  url,
  outDir,
  bitrate,
  playlist,
  cookieBrowser,
  activeJobId,
  onBitrateChange,
  onPlaylistChange,
  onJobStarted,
  disabled,
}: Props) {
  const start = async () => {
    const { job_id } = await downloadAudio({
      url,
      bitrate,
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
        Bitrate:
        <select
          value={bitrate}
          onChange={(e) => onBitrateChange(e.target.value as Bitrate)}
        >
          {BITRATES.map((b) => (
            <option key={b} value={b}>
              {b} kbps
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
        Download whole playlist
      </label>
      <div className="tab-actions">
        <button onClick={start} disabled={disabled || !url || activeJobId !== null}>
          Extract MP3
        </button>
        <button onClick={cancel} disabled={!activeJobId}>
          Cancel
        </button>
      </div>
    </div>
  );
}
