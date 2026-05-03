import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import i18n, { applyDirAndLang, detectInitialLang } from "./i18n";
import { Footer } from "./components/Footer";
import { UrlBar } from "./components/UrlBar";
import { CapabilityPills } from "./components/CapabilityPills";
import { VideoInfoStrip } from "./components/VideoInfoStrip";
import { OutputDirPicker } from "./components/OutputDirPicker";
import { VideoTab } from "./components/VideoTab";
import { AudioTab } from "./components/AudioTab";
import { SubsTab } from "./components/SubsTab";
import { SettingsTab } from "./components/SettingsTab";
import { DisclaimerModal } from "./components/DisclaimerModal";
import { DownloadModal, ModalStatus } from "./components/DownloadModal";
import { StatusIndicator, StatusKind } from "./components/StatusIndicator";
import { detectPlatform, onDownloadCanceled, onDownloadComplete, onDownloadError, onDownloadLog, onDownloadProgress } from "./api";
import { DEFAULTS, loadSettings, saveSettings, Settings } from "./store";
import { LogEvent, PlatformInfo, ProgressEvent, Theme, VideoInfo } from "./types";

type Tab = "video" | "audio" | "subs" | "settings";
const LOG_BUFFER_MAX = 1000;

function applyTheme(theme: Theme) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.setAttribute("data-theme", theme);
  }
}

