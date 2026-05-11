import { useTranslation } from "react-i18next";
import { downloadSubs, cancelDownload } from "../api";
import { PlaylistSelectionResult } from "../types";

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
  onLangsChange,
  onPlaylistChange,
  onJobStarted,
  onRequestPlaylistSelection,
  disabled,
}: Props) {
  const { t } = useTranslation();
  const start = async () => {
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
        {t("subs.languages")}
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
        {t("subs.playlist")}
      </label>
      <div className="tab-actions">
        <button onClick={start} disabled={disabled || !url || activeJobId !== null}>
          {t("subs.start")}
        </button>
        <button onClick={cancel} disabled={!activeJobId}>
          {t("subs.cancel")}
        </button>
      </div>
    </div>
  );
}
