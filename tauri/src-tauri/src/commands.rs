use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_shell::ShellExt;
use uuid::Uuid;

use crate::error::AppError;
use crate::platforms::{detect, PlatformInfo};
use crate::sidecar;

// yt-dlp needs to know where ffmpeg lives to merge streams, embed thumbnails,
// extract audio, etc. Tauri copies the externalBin sidecars next to the running
// binary (and drops the target-triple suffix), so we resolve from current_exe().
fn ffmpeg_path() -> Option<String> {
    let exe = std::env::current_exe().ok()?;
    let dir = exe.parent()?;
    let name = if cfg!(windows) { "ffmpeg.exe" } else { "ffmpeg" };
    let path = dir.join(name);
    path.exists().then(|| path.to_string_lossy().into_owned())
}

// Reject anything that doesn't parse as an http(s) URL before we hand it to
// yt-dlp — surfaces a clean error instead of a cryptic "yt-dlp exited with N".
fn validate_url(url: &str) -> Result<(), AppError> {
    let parsed = url::Url::parse(url).map_err(|_| AppError::InvalidUrl(url.to_string()))?;
    match parsed.scheme() {
        "http" | "https" => Ok(()),
        other => Err(AppError::InvalidUrl(format!("unsupported scheme `{other}`"))),
    }
}

// If the user hasn't picked an output dir yet, fall back to ~/Downloads/ClipForge
// (mirror of the Python default at clipforge.py). Creates the dir if missing.
fn resolve_out_dir(app: &AppHandle, out_dir: String) -> Result<String, AppError> {
    use tauri::path::BaseDirectory;
    if !out_dir.trim().is_empty() {
        return Ok(out_dir);
    }
    let downloads = app
        .path()
        .resolve("ClipForge", BaseDirectory::Download)
        .map_err(|e| AppError::Other(format!("could not resolve Downloads dir: {e}")))?;
    std::fs::create_dir_all(&downloads)?;
    Ok(downloads.to_string_lossy().into_owned())
}

