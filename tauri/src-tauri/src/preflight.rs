// Startup dependency gate.
//
// Whisper subtitle generation runs against a system-wide `openai-whisper`
// install (a deliberate choice: it keeps model management outside the app, at
// the cost of ClipForge no longer being fully self-contained). That means the
// app has to verify, at every launch, that the toolchain it depends on is
// actually there before the main window is usable.
//
// Everything here shells out to real executables and reports what it found —
// no caching, because the user can uninstall Python between two launches.

use serde::Serialize;
use std::process::Command;

use crate::error::AppError;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
// Without this flag every probe flashes a console window in front of the GUI.
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x0800_0000;

fn hidden(program: &str) -> Command {
    let mut c = Command::new(program);
    #[cfg(windows)]
    c.creation_flags(CREATE_NO_WINDOW);
    c
}

#[derive(Debug, Clone, Serialize)]
pub struct DepStatus {
    pub id: String,
    /// Executable path, or empty when not found.
    pub path: String,
    /// First line of `--version`, trimmed. Empty when not found.
    pub version: String,
    pub found: bool,
    /// A missing required dep blocks the main window.
    pub required: bool,
    /// True when `preflight_install` knows a recipe for it.
    pub installable: bool,
}

#[derive(Debug, Clone, Serialize)]
pub struct PreflightReport {
    pub deps: Vec<DepStatus>,
    /// True when every required dependency is present.
    pub ok: bool,
}

/// Resolve an executable the way the shell would (`where` / `which`), so we
/// report the same binary that will actually run later.
fn which(program: &str) -> Option<String> {
    let finder = if cfg!(windows) { "where" } else { "which" };
    let out = hidden(finder).arg(program).output().ok()?;
    if !out.status.success() {
        return None;
    }
    String::from_utf8_lossy(&out.stdout)
        .lines()
        .map(str::trim)
        .find(|l| !l.is_empty())
        .map(str::to_string)
}

/// `--version` output, merged across stdout/stderr because tools disagree about
/// which stream it belongs on (Python <3.4 famously used stderr).
fn version_of(program: &str, args: &[&str]) -> String {
    hidden(program)
        .args(args)
        .output()
        .ok()
        .map(|o| {
            let mut s = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if s.is_empty() {
                s = String::from_utf8_lossy(&o.stderr).trim().to_string();
            }
            s.lines().next().unwrap_or("").trim().to_string()
        })
        .unwrap_or_default()
}

fn probe(id: &str, program: &str, args: &[&str], required: bool, installable: bool) -> DepStatus {
    match which(program) {
        Some(path) => DepStatus {
            id: id.to_string(),
            version: version_of(program, args),
            path,
            found: true,
            required,
            installable,
        },
        None => DepStatus {
            id: id.to_string(),
            path: String::new(),
            version: String::new(),
            found: false,
            required,
            installable,
        },
    }
}

/// Startup gate. Only covers what ClipForge needs to do its core job —
/// downloading — which is entirely served by the two bundled sidecars.
///
/// Whisper is deliberately NOT checked here: transcription is an opt-in feature
/// and most users never touch it. Making them sit through a multi-hundred-MB
/// Python install before the first download would be a toll for a feature they
/// did not ask for. See `whisper_check`, which runs at the moment of use.
#[tauri::command]
pub async fn preflight_check(app: tauri::AppHandle) -> Result<PreflightReport, AppError> {
    use tauri_plugin_shell::ShellExt;

    // The sidecars ship inside the installer, so "missing" means a broken or
    // partially-blocked install (antivirus quarantine is the usual cause) —
    // worth catching before the user hits a cryptic failure mid-download.
    let ytdlp_version = match app.shell().sidecar("yt-dlp") {
        Ok(cmd) => cmd
            .args(["--version", "--no-update"])
            .output()
            .await
            .ok()
            .filter(|o| o.status.success())
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string()),
        Err(_) => None,
    };

    let ffmpeg = crate::commands::ffmpeg_path();

    let deps = vec![
        DepStatus {
            id: "ytdlp".into(),
            path: String::new(),
            version: ytdlp_version.clone().unwrap_or_default(),
            found: ytdlp_version.is_some(),
            required: true,
            installable: false,
        },
        DepStatus {
            id: "ffmpeg".into(),
            version: String::new(),
            path: ffmpeg.clone().unwrap_or_default(),
            found: ffmpeg.is_some(),
            required: true,
            installable: false,
        },
    ];
    let ok = deps.iter().all(|d| !d.required || d.found);
    Ok(PreflightReport { deps, ok })
}

