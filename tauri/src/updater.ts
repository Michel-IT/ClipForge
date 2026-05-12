// Lightweight update checker — calls the public GitHub Releases API for the
// most recent `tauri-v*` tag, compares with the running app version, and
// returns whether a newer build is available. No signing keys, no auto-replace,
// no infrastructure — the UI just surfaces a banner with a link to the release
// page so the user can download manually.

import { getVersion } from "@tauri-apps/api/app";
import { arch as osArch, platform as osPlatform } from "@tauri-apps/plugin-os";
import { UpdateInfo } from "./types";

const RELEASES_URL = "https://api.github.com/repos/Michel-IT/ClipForge/releases";

// Parse "0.1.2" / "tauri-v0.1.2" / "v0.1.2" into a comparable [major, minor, patch] tuple.
function parseVersion(s: string): [number, number, number] {
  const stripped = s.replace(/^tauri-v/, "").replace(/^v/, "").trim();
  const parts = stripped.split(".").map((p) => parseInt(p, 10));
  return [parts[0] || 0, parts[1] || 0, parts[2] || 0];
}

function compareVersions(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

interface GitHubRelease {
  tag_name: string;
  html_url: string;
  published_at?: string;
  draft?: boolean;
  prerelease?: boolean;
}

// Resolve the OS-specific asset URL for a given version, following the
// `ClipForge-<version>-<os>-<arch>.<ext>` naming convention used since
// tauri-v0.1.2. Returns undefined if the platform/arch can't be determined or
// is unsupported — caller falls back to the GitHub release page.
//
// For Linux we pick AppImage (most portable, single binary, works on any
// distro). Users who want .deb/.rpm specifically can use the release page link.
// For Windows we pick the MSI (standard installer); NSIS is also available
// from the release page.
async function resolveAssetUrl(version: string): Promise<string | undefined> {
  let p: string;
  let a: string;
  try {
    p = await osPlatform();
    a = await osArch();
  } catch {
    return undefined;
  }
  const base = `https://github.com/Michel-IT/ClipForge/releases/download/tauri-v${version}/ClipForge-${version}-`;
  if (p === "windows") return `${base}windows-x64.msi`;
  if (p === "macos") {
    if (a === "aarch64" || a === "arm64") return `${base}macos-arm64.dmg`;
    return `${base}macos-intel.dmg`;
  }
  if (p === "linux") return `${base}linux-amd64.AppImage`;
  return undefined;
}

export async function checkForUpdates(): Promise<UpdateInfo | null> {
  let current: string;
  try {
    current = await getVersion();
  } catch {
    return null;
  }

  let releases: GitHubRelease[];
  try {
    const resp = await fetch(RELEASES_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!resp.ok) return null;
    releases = await resp.json();
  } catch {
    return null;
  }

  // Pick the most recent published, non-draft Tauri release. We can't rely on
  // /releases/latest because the user may have a Python release marked latest
  // in legacy setups, and the API endpoint follows the "is_latest" flag.
  const tauriReleases = releases
    .filter((r) => !r.draft && r.tag_name.startsWith("tauri-v"))
    .sort((a, b) => compareVersions(parseVersion(b.tag_name), parseVersion(a.tag_name)));

  if (tauriReleases.length === 0) return null;
  const latest = tauriReleases[0];
  const latestVersion = latest.tag_name.replace(/^tauri-v/, "");
  const cmp = compareVersions(parseVersion(latestVersion), parseVersion(current));
  const directAssetUrl = cmp > 0 ? await resolveAssetUrl(latestVersion) : undefined;

  return {
    available: cmp > 0,
    currentVersion: current,
    latestVersion,
    htmlUrl: latest.html_url,
    directAssetUrl,
    publishedAt: latest.published_at,
  };
}