#[derive(Debug, Clone, Serialize)]
pub struct VideoInfo {
    pub title: String,
    pub uploader: Option<String>,
    pub duration: Option<f64>,
    pub duration_formatted: Option<String>,
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct FfmpegStatus {
    pub available: bool,
    pub path: String,
}

fn format_duration(secs: f64) -> String {
    let total = secs as u64;
    let h = total / 3600;
    let m = (total % 3600) / 60;
    let s = total % 60;
    if h > 0 {
        format!("{}:{:02}:{:02}", h, m, s)
    } else {
        format!("{}:{:02}", m, s)
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadStarted {
    pub job_id: String,
}

#[tauri::command]
pub async fn detect_platform(url: String) -> Result<PlatformInfo, AppError> {
    Ok(detect(&url))
}

// Embed DISCLAIMER.md at build time so the bundle never depends on a runtime
// file. Mirrors the Python app's DISCLAIMER_TEXT constant.
const DISCLAIMER: &str = include_str!("../../../DISCLAIMER.md");

#[tauri::command]
pub async fn get_disclaimer() -> Result<String, AppError> {
    Ok(DISCLAIMER.to_string())
}

// Probe-only: yt-dlp --dump-single-json --no-download --no-warnings [--cookies-from-browser X]
//
// Skeleton: spawns the sidecar but does not yet parse the JSON or implement the
// retry-without-cookies fallback that mirrors _run_with_cookie_fallback
// (clipforge.py:834-850). Returns a dummy VideoInfo so the UI wiring is verifiable.
#[tauri::command]
pub async fn fetch_info(
    app: AppHandle,
    url: String,
    cookies_browser: Option<String>,
) -> Result<VideoInfo, AppError> {
    validate_url(&url)?;
    let mut args: Vec<String> = vec![
        "--dump-single-json".into(),
        "--no-download".into(),
        "--no-warnings".into(),
        // Don't enumerate the whole playlist when the URL contains &list= —
        // we only want metadata for the single video the user pasted.
        "--no-playlist".into(),
        // YouTube needs a JS runtime (Deno) to decipher signatures with the
        // default web client. Without it, --dump-single-json hangs. Force a
        // no-JS-needed client. tv_simply is the most reliable currently;
        // android_vr is the fallback we already use successfully for downloads.
        "--extractor-args".into(),
        "youtube:player_client=tv_simply,android_vr".into(),
        "--socket-timeout".into(),
        "10".into(),
    ];
    let used_cookies = cookies_browser.as_ref().is_some_and(|s| !s.is_empty());
    if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
        args.push("--cookies-from-browser".into());
        args.push(b.clone());
    }
    args.push(url);

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| AppError::Sidecar(e.to_string()))?
        .args(args.clone())
        .output()
        .await
        .map_err(|e| AppError::Sidecar(e.to_string()))?;

    let success = output.status.success();
    let stderr_text = String::from_utf8_lossy(&output.stderr).to_string();

    // If the cookie DB is locked (browser open), retry once without cookies —
    // mirror of the spawn_download fallback. fetch_info is metadata-only so
    // cookies usually aren't required anyway.
    let final_output = if !success && used_cookies && looks_like_browser_lock(&stderr_text) {
        let retry_args = strip_cookies_flag(&args);
        let r = app
            .shell()
            .sidecar("yt-dlp")
            .map_err(|e| AppError::Sidecar(e.to_string()))?
            .args(retry_args)
            .output()
            .await
            .map_err(|e| AppError::Sidecar(e.to_string()))?;
        if !r.status.success() {
            return Err(AppError::Sidecar(String::from_utf8_lossy(&r.stderr).to_string()));
        }
        r
    } else if !success {
        return Err(AppError::Sidecar(stderr_text));
    } else {
        output
    };

    let json: serde_json::Value = serde_json::from_slice(&final_output.stdout)?;
    let title = json["title"].as_str().unwrap_or("").to_string();
    let uploader = json["uploader"]
        .as_str()
        .or_else(|| json["channel"].as_str())
        .map(String::from);
    let duration = json["duration"].as_f64();
    let duration_formatted = duration.map(format_duration);
    let thumbnail = json["thumbnail"].as_str().map(String::from);
    Ok(VideoInfo { title, uploader, duration, duration_formatted, thumbnail })
}

#[tauri::command]
pub async fn ffmpeg_status() -> Result<FfmpegStatus, AppError> {
    match ffmpeg_path() {
        Some(p) => Ok(FfmpegStatus { available: true, path: p }),
        None => Ok(FfmpegStatus { available: false, path: String::new() }),
    }
}

#[tauri::command]
pub async fn open_dir(app: AppHandle, path: String) -> Result<(), AppError> {
    app.shell()
        .open(path, None)
        .map_err(|e| AppError::Sidecar(e.to_string()))?;
    Ok(())
}

// Mirrors _run_video (clipforge.py:1040-1076).
#[tauri::command]
pub async fn download_video(
    app: AppHandle,
    url: String,
    quality: String,
    out_dir: String,
    cookies_browser: Option<String>,
    playlist: bool,
) -> Result<DownloadStarted, AppError> {
    validate_url(&url)?;
    let format = match quality.as_str() {
        "Auto" | "Auto (best)" => "bv*+ba/b".to_string(),
        q => {
            let h: u32 = q.trim_end_matches('p').parse().unwrap_or(1080);
            format!("bv*[height<={h}]+ba/b[height<={h}]/b")
        }
    };
    let out_dir = resolve_out_dir(&app, out_dir)?;

    let mut args: Vec<String> = vec![
        "-f".into(), format,
        "--merge-output-format".into(), "mp4".into(),
        // Embed thumbnail into the MP4 atom; don't litter the dir with a side file.
        "--embed-thumbnail".into(),
        "--convert-thumbnails".into(), "jpg".into(),
        "--add-metadata".into(),
        "-o".into(), format!("{out_dir}/%(title)s.%(ext)s"),
        "--newline".into(),
        "--progress-template".into(),
        "PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s".into(),
    ];
    if let Some(p) = ffmpeg_path() {
        args.push("--ffmpeg-location".into());
        args.push(p);
    }
    if !playlist {
        args.push("--no-playlist".into());
    }
    if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
        args.push("--cookies-from-browser".into());
        args.push(b.clone());
    }
    args.push(url);

    spawn_download(&app, args, out_dir, None).await
}

