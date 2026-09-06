// Subtitle generation via a system-wide `whisper` install.
//
// Two stages behind one job id, because that is what the user experiences as a
// single action: yt-dlp pulls the audio track, then Whisper transcribes it.
// Both stages report on the existing download-* event channel so the download
// dock renders them without knowing this path exists.
//
// Whisper is NOT a bundled sidecar (see preflight.rs) — it is resolved from
// PATH, so every failure mode here has to say which stage broke.

use serde::Serialize;
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;

use once_cell::sync::Lazy;
use tauri::{AppHandle, Emitter};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

use crate::error::AppError;
use crate::sidecar;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

// Whisper runs as a plain OS process, not a Tauri sidecar, so it cannot live in
// sidecar::JOBS (which stores CommandChild). Separate registry, same job ids.
static WHISPER_JOBS: Lazy<Mutex<HashMap<String, Child>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

pub fn cancel(job_id: &str) -> bool {
    if let Some(mut child) = WHISPER_JOBS.lock().unwrap().remove(job_id) {
        let _ = child.kill();
        true
    } else {
        false
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct TranscribeStarted {
    pub job_id: String,
}

fn emit_phase(app: &AppHandle, job: &str, key: &str, legacy: &str, step: u32, percent: f64) {
    let _ = app.emit(
        "download-progress",
        serde_json::json!({
            "job_id": job,
            "percent": percent,
            "speed": "",
            "eta": "",
            "phase": legacy,
            "phase_key": key,
            "phase_step": step,
            "phase_total": 2,
        }),
    );
}

fn log(app: &AppHandle, job: &str, line: impl Into<String>) {
    let _ = app.emit(
        "download-log",
        serde_json::json!({ "job_id": job, "stream": "stdout", "line": line.into() }),
    );
}

/// `[00:01:23.000 --> ...]` — Whisper's per-segment prefix. Turning the segment
/// start into a percentage is the only progress signal it offers.
fn parse_segment_secs(line: &str) -> Option<f64> {
    let start = line.strip_prefix('[')?;
    let ts = start.split("-->").next()?.trim();
    let mut parts: Vec<f64> = ts.split(':').filter_map(|p| p.trim().parse().ok()).collect();
    if parts.is_empty() {
        return None;
    }
    parts.reverse(); // sec, min, hour
    Some(parts.iter().enumerate().map(|(i, v)| v * 60f64.powi(i as i32)).sum())
}

#[tauri::command]
pub async fn transcribe(
    app: AppHandle,
    url: String,
    out_dir: String,
    model: String,
    language: Option<String>,
    duration_secs: Option<f64>,
    cookies_browser: Option<String>,
) -> Result<TranscribeStarted, AppError> {
    let job_id = Uuid::new_v4().to_string();
    let job = job_id.clone();
    let handle = app.clone();

    tauri::async_runtime::spawn(async move {
        // ---- stage 1: audio ---------------------------------------------
        emit_phase(&handle, &job, "phase.extractingAudio", "extracting audio", 1, 0.0);

        // A fixed stem keeps stage 2 from having to guess the file name back
        // out of yt-dlp's title templating.
        let stem = format!("clipforge-{}", &job[..8]);
        let mut args: Vec<String> = vec![
            "-f".into(), "bestaudio/best".into(),
            "--extract-audio".into(),
            "--audio-format".into(), "mp3".into(),
            "-o".into(), format!("{out_dir}/{stem}.%(ext)s"),
            "--no-playlist".into(),
            "--newline".into(),
            "--no-check-certificate".into(),
        ];
        if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
            args.push("--cookies-from-browser".into());
            args.push(b.clone());
        }
        args.push(url.clone());

        let audio_out = match handle.shell().sidecar("yt-dlp") {
            Ok(cmd) => cmd.args(args).output().await,
            Err(e) => {
                let _ = handle.emit("download-error", serde_json::json!({
                    "job_id": job, "error_key": "error.sidecar", "message": e.to_string() }));
                return;
            }
        };
        match audio_out {
            Ok(o) if o.status.success() => {}
            Ok(o) => {
                let err = String::from_utf8_lossy(&o.stderr).to_string();
                let _ = handle.emit("download-error", serde_json::json!({
                    "job_id": job,
                    "error_key": crate::commands::classify_failure(&err),
                    "message": err.lines().rev().take(3).collect::<Vec<_>>().join("\n") }));
                return;
            }
            Err(e) => {
                let _ = handle.emit("download-error", serde_json::json!({
                    "job_id": job, "error_key": "error.sidecar", "message": e.to_string() }));
                return;
            }
        }

        if sidecar::was_canceled(&job) {
            let _ = handle.emit("download-canceled",
                serde_json::json!({ "job_id": job, "files_removed": 0 }));
            return;
        }

        let audio_path = format!("{out_dir}/{stem}.mp3");

        // ---- stage 2: transcription -------------------------------------
        emit_phase(&handle, &job, "phase.transcribing", "transcribing", 2, 0.0);

        let mut cmd = Command::new("whisper");
        #[cfg(windows)]
        cmd.creation_flags(CREATE_NO_WINDOW);
        cmd.arg(&audio_path)
            .args(["--model", &model])
            .args(["--output_format", "srt"])
            .args(["--output_dir", &out_dir])
            // Whisper buffers hard when stdout is a pipe; without this the
            // progress lines only arrive once the whole file is done.
            .env("PYTHONUNBUFFERED", "1")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        if let Some(l) = language.as_ref().filter(|s| !s.is_empty() && s.as_str() != "auto") {
            cmd.args(["--language", l]);
        }

        let mut child = match cmd.spawn() {
            Ok(c) => c,
            Err(e) => {
                let _ = handle.emit("download-error", serde_json::json!({
                    "job_id": job, "error_key": "error.whisperMissing", "message": e.to_string() }));
                return;
            }
        };

        let stdout = child.stdout.take();
        let stderr = child.stderr.take();
        WHISPER_JOBS.lock().unwrap().insert(job.clone(), child);

        // stderr MUST be drained on its own thread. Whisper downloads the model
        // on first use (72 MB for `tiny`, ~3 GB for `large`) and writes that
        // progress bar to stderr: left unread, the pipe buffer fills and the
        // child blocks forever. Draining it also gives us the only visible sign
        // that a long first-run download is happening at all.
        if let Some(err) = stderr {
            let h = handle.clone();
            let j = job.clone();
            std::thread::spawn(move || {
                for line in BufReader::new(err).lines().map_while(Result::ok) {
                    // The bar repaints with \r on one line; keep only the last
                    // segment so the log gets a readable value, not the whole
                    // repaint history.
                    let tail = line.rsplit('\r').next().unwrap_or(&line).trim().to_string();
                    if !tail.is_empty() {
                        log(&h, &j, tail);
                    }
                }
            });
        }

        if let Some(out) = stdout {
            let total = duration_secs.unwrap_or(0.0);
            for line in BufReader::new(out).lines().map_while(Result::ok) {
                if let Some(secs) = parse_segment_secs(&line) {
                    if total > 0.0 {
                        emit_phase(&handle, &job, "phase.transcribing", "transcribing", 2,
                                   (secs / total * 100.0).clamp(0.0, 99.0));
                    }
                }
                log(&handle, &job, line);
            }
        }

        let status = WHISPER_JOBS.lock().unwrap().remove(&job).map(|mut c| c.wait());

        if sidecar::was_canceled(&job) {
            let _ = std::fs::remove_file(&audio_path);
            let _ = handle.emit("download-canceled",
                serde_json::json!({ "job_id": job, "files_removed": 1 }));
            return;
        }

        let ok = matches!(status, Some(Ok(s)) if s.success());
        if !ok {
            let _ = handle.emit("download-error", serde_json::json!({
                "job_id": job, "error_key": "error.transcribe",
                "message": "whisper did not finish successfully" }));
            return;
        }

        // The intermediate audio is a means, not a deliverable — the user asked
        // for subtitles.
        let _ = std::fs::remove_file(&audio_path);

        let _ = handle.emit("download-complete", serde_json::json!({
            "job_id": job,
            "output_path": format!("{out_dir}/{stem}.srt"),
        }));
    });

    Ok(TranscribeStarted { job_id })
}
