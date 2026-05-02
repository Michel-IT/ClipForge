import { PlatformInfo } from "../types";

interface Props {
  platform: PlatformInfo | null;
}

export function CapabilityPills({ platform }: Props) {
  const pill = (label: string, on: boolean) => (
    <span className={`pill ${on ? "pill-on" : "pill-off"}`} key={label}>
      {label}
    </span>
  );

  return (
    <div className="capability-pills">
      <span
        className="platform-badge"
        style={{ backgroundColor: platform?.color ?? "#3a3f4b" }}
      >
        {platform?.name || "—"}
      </span>
      {pill("Video", !!platform?.video)}
      {pill("Audio", !!platform?.audio)}
      {pill("Subs", !!platform?.subs)}
    </div>
  );
}
