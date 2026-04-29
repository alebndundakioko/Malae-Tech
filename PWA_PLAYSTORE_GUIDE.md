# Malae Tech: Play Store Deployment Guide (TWA)

This guide outlines the simplest path to publishing the **Malae Tech Clinical Workspace** as a high-performance **Trusted Web Activity (TWA)** on the Google Play Store.

---

## 🏗️ Phase 1: Local Environment Setup

1. **Export Project**: Download your project from AI Studio as a ZIP or push to GitHub.
2. **Install Node.js**: Ensure you have a recent version of Node.js installed locally.
3. **Install Bubblewrap CLI**: Use the tool designed by Google to bridge PWAs and Android.
   ```bash
   npm install -g @bubblewrap/cli
   ```

---

## 🚀 Phase 2: Initialization & Build

1.  **Build your project**:
    This generates the `dist` folder. Run this command in your terminal:
    ```bash
    npx vite build
    ```
    
2.  **Initialize Android Project**:
    Run this command:
    ```bash
    bubblewrap init --manifest dist/manifest.webmanifest
    ```
    
    **⚠️ Troubleshooting "cli ERROR Invalid URL"**:
    If you see `Invalid URL`, it means Bubblewrap expects a URL or a clear local file path.
    **Try this**:
    ```bash
    bubblewrap init --manifest ./dist/manifest.webmanifest
    ```
    *(If that still fails, use the **absolute path** to the manifest file, e.g., `C:\Users\...\dist\manifest.webmanifest`)*

    *   **Package ID**: Use `com.malaetech.app` (or your preferred unique ID).
    *   **Host**: Use your intended production domain (e.g., `malaetech.com`).
    *   **Display Mode**: Ensure it is set to `standalone`.

3.  **Generate Signing Key**:
   Run the build command for the first time:
   ```bash
   bubblewrap build
   ```
   *   Bubblewrap will prompt you to create a **Key Store**. 
   *   **⚠️ CRITICAL**: Store the `keystore.jks` file and passwords safely. Without these, you cannot update the app later.

---

## 🔒 Phase 3: Establishing the Trust (Asset Links)

Trusted Web Activities require a "digital handshake" to remove the browser URL bar.

1. **Get the Fingerprint**:
   After the build, copy the **SHA-256 Fingerprint** displayed in the terminal.
   *   *Alternative command*: `bubblewrap fingerprint`

2. **Update the Web App**:
   In AI Studio, edit `/public/.well-known/assetlinks.json`:
   ```json
   {
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.malaetech.app",
       "sha256_cert_fingerprints": ["YOUR_COPIED_SHA256_FINGERPRINT"]
     }
   }
   ```
3. **Redeploy**: Ensure the app is live with this updated file.

---

## 🏁 Phase 4: Final Compilation & Submission

1. **Final Build**:
   ```bash
   bubblewrap build
   ```
2. **Locate the Bundle**:
   Bubblewrap will generate an **Asset Bundle** (`app-release-bundle.aab`) in your output folder.
3. **Google Play Console**:
   *   Create a developer account ($25 one-time fee).
   *   Create a new App.
   *   Navigate to **Production** > **Releases** and upload the `.aab` file.
   *   Complete the mandatory Store Listing (Descriptions, Icons, Screenshots).

---

## ✅ Checkpoint Checklist

- [ ] `manifest.json` has `standalone` display mode.
- [ ] `assetlinks.json` is publicly accessible at `your-domain.com/.well-known/assetlinks.json`.
- [ ] Icons are provided in both 192px and 512px versions.
- [ ] SHA-256 fingerprint in code matches the Play Store signing key.

---
*Malae Tech - Precision in clinical history.*
