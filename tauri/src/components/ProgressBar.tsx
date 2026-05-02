import { useTranslation } from "react-i18next";

type State = "ready" | "running" | "done" | "error";

interface Props {
  percent: number;
  speed: string;
  eta: string;
  status: string;
  state: State;
}

export function ProgressBar({ percent, speed, eta, status, state }: Props) {
  const { t } = useTranslation();
  const icon =
    state === "done"  ? "✓ " :
    state === "error" ? "✕ " :
    "";
  return (
    <div className={`progress-bar progress-${state}`}>
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${state === "done" ? 100 : Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="progress-meta">
        <span className="progress-status">{icon}{status}</span>
        {speed && <span>{speed}</span>}
        {eta && <span>{t("progress.eta", { eta })}</span>}
        {state !== "done" && <span>{percent.toFixed(1)}%</span>}
      </div>
    </div>
  );
}
