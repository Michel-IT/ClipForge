# ClipForge — Privacy Policy

**Effective date:** 2026-05-11
**Software version:** see repository tag

This document describes how ClipForge handles your personal data. It is intentionally short because ClipForge is intentionally a data-minimal local application: it processes no personal data on the developer's behalf.

## 1. Data controller

The data controller for the purposes of EU Regulation 2016/679 (GDPR) and Italian Legislative Decree 196/2003 ("Codice in materia di protezione dei dati personali", as amended by D.Lgs. 101/2018) is:

> Michel Marrazzo
> Italy
> Contact: via the [GitHub repository](https://github.com/Michel-IT/ClipForge) issues page.

## 2. What data ClipForge collects

**None.** ClipForge is a desktop application that runs entirely on your local machine and does not collect, transmit, or store any personal data on any server controlled by the developer or any third party acting on the developer's behalf.

Specifically, ClipForge does **not**:

- send any telemetry, analytics, or usage statistics to any server;
- create any account, profile, or identifier tied to you;
- transmit your IP address, device identifiers, or system information to any server controlled by the developer;
- collect, share, or sell your browsing history, your download history, or any URLs you paste into the application;
- track, fingerprint, or otherwise identify you across sessions;
- include any third-party tracker, advertising network, or analytics SDK.

The only network connections initiated by ClipForge are those that you explicitly trigger by pasting a URL and starting a download, and those connections go **directly from your device to the source platform** (e.g. YouTube's servers) via the bundled `yt-dlp` engine.

## 3. Data stored locally on your device

ClipForge stores a small amount of preference data **locally on your device only**, in your operating system's standard application-data folder. This data:

- never leaves your machine;
- is not transmitted to the developer or to any third party;
- can be deleted at any time by uninstalling the Software and removing its configuration folder.

The stored preferences include: chosen output directory, chosen interface language, chosen UI theme, chosen audio bitrate / video quality / subtitle languages, chosen cookie-source browser (if any), the acceptance flag for the Legal Disclaimer.

## 4. Downloaded content

Files downloaded by ClipForge — videos, audio tracks, subtitles, thumbnails — are written **only** to the output directory you choose on your local device. They are not uploaded, indexed, or shared by ClipForge with any party.

## 5. Browser cookies (optional feature)

If you enable the "cookies from browser" option in Settings, ClipForge reads cookies from the local cookie store of the browser you select. Those cookies are read into memory at the moment of the download and passed directly to `yt-dlp`, which uses them to authenticate against the source platform on your behalf. ClipForge does not copy, log, persist, or transmit those cookies. They never leave your machine other than via the authenticated connection that `yt-dlp` makes to the source platform.

## 6. Logs and crash reports

ClipForge does not collect logs or crash reports from your device. If, on your own initiative, you report a bug or crash via the GitHub issues page, you may choose to attach log output yourself; in that case, you are responsible for redacting any personal information before posting.

## 7. Your rights under GDPR

Because ClipForge does not collect, process, or store any personal data on any server, the standard GDPR rights of access, rectification, erasure, restriction, portability, and objection (Articles 15–22 of EU Regulation 2016/679) are inherently satisfied: there is no data held by the developer to access, rectify, or erase. You may exercise full control over the data stored locally on your device by uninstalling the Software.

## 8. Third parties

The bundled `yt-dlp` engine and the `ffmpeg` binary, when running, connect directly to the source platforms (YouTube, Vimeo, etc.) you instruct them to retrieve content from. Those connections are subject to the privacy policies of the respective source platforms, not to this policy. The developer of ClipForge has no contractual relationship with, and exercises no control over, those source platforms.

## 9. Changes to this Privacy Policy

The developer may update this Privacy Policy at any time by publishing a new version in the official repository. The version applicable to your use is the version shipped inside the version of the Software that you are running.

## 10. Governing law

This Privacy Policy is governed by the laws of the **Italian Republic**, in accordance with EU Regulation 2016/679 (GDPR) and Italian Legislative Decree 196/2003.
