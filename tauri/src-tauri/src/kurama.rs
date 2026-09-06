// KuramaLab API Hub — post-processing of Whisper output.
//
// Whisper transcribes phonetically and gets proper nouns wrong ("boggini diblo"
// for "Lamborghini Diablo"). The hub is an OpenAI-compatible LLM gateway, so
// the *task* lives entirely in the prompt: there is no /fix or /translate route.
//
// Three hard constraints from the API, all of which shape this code:
//   - concurrency 1 for accounts without a plan → every chunk is sent strictly
//     one at a time, never joined in parallel;
//   - ~8192 tokens per request → a full SRT cannot go in one call, so it is cut
//     into cue blocks and reassembled;
//   - subtitles are the user's content leaving the machine → this only ever
//     runs from an explicit action, never on its own.

use serde::{Deserialize, Serialize};
use std::time::Duration;
use tauri::{AppHandle, Emitter};

use crate::error::AppError;

const BASE: &str = "https://api.kuramalab.net/api/v1";
/// Cues per request. ~100 cues of speech sits well inside the 8192-token
/// ceiling while keeping enough context for the model to fix names sensibly.
const CUES_PER_CHUNK: usize = 100;
/// Trailing cues from the previous chunk replayed as context so wording stays
/// consistent across a boundary. Not re-emitted into the output.
const CONTEXT_CUES: usize = 3;

fn client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        // Upstream times out at 60s; the spec recommends 120s client-side.
        .timeout(Duration::from_secs(120))
        .build()
        .map_err(|e| AppError::Other(e.to_string()))
}

fn version() -> String {
    format!("ClipForge/{}", env!("CARGO_PKG_VERSION"))
}

#[derive(Debug, Clone, Serialize)]
pub struct KuramaAccount {
    pub ok: bool,
    /// Remaining balance in EUR, as reported by /me. -1 when absent.
    pub balance: f64,
    pub raw: String,
}

/// Verifies a key against GET /me. The spec states this route is free, so it is
/// safe to call whenever the user pastes a key.
#[tauri::command]
pub async fn kurama_verify(api_key: String) -> Result<KuramaAccount, AppError> {
    let resp = client()?
        .get(format!("{BASE}/me"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("X-Client-Name", version())
        .send()
        .await
        .map_err(|e| AppError::Other(e.to_string()))?;

    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(AppError::Other(explain(status.as_u16(), &body)));
    }

    // The exact balance field is not pinned by the spec, so probe the likely
    // names rather than hard-failing when the shape shifts.
    let balance = serde_json::from_str::<serde_json::Value>(&body)
        .ok()
        .and_then(|v| {
            // Verified shape: {"balance":{"credits":2,"currency":"EUR"}}.
            v.get("balance")
                .and_then(|b| b.get("credits"))
                .and_then(|c| c.as_f64())
                // Tolerate a flatter shape if the API ever simplifies it.
                .or_else(|| v.get("balance").and_then(|b| b.as_f64()))
        })
        .unwrap_or(-1.0);

    Ok(KuramaAccount { ok: true, balance, raw: body })
}

/// Catalogue passthrough. Read at runtime because prices and availability
/// change — never hardcode the model list in the UI.
#[tauri::command]
pub async fn kurama_models(api_key: Option<String>) -> Result<String, AppError> {
    let url = if api_key.is_some() {
        format!("{BASE}/models")
    } else {
        "https://api.kuramalab.net/api/public/models".to_string()
    };
    let mut req = client()?.get(url).header("X-Client-Name", version());
    if let Some(k) = api_key {
        req = req.header("Authorization", format!("Bearer {k}"));
    }
    let resp = req.send().await.map_err(|e| AppError::Other(e.to_string()))?;
    let status = resp.status();
    let body = resp.text().await.unwrap_or_default();
    if !status.is_success() {
        return Err(AppError::Other(explain(status.as_u16(), &body)));
    }
    Ok(body)
}

/// Turns the documented error envelope into something worth showing a user.
fn explain(status: u16, body: &str) -> String {
    let code = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("error").and_then(|e| e.get("code")).and_then(|c| c.as_str()).map(str::to_string))
        .unwrap_or_default();
    let msg = serde_json::from_str::<serde_json::Value>(body)
        .ok()
        .and_then(|v| v.get("error").and_then(|e| e.get("message")).and_then(|m| m.as_str()).map(str::to_string))
        .unwrap_or_else(|| body.chars().take(200).collect());
    match (status, code.as_str()) {
        (401, _) => "error.kurama.auth".to_string(),
        (402, _) => "error.kurama.credits".to_string(),
        (404, "model_not_found") => "error.kurama.model".to_string(),
        (429, _) => "error.kurama.rate".to_string(),
        (503, _) => "error.kurama.maintenance".to_string(),
        _ => msg,
    }
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    choices: Vec<Choice>,
}
#[derive(Debug, Deserialize)]
struct Choice {
    message: ChatMessage,
    finish_reason: Option<String>,
}
#[derive(Debug, Deserialize)]
struct ChatMessage {
    // Nullable on purpose: reasoning models spend the whole token budget on
    // internal reasoning and return `"content": null`. Typed as String this
    // fails deserialization and the feature dies with a JSON parse error.
    content: Option<String>,
}

