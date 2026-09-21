@echo off
chcp 936 >nul
cd /d "%~dp0"
title Ben Di Yu Lan - Cappu

set "HUGO=%~dp0..\.tools\hugo-0.160.1\bin\hugo.exe"
if not exist "%HUGO%" set "HUGO=hugo"

echo ============================================
echo        本地预览（草稿也会显示）
echo ============================================
echo   地址： http://localhost:1313/
echo   打开浏览器访问它就能看到效果。
echo   改完文章保存一下，浏览器会自动刷新。
echo   看完回到这个窗口，按 Ctrl+C 或直接关掉窗口即可。
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:1313/'"

"%HUGO%" server -D --disableFastRender --navigateToChanged
pause
