import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LogEvent } from "../types";

interface Props {
  lines: LogEvent[];
}

export function LogPanel({ lines }: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new lines, unless the user has scrolled up.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [lines]);

  return (
    <div className="log-panel" ref={ref}>
      {lines.length === 0 ? (
        <div className="log-empty">{t("log.empty", { defaultValue: "Download output will appear here." })}</div>
      ) : (
        lines.map((l, i) => (
          <div
            key={i}
            className={l.stream === "stderr" ? "log-line log-stderr" : "log-line"}
          >
            {l.line}
          </div>
        ))
      )}
    </div>
  );
}
