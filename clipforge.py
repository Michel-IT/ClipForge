import os
import re
import sys
import threading
import tkinter as tk
from tkinter import filedialog, messagebox
from urllib.parse import urlparse

import customtkinter as ctk
import yt_dlp

try:
    import imageio_ffmpeg
    FFMPEG_PATH = imageio_ffmpeg.get_ffmpeg_exe()
except Exception:
    FFMPEG_PATH = None


URL_RE = re.compile(r"^https?://", re.IGNORECASE)


def _apply_window_icon(window):
    """Cross-platform window icon setter.

    Windows: iconbitmap(.ico) — the native format, sets EXE + title bar.
    macOS / Linux: iconphoto(.png) — .ico is not native and on macOS
    leaves a generic placeholder document icon in the title bar's proxy
    slot. iconphoto with a PNG works on both X11 and Aqua.

    The PhotoImage is stashed on the window itself so Tk doesn't garbage-
    collect the underlying pixmap.
    """
    try:
        if sys.platform == "win32":
            window.iconbitmap(resource_path("assets/icon.ico"))
        else:
            img = tk.PhotoImage(file=resource_path("assets/clipforge_icon4.png"))
            window._cf_icon_ref = img
            window.iconphoto(True, img)
    except Exception:
        pass


PLATFORMS = [
    {"name": "YouTube",     "hosts": ("youtube.com", "youtu.be"),    "video": True, "audio": True, "subs": True,  "color": "#ff0033", "label": "YouTube",     "notes": "Video, audio, automatic and manual subtitles."},
    {"name": "TikTok",      "hosts": ("tiktok.com",),                "video": True, "audio": True, "subs": False, "color": "#ff0050", "label": "TikTok",      "notes": "Video (no watermark by default) and audio."},
    {"name": "Instagram",   "hosts": ("instagram.com",),             "video": True, "audio": True, "subs": False, "color": "#c13584", "label": "Instagram",   "notes": "Public Reels and posts. For stories / private content: use cookies."},
    {"name": "Facebook",    "hosts": ("facebook.com", "fb.watch"),   "video": True, "audio": True, "subs": False, "color": "#1877f2", "label": "Facebook",    "notes": "Public videos. For private / age-gated content: use cookies."},
    {"name": "X/Twitter",   "hosts": ("twitter.com", "x.com"),       "video": True, "audio": True, "subs": False, "color": "#1d9bf0", "label": "X/Twitter",   "notes": "Public videos. For protected accounts: use cookies."},
    {"name": "Vimeo",       "hosts": ("vimeo.com",),                 "video": True, "audio": True, "subs": True,  "color": "#1ab7ea", "label": "Vimeo",       "notes": "Video, audio and subtitles (when available)."},
    {"name": "Twitch",      "hosts": ("twitch.tv",),                 "video": True, "audio": True, "subs": False, "color": "#9146ff", "label": "Twitch",      "notes": "VOD and clips. Live streams not supported."},
    {"name": "Reddit",      "hosts": ("reddit.com", "redd.it"),      "video": True, "audio": True, "subs": False, "color": "#ff4500", "label": "Reddit",      "notes": "Public post videos."},
    {"name": "Dailymotion", "hosts": ("dailymotion.com", "dai.ly"),  "video": True, "audio": True, "subs": True,  "color": "#00a4ff", "label": "Dailymotion", "notes": "Video, audio and subtitles (when present)."},
    {"name": "SoundCloud",  "hosts": ("soundcloud.com",),            "video": False,"audio": True, "subs": False, "color": "#ff7700", "label": "SoundCloud",  "notes": "Audio only (MP3)."},
]

GENERIC_PLATFORM = {"name": "Generic", "hosts": (), "video": True, "audio": True, "subs": False, "color": "#5a6378", "label": "Generic", "notes": "Unknown platform — trying yt-dlp generic dispatcher (~1800 sites supported)."}
NO_PLATFORM      = {"name": "",        "hosts": (), "video": True, "audio": True, "subs": True,  "color": "#3a3f4b", "label": "—",       "notes": "Paste a link to begin."}

COOKIE_BROWSERS = ["None", "Chrome", "Firefox", "Edge", "Brave", "Opera", "Vivaldi"]
VIDEO_QUALITIES = ["Auto (best)", "1080p", "720p", "480p", "360p"]


