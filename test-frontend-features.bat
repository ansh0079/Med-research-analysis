@echo off
chcp 65001 >nul
echo ╔════════════════════════════════════════════════════════╗
echo ║   Frontend Features Test v3.0                          ║
echo ╚════════════════════════════════════════════════════════╝
echo.

echo [1/5] Checking dependencies...
npm list express sqlite3 node-cache >nul 2>&1
if errorlevel 1 (
    echo Installing dependencies...
    npm install
) else (
    echo ✅ Dependencies ready
)
echo.

echo [2/5] Starting enhanced server...
start /B node server-enhanced.js > server.log 2>&1
timeout /t 4 /nobreak >nul
echo ✅ Server started
echo.

echo [3/5] Verifying endpoints...
curl -s http://localhost:3002/health | findstr "3.0.0" >nul && echo ✅ Server v3.0 responding || echo ⚠️ Server may still be starting
echo.

echo [4/5] Opening application...
echo.
echo ════════════════════════════════════════════════════════
echo 📱 FEATURES TO TEST:
echo.
echo 1. 🔍 Search for articles (try: "diabetes treatment")
echo 2. 📚 Click "Saved (0)" button —^> Save an article
    echo 3. ⏱️  Click "History" button —^> View search history
    echo 4. 📊 Click "Analytics" button —^> View statistics
    echo 5. 🔁 Search same query twice —^> Notice speed increase
    echo.
    echo ════════════════════════════════════════════════════════
    echo.
    
    start http://localhost:3002
    echo Opening browser...
    echo.
    
    echo [5/5] Ready! Check your browser.
    echo.
    echo To view logs: type server.log
    echo To stop: Close this window
echo ════════════════════════════════════════════════════════
    echo.
    pause
