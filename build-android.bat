@echo off
setlocal enabledelayedexpansion

echo ========================================================
echo         Building Philophais Android Release APK
echo ========================================================
echo.

cd /d "%~dp0"

set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
set "PATH=%JAVA_HOME%\bin;%PATH%"
set "ANDROID_HOME=C:\Users\monty\AppData\Local\Android\Sdk"
set "NDK_HOME=C:\Users\monty\AppData\Local\Android\Sdk\ndk\27.0.12077973"

if not exist "%JAVA_HOME%\bin\javac.exe" (
    echo [WARN] Java not found at %JAVA_HOME%, using system Java...
)

echo [1/3] Building Web Frontend (Vite + TypeScript)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Web build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Building Tauri Android Release APK...
if exist "src-tauri\gen\android\gradlew.bat" (
    call "src-tauri\gen\android\gradlew.bat" --project-dir "src-tauri\gen\android" --stop >nul 2>&1
)
if exist "src-tauri\gen\android\buildSrc\build" (
    rd /s /q "src-tauri\gen\android\buildSrc\build" >nul 2>&1
)
if exist "src-tauri\gen\android\app\build" (
    rd /s /q "src-tauri\gen\android\app\build" >nul 2>&1
)

call npx tauri android build --apk
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Tauri Android build failed!
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Signing APK with Android Debug Keystore...
set APKSIGNER="C:\Users\monty\AppData\Local\Android\Sdk\build-tools\34.0.0\apksigner.bat"
set KEYSTORE="C:\Users\monty\.android\debug.keystore"
set UNSIGNED="src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release-unsigned.apk"
set SIGNED_DEFAULT="src-tauri\gen\android\app\build\outputs\apk\universal\release\app-universal-release.apk"
set APK_DEST="philophais.apk"

if not exist %APKSIGNER% (
    for /f "delims=" %%i in ('dir /s /b "C:\Users\monty\AppData\Local\Android\Sdk\build-tools\*apksigner.bat" 2^>nul') do (
        set APKSIGNER="%%i"
    )
)

if exist %UNSIGNED% (
    echo Signing %UNSIGNED%...
    call %APKSIGNER% sign --ks %KEYSTORE% --ks-pass pass:android --key-pass pass:android --out %APK_DEST% %UNSIGNED%
) else if exist %SIGNED_DEFAULT% (
    copy /y %SIGNED_DEFAULT% %APK_DEST% >nul
) else (
    for /f "delims=" %%a in ('dir /s /b "src-tauri\gen\android\app\build\outputs\apk\*.apk" 2^>nul') do (
        copy /y "%%a" %APK_DEST% >nul
        goto :copied
    )
)

:copied
if exist %APK_DEST% (
    echo.
    echo ========================================================
    echo   SUCCESS: philophais.apk successfully built and signed!
    echo   Output: %~dp0%APK_DEST%
    echo ========================================================
    echo.
    
    echo Checking for connected Android devices via adb...
    for /f "skip=1 tokens=1" %%i in ('"%ANDROID_HOME%\platform-tools\adb.exe" devices') do (
        if not "%%i"=="" (
            echo Found connected device: %%i. Installing APK...
            "%ANDROID_HOME%\platform-tools\adb.exe" install -r %APK_DEST%
            echo Done! Launching Philophais on device...
            "%ANDROID_HOME%\platform-tools\adb.exe" shell am start -n com.philophais.app/.MainActivity
            goto :done
        )
    )
    echo No active device detected via adb. Connect your Android device via USB/Wi-Fi to auto-install.
) else (
    echo [ERROR] Could not find or produce signed APK!
    exit /b 1
)

:done
echo.
