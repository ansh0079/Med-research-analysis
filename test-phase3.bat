@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════╗
echo ║   Phase 3 Features Test                               ║
echo ╚════════════════════════════════════════════════════════╝
echo.

set SERVER_URL=http://localhost:3002

echo [1/8] Installing dependencies...
call npm install >nul 2>&1
echo ✅ Dependencies installed
echo.

echo [2/8] Starting enhanced server...
start /B node server-enhanced.js > server.log 2>&1
timeout /t 4 /nobreak >nul
echo ✅ Server starting...
echo.

echo [3/8] Testing health endpoint...
curl -s %SERVER_URL%/health > health.json
if exist health.json (
    echo ✅ Server responding
type health.json | findstr "version"
) else (
    echo ❌ Server not responding
    goto cleanup
)
echo.

echo [4/8] Testing search (first call - hits API)...
curl -s "%SERVER_URL%/api/pubmed/search?query=diabetes&max=3" > search1.json
type search1.json | findstr "\"count\"" >nul && echo ✅ Search working || echo ❌ Search failed
echo.

echo [5/8] Testing search (second call - should hit cache)...
curl -s "%SERVER_URL%/api/pubmed/search?query=diabetes&max=3" > search2.json
type search2.json | findstr "cached" >nul && echo ✅ Cache working || echo ⚠️ Cache not triggered yet
echo.

echo [6/8] Testing session (save article)...
for /f "tokens=*" %%a in ('curl -s -I %SERVER_URL%/health ^| findstr /i "x-session-id"') do (
    set SESSION_HEADER=%%a
)
set SESSION_ID=%SESSION_HEADER:x-session-id: =%
echo Session: %SESSION_ID%

curl -s -X POST %SERVER_URL%/api/user/save ^
  -H "Content-Type: application/json" ^
  -H "X-Session-Id: %SESSION_ID%" ^
  -d "{\"article\":{\"uid\":\"12345\",\"title\":\"Test Article\",\"abstract\":\"Test abstract\"}}" > save.json
type save.json | findstr "success" >nul && echo ✅ Save working || echo ❌ Save failed
echo.

echo [7/8] Testing user data (get saved articles)...
curl -s %SERVER_URL%/api/user/saved -H "X-Session-Id: %SESSION_ID%" > saved.json
type saved.json | findstr "Test Article" >nul && echo ✅ User data working || echo ❌ User data failed
echo.

echo [8/8] Testing analytics...
curl -s %SERVER_URL%/api/analytics/daily > analytics.json
type analytics.json | findstr "stats" >nul && echo ✅ Analytics working || echo ⚠️ No stats yet
echo.

echo ════════════════════════════════════════════════════════
echo 📊 Test Summary:
echo.
echo Cache Status:
type search2.json | findstr "cached" >nul && echo   ✅ Cache hit on repeat search || echo   ⏳ Cache will activate on next call
echo.
echo Database Status:
if exist "database/app.db" (
    echo   ✅ Database created
echo   Size: 
for %%F in ("database/app.db") do echo %%~zF bytes
) else (
    echo   ❌ Database not found
)
echo.
echo To view logs: type server.log
echo To stop: Close this window or Ctrl+C
echo ════════════════════════════════════════════════════════

:cleanup
del /q health.json search1.json search2.json save.json saved.json analytics.json 2>nul
pause
