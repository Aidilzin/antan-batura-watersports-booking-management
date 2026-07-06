@echo off
setlocal EnableDelayedExpansion
title Antan Batura — Full Automated Setup ^& Launch
color 0A

echo.
echo  ╔══════════════════════════════════════════════════╗
echo  ║   Antan Batura Watersports Booking System        ║
echo  ║   Full Automated Setup and Launch                ║
echo  ╚══════════════════════════════════════════════════╝
echo.

:: ─────────────────────────────────────────────────────
:: STEP 0 — Resolve script root (handles spaces in path)
:: ─────────────────────────────────────────────────────
set "ROOT=%~dp0"
:: Remove trailing backslash
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"

:: ─────────────────────────────────────────────────────
:: STEP 1 — Locate PHP (Laragon first, then system PATH)
:: ─────────────────────────────────────────────────────
echo [1/7] Detecting PHP...
set "PHP_BIN="

:: Try every Laragon PHP version folder (newest wins last in loop)
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" set "PHP_BIN=%%D\php.exe"
)

:: Fallback: system PATH
if not defined PHP_BIN (
    where php >nul 2>nul
    if !errorlevel! equ 0 (
        for /f "tokens=*" %%P in ('where php') do (
            if not defined PHP_BIN set "PHP_BIN=%%P"
        )
    )
)

if not defined PHP_BIN (
    echo  [!] PHP was not found. Laragon must be installed to provide PHP.
    echo      Download Laragon from: https://laragon.org/download/
    echo.
    pause
    exit /b 1
)
echo      Found PHP: %PHP_BIN%
echo.

:: ─────────────────────────────────────────────────────
:: STEP 2 — Locate or auto-install Node.js
:: ─────────────────────────────────────────────────────
echo [2/7] Detecting Node.js / npm...
set "NPM_OK=0"
where npm >nul 2>nul
if !errorlevel! equ 0 set "NPM_OK=1"

if !NPM_OK! equ 0 (
    echo      Node.js not found. Downloading installer from nodejs.org...
    powershell -NoProfile -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; ^
         Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' ^
         -OutFile '%TEMP%\node_installer.msi'" 2>nul
    if exist "%TEMP%\node_installer.msi" (
        echo      Installing Node.js silently — please accept any UAC prompt...
        start /wait msiexec /i "%TEMP%\node_installer.msi" /passive /norestart
        del "%TEMP%\node_installer.msi" >nul 2>nul
        :: Inject default install path for this session
        set "PATH=C:\Program Files\nodejs\;%PATH%"
        where npm >nul 2>nul
        if !errorlevel! equ 0 (
            echo      Node.js installed successfully.
        ) else (
            echo  [!] Node.js install completed but npm is still not on PATH.
            echo      Please reboot and run this script again.
            pause
            exit /b 1
        )
    ) else (
        echo  [!] Download failed. Check your internet connection.
        pause
        exit /b 1
    )
) else (
    for /f "tokens=*" %%V in ('node --version 2^>nul') do echo      Found Node.js %%V
)
echo.

:: ─────────────────────────────────────────────────────
:: STEP 3 — Locate or download Composer
:: ─────────────────────────────────────────────────────
echo [3/7] Detecting Composer...
set "COMPOSER_CMD="

:: Priority 1: Laragon bundled composer
if exist "C:\laragon\bin\composer\composer.bat" (
    set "COMPOSER_CMD=C:\laragon\bin\composer\composer.bat"
)

:: Priority 2: system PATH
if not defined COMPOSER_CMD (
    where composer >nul 2>nul
    if !errorlevel! equ 0 set "COMPOSER_CMD=composer"
)

:: Priority 3: local composer.phar next to backend
if not defined COMPOSER_CMD (
    if exist "%BACKEND%\composer.phar" (
        set "COMPOSER_CMD=%PHP_BIN%" "%BACKEND%\composer.phar"
    )
)

