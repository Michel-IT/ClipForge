interface Props {
  percent: number;
  speed: string;
  eta: string;
  status: string;
}

export function ProgressBar({ percent, speed, eta, status }: Props) {
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
        {eta && <span>ETA {eta}</span>}
        <span>{percent.toFixed(1)}%</span>
      </div>
    </div>
  );
}
