@echo off
REM Quick Start Script for Gaming Console Manager (Windows)

echo ==========================================
echo Gaming Console Manager - Quick Start
echo ==========================================
echo.

REM Check if Node is available
where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    REM Check for node_modules
    if not exist node_modules (
        echo Brak folderu node_modules. Instalowanie zaleznosci...
        call npm install
    )

    echo Uruchamianie serwera za pomocą Node.js...
    echo Serwer będzie dostępny pod adresem:
    echo   - http://localhost:8000
    echo.
    echo Naciśnij Ctrl+C, aby zatrzymać serwer
    echo.
    echo Kolejne kroki:
    echo 1. Otwórz http://localhost:8000 w przeglądarce
    echo 2. Naciśnij Ctrl+Shift+V, aby wyświetlić przełącznik widoków
    echo 3. Skonfiguruj konsole w widoku Konfiguracja
    echo 4. Przełącz na widok Obsługi lub Klienta
    echo 5. Naciśnij Ctrl+Shift+V ponownie, aby ukryć przełącznik
    echo.
    echo ==========================================
    node server.js
) else (
    echo Blad: Node.js nie jest zainstalowany.
    echo Proszę zainstalować Node.js z https://nodejs.org/
    pause
)
