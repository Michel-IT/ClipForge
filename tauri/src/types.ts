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
}

export interface CompleteEvent {
  job_id: string;
  output_path: string;
}

export interface ErrorEvent {
  job_id: string;
  message: string;
}

export type VideoQuality = "Auto" | "1080p" | "720p" | "480p" | "360p";
export type Bitrate = "128" | "192" | "256" | "320";
export type Theme = "system" | "light" | "dark";

export const VIDEO_QUALITIES: VideoQuality[] = ["Auto", "1080p", "720p", "480p", "360p"];
export const BITRATES: Bitrate[] = ["128", "192", "256", "320"];
export const COOKIE_BROWSERS = ["", "chrome", "firefox", "edge", "brave", "opera", "vivaldi"] as const;
