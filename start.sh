#!/bin/bash

# Quick Start Script for Gaming Console Manager
# This script starts a simple HTTP server to run the application

echo "=========================================="
echo "Gaming Console Manager - Quick Start"
echo "=========================================="
echo ""

# Check if Node is available
if command -v node &> /dev/null; then
    # Check for node_modules
    if [ ! -d "node_modules" ]; then
        echo "Brak folderu node_modules. Instalowanie zależności..."
        npm install
    fi

    echo "Uruchamianie serwera za pomocą Node.js..."
    echo "Serwer będzie dostępny pod adresem:"
    echo "  - http://localhost:8000"
    echo "  - http://$(hostname | awk '{print $1}'):8000"
    echo ""
    echo "Naciśnij Ctrl+C, aby zatrzymać serwer"
    echo ""
    echo "Kolejne kroki:"
    echo "1. Otwórz http://localhost:8000 w przeglądarce"
    echo "2. Naciśnij Ctrl+Shift+V, aby wyświetlić przełącznik widoków"
    echo "3. Skonfiguruj konsole w widoku Konfiguracja"
    echo "4. Przełącz na widok Obsługi lub Klienta"
    echo "5. Naciśnij Ctrl+Shift+V ponownie, aby ukryć przełącznik"
    echo ""
    echo "=========================================="
    node server.js
else
    echo "Błąd: Node.js nie jest zainstalowany."
    echo "Proszę zainstalować Node.js, aby uruchomić tę aplikację."
    exit 1
fi
