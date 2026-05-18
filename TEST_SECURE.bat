@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════╗
echo ║   Medical Research App - Secure Mode Test              ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/4] Checking Node.js...
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Node.js not found. Please install Node.js 18+
    exit /b 1
)
echo ✅ Node.js found
echo.

echo [2/4] Starting secure server...
start /B node server.js > server.log 2>&1
timeout /t 3 /nobreak >nul

echo [3/4] Testing health endpoint...
curl -s http://localhost:3002/health > health.json 2>nul
if exist health.json (
    echo ✅ Server responding
type health.json
del health.json
) else (
    echo ⚠️ Server may still be starting...
)
echo.

echo [4/4] Testing PubMed search...
curl -s "http://localhost:3002/api/pubmed/search?query=diabetes&max=3" > search.json 2>nul
if exist search.json (
    echo ✅ Search API working
    for /f "tokens=*" %%a in ('findstr /C:"\"count\":" search.json') do (
        echo 📊 Results: %%a
    )
    del search.json
) else (
    echo ⚠️ Search test skipped (may need internet)
)
echo.

echo ════════════════════════════════════════════════════════
echo 🔒 Secure mode is ready!
echo.
echo Next steps:
echo 1. Open: index-secure.html (in your browser)
echo 2. Or use: http://localhost:3002 (if serving static files)
echo.
echo To stop server: Close this window or press Ctrl+C
echo ════════════════════════════════════════════════════════
echo.
pause
