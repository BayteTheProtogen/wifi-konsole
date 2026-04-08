# System Zarządzania Konsolami (Gaming Console Management System)

Zautomatyzowany system do obsługi salonów gier, oferujący synchronizację w czasie rzeczywistym, widok dla klientów oraz panel sterowania dla obsługi.

## Funkcje

- **Synchronizacja w czasie rzeczywistym**: Wszystkie ekrany aktualizują się natychmiastowo dzięki Socket.IO.
- **Trwałość danych**: Stan aplikacji jest zapisywany w pliku `data.json` na serwerze (odporność na rebooty).
- **Trzy widoki**:
  - Konfiguracja: Zarządzanie stanowiskami, grami i ustawieniami.
  - Widok Klienta: Przejrzysty podgląd dostępności konsol (Dark Mode).
  - Widok Obsługi: Pełna kontrola nad sesjami, rezerwacjami i kolejką.
- **Zarządzanie sesjami**:
  - Sesje "z ulicy" z licznikami na żywo.
  - Rezerwacje na konkretną godzinę.
  - System kolejki "następny gracz".
  - Alerty o zakończeniu czasu.
- **Inteligentne planowanie**:
  - Czas oczekiwania (grace period) na spóźnialskich.
  - Ostrzeżenia o konfliktach między sesjami a rezerwacjami.
- **Wizualne wskaźniki statusu**:
  - Zielony: Wolne
  - Czerwony: Zajęte (z odliczaniem)
  - Niebieski: Zarezerwowane

## Szybki start

Wymagany jest **Node.js** zainstalowany na komputerze.

1. **Uruchom serwer**:
   - Macintosh/Linux: Uruchom `./start.sh`
   - Windows: Uruchom `start.bat`
   
   *Alternatywnie: `npm install` a potem `node server.js`*

2. **Otwórz aplikację**:
   - Przejdź pod adres: `http://localhost:8000`

3. **Przełączanie widoków**:
   - Naciśnij **`Ctrl + Shift + V`**, aby pokazać menu wyboru widoku.

## Konfiguracja i obsługa

1. **Konfiguracja stanowisk**:
   - W menu wyboru widoku wybierz "Konfiguracja".
   - Dodaj konsole (nazwa, gry, maks. czas).
   - Ustaw domyślny czas oczekiwania i sesji.

2. **Panel Obsługi**:
   - Używaj go do rozpoczynania sesji i zarządzania kolejką.
   - Możesz pobrać dziennik sesji (plik CSV) dla każdego stanowiska.

3. **Ekran dla Klientów**:
   - Otwórz na osobnym monitorze/telewizorze i przełącz na "Widok Klienta".
   - Ukryj menu przełączania (`Ctrl + Shift + V`), aby uzyskać czysty interfejs.

## Technologia

- **Backend**: Node.js + Express + Socket.IO
- **Persistence**: Plik `data.json` (automatyczna kopia zapasowa stanu)
- **Frontend**: Vanilla JS + CSS3
- **Sync**: WebSockets (natychmiastowa aktualizacja wszystkich urządzeń)

## Rozwiązywanie problemów

- **Brak połączenia**: Upewnij się, że serwer Node.js działa.
- **Dostęp z innych urządzeń**: Użyj adresu IP serwera (np. `http://192.168.1.15:8000`) zamiast `localhost`.

---
Autor: Antigravity AI
Licencja: MIT
