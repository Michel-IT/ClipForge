use serde::{Serialize, Serializer};

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("invalid URL: {0}")]
    InvalidUrl(String),

    #[error("sidecar failed: {0}")]
    Sidecar(String),

    #[error("io: {0}")]
    Io(#[from] std::io::Error),

    #[error("json: {0}")]
    Json(#[from] serde_json::Error),

    #[error("{0}")]
    Other(String),
}

impl AppError {
    /// Canonical i18n key the frontend uses to translate this error.
    /// Mirror of the JSON keys under `error.*` in `src/locales/*/translation.json`.
    pub fn key(&self) -> &'static str {
        match self {
            AppError::InvalidUrl(_) => "error.invalidUrl",
            AppError::Sidecar(_)    => "error.sidecar",
            AppError::Io(_)         => "error.io",
            AppError::Json(_)       => "error.json",
            AppError::Other(_)      => "error.other",
        }
    }
}

impl Serialize for AppError {
    fn serialize<S: Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        s.serialize_str(&self.to_string())
    }
}
