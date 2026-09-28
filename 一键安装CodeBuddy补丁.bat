@echo off
chcp 65001 >nul
setlocal
title Orca CodeBuddy 补丁 - 一键安装

set "SRC=%~dp0"
set "RES=%LOCALAPPDATA%\Programs\orca\resources"

echo ============================================
echo   Orca CodeBuddy 补丁 - 一键安装
echo   目标：%RES%
echo ============================================
echo.

if not exist "%SRC%app.asar" (
    echo [错误] 当前目录找不到 app.asar。
    echo 请把本脚本和补丁文件（app.asar、app.asar.unpacked 文件夹）放在同一目录。
    pause
    exit /b 1
)
if not exist "%SRC%app.asar.unpacked" (
    echo [错误] 当前目录找不到 app.asar.unpacked 文件夹。
    echo 请把本脚本和补丁文件放在同一目录。
    pause
    exit /b 1
)
if not exist "%RES%\app.asar" (
    echo [错误] 未找到已安装的 Orca：
    echo   %RES%\app.asar
    echo 请确认 Orca 已安装在默认位置。
    pause
    exit /b 1
)

tasklist /FI "IMAGENAME eq orca.exe" 2>nul | find /I "orca.exe" >nul
if not errorlevel 1 (
    echo [错误] 检测到 Orca 正在运行。
    echo 请完全退出 Orca（包括托盘图标）后重新运行本脚本。
    echo 注意：正在运行的 agent 会话请先等待完成或手动保存。
    pause
    exit /b 1
)

echo 首次安装会自动备份官方原版为：
echo   app.asar.orca-official.bak / app.asar.unpacked.orca-official.bak
echo （重复安装不会覆盖该备份，随时可完美还原。）
echo.
choice /C YN /M "确认安装补丁"
if errorlevel 2 exit /b 0

echo.
echo [1/3] 备份并替换 app.asar ...
if not exist "%RES%\app.asar.orca-official.bak" (
    move /Y "%RES%\app.asar" "%RES%\app.asar.orca-official.bak" >nul
) else (
    del /F /Q "%RES%\app.asar"
)
copy /Y "%SRC%app.asar" "%RES%\app.asar" >nul
if errorlevel 1 (
    echo [错误] 复制 app.asar 失败。
    pause
    exit /b 1
)

echo [2/3] 备份并替换 app.asar.unpacked ...
if not exist "%RES%\app.asar.unpacked.orca-official.bak" (
    move "%RES%\app.asar.unpacked" "%RES%\app.asar.unpacked.orca-official.bak" >nul
) else (
    rmdir /S /Q "%RES%\app.asar.unpacked"
)
robocopy "%SRC%app.asar.unpacked" "%RES%\app.asar.unpacked" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
    echo [错误] 复制 app.asar.unpacked 失败（robocopy 退出码 %errorlevel%）。
    pause
    exit /b 1
)

echo [3/3] 完成。
echo.
echo ============================================
echo   [成功] CodeBuddy 补丁已安装。
echo   请启动 Orca 验证：
echo     - 设置里出现 CodeBuddy agent
echo     - 右侧 AI Vault 会话历史出现 CodeBuddy 会话
echo.
echo   如需还原官方原版，运行：一键还原官方Orca.bat
echo ============================================
pause
