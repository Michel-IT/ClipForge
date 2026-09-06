export interface PlatformInfo {
  name: string;
  video: boolean;
  audio: boolean;
  subs: boolean;
  color: string;
  notes: string;
}

export interface VideoInfo {
  title: string;
  uploader?: string;
  duration?: number;
  duration_formatted?: string;
  thumbnail?: string;
}

export interface PlaylistItem {
  index: number;                 // 1-based, what --playlist-items expects
  id: string;
  title: string;
  duration?: number;
  duration_formatted?: string;
}

export type PlaylistSelectionResult =
  | { kind: "single" }                 // URL isn't actually a playlist — fall through
  | { kind: "items"; value: string }   // user selected; value is `--playlist-items` syntax
  | { kind: "cancel" };                // user cancelled the modal

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;     // e.g. "0.1.2"
  latestVersion: string;      // e.g. "0.1.3" — parsed from the tauri-v* tag
  htmlUrl: string;            // GitHub release page URL (fallback)
  directAssetUrl?: string;    // OS+arch-specific asset URL (preferred download target)
  publishedAt?: string;       // ISO date string
}

export interface FfmpegStatus {
  available: boolean;
  path: string;
}

export interface KuramaAccount {
  ok: boolean;
  balance: number;   // EUR, -1 when the field was absent
  raw: string;
}

export interface EnhanceResult {
  output_path: string;
  chunks: number;
  cost_eur: number;
}

export interface GpuStatus {
  has_gpu: boolean;
  gpu_name: string;
  cuda_ready: boolean;
  upgradable: boolean;   // GPU present but torch cannot use it
}

export interface DepStatus {
  id: string;
  path: string;
  version: string;
  found: boolean;
  required: boolean;
  installable: boolean;
}

export interface PreflightReport {
  deps: DepStatus[];
  ok: boolean;
}

export interface YtdlpStatus {
  version: string;
  age_days: number;   // -1 when the version string could not be parsed
  stale: boolean;     // true past 90 days, matching yt-dlp's own warning
}

export interface DownloadStarted {
  job_id: string;
}

export interface ProgressEvent {
  job_id: string;
  percent: number;
  speed: string;
  eta: string;
  phase: string;        // legacy EN, fallback
  phase_key?: string;   // canonical i18n key, preferred
  phase_step?: number;  // 1-based step index
  phase_total?: number; // total step count for the current job
}

export interface CompleteEvent {
  job_id: string;
  output_path: string;
}

export interface ErrorEvent {
  job_id: string;
  message: string;
  error_key?: string;  // canonical i18n key when known
}

export interface CanceledEvent {
  job_id: string;
  files_removed: number;
}

export interface LogEvent {
  job_id: string;
  stream: "stdout" | "stderr";
  line: string;
}

export type VideoQuality = "Auto" | "1080p" | "720p" | "480p" | "360p";
export type Bitrate = "128" | "192" | "256" | "320";
export type Theme = "system" | "light" | "dark";

export const VIDEO_QUALITIES: VideoQuality[] = ["Auto", "1080p", "720p", "480p", "360p"];
export const BITRATES: Bitrate[] = ["128", "192", "256", "320"];
export const COOKIE_BROWSERS = ["", "chrome", "firefox", "edge", "brave", "opera", "vivaldi"] as const;
