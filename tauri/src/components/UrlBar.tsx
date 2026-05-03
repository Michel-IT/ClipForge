import { useState } from "react";
import { useTranslation } from "react-i18next";
import { detectPlatform, fetchInfo } from "../api";
import { PlatformInfo, VideoInfo } from "../types";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  platform: PlatformInfo | null;
  onPlatformDetected: (info: PlatformInfo | null) => void;
  cookieBrowser: string;
  onInfoFetched: (info: VideoInfo | null, loading: boolean, error: string | null) => void;
}

export function UrlBar({ url, onUrlChange, platform, onPlatformDetected, cookieBrowser, onInfoFetched }: Props) {
  const { t } = useTranslation();
  const [busyInfo, setBusyInfo] = useState(false);

  const fetchInfoFor = async (target: string) => {
    if (!target.trim()) return;
    setBusyInfo(true);
    onInfoFetched(null, true, null);
    console.log("[VideoInfo] fetchInfo start ->", target);
    try {
      // 30s safety timeout: yt-dlp on YouTube can take 5-15s, beyond that
      // we surface an explicit error rather than spinning forever.
      const info = await Promise.race<Awaited<ReturnType<typeof fetchInfo>>>([
        fetchInfo(target.trim(), cookieBrowser || undefined),
        new Promise((_, rej) => setTimeout(() => rej(new Error("Timeout (30s) — yt-dlp didn't respond")), 30_000)),
      ]);
      console.log("[VideoInfo] fetchInfo ok", info);
      onInfoFetched(info, false, null);
    } catch (e: any) {
      const msg = e?.message ?? String(e);
      console.error("[VideoInfo] fetchInfo failed:", msg);
      onInfoFetched(null, false, msg);
    } finally {
      setBusyInfo(false);
    }
  };

  const detect = async (next: string) => {
    if (!next.trim()) {
      onPlatformDetected(null);
      return;
    }
    try {
      const info = await detectPlatform(next.trim());
      onPlatformDetected(info);
      // Auto-fetch video info too when the platform is recognised — matches
      // the Python flow where info appears as soon as a valid URL is pasted.
      if (info && info.name !== "Generic") {
        fetchInfoFor(next.trim());
      }
    } catch {
      onPlatformDetected(null);
    }
  };

  const handlePaste = async () => {
    try {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      const txt = (await readText())?.trim() ?? "";
      if (!txt) return;
      onUrlChange(txt);
      await detect(txt);
    } catch { /* clipboard plugin missing or denied */ }
  };

  const handleFetchInfo = () => fetchInfoFor(url);

  return (
    <div className="url-bar">
      <span
        className="platform-badge url-platform"
        style={{ backgroundColor: platform?.color ?? "var(--surface)" }}
      >
        {platform?.name || "—"}
      </span>
      <input
        type="text"
        placeholder={t("url.placeholder")}
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onBlur={() => detect(url)}
        onKeyDown={(e) => {
          if (e.key === "Enter") detect(url);
        }}
        onPaste={(e) => {
          // Trigger detect immediately on paste — read after the browser has
          // committed the new value (next tick).
          const target = e.currentTarget;
          setTimeout(() => {
            onUrlChange(target.value);
            detect(target.value);
          }, 0);
        }}
      />
      <button onClick={handlePaste} title={t("paste.button", { defaultValue: "Paste" })}>
        {t("paste.button", { defaultValue: "Paste" })}
      </button>
      <button onClick={handleFetchInfo} disabled={!url.trim() || busyInfo}>
        {busyInfo
          ? t("videoInfo.loading", { defaultValue: "…" })
          : t("videoInfo.button", { defaultValue: "Video info" })}
      </button>
    </div>
  );
}
