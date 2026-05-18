@echo off
setlocal

set "DIR=%~dp0"

echo.
echo  Node: & node --version
echo  npm:  & npm --version
echo.

rem ── ABI guard ─────────────────────────────────────────────────────────────
rem  Checks better-sqlite3 before every start and auto-downloads the right
rem  prebuilt binary if the Node version has changed.

node -e "try { require('./node_modules/better-sqlite3'); process.exit(0); } catch(e) { process.exit(1); }" 2>nul
if errorlevel 1 (
    echo  [!] better-sqlite3 ABI mismatch - downloading prebuilt...
    for /f %%A in ('node -e "process.stdout.write(process.versions.modules)"') do set "ABI=%%A"
    set "VER=12.9.0"
    set "TMPFILE=%TEMP%\bsqlite3.tar.gz"
    set "RELEASE=%DIR%node_modules\better-sqlite3\build\Release"
    if not exist "%RELEASE%" mkdir "%RELEASE%"
    powershell -NoProfile -Command "Invoke-WebRequest -Uri 'https://github.com/WiseLibs/better-sqlite3/releases/download/v!VER!/better-sqlite3-v!VER!-node-v!ABI!-win32-x64.tar.gz' -OutFile '!TMPFILE!' -UseBasicParsing"
    tar -xzf "!TMPFILE!" -C "!RELEASE!" --strip-components=2
    node -e "require('./node_modules/better-sqlite3'); console.log(' [+] fixed');"
) else (
    echo  [+] better-sqlite3 OK
)

echo.
echo  Starting servers...
echo ─────────────────────────────────────────────────────────────────────────
npm run dev
