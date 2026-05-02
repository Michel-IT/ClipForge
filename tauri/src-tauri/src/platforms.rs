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
}

// Mirrors PLATFORMS in clipforge.py:44-55. Keep in sync.
pub const PLATFORMS: &[Platform] = &[
    Platform { name: "YouTube",     hosts: &["youtube.com", "youtu.be"],   video: true,  audio: true,  subs: true,  color: "#ff0033" },
    Platform { name: "TikTok",      hosts: &["tiktok.com"],                video: true,  audio: true,  subs: false, color: "#ff0050" },
    Platform { name: "Instagram",   hosts: &["instagram.com"],             video: true,  audio: true,  subs: false, color: "#c13584" },
    Platform { name: "Facebook",    hosts: &["facebook.com", "fb.watch"],  video: true,  audio: true,  subs: false, color: "#1877f2" },
    Platform { name: "X/Twitter",   hosts: &["twitter.com", "x.com"],      video: true,  audio: true,  subs: false, color: "#1d9bf0" },
    Platform { name: "Vimeo",       hosts: &["vimeo.com"],                 video: true,  audio: true,  subs: true,  color: "#1ab7ea" },
    Platform { name: "Twitch",      hosts: &["twitch.tv"],                 video: true,  audio: true,  subs: false, color: "#9146ff" },
    Platform { name: "Reddit",      hosts: &["reddit.com", "redd.it"],     video: true,  audio: true,  subs: false, color: "#ff4500" },
    Platform { name: "Dailymotion", hosts: &["dailymotion.com", "dai.ly"], video: true,  audio: true,  subs: true,  color: "#00a4ff" },
    Platform { name: "SoundCloud",  hosts: &["soundcloud.com"],            video: false, audio: true,  subs: false, color: "#ff7700" },
];

const GENERIC: Platform = Platform {
    name: "Generic",
    hosts: &[],
    video: true,
    audio: true,
    subs: false,
    color: "#5a6378",
};

#[derive(Debug, Clone, Serialize)]
pub struct PlatformInfo {
    pub name: String,
    pub video: bool,
    pub audio: bool,
    pub subs: bool,
    pub color: String,
}

impl From<&Platform> for PlatformInfo {
    fn from(p: &Platform) -> Self {
        PlatformInfo {
            name: p.name.to_string(),
            video: p.video,
            audio: p.audio,
            subs: p.subs,
            color: p.color.to_string(),
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
