import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { useTranslation } from "react-i18next";
import { AboutModal } from "./AboutModal";

export function Footer() {
  const { t } = useTranslation();
  const [version, setVersion] = useState("");
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    getVersion().then(setVersion).catch(() => setVersion(""));
  }, []);

  return (
    <>
      <footer className="app-footer">
        {version && <span>v{version}</span>}
        {version && <span className="footer-sep">•</span>}
        <span>AGPL-3.0</span>
        <span className="footer-sep">•</span>
        <button className="footer-link" onClick={() => setAboutOpen(true)}>
          {t("footer.about")}
        </button>
      </footer>
      {aboutOpen && <AboutModal onClose={() => setAboutOpen(false)} />}
    </>
  );
}
