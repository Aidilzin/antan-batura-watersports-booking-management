@echo off
echo ===================================================
echo   Starting Antan Batura Watersports Booking System
echo ===================================================

:: Detect Laragon's PHP path dynamically to run even if not in system PATH
set "PHP_BIN=php"
for /d %%D in ("C:\laragon\bin\php\php-*") do (
    if exist "%%D\php.exe" (
        set "PHP_BIN=%%D\php.exe"
    )
)

echo Using PHP executable: %PHP_BIN%

:: Start Laravel Backend in a new window
echo Starting Laravel Backend...
start "Laravel Backend API" cmd /k "cd backend && "%PHP_BIN%" artisan serve"

:: Start Vite Frontend in a new window
echo Starting Vite Frontend...
start "React Vite Frontend" cmd /k "cd frontend && npm run dev"

:: Wait 3 seconds for servers to boot up, then open the browser
timeout /t 3 /nobreak >nul
echo Opening web browser...
start http://localhost:5173

echo ===================================================
echo   System is running! 
echo   Keep the backend and frontend terminal windows open.
echo ===================================================
pause
