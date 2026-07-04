@echo off
title Antan Batura Setup & Launch
echo ===================================================
echo   Setting up Antan Batura Booking Management System
echo ===================================================

:: Detect Laragon's PHP path dynamically
set "PHP_BIN=php"
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" (
        set "PHP_BIN=%%D\php.exe"
    )
)
echo Found PHP: %PHP_BIN%

:: 1. Copy env file if not exists
if not exist "backend\.env" (
    echo Creating backend environment file...
    copy "backend\.env.example" "backend\.env" >nul
)

:: 2. Dynamically create MySQL Database if missing
echo Checking MySQL database connection...
"%PHP_BIN%" -r "try { $pdo = new PDO('mysql:host=127.0.0.1;port=3306', 'root', ''); $pdo->exec('CREATE DATABASE IF NOT EXISTS antan_batura'); echo 'MySQL Database verified successfully!\n'; } catch (Exception $e) { echo 'WARNING: Could not connect to MySQL server. Please ensure Laragon is running and MySQL is started.\n'; }"

:: 3. Install composer dependencies if vendor is missing
if not exist "backend\vendor" (
    echo Installing backend dependencies (this may take a few minutes)...
    cd backend && call composer install && cd ..
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
