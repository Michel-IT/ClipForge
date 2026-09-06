import { LazyStore } from "@tauri-apps/plugin-store";
import { Bitrate, Theme, VideoQuality } from "./types";

export interface Settings {
  out_dir: string;
  cookie_browser: string;
  playlist: boolean;
  theme: Theme;          // applied via documentElement.dataset.theme
  subs_langs: string;
  bitrate: Bitrate;
  video_quality: VideoQuality;
  language: string;
  auto_paste: boolean;       // read clipboard at startup if URL recognised
  auto_update_check: boolean; // GitHub Releases lookup on launch
  // KuramaLab API key (kl_ + 48 hex). Stored in settings.json in plain text,
  // like every other setting: it is a per-user prepaid credit key, not a
  // credential to anything else. Never sent anywhere except api.kuramalab.net.
  kurama_api_key: string;
  kurama_model: string;
  kurama_target_lang: string;
}

export const DEFAULTS: Settings = {
  out_dir: "",
  cookie_browser: "", // opt-in only — Chrome v20 DPAPI fails to decrypt outside Chrome process, so first attempt always retried-without-cookies. Users who need auth (private/age-gated) can pick a browser in Settings.
  playlist: false,
  theme: "system",
  subs_langs: "it,en",
  bitrate: "192",
  video_quality: "Auto",
  language: "",
  auto_paste: true,
  auto_update_check: true,
  kurama_api_key: "",
  kurama_model: "gemma4:31b",
  kurama_target_lang: "",
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