/// One chat completion. Returns the assistant text plus what it cost, taken
/// from the `x-credits-charged` header so the UI can show a running total.
async fn complete(
    api_key: &str,
    model: &str,
    system: &str,
    user: &str,
) -> Result<(String, f64), AppError> {
    let payload = serde_json::json!({
        "model": model,
        "messages": [
            { "role": "system", "content": system },
            { "role": "user",   "content": user },
        ],
        // Low but non-zero: we want corrections, not creative rewrites.
        "temperature": 0.2,
        "max_tokens": 4096,
        "stream": false,
    });

    let resp = client()?
        .post(format!("{BASE}/chat/completions"))
        .header("Authorization", format!("Bearer {api_key}"))
        .header("Content-Type", "application/json")
        .header("X-Client-Name", version())
        .body(serde_json::to_vec(&payload).map_err(AppError::Json)?)
        .send()
        .await
        .map_err(|e| AppError::Other(e.to_string()))?;

    let status = resp.status();
    let charged = resp
        .headers()
        .get("x-credits-charged")
        .and_then(|v| v.to_str().ok())
        .and_then(|s| s.parse::<f64>().ok())
        .unwrap_or(0.0);
    let body = resp.text().await.unwrap_or_default();

    if !status.is_success() {
        return Err(AppError::Other(explain(status.as_u16(), &body)));
    }
    let parsed: ChatResponse = serde_json::from_str(&body).map_err(AppError::Json)?;
    let choice = parsed
        .choices
        .into_iter()
        .next()
        .ok_or_else(|| AppError::Other("error.kurama.empty".into()))?;

    // Truncated output would silently drop cues, so it is a failure, not a
    // partial result. Reasoning models hit this even with a generous budget:
    // they exhaust it before emitting a single character.
    if choice.finish_reason.as_deref() == Some("length") {
        return Err(AppError::Other("error.kurama.truncated".into()));
    }
    let text = choice
        .message
        .content
        .filter(|c| !c.trim().is_empty())
        .ok_or_else(|| AppError::Other("error.kurama.empty".into()))?;
    Ok((text, charged))
}

/// A single SRT cue kept as raw text, because the timing lines must survive the
/// round trip byte-for-byte — the model is only allowed to touch the words.
#[derive(Debug, Clone)]
struct Cue {
    raw: String,
}

fn parse_srt(text: &str) -> Vec<Cue> {
    text.replace("\r\n", "\n")
        .split("\n\n")
        .map(str::trim)
        .filter(|b| !b.is_empty())
        .map(|b| Cue { raw: b.to_string() })
        .collect()
}

