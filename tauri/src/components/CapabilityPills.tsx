import { useTranslation } from "react-i18next";
import { PlatformInfo } from "../types";

interface Props {
  platform: PlatformInfo | null;
}

export function CapabilityPills({ platform }: Props) {
  const { t } = useTranslation();
  const pill = (label: string, on: boolean) => (
    <span className={`pill ${on ? "pill-on" : "pill-off"}`} key={label}>
      {label}
    </span>
  );

  return (
    <div className="capability-pills">
      <span
        className="platform-badge"
        style={{ backgroundColor: platform?.color ?? "var(--surface)" }}
      >
        {platform?.name || "—"}
      </span>
      {pill(t("capabilities.video"), !!platform?.video)}
      {pill(t("capabilities.audio"), !!platform?.audio)}
      {pill(t("capabilities.subs"),  !!platform?.subs)}
    </div>
  );
}
