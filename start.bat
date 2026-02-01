@echo off
echo ========================================
echo   Claude Conversation Viewer
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

node --version
echo.

REM Check if node_modules exists
if not exist "node_modules\" (
    echo Installing dependencies...
    call npm install
    if %ERRORLEVEL% NEQ 0 (
        echo Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting server...
echo Open http://localhost:3000 in your browser
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

pause
