# 📱 Malae Tech - Google Play Store Deployment Guide

This guide ensures your app is correctly packaged for the Google Play Store.

## ⚠️ Important: "Why does my app show my old website?"
If you build your app using **Bubblewrap (TWA)**, the resulting `.aab` file does **not** contain your code. It is essentially a "shortcut" to your domain (e.g., `malaetech.com`). If you haven't uploaded the AI Studio code to your domain yet, the app will continue to show your old website.

**To fix this, you have two options:**
1.  **The "Bundled" Method (Recommended):** Use **Capacitor**. This physically puts your AI Studio code *inside* the Android app. This is the best way to ensure your app works exactly as it does here.
2.  **The "Website" Method:** Deploy your AI Studio code to your domain (`malaetech.com`) first.

## 🚀 The "Bundled" Method (Capacitor) - RECOMMENDED
*Use this if you want the app to contain your AI Studio code and work perfectly regardless of your website status.*

### Step 1: Install & Prepare
1.  **Open Terminal** in your project folder.
2.  **Install dependencies** (if you haven't already):
    ```bash
    npm install
    ```

### Step 2: Build & Sync
This step takes your code from AI Studio and puts it into the Android folder.
1.  **Run the sync command**:
    ```bash
    npm run build
    npx cap sync
    ```
    *This creates/updates the `dist` folder and copies it into the `android/app/src/main/assets/public` folder.*

### Step 3: Open in Android Studio
1.  **Launch Android Studio**.
2.  Click **Open** and select the `android` folder located *inside* your project.
3.  **Wait** for the project to finish "Syncing".

**⚠️ Troubleshooting "No matching toolchains found for requested specification: {languageVersion=21...}"**:
If you see this error in Android Studio:
*   **The Cause**: One of the newest Capacitor plugins (like `@capacitor/filesystem`) is forcing Gradle to look for Java 21, but you likely only have Java 17.
*   **The Fix**: I have updated `android/build.gradle` to force **every single task** to use Java 17, even if the plugin asks for 21. 
*   **The Action**: In Android Studio, go to **File** > **Settings** (or **Android Studio** > **Settings** on Mac) > **Build, Execution, Deployment** > **Build Tools** > **Gradle**.
*   **The Action**: Change the **Gradle JDK** dropdown to **Internal (jbr-17)** or any Java 17 instance. **This is the most important step.**
*   **The Action**: Click the **"Sync Project with Gradle Files"** button (the small Elephant icon in the top toolbar).
*   **Wait**: It should now successfully use your local Java 17 and finish the build.

**⚠️ Troubleshooting "Invalid source release: 21"**:
If you see `error: invalid source release: 21` in your build output:
*   **The Cause**: Some plugins are hardcoded to Java 21, but your environment is Java 17.
*   **The Solution**: I have already applied a patch to your `android/build.gradle` file that forces the project to use Java 17 compatible settings and ignores the "21" requirement. 
*   **The Action**: Simply ensure **Gradle JDK** is set to **"jbr-17"** (or similar Java 17) in Settings, then click **"Sync Project with Gradle Files"**.

## 🔐 Key Store & App Signing (Google Play)
If you are getting the "Path" wrong or can't find your key:
1.  **Where is it?**: The keystore is a file (usually `my-key.jks`) on your computer. It is NOT part of the zip file you download.
2.  **The "Correct" Path**: In the Android Studio Signing window, **always use the "Choose existing..." button** instead of typing the path manually. This ensures the format is correct (especially on Windows).
3.  **Lost the password/alias?**: If this is your first time, click **"Create new..."** in the signing window to make a brand new one. **SAVE THIS FILE AND PASSWORD**—if you lose them, you can never update your app on Google Play again.

**⚠️ Troubleshooting "Android resource compilation failed" (Broken Images)**:
If you see errors like `ic_launcher_round.png: Image not loaded` or `Android resource compilation failed`:
*   **The Fix**: I have already added a "cruncherEnabled = false" patch to your `android/app/build.gradle` which stops Android Studio from being too picky about image formats.
*   **The Action**: In Android Studio, go to **Build** > **Clean Project**, then **Build** > **Rebuild Project**. 
*   **The Nuclear Option (If still failing)**: If it *still* says `Image not loaded` or `Resource compilation failed`:
    1. Right-click the `app` folder in the left sidebar.
    2. Select **New** > **Image Asset**.
    3. For "Path", select ANY valid image file on your computer.
    4. Click **Next** > **Finish**.
    This will regenerate the icon files properly and overwrite the ones causing the error.

## 🚀 Final Google Play Store Checklist
Before you upload to the Play Console, make sure you've done these:
1.  **Change Package Name**: If you don't want `com.malaetech.app`, search and replace it in the entire `android/` folder and `capacitor.config.ts`.
2.  **App Icons**: Replace the icons in `android/app/src/main/res/mipmap-*` with your own. You can use Android Studio's **Image Asset** tool (Right-click `app` folder > New > Image Asset).
3.  **App Signing**: In Android Studio, go to **Build** > **Generate Signed Bundle / APK** to create the `.aab` file for Google Play.
4.  **Version Code**: Every time you upload a NEW version to Google Play, you MUST increase the `versionCode` (e.g., from 1 to 2) in `android/app/build.gradle`.

**⚠️ Troubleshooting "Could not download gradle-8.3.1.jar"**:
If you see an error about failing to download a `.jar` file:
1.  **I have added extra timeout settings** to your `android/gradle.properties` file.
2.  **Ensure your internet is stable.** This part of the process downloads about 100MB of tools.
3.  **In Android Studio**, go to **File** > **Invalidate Caches...**, check all boxes, and click **Invalidate and Restart**.
4.  Once it restarts, click **"Sync Project with Gradle Files"** again.

**⚠️ Troubleshooting "Incompatible AGP Version"**:
If Android Studio says your project uses AGP 8.13 but it only supports 8.3.1:
1.  On your computer, open `malae-tech-final2 / android / build.gradle` in Notepad.
2.  Find the line: `classpath 'com.android.tools.build:gradle:8.13.0'`
3.  **Change it to**: `classpath 'com.android.tools.build:gradle:8.3.1'`
4.  Save the file.
5.  In Android Studio, click the **"Try Again"** or **"Sync Project with Gradle Files"** button.

**⚠️ Troubleshooting "Major Version 69" (Java Error)**:
If you see `Unsupported class file major version 69` in your PowerShell or Android Studio:
*   **The Cause**: Your computer is using Java 25, but Android needs Java 17 or 21.
*   **The Fix**: In Android Studio, go to **File** > **Settings** > **Build, Execution, Deployment** > **Build Tools** > **Gradle**.
*   **The Action**: Change the **Gradle JDK** dropdown to **"Embedded JDK"** or **"jbr-17"**. Click OK and Sync again.

**⚠️ Troubleshooting "Connect timed out"**:
If you see `Connect timed out`, it is because your internet is being too slow for the default limit.
1.  Open `android/gradle/wrapper/gradle-wrapper.properties` in Notepad.
2.  Add/Change this line: `networkTimeout=600000` (10 minutes).
3.  In PowerShell, run: `./gradlew help` (Make sure you are *inside* the `android` folder).

**Once sync is SUCCESSFUL (Green Checkmark)**, the "Generate Signed Bundle" option will appear.

### 🛠️ Troubleshooting: "I forgot my Key Alias!"
If you have the keystore file but forgot the Alias name:
1.  In PowerShell, run:
    ```powershell
    keytool -list -v -keystore ../new_android.keystore
    ```
    *(If it says file not found, try removing the `../` or check your folder!)*
2.  Enter your password when prompted.
3.  Look for the line that says **Alias name: ...**. That is what you type into Android Studio.

### Step 4: Generate the Final AAB
1.  **In Android Studio**, go to **Build** > **Generate Signed Bundle / APK...**. (It will be there now!)
2.  Select **Android App Bundle** and click **Next**.
3.  **Key store path**: Click **Choose existing...** and select the `new_android.keystore` file you created on May 1st.
4.  **Passwords & Alias**:
    *   **Key store password**: Enter your NEW password.
    *   **Key alias**: `android` (unless you changed it).
    *   **Key password**: Enter your NEW password again.
5.  Click **Next**.
6.  Select **release** in the Build Variants.
7.  Click **Finish**.

### Step 5: Upload to Play Store
1.  Once finished, a popup will appear in Android Studio saying "App bundle(s) generated successfully". Click **locate**.
2.  Upload this `.aab` file to your **Internal Testing** or **Production** track in the Google Play Console.
3.  **Success!** The app will now show your AI Studio workspace.

---

## 🛠️ Phase 1: Environment Readiness (Bubblewrap/TWA) - OLD METHOD
*Only use this if you specifically want a web-wrapper and have already deployed your code to your domain.*

1.  **Download & Extract**: Download the latest `.zip` from AI Studio and extract it locally.
2.  **Open Terminal**: Open PowerShell or CMD in the extracted folder.
3.  **Navigate to Root**: 
    **CRITICAL**: You must be in the folder that contains `package.json` and `index.html`.
    Run `dir`. If you see another folder named `Malae-Tech-main`, `cd` into it.

---

## 🚀 Phase 2: Build & Initialize

1.  **Build the Project**:
    Run these commands:
    ```bash
    npm install
    npm run build
    ```
    This creates the `dist` folder.

2.  **Initialize Bubblewrap (The Windows-Proof Way)**:
    Windows often fails with `Invalid protocol "c"`. 

    **Step 0: CLEAN UP (Do this first!)**
    If you had a failed attempt, delete these if they exist in your folder:
    *   Delete the folder `android-project`
    *   Delete the file `twa-manifest.json`

    **Step A: Start a local server**
    In your terminal, run:
    ```bash
    npx serve dist
    ```
    *(Note the PORT number it gives you, e.g., 58323)*

    **Step B: Run Init in a NEW terminal window**
    Open a **second** terminal window in the same folder and run:
    ```bash
    # Replace PORT with yours (e.g., 58323)
    bubblewrap init --manifest http://localhost:PORT/manifest.webmanifest
    ```

    **Step C: Fill the Prompts (FOLLOW THIS EXACTLY)**:
    When Bubblewrap asks these questions, type exactly these values:

    1.  **? Domain**: `malaetech.com`
    2.  **? URL path**: `/`
    3.  **? Application name**: `Malae Tech - Clinical Workspace`
    4.  **? Short name**: `Malae`
    5.  **? Application ID**: `com.malaetech.workspace`
    6.  **? Starting version code**: `1`
    7.  **? Display mode**: `standalone`
    8.  **? Orientation**: `portrait`
    9.  **? Status bar color**: `#AE6965`
    10. **? Splash screen color**: `#FFFFFF`
    11. **? Icon URL**: (Leave as default/Press Enter)
    12. **? Maskable icon URL**: (Leave as default/Press Enter)
    13. **? Monochrome icon URL**: (Leave Blank/Press Enter)
    14. **? Include support for Play Billing?**: `No`
    15. **? Request geolocation permission?**: `No`
    16. **? Key store location**: (Press Enter)
    17. **? Key name**: (Press Enter)

    *Note: Once `init` is done, you can close the `npx serve` terminal.*

## Phase 3: Troubleshooting "Wrong Key" (Play Store Error)
If you get an error saying your App Bundle is signed with the **wrong key** (Fingerprint mismatch), follow these steps:

### Case A: You have the original keystore
1. Locate the `android.keystore` file from your **previous** download/folder.
2. Copy it into your current folder, replacing the current one.
3. Run `bubblewrap build`.

### Case B: You lost the original keystore or password (48-hour wait)
If you don't remember the password or lost the file, you **must** reset the upload key. 

1. **Check your permissions**: Only the **Account Owner** (the email that created the Play Console account) can see the reset button. If you are an "Admin" or "Developer", you might not see it.

2. **Generate the Reset Certificate**:
   Open a terminal in your project folder and run:
   ```bash
   keytool -genkeypair -alias android -keyalg RSA -keysize 2048 -validity 20000 -keystore new_android.keystore
   ```
   *(Enter a NEW password you will remember!)*

3. **Export the .pem file**:
   Run this command (use your new password):
   ```bash
   keytool -export -rfc -alias android -file upload_certificate.pem -keystore new_android.keystore
   ```

4. **Go to Google Play Console**:
   *   Select your app > **Setup** > **App Integrity**.
   *   **SCROLL DOWN** to the bottom of the page.
   *   Look for the **"Upload key"** section (below "App signing key").
   *   Click **Request upload key reset**.

### Case C: If the Reset Button is Still Missing
If you are the owner and the button is missing:
1. Use the [Google Play Console Support Form](https://support.google.com/googleplay/android-developer/contact/key).
2. Select "I have an index related to app signing...".
3. Select "I lost my upload key".
4. Attach the `upload_certificate.pem` file you generated in Step 3.
5. They will reset it for you within 1-2 business days.

### Phase 4: Building with the NEW Key (After 48 Hours)
Once the reset period has passed (May 3rd was your date!):
1.  **Delete** `twa-manifest.json` and the `android-project` folder in your project directory.
2.  **Start your local server** again (`npx serve dist`).
3.  **Run Bubblewrap Init** in a new terminal:
    ```bash
    bubblewrap init --manifest http://localhost:PORT/manifest.webmanifest
    ```
4.  **IMPORTANT**: When asked for `Key store location`, type `new_android.keystore` (the file you made during the reset).
5.  **Password**: Use the **NEW** password you created on May 1st.
6.  Run `bubblewrap build` and upload the resulting `.aab` to Play Console. It should now be accepted!

---

## 🏗️ Phase 3: Signing & Packaging

1.  **Build the Release Bundle**:
    ```bash
    bubblewrap build
    ```
    *   **Key Store**: The first time, it will help you create a `keystore.jks`. 
    *   **IMPORTANT**: Choose a strong password and **STAY ORGANIZED**. You will need this file and password for every single update you send to Google.

2.  **Output**:
    *   Locate `app-release-bundle.aab`. This is the file you upload to the **Google Play Console**.

---

## ⚠️ Common Pitfalls (Windows Fixes)

*   **"cli ERROR Invalid protocol"**: Always use the `npx serve` method above. Do not use local paths like `C:\...`.
*   **"vite not recognized"**: You forgot to run `npm install` in the folder.
*   **"Domain is invalid"**: Do not enter `localhost`. Enter your real domain (e.g., `malaetech.com`).
*   **"Missing index.html"**: Ensure you are in the folder that contains `index.html`.

---

## 🔐 Phase 4: Digital Asset Links

To remove the browser address bar and enable "standalone" mode:
1. Bubblewrap generates an `assetlinks.json`.
2. Upload it to your website: `https://yourdomain.com/.well-known/assetlinks.json`
3. This establishes the "Trust" between your domain and your Android app.

---

## 🏁 Summary Checklist:
- [x] **Web Manifest**: `id` set to `/`, display set to `standalone`.
- [x] **Icons**: 512px and Maskable icons configured.
- [x] **Asset Links**: Package name confirmed as `com.malaetech.workspace`.
- [x] **Service Worker**: PWA support via Workbox is active.
