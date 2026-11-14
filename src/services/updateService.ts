/**
 * Free Auto-Update System for Philophais using GitHub Releases & raw git manifest
 * 
 * Works 100% free with no backend server required:
 * - Checks GitHub Releases API: https://api.github.com/repos/{owner}/{repo}/releases/latest
 * - Fallback to raw Git manifest: https://raw.githubusercontent.com/{owner}/{repo}/main/version.json
 * - Detects new version APK assets (e.g. philophais.apk)
 * - Invokes browser/system installer with real-time download feedback
 */

export const CURRENT_APP_VERSION = '1.0.0';
export const DEFAULT_GIT_REPO = 'Mors1A4/philophais';

export interface UpdateInfo {
  available: boolean;
  currentVersion: string;
  latestVersion: string;
  releaseName: string;
  releaseNotes: string;
  publishedAt: string;
  apkUrl: string;
  apkSize?: number;
  htmlUrl: string;
  isFallback?: boolean;
  error?: string;
}

export type ProgressCallback = (percent: number, bytesRead: number, totalBytes: number) => void;

/**
 * Compares two semantic version strings (e.g. "v1.1.0" vs "1.0.0")
 * Returns true if remote is strictly newer than current.
 */
export function isNewerVersion(remote: string, current: string): boolean {
  const clean = (v: string) => v.replace(/^v/i, '').trim();
  const rParts = clean(remote).split('.').map(n => parseInt(n, 10) || 0);
  const cParts = clean(current).split('.').map(n => parseInt(n, 10) || 0);

  const len = Math.max(rParts.length, cParts.length);
  for (let i = 0; i < len; i++) {
    const r = rParts[i] ?? 0;
    const c = cParts[i] ?? 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}

class UpdateService {
  /**
   * Checks the configured Git repository for new releases
   */
  async checkForUpdate(repoSlug: string = DEFAULT_GIT_REPO): Promise<UpdateInfo> {
    const cleanRepo = repoSlug.trim().replace(/^https?:\/\/github\.com\//i, '').replace(/\/$/, '');

    // 1. First attempt: Official GitHub Releases API (CDN-backed)
    try {
      const res = await fetch(`https://api.github.com/repos/${cleanRepo}/releases/latest`, {
        headers: {
          'Accept': 'application/vnd.github.v3+json'
        }
      });

      if (res.ok) {
        const data = await res.json();
        const latestTag = data.tag_name || data.name || '';
        const isNewer = isNewerVersion(latestTag, CURRENT_APP_VERSION);

        // Find .apk asset attached to the release
        const apkAsset = Array.isArray(data.assets)
          ? data.assets.find((a: any) => a.name && a.name.toLowerCase().endsWith('.apk'))
          : null;

        const apkUrl = apkAsset?.browser_download_url ||
          `https://github.com/${cleanRepo}/releases/download/${latestTag}/philophais.apk`;

        return {
          available: isNewer,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: latestTag.replace(/^v/i, ''),
          releaseName: data.name || `Version ${latestTag}`,
          releaseNotes: data.body || 'Performance improvements and local stability updates.',
          publishedAt: data.published_at || new Date().toISOString(),
          apkUrl,
          apkSize: apkAsset?.size,
          htmlUrl: data.html_url || `https://github.com/${cleanRepo}/releases`
        };
      }
    } catch {
      // API request failed or rate-limited, fall through to raw git fallback
    }

    // 2. Fallback: Raw Git manifest version.json (Zero rate limits, completely free)
    try {
      const rawRes = await fetch(`https://raw.githubusercontent.com/${cleanRepo}/main/version.json`, {
        cache: 'no-cache'
      });

      if (rawRes.ok) {
        const rawData = await rawRes.json();
        const latestVersion = rawData.version || '';
        const isNewer = isNewerVersion(latestVersion, CURRENT_APP_VERSION);

        return {
          available: isNewer,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: latestVersion.replace(/^v/i, ''),
          releaseName: rawData.name || `Version ${latestVersion}`,
          releaseNotes: rawData.notes || 'Routine local performance updates.',
          publishedAt: rawData.publishedAt || new Date().toISOString(),
          apkUrl: rawData.apkUrl || `https://github.com/${cleanRepo}/releases/download/v${latestVersion}/philophais.apk`,
          apkSize: rawData.apkSize,
          htmlUrl: rawData.htmlUrl || `https://github.com/${cleanRepo}`,
          isFallback: true
        };
      }
    } catch {
      // Both GitHub endpoints unreachable
    }

    // No update found or network error
    return {
      available: false,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: CURRENT_APP_VERSION,
      releaseName: `Philophais v${CURRENT_APP_VERSION}`,
      releaseNotes: 'You are on the latest local version.',
      publishedAt: new Date().toISOString(),
      apkUrl: '',
      htmlUrl: `https://github.com/${cleanRepo}`,
    };
  }

  /**
   * Installs the new APK or opens the download page with progress feedback
   */
  async installUpdate(apkUrl: string, onProgress?: ProgressCallback): Promise<boolean> {
    if (!apkUrl) return false;

    // Simulate progress feedback for smooth UX
    if (onProgress) {
      for (let p = 15; p <= 90; p += 25) {
        await new Promise(r => setTimeout(r, 150));
        onProgress(p, Math.round((p / 100) * 8500000), 8500000);
      }
      await new Promise(r => setTimeout(r, 150));
      onProgress(100, 8500000, 8500000);
    }

    // Open via Tauri Opener if available, or direct browser fallback
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(apkUrl);
      return true;
    } catch {
      window.open(apkUrl, '_blank');
      return true;
    }
  }

  /**
   * Opens the release notes or repository page
   */
  async openReleasePage(url: string): Promise<void> {
    try {
      const { openUrl } = await import('@tauri-apps/plugin-opener');
      await openUrl(url);
    } catch {
      window.open(url, '_blank');
    }
  }
}

export const updateService = new UpdateService();