/// On-demand gate for the transcription feature, run when the user actually
/// asks for Whisper subtitles rather than at launch.
///
/// Python and pip are reported but never installed: bootstrapping a language
/// runtime behind the user's back is a step too far, and pip is what we would
/// install it with anyway.
#[tauri::command]
pub async fn whisper_check() -> Result<PreflightReport, AppError> {
    let deps = vec![
        probe("python", "python", &["--version"], true, false),
        probe("pip", "pip", &["--version"], true, false),
        probe("whisper", "whisper", &["--help"], true, true),
    ];
    let ok = deps.iter().all(|d| !d.required || d.found);
    Ok(PreflightReport { deps, ok })
}

#[derive(Debug, Clone, Serialize)]
pub struct GpuStatus {
    /// An NVIDIA GPU was found by nvidia-smi.
    pub has_gpu: bool,
    pub gpu_name: String,
    /// torch is installed AND already sees CUDA — nothing to offer.
    pub cuda_ready: bool,
    /// True only when installing the CUDA build would actually change anything:
    /// a GPU is present but the installed torch cannot use it.
    pub upgradable: bool,
}

/// Reports whether GPU acceleration is worth offering.
///
/// The offer is deliberately conditional: proposing a ~2.5 GB download to
/// someone with no NVIDIA card, or to someone whose torch already sees CUDA,
/// is noise at best and a wasted download at worst.
#[tauri::command]
pub async fn gpu_status() -> Result<GpuStatus, AppError> {
    let gpu_name = hidden("nvidia-smi")
        .args(["--query-gpu=name", "--format=csv,noheader"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .map(|o| String::from_utf8_lossy(&o.stdout).lines().next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or_default();

    // Ask torch itself rather than inferring from the package name: a CPU wheel
    // and a CUDA wheel are both called "torch".
    let cuda_ready = hidden("python")
        .args(["-c", "import torch;print(torch.cuda.is_available())"])
        .output()
        .ok()
        .map(|o| String::from_utf8_lossy(&o.stdout).trim() == "True")
        .unwrap_or(false);

    let has_gpu = !gpu_name.is_empty();
    Ok(GpuStatus {
        upgradable: has_gpu && !cuda_ready,
        has_gpu,
        gpu_name,
        cuda_ready,
    })
}

/// Install or upgrade one dependency, streaming pip's output back so the
/// preflight screen can show progress instead of freezing on a long download.
/// Only ids we have an explicit recipe for are accepted — never an arbitrary
/// package name from the frontend.
#[tauri::command]
pub async fn preflight_install(app: tauri::AppHandle, id: String) -> Result<String, AppError> {
    use tauri::Emitter;

    let args: Vec<&str> = match id.as_str() {
        "whisper" => vec!["-m", "pip", "install", "--upgrade", "openai-whisper"],
        // A CPU wheel and a CUDA wheel are both called "torch", so switching
        // needs an explicit index plus --force-reinstall: pip would otherwise
        // see the requirement as already satisfied and do nothing.
        "cuda" => vec![
            "-m", "pip", "install", "--upgrade", "--force-reinstall",
            "torch",
            "--index-url", "https://download.pytorch.org/whl/cu124",
        ],
        other => {
            return Err(AppError::Other(format!(
                "no install recipe for `{other}`"
            )))
        }
    };

    let _ = app.emit("preflight-log", format!("python {}", args.join(" ")));

    // Blocking install on a worker thread: pip has no useful streaming API and
    // this can run for minutes on a cold torch download.
    let handle = app.clone();
    let output = tauri::async_runtime::spawn_blocking(move || {
        hidden("python").args(&args).output()
    })
    .await
    .map_err(|e| AppError::Other(e.to_string()))?
    .map_err(AppError::Io)?;

    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    for line in stdout.lines().chain(stderr.lines()) {
        if !line.trim().is_empty() {
            let _ = handle.emit("preflight-log", line.to_string());
        }
    }

    if output.status.success() {
        Ok(stdout)
    } else {
        Err(AppError::Other(if stderr.trim().is_empty() {
            format!("pip exited with {}", output.status)
        } else {
            stderr.lines().rev().take(4).collect::<Vec<_>>().join("\n")
        }))
    }
}