# Plain-text disclaimer shown in the in-app dialog. The canonical, authoritative
# version lives in DISCLAIMER.md — keep them in sync when editing.
DISCLAIMER_TEXT = """ClipForge — LEGAL DISCLAIMER

By installing, running, or otherwise using ClipForge (the "Software") you agree
to be bound by this Disclaimer. If you do not agree, you must not use the
Software.

================================================================================
1. NO WARRANTY
================================================================================

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. THE AUTHOR
DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE
FROM HARMFUL COMPONENTS. THIS PARAGRAPH MIRRORS SECTIONS 15 AND 16 OF THE
GNU AFFERO GENERAL PUBLIC LICENSE VERSION 3 UNDER WHICH THIS SOFTWARE IS
DISTRIBUTED.

================================================================================
2. LIMITATION OF LIABILITY
================================================================================

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE
AUTHOR, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
LIMITED TO, LOSS OF DATA, LOSS OF PROFITS, BUSINESS INTERRUPTION, LEGAL FEES,
OR FINES) ARISING IN ANY WAY OUT OF THE USE OF, OR INABILITY TO USE, THE
SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

================================================================================
3. PERMITTED USE
================================================================================

You may use the Software only to download, store, transcode, or extract
subtitles from audiovisual content for which AT LEAST ONE of the following is
true:

  (a) You are the sole owner of the copyright in the content;
  (b) The content is in the public domain in your jurisdiction;
  (c) You have explicit, verifiable, written permission from the rights holder
      to perform the operation;
  (d) The content is distributed under a license (e.g. Creative Commons CC0,
      CC BY, CC BY-SA) that explicitly permits the operation you intend to
      perform.

Any use that does not satisfy at least one of (a)-(d) above is NOT authorized
by this Disclaimer and is your sole responsibility.

================================================================================
4. FORBIDDEN USE
================================================================================

You may NOT use the Software to:

  - Circumvent any technological protection measure (TPM), digital rights
    management (DRM) system, encryption, watermark, geoblock, or access control;
  - Download, reproduce, transmit, or redistribute commercial content
    (including but not limited to films, TV series, music tracks, audiobooks,
    paid courses, and live broadcasts) without holding the rights or an
    explicit license to do so;
  - Perform mass scraping, automated harvesting, or any operation that violates
    the rate limits or technical safeguards of any source platform;
  - Re-upload, mirror, sell, sublicense, or otherwise redistribute material
    downloaded with the Software unless you hold the rights to do so;
  - Engage in any activity that violates the Terms of Service of the source
    platform or any applicable law in your jurisdiction or in the jurisdiction
    of the rights holder.

================================================================================
5. SOURCE PLATFORM TERMS OF SERVICE
================================================================================

The Software is a generic downloader built on top of yt-dlp. It does not
negotiate, accept, or enforce the Terms of Service of any third-party platform
(YouTube, Meta / Facebook / Instagram, TikTok, X / Twitter, Vimeo, Twitch,
Reddit, Dailymotion, SoundCloud, or any other site supported by yt-dlp). You
are solely responsible for reading, understanding, and complying with the
Terms of Service of every platform from which you download content.

The author of the Software has no contractual relationship with any of these
platforms and makes no representation about whether a given operation is
permitted by their Terms of Service. When in doubt, do not use the Software
with that platform.

================================================================================
6. COPYRIGHT LAW COMPLIANCE
================================================================================

You are solely responsible for ensuring that your use of the Software complies
with all applicable copyright laws, including but not limited to:

  - United States: Copyright Act, 17 U.S.C. sections 101 et seq., and the
    Digital Millennium Copyright Act, 17 U.S.C. section 1201 (anti-circumvention).
  - European Union: Directive 2001/29/EC (InfoSoc), Directive 2019/790 (DSM
    Directive), and the implementing legislation of each Member State.
  - Italy: Legge 22 aprile 1941, n. 633 ("Legge sul diritto d'autore"), in
    particular articles 171, 171-bis, and 171-ter.
  - United Kingdom: Copyright, Designs and Patents Act 1988.
  - Any equivalent law in your jurisdiction.

The author of the Software is not your lawyer and this Disclaimer is not legal
advice. If your intended use is not unambiguously permitted by the categories
listed in section 3 above, consult a qualified attorney in your jurisdiction
before proceeding.

================================================================================
7. THIRD-PARTY COMPONENTS
================================================================================

The Software incorporates the following third-party components, each governed
by its own license:

  - yt-dlp ............... Unlicense (public domain dedication)
  - CustomTkinter ........ MIT
  - imageio-ffmpeg ....... BSD-2-Clause
  - PyInstaller .......... GPL-2.0 with bootloader exception (build-time only)
  - ffmpeg binary ........ LGPL / GPL (depending on build configuration)

The bundled ffmpeg binary may include components covered by the GNU (Lesser)
General Public License. The ClipForge distribution is therefore distributed
under AGPL-3.0, which is compatible with these licenses.

================================================================================
8. NO TECHNICAL SUPPORT, NO SLA
================================================================================

The Software is distributed at no cost and without any obligation of technical
support, maintenance, security updates, bug fixes, or service-level
commitments. The author may, at his sole discretion, accept or reject
contributions, issues, or feature requests submitted via the public repository.

================================================================================
9. CHANGES TO THIS DISCLAIMER
================================================================================

The author may update this Disclaimer at any time by publishing a new version
in the official repository. The version of the Disclaimer applicable to your
use is the version shipped inside the version of the Software that you are
running.

================================================================================
10. GOVERNING LAW
================================================================================

This Disclaimer and any dispute arising out of or in connection with the
Software shall be governed by, and construed in accordance with, the laws of
the Italian Republic, without regard to its conflict-of-laws rules. The
exclusive forum for any such dispute is the competent court in the place of
residence of the author of the Software, save for mandatory consumer-protection
rules that may apply in the user's place of residence.

================================================================================
11. SEVERABILITY
================================================================================

If any provision of this Disclaimer is held to be unenforceable or invalid,
that provision shall be limited or eliminated to the minimum extent necessary
so that this Disclaimer shall otherwise remain in full force and effect.

================================================================================
12. ACCEPTANCE
================================================================================

By clicking "I Accept" below, you acknowledge that you have read this
Disclaimer in full, that you understand it, and that you agree to be bound by
it. If you click "I Reject (Exit)" or close this dialog, the Software will
terminate and no use is authorized.
"""


class CancelledError(Exception):
    pass


def detect_platform(url):
    url = (url or "").strip()
    if not url:
        return NO_PLATFORM
    try:
        host = (urlparse(url).hostname or "").lower()
    except Exception:
        host = ""
    if not host:
        return GENERIC_PLATFORM
    for p in PLATFORMS:
        for h in p["hosts"]:
            if host == h or host.endswith("." + h):
                return p
    return GENERIC_PLATFORM


def default_output_dir():
    base = os.path.join(os.path.expanduser("~"), "Downloads", "ClipForge")
    os.makedirs(base, exist_ok=True)
    return base


def resource_path(rel):
    base = getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base, rel)