:: Priority 4: download composer.phar locally
if not defined COMPOSER_CMD (
    echo      Composer not found. Downloading composer.phar...
    powershell -NoProfile -Command ^
        "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; ^
         Invoke-WebRequest -Uri 'https://getcomposer.org/composer.phar' ^
         -OutFile '%BACKEND%\composer.phar'" 2>nul
    if exist "%BACKEND%\composer.phar" (
        set "COMPOSER_CMD="%PHP_BIN%" "%BACKEND%\composer.phar""
        echo      Downloaded composer.phar successfully.
    ) else (
        echo  [!] Could not obtain Composer. Check your internet connection.
        pause
        exit /b 1
    )
)
echo      Composer ready: %COMPOSER_CMD%
echo.

:: ─────────────────────────────────────────────────────
:: STEP 4 — Ensure MySQL is running (auto-start if possible)
:: ─────────────────────────────────────────────────────
echo [4/7] Checking MySQL on port 3306...

:: Detect MySQL port across all bind addresses (0.0.0.0, 127.0.0.1, :::)
set "MYSQL_UP=0"
for /f "tokens=*" %%L in ('netstat -ano 2^>nul ^| findstr ":3306 "') do (
    echo %%L | findstr /i "LISTENING" >nul
    if !errorlevel! equ 0 set "MYSQL_UP=1"
)

if !MYSQL_UP! equ 0 (
    echo      MySQL not detected. Attempting to start Laragon's MySQL...

    :: Strategy A: Laragon's mysqld binary
    set "MYSQLD="
    for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do (
        if exist "%%D\bin\mysqld.exe" set "MYSQLD=%%D\bin\mysqld.exe"
    )

    if defined MYSQLD (
        :: Find my.ini
        set "MYINI="
        for /d %%D in ("C:\laragon\bin\mysql\mysql-*") do (
            if exist "%%D\my.ini" set "MYINI=%%D\my.ini"
        )
        if defined MYINI (
            echo      Starting mysqld with config: !MYINI!
            start /b "" "!MYSQLD!" --defaults-file="!MYINI!"
        ) else (
            echo      Starting mysqld with default options...
            start /b "" "!MYSQLD!"
        )
        :: Give MySQL time to boot
        echo      Waiting for MySQL to start...
        timeout /t 6 /nobreak >nul
    ) else (
        :: Strategy B: net start (if MySQL is installed as a Windows Service)
        net start MySQL >nul 2>nul
        if !errorlevel! neq 0 net start MySQL80 >nul 2>nul
        if !errorlevel! neq 0 net start MySQL84 >nul 2>nul
        timeout /t 4 /nobreak >nul
    )

    :: Re-check port after attempted start
    set "MYSQL_UP=0"
    for /f "tokens=*" %%L in ('netstat -ano 2^>nul ^| findstr ":3306 "') do (
        echo %%L | findstr /i "LISTENING" >nul
        if !errorlevel! equ 0 set "MYSQL_UP=1"
    )

    if !MYSQL_UP! equ 0 (
        echo.
        echo  ╔══════════════════════════════════════════════════╗
        echo  ║  MySQL is still not running on port 3306.        ║
        echo  ║                                                  ║
        echo  ║  Please open Laragon and click "Start All",      ║
        echo  ║  then press any key here to continue.            ║
        echo  ╚══════════════════════════════════════════════════╝
        pause
        :: Final check
        set "MYSQL_UP=0"
        for /f "tokens=*" %%L in ('netstat -ano 2^>nul ^| findstr ":3306 "') do (
            echo %%L | findstr /i "LISTENING" >nul
            if !errorlevel! equ 0 set "MYSQL_UP=1"
        )
        if !MYSQL_UP! equ 0 (
            echo  [!] MySQL still not running. Cannot continue.
            pause
            exit /b 1
        )
    )
)
echo      MySQL is running.
echo.

:: ─────────────────────────────────────────────────────
:: STEP 5 — Prepare backend .env and database
:: ─────────────────────────────────────────────────────
echo [5/7] Configuring backend environment...

if not exist "%BACKEND%\.env" (
    echo      Creating .env from .env.example...
    copy "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
)

