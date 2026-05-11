import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { open as openExternal } from "@tauri-apps/plugin-shell";
import { PlaylistItem } from "../types";

interface Props {
  isOpen: boolean;
  items: PlaylistItem[];
  loading: boolean;
  error: string | null;
  onConfirm: (playlistItemsArg: string) => void;
  onCancel: () => void;
}

// "1,3,5-7,12" — what yt-dlp --playlist-items expects. Groups consecutive
// indices into ranges to keep the arg short for very long selections.
function compressIndices(indices: number[]): string {
  if (indices.length === 0) return "";
  const sorted = [...indices].sort((a, b) => a - b);
  const groups: string[] = [];
  let start = sorted[0];
  let end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      groups.push(start === end ? `${start}` : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  groups.push(start === end ? `${start}` : `${start}-${end}`);
  return groups.join(",");
}

export function PlaylistSelectionModal({ isOpen, items, loading, error, onConfirm, onCancel }: Props) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Reset selection when the modal reopens with a new list.
  useEffect(() => {
    if (isOpen) setSelected(new Set(items.map((it) => it.index)));
  }, [isOpen, items]);

  const toggle = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(items.map((it) => it.index)));
  const deselectAll = () => setSelected(new Set());

  const confirm = () => {
    if (selected.size === 0) return;
    onConfirm(compressIndices([...selected]));
  };

  const counter = useMemo(() => `${selected.size} / ${items.length}`, [selected, items.length]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay playlist-overlay">
      <div className="modal playlist-modal">
        <div className="playlist-head">
          <h2>{t("playlist.modal.title", { defaultValue: "Select items from playlist" })}</h2>
          <span className="playlist-counter">{counter}</span>
        </div>

        {loading && (
          <div className="playlist-loading">
            {t("playlist.modal.loading", { defaultValue: "Fetching playlist…" })}
          </div>
        )}

        {error && !loading && (
          <div className="playlist-error">
            {t("playlist.modal.error", { defaultValue: "Failed to load playlist: {{message}}", message: error })}
          </div>
        )}

        {!loading && !error && (
          <>
            <div className="playlist-toolbar">
              <button className="link-button" onClick={selectAll}>
                {t("playlist.modal.selectAll", { defaultValue: "Select all" })}
              </button>
              <span className="footer-sep">·</span>
              <button className="link-button" onClick={deselectAll}>
                {t("playlist.modal.deselectAll", { defaultValue: "Deselect all" })}
              </button>
            </div>

            <ul className="playlist-list">
              {items.map((it) => (
                <li key={it.index} className="playlist-row">
                  <label>
                    <input
                      type="checkbox"
                      checked={selected.has(it.index)}
                      onChange={() => toggle(it.index)}
                    />
                    <span className="playlist-index">{it.index}.</span>
                    <span className="playlist-title">{it.title || `(untitled #${it.index})`}</span>
                    {it.duration_formatted && (
                      <span className="playlist-duration">{it.duration_formatted}</span>
                    )}
                  </label>
                </li>
              ))}
            </ul>
          </>
        )}

        <div className="playlist-support">
          <span>💛 {t("playlist.modal.support", { defaultValue: "ClipForge is free. Support its development:" })}</span>
          <button
            className="link-button"
            onClick={() => openExternal("https://github.com/sponsors/Michel-IT")}
          >
            GitHub Sponsors
          </button>
          <span className="footer-sep">·</span>
          <button
            className="link-button"
            onClick={() => openExternal("https://buymeacoffee.com/michelmarrazzo")}
          >
            Buy Me a Coffee
          </button>
          <span className="footer-sep">·</span>
          <button
            className="link-button"
            onClick={() => openExternal("https://paypal.me/MichelMarrazzo")}
          >
            PayPal
          </button>
        </div>

        <div className="modal-actions">
          <button className="modal-decline" onClick={onCancel}>
            {t("playlist.modal.cancel", { defaultValue: "Cancel" })}
          </button>
          <button
            className="modal-accept"
            onClick={confirm}
            disabled={selected.size === 0 || loading || !!error}
          >
            {t("playlist.modal.confirm", { defaultValue: "Download {{count}} selected", count: selected.size })}
          </button>
        </div>
      </div>
    </div>
  );
}
