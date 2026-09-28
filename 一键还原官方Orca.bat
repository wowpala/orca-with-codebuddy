@echo off
chcp 65001 >nul
setlocal
title Orca 官方原版 - 一键还原

set "RES=%LOCALAPPDATA%\Programs\orca\resources"

echo ============================================
echo   Orca 官方原版 - 一键还原
echo   目标：%RES%
echo ============================================
echo.

if not exist "%RES%\app.asar.orca-official.bak" (
    echo [提示] 未找到备份文件 app.asar.orca-official.bak。
    echo 可能当前本来就是官方原版（未打过补丁），或备份已被删除。
    pause
    exit /b 0
)

tasklist /FI "IMAGENAME eq orca.exe" 2>nul | find /I "orca.exe" >nul
if not errorlevel 1 (
    echo [错误] 检测到 Orca 正在运行。
    echo 请完全退出 Orca（包括托盘图标）后重新运行本脚本。
    pause
    exit /b 1
)

echo 即将删除补丁文件，并把官方原版备份还原回去。
choice /C YN /M "确认还原"
if errorlevel 2 exit /b 0

echo.
echo [1/2] 还原 app.asar ...
del /F /Q "%RES%\app.asar" 2>nul
move /Y "%RES%\app.asar.orca-official.bak" "%RES%\app.asar" >nul
if errorlevel 1 (
    echo [错误] 还原 app.asar 失败。
    pause
    exit /b 1
)

echo [2/2] 还原 app.asar.unpacked ...
if exist "%RES%\app.asar.unpacked.orca-official.bak" (
    rmdir /S /Q "%RES%\app.asar.unpacked"
    move "%RES%\app.asar.unpacked.orca-official.bak" "%RES%\app.asar.unpacked" >nul
    if errorlevel 1 (
        echo [错误] 还原 app.asar.unpacked 失败。
        echo app.asar 已还原，请手动处理 %RES% 下的备份文件夹。
        pause
        exit /b 1
    )
)

echo.
echo ============================================
echo   [成功] 已还原官方原版。
echo   启动 Orca 即可正常使用。
echo ============================================
pause
