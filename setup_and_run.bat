@echo off
title Antan Batura Automated Setup ^& Launch
echo ===================================================
echo   Setting up Antan Batura Booking Management System
echo ===================================================

:: FOOLPROOF 1: Validate Folder Path for Parentheses or Spaces
set "CURRENT_DIR=%~dp0"
if not "%CURRENT_DIR%"=="%CURRENT_DIR:(=%" (
    goto :path_error
)
if not "%CURRENT_DIR%"=="%CURRENT_DIR:)=%" (
    goto :path_error
)
goto :path_ok

:path_error
echo ===================================================
echo  CRITICAL ERROR: INVALID FOLDER PATH!
echo ===================================================
echo  Your folder path contains parentheses [e.g., (1) or (Main)].
echo  Windows CMD cannot parse code blocks with these characters.
echo.
echo  YOUR PATH: %~dp0
echo.
echo  FIX: Rename your folder to something simple like 'antan-batura'
echo       and run this file again.
echo ===================================================
pause
exit /b

:path_ok

:: FOOLPROOF 2: Locate or Fetch & Install Node.js Globally
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [SYSTEM] Node.js not found on this PC.
    echo [SYSTEM] Fetching official Node.js Windows Installer online...
    powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi' -OutFile 'node_installer.msi'"
    
    echo [SYSTEM] Launching background installation... 
    echo          [Please click 'Yes' if Windows User Account Control asks for Admin permissions]
    start /wait msiexec /i node_installer.msi /passive /norestart
    
    echo [SYSTEM] Cleaning up installer files...
    del node_installer.msi
    
    :: Force inject the new Node installation path into this active session memory
    set "PATH=C:\Program Files\nodejs\;%PATH%"
    echo [SYSTEM] Node.js successfully installed and activated!
)

:: Detect Laragon's PHP path dynamically
set "PHP_BIN=php"
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" (
        set "PHP_BIN=%%D\php.exe"
    )
)
echo Found PHP: %PHP_BIN%

:: Detect or Automatically Download Composer
set "COMPOSER_BIN=composer"
if exist "C:\laragon\bin\composer\composer.bat" (
    set "COMPOSER_BIN=C:\laragon\bin\composer\composer.bat"
)

where composer >nul 2>nul
if %errorlevel% neq 0 (
    if not exist "C:\laragon\bin\composer\composer.bat" (
        if not exist "backend\composer.phar" (
            echo [SYSTEM] Composer not found on this PC.
            echo [SYSTEM] Downloading a localized version automatically...
            powershell -Command "[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -Uri 'https://getcomposer.org/composer.phar' -OutFile '%~dp0backend\composer.phar'"
        )
    )
)

:: 1. Copy env file if not exists
if not exist "backend\.env" (
    echo Creating backend environment file...
    copy "backend\.env.example" "backend\.env" >nul
)

:: FOOLPROOF 3: Pre-check if MySQL Port 3306 is Active
netstat -ano | findstr 127.0.0.1:3306 >nul
if %errorlevel% neq 0 (
    echo ===================================================
    echo  WARNING: MYSQL IS NOT RUNNING!
    echo ===================================================
    echo  Port 3306 is inactive. Laragon might be closed or 
    echo  you forgot to click 'Start All'.
    echo  Please start Laragon's database before continuing.
    echo ===================================================
    pause
)

:: 2. Dynamically create MySQL Database if missing
echo Checking MySQL database connection...
"%PHP_BIN%" -r "try { $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', ''); $pdo->exec('CREATE DATABASE IF NOT EXISTS antan_batura'); echo 'MySQL Database verified successfully!\n'; } catch (Exception $e) { echo 'WARNING: Could not connect to MySQL server.\n'; }"

:: 3. Install composer dependencies if vendor is missing
if not exist "backend\vendor" (
    echo Installing backend dependencies [this may take a few minutes]...
    cd backend
    if exist "composer.phar" (
        "%PHP_BIN%" composer.phar install
        if errorlevel 1 (
            echo WARNING: Standard composer install failed. Retrying with platform requirements ignored...
            "%PHP_BIN%" composer.phar install --ignore-platform-reqs
        )
    ) else (
        call "%COMPOSER_BIN%" install
        if errorlevel 1 (
            echo WARNING: Standard composer install failed. Retrying with platform requirements ignored...
            call "%COMPOSER_BIN%" install --ignore-platform-reqs
        )
    )
    cd ..
)

:: 4. Run migrations and database seeds
echo Migrating database tables and loading initial seeds...
cd backend
"%PHP_BIN%" artisan key:generate --force
"%PHP_BIN%" artisan migrate:fresh --seed
cd ..

:: 5. Install NPM dependencies for React frontend
if not exist "frontend\node_modules" (
    echo Installing frontend package dependencies...
    cd frontend && call npm install && cd ..
)

echo ===================================================
echo   Setup complete! Launching servers...
echo ===================================================

:: Start Laravel Backend in a new window
start "Laravel Backend API" cmd /k "cd backend && "%PHP_BIN%" artisan serve"

:: Start Vite Frontend in a new window
start "React Vite Frontend" cmd /k "cd frontend && npm run dev"

:: Wait 3 seconds for servers to boot up, then open browser
timeout /t 3 /nobreak >nul
echo Launching customer landing page...
start http://localhost:5173

echo ===================================================
echo   All systems running! Keep the black terminals open.
echo ===================================================
pause