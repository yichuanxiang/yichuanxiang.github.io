@echo off
chcp 936 >nul
cd /d "%~dp0"
title New Post - Cappu
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0new-post.ps1"
if errorlevel 1 pause
exit /b 0