// Mirrors _run_audio (clipforge.py:987-1020).
#[tauri::command]
pub async fn download_audio(
    app: AppHandle,
    url: String,
    bitrate: String,
    out_dir: String,
    cookies_browser: Option<String>,
    playlist: bool,
) -> Result<DownloadStarted, AppError> {
    validate_url(&url)?;
    let out_dir = resolve_out_dir(&app, out_dir)?;
    // No --write-thumbnail: we don't want to litter the output dir with the
    // .webp/.jpg cover next to the .mp3. --embed-thumbnail still downloads
    // the cover internally, embeds it, and cleans up.
    // --convert-thumbnails jpg: forces conversion to JPG before embed; PNG
    // sometimes fails silently in ID3 readers, JPG is universally compatible.
    let mut args: Vec<String> = vec![
        "-f".into(), "bestaudio/best".into(),
        "--extract-audio".into(),
        "--audio-format".into(), "mp3".into(),
        "--audio-quality".into(), bitrate,
        "--add-metadata".into(),
        "--embed-thumbnail".into(),
        "--convert-thumbnails".into(), "jpg".into(),
        "-o".into(), format!("{out_dir}/%(title)s.%(ext)s"),
        "--newline".into(),
        "--progress-template".into(),
        "PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s".into(),
    ];
    if let Some(p) = ffmpeg_path() {
        args.push("--ffmpeg-location".into());
        args.push(p);
    }
    if !playlist {
        args.push("--no-playlist".into());
    }
    if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
        args.push("--cookies-from-browser".into());
        args.push(b.clone());
    }
    args.push(url);

    spawn_download(&app, args, out_dir, None).await
}

// Mirrors _run_subs (clipforge.py:920-967).
// TODO: after process exit, scan out_dir for *.vtt and convert to .txt
// (port vtt_to_text from clipforge.py:268-288).
#[tauri::command]
pub async fn download_subs(
    app: AppHandle,
    url: String,
    langs: String,
    out_dir: String,
    cookies_browser: Option<String>,
    playlist: bool,
) -> Result<DownloadStarted, AppError> {
    validate_url(&url)?;
    let out_dir = resolve_out_dir(&app, out_dir)?;
    let mut args: Vec<String> = vec![
        "--skip-download".into(),
        "--write-subs".into(),
        "--write-auto-subs".into(),
        "--sub-langs".into(), langs,
        "--sub-format".into(), "vtt".into(),
        "-o".into(), format!("{out_dir}/%(title)s.%(ext)s"),
        "--newline".into(),
        "--progress-template".into(),
        "PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s".into(),
    ];
    if !playlist {
        args.push("--no-playlist".into());
    }
    if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
        args.push("--cookies-from-browser".into());
        args.push(b.clone());
    }
    args.push(url);

    let subs_dir = std::path::PathBuf::from(&out_dir);
    spawn_download(&app, args, out_dir, Some(subs_dir)).await
}

#[tauri::command]
pub async fn cancel_download(job_id: String) -> Result<(), AppError> {
    sidecar::cancel(&job_id);
    Ok(())
}

// Spawns yt-dlp as a sidecar, registers the child in the JOBS map, and
// detaches a task that streams stdout line-by-line, emitting:
//   - "download-progress" for every line parsed by progress::parse_line
//   - "download-complete" on a clean exit
//   - "download-error"    on a non-zero exit
//
// Skeleton: emits start + end events even when the line parser is a no-op,
// so the channel is verifiable end-to-end before progress logic lands.
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_https_url() {
        assert!(validate_url("https://www.youtube.com/watch?v=abc").is_ok());
    }

    #[test]
    fn accepts_http_url() {
        assert!(validate_url("http://example.com/video").is_ok());
    }

    #[test]
    fn rejects_garbage() {
        assert!(matches!(
            validate_url("asdf").unwrap_err(),
            AppError::InvalidUrl(_)
        ));
    }

    #[test]
    fn rejects_unsupported_scheme() {
        assert!(matches!(
            validate_url("ftp://example.com/foo").unwrap_err(),
            AppError::InvalidUrl(_)
        ));
    }
}

