import { useTranslation } from "react-i18next";

interface Props {
  percent: number;
  speed: string;
  eta: string;
  status: string;
}

export function ProgressBar({ percent, speed, eta, status }: Props) {
  const { t } = useTranslation();
  return (
    <div className="progress-bar">
      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="progress-meta">
        <span>{status}</span>
        {speed && <span>{speed}</span>}
        {eta && <span>{t("progress.eta", { eta })}</span>}
        <span>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
