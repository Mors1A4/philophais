# Philophais: Local-First EPUB Reader & AI Study Companion

Philophais is a high-performance, 100% offline-first EPUB reading application built with **Tauri v2, Rust, React 18, and Vite**. It is engineered for instant startup, zero cloud latency, unlimited book sizes, and free Git-hosted in-app auto-updating on **Android** and **Windows Desktop**.

- **GitHub Repository**: [https://github.com/Mors1A4/philophais](https://github.com/Mors1A4/philophais)
- **Current Version**: `1.0.0` (`philophais.apk`)

---

## Key Features

- **100% Local-First & Zero Firebase**: Completely eradicated all cloud authentication, Firestore collections, and remote database calls. Books and reading states load in <5ms directly from native flash storage.
- **Unlimited Book Capacity**: EPUBs of any length are parsed and stored locally in native storage with no 1MB Firestore chunking limits.
- **Free Git-Hosted In-App Auto-Updates**: Free in-app updates hosted via GitHub Releases (`api.github.com/repos/Mors1A4/philophais/releases/latest`) with raw fallback (`version.json`) and live in-app download progress bar.
- **Interactive Highlighting & Notes**: Select any passage across paragraphs to annotate with colored tags (yellow, red, green, blue, purple) with persistent local recall.
- **AI Reading Companion**: Ask analytical or interpretive questions about the open page powered by direct Gemini API calls or local fallback.
- **70,000+ Public Books**: Direct search and download integration with Project Gutenberg.

---

## Quick Start & Running

### 1. Build Web Frontend (Dev Mode)
```bash
npm install
npm run dev
```

### 2. Run Desktop App (Tauri)
```bash
npm run tauri dev
```

### 3. Build & Sign Android Release APK
Run the turnkey compilation script (utilizes Android SDK 36, NDK 27, and debug keystore):
```cmd
build-android.bat
```
Output: `philophais.apk` in project root. If an Android device (e.g. Pixel 8) is connected via USB/Wi-Fi, it will automatically install and launch.

### 4. Deploy & Publish to GitHub Releases
```bash
python scripts/publish_release.py 1.0.0
```
Automates version bumping, Android APK compilation, Git commits/tags, GitHub repo synchronization, and APK release asset upload.