function App() {
  const { t } = useTranslation();
  const [, setLangTick] = useState(0);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false);
  const [showDisclaimerAgain, setShowDisclaimerAgain] = useState(false);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [url, setUrl] = useState("");
  const [platform, setPlatform] = useState<PlatformInfo | null>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [videoInfoLoading, setVideoInfoLoading] = useState(false);
  const [videoInfoError, setVideoInfoError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>("video");
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [activeJobKind, setActiveJobKind] = useState<"video" | "audio" | "subs">("audio");
  const [percent, setPercent] = useState(0);
  const [speed, setSpeed] = useState("");
  const [eta, setEta] = useState("");
  const [status, setStatus] = useState<StatusKind>({ kind: "ready" });
  const [logLines, setLogLines] = useState<LogEvent[]>([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Bootstrap: load settings, init i18n + theme + auto-paste, then unblock UI.
  useEffect(() => {
    (async () => {
      const s = await loadSettings();
      setSettings(s);
      const lang = await detectInitialLang(s.language || undefined);
      await i18n.changeLanguage(lang);
      applyDirAndLang(lang);
      applyTheme(s.theme);
      if (!s.language) {
        await saveSettings({ language: lang });
        setSettings((prev) => ({ ...prev, language: lang }));
      }
      setBootstrapped(true);

      // Auto-paste: if clipboard contains a recognised platform URL, prefill.
      if (s.auto_paste) {
        try {
          const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
          const txt = (await readText())?.trim() ?? "";
          if (txt && /^https?:\/\//.test(txt)) {
            const info = await detectPlatform(txt).catch(() => null);
            if (info && info.name !== "Generic") {
              setUrl(txt);
              setPlatform(info);
            }
          }
        } catch { /* clipboard plugin missing or denied — silently skip */ }
      }
    })();
  }, []);

  // Defensive: re-render every component on language change.
  useEffect(() => {
    const onChange = () => setLangTick((n) => n + 1);
    i18n.on("languageChanged", onChange);
    return () => { i18n.off("languageChanged", onChange); };
  }, []);

  // Subscribe to download events.
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
          step: e.phase_step,
          total: e.phase_total,
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
      onDownloadCanceled((e) => {
        setStatus({ kind: "canceled", filesRemoved: e.files_removed });
        setActiveJobId(null);
      }),
      onDownloadLog((e) => {
        setLogLines((prev) => {
          const next = [...prev, e];
          return next.length > LOG_BUFFER_MAX ? next.slice(-LOG_BUFFER_MAX) : next;
        });
      }),
    ];
    return () => { subs.forEach((p) => p.then((un) => un())); };
  }, []);

  const handleJobStarted = (kind: "video" | "audio" | "subs") => (jobId: string) => {
    setActiveJobId(jobId);
    setActiveJobKind(kind);
    setLogLines([]);
    setPercent(0);
    setSpeed("");
    setEta("");
    setStatus({ kind: "phase", key: "phase.downloading", legacy: "downloading", step: 1, total: 3 });
    setModalOpen(true);
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
    if (p.theme) applyTheme(p.theme);
  };

  const tabDisabled = (tab: Tab) => {
    if (tab === "settings") return false;
    if (!platform) return false;
    if (tab === "video") return !platform.video;
    if (tab === "audio") return !platform.audio;
    return !platform.subs;
  };

  // Compose the modal status object from the current state.
  const modalStatus: ModalStatus = useMemo(() => {
    switch (status.kind) {
      case "done":     return { kind: "done", outputPath: status.path };
      case "error":    return { kind: "error", message: status.message };
      case "canceled": return { kind: "canceled", filesRemoved: status.filesRemoved };
      case "phase":    return {
        kind: "running",
        phaseKey: status.key,
        phaseLegacy: status.legacy,
        step: status.step,
        total: status.total,
        percent, speed, eta,
      };
      default: return { kind: "running", phaseKey: "phase.downloading", phaseLegacy: "downloading", percent, speed, eta };
    }
  }, [status, percent, speed, eta]);

  if (!bootstrapped) return null;

  if (!disclaimerAccepted) {
    return <DisclaimerModal onAccept={() => setDisclaimerAccepted(true)} onLangChange={handleLangChange} />;
  }

  return (
    <>
      <header className="app-header">
        <h1>{t("app.title")}</h1>
        <StatusIndicator status={status} />
      </header>
      <main>
        <div className="app">
          <section className="card">
            <div className="card-head">
              <h3 className="card-title">{t("section.source")}</h3>
              <CapabilityPills platform={platform} />
            </div>
            <UrlBar
              url={url}
              onUrlChange={setUrl}
              platform={platform}
              onPlatformDetected={(p) => { setPlatform(p); setVideoInfo(null); setVideoInfoError(null); }}
              cookieBrowser={settings.cookie_browser}
              onInfoFetched={(info, loading, error) => { setVideoInfo(info); setVideoInfoLoading(loading); setVideoInfoError(error); }}
            />
            <VideoInfoStrip info={videoInfo} loading={videoInfoLoading} error={videoInfoError} />
          </section>

          <section className="card">
            <h3 className="card-title">{t("section.destination")}</h3>
            <OutputDirPicker outDir={settings.out_dir} onChange={(d) => patch({ out_dir: d })} />
          </section>

          <nav className="tabs">
            {(["video", "audio", "subs", "settings"] as Tab[]).map((tab) => (
              <button
                key={tab}
                className={activeTab === tab ? "tab tab-active" : "tab"}
                onClick={() => setActiveTab(tab)}
                disabled={tabDisabled(tab)}
              >
                {tab === "settings" ? t("settings.title") : t(`tabs.${tab}`)}
              </button>
            ))}
          </nav>

          {activeTab === "video" && (
            <VideoTab
              url={url} outDir={settings.out_dir}
              quality={settings.video_quality} playlist={settings.playlist}
              cookieBrowser={settings.cookie_browser} activeJobId={activeJobId}
              onQualityChange={(q) => patch({ video_quality: q })}
              onPlaylistChange={(v) => patch({ playlist: v })}
              onJobStarted={handleJobStarted("video")}
              disabled={tabDisabled("video")}
            />
          )}
          {activeTab === "audio" && (
            <AudioTab
              url={url} outDir={settings.out_dir}
              bitrate={settings.bitrate} playlist={settings.playlist}
              cookieBrowser={settings.cookie_browser} activeJobId={activeJobId}
              onBitrateChange={(b) => patch({ bitrate: b })}
              onPlaylistChange={(v) => patch({ playlist: v })}
              onJobStarted={handleJobStarted("audio")}
              disabled={tabDisabled("audio")}
            />
          )}
          {activeTab === "subs" && (
            <SubsTab
              url={url} outDir={settings.out_dir}
              langs={settings.subs_langs} playlist={settings.playlist}
              cookieBrowser={settings.cookie_browser} activeJobId={activeJobId}
              onLangsChange={(l) => patch({ subs_langs: l })}
              onPlaylistChange={(v) => patch({ playlist: v })}
              onJobStarted={handleJobStarted("subs")}
              disabled={tabDisabled("subs")}
            />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              cookieBrowser={settings.cookie_browser}
              onCookieBrowserChange={(b) => patch({ cookie_browser: b })}
              theme={settings.theme}
              onThemeChange={(th) => patch({ theme: th })}
              playlist={settings.playlist}
              onPlaylistChange={(v) => patch({ playlist: v })}
              autoPaste={settings.auto_paste}
              onAutoPasteChange={(v) => patch({ auto_paste: v })}
              onLangChange={handleLangChange}
              onShowDisclaimer={() => setShowDisclaimerAgain(true)}
            />
          )}
        </div>
      </main>
      <Footer />

      <DownloadModal
        isOpen={modalOpen}
        jobKind={activeJobKind}
        jobId={activeJobId}
        status={modalStatus}
        logs={logLines}
        onClose={() => setModalOpen(false)}
      />

      {showDisclaimerAgain && (
        <DisclaimerModal
          onAccept={() => setShowDisclaimerAgain(false)}
          onLangChange={handleLangChange}
        />
      )}
    </>
  );
}

export default App;
