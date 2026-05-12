import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import {
  PlatformInfo,
  VideoInfo,
  PlaylistItem,
  DownloadStarted,
  ProgressEvent,
  CompleteEvent,
  ErrorEvent,
  CanceledEvent,
  LogEvent,
  FfmpegStatus,
} from "./types";

export const detectPlatform = (url: string) =>
  invoke<PlatformInfo>("detect_platform", { url });

export const getDisclaimer = () => invoke<string>("get_disclaimer");

export const fetchInfo = (url: string, cookiesBrowser?: string) =>
  invoke<VideoInfo>("fetch_info", { url, cookiesBrowser });

export const fetchPlaylistInfo = (url: string, cookiesBrowser?: string) =>
  invoke<PlaylistItem[]>("fetch_playlist_info", { url, cookiesBrowser });

export const downloadVideo = (args: {
  url: string;
  quality: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
  playlistItems?: string;
}) => invoke<DownloadStarted>("download_video", args);

export const downloadAudio = (args: {
  url: string;
  bitrate: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
  playlistItems?: string;
}) => invoke<DownloadStarted>("download_audio", args);

export const downloadSubs = (args: {
  url: string;
  langs: string;
  outDir: string;
  cookiesBrowser?: string;
  playlist: boolean;
  playlistItems?: string;
}) => invoke<DownloadStarted>("download_subs", args);

export const cancelDownload = (jobId: string) =>
  invoke<void>("cancel_download", { jobId });

export const ffmpegStatus = () => invoke<FfmpegStatus>("ffmpeg_status");
export const openDir = (path: string) => invoke<void>("open_dir", { path });

export const downloadUpdate = (url: string) => invoke<string>("download_update", { url });
export const revealInFolder = (path: string) => invoke<void>("reveal_in_folder", { path });

export const onUpdateDownloadProgress = (
  cb: (e: { percent: number; downloaded: number; total: number }) => void
): Promise<UnlistenFn> =>
  listen<{ percent: number; downloaded: number; total: number }>(
    "update-download-progress",
    (evt) => cb(evt.payload)
  );

export const onDownloadProgress = (cb: (e: ProgressEvent) => void): Promise<UnlistenFn> =>
  listen<ProgressEvent>("download-progress", (evt) => cb(evt.payload));

export const onDownloadComplete = (cb: (e: CompleteEvent) => void): Promise<UnlistenFn> =>
  listen<CompleteEvent>("download-complete", (evt) => cb(evt.payload));

export const onDownloadError = (cb: (e: ErrorEvent) => void): Promise<UnlistenFn> =>
  listen<ErrorEvent>("download-error", (evt) => cb(evt.payload));

export const onDownloadCanceled = (cb: (e: CanceledEvent) => void): Promise<UnlistenFn> =>
  listen<CanceledEvent>("download-canceled", (evt) => cb(evt.payload));

export const onDownloadLog = (cb: (e: LogEvent) => void): Promise<UnlistenFn> =>
  listen<LogEvent>("download-log", (evt) => cb(evt.payload));

export const onPlaylistFetchProgress = (
  cb: (e: { count: number }) => void
): Promise<UnlistenFn> =>
  listen<{ count: number }>("playlist-fetch-progress", (evt) => cb(evt.payload));
