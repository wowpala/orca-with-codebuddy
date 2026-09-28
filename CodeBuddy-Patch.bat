@echo off
setlocal
title CodeBuddy Patch for Orca

rem Script dir (trailing backslash). app.asar and app.asar.unpacked\ must sit next to this file.
set "SRC=%~dp0"
set "RES=%LOCALAPPDATA%\Programs\orca\resources"

echo ============================================
echo   CodeBuddy Patch for Orca
echo   Target: %RES%
echo ============================================
echo.
echo   [1] Install CodeBuddy patch
echo   [2] Restore official Orca
echo   [0] Exit
echo.
choice /C 120 /N /M "Select an option: "
if errorlevel 3 goto done
if errorlevel 2 goto restore
goto install

:check-orca-running
rem Returns errorlevel 1 (after printing the error) when Orca is running.
tasklist /FI "IMAGENAME eq orca.exe" 2>nul | findstr /I "orca.exe" >nul
if errorlevel 1 exit /b 0
echo [ERROR] Orca is running.
echo Quit Orca completely, including the tray icon, then run this script again.
exit /b 1

:install
call :check-orca-running
if errorlevel 1 goto done
if not exist "%SRC%app.asar" (
    echo [ERROR] app.asar not found next to this script.
    echo Keep this script in the same folder as the patch files and run it again.
    goto done
)
if not exist "%SRC%app.asar.unpacked\" (
    echo [ERROR] app.asar.unpacked folder not found next to this script.
    goto done
)
if not exist "%RES%\app.asar" (
    echo [ERROR] Installed Orca not found at:
    echo   %RES%\app.asar
    echo Install Orca first, or edit RES at the top of this script.
    goto done
)

echo.
echo The official files are backed up on first install as:
echo   app.asar.orca-official.bak
echo   app.asar.unpacked.orca-official.bak
echo The backup is never overwritten by later installs, so you can always
echo restore the official build with option [2].
echo.
choice /C YN /M "Install the patch"
if errorlevel 2 goto done

echo.
echo [1/3] Backing up and replacing app.asar ...
if exist "%RES%\app.asar.orca-official.bak" (
    del /F /Q "%RES%\app.asar" >nul 2>&1
) else (
    move /Y "%RES%\app.asar" "%RES%\app.asar.orca-official.bak" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to back up app.asar.
        goto done
    )
)
copy /Y "%SRC%app.asar" "%RES%\app.asar" >nul
if errorlevel 1 (
    echo [ERROR] Failed to copy app.asar.
    goto done
)

echo [2/3] Backing up and replacing app.asar.unpacked ...
if exist "%RES%\app.asar.unpacked.orca-official.bak\" (
    rmdir /S /Q "%RES%\app.asar.unpacked" >nul 2>&1
) else (
    move /Y "%RES%\app.asar.unpacked" "%RES%\app.asar.unpacked.orca-official.bak" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to back up app.asar.unpacked.
        echo app.asar is already patched. Fix the backup above and run option [1] again.
        goto done
    )
)
robocopy "%SRC%app.asar.unpacked" "%RES%\app.asar.unpacked" /E /NFL /NDL /NJH /NJS /NP >nul
if errorlevel 8 (
    echo [ERROR] Failed to copy app.asar.unpacked. Robocopy exit code: %errorlevel%
    goto done
)

echo [3/3] Done.
echo.
echo ============================================
echo   [OK] CodeBuddy patch installed.
echo   Start Orca and verify:
echo     - Settings lists a CodeBuddy agent
echo     - The AI Vault session history lists CodeBuddy sessions
echo   To go back to the official build, run this script
echo   again and choose option [2].
echo ============================================
goto done

:restore
call :check-orca-running
if errorlevel 1 goto done
if not exist "%RES%\app.asar.orca-official.bak" (
    echo [INFO] No backup found: app.asar.orca-official.bak
    echo Orca is probably already the official build, or the backup was deleted.
    goto done
)

echo.
choice /C YN /M "Restore the official Orca files"
if errorlevel 2 goto done

echo.
echo [1/2] Restoring app.asar ...
move /Y "%RES%\app.asar.orca-official.bak" "%RES%\app.asar" >nul
if errorlevel 1 (
    echo [ERROR] Failed to restore app.asar.
    goto done
)

echo [2/2] Restoring app.asar.unpacked ...
if exist "%RES%\app.asar.unpacked.orca-official.bak\" (
    rmdir /S /Q "%RES%\app.asar.unpacked" >nul 2>&1
    move /Y "%RES%\app.asar.unpacked.orca-official.bak" "%RES%\app.asar.unpacked" >nul
    if errorlevel 1 (
        echo [ERROR] Failed to restore app.asar.unpacked.
        echo app.asar is already restored; handle the backup folder manually at:
        echo   %RES%\app.asar.unpacked.orca-official.bak
        goto done
    )
)

echo.
echo ============================================
echo   [OK] Official Orca restored.
echo   Start Orca to keep using it as before.
echo ============================================
goto done

:done
echo.
echo Press any key to close this window...
pause >nul
endlocal
exit /b 0
