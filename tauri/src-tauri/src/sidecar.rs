use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub static JOBS: Lazy<Mutex<HashMap<String, CommandChild>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

// Track which jobs the user explicitly cancelled — separate from "process
// failed naturally". The spawn_download loop checks this on Terminated to
// decide whether to emit "download-error" vs "download-canceled" + cleanup.
pub static CANCELED: Lazy<Mutex<HashSet<String>>> =
    Lazy::new(|| Mutex::new(HashSet::new()));

pub fn register(job_id: String, child: CommandChild) {
    JOBS.lock().unwrap().insert(job_id, child);
}

pub fn cancel(job_id: &str) -> bool {
    CANCELED.lock().unwrap().insert(job_id.to_string());
    if let Some(child) = JOBS.lock().unwrap().remove(job_id) {
        let _ = child.kill();
        true
    } else {
        false
    }
}

pub fn was_canceled(job_id: &str) -> bool {
    CANCELED.lock().unwrap().remove(job_id)
}

pub fn drop_job(job_id: &str) {
    JOBS.lock().unwrap().remove(job_id);
}
