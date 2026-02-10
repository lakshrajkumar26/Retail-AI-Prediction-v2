@echo off
echo ========================================
echo Starting RetailAI Platform
echo ========================================
echo.

echo [1/2] Starting Python ML API...
start "RetailAI API" cmd /k "cd inventory_model && uvicorn src.api:app --reload --port 8000"

timeout /t 3 /nobreak > nul

echo [2/2] Starting React Frontend...
start "RetailAI Frontend" cmd /k "cd client && npm run dev"

echo.
echo ========================================
echo RetailAI Platform Started!
echo ========================================
echo API: http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo.
echo Press any key to stop all services...
pause > nul

taskkill /FI "WindowTitle eq RetailAI API*" /T /F
taskkill /FI "WindowTitle eq RetailAI Frontend*" /T /F
