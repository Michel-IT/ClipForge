import { LazyStore } from "@tauri-apps/plugin-store";
import { Bitrate, Theme, VideoQuality } from "./types";

export interface Settings {
  out_dir: string;
  cookie_browser: string;
  playlist: boolean;
  theme: Theme;
  subs_langs: string;
  bitrate: Bitrate;
  video_quality: VideoQuality;
  disclaimer_accepted: boolean;
}

export const DEFAULTS: Settings = {
  out_dir: "",
  cookie_browser: "",
  playlist: false,
  theme: "system",
  subs_langs: "it,en",
  bitrate: "192",
  video_quality: "Auto",
  disclaimer_accepted: false,
};

const store = new LazyStore("settings.json");

export async function loadSettings(): Promise<Settings> {
  const merged: Settings = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Settings)[]) {
    const v = await store.get(key);
    if (v !== null && v !== undefined) {
      (merged[key] as unknown) = v;
    }
  }
  return merged;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  for (const [key, value] of Object.entries(patch)) {
    await store.set(key, value as unknown);
  }
  await store.save();
}
