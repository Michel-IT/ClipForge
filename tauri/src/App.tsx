import { useEffect, useState } from "react";
import { UrlBar } from "./components/UrlBar";
import { CapabilityPills } from "./components/CapabilityPills";
import { OutputDirPicker } from "./components/OutputDirPicker";
import { ProgressBar } from "./components/ProgressBar";
import { VideoTab } from "./components/VideoTab";
import { AudioTab } from "./components/AudioTab";
import { SubsTab } from "./components/SubsTab";
import { onDownloadComplete, onDownloadError, onDownloadProgress } from "./api";
import { DEFAULTS, loadSettings, saveSettings, Settings } from "./store";
import { PlatformInfo } from "./types";

type Tab = "video" | "audio" | "subs";

function App() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("video");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");
  const [status, setStatus] = useState("Ready");

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  useEffect(() => {
    const subs: Promise<() => void>[] = [
      onDownloadProgress((e) => {
        setPercent(e.percent);
        setSpeed(e.speed);
        setEta(e.eta);
        setStatus("Downloading…");
      }),
      onDownloadComplete((e) => {
        setStatus(`Done → ${e.output_path}`);
        setActiveJobId(null);
        setPercent(100);
      }),
      onDownloadError((e) => {
        setStatus(`Error: ${e.message}`);
        setActiveJobId(null);
      }),
    ];
    return () => {
      subs.forEach((p) => p.then((un) => un()));
    };
  }, []);

  const patch = (p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
    saveSettings(p);
  };

  const tabDisabled = (t: Tab) => {
    if (!platform) return false;
    if (t === "video") return !platform.video;
    if (t === "audio") return !platform.audio;
    return !platform.subs;
  };

  return (
    <div className="app">
      <header>
        <h1>ClipForge</h1>
        <span className="subtitle">Tauri skeleton — v{settings ? "0.1.0" : ""}</span>
      </header>

      <UrlBar url={url} onUrlChange={setUrl} onPlatformDetected={setPlatform} />
      <CapabilityPills platform={platform} />
      <OutputDirPicker outDir={settings.out_dir} onChange={(d) => patch({ out_dir: d })} />

      <nav className="tabs">
        {(["video", "audio", "subs"] as Tab[]).map((t) => (
          <button
            key={t}
            className={activeTab === t ? "tab tab-active" : "tab"}
            onClick={() => setActiveTab(t)}
            disabled={tabDisabled(t)}
          >
            {t === "video" ? "Video MP4" : t === "audio" ? "Audio MP3" : "Subtitles → Text"}
          </button>
        ))}
      </nav>

      {activeTab === "video" && (
        <VideoTab
          url={url}
          outDir={settings.out_dir}
          quality={settings.video_quality}
          playlist={settings.playlist}
          cookieBrowser={settings.cookie_browser}
          activeJobId={activeJobId}
          onQualityChange={(q) => patch({ video_quality: q })}
          onPlaylistChange={(v) => patch({ playlist: v })}
          onJobStarted={setActiveJobId}
          disabled={tabDisabled("video")}
        />
      )}
      {activeTab === "audio" && (
        <AudioTab
          url={url}
          outDir={settings.out_dir}
          bitrate={settings.bitrate}
          playlist={settings.playlist}
          cookieBrowser={settings.cookie_browser}
          activeJobId={activeJobId}
          onBitrateChange={(b) => patch({ bitrate: b })}
          onPlaylistChange={(v) => patch({ playlist: v })}
          onJobStarted={setActiveJobId}
          disabled={tabDisabled("audio")}
        />
      )}
      {activeTab === "subs" && (
        <SubsTab
          url={url}
          outDir={settings.out_dir}
          langs={settings.subs_langs}
          playlist={settings.playlist}
          cookieBrowser={settings.cookie_browser}
          activeJobId={activeJobId}
          onLangsChange={(l) => patch({ subs_langs: l })}
          onPlaylistChange={(v) => patch({ playlist: v })}
          onJobStarted={setActiveJobId}
          disabled={tabDisabled("subs")}
        />
      )}

      <ProgressBar percent={percent} speed={speed} eta={eta} status={status} />
    </div>
  );
}

export default App;