fn system_prompt(mode: &str, target_lang: &str) -> String {
    match mode {
        "fix" => "You repair subtitle files produced by automatic speech recognition. \
Fix misheard words, proper nouns, punctuation and casing. Keep the original language. \
Return the SRT blocks exactly as given: same cue numbers, same timestamps, same block order, \
same number of blocks. Change only the subtitle text. Output nothing but the SRT blocks."
            .to_string(),
        "translate" => format!(
            "You translate subtitle files. Translate the subtitle text into {target_lang}. \
Return the SRT blocks exactly as given: same cue numbers, same timestamps, same block order, \
same number of blocks. Translate only the text lines. Output nothing but the SRT blocks."
        ),
        "summary" => format!(
            "You summarise transcripts. Read the subtitle text and write a clear, well-structured \
summary in {target_lang}. Ignore cue numbers and timestamps. Output prose, not SRT."
        ),
        other => format!("Process the following subtitles. Task: {other}"),
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct EnhanceResult {
    pub output_path: String,
    pub chunks: usize,
    /// Total EUR charged across every chunk, summed from x-credits-charged.
    pub cost_eur: f64,
}

/// Reads an SRT, sends it through the hub in cue blocks, writes the result next
/// to the original. Chunks are strictly sequential: the API allows concurrency 1
/// on accounts without a plan, and firing them in parallel would 429.
#[tauri::command]
pub async fn kurama_enhance(
    app: AppHandle,
    api_key: String,
    srt_path: String,
    mode: String,
    target_lang: String,
    model: String,
) -> Result<EnhanceResult, AppError> {
    let source = std::fs::read_to_string(&srt_path)?;
    let system = system_prompt(&mode, &target_lang);

    let out_path = {
        let stem = srt_path.trim_end_matches(".srt");
        let ext = if mode == "summary" { "txt" } else { "srt" };
        format!("{stem}.{mode}.{ext}")
    };

    let emit = |done: usize, total: usize, cost: f64| {
        let _ = app.emit(
            "kurama-progress",
            serde_json::json!({ "done": done, "total": total, "cost_eur": cost }),
        );
    };

    // Summaries read the whole transcript as prose, so the cue structure is
    // irrelevant and only the words are sent.
    if mode == "summary" {
        let words: String = parse_srt(&source)
            .iter()
            .filter_map(|c| c.raw.lines().nth(2).map(str::to_string))
            .collect::<Vec<_>>()
            .join(" ");
        emit(0, 1, 0.0);
        let (text, cost) = complete(&api_key, &model, &system, &words).await?;
        std::fs::write(&out_path, text)?;
        emit(1, 1, cost);
        return Ok(EnhanceResult { output_path: out_path, chunks: 1, cost_eur: cost });
    }

    let cues = parse_srt(&source);
    if cues.is_empty() {
        return Err(AppError::Other("error.kurama.emptySrt".into()));
    }
    let total_chunks = cues.len().div_ceil(CUES_PER_CHUNK);
    let mut out_blocks: Vec<String> = Vec::with_capacity(cues.len());
    let mut cost_total = 0.0;

    emit(0, total_chunks, 0.0);

    for (i, chunk) in cues.chunks(CUES_PER_CHUNK).enumerate() {
        let context: String = if i == 0 {
            String::new()
        } else {
            let start = i * CUES_PER_CHUNK;
            let ctx = &cues[start.saturating_sub(CONTEXT_CUES)..start];
            format!(
                "Earlier cues, for context only — do NOT include them in your answer:\n{}\n\n",
                ctx.iter().map(|c| c.raw.as_str()).collect::<Vec<_>>().join("\n\n")
            )
        };
        let payload = format!(
            "{context}Process these {} SRT blocks and return exactly {} blocks:\n\n{}",
            chunk.len(),
            chunk.len(),
            chunk.iter().map(|c| c.raw.as_str()).collect::<Vec<_>>().join("\n\n")
        );

        let (text, cost) = complete(&api_key, &model, &system, &payload).await?;
        cost_total += cost;

        // Trust but verify: if the model dropped or invented blocks, keep the
        // originals for that chunk. A subtitle file that silently loses cues is
        // worse than one that was not improved.
        let returned = parse_srt(&text);
        if returned.len() == chunk.len() {
            out_blocks.extend(returned.into_iter().map(|c| c.raw));
        } else {
            let _ = app.emit(
                "kurama-log",
                format!(
                    "chunk {}/{}: expected {} blocks, got {} — keeping the original text",
                    i + 1,
                    total_chunks,
                    chunk.len(),
                    returned.len()
                ),
            );
            out_blocks.extend(chunk.iter().map(|c| c.raw.clone()));
        }
        emit(i + 1, total_chunks, cost_total);
    }

    std::fs::write(&out_path, out_blocks.join("\n\n") + "\n")?;
    Ok(EnhanceResult { output_path: out_path, chunks: total_chunks, cost_eur: cost_total })
}
