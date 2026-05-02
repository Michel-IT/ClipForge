import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  PlatformInfo,
  VideoInfo,
  DownloadStarted,
  ProgressEvent,
  CompleteEvent,
  ErrorEvent,
  LogEvent,
} from "./types";

export const detectPlatform = (url: string) =>
  invoke<PlatformInfo>("detect_platform", { url });

export const getDisclaimer = () => invoke<string>("get_disclaimer");

export const fetchInfo = (url: string, cookiesBrowser?: string) =>
  invoke<VideoInfo>("fetch_info", { url, cookiesBrowser });

export const downloadVideo = (args: {
  url: string;
  quality: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
}) => invoke<DownloadStarted>("download_video", args);

export const downloadAudio = (args: {
  url: string;
  bitrate: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
}) => invoke<DownloadStarted>("download_audio", args);

export const downloadSubs = (args: {
  url: string;
  langs: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
}) => invoke<DownloadStarted>("download_subs", args);

export const cancelDownload = (jobId: string) =>
  invoke<void>("cancel_download", { jobId });

export const onDownloadProgress = (cb: (e: ProgressEvent) => void): Promise<UnlistenFn> =>
  listen<ProgressEvent>("download-progress", (evt) => cb(evt.payload));

export const onDownloadComplete = (cb: (e: CompleteEvent) => void): Promise<UnlistenFn> =>
  listen<CompleteEvent>("download-complete", (evt) => cb(evt.payload));

export const onDownloadError = (cb: (e: ErrorEvent) => void): Promise<UnlistenFn> =>
  listen<ErrorEvent>("download-error", (evt) => cb(evt.payload));

export const onDownloadLog = (cb: (e: LogEvent) => void): Promise<UnlistenFn> =>
  listen<LogEvent>("download-log", (evt) => cb(evt.payload));
