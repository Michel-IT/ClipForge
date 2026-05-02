import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getVersion } from "@tauri-apps/api/app";
import { open } from "@tauri-apps/plugin-shell";

interface Props {
  onClose: () => void;
}

const DEPS: Array<{ key: "ytdlp" | "ffmpeg" | "tauri" | "react"; url: string }> = [
  { key: "ytdlp",  url: "https://github.com/yt-dlp/yt-dlp" },
  { key: "ffmpeg", url: "https://ffmpeg.org/legal.html" },
  { key: "tauri",  url: "https://tauri.app" },
  { key: "react",  url: "https://react.dev" },
];

const AUTHOR     = "Michel-IT";
const REPO_URL   = "https://github.com/Michel-IT/ClipForge";
const LICENSE_URL = "https://github.com/Michel-IT/ClipForge/blob/main/LICENSE";

export function AboutModal({ onClose }: Props) {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal about-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("about.title")}</h2>
        <div className="about-body">
          <p className="about-line">
            <strong>{t("about.version", { version })}</strong>
          </p>
          <p className="about-line">
            <button className="about-link" onClick={() => open(LICENSE_URL)}>
              {t("about.license")}
            </button>
          </p>
          <p className="about-line">
            <button className="about-link" onClick={() => open(REPO_URL)}>
              {t("about.author", { author: AUTHOR })}
            </button>
          </p>

          <h3 className="about-section">{t("about.builtWith")}</h3>
          <ul className="about-deps">
            {DEPS.map((d) => (
              <li key={d.key}>
                <button className="about-link" onClick={() => open(d.url)}>
                  {t(`about.dependencies.${d.key}`)}
                </button>
              </li>
            ))}
          </ul>

          <p className="about-note">{t("about.ffmpegNote")}</p>
        </div>
        <div className="modal-actions">
          <span />
          <button onClick={onClose} className="modal-accept">
            {t("about.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
