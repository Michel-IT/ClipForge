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
    pub thumbnail: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DownloadStarted {
    pub job_id: String,
}

#[tauri::command]
pub async fn detect_platform(url: String) -> Result<PlatformInfo, AppError> {
    Ok(detect(&url))
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
    ];
    if let Some(b) = cookies_browser.as_ref().filter(|s| !s.is_empty()) {
        args.push("--cookies-from-browser".into());
        args.push(b.clone());
    }
    args.push(url);

    let output = app
        .shell()
        .sidecar("yt-dlp")
        .map_err(|e| AppError::Sidecar(e.to_string()))?
        .args(args)
        .output()
        .await
        .map_err(|e| AppError::Sidecar(e.to_string()))?;

    if !output.status.success() {
        return Err(AppError::Sidecar(
            String::from_utf8_lossy(&output.stderr).to_string(),
        ));
    }

    // TODO: parse output.stdout as JSON into VideoInfo
    Ok(VideoInfo {
        title: "(skeleton) parsing not implemented".into(),
        uploader: None,
        duration: None,
        thumbnail: None,
    })
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
        "--write-thumbnail".into(),
        "--embed-thumbnail".into(),
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

    spawn_download(&app, args).await
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
    let mut args: Vec<String> = vec![
        "-f".into(), "bestaudio/best".into(),
        "--extract-audio".into(),
        "--audio-format".into(), "mp3".into(),
        "--audio-quality".into(), bitrate,
        "--add-metadata".into(),
        "--write-thumbnail".into(),
        "--embed-thumbnail".into(),
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

    spawn_download(&app, args).await
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

    spawn_download(&app, args).await
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

async fn spawn_download(app: &AppHandle, args: Vec<String>) -> Result<DownloadStarted, AppError> {
    use tauri_plugin_shell::process::CommandEvent;

    let job_id = Uuid::new_v4().to_string();
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
    tauri::async_runtime::spawn(async move {
        let mut last_output: Option<String> = None;
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(bytes) => {
                    let line = String::from_utf8_lossy(&bytes).to_string();
                    if let Some(p) = crate::progress::parse_line(&line) {
                        let _ = app_handle.emit(
                            "download-progress",
                            serde_json::json!({
                                "job_id": job_for_task,
                                "percent": p.percent,
                                "speed":   p.speed,
                                "eta":     p.eta,
                            }),
                        );
                    }
                    if let Some(path) = line.strip_prefix("[download] Destination: ") {
                        last_output = Some(path.trim().to_string());
                    }
                }
                CommandEvent::Stderr(_) => { /* TODO: surface warnings */ }
                CommandEvent::Terminated(payload) => {
                    let code = payload.code.unwrap_or(-1);
                    if code == 0 {
                        let _ = app_handle.emit(
                            "download-complete",
                            serde_json::json!({
                                "job_id":      job_for_task,
                                "output_path": last_output.clone().unwrap_or_default(),
                            }),
                        );
                    } else {
                        let _ = app_handle.emit(
                            "download-error",
                            serde_json::json!({
                                "job_id":  job_for_task,
                                "message": format!("yt-dlp exited with code {code}"),
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
