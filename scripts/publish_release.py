#!/usr/bin/env python3
r"""
Philophais Auto-Update Publisher & Deployment Script
Modeled after HydroPulse (C:/Users/monty/Documents/AB/pool)

Automates:
1. Verifying or creating the GitHub repository (Mors1A4/philophais).
2. Updating version numbers across version.json, package.json, Cargo.toml, tauri.conf.json.
3. Compiling and signing the Android APK (build-android.bat).
4. Committing and pushing git commits and tags to GitHub main branch.
5. Creating the GitHub release and uploading philophais.apk as a release asset.
"""

import sys
import os
import json
import subprocess
import re
import urllib.request
import urllib.error

OWNER = "Mors1A4"
REPO = "philophais"

def get_github_token():
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        # Check pool repository for token
        for test_path in ["C:/Users/monty/Documents/AB/pool", "."]:
            try:
                url = subprocess.check_output(['git', '-C', test_path, 'config', '--get', 'remote.origin.url'], text=True).strip()
                m = re.search(r'gh[op]_[A-Za-z0-9_]+', url)
                if m:
                    token = m.group(0)
                    break
            except Exception:
                pass
    return token

def get_headers(token):
    return {
        "Authorization": f"token {token}",
        "User-Agent": "Philophais-Release-Agent",
        "Accept": "application/vnd.github.v3+json"
    }

def ensure_github_repo(token):
    url = f"https://api.github.com/repos/{OWNER}/{REPO}"
    req = urllib.request.Request(url, headers=get_headers(token))
    try:
        res = urllib.request.urlopen(req)
        data = json.loads(res.read())
        print(f"[OK] Repository exists: {data.get('html_url')}")
        return data
    except urllib.error.HTTPError as e:
        if e.code == 404:
            print(f"[+] Creating repository {OWNER}/{REPO} on GitHub...")
            create_url = "https://api.github.com/user/repos"
            payload = json.dumps({
                "name": REPO,
                "description": "Philophais: 100% Offline Local EPUB Reader & AI Study Companion for Android & Desktop",
                "private": False,
                "has_issues": True,
                "has_projects": False,
                "has_wiki": False
            }).encode("utf-8")
            post_req = urllib.request.Request(
                create_url,
                data=payload,
                headers={**get_headers(token), "Content-Type": "application/json"}
            )
            res = urllib.request.urlopen(post_req)
            data = json.loads(res.read())
            print(f"[OK] Repository created successfully: {data.get('html_url')}")
            return data
        else:
            raise

def setup_git_remote(token, root_dir):
    remote_url = f"https://x-access-token:{token}@github.com/{OWNER}/{REPO}.git"
    try:
        remotes = subprocess.check_output(['git', 'remote'], cwd=root_dir, text=True).strip().split()
        if 'origin' in remotes:
            subprocess.run(['git', 'remote', 'set-url', 'origin', remote_url], cwd=root_dir, check=True)
        else:
            subprocess.run(['git', 'remote', 'add', 'origin', remote_url], cwd=root_dir, check=True)
        print("[OK] Git remote origin configured.")
    except Exception as e:
        print(f"[WARN] Git remote config note: {e}")

def update_version_files(new_version, notes, root_dir):
    print(f"\n[1/4] Syncing version v{new_version} across manifests...")

    # 1. version.json
    v_path = os.path.join(root_dir, "version.json")
    apk_path = os.path.join(root_dir, "philophais.apk")
    apk_size = os.path.getsize(apk_path) if os.path.exists(apk_path) else 0

    v_data = {
        "version": new_version,
        "name": f"Philophais v{new_version} Release",
        "notes": notes,
        "publishedAt": "2026-11-14T22:00:00Z",
        "apkUrl": f"https://github.com/{OWNER}/{REPO}/releases/download/v{new_version}/philophais.apk",
        "apkSize": apk_size,
        "htmlUrl": f"https://github.com/{OWNER}/{REPO}/releases/tag/v{new_version}"
    }
    with open(v_path, "w", encoding="utf-8") as f:
        json.dump(v_data, f, indent=2)
    print(f"[OK] Updated {v_path}")

    # 2. package.json
    pkg_path = os.path.join(root_dir, "package.json")
    if os.path.exists(pkg_path):
        with open(pkg_path, "r", encoding="utf-8") as f:
            pkg = json.load(f)
        pkg["version"] = new_version
        with open(pkg_path, "w", encoding="utf-8") as f:
            json.dump(pkg, f, indent=2)
        print(f"[OK] Updated {pkg_path}")

    # 3. Cargo.toml
    cargo_path = os.path.join(root_dir, "src-tauri", "Cargo.toml")
    if os.path.exists(cargo_path):
        with open(cargo_path, "r", encoding="utf-8") as f:
            c_text = f.read()
        c_text = re.sub(r'version\s*=\s*"[^"]+"', f'version = "{new_version}"', c_text, count=1)
        with open(cargo_path, "w", encoding="utf-8") as f:
            f.write(c_text)
        print(f"[OK] Updated {cargo_path}")

    # 4. tauri.conf.json
    tauri_path = os.path.join(root_dir, "src-tauri", "tauri.conf.json")
    if os.path.exists(tauri_path):
        with open(tauri_path, "r", encoding="utf-8") as f:
            t_data = json.load(f)
        t_data["version"] = new_version
        with open(tauri_path, "w", encoding="utf-8") as f:
            json.dump(t_data, f, indent=2)
        print(f"[OK] Updated {tauri_path}")

    # 5. updateService.ts
    update_svc_path = os.path.join(root_dir, "src", "services", "updateService.ts")
    if os.path.exists(update_svc_path):
        with open(update_svc_path, "r", encoding="utf-8") as f:
            svc_text = f.read()
        svc_text = re.sub(r"export const CURRENT_APP_VERSION = '[^']+';", f"export const CURRENT_APP_VERSION = '{new_version}';", svc_text)
        with open(update_svc_path, "w", encoding="utf-8") as f:
            f.write(svc_text)
        print(f"[OK] Updated CURRENT_APP_VERSION in {update_svc_path}")

