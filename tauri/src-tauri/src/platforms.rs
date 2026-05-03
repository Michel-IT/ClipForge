use serde::Serialize;
use url::Url;

#[derive(Debug, Clone, Copy)]
pub struct Platform {
    pub name: &'static str,
    pub hosts: &'static [&'static str],
    pub video: bool,
    pub audio: bool,
    pub subs: bool,
    pub color: &'static str,
    pub notes: &'static str,  // human-readable hint shown under capability pills
}

// Mirrors PLATFORMS in clipforge.py:44-55. Keep in sync (incl. notes).
pub const PLATFORMS: &[Platform] = &[
    Platform { name: "YouTube",     hosts: &["youtube.com", "youtu.be"],   video: true,  audio: true,  subs: true,  color: "#ff0033",
               notes: "Video, audio, automatic and manual subtitles." },
    Platform { name: "TikTok",      hosts: &["tiktok.com"],                video: true,  audio: true,  subs: false, color: "#ff0050",
               notes: "Video (no watermark by default) and audio." },
    Platform { name: "Instagram",   hosts: &["instagram.com"],             video: true,  audio: true,  subs: false, color: "#c13584",
               notes: "Public Reels and posts. For stories / private content: use cookies." },
    Platform { name: "Facebook",    hosts: &["facebook.com", "fb.watch"],  video: true,  audio: true,  subs: false, color: "#1877f2",
               notes: "Public videos. For private / age-gated content: use cookies." },
    Platform { name: "X/Twitter",   hosts: &["twitter.com", "x.com"],      video: true,  audio: true,  subs: false, color: "#1d9bf0",
               notes: "Public videos. For protected accounts: use cookies." },
    Platform { name: "Vimeo",       hosts: &["vimeo.com"],                 video: true,  audio: true,  subs: true,  color: "#1ab7ea",
               notes: "Video, audio and subtitles (when available)." },
    Platform { name: "Twitch",      hosts: &["twitch.tv"],                 video: true,  audio: true,  subs: false, color: "#9146ff",
               notes: "VOD and clips. Live streams not supported." },
    Platform { name: "Reddit",      hosts: &["reddit.com", "redd.it"],     video: true,  audio: true,  subs: false, color: "#ff4500",
               notes: "Public post videos." },
    Platform { name: "Dailymotion", hosts: &["dailymotion.com", "dai.ly"], video: true,  audio: true,  subs: true,  color: "#00a4ff",
               notes: "Video, audio and subtitles (when present)." },
    Platform { name: "SoundCloud",  hosts: &["soundcloud.com"],            video: false, audio: true,  subs: false, color: "#ff7700",
               notes: "Audio only (MP3)." },
];

const GENERIC: Platform = Platform {
    name: "Generic",
    hosts: &[],
    video: true,
    audio: true,
    subs: false,
    color: "#5a6378",
    notes: "Unknown platform — trying yt-dlp generic dispatcher (~1800 sites supported).",
};

#[derive(Debug, Clone, Serialize)]
pub struct PlatformInfo {
    pub name: String,
    pub video: bool,
    pub audio: bool,
    pub subs: bool,
    pub color: String,
    pub notes: String,
}

impl From<&Platform> for PlatformInfo {
    fn from(p: &Platform) -> Self {
        PlatformInfo {
            name: p.name.to_string(),
            video: p.video,
            audio: p.audio,
            subs: p.subs,
            color: p.color.to_string(),
            notes: p.notes.to_string(),
        }
    }
}

pub fn detect(url: &str) -> PlatformInfo {
    let host = match Url::parse(url).ok().and_then(|u| u.host_str().map(|h| h.to_lowercase())) {
        Some(h) => h,
        None => return PlatformInfo::from(&GENERIC),
    };
    for p in PLATFORMS {
        for h in p.hosts {
            if host.contains(h) {
                return PlatformInfo::from(p);
            }
        }
    }
    PlatformInfo::from(&GENERIC)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_reddit() {
        let info = detect("https://www.reddit.com/r/videos/comments/abc/foo/");
        assert_eq!(info.name, "Reddit");
        assert!(info.video && info.audio && !info.subs);
    }

    #[test]
    fn detects_youtube_short() {
        let info = detect("https://youtu.be/dQw4w9WgXcQ");
        assert_eq!(info.name, "YouTube");
        assert!(info.subs);
    }

    #[test]
    fn unknown_falls_back_to_generic() {
        let info = detect("https://example.invalid/video/123");
        assert_eq!(info.name, "Generic");
    }
}
