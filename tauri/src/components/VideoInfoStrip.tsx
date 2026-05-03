import { VideoInfo } from "../types";

interface Props {
  info: VideoInfo | null;
  loading: boolean;
  error: string | null;
}

// One-liner under the URL bar: "title | uploader | duration HH:MM"
// Mirrors clipforge.py's set_info() display.
export function VideoInfoStrip({ info, loading, error }: Props) {
  // Hide entirely while loading — user already sees the "…" on the
  // "Video info" button itself, no need to clutter the source card.
  if (loading) return null;
  if (error) {
    return <div className="video-info-strip error">{error}</div>;
  }
  if (!info || !info.title) return null;

  const parts: string[] = [info.title];
  if (info.uploader) parts.push(info.uploader);
  if (info.duration_formatted) parts.push(info.duration_formatted);

  return (
    <div className="video-info-strip" title={info.title}>
      {parts.map((p, i) => (
        <span key={i} className={i === 0 ? "vi-title" : "vi-meta"}>
          {p}
          {i < parts.length - 1 && <span className="vi-sep">|</span>}
        </span>
      ))}
    </div>
  );
}
