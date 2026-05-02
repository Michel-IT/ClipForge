use once_cell::sync::Lazy;
use std::collections::HashMap;
use std::sync::Mutex;
use tauri_plugin_shell::process::CommandChild;

pub static JOBS: Lazy<Mutex<HashMap<String, CommandChild>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

pub fn register(job_id: String, child: CommandChild) {
    JOBS.lock().unwrap().insert(job_id, child);
}

pub fn cancel(job_id: &str) -> bool {
    if let Some(child) = JOBS.lock().unwrap().remove(job_id) {
        let _ = child.kill();
        true
    } else {
        false
    }
}

pub fn drop_job(job_id: &str) {
    JOBS.lock().unwrap().remove(job_id);
}
