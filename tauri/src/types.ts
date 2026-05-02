export interface PlatformInfo {
  name: string;
  video: boolean;
  audio: boolean;
  subs: boolean;
  color: string;
}

export interface VideoInfo {
  title: string;
  uploader?: string;
  duration?: number;
  thumbnail?: string;
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
