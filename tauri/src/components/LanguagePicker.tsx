import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { LANG_NAMES, SUPPORTED_LANGS } from "../i18n";

interface Props {
  onChange: (lang: string) => void;
  compact?: boolean;
}

// Custom dropdown — replaces the native <select>. The native widget is rendered
// by the OS, which (a) ignores most CSS on <option>, leaving non-Latin scripts
// rendered with the system fallback font (often very thin), and (b) creates a
// translucent overlay that lightens the underlying dark UI during hover.
//
// This implementation gives full control over styling, fires onChange only on
// commit (click / Enter), and supports keyboard navigation.
export function LanguagePicker({ onChange, compact = false }: Props) {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);

  const current = i18n.language;
  const langs = SUPPORTED_LANGS;

  useEffect(() => {
    if (open) {
      const idx = Math.max(0, langs.indexOf(current));
      setHighlight(idx);
    }
  }, [open, current, langs]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.children[highlight] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [open, highlight]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const select = (lang: string) => {
    setOpen(false);
    if (lang !== current) onChange(lang);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); setOpen(false); }
    else if (e.key === "ArrowDown") { e.preventDefault(); setHighlight(h => Math.min(h + 1, langs.length - 1)); }
    else if (e.key === "ArrowUp")   { e.preventDefault(); setHighlight(h => Math.max(h - 1, 0)); }
    else if (e.key === "Home")      { e.preventDefault(); setHighlight(0); }
    else if (e.key === "End")       { e.preventDefault(); setHighlight(langs.length - 1); }
    else if (e.key === "Enter")     { e.preventDefault(); select(langs[highlight]); }
    else if (e.key === "Tab")       { setOpen(false); /* let focus move naturally */ }
  };

  return (
    <div
      className={compact ? "lang-picker compact" : "lang-picker"}
      ref={rootRef}
      onKeyDown={onKeyDown}
    >
      <button
        type="button"
        className="lang-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(o => !o)}
      >
        <span>{LANG_NAMES[current] ?? current}</span>
        <span className="lang-caret">▾</span>
      </button>
      {open && (
        <ul className="lang-popup" role="listbox" ref={listRef}>
          {langs.map((code, i) => (
            <li
              key={code}
              role="option"
              aria-selected={code === current}
              className={
                "lang-option" +
                (i === highlight ? " lang-highlight" : "") +
                (code === current ? " lang-current" : "")
              }
              onMouseEnter={() => setHighlight(i)}
              onClick={() => select(code)}
            >
              {LANG_NAMES[code] ?? code}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
