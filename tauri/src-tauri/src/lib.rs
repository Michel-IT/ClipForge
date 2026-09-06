mod commands;
mod error;
mod kurama;
mod platforms;
mod preflight;
mod progress;
mod sidecar;
mod subs;
mod whisper;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            commands::detect_platform,
            commands::get_disclaimer,
            commands::fetch_info,
            commands::fetch_playlist_info,
            commands::ffmpeg_status,
            commands::ytdlp_status,
            commands::open_dir,
            commands::download_update,
            commands::reveal_in_folder,
            commands::download_video,
            commands::download_audio,
            commands::download_subs,
            commands::cancel_download,
            preflight::preflight_check,
            preflight::preflight_install,
            preflight::whisper_check,
            preflight::gpu_status,
            whisper::transcribe,
            kurama::kurama_verify,
            kurama::kurama_models,
            kurama::kurama_enhance,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
