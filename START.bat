@echo off
title QuantumFab AI Launcher
color 0B
echo.
echo   ==========================================
echo    QUANTUMFAB AI - Starting servers...
echo   ==========================================
echo.
echo   [1/2] Starting backend on port 3001...
start "QuantumFab Backend" cmd /k "cd /d %~dp0backend && node server.js"
timeout /t 2 /nobreak >nul
echo   [2/2] Starting frontend on port 3000...
start "QuantumFab Frontend" cmd /k "cd /d %~dp0frontend && npm start"
echo.
echo   Both servers are starting.
echo   Your browser will open http://localhost:3000 shortly.
echo.
echo   To stop: close both CMD windows.
echo.
pause
