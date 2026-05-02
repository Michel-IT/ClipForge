import { useState } from "react";
import { detectPlatform } from "../api";
import { PlatformInfo } from "../types";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  onPlatformDetected: (info: PlatformInfo | null) => void;
}

export function UrlBar({ url, onUrlChange, onPlatformDetected }: Props) {
  const [busy, setBusy] = useState(false);

  const handleDetect = async () => {
    if (!url.trim()) {
      onPlatformDetected(null);
      return;
    }
    setBusy(true);
    try {
      const info = await detectPlatform(url.trim());
      onPlatformDetected(info);
    } catch {
      onPlatformDetected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="url-bar">
      <input
        type="text"
        placeholder="Paste a video URL (YouTube, Reddit, TikTok, ...)"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onBlur={handleDetect}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleDetect();
        }}
      />
      <button onClick={handleDetect} disabled={busy}>
        {busy ? "..." : "Detect"}
      </button>
    </div>
  );
}