// Filter for noisy yt-dlp lines that the user doesn't need to see in the log
// panel. Two categories:
// 1. Recoverable cookie / JS-runtime warnings (already surfaced via the
//    "phase.cookieRetry" status when relevant).
// 2. yt-dlp internals that we already ran during the `Video info` button
//    (extractor warmup, format list, thumbnail discovery) — repeating them
//    on every download just clutters the panel.
//
// We KEEP: actual download/post-processing events ([download] Destination,
// [ExtractAudio], [Merger], [Metadata], [EmbedThumbnail]) and real errors.
fn is_log_noise(line: &str) -> bool {
    let l = line.to_lowercase();
    // 1. Cookie / JS runtime noise
    if l.starts_with("extracting cookies from")
        || l.contains("could not copy") && l.contains("cookie")
        || l.contains("failed to decrypt with dpapi")
        || l.contains("no supported javascript runtime")
        || l.contains("youtube extraction without a js runtime has been deprecated")
        || l.starts_with("warning:") && l.contains("javascript runtime")
    {
        return true;
    }
    // 2. Extractor-warmup noise — same info we already pulled in fetch_info.
    if l.starts_with("[youtube:tab]")
        || l.starts_with("[youtube]") && (
            l.contains("extracting url")
            || l.contains("downloading webpage")
            || l.contains("downloading ") && l.contains("api json")
            || l.contains("downloading m3u8")
            || l.contains("downloading mpd")
        )
        || l.starts_with("[info]") && (
            l.contains("downloading 1 format")
            || l.contains("downloading video thumbnail")
            || l.contains("writing video thumbnail")
        )
    {
        return true;
    }
    false
}

// Detects the stderr pattern emitted when yt-dlp can't read the browser cookie
// DB because the browser holds a Windows file lock. Mirrors the heuristic in
// _run_with_cookie_fallback (clipforge.py:834-850).
fn looks_like_browser_lock(stderr_text: &str) -> bool {
    let s = stderr_text.to_lowercase();
    // DPAPI failure: Windows cookie store encrypted with a key the process
    // can't read (often happens with Edge under certain Windows policies).
    if s.contains("dpapi") || s.contains("failed to decrypt") {
        return true;
    }
    // Generic file-lock pattern: browser is open and holding the cookie DB.
    (s.contains("could not copy") || s.contains("locked") || s.contains("permission denied"))
        && (s.contains("browser")
            || s.contains("chrome")
            || s.contains("firefox")
            || s.contains("edge")
            || s.contains("brave")
            || s.contains("opera")
            || s.contains("vivaldi")
            || s.contains("cookie"))
}

// Strips `--cookies-from-browser <name>` from an arg vec so we can retry the
// same command without cookies.
fn strip_cookies_flag(args: &[String]) -> Vec<String> {
    let mut out = Vec::with_capacity(args.len());
    let mut i = 0;
    while i < args.len() {
        if args[i] == "--cookies-from-browser" && i + 1 < args.len() {
            i += 2;
            continue;
        }
        out.push(args[i].clone());
        i += 1;
    }
    out
}

// Snapshot of files in a directory at job start — used by the cancel-cleanup
// path to delete only files this job created (partial downloads / intermediate
// thumbnails / leftover .webm).
fn snapshot_dir(dir: &std::path::Path) -> std::collections::HashSet<std::path::PathBuf> {
    let mut set = std::collections::HashSet::new();
    if let Ok(rd) = std::fs::read_dir(dir) {
        for entry in rd.flatten() {
            set.insert(entry.path());
        }
    }
    set
}

fn cleanup_partial(dir: &std::path::Path,
                   baseline: &std::collections::HashSet<std::path::PathBuf>) -> usize {
    let mut deleted = 0;
    if let Ok(rd) = std::fs::read_dir(dir) {
        for entry in rd.flatten() {
            let path = entry.path();
            if !baseline.contains(&path) {
                // New file created during this job. Delete (incomplete by definition).
                if std::fs::remove_file(&path).is_ok() {
                    deleted += 1;
                }
            }
        }
    }
    deleted
}