def vtt_to_text(vtt_path):
    with open(vtt_path, "r", encoding="utf-8") as f:
        lines = f.readlines()
    out_lines = []
    last = None
    for line in lines:
        line = line.strip()
        if not line:
            continue
        if line.startswith(("WEBVTT", "Kind:", "Language:")):
            continue
        if "-->" in line:
            continue
        if re.fullmatch(r"\d+", line):
            continue
        line = re.sub(r"<[^>]+>", "", line).strip()
        if not line or line == last:
            continue
        out_lines.append(line)
        last = line
    return " ".join(out_lines)


def fmt_duration(seconds):
    seconds = int(seconds or 0)
    m, s = divmod(seconds, 60)
    h, m = divmod(m, 60)
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


class _YdlLogger:
    def __init__(self, log):
        self._log = log

    def debug(self, msg):
        if msg.startswith("[debug]"):
            return
        self._log(msg)

    def info(self, msg):
        self._log(msg)

    def warning(self, msg):
        self._log(f"WARN: {msg}")

    def error(self, msg):
        self._log(f"ERR: {msg}")


class DisclaimerDialog(ctk.CTkToplevel):
    """Modal legal disclaimer.
    mode='accept': must accept before main app opens. Reject -> sys.exit.
    mode='info':   read-only re-view from Settings. Single Close button.
    """
    def __init__(self, master, mode="accept"):
        super().__init__(master)
        self._mode = mode
        self.accepted = False

        self.title("ClipForge — Legal Disclaimer")
        self.geometry("740x640")
        self.resizable(False, False)
        _apply_window_icon(self)

        self.transient(master)
        self.grab_set()
        self.protocol("WM_DELETE_WINDOW", self._on_close_window)

        header = ctk.CTkLabel(
            self,
            text="ClipForge — Legal Disclaimer",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.pack(padx=20, pady=(18, 4), anchor="w")

        sub = "Please read the entire text. The Accept button unlocks once you scroll to the bottom." if mode == "accept" \
              else "Reference copy. Click Close to return to the application."
        ctk.CTkLabel(
            self, text=sub, text_color="#9aa5ce", font=ctk.CTkFont(size=11),
        ).pack(padx=20, pady=(0, 8), anchor="w")

        self.textbox = ctk.CTkTextbox(
            self, font=ctk.CTkFont(family="Consolas", size=11), wrap="word"
        )
        self.textbox.pack(fill="both", expand=True, padx=20, pady=(0, 12))
        self.textbox.insert("1.0", DISCLAIMER_TEXT)
        self.textbox.configure(state="disabled")

        btn_row = ctk.CTkFrame(self, fg_color="transparent")
        btn_row.pack(fill="x", padx=20, pady=(0, 18))

        if mode == "accept":
            self.reject_btn = ctk.CTkButton(
                btn_row, text="I Reject (Exit)", width=160,
                fg_color="#7a3a3a", hover_color="#a04a4a",
                command=self._reject,
            )
            self.reject_btn.pack(side="left")
            self.accept_btn = ctk.CTkButton(
                btn_row, text="I Accept", width=160,
                state="disabled", command=self._accept,
            )
            self.accept_btn.pack(side="right")
            self.scroll_hint = ctk.CTkLabel(
                btn_row,
                text="Scroll to the end to enable Accept",
                text_color="#e0af68", font=ctk.CTkFont(size=11),
            )
            self.scroll_hint.pack(side="right", padx=(0, 12))
            self.textbox.bind("<MouseWheel>", lambda _e: self.after(50, self._check_scroll))
            self.textbox.bind("<KeyRelease>", lambda _e: self.after(50, self._check_scroll))
            self.textbox.bind("<ButtonRelease-1>", lambda _e: self.after(50, self._check_scroll))
        else:
            ctk.CTkButton(
                btn_row, text="Close", width=160, command=self.destroy,
            ).pack(side="right")

        self._center()

        # macOS Tk workaround: when the parent root is withdraw()n (as in
        # _show_disclaimer), a transient Toplevel can stay un-realized — it
        # exists in Tk's tree but never gets an NSWindow, so wait_window()
        # blocks forever. A bare deiconify() is enough to force realization.
        # Do NOT call lift()/focus_force() here: in the PyInstaller-bundled
        # binary they raced with Tk's bootstrap timing and caused the dialog
        # to be torn down immediately after creation (orphan after-callbacks
        # complaining about "invalid command name … _click_animation" etc).
        if sys.platform == "darwin":
            self.deiconify()

    def _center(self):
        self.update_idletasks()
        w = self.winfo_width()
        h = self.winfo_height()
        sw = self.winfo_screenwidth()
        sh = self.winfo_screenheight()
        self.geometry(f"+{(sw - w) // 2}+{(sh - h) // 2}")

    def _check_scroll(self):
        try:
            _, end = self.textbox.yview()
        except Exception:
            return
        if end >= 0.99:
            self.accept_btn.configure(state="normal")
            self.scroll_hint.configure(text="")

    def _accept(self):
        self.accepted = True
        self.destroy()

    def _reject(self):
        self.accepted = False
        self.destroy()

    def _on_close_window(self):
        if self._mode == "accept":
            self.accepted = False
        self.destroy()

    def show(self):
        self.wait_window()
        return self.accepted


class App(ctk.CTk):
    OK = "#9ece6a"
    ERR = "#f7768e"
    INFO = "#7aa2f7"
    WARN = "#e0af68"

    def __init__(self):
        super().__init__()
        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.title("ClipForge")
        self.geometry("900x740")
        self.minsize(820, 640)
        _apply_window_icon(self)
        if sys.platform == "darwin":
            # Re-apply: the previous root (disclaimer) was destroyed and that
            # may have reset the dock icon back to the default. Schedule via
            # after() to run after Tk has finished re-bootstrapping NSApp.
            self.after(80, lambda: _set_macos_dock_icon(resource_path("assets/icon.icns")))

        self.url_var = tk.StringVar()
        self.out_dir_var = tk.StringVar(value=default_output_dir())
        self.subs_lang_var = tk.StringVar(value="it,en")
        self.bitrate_var = tk.StringVar(value="192")
        self.video_quality_var = tk.StringVar(value=VIDEO_QUALITIES[0])
        self.cookie_browser_var = tk.StringVar(value=COOKIE_BROWSERS[0])
        self.full_playlist_var = tk.BooleanVar(value=False)
        self.busy = False
        self.cancel_requested = False
        self.current_platform = NO_PLATFORM

        self._build_ui()
        self.url_var.trace_add("write", self._on_url_change)
        self._refresh_platform()
        self._try_autopaste()

    def _build_ui(self):
        # Header
        header = ctk.CTkFrame(self, fg_color="transparent")
        header.pack(fill="x", padx=18, pady=(16, 4))
        ctk.CTkLabel(
            header,
            text="ClipForge",
            font=ctk.CTkFont(size=22, weight="bold"),
        ).pack(side="left")
        self.status_label = ctk.CTkLabel(header, text="Ready", text_color=self.INFO)
        self.status_label.pack(side="right")

        # URL
        url_card = ctk.CTkFrame(self)
        url_card.pack(fill="x", padx=18, pady=8)
        self.platform_badge = ctk.CTkLabel(
            url_card,
            text=NO_PLATFORM["label"],
            width=120,
            height=28,
            corner_radius=14,
            fg_color=NO_PLATFORM["color"],
            text_color="white",
            font=ctk.CTkFont(size=12, weight="bold"),
        )
        self.platform_badge.pack(side="left", padx=(14, 8), pady=12)
        self.url_entry = ctk.CTkEntry(
            url_card,
            textvariable=self.url_var,
            placeholder_text="Paste a link (YouTube, TikTok, Instagram, Facebook, X, Vimeo, Twitch, ...)",
            height=36,
        )
        self.url_entry.pack(side="left", fill="x", expand=True, padx=6, pady=12)
        self.url_entry.bind("<Return>", lambda _e: self._fetch_info())
        ctk.CTkButton(url_card, text="Paste", width=80, command=self._paste).pack(
            side="left", padx=(4, 4), pady=12
        )
        ctk.CTkButton(
            url_card, text="Video info", width=110, command=self._fetch_info
        ).pack(side="left", padx=(4, 14), pady=12)

        self.info_label = ctk.CTkLabel(
            self, text="", text_color="#9aa5ce", anchor="w", justify="left"
        )
        self.info_label.pack(fill="x", padx=22)

        # Capabilities row
        caps_row = ctk.CTkFrame(self, fg_color="transparent")
        caps_row.pack(fill="x", padx=18, pady=(2, 0))
        self.cap_video = ctk.CTkLabel(caps_row, text="Video", width=70, height=24, corner_radius=10, fg_color="#3a3f4b", text_color="white", font=ctk.CTkFont(size=11, weight="bold"))
        self.cap_video.pack(side="left", padx=(4, 4))
        self.cap_audio = ctk.CTkLabel(caps_row, text="Audio", width=70, height=24, corner_radius=10, fg_color="#3a3f4b", text_color="white", font=ctk.CTkFont(size=11, weight="bold"))
        self.cap_audio.pack(side="left", padx=4)
        self.cap_subs = ctk.CTkLabel(caps_row, text="Subtitles", width=90, height=24, corner_radius=10, fg_color="#3a3f4b", text_color="white", font=ctk.CTkFont(size=11, weight="bold"))
        self.cap_subs.pack(side="left", padx=4)
        self.platform_info_label = ctk.CTkLabel(
            caps_row, text="", text_color="#9aa5ce", anchor="w", font=ctk.CTkFont(size=11)
        )
        self.platform_info_label.pack(side="left", padx=(12, 4), fill="x", expand=True)

        # Output dir
        out_card = ctk.CTkFrame(self)
        out_card.pack(fill="x", padx=18, pady=8)
        ctk.CTkLabel(out_card, text="Output", width=70, anchor="w").pack(
            side="left", padx=(14, 4), pady=12
        )
        ctk.CTkEntry(out_card, textvariable=self.out_dir_var, height=36).pack(
            side="left", fill="x", expand=True, padx=6, pady=12
        )
        ctk.CTkButton(
            out_card, text="Browse", width=80, command=self._choose_dir
        ).pack(side="left", padx=(4, 4), pady=12)
        ctk.CTkButton(
            out_card, text="Open", width=80, command=self._open_dir
        ).pack(side="left", padx=(4, 14), pady=12)

        # Tabs
        self.tabs = ctk.CTkTabview(self, height=160)
        self.tabs.pack(fill="x", padx=18, pady=8)
        self.tabs.add("Video MP4")
        self.tabs.add("Audio MP3")
        self.tabs.add("Subtitles -> Text")
        self.tabs.add("Settings")

        # Video tab
        video = self.tabs.tab("Video MP4")
        ctk.CTkLabel(video, text="Quality:").grid(
            row=0, column=0, padx=(8, 6), pady=14, sticky="w"
        )
        ctk.CTkOptionMenu(
            video,
            values=VIDEO_QUALITIES,
            variable=self.video_quality_var,
            width=160,
        ).grid(row=0, column=1, padx=6, pady=14)
        self.video_btn = ctk.CTkButton(
            video, text="Download MP4", width=180, command=self._start_video
        )
        self.video_btn.grid(row=0, column=2, padx=12, pady=14)

        # Audio tab
        audio = self.tabs.tab("Audio MP3")
        ctk.CTkLabel(audio, text="Bitrate:").grid(
            row=0, column=0, padx=(8, 6), pady=14, sticky="w"
        )
        ctk.CTkOptionMenu(
            audio,
            values=["128", "192", "256", "320"],
            variable=self.bitrate_var,
            width=100,
        ).grid(row=0, column=1, padx=6, pady=14)
        ctk.CTkLabel(audio, text="kbps").grid(row=0, column=2, padx=(0, 12), pady=14)
        self.audio_btn = ctk.CTkButton(
            audio, text="Extract MP3", width=180, command=self._start_audio
        )
        self.audio_btn.grid(row=0, column=3, padx=12, pady=14)

        # Subs tab
        subs = self.tabs.tab("Subtitles -> Text")
        ctk.CTkLabel(subs, text="Languages (e.g. it,en):").grid(
            row=0, column=0, padx=(8, 6), pady=14, sticky="w"
        )
        ctk.CTkEntry(subs, textvariable=self.subs_lang_var, width=140).grid(
            row=0, column=1, padx=6, pady=14
        )
        self.subs_btn = ctk.CTkButton(
            subs, text="Extract subtitles", width=180, command=self._start_subs
        )
        self.subs_btn.grid(row=0, column=2, padx=12, pady=14)

        # Settings tab
        settings = self.tabs.tab("Settings")
        ctk.CTkLabel(settings, text="Theme:").grid(
            row=0, column=0, padx=(8, 6), pady=10, sticky="w"
        )
        theme = ctk.CTkOptionMenu(
            settings,
            values=["Dark", "Light", "System"],
            command=lambda v: ctk.set_appearance_mode(v.lower()),
            width=120,
        )
        theme.set("Dark")
        theme.grid(row=0, column=1, padx=6, pady=10)
        ff_text = "ffmpeg: bundled" if FFMPEG_PATH else "ffmpeg: unavailable"
        ff_color = self.OK if FFMPEG_PATH else self.ERR
        ctk.CTkLabel(settings, text=ff_text, text_color=ff_color).grid(
            row=0, column=2, padx=20, pady=10, sticky="w"
        )
        ctk.CTkLabel(settings, text="Cookies from:").grid(
            row=1, column=0, padx=(8, 6), pady=10, sticky="w"
        )
        ctk.CTkOptionMenu(
            settings,
            values=COOKIE_BROWSERS,
            variable=self.cookie_browser_var,
            width=120,
        ).grid(row=1, column=1, padx=6, pady=10)
        ctk.CTkLabel(
            settings,
            text="(for private / age-gated content. Close the browser before extracting.)",
            text_color="#9aa5ce",
            font=ctk.CTkFont(size=11),
        ).grid(row=1, column=2, columnspan=2, padx=10, pady=10, sticky="w")
        ctk.CTkLabel(settings, text="Playlist:").grid(
            row=2, column=0, padx=(8, 6), pady=10, sticky="w"
        )
        ctk.CTkCheckBox(
            settings,
            text="Download whole playlist (when URL contains &list=)",
            variable=self.full_playlist_var,
        ).grid(row=2, column=1, columnspan=3, padx=6, pady=10, sticky="w")
        ctk.CTkLabel(settings, text="Legal:").grid(
            row=3, column=0, padx=(8, 6), pady=10, sticky="w"
        )
        ctk.CTkButton(
            settings, text="View legal disclaimer", width=200,
            command=self._open_disclaimer_info,
        ).grid(row=3, column=1, columnspan=2, padx=6, pady=10, sticky="w")

        # Progress
        prog_row = ctk.CTkFrame(self, fg_color="transparent")
        prog_row.pack(fill="x", padx=18, pady=(8, 0))
        self.cancel_btn = ctk.CTkButton(
            prog_row, text="Cancel", width=90, fg_color="#7a3a3a",
            hover_color="#a04a4a", state="disabled", command=self._cancel
        )
        self.cancel_btn.pack(side="right", padx=(8, 0))
        self.percent_label = ctk.CTkLabel(prog_row, text="0%", width=60)
        self.percent_label.pack(side="right")
        self.progress = ctk.CTkProgressBar(prog_row, height=14)
        self.progress.set(0)
        self.progress.pack(side="left", fill="x", expand=True, padx=(0, 10))

        # Log
        self.log_text = ctk.CTkTextbox(self, height=200, font=ctk.CTkFont(family="Consolas", size=12))
        self.log_text.pack(fill="both", expand=True, padx=18, pady=12)

    # ---------- helpers ----------
    def log(self, msg):
        def _do():
            self.log_text.insert("end", msg + "\n")
            self.log_text.see("end")
        self.after(0, _do)

    def set_status(self, msg, color=None):
        def _do():
            self.status_label.configure(text=msg)
            if color:
                self.status_label.configure(text_color=color)
        self.after(0, _do)

    def set_progress(self, frac):
        frac = max(0.0, min(1.0, frac))
        def _do():
            self.progress.set(frac)
            self.percent_label.configure(text=f"{int(frac * 100)}%")
        self.after(0, _do)

    def set_info(self, text):
        self.after(0, lambda: self.info_label.configure(text=text))

    def _set_busy(self, busy):
        self.busy = busy
        if busy:
            self.cancel_requested = False
            self.audio_btn.configure(state="disabled")
            self.video_btn.configure(state="disabled")
            self.subs_btn.configure(state="disabled")
            self.cancel_btn.configure(state="normal")
        else:
            self.cancel_btn.configure(state="disabled")
            self._refresh_platform()

    def _cancel(self):
        if not self.busy:
            return
        self.cancel_requested = True
        self.log("Cancellation requested...")
        self.set_status("Cancelling...", self.WARN)
        self.cancel_btn.configure(state="disabled")

    def _on_url_change(self, *_):
        self._refresh_platform()

    def _set_cap(self, label, enabled, name):
        on_color = "#3b8e5a"
        off_color = "#3a3f4b"
        symbol = "OK" if enabled else "X"
        label.configure(text=f"{symbol}  {name}", fg_color=on_color if enabled else off_color)

    def _refresh_platform(self):
        p = detect_platform(self.url_var.get())
        self.current_platform = p
        self.platform_badge.configure(text=p["label"], fg_color=p["color"])
        self._set_cap(self.cap_video, p["video"], "Video")
        self._set_cap(self.cap_audio, p["audio"], "Audio")
        self._set_cap(self.cap_subs, p["subs"], "Subtitles")
        self.platform_info_label.configure(text=p["notes"])
        if self.busy:
            return
        self.video_btn.configure(state="normal" if p["video"] else "disabled")
        self.audio_btn.configure(state="normal" if p["audio"] else "disabled")
        self.subs_btn.configure(state="normal" if p["subs"] else "disabled")

    def _open_disclaimer_info(self):
        DisclaimerDialog(self, mode="info").show()

    def _try_autopaste(self):
        try:
            txt = self.clipboard_get().strip()
            if not URL_RE.match(txt):
                return
            p = detect_platform(txt)
            if p is NO_PLATFORM or p is GENERIC_PLATFORM:
                return
            self.url_var.set(txt)
            self.log(f"URL pasted from clipboard ({p['name']}).")
            self.after(300, self._fetch_info)
        except Exception:
            pass

    def _paste(self):
        try:
            txt = self.clipboard_get().strip()
            if txt:
                self.url_var.set(txt)
        except Exception:
            messagebox.showwarning("Clipboard", "Clipboard is empty")

    def _choose_dir(self):
        d = filedialog.askdirectory(
            initialdir=self.out_dir_var.get() or default_output_dir()
        )
        if d:
            self.out_dir_var.set(d)

    def _open_dir(self):
        path = self.out_dir_var.get()
        if path and os.path.isdir(path):
            try:
                os.startfile(path)
            except Exception as e:
                messagebox.showerror("Error", str(e))

    def _validate(self):
        if self.busy:
            return None
        url = self.url_var.get().strip()
        if not url:
            messagebox.showerror("Error", "Please enter a URL")
            return None
        out = self.out_dir_var.get().strip() or default_output_dir()
        os.makedirs(out, exist_ok=True)
        return url, out

    def _build_ydl_opts(self, base):
        opts = dict(base)
        browser = self.cookie_browser_var.get()
        if browser and browser != "None":
            opts["cookiesfrombrowser"] = (browser.lower(),)
        if "noplaylist" not in opts:
            opts["noplaylist"] = not self.full_playlist_var.get()
        return opts

    def _handle_error(self, e):
        if isinstance(e, CancelledError) or self.cancel_requested:
            self.log("Download cancelled.")
            self.set_status("Cancelled", self.WARN)
            return True
        msg = str(e)
        low = msg.lower()
        if "cancelled" in low or "cancellederror" in low:
            self.log("Download cancelled.")
            self.set_status("Cancelled", self.WARN)
            return True
        if "could not copy" in low and "cookie database" in low:
            self.log(
                "Cookies are locked: the browser is open and holds the cookie file. "
                "Close the browser, or set 'None' under Settings -> Cookies from."
            )
            self.set_status("Cookies locked: close the browser", self.ERR)
            return True
        self.log(f"Error: {e}")
        self.set_status("Error", self.ERR)
        return False

    def _is_cookie_lock_error(self, e):
        m = str(e).lower()
        return "could not copy" in m and "cookie database" in m

    def _run_with_cookie_fallback(self, url, base_opts):
        opts = self._build_ydl_opts(base_opts)
        try:
            with yt_dlp.YoutubeDL(opts) as ydl:
                return ydl.extract_info(url, download=True)
        except Exception as e:
            if "cookiesfrombrowser" in opts and self._is_cookie_lock_error(e):
                self.log(
                    "Browser cookies not readable (browser is open). "
                    "Retrying without cookies..."
                )
                fallback = dict(base_opts)
                if "noplaylist" not in fallback:
                    fallback["noplaylist"] = not self.full_playlist_var.get()
                with yt_dlp.YoutubeDL(fallback) as ydl:
                    return ydl.extract_info(url, download=True)
            raise

    # ---------- info preview ----------
    def _fetch_info(self):
        url = self.url_var.get().strip()
        if not url:
            return
        self.set_status("Loading info...", self.INFO)
        self.set_info("...")

        def worker():
            try:
                opts = self._build_ydl_opts(
                    {"quiet": True, "skip_download": True, "no_warnings": True}
                )
                with yt_dlp.YoutubeDL(opts) as ydl:
                    info = ydl.extract_info(url, download=False)
                title = info.get("title", "?")
                uploader = info.get("uploader") or info.get("channel") or ""
                dur = fmt_duration(info.get("duration"))
                self.set_info(f"{title}   |   {uploader}   |   duration {dur}")
                self.set_status("Info loaded", self.OK)
            except Exception as e:
                self.set_info("")
                self.set_status(f"Info error: {e}", self.ERR)

        threading.Thread(target=worker, daemon=True).start()

    # ---------- progress hook ----------
    def _progress_hook(self, d):
        if self.cancel_requested:
            raise CancelledError()
        status = d.get("status")
        if status == "downloading":
            total = d.get("total_bytes") or d.get("total_bytes_estimate")
            done = d.get("downloaded_bytes") or 0
            if total:
                self.set_progress(done / total)
            speed = d.get("speed") or 0
            speed_mb = speed / (1024 * 1024) if speed else 0
            eta = d.get("eta") or 0
            self.set_status(
                f"Downloading... {speed_mb:.1f} MB/s, ETA {eta}s", self.INFO
            )
        elif status == "finished":
            self.set_progress(1.0)
            self.set_status("Post-processing...", self.WARN)

    # ---------- subs ----------
    def _start_subs(self):
        v = self._validate()
        if not v:
            return
        if not self.current_platform["subs"]:
            messagebox.showwarning(
                "Not supported",
                f"Subtitles are not available on {self.current_platform['name']}.",
            )
            return
        url, out = v
        langs = [
            s.strip()
            for s in self.subs_lang_var.get().split(",")
            if s.strip()
        ] or ["it", "en"]
        self._set_busy(True)
        threading.Thread(
            target=self._run_subs, args=(url, out, langs), daemon=True
        ).start()

    def _run_subs(self, url, out, langs):
        try:
            self.set_status("Extracting subtitles...", self.INFO)
            self.set_progress(0)
            self.log(f"Subtitles {langs} -> {out}")
            template = os.path.join(out, "%(title)s [%(id)s].%(ext)s")
            base_opts = {
                "skip_download": True,
                "writesubtitles": True,
                "writeautomaticsub": True,
                "subtitleslangs": langs,
                "subtitlesformat": "vtt",
                "outtmpl": template,
                "quiet": True,
                "no_warnings": True,
                "logger": _YdlLogger(self.log),
                "progress_hooks": [self._progress_hook],
            }
            info = self._run_with_cookie_fallback(url, base_opts)
            title = info.get("title", "")
            vid = info.get("id", "")
            prefix = f"{title} [{vid}]" if title and vid else None

            converted = 0
            for fname in os.listdir(out):
                if not fname.endswith(".vtt"):
                    continue
                if prefix and not fname.startswith(prefix):
                    continue
                vtt_path = os.path.join(out, fname)
                self.log(f"Processing: {fname}")
                text = vtt_to_text(vtt_path)
                txt_path = vtt_path[:-4] + ".txt"
                with open(txt_path, "w", encoding="utf-8") as f:
                    f.write(text)
                self.log(f"Saved: {os.path.basename(txt_path)}")
                converted += 1

            if converted == 0:
                self.log("No subtitles found for the requested languages.")
                self.set_status("No subtitles", self.ERR)
            else:
                self.set_status(f"Done: {converted} file(s)", self.OK)
            self.set_progress(1.0)
        except Exception as e:
            self._handle_error(e)
        finally:
            self._set_busy(False)

    # ---------- audio mp3 ----------
    def _start_audio(self):
        v = self._validate()
        if not v:
            return
        if not FFMPEG_PATH:
            messagebox.showerror(
                "ffmpeg missing",
                "ffmpeg is not available. Please reinstall the app.",
            )
            return
        url, out = v
        bitrate = self.bitrate_var.get()
        self._set_busy(True)
        threading.Thread(
            target=self._run_audio, args=(url, out, bitrate), daemon=True
        ).start()

    def _run_audio(self, url, out, bitrate):
        try:
            self.set_status("Extracting MP3...", self.INFO)
            self.set_progress(0)
            self.log(f"MP3 {bitrate} kbps -> {out}")
            template = os.path.join(out, "%(title)s [%(id)s].%(ext)s")
            base_opts = {
                "format": "bestaudio/best",
                "outtmpl": template,
                "quiet": True,
                "no_warnings": True,
                "logger": _YdlLogger(self.log),
                "progress_hooks": [self._progress_hook],
                "ffmpeg_location": FFMPEG_PATH,
                "writethumbnail": True,
                "postprocessors": [
                    {
                        "key": "FFmpegExtractAudio",
                        "preferredcodec": "mp3",
                        "preferredquality": bitrate,
                    },
                    {"key": "FFmpegMetadata"},
                    {"key": "EmbedThumbnail", "already_have_thumbnail": False},
                ],
            }
            info = self._run_with_cookie_fallback(url, base_opts)
            title = info.get("title", "")
            self.log(f"MP3 saved: {title}")
            self.set_status("MP3 ready", self.OK)
            self.set_progress(1.0)
        except Exception as e:
            self._handle_error(e)
        finally:
            self._set_busy(False)

    # ---------- video mp4 ----------
    def _start_video(self):
        v = self._validate()
        if not v:
            return
        if not FFMPEG_PATH:
            messagebox.showerror(
                "ffmpeg missing",
                "ffmpeg is not available. Please reinstall the app.",
            )
            return
        url, out = v
        quality = self.video_quality_var.get()
        self._set_busy(True)
        threading.Thread(
            target=self._run_video, args=(url, out, quality), daemon=True
        ).start()

    def _run_video(self, url, out, quality):
        try:
            self.set_status("Downloading video...", self.INFO)
            self.set_progress(0)
            self.log(f"Video [{quality}] -> {out}")

            if quality.startswith("Auto"):
                fmt = "bv*+ba/b"
            else:
                h = quality.rstrip("p")
                fmt = f"bv*[height<={h}]+ba/b[height<={h}]/b"

            template = os.path.join(out, "%(title)s [%(id)s].%(ext)s")
            base_opts = {
                "format": fmt,
                "merge_output_format": "mp4",
                "outtmpl": template,
                "quiet": True,
                "no_warnings": True,
                "logger": _YdlLogger(self.log),
                "progress_hooks": [self._progress_hook],
                "ffmpeg_location": FFMPEG_PATH,
                "writethumbnail": True,
                "postprocessors": [
                    {"key": "FFmpegMetadata"},
                    {"key": "EmbedThumbnail", "already_have_thumbnail": False},
                ],
            }
            info = self._run_with_cookie_fallback(url, base_opts)
            title = info.get("title", "")
            self.log(f"Video saved: {title}")
            self.set_status("Video ready", self.OK)
            self.set_progress(1.0)
        except Exception as e:
            self._handle_error(e)
        finally:
            self._set_busy(False)


def _set_macos_app_name(name: str) -> None:
    """Override the app name shown in macOS menu bar / System Events.

    Without an .app bundle, macOS reads CFBundleName / CFBundleDisplayName
    from the binary's filename. The known runtime workaround is to mutate
    the in-memory dictionary returned by [NSBundle mainBundle] infoDictionary]:
    although declared as NSDictionary (immutable), Apple internally backs it
    with a mutable instance, and setObject:forKey: actually sticks for the
    duration of the process — long enough for AppKit to read it when it
    builds the menu bar.

    Implemented with ctypes against libobjc, no PyObjC dependency.
    """
    if sys.platform != "darwin":
        return
    try:
        import ctypes
        from ctypes import c_void_p, c_char_p

        objc = ctypes.cdll.LoadLibrary("/usr/lib/libobjc.A.dylib")
        objc.objc_getClass.restype = c_void_p
        objc.objc_getClass.argtypes = [c_char_p]
        objc.sel_registerName.restype = c_void_p
        objc.sel_registerName.argtypes = [c_char_p]

        def msg0(obj, sel):
            objc.objc_msgSend.restype = c_void_p
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p]
            return objc.objc_msgSend(obj, objc.sel_registerName(sel))

        def msg_str(obj, sel, s):
            objc.objc_msgSend.restype = c_void_p
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p, c_char_p]
            return objc.objc_msgSend(obj, objc.sel_registerName(sel), s.encode("utf-8"))

        def msg_set(obj, sel, value, key):
            objc.objc_msgSend.restype = None
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p, c_void_p, c_void_p]
            objc.objc_msgSend(obj, objc.sel_registerName(sel), value, key)

        ns_string_cls = objc.objc_getClass(b"NSString")
        ns_bundle_cls = objc.objc_getClass(b"NSBundle")

        bundle = msg0(ns_bundle_cls, b"mainBundle")
        if not bundle:
            return

        # Try the localized dictionary first (overrides infoDictionary), then
        # fall back to the plain infoDictionary.
        info = msg0(bundle, b"localizedInfoDictionary") or msg0(bundle, b"infoDictionary")
        if not info:
            return

        nsname = msg_str(ns_string_cls, b"stringWithUTF8String:", name)
        for key_cstr in (b"CFBundleName", b"CFBundleDisplayName"):
            key = msg_str(ns_string_cls, b"stringWithUTF8String:", key_cstr.decode("ascii"))
            msg_set(info, b"setObject:forKey:", nsname, key)
    except Exception:
        pass


