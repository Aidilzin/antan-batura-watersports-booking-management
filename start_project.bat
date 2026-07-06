@echo off
setlocal EnableDelayedExpansion
title Antan Batura — Start Project
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Antan Batura Watersports Booking System        ║
echo  ║   Starting servers...                            ║
echo  ╚══════════════════════════════════════════════════╝
echo.

set "ROOT=%~dp0"
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

:: ── Locate PHP ──────────────────────────────────────
set "PHP_BIN="
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" set "PHP_BIN=%%D\php.exe"
)
if not defined PHP_BIN (
    where php >nul 2>nul
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%P in ('where php 2^>nul') do (
            if not defined PHP_BIN set "PHP_BIN=%%P"
        )
    )
)
if not defined PHP_BIN (
    echo  [!] PHP not found. Run setup_and_run.bat first.
    pause & exit /b 1
)
echo      PHP: %PHP_BIN%

:: ── Check MySQL (all bind addresses) ────────────────
set "MYSQL_UP=0"
for /f "tokens=*" %%L in ('netstat -ano 2^>nul ^| findstr ":3306 "') do (
    echo %%L | findstr /i "LISTENING" >nul
    if !errorlevel! equ 0 set "MYSQL_UP=1"
)
if !MYSQL_UP! equ 0 (
    echo      MySQL not running — trying to start...
    set "MYSQLD="
    for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do (
        if exist "%%D\bin\mysqld.exe" set "MYSQLD=%%D\bin\mysqld.exe"
    )
    if defined MYSQLD (
        set "MYINI="
        for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do (
            if exist "%%D\my.ini" set "MYINI=%%D\my.ini"
        )
        if defined MYINI (
            start /b "" "!MYSQLD!" --defaults-file="!MYINI!"
        ) else (
            start /b "" "!MYSQLD!"
        )
        timeout /t 5 /nobreak >nul
    ) else (
        net start MySQL >nul 2>nul
        if !errorlevel! neq 0 net start MySQL80 >nul 2>nul
        timeout /t 4 /nobreak >nul
    )
)

:: ── Launch servers ───────────────────────────────────
start "Antan Batura — Laravel API" cmd /k "cd /d "%BACKEND%" && "%PHP_BIN%" artisan serve"
start "Antan Batura — Vite Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

timeout /t 4 /nobreak >nul

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Running!                                       ║
echo  ║   Customer:  http://localhost:5173               ║
echo  ║   Login:     http://localhost:5173/login         ║
echo  ║   Keep both terminal windows open.               ║
echo  ╚══════════════════════════════════════════════════╝
echo.

start http://localhost:5173
pause
