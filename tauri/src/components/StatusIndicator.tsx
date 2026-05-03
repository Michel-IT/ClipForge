import { useTranslation } from "react-i18next";

export type StatusKind =
  | { kind: "ready" }
  | { kind: "phase"; key: string; legacy: string; step?: number; total?: number }
  | { kind: "done"; path: string }
  | { kind: "error"; message: string }
  | { kind: "canceled"; filesRemoved: number };

interface Props {
  status: StatusKind;
}

// Small coloured label shown top-right of the app header.
// Mirrors clipforge.py's set_status() behaviour.
export function StatusIndicator({ status }: Props) {
  const { t } = useTranslation();
  let className = "status-indicator status-ready";
  let text = t("status.ready", { defaultValue: "Ready" });

  switch (status.kind) {
    case "ready":
      break;
    case "phase": {
      className = "status-indicator status-running";
      const label = t(status.key, { defaultValue: status.legacy });
      text = status.step && status.total
        ? `[${status.step}/${status.total}] ${label}`
        : label;
      break;
    }
    case "done":
      className = "status-indicator status-done";
      text = `✓ ${t("status.done", { defaultValue: "Done" })}`;
      break;
    case "error":
      className = "status-indicator status-error";
      text = `✕ ${t("status.error", { defaultValue: "Error" })}`;
      break;
    case "canceled":
      className = "status-indicator status-canceled";
      text = `⊘ ${t("status.canceled", { defaultValue: "Canceled" })}`;
      break;
  }
  return <span className={className} title={status.kind === "done" ? status.path : undefined}>{text}</span>;
}
