import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { locale as osLocale } from "@tauri-apps/plugin-os";

// Eager static import: 46 lingue x ~52 chiavi short ≈ 150KB totali, accettabile per
// desktop bundle. import.meta.glob fa la discovery automatica al build time.
const modules = import.meta.glob("./locales/*/translation.json", { eager: true });
const resources: Record<string, { translation: unknown }> = {};
for (const [path, mod] of Object.entries(modules)) {
  const lang = path.match(/locales\/([^/]+)\//)![1];
  resources[lang] = { translation: (mod as { default: unknown }).default };
}

export const SUPPORTED_LANGS = Object.keys(resources).sort();
export const RTL_LANGS = new Set(["ar", "he", "fa", "ur"]);

// Endonym (native name) for each language code, shown in the picker.
export const LANG_NAMES: Record<string, string> = {
  en: "English", it: "Italiano", es: "Español", fr: "Français", de: "Deutsch",
  pt: "Português", "pt-BR": "Português (Brasil)", ru: "Русский",
  "zh-CN": "简体中文", "zh-TW": "繁體中文", ja: "日本語", ko: "한국어",
  ar: "العربية", hi: "हिन्दी", bn: "বাংলা", ur: "اردو", fa: "فارسی", he: "עברית",
  tr: "Türkçe", id: "Bahasa Indonesia", ms: "Bahasa Melayu", vi: "Tiếng Việt",
  th: "ไทย", fil: "Filipino",
  nl: "Nederlands", sv: "Svenska", no: "Norsk", da: "Dansk", fi: "Suomi",
  pl: "Polski", cs: "Čeština", sk: "Slovenčina", hu: "Magyar", ro: "Română",
  uk: "Українська", el: "Ελληνικά",
  ca: "Català", eu: "Euskara", gl: "Galego",
  sr: "Српски", hr: "Hrvatski", sl: "Slovenščina", bg: "Български", mk: "Македонски",
  sw: "Kiswahili", af: "Afrikaans",
};

export async function detectInitialLang(stored?: string): Promise<string> {
  if (stored && resources[stored]) return stored;
  try {
    const os = (await osLocale()) ?? "en";
    const exact = os.replace("_", "-");
    if (resources[exact]) return exact;
    const base = exact.split("-")[0];
    if (resources[base]) return base;
  } catch {
    // Tauri plugin-os not available (e.g. running pure Vite dev) — just fall back.
  }
  return "en";
}

export function applyDirAndLang(lang: string) {
  document.documentElement.dir = RTL_LANGS.has(lang) ? "rtl" : "ltr";
  document.documentElement.lang = lang;
}

i18n.use(initReactI18next).init({
  resources,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
  react: { useSuspense: false }, // re-render synchronously on changeLanguage
});

export default i18n;
