#!/usr/bin/env node
// Generates the 44 non-master language files from src/locales/en/translation.json
// using DeepL Free API + OpenAI fallback for languages DeepL doesn't cover.
//
// Usage:
//   DEEPL_API_KEY=…  OPENAI_API_KEY=…  node scripts/translate-locales.mjs
//   DEEPL_API_KEY=…  OPENAI_API_KEY=…  node scripts/translate-locales.mjs --only=de,fr,es
//
// Skip behaviour:
//   - en, it (master + native) are always skipped.
//   - Lang dir already containing a human translation (_meta.autoTranslated === false
//     AND _meta.source === "human") is skipped — won't overwrite human work.
//
// Cost (approx, 2026-05): ~52 short strings * 44 langs ≈ 2300 calls. DeepL
// Free covers 30 langs, ~500k chars/month free quota covers many runs. The
// 14 fallback langs hit OpenAI gpt-4o-mini (~$0.01 per full run).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const SRC  = join(ROOT, "src", "locales", "en", "translation.json");
const OUT  = join(ROOT, "src", "locales");

// DeepL-supported target codes (2026-05). Lowercase keys are i18next codes;
// values are DeepL target codes (some are uppercase regional variants).
const DEEPL_MAP = {
  es:"ES", fr:"FR", de:"DE", pt:"PT-PT", "pt-BR":"PT-BR", ru:"RU",
  "zh-CN":"ZH-HANS", "zh-TW":"ZH-HANT", ja:"JA", ko:"KO",
  ar:"AR", tr:"TR", id:"ID", nl:"NL", sv:"SV", no:"NB", da:"DA", fi:"FI",
  pl:"PL", cs:"CS", sk:"SK", hu:"HU", ro:"RO", uk:"UK", el:"EL",
  bg:"BG", sl:"SL", lt:"LT", lv:"LV", et:"ET", he:"HE",
};

// Languages that need OpenAI fallback (no DeepL coverage).
const OPENAI_ONLY = new Set([
  "hi","bn","ur","fa","ms","vi","th","fil",
  "ca","eu","gl","sr","hr","mk","sw","af",
]);

const ALL_TARGETS = [
  "es","fr","de","pt","pt-BR","ru","zh-CN","zh-TW","ja","ko",
  "ar","hi","bn","ur","fa","he","tr","id","ms","vi","th","fil",
  "nl","sv","no","da","fi","pl","cs","sk","hu","ro","uk","el",
  "ca","eu","gl","sr","hr","sl","bg","mk","sw","af",
];

const args = process.argv.slice(2);
const onlyArg = args.find((a) => a.startsWith("--only="));
const TARGETS = onlyArg ? onlyArg.slice("--only=".length).split(",") : ALL_TARGETS;

const DEEPL_KEY  = process.env.DEEPL_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!DEEPL_KEY && !OPENAI_KEY) {
  console.error("Need at least one of DEEPL_API_KEY or OPENAI_API_KEY in env.");
  process.exit(1);
}

const enJson = JSON.parse(readFileSync(SRC, "utf-8"));

// Recursively walk leaves.
function walk(obj, fn, path = []) {
  if (typeof obj === "string") return fn(path, obj);
  if (Array.isArray(obj)) return obj.map((v, i) => walk(v, fn, [...path, i]));
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_meta") { out[k] = v; continue; }
      out[k] = walk(v, fn, [...path, k]);
    }
    return out;
  }
  return obj;
}

// Protect i18n placeholders {{var}} so the engine doesn't translate them.
function protect(text)   { return text.replace(/\{\{(\w+)\}\}/g, (_, n) => `<x id="${n}"/>`); }
function restore(text)   { return text.replace(/<x id="(\w+)"\s*\/>/g, (_, n) => `{{${n}}}`); }

async function deeplTranslate(text, targetCode) {
  const params = new URLSearchParams({
    auth_key: DEEPL_KEY,
    text: protect(text),
    source_lang: "EN",
    target_lang: targetCode,
    tag_handling: "xml",
  });
  const resp = await fetch("https://api-free.deepl.com/v2/translate", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  if (!resp.ok) throw new Error(`DeepL ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return restore(json.translations[0].text);
}

async function openaiTranslateBatch(items, lang) {
  // items: [{path: "modal.disclaimer.title", text: "Legal Disclaimer"}, ...]
  const prompt = `Translate the following UI strings from English to ${lang}.
Return STRICT JSON: an object mapping the same keys to translated strings.
Preserve {{var}} placeholders verbatim. Keep <strong> tags intact.
Do not translate brand names (ClipForge, yt-dlp, YouTube, Reddit, TikTok).

Input:
${JSON.stringify(Object.fromEntries(items.map(i => [i.path, i.text])), null, 2)}`;
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
    }),
  });
  if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);
  const json = await resp.json();
  return JSON.parse(json.choices[0].message.content);
}

async function translateLang(lang) {
  const dir  = join(OUT, lang);
  const file = join(dir, "translation.json");
  if (existsSync(file)) {
    const cur = JSON.parse(readFileSync(file, "utf-8"));
    if (cur._meta?.autoTranslated === false && cur._meta?.source === "human") {
      console.log(`[${lang}] skip (human translation present)`);
      return;
    }
  }

  const useDeepL = DEEPL_KEY && DEEPL_MAP[lang] && !OPENAI_ONLY.has(lang);
  console.log(`[${lang}] translating via ${useDeepL ? "deepl" : "openai"}…`);

  let translated;
  if (useDeepL) {
    translated = await walkAsync(enJson, async (_path, text) => {
      try { return await deeplTranslate(text, DEEPL_MAP[lang]); }
      catch (e) { console.warn(`  deepl fail "${text}": ${e.message}`); return text; }
    });
  } else if (OPENAI_KEY) {
    // Batch all leaves into a single OpenAI call.
    const items = [];
    walk(enJson, (path, text) => items.push({ path: path.join("."), text }));
    const map = await openaiTranslateBatch(items, lang);
    translated = walk(enJson, (path, text) => map[path.join(".")] ?? text);
  } else {
    console.warn(`[${lang}] no API for this lang, leaving as EN copy`);
    translated = JSON.parse(JSON.stringify(enJson));
  }

  translated._meta = {
    autoTranslated: true,
    generated: new Date().toISOString(),
    source: useDeepL ? "deepl" : "openai",
  };

  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(file, JSON.stringify(translated, null, 2) + "\n", "utf-8");
  console.log(`[${lang}] done → ${file}`);
}

// Async walker (sequential per leaf to keep DeepL rate-limit happy).
async function walkAsync(obj, fn, path = []) {
  if (typeof obj === "string") return await fn(path, obj);
  if (Array.isArray(obj)) {
    const out = [];
    for (let i = 0; i < obj.length; i++) out.push(await walkAsync(obj[i], fn, [...path, i]));
    return out;
  }
  if (obj && typeof obj === "object") {
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
      if (k === "_meta") { out[k] = v; continue; }
      out[k] = await walkAsync(v, fn, [...path, k]);
    }
    return out;
  }
  return obj;
}

for (const lang of TARGETS) {
  try { await translateLang(lang); }
  catch (e) { console.error(`[${lang}] FAILED: ${e.message}`); }
}
