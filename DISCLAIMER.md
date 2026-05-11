# ClipForge — Legal Disclaimer

**Effective date:** 2026-05-11
**Software version:** see repository tag

By installing, running, or otherwise using ClipForge (the "Software") you agree to be bound by this Disclaimer. If you do not agree, you must not use the Software.

---

## 1. No warranty

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. THE AUTHOR DOES NOT WARRANT THAT THE SOFTWARE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE FROM HARMFUL COMPONENTS. THIS PARAGRAPH MIRRORS SECTIONS 15 AND 16 OF THE GNU AFFERO GENERAL PUBLIC LICENSE VERSION 3 UNDER WHICH THIS SOFTWARE IS DISTRIBUTED.

## 2. Limitation of liability

TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE AUTHOR, COPYRIGHT HOLDERS, OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, LOSS OF DATA, LOSS OF PROFITS, BUSINESS INTERRUPTION, LEGAL FEES, OR FINES) ARISING IN ANY WAY OUT OF THE USE OF, OR INABILITY TO USE, THE SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## 3. Permitted use

You may use the Software only to download, store, transcode, or extract subtitles from audiovisual content for which **at least one** of the following is true:

a. You are the sole owner of the copyright in the content;
b. The content is in the public domain in your jurisdiction;
c. You have explicit, verifiable, written permission from the rights holder to perform the operation;
d. The content is distributed under a license (e.g. Creative Commons CC0, CC BY, CC BY-SA) that explicitly permits the operation you intend to perform.

Any use that does not satisfy at least one of (a)–(d) above is not authorized by this Disclaimer and is your sole responsibility.

## 3-bis. Tool neutrality and user-initiated operation

The Software is a general-purpose downloader with substantial non-infringing uses (personal archival of user-owned content, retrieval of public-domain works, retrieval of Creative-Commons-licensed materials, archival of user-generated content for which the user holds permission, accessibility transcripts, journalistic and academic preservation, etc.).

The Software performs only those operations explicitly initiated by you. It does **not** autonomously discover content, recommend downloads, optimize for any specific platform, transmit telemetry, or perform any action without explicit user input. Every download — whether of a single item or of a batch of items selected from a playlist — requires affirmative actions on your part: pasting a URL, choosing the output format and destination, selecting items where applicable, and (for batches above the bulk-confirmation threshold built into the user interface) explicitly confirming the batch size before the operation begins.

The author of the Software makes no decision regarding what content is downloaded; that decision is, at all times, solely yours. The Software's role is limited to executing your instructions against the public extraction library `yt-dlp`.

## 4. Forbidden use

You may **not** use the Software to:

- Circumvent any technological protection measure (TPM), digital rights management (DRM) system, encryption, watermark, geoblock, or access control;
- Download, reproduce, transmit, or redistribute commercial content (including but not limited to films, TV series, music tracks, audiobooks, paid courses, and live broadcasts) without holding the rights or an explicit license to do so;
- Perform mass scraping, automated harvesting, or any operation that violates the rate limits or technical safeguards of any source platform, including using the playlist/batch download functionality to acquire substantial parts of a source platform's catalog without authorization or to circumvent platform-imposed access limits;
- Re-upload, mirror, sell, sublicense, or otherwise redistribute material downloaded with the Software unless you hold the rights to do so;
- Engage in any activity that violates the Terms of Service of the source platform or any applicable law in your jurisdiction or in the jurisdiction of the rights holder.

## 4-bis. Indemnification

You agree to indemnify, defend, and hold harmless the author of the Software, the author's heirs, and any contributors to the Software, from and against any and all claims, liabilities, damages, losses, costs, judgments, and expenses (including reasonable legal fees and court costs) arising out of or in any way related to:

a. Your use of the Software in violation of this Disclaimer, of any applicable law, or of the Terms of Service of any source platform;
b. Any content you download, store, transcode, redistribute, or otherwise process using the Software;
c. Any infringement of intellectual-property rights, privacy rights, publicity rights, or any other rights of third parties caused, directly or indirectly, by your use of the Software.

This indemnification obligation survives termination of your use of the Software.

## 5. Source platform Terms of Service

The Software is a generic downloader built on top of `yt-dlp`. It does not negotiate, accept, or enforce the Terms of Service of any third-party platform (YouTube, Meta / Facebook / Instagram, TikTok, X / Twitter, Vimeo, Twitch, Reddit, Dailymotion, SoundCloud, or any other site supported by `yt-dlp`). You are solely responsible for reading, understanding, and complying with the Terms of Service of every platform from which you download content.

The author of the Software has no contractual relationship with any of these platforms and makes no representation about whether a given operation is permitted by their Terms of Service. When in doubt, do not use the Software with that platform.

## 6. Copyright law compliance

You are solely responsible for ensuring that your use of the Software complies with all applicable copyright laws, including but not limited to:

- **United States** — Copyright Act, 17 U.S.C. §§ 101 et seq., and the Digital Millennium Copyright Act, 17 U.S.C. § 1201 (anti-circumvention).
- **European Union** — Directive 2001/29/EC (InfoSoc), Directive 2019/790 (DSM Directive), and the implementing legislation of each Member State.
- **Italy** — Legge 22 aprile 1941, n. 633 ("Legge sul diritto d'autore"), in particular articles 171, 171-bis, and 171-ter.
- **United Kingdom** — Copyright, Designs and Patents Act 1988.
- Any equivalent law in your jurisdiction.

The author of the Software is not your lawyer and this Disclaimer is not legal advice. If your intended use is not unambiguously permitted by the categories listed in section 3 above, consult a qualified attorney in your jurisdiction before proceeding.

## 7. Third-party components

