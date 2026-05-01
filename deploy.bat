@echo off
chcp 65001 >nul
echo ============================================
echo  Firmly With Christ — Deploy to Netlify
echo ============================================
echo.

REM Navigate to deploy directory
pushd "%~dp0"

REM Deploy via Netlify CLI (uses existing .netlify/state.json)
npx netlify deploy --prod --dir="."

if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Deploy failed. Check netlify status.
    popd
    exit /b 1
)

echo.
echo ============================================
echo  Deploy complete. Site is live.
echo ============================================
popd
