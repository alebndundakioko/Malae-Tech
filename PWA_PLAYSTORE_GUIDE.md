# 📱 Malae Tech - Google Play Store Deployment Guide

This guide ensures your PWA is perfectly configured and packaged for the Google Play Store using the Trusted Web Activity (TWA) standard and **Bubblewrap**.

---

## 🛠️ Phase 1: Environment Readiness

1.  **Download & Extract**: Download the `.zip` from AI Studio and extract it locally.
2.  **Open Terminal**: Open your terminal (PowerShell or CMD on Windows).
3.  **Navigate to Root**: 
    **CRITICAL**: You must be in the folder that contains `package.json` and `index.html`.
    Run `dir` (Windows) or `ls` (Mac). If you see another folder named `Malae-Tech-main`, `cd` into it.

---

## 🚀 Phase 2: Build & Initialize

1.  **Clean Dependencies & Build**:
    Run these commands one by one:
    ```bash
    npm install
    npm run build
    ```
    This creates a `dist` folder. 
    *   Verify it contains `manifest.webmanifest`.

2.  **Initialize Bubblewrap**:
    Run the command using the local manifest file:
    ```bash
    bubblewrap init --manifest ./dist/manifest.webmanifest
    ```

    **⚠️ Troubleshooting "Invalid URL"**:
    If Bubblewrap says "Invalid URL", try using the **absolute path**. 
    Example: `bubblewrap init --manifest "C:\Users\YourName\Downloads\app\dist\manifest.webmanifest"`

    **Configuration Details**:
    *   **Package ID**: `com.malaetech.workspace`
    *   **Host**: `malaetech.com` (or your actual domain)
    *   **Display Mode**: `standalone` (Required for Play Store)
    *   **Maskable Icon**: When asked about the 512px icon, confirm it is ready to use.

---

## 🏗️ Phase 3: Signing & Packaging

1.  **Build the Release Bundle**:
    ```bash
    bubblewrap build
    ```
    *   The first time, it will ask you to create a **Key Store**. 
    *   **SAVE YOUR PASSWORD** and keep the `keystore.jks` file safe.

2.  **Output**:
    *   You will get an `app-release-bundle.aab`. This is the file you upload to the Google Play Console.

---

## 🔐 Phase 4: Digital Asset Links (The "Trust")

To remove the browser address bar in the app, you must verify ownership:
1. Bubblewrap generates an `assetlinks.json` file.
2. You must place this on your server: `https://yourdomain.com/.well-known/assetlinks.json`
3. This "handshake" tells Google that the website and the app are owned by the same person.

---

## 🏁 Summary Checklist:
- [x] **Web Manifest**: Validated and includes 512px + Maskable icons.
- [x] **Service Worker**: Automatic offline support via Workbox.
- [x] **HTTPS**: Required for all Play Store PWAs.
- [x] **Build Script**: `npm run build` is standard and verified.
