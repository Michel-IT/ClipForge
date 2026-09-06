import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { preflightCheck, preflightInstall, onPreflightLog } from "../api";
import { DepStatus } from "../types";

interface Props {
  onReady: () => void;
}

type Phase = "checking" | "installing" | "blocked" | "ready";

/**
 * Startup dependency gate: the main window is not rendered until every required
 * tool is present. Missing pieces we have a recipe for are installed without
 * asking; the ones we cannot bootstrap (Python, pip) are reported with the
 * command to run, because installing a language runtime behind the user's back
 * is a step further than this screen should go.
 */
export function PreflightScreen({ onReady }: Props) {
  const { t } = useTranslation();
  const [deps, setDeps] = useState<DepStatus[]>([]);
  const [phase, setPhase] = useState<Phase>("checking");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [logLine, setLogLine] = useState("");
  const [failure, setFailure] = useState<string | null>(null);
  // Install each dependency at most once per launch: a package that installs
  // "successfully" but still fails to resolve would otherwise loop forever.
  const attempted = useRef<Set<string>>(new Set());

  useEffect(() => {
    let un: (() => void) | undefined;
    onPreflightLog(setLogLine).then((f) => { un = f; }).catch(() => {});
    return () => { un?.(); };
  }, []);

  const run = useCallback(async () => {
    setPhase("checking");
    setFailure(null);
    let report;
    try {
      report = await preflightCheck();
    } catch (e) {
      setFailure(String(e));
      setPhase("blocked");
      return;
    }
    setDeps(report.deps);

    if (report.ok) {
      setPhase("ready");
      onReady();
      return;
    }

    const fixable = report.deps.filter(
      (d) => d.required && !d.found && d.installable && !attempted.current.has(d.id),
    );
    if (fixable.length === 0) {
      setPhase("blocked");
      return;
    }

    setPhase("installing");
    for (const dep of fixable) {
      attempted.current.add(dep.id);
      setBusyId(dep.id);
      try {
        await preflightInstall(dep.id);
      } catch (e) {
        setFailure(String(e));
      }
    }
    setBusyId(null);
    setLogLine("");
    // Re-check rather than trusting the installer's exit code: what matters is
    // whether the executable resolves now, not whether pip said it was happy.
    await run();
  }, [onReady]);

  useEffect(() => { void run(); }, [run]);

  const blockedManual = deps.filter((d) => d.required && !d.found && !d.installable);

  return (
    <div className="preflight">
      <div className="preflight-box">
        <h1 className="preflight-title">{t("preflight.title")}</h1>
        <p className="preflight-sub">
          {phase === "installing" ? t("preflight.installing") : t("preflight.checking")}
        </p>

        <ul className="preflight-list">
          {deps.map((d) => {
            const state = busyId === d.id ? "busy" : d.found ? "ok" : "missing";
            return (
              <li key={d.id} className={`preflight-row preflight-${state}`}>
                <span className="preflight-mark" aria-hidden="true">
                  {state === "ok" ? "✓" : state === "busy" ? "…" : "✕"}
                </span>
                <span className="preflight-name">{t(`preflight.dep.${d.id}`, { defaultValue: d.id })}</span>
                <span className="preflight-detail">
                  {d.found ? d.version || d.path : t("preflight.missing")}
                </span>
              </li>
            );
          })}
        </ul>

        {phase === "installing" && (
          <p className="preflight-log" title={logLine}>{logLine}</p>
        )}

        {phase === "blocked" && (
          <div className="preflight-blocked">
            {blockedManual.length > 0 && (
              <>
                <p>{t("preflight.needManual")}</p>
                <pre className="preflight-cmd">
                  {blockedManual.map((d) => t(`preflight.install.${d.id}`, { defaultValue: d.id })).join("\n")}
                </pre>
              </>
            )}
            {failure && <p className="preflight-error">{failure}</p>}
            <button className="preflight-retry" onClick={() => { attempted.current.clear(); void run(); }}>
              {t("preflight.retry")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
