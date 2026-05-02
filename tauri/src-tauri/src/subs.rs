// Port of vtt_to_text from clipforge.py:268-288.
//
// Strips VTT timing/markup and de-duplicates consecutive identical lines —
// auto-generated YouTube subtitles repeat the same words across overlapping
// time windows, which would produce massive walls of duplicates without this.

use std::fs;
use std::path::{Path, PathBuf};

fn vtt_to_text(vtt: &str) -> String {
    let tag_re = regex::Regex::new(r"<[^>]+>").unwrap();
    let cue_id_re = regex::Regex::new(r"^\d+$").unwrap();
    let mut out: Vec<String> = Vec::new();
    let mut last: Option<String> = None;
    for raw in vtt.lines() {
        let line = raw.trim();
        if line.is_empty()
            || line.starts_with("WEBVTT")
            || line.starts_with("Kind:")
            || line.starts_with("Language:")
            || line.contains("-->")
            || cue_id_re.is_match(line)
        {
            continue;
        }
        let cleaned = tag_re.replace_all(line, "").trim().to_string();
        if cleaned.is_empty() || Some(&cleaned) == last.as_ref() {
            continue;
        }
        out.push(cleaned.clone());
        last = Some(cleaned);
    }
    out.join(" ")
}

// Walks `dir` for *.vtt files, converts each to a sibling .txt, and deletes
// the .vtt. Returns paths of the .txt files produced.
pub fn convert_vtt_dir(dir: &Path) -> std::io::Result<Vec<PathBuf>> {
    let mut produced = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) != Some("vtt") {
            continue;
        }
        let vtt = fs::read_to_string(&path)?;
        let txt = vtt_to_text(&vtt);
        let txt_path = path.with_extension("txt");
        fs::write(&txt_path, txt)?;
        let _ = fs::remove_file(&path);
        produced.push(txt_path);
    }
    Ok(produced)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_header_and_timings() {
        let vtt = "WEBVTT\nKind: captions\nLanguage: en\n\n1\n00:00:01.000 --> 00:00:03.000\nHello world\n\n2\n00:00:03.000 --> 00:00:05.000\n<c.color>Bye</c>";
        assert_eq!(vtt_to_text(vtt), "Hello world Bye");
    }

    #[test]
    fn dedupes_repeated_lines() {
        let vtt = "WEBVTT\n\n00:00:01.000 --> 00:00:02.000\nfoo\n\n00:00:02.000 --> 00:00:03.000\nfoo\n\n00:00:03.000 --> 00:00:04.000\nbar";
        assert_eq!(vtt_to_text(vtt), "foo bar");
    }
}
