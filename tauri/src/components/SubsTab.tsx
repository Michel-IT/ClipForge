import { downloadSubs, cancelDownload } from "../api";

interface Props {
  url: string;
  outDir: string;
  langs: string;
  playlist: boolean;
  cookieBrowser: string;
  activeJobId: string | null;
  onLangsChange: (l: string) => void;
  onPlaylistChange: (v: boolean) => void;
  onJobStarted: (jobId: string) => void;
  disabled: boolean;
}

export function SubsTab({
  url,
  outDir,
  langs,
  playlist,
  cookieBrowser,
  activeJobId,
  onLangsChange,
  onPlaylistChange,
  onJobStarted,
  disabled,
}: Props) {
  const start = async () => {
    const { job_id } = await downloadSubs({
      url,
      langs,
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
        Languages (comma-separated):
        <input
          type="text"
          value={langs}
          onChange={(e) => onLangsChange(e.target.value)}
          placeholder="it,en"
        />
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
          Extract Subtitles → Text
        </button>
        <button onClick={cancel} disabled={!activeJobId}>
          Cancel
        </button>
      </div>
    </div>
  );
}
