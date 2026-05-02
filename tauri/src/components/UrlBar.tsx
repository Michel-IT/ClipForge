import { useState } from "react";
import { useTranslation } from "react-i18next";
import { detectPlatform } from "../api";
import { PlatformInfo } from "../types";

interface Props {
  url: string;
  onUrlChange: (url: string) => void;
  onPlatformDetected: (info: PlatformInfo | null) => void;
}

export function UrlBar({ url, onUrlChange, onPlatformDetected }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  const handleDetect = async () => {
    if (!url.trim()) {
      onPlatformDetected(null);
      return;
    }
    setBusy(true);
    try {
      const info = await detectPlatform(url.trim());
      onPlatformDetected(info);
    } catch {
      onPlatformDetected(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="url-bar">
      <input
        type="text"
        placeholder={t("url.placeholder")}
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        onBlur={handleDetect}
        onKeyDown={(e) => {
          if (e.key === "Enter") handleDetect();
        }}
      />
      <button onClick={handleDetect} disabled={busy}>
        {busy ? t("url.detecting") : t("url.detect")}
      </button>
    </div>
  );
}
