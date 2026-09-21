@echo off
chcp 936 >nul
cd /d "%~dp0"
title Fa Bu Bo Ke - Cappu

echo ============================================
echo             发布 Cappu 手记
echo ============================================
echo.

for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyy-MM-dd_HH-mm"') do set "STAMP=%%i"
for /f %%i in ('git rev-parse --abbrev-ref HEAD') do set "BRANCH=%%i"

set "CHANGED=0"
git add -A
git diff --cached --quiet
if not errorlevel 1 goto push
set "CHANGED=1"

git commit -m "publish: %STAMP%" >nul
if errorlevel 1 goto fail
echo [1/3] 已提交本地改动

:push
echo [2/3] 正在推送到 GitHub ...
git push origin HEAD
if not errorlevel 1 goto done

echo.
echo [提示] 推送被拒绝，可能 GitHub 上还有别处改过的内容，正在尝试先同步 ...
git pull --rebase --autostash origin %BRANCH%
if errorlevel 1 goto fail
git push origin HEAD
if errorlevel 1 goto fail

:done
if "%CHANGED%"=="1" echo [3/3] 推送成功！
if "%CHANGED%"=="0" echo [3/3] 本次没有新的文件改动，线上已是最新内容。
echo.
echo ============================================
echo   等 1 分钟左右，打开： https://yichuanxiang.github.io/
echo   想看部署进度： https://github.com/yichuanxiang/yichuanxiang.github.io/actions
echo ============================================
echo.
pause
exit /b 0

:fail
echo.
echo [失败] 上面有报错信息，把它截图或复制给 AI 看看。
echo.
pause
exit /b 1