The Software is distributed in two build variants (Python single-file build and Tauri desktop build). Each variant incorporates the following third-party components, each governed by its own license. Their inclusion does not constitute an endorsement by, or partnership with, the authors of those components.

**Both variants:**

| Component | License | Notes |
|---|---|---|
| [yt-dlp](https://github.com/yt-dlp/yt-dlp) | Unlicense (public domain dedication) | Performs all extraction and download operations. Bundled as a sidecar binary. |
| `ffmpeg` binary | LGPL / GPL (depending on build configuration) | The bundled binary may include components covered by the GNU (Lesser) General Public License. The ClipForge distribution is therefore distributed under AGPL-3.0, which is compatible with these licenses. |

**Python single-file build only:**

| Component | License | Notes |
|---|---|---|
| [CustomTkinter](https://github.com/TomSchimansky/CustomTkinter) | MIT | UI toolkit. |
| [imageio-ffmpeg](https://github.com/imageio/imageio-ffmpeg) | BSD-2-Clause | Provides the bundled `ffmpeg` binary. |
| [PyInstaller](https://github.com/pyinstaller/pyinstaller) | GPL-2.0 with bootloader exception | Build-time only; the bootloader exception permits closed-source applications, but ClipForge is open source. |

**Tauri desktop build only:**

| Component | License | Notes |
|---|---|---|
| [Tauri](https://github.com/tauri-apps/tauri) | Apache-2.0 OR MIT | Desktop application runtime. |
| Microsoft Edge WebView2 | Microsoft Software License Terms | Embedded browser runtime on Windows. Pre-installed on Windows 10/11; redistribution governed by Microsoft's terms. |
| WebKitGTK (Linux) | LGPL-2.1 | Embedded browser runtime on Linux. |
| WKWebView (macOS) | Apple Public Source License / system component | Embedded browser runtime on macOS. |
| [React](https://github.com/facebook/react) | MIT | UI library. |
| [react-i18next](https://github.com/i18next/react-i18next) | MIT | Internationalisation. |
| [Vite](https://github.com/vitejs/vite) | MIT | Frontend build tooling (build-time only). |
| Rust crates ([serde](https://serde.rs), [tokio](https://tokio.rs), [thiserror](https://github.com/dtolnay/thiserror), etc.) | MIT OR Apache-2.0 | Backend dependencies; full list in `Cargo.lock`. |

## 8. No technical support, no service-level agreement

The Software is distributed at no cost and without any obligation of technical support, maintenance, security updates, bug fixes, or service-level commitments. The author may, at his sole discretion, accept or reject contributions, issues, or feature requests submitted via the public repository.

## 9. Changes to this Disclaimer

The author may update this Disclaimer at any time by publishing a new version in the official repository. The version of the Disclaimer applicable to your use is the version shipped inside the version of the Software that you are running. Continued use of new versions of the Software constitutes acceptance of the Disclaimer shipped with that version.

## 10. Governing law

This Disclaimer and any dispute arising out of or in connection with the Software shall be governed by, and construed in accordance with, the laws of the **Italian Republic**, without regard to its conflict-of-laws rules. The exclusive forum for any such dispute is the competent court in the place of residence of the author of the Software, save for mandatory consumer-protection rules that may apply in the user's place of residence.

## 11. Severability

If any provision of this Disclaimer is held to be unenforceable or invalid, that provision shall be limited or eliminated to the minimum extent necessary so that this Disclaimer shall otherwise remain in full force and effect.

## 12. Trademark notice — nominative fair use

Names of third-party platforms (including but not limited to YouTube, TikTok, Instagram, Facebook, X / Twitter, Reddit, Vimeo, Twitch, Dailymotion, SoundCloud) and any associated trademarks, logos, and trade dress remain the exclusive property of their respective owners.

The use of such names in this Software, its source code, its user interface, its documentation, its release notes, and any communication channel associated with the project (including the official repository, README, and disclaimer) is solely **nominative** — that is, used to identify the source of content the user provides — and constitutes fair use under European Union Regulation 2017/1001 Article 14 and analogous provisions of national trademark law (including, but not limited to, the United States doctrine of nominative fair use as set out in *New Kids on the Block v. News America Publishing*, 971 F.2d 302 (9th Cir. 1992)).

No use of any third-party name or trademark in connection with the Software implies any endorsement, sponsorship, partnership, affiliation, certification, or other relationship between the author of the Software and the trademark owner.

## 13. Donations are not consideration

Any monetary contribution made by you, or by a third party on your behalf, through any payment platform (including but not limited to PayPal, GitHub Sponsors, Buy Me a Coffee, Ko-fi, Patreon, or any successor service) in connection with the Software is **voluntary, gratuitous, and unconditional**, and is made solely in support of the ongoing development of the Software.

Such contributions:

- do **not** constitute payment, consideration, or any form of fee for the Software, for any feature of the Software, for any service, or for any future right of any kind;
- do **not** create any contractual obligation upon the author of the Software, including but not limited to obligations of support, maintenance, feature development, or warranty;
- do **not** convey any additional rights to you or to any third party beyond those already granted by the GNU Affero General Public License Version 3 under which the Software is distributed.

The Software and all of its features are, and shall remain, available free of charge regardless of whether any donation is made. No goods, services, or digital deliverables are exchanged in consideration for any donation. This provision is intended, among other purposes, to preserve the legal qualification of donations as *liberalità* under Italian Civil Code articles 769 et seq. and as gratuitous transfers under analogous provisions of other applicable jurisdictions.

## 14. Acceptance

By clicking **"I Accept"** in the disclaimer dialog displayed at application startup, you acknowledge that you have read this Disclaimer in full, that you understand it, and that you agree to be bound by it. If you click **"I Reject (Exit)"** or close the dialog, the Software will terminate and no use is authorized.