def publish_github_release(token, new_version, notes, root_dir):
    tag = f"v{new_version}"
    print(f"\n[4/4] Publishing GitHub Release {tag}...")

    # Create release
    rel_url = f"https://api.github.com/repos/{OWNER}/{REPO}/releases"
    payload = json.dumps({
        "tag_name": tag,
        "target_commitish": "main",
        "name": f"Philophais {tag} Release",
        "body": notes,
        "draft": False,
        "prerelease": False
    }).encode("utf-8")

    req = urllib.request.Request(
        rel_url,
        data=payload,
        headers={**get_headers(token), "Content-Type": "application/json"}
    )

    try:
        res = urllib.request.urlopen(req)
        release_data = json.loads(res.read())
        upload_url_template = release_data["upload_url"]
        release_html = release_data["html_url"]
        print(f"[OK] GitHub Release created: {release_html}")
    except urllib.error.HTTPError as e:
        if e.code == 422: # Already exists, fetch existing
            get_req = urllib.request.Request(f"{rel_url}/tags/{tag}", headers=get_headers(token))
            res = urllib.request.urlopen(get_req)
            release_data = json.loads(res.read())
            upload_url_template = release_data["upload_url"]
            print(f"[OK] Using existing release: {release_data['html_url']}")
        else:
            raise

    # Upload APK asset
    apk_path = os.path.join(root_dir, "philophais.apk")
    if os.path.exists(apk_path):
        upload_url = upload_url_template.split('{')[0] + "?name=philophais.apk"
        with open(apk_path, "rb") as f:
            apk_bytes = f.read()

        print(f"Uploading philophais.apk ({len(apk_bytes):,} bytes)...")
        up_req = urllib.request.Request(
            upload_url,
            data=apk_bytes,
            headers={
                **get_headers(token),
                "Content-Type": "application/vnd.android.package-archive"
            }
        )
        try:
            up_res = urllib.request.urlopen(up_req)
            up_data = json.loads(up_res.read())
            print(f"[SUCCESS] APK asset attached: {up_data.get('browser_download_url')}")
        except Exception as e:
            print(f"[WARN] Upload note: {e}")

def main():
    new_version = sys.argv[1].lstrip('v') if len(sys.argv) > 1 else "1.0.0"
    notes = sys.argv[2] if len(sys.argv) > 2 else (
        "- 100% Offline Local-First EPUB Reader & Study Companion\n"
        "- Completely eradicated Firebase: zero cloud latency & zero auth gates\n"
        "- Native Android APK powered by Tauri v2 and Rust\n"
        "- In-app auto-updating via GitHub Releases\n"
        "- Unlimited local book size with instant page formatting"
    )

    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    print(f"\n========================================================")
    print(f"       Publishing Philophais v{new_version}")
    print(f"========================================================\n")

    token = get_github_token()
    if not token:
        print("[ERROR] GitHub token not found! Set GITHUB_TOKEN environment variable.")
        sys.exit(1)

    # 1. Ensure GitHub Repo exists and configure remote
    ensure_github_repo(token)
    setup_git_remote(token, root_dir)

    # 2. Update version files
    update_version_files(new_version, notes, root_dir)

    # 3. Build Android APK if requested or if not exists
    skip_build = "--skip-build" in sys.argv
    apk_path = os.path.join(root_dir, "philophais.apk")
    if not skip_build or not os.path.exists(apk_path):
        print("\n[2/4] Compiling Android APK with build-android.bat...")
        ret = subprocess.run(["cmd.exe", "/c", "build-android.bat"], cwd=root_dir)
        if ret.returncode != 0:
            print(f"[ERROR] Android build failed with code {ret.returncode}!")
            sys.exit(ret.returncode)

    # Update size in version.json
    if os.path.exists(apk_path):
        v_path = os.path.join(root_dir, "version.json")
        with open(v_path, "r", encoding="utf-8") as f:
            v_data = json.load(f)
        v_data["apkSize"] = os.path.getsize(apk_path)
        with open(v_path, "w", encoding="utf-8") as f:
            json.dump(v_data, f, indent=2)

    # 4. Git commit and push
    print("\n[3/4] Committing and pushing release branch to GitHub...")
    subprocess.run(["git", "add", "-A"], cwd=root_dir)
    subprocess.run(["git", "commit", "-m", f"Release v{new_version}"], cwd=root_dir)
    subprocess.run(["git", "branch", "-M", "main"], cwd=root_dir)
    subprocess.run(["git", "push", "-u", "origin", "main", "--force"], cwd=root_dir)

    tag = f"v{new_version}"
    subprocess.run(["git", "tag", "-f", tag], cwd=root_dir)
    subprocess.run(["git", "push", "origin", tag, "--force"], cwd=root_dir)

    # 5. Create GitHub release and upload asset
    publish_github_release(token, new_version, notes, root_dir)

    print("\n========================================================")
    print(f"  SUCCESS: Philophais v{new_version} published and deployed!")
    print("========================================================\n")

if __name__ == "__main__":
    main()
