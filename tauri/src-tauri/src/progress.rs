// Progress parser for yt-dlp output.
//
// Skeleton-only: yt-dlp is invoked with
//   --newline --progress-template "PROGRESS:%(progress._percent_str)s|%(progress._speed_str)s|%(progress._eta_str)s"
// so each progress tick lands on its own stdout line as e.g.
//   PROGRESS: 42.3%|3.21MiB/s|00:12
//
// Real percent/speed/eta normalization, and the multi-phase tracking
// (downloading -> merging -> embed-thumbnail -> postprocess) is a follow-up PR.

#[derive(Debug, Clone, serde::Serialize)]
pub struct Progress {
    pub percent: f32,
    pub speed: String,
    pub eta: String,
}

pub fn parse_line(line: &str) -> Option<Progress> {
    let payload = line.strip_prefix("PROGRESS:")?.trim();
    let mut parts = payload.splitn(3, '|');
    let percent_raw = parts.next()?.trim().trim_end_matches('%');
    let speed = parts.next().unwrap_or("").trim().to_string();
    let eta = parts.next().unwrap_or("").trim().to_string();
    let percent = percent_raw.parse::<f32>().ok()?;
    Some(Progress { percent, speed, eta })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_basic_line() {
        let p = parse_line("PROGRESS: 42.3%|3.21MiB/s|00:12").unwrap();
        assert!((p.percent - 42.3).abs() < 0.01);
        assert_eq!(p.speed, "3.21MiB/s");
        assert_eq!(p.eta, "00:12");
    }

    #[test]
    fn ignores_non_progress_line() {
        assert!(parse_line("[download] Downloading webpage").is_none());
    }
}