async fn spawn_download(
    app: &AppHandle,
    args: Vec<String>,
    out_dir: String,
    subs_post_dir: Option<std::path::PathBuf>,
) -> Result<DownloadStarted, AppError> {
    use tauri_plugin_shell::process::CommandEvent;

    let job_id = Uuid::new_v4().to_string();
    let args_for_retry = args.clone();
    let baseline = snapshot_dir(std::path::Path::new(&out_dir));
    let out_dir_for_task = std::path::PathBuf::from(&out_dir);
    let (mut rx, child) = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| AppError::Sidecar(e.to_string()))?
        .args(args)
        .spawn()
        .map_err(|e| AppError::Sidecar(e.to_string()))?;

    sidecar::register(job_id.clone(), child);

    let app_handle = app.app_handle().clone();
    let job_for_task = job_id.clone();
    let app_for_retry = app.app_handle().clone();
    tauri::async_runtime::spawn(async move {
        // (legacy_text, canonical_i18n_key, step_index) — frontend prefers
        // the key; legacy text is kept for backward-compat / debug logs.
        // step_index is 1-based; total steps is sent alongside via a const.
        const PHASE_DOWNLOADING:  (&str, &str, u32) = ("downloading",         "phase.downloading",        1);
        const PHASE_MERGING:      (&str, &str, u32) = ("merging",             "phase.merging",            2);
        const PHASE_EXTRACT:      (&str, &str, u32) = ("extracting audio",    "phase.extractingAudio",    2);
        const PHASE_EMBED:        (&str, &str, u32) = ("embedding thumbnail", "phase.embeddingThumbnail", 3);
        const TOTAL_STEPS: u32 = 3; // download → merge/extract → embed

        let mut last_output: Option<String> = None;
        let mut phase: (&str, &str, u32) = PHASE_DOWNLOADING;
        let mut stderr_buf = String::new();
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let line = String::from_utf8_lossy(&bytes).to_string();
                    if let Some(p) = crate::progress::parse_line(&line) {
                        let _ = app_handle.emit(
                            "download-progress",
                            serde_json::json!({
                                "job_id":     job_for_task,
                                "percent":    p.percent,
                                "speed":      p.speed,
                                "eta":        p.eta,
                                "phase":      phase.0,
                                "phase_key":  phase.1,
                                "phase_step": phase.2,
                                "phase_total": TOTAL_STEPS,
                            }),
                        );
                    } else {
                        // Non-PROGRESS lines: send to the log panel.
                        let trimmed = line.trim_end();
                        if !trimmed.is_empty() && !is_log_noise(trimmed) {
                            let _ = app_handle.emit(
                                "download-log",
                                serde_json::json!({
                                    "job_id": job_for_task,
                                    "stream": "stdout",
                                    "line":   trimmed,
                                }),
                            );
                        }
                    }
                    // Track final output path through the post-processor chain.
                    // The relevant prefixes (in order yt-dlp emits them) are:
                    //   [download]      Destination: <intermediate>.webm/.m4a
                    //   [Merger]        Merging formats into "<final>.mp4"
                    //   [ExtractAudio]  Destination: <final>.mp3
                    //   [EmbedThumbnail] ... (no path; same file as previous step)
                    let prev_step = phase.2;
                    if let Some(path) = line.strip_prefix("[download] Destination: ") {
                        last_output = Some(path.trim().to_string());
                    } else if let Some(rest) = line.strip_prefix("[Merger] Merging formats into \"") {
                        if let Some(end) = rest.rfind('"') {
                            last_output = Some(rest[..end].to_string());
                        }
                        phase = PHASE_MERGING;
                    } else if let Some(path) = line.strip_prefix("[ExtractAudio] Destination: ") {
                        last_output = Some(path.trim().to_string());
                        phase = PHASE_EXTRACT;
                    } else if line.starts_with("[EmbedThumbnail]") {
                        phase = PHASE_EMBED;
                    }
                    // Synthesize an immediate progress event when the phase
                    // bumps so the UI updates the step label even if no
                    // PROGRESS line follows for a while (ffmpeg phases are
                    // silent on stdout).
                    if phase.2 != prev_step {
                        let _ = app_handle.emit(
                            "download-progress",
                            serde_json::json!({
                                "job_id":      job_for_task,
                                "percent":     100.0,  // download itself is done at this point
                                "speed":       "",
                                "eta":         "",
                                "phase":       phase.0,
                                "phase_key":   phase.1,
                                "phase_step":  phase.2,
                                "phase_total": TOTAL_STEPS,
                            }),
                        );
                    }
                }
                CommandEvent::Stderr(bytes) => {
                    let chunk = String::from_utf8_lossy(&bytes).to_string();
                    stderr_buf.push_str(&chunk);
                    for line in chunk.lines() {
                        let trimmed = line.trim_end();
                        if trimmed.is_empty() || is_log_noise(trimmed) { continue; }
                        let _ = app_handle.emit(
                            "download-log",
                            serde_json::json!({
                                "job_id": job_for_task,
                                "stream": "stderr",
                                "line":   trimmed,
                            }),
                        );
                    }
                }
                CommandEvent::Terminated(payload) => {
                    let code = payload.code.unwrap_or(-1);
                    if code == 0 {
                        // For subs jobs: convert .vtt files in the output dir to .txt
                        // (port of vtt_to_text from clipforge.py:268-288). Failures
                        // here are non-fatal — the .vtt remains and the user still
                        // gets a successful download event.
                        if let Some(dir) = &subs_post_dir {
                            match crate::subs::convert_vtt_dir(dir) {
                                Ok(produced) => {
                                    if let Some(last) = produced.last() {
                                        last_output = Some(last.to_string_lossy().into_owned());
                                    }
                                }
                                Err(e) => eprintln!("vtt->txt conversion failed: {e}"),
                            }
                        }
                        let _ = app_handle.emit(
                            "download-complete",
                            serde_json::json!({
                                "job_id":      job_for_task,
                                "output_path": last_output.clone().unwrap_or_default(),
                            }),
                        );
                    } else if sidecar::was_canceled(&job_for_task) {
                        // User pressed Cancel — wait briefly for yt-dlp to
                        // release file handles, then delete partial / intermediate
                        // files that this job created.
                        tokio::time::sleep(std::time::Duration::from_millis(400)).await;
                        let removed = cleanup_partial(&out_dir_for_task, &baseline);
                        let _ = app_handle.emit(
                            "download-canceled",
                            serde_json::json!({
                                "job_id":        job_for_task,
                                "files_removed": removed,
                            }),
                        );
                        sidecar::drop_job(&job_for_task);
                        break;
                    } else {
                        // If yt-dlp tripped on a locked browser cookie DB AND we
                        // were actually using --cookies-from-browser, retry once
                        // without it (mirror of _run_with_cookie_fallback,
                        // clipforge.py:834-850).
                        let used_cookies = args_for_retry
                            .iter()
                            .any(|a| a == "--cookies-from-browser");
                        if used_cookies && looks_like_browser_lock(&stderr_buf) {
                            let retry_args = strip_cookies_flag(&args_for_retry);
                            let _ = app_handle.emit(
                                "download-progress",
                                serde_json::json!({
                                    "job_id":      job_for_task,
                                    "percent":     0.0,
                                    "speed":       "",
                                    "eta":         "",
                                    "phase":       "browser cookies locked — retrying without",
                                    "phase_key":   "phase.cookieRetry",
                                    "phase_step":  1,
                                    "phase_total": TOTAL_STEPS,
                                }),
                            );
                            sidecar::drop_job(&job_for_task);
                            // Re-spawn with the same job_id so the frontend stays subscribed
                            // to the same progress channel.
                            let respawn = app_for_retry
                                .shell()
                                .sidecar("yt-dlp")
                                .and_then(|c| Ok(c.args(retry_args)))
                                .and_then(|c| c.spawn());
                            if let Ok((new_rx, new_child)) = respawn {
                                sidecar::register(job_for_task.clone(), new_child);
                                rx = new_rx;
                                stderr_buf.clear();
                                phase = PHASE_DOWNLOADING;
                                continue;
                            }
                        }
                        let _ = app_handle.emit(
                            "download-error",
                            serde_json::json!({
                                "job_id":  job_for_task,
                                "message": if stderr_buf.trim().is_empty() {
                                    format!("yt-dlp exited with code {code}")
                                } else {
                                    let tail: String = stderr_buf
                                        .lines()
                                        .filter(|l| !l.trim().is_empty())
                                        .rev()
                                        .take(3)
                                        .collect::<Vec<_>>()
                                        .into_iter()
                                        .rev()
                                        .collect::<Vec<_>>()
                                        .join("\n");
                                    format!("yt-dlp exited with code {code}: {tail}")
                                },
                            }),
                        );
                    }
                    sidecar::drop_job(&job_for_task);
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(DownloadStarted { job_id })
}
