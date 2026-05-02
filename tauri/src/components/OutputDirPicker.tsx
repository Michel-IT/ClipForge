import { useTranslation } from "react-i18next";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  outDir: string;
  onChange: (dir: string) => void;
}

export function OutputDirPicker({ outDir, onChange }: Props) {
  const { t } = useTranslation();
  const pick = async () => {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") onChange(selected);
  };

  return (
    <div className="output-dir-picker">
      <label>{t("outputDir.label")}</label>
      <input
        type="text"
        value={outDir}
        readOnly
        placeholder={t("outputDir.placeholder")}
      />
      <button onClick={pick}>{t("outputDir.browse")}</button>
    </div>
  );
}