def _set_macos_dock_icon(icon_path: str) -> None:
    """Set the macOS dock icon at runtime.

    MUST be called only after a Tk root has been created and its event loop
    is running — Tk installs its own NSApplication subclass (TKApplication)
    when it boots, and calling [NSApplication sharedApplication] before
    that happens replaces the shared instance with a vanilla NSApplication,
    after which Tk crashes during color/event handling with:

        -[NSApplication macOSVersion]: unrecognized selector

    Schedule this via root.after(N, lambda: _set_macos_dock_icon(...)) to
    guarantee Tk's NSApp is already in place when we hand AppKit the image.
    """
    if sys.platform != "darwin":
        return
    if not icon_path or not os.path.exists(icon_path):
        return
    try:
        import ctypes
        from ctypes import c_void_p, c_char_p

        ctypes.cdll.LoadLibrary(
            "/System/Library/Frameworks/AppKit.framework/AppKit"
        )
        objc = ctypes.cdll.LoadLibrary("/usr/lib/libobjc.A.dylib")
        objc.objc_getClass.restype = c_void_p
        objc.objc_getClass.argtypes = [c_char_p]
        objc.sel_registerName.restype = c_void_p
        objc.sel_registerName.argtypes = [c_char_p]

        def msg0(obj, sel):
            objc.objc_msgSend.restype = c_void_p
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p]
            return objc.objc_msgSend(obj, objc.sel_registerName(sel))

        def msg_str(obj, sel, s):
            objc.objc_msgSend.restype = c_void_p
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p, c_char_p]
            return objc.objc_msgSend(obj, objc.sel_registerName(sel), s.encode("utf-8"))

        def msg_obj(obj, sel, arg):
            objc.objc_msgSend.restype = None
            objc.objc_msgSend.argtypes = [c_void_p, c_void_p, c_void_p]
            objc.objc_msgSend(obj, objc.sel_registerName(sel), arg)

        ns_string_cls = objc.objc_getClass(b"NSString")
        ns_image_cls = objc.objc_getClass(b"NSImage")
        ns_app_cls = objc.objc_getClass(b"NSApplication")
        if not (ns_string_cls and ns_image_cls and ns_app_cls):
            return

        path_ns = msg_str(ns_string_cls, b"stringWithUTF8String:", icon_path)
        img_alloc = msg0(ns_image_cls, b"alloc")
        objc.objc_msgSend.restype = c_void_p
        objc.objc_msgSend.argtypes = [c_void_p, c_void_p, c_void_p]
        img = objc.objc_msgSend(
            img_alloc, objc.sel_registerName(b"initWithContentsOfFile:"), path_ns
        )
        if not img:
            return

        # By the time we're called via root.after(), Tk has already set
        # itself up as the shared NSApplication, so this returns Tk's
        # subclass instance (TKApplication) — not a fresh NSApplication.
        app = msg0(ns_app_cls, b"sharedApplication")
        if not app:
            return
        msg_obj(app, b"setApplicationIconImage:", img)
    except Exception:
        pass


def _show_disclaimer():
    _set_macos_app_name("ClipForge")
    root = ctk.CTk()
    root.withdraw()
    if sys.platform == "darwin":
        root.after(80, lambda: _set_macos_dock_icon(resource_path("assets/icon.icns")))
    _apply_window_icon(root)
    accepted = DisclaimerDialog(root, mode="accept").show()
    root.destroy()
    return accepted


if __name__ == "__main__":
    _set_macos_app_name("ClipForge")
    if not _show_disclaimer():
        sys.exit(0)
    App().mainloop()