:: Patch .env to use MySQL (overwrite any SQLite default)
powershell -NoProfile -Command ^
    "$f = '%BACKEND%\.env'; $c = Get-Content $f -Raw; ^
     $c = $c -replace 'DB_CONNECTION=.*', 'DB_CONNECTION=mysql'; ^
     $c = $c -replace '#?\s*DB_HOST=.*', 'DB_HOST=127.0.0.1'; ^
     $c = $c -replace '#?\s*DB_PORT=.*', 'DB_PORT=3306'; ^
     $c = $c -replace '#?\s*DB_DATABASE=.*', 'DB_DATABASE=antan_batura'; ^
     $c = $c -replace '#?\s*DB_USERNAME=.*', 'DB_USERNAME=root'; ^
     $c = $c -replace '#?\s*DB_PASSWORD=.*', 'DB_PASSWORD='; ^
     Set-Content $f $c -NoNewline" 2>nul

:: Create DB schema via PHP PDO
"%PHP_BIN%" -r "try { $p = new PDO('mysql:host=127.0.0.1;port=3306', 'root', ''); $p->exec('CREATE DATABASE IF NOT EXISTS antan_batura CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'); echo \"Database 'antan_batura' ready.\n\"; } catch(Exception $e){ echo 'DB Error: '.$e->getMessage().\"\\n\"; }" 2>nul

:: Install Composer dependencies if needed
if not exist "%BACKEND%\vendor" (
    echo      Installing PHP/Composer dependencies (first-time, may take a minute)...
    cd /d "%BACKEND%"
    call %COMPOSER_CMD% install --no-interaction --prefer-dist
    if !errorlevel! neq 0 (
        echo      Retrying with --ignore-platform-reqs...
        call %COMPOSER_CMD% install --no-interaction --prefer-dist --ignore-platform-reqs
    )
    cd /d "%ROOT%"
) else (
    echo      Composer vendor already present, skipping install.
)

:: Generate app key and migrate
cd /d "%BACKEND%"
"%PHP_BIN%" artisan key:generate --force >nul 2>&1
echo      Running database migrations and seeding...
"%PHP_BIN%" artisan migrate:fresh --seed --force
cd /d "%ROOT%"
echo.

:: ─────────────────────────────────────────────────────
:: STEP 6 — Install npm dependencies for frontend
:: ─────────────────────────────────────────────────────
echo [6/7] Checking frontend dependencies...
if not exist "%FRONTEND%\node_modules" (
    echo      Installing npm packages (first-time, may take a minute)...
    cd /d "%FRONTEND%"
    call npm install
    cd /d "%ROOT%"
) else (
    echo      node_modules already present, skipping install.
)
echo.

:: ─────────────────────────────────────────────────────
:: STEP 7 — Launch servers and open browser
:: ─────────────────────────────────────────────────────
echo [7/7] Launching application servers...
echo.

:: Laravel API server
start "Antan Batura — Laravel API" cmd /k "cd /d "%BACKEND%" && "%PHP_BIN%" artisan serve"

:: Vite dev server
start "Antan Batura — Vite Frontend" cmd /k "cd /d "%FRONTEND%" && npm run dev"

:: Wait for servers to boot
timeout /t 4 /nobreak >nul

echo  ╔══════════════════════════════════════════════════╗
echo  ║   All systems ready!                             ║
echo  ║                                                  ║
echo  ║   Customer Page:  http://localhost:5173          ║
echo  ║   Staff Login:    http://localhost:5173/login    ║
echo  ║   Admin Login:    http://localhost:5173/login    ║
echo  ║   Laravel API:    http://localhost:8000          ║
echo  ║                                                  ║
echo  ║   Default credentials:                           ║
echo  ║     admin@antanbatura.test / password123         ║
echo  ║     staff@antanbatura.test / password123         ║
echo  ║                                                  ║
echo  ║   Keep both terminal windows open!               ║
echo  ╚══════════════════════════════════════════════════╝
echo.

start http://localhost:5173
pause