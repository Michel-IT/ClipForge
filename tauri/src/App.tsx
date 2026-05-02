import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { applyDirAndLang, detectInitialLang } from "./i18n";
import { Titlebar } from "./components/Titlebar";
import { Footer } from "./components/Footer";
import { UrlBar } from "./components/UrlBar";
import { CapabilityPills } from "./components/CapabilityPills";
import { OutputDirPicker } from "./components/OutputDirPicker";
import { ProgressBar } from "./components/ProgressBar";
import { VideoTab } from "./components/VideoTab";
import { AudioTab } from "./components/AudioTab";
import { SubsTab } from "./components/SubsTab";
import { DisclaimerModal } from "./components/DisclaimerModal";
import { SettingsPanel } from "./components/SettingsPanel";
import { LogPanel } from "./components/LogPanel";
import { onDownloadComplete, onDownloadError, onDownloadLog, onDownloadProgress } from "./api";
import { DEFAULTS, loadSettings, saveSettings, Settings } from "./store";
import { LogEvent, PlatformInfo, ProgressEvent } from "./types";

const LOG_BUFFER_MAX = 500;

type Tab = "video" | "audio" | "subs";

type StatusKind =
  | { kind: "ready" }
  | { kind: "phase"; key: string; legacy: string }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string };

function App() {
  const { t } = useTranslation();
  const [, setLangTick] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("video");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");
  const [status, setStatus] = useState<StatusKind>({ kind: "ready" });
  const [logLines, setLogLines] = useState<LogEvent[]>([]);

  // Defensive re-render on language change — guarantees every consumer sees
  // the new t() output even if react-i18next's auto-subscription misses it.
  useEffect(() => {
    const onChange = () => setLangTick((n) => n + 1);
    i18n.on("languageChanged", onChange);
    return () => { i18n.off("languageChanged", onChange); };
  }, []);

  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const lang = await detectInitialLang(s.language || undefined);
      await i18n.changeLanguage(lang);
      applyDirAndLang(lang);
      if (!s.language) {
        // First launch: persist the detected language so subsequent launches skip detection.
        await saveSettings({ language: lang });
        setSettings((prev) => ({ ...prev, language: lang }));
      }
      setBootstrapped(true);
    })();
  }, []);

  useEffect(() => {
    const subs: Promise<() => void>[] = [
      onDownloadProgress((e: ProgressEvent) => {
        setPercent(e.percent);
        setSpeed(e.speed);
        setEta(e.eta);
        setStatus({
          kind: "phase",
          key: e.phase_key ?? "phase.downloading",
          legacy: e.phase ?? "downloading",
        });
      }),
      onDownloadComplete((e) => {
        setStatus({ kind: "done", path: e.output_path });
        setActiveJobId(null);
        setPercent(100);
      }),
      onDownloadError((e) => {
        setStatus({ kind: "error", message: e.message });
        setActiveJobId(null);
      }),
      onDownloadLog((e) => {
        setLogLines((prev) => {
          const next = [...prev, e];
          return next.length > LOG_BUFFER_MAX ? next.slice(-LOG_BUFFER_MAX) : next;
        });
      }),
    ];
    return () => {
      subs.forEach((p) => p.then((un) => un()));
    };
  }, []);

  const handleJobStarted = (jobId: string) => {
    setActiveJobId(jobId);
    setLogLines([]); // fresh panel per job
    setPercent(0);
    setSpeed("");
    setEta("");
    setStatus({ kind: "phase", key: "phase.downloading", legacy: "downloading" });
  };

  const handleLangChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    applyDirAndLang(lang);
    await saveSettings({ language: lang });
    setSettings((prev) => ({ ...prev, language: lang }));
  };

  const patch = (p: Partial<Settings>) => {
    setSettings((s) => ({ ...s, ...p }));
    saveSettings(p);
  };

  const tabDisabled = (tab: Tab) => {
    if (!platform) return false;
    if (tab === "video") return !platform.video;
    if (tab === "audio") return !platform.audio;
    return !platform.subs;
  };

  const statusText = (() => {
    switch (status.kind) {
      case "ready":  return t("progress.ready");
      case "phase":  return t(status.key, { defaultValue: status.legacy });
      case "done":   return t("progress.done", { path: status.path });
      case "error":  return t("progress.error", { message: status.message });
    }
  })();

  if (!bootstrapped) return null; // wait for i18n + settings

  return (
    <>
      <Titlebar onLangChange={handleLangChange} />
      <main>
        {!disclaimerAccepted ? (
          <DisclaimerModal
            onAccept={() => setDisclaimerAccepted(true)}
            onLangChange={handleLangChange}
          />
        ) : (
          <div className="app">
            <section className="card">
              <h3 className="card-title">{t("section.source")}</h3>
              <UrlBar url={url} onUrlChange={setUrl} onPlatformDetected={setPlatform} />
              <CapabilityPills platform={platform} />
            </section>

            <section className="card">
              <h3 className="card-title">{t("section.destination")}</h3>
              <OutputDirPicker outDir={settings.out_dir} onChange={(d) => patch({ out_dir: d })} />
            </section>

            <SettingsPanel
              cookieBrowser={settings.cookie_browser}
              onCookieBrowserChange={(b) => patch({ cookie_browser: b })}
              onLangChange={handleLangChange}
            />

            <nav className="tabs">
              {(["video", "audio", "subs"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  className={activeTab === tab ? "tab tab-active" : "tab"}
                  onClick={() => setActiveTab(tab)}
                  disabled={tabDisabled(tab)}
                >
                  {t(`tabs.${tab}`)}
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
                onJobStarted={handleJobStarted}
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
                onJobStarted={handleJobStarted}
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
                onJobStarted={handleJobStarted}
                disabled={tabDisabled("subs")}
              />
            )}

            <ProgressBar percent={percent} speed={speed} eta={eta} status={statusText} />
            <LogPanel lines={logLines} />
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}

export default App;
