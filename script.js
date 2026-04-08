// Global State Management
let state = {
    consoles: [],
    settings: {
        graceMinutes: 5,
        defaultMaxTime: 60
    }
};

// Per-tab view state (not synced)
let currentView = localStorage.getItem('currentView') || 'staff';

let currentModalConsoleId = null;
let currentModalAction = null;
let sessionTimers = {};
let graceTimers = {};

// Socket.IO Initialization
const socket = io();

socket.on('connect', () => {
    console.log('Connected to server');
});

socket.on('disconnect', () => {
    console.log('Disconnected from server');
});

socket.on('state-update', (newState) => {
    // Merge server state with local state
    state = newState;
    renderCurrentView();
});

// Broadcast state changes to server (which will broadcast to others)
function saveState() {
    socket.emit('update-state', state);
}

// NOTE: loadState and broadcastState (channel) are removed in favor of Socket.IO
// NOTE: "storage" event listener is removed

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Initial view will be rendered when we receive the first state-update from server
    // But we render initially with empty/default just in case
    renderCurrentView();
    initializeApp();

    // Hidden keyboard shortcut to toggle view switcher (Ctrl+Shift+V)
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.shiftKey && e.key === 'V') {
            const switcher = document.getElementById('viewSwitcher');
            switcher.classList.toggle('hidden');
        }
    });

    // Auto-advance time input from hours to minutes
    const timeInput = document.getElementById('reservationStartTime');
    if (timeInput) {
        timeInput.addEventListener('input', (e) => {
            let value = e.target.value.replace(/[^0-9]/g, '');

            if (value.length >= 2) {
                const hours = value.slice(0, 2);
                const minutes = value.slice(2, 4);
                if (minutes) {
                    e.target.value = hours + ':' + minutes;
                } else {
                    e.target.value = hours + ':';
                }
            } else {
                e.target.value = value;
            }

            // Validate hours
            if (value.length >= 2) {
                const h = parseInt(value.slice(0, 2));
                if (h > 23) {
                    e.target.value = '23:';
                }
            }

            // Validate minutes
            if (value.length >= 4) {
                const m = parseInt(value.slice(2, 4));
                if (m > 59) {
                    e.target.value = e.target.value.slice(0, 3) + '59';
                }
            }
        });
    }

    // Add event listener for damage radio buttons
    document.addEventListener('change', (e) => {
        if (e.target.name === 'sessionStatus') {
            const damageGroup = document.getElementById('damageDescriptionGroup');
            if (e.target.value === 'damage') {
                damageGroup.classList.remove('hidden');
            } else {
                damageGroup.classList.add('hidden');
            }
        }
    });

    // Update timers every second
    setInterval(updateAllTimers, 1000);
});

function initializeApp() {
    // We do NOT load sample data. State is managed by server.
    // If state is empty, user must add consoles manually.
    renderCurrentView();
}

// View Management
function switchView(view) {
    currentView = view;
    localStorage.setItem('currentView', view);

    document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));

    if (view === 'config') {
        document.getElementById('configView').classList.remove('hidden');
        renderConfig();
    } else if (view === 'customer') {
        document.getElementById('customerView').classList.remove('hidden');
        renderCustomerView();
    } else if (view === 'staff') {
        document.getElementById('staffView').classList.remove('hidden');
        renderStaffView();
    }
}

function renderCurrentView() {
    switchView(currentView);
}

// Configuration View
function renderConfig() {
    const consoleList = document.getElementById('consoleList');

    if (state.consoles.length === 0) {
        consoleList.innerHTML = '<p>Brak skonfigurowanych konsol. Kliknij "Nowa...", aby rozpocząć.</p>';
    } else {
        consoleList.innerHTML = state.consoles.map(console => `
            <div class="console-item">
                <div class="console-item-header">
                    <h3>${console.name}</h3>
                    <div class="console-item-actions">
                        <button onclick="downloadSessionLog('${console.id}')" class="btn-warning">Pobierz dziennik</button>
                        <button onclick="editConsole('${console.id}')" class="btn-secondary">Edytuj</button>
                        <button onclick="deleteConsole('${console.id}')" class="btn-danger">Usuń</button>
                    </div>
                </div>
                <div class="console-item-details">
                    <p><strong>Gry:</strong> ${console.games.join(', ')}</p>
                    <p><strong>Maks. czas:</strong> ${console.maxTime} min</p>
                    <p><strong>Wpisy w dzienniku:</strong> ${console.sessionLog ? console.sessionLog.length : 0}</p>
                </div>
            </div>
        `).join('');
    }

    // Update settings inputs
    document.getElementById('graceMinutes').value = state.settings.graceMinutes;
    document.getElementById('defaultMaxTime').value = state.settings.defaultMaxTime;
}

function addConsole() {
    currentModalConsoleId = null;
    document.getElementById('consoleEditTitle').textContent = 'Dodaj konsolę';
    document.getElementById('consoleName').value = '';
    document.getElementById('consoleGames').value = '';
    document.getElementById('consoleMaxTime').value = state.settings.defaultMaxTime;
    showModal('consoleEditModal');
}

function editConsole(id) {
    const console = state.consoles.find(c => c.id === id);
    if (!console) return;

    currentModalConsoleId = id;
    document.getElementById('consoleEditTitle').textContent = 'Edytuj konsolę';
    document.getElementById('consoleName').value = console.name;
    document.getElementById('consoleGames').value = console.games.join(', ');
    document.getElementById('consoleMaxTime').value = console.maxTime;
    showModal('consoleEditModal');
}

function saveConsole() {
    const name = document.getElementById('consoleName').value.trim();
    const gamesText = document.getElementById('consoleGames').value.trim();
    const maxTime = parseInt(document.getElementById('consoleMaxTime').value);

    if (!name || !gamesText) {
        alert('Proszę wypełnić wszystkie pola');
        return;
    }

    const games = gamesText.split(',').map(g => g.trim()).filter(g => g);

    if (currentModalConsoleId) {
        // Edit existing
        const console = state.consoles.find(c => c.id === currentModalConsoleId);
        if (console) {
            console.name = name;
            console.games = games;
            console.maxTime = maxTime;
        }
    } else {
        // Add new
        state.consoles.push({
            id: generateId(),
            name: name,
            games: games,
            maxTime: maxTime,
            status: 'available',
            currentSession: null,
            reservations: [],
            playNextQueue: [],
            sessionLog: []
        });
    }

    saveState();
    closeModal();
    renderConfig();
}

function deleteConsole(id) {
    if (confirm('Czy na pewno chcesz usunąć tę konsolę?')) {
        state.consoles = state.consoles.filter(c => c.id !== id);
        saveState();
        renderConfig();
    }
}

function downloadSessionLog(id) {
    const console = state.consoles.find(c => c.id === id);
    if (!console || !console.sessionLog || console.sessionLog.length === 0) {
        alert('Brak wpisów w dzienniku do pobrania.');
        return;
    }

    // Create CSV content
    let csvContent = 'Data,Klient,Planowany czas (min),Rzeczywisty czas (min),Status,Opis szkód\n';

    console.sessionLog.forEach(log => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const damageDesc = log.damageDescription ? `"${log.damageDescription.replace(/"/g, '""')}"` : '';
        csvContent += `"${timestamp}","${log.customerName}",${log.duration},${log.actualDuration},${log.status},${damageDesc}\n`;
    });

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${console.name.replace(/\s+/g, '_')}_dziennik_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function saveSettings() {
    state.settings.graceMinutes = parseInt(document.getElementById('graceMinutes').value);
    state.settings.defaultMaxTime = parseInt(document.getElementById('defaultMaxTime').value);
    saveState();
    alert('Ustawienia zapisane pomyślnie!');
}

// Customer View
function renderCustomerView() {
    const grid = document.getElementById('customerConsoleGrid');

    if (state.consoles.length === 0) {
        grid.innerHTML = '<p style="color: white; text-align: center; font-size: 1.5em;">Brak dostępnych konsol</p>';
        return;
    }

    grid.innerHTML = state.consoles.map(console => {
        let status = console.status;
        let statusText = status.charAt(0).toUpperCase() + status.slice(1);

        // Determine actual display status
        if (console.currentSession) {
            const remaining = getRemainingTime(console.currentSession);
            if (remaining <= 0) {
                status = 'finishing';
                statusText = 'Finishing Up';
            }
        } else if (console.graceTimer || console.playNextQueue.length > 0) {
            status = 'reserved';
            statusText = 'Reserved';
        } else if (console.reservations.length > 0) {
            // Only show reserved if reservation is within one max session time
            const nextRes = console.reservations[0];
            const resTime = parseTimeString(nextRes.startTime);
            const now = new Date();
            const timeDiff = (resTime - now) / 60000; // minutes

            if (timeDiff <= console.maxTime && timeDiff > 0) {
                status = 'reserved';
                statusText = 'Reserved';
            } else {
                status = 'available';
                statusText = 'Available';
            }
        } else {
            // No active session, grace timer, queue, or nearby reservation
            status = 'available';
            statusText = 'Available';
        }

        const statusClass = `status-${status}`;
        const statusBadgeClass = `status-badge-${status}`;

        let timerDisplay = '';
        let infoDisplay = '';
        let upcomingDisplay = '';

        if (console.currentSession) {
            const remaining = getRemainingTime(console.currentSession);
            timerDisplay = `<div class="console-timer ${remaining <= 0 ? 'timer-ended' : ''}">${formatTime(Math.abs(remaining))}</div>`;

            if (remaining <= 0) {
                infoDisplay = '<p style="color: #64B5F6; font-weight: 600;">Finishing Up</p>';
            } else {
                infoDisplay = `<p>Time Remaining</p>`;
            }
        } else {
            infoDisplay = `<p>Max session: ${console.maxTime} minutes</p>`;
        }

        // Show upcoming reservations
        if (console.reservations.length > 0) {
            const upcoming = console.reservations[0];
            upcomingDisplay += `
                <div class="upcoming-section">
                    <h4>Następna rezerwacja:</h4>
                    <div class="upcoming-item">
                        ${upcoming.startTime} - ${upcoming.customerName}
                    </div>
                </div>
            `;
        }

        // Show play next queue
        if (console.playNextQueue.length > 0) {
            upcomingDisplay += `
                <div class="upcoming-section">
                    <h4>Kolejka:</h4>
                    ${console.playNextQueue.map((item, idx) => `
                        <div class="upcoming-item">
                            ${idx + 1}. ${item.customerName}
                        </div>
                    `).join('')}
                </div>
            `;
        }

        return `
            <div class="console-card ${statusClass}">
                <div class="console-card-header">
                    <h2 class="console-card-title">${console.name}</h2>
                    <span class="console-status-badge ${statusBadgeClass}">${statusText}</span>
                </div>
                <div class="console-games">
                    <h4>Dostępne gry:</h4>
                    <ul class="game-list">
                        ${console.games.map(game => `<li>${game}</li>`).join('')}
                    </ul>
                </div>
                ${timerDisplay}
                <div class="console-info">
                    ${infoDisplay}
                </div>
                ${upcomingDisplay}
            </div>
        `;
    }).join('');
}

// Staff View
function renderStaffView() {
    const grid = document.getElementById('staffConsoleGrid');

    if (state.consoles.length === 0) {
        grid.innerHTML = '<p style="text-align: center; font-size: 1.5em;">Brak skonfigurowanych konsol. Przejdź do Konfiguracji aby dodać.</p>';
        return;
    }

    grid.innerHTML = state.consoles.map(console => {
        const statusClass = `status-${console.status}`;
        const statusBadgeClass = `status-badge-${console.status}`;
        let statusText = '';
        switch (console.status) {
            case 'available': statusText = 'Dostępna'; break;
            case 'busy': statusText = 'Zajęta'; break;
            case 'reserved': statusText = 'Zarezerwowana'; break;
            default: statusText = console.status;
        }

        let timerDisplay = '';
        let infoDisplay = '';
        let actionsDisplay = '';
        let upcomingDisplay = '';
        let graceDisplay = '';

        if (console.currentSession) {
            const remaining = getRemainingTime(console.currentSession);
            timerDisplay = `<div class="console-timer ${remaining <= 0 ? 'timer-ended' : ''}">${formatTime(Math.abs(remaining))}</div>`;

            if (remaining <= 0) {
                infoDisplay = '<p style="color: #dc3545; font-weight: 600;">⚠ KONIEC SESJI - Czas minął</p>';
            } else {
                infoDisplay = `
                    <p><strong>Klient:</strong> ${console.currentSession.customerName}</p>
                    <p><strong>Start:</strong> ${new Date(console.currentSession.startTime).toLocaleTimeString()}</p>
                `;
            }

            actionsDisplay = `
                <button onclick="openEndSessionModal('${console.id}')" class="btn-danger">Zakończ sesję</button>
            `;
        } else {
            infoDisplay = `<p>Maks. sesja: ${console.maxTime} min</p>`;
            actionsDisplay = `
                <button onclick="openStartSessionModal('${console.id}')" class="btn-primary">Rozpocznij sesję</button>
            `;
        }

        // Check for grace period - count UP from 0
        if (console.graceTimer) {
            const graceElapsed = Math.floor((Date.now() - console.graceTimer.startTime) / 1000);
            graceDisplay = `
                <div class="grace-timer">
                    ⏰ Oczekiwanie na ${console.graceTimer.customerName}: ${formatTime(graceElapsed)}
                </div>
                <div class="grace-actions">
                    <button onclick="startGraceSession('${console.id}')" class="btn-primary">Start</button>
                    <button onclick="cancelGraceTimer('${console.id}')" class="btn-danger">Nie przyszedł</button>
                </div>
            `;
        }






        // Always show add reservation and play next buttons
        actionsDisplay += `
            <button onclick="openReservationModal('${console.id}')" class="btn-secondary">Rezerwuj</button>
            <button onclick="openPlayNextModal('${console.id}')" class="btn-secondary">W kolejce</button>
        `;

        // Show reservations
        if (console.reservations.length > 0) {
            upcomingDisplay += `
                <div class="upcoming-section">
                    <h4>Rezerwacje:</h4>
                    ${console.reservations.map((res, idx) => `
                        <div class="upcoming-item">
                            ${res.startTime} - ${res.customerName} (${res.duration}min)
                            <button onclick="cancelReservation('${console.id}', ${idx})" class="btn-danger" style="margin-left: 10px; padding: 4px 8px; font-size: 0.85em;">Anuluj</button>
                        </div>
                    `).join('')}
                </div>
            `;
        }

        // Show play next queue with highlighting for next person when station is free
        if (console.playNextQueue.length > 0) {
            const isStationFree = !console.currentSession && !console.graceTimer;
            upcomingDisplay += `
                <div class="upcoming-section">
                    <h4>Kolejka:</h4>
                    ${console.playNextQueue.map((item, idx) => {
                const isNext = idx === 0 && isStationFree;
                return `
                            <div class="upcoming-item ${isNext ? 'highlighted' : ''}">
                                ${idx + 1}. ${item.customerName} (${item.duration}min)
                                ${isNext ? `<button onclick="startPlayNextSession('${console.id}', ${idx})" class="btn-primary" style="margin-left: 10px; padding: 4px 8px; font-size: 0.85em;">Start</button>` : ''}
                                <button onclick="cancelPlayNext('${console.id}', ${idx})" class="btn-danger" style="margin-left: 10px; padding: 4px 8px; font-size: 0.85em;">Anuluj</button>
                            </div>
                        `;
            }).join('')}
                </div>
            `;
        }

        return `
            <div class="console-card ${statusClass}">
                <div class="console-card-header">
                    <h2 class="console-card-title">${console.name}</h2>
                    <span class="console-status-badge ${statusBadgeClass}">${statusText}</span>
                </div>
                <div class="console-games">
                    <h4>Dostępne gry:</h4>
                    <ul class="game-list">
                        ${console.games.map(game => `<li>${game}</li>`).join('')}
                    </ul>
                </div>
                ${timerDisplay}
                ${graceDisplay}
                <div class="console-info">
                    ${infoDisplay}
                </div>
                ${upcomingDisplay}
                <div class="console-actions">
                    ${actionsDisplay}
                </div>
            </div>
        `;
    }).join('');
}

// Session Management
function openStartSessionModal(consoleId) {
    currentModalConsoleId = consoleId;
    currentModalAction = 'start';

    const console = state.consoles.find(c => c.id === consoleId);
    document.getElementById('modalConsoleInfo').textContent = `Konsola: ${console.name}`;
    document.getElementById('customerName').value = '';
    document.getElementById('sessionDuration').value = console.maxTime;
    checkForConflicts();

    showModal('startSessionModal');
}

function checkForConflicts() {
    const console = state.consoles.find(c => c.id === currentModalConsoleId);
    const duration = parseInt(document.getElementById('sessionDuration').value) || 0;
    const warningDiv = document.getElementById('conflictWarning');

    if (!console) {
        warningDiv.classList.add('hidden');
        return;
    }

    // Check if walk-in would conflict with reservations
    if (console.reservations.length > 0) {
        const nextReservation = console.reservations[0];
        const reservationTime = parseTimeString(nextReservation.startTime);
        const now = new Date();
        const endTime = new Date(now.getTime() + duration * 60000);

        if (endTime > reservationTime) {
            warningDiv.textContent = `⚠ Ostrzeżenie: Sesja może kolidować z rezerwacją o ${nextReservation.startTime} dla ${nextReservation.customerName}`;
            warningDiv.classList.remove('hidden');
            return;
        }
    }

    warningDiv.classList.add('hidden');
}

function confirmStartSession() {
    const console = state.consoles.find(c => c.id === currentModalConsoleId);
    const customerName = document.getElementById('customerName').value.trim();
    const duration = parseInt(document.getElementById('sessionDuration').value);

    if (!customerName) {
        alert('Proszę podać imię klienta');
        return;
    }

    // Always start walk-in session
    startSession(currentModalConsoleId, customerName, duration);

    saveState();
    closeModal();
    renderCurrentView();
}

function startSession(consoleId, customerName, duration) {
    const console = state.consoles.find(c => c.id === consoleId);

    console.currentSession = {
        customerName,
        startTime: Date.now(),
        duration: duration,
        endTime: Date.now() + (duration * 60000)
    };
    console.status = 'busy';
    console.graceTimer = null;

    saveState();
}

function openEndSessionModal(consoleId) {
    currentModalConsoleId = consoleId;
    const console = state.consoles.find(c => c.id === consoleId);

    document.getElementById('endSessionInfo').innerHTML = `
        <strong>Konsola:</strong> ${console.name}<br>
        <strong>Klient:</strong> ${console.currentSession.customerName}<br>
        <strong>Czas trwania:</strong> ${console.currentSession.duration} min
    `;

    // Reset radio buttons and damage description
    document.querySelector('input[name="sessionStatus"][value="good"]').checked = true;
    document.getElementById('damageDescriptionGroup').classList.add('hidden');
    document.getElementById('damageDescription').value = '';

    showModal('endSessionModal');
}

function confirmEndSession() {
    const console = state.consoles.find(c => c.id === currentModalConsoleId);
    const sessionStatus = document.querySelector('input[name="sessionStatus"]:checked').value;
    const damageDescription = document.getElementById('damageDescription').value.trim();

    // Log the session
    const sessionRecord = {
        timestamp: new Date().toISOString(),
        customerName: console.currentSession.customerName,
        duration: console.currentSession.duration,
        actualDuration: Math.floor((Date.now() - console.currentSession.startTime) / 60000),
        status: sessionStatus,
        damageDescription: sessionStatus === 'damage' ? damageDescription : null
    };

    if (!console.sessionLog) {
        console.sessionLog = [];
    }
    console.sessionLog.push(sessionRecord);

    console.currentSession = null;

    // Check for next in queue
    if (console.playNextQueue.length > 0) {
        const next = console.playNextQueue.shift();
        // Start grace period
        console.graceTimer = {
            customerName: next.customerName,
            duration: next.duration,
            startTime: Date.now()
        };
        console.status = 'available';
    } else if (console.reservations.length > 0) {
        // Check if any reservation should start now
        const now = new Date();
        const nextRes = console.reservations[0];
        const resTime = parseTimeString(nextRes.startTime);
        const timeDiff = (resTime - now) / 60000; // minutes

        if (timeDiff <= 0) {
            // Reservation time has passed or is now
            const reservation = console.reservations.shift();
            console.graceTimer = {
                customerName: reservation.customerName,
                duration: reservation.duration,
                startTime: Date.now()
            };
        }
        console.status = console.reservations.length > 0 ? 'reserved' : 'available';
    } else {
        console.status = 'available';
    }

    saveState();
    closeModal();
    renderCurrentView();
}

// Reservation Management
function openReservationModal(consoleId) {
    currentModalConsoleId = consoleId;
    const console = state.consoles.find(c => c.id === consoleId);

    document.getElementById('modalReservationInfo').textContent = `Konsola: ${console.name}`;
    document.getElementById('reservationCustomerName').value = '';
    document.getElementById('reservationStartTime').value = '';
    document.getElementById('reservationDuration').value = console.maxTime;

    showModal('reservationModal');
}

function confirmReservation() {
    const console = state.consoles.find(c => c.id === currentModalConsoleId);
    const customerName = document.getElementById('reservationCustomerName').value.trim();
    const startTime = document.getElementById('reservationStartTime').value;
    const duration = parseInt(document.getElementById('reservationDuration').value);

    if (!customerName || !startTime) {
        alert('Proszę wypełnić wszystkie pola');
        return;
    }

    console.reservations.push({
        customerName,
        startTime,
        duration
    });

    // Sort reservations by time
    console.reservations.sort((a, b) => parseTimeString(a.startTime) - parseTimeString(b.startTime));

    if (console.status === 'available') {
        console.status = 'reserved';
    }

    saveState();
    closeModal();
    renderCurrentView();
}

function cancelReservation(consoleId, index) {
    if (confirm('Anulować tę rezerwację?')) {
        const console = state.consoles.find(c => c.id === consoleId);
        console.reservations.splice(index, 1);

        if (console.reservations.length === 0 && console.status === 'reserved' && !console.currentSession) {
            console.status = 'available';
        }

        saveState();
        renderCurrentView();
    }
}

// Play Next Queue Management
function openPlayNextModal(consoleId) {
    currentModalConsoleId = consoleId;
    const console = state.consoles.find(c => c.id === consoleId);

    document.getElementById('modalPlayNextInfo').textContent = `Konsola: ${console.name}`;
    document.getElementById('playNextCustomerName').value = '';
    document.getElementById('playNextDuration').value = console.maxTime;

    showModal('playNextModal');
}

function confirmPlayNext() {
    const console = state.consoles.find(c => c.id === currentModalConsoleId);
    const customerName = document.getElementById('playNextCustomerName').value.trim();
    const duration = parseInt(document.getElementById('playNextDuration').value);

    if (!customerName) {
        alert('Proszę podać imię klienta');
        return;
    }

    console.playNextQueue.push({
        customerName,
        duration
    });

    saveState();
    closeModal();
    renderCurrentView();
}

function cancelPlayNext(consoleId, index) {
    if (confirm('Usunąć z kolejki?')) {
        const console = state.consoles.find(c => c.id === consoleId);
        console.playNextQueue.splice(index, 1);
        saveState();
        renderCurrentView();
    }
}

// Grace Timer Management
function startGraceSession(consoleId) {
    const console = state.consoles.find(c => c.id === consoleId);
    if (!console.graceTimer) return;

    const { customerName, duration } = console.graceTimer;
    console.graceTimer = null;
    startSession(consoleId, customerName, duration);
    saveState();
    renderCurrentView();
}

function cancelGraceTimer(consoleId) {
    if (confirm('Mark as no-show and cancel grace period?')) {
        const console = state.consoles.find(c => c.id === consoleId);
        console.graceTimer = null;

        // Check if there are more people in queue
        if (console.playNextQueue.length > 0) {
            const next = console.playNextQueue.shift();
            console.graceTimer = {
                customerName: next.customerName,
                duration: next.duration,
                startTime: Date.now()
            };
        } else if (console.reservations.length > 0) {
            console.status = 'reserved';
        } else {
            console.status = 'available';
        }

        saveState();
        renderCurrentView();
    }
}

// Start session from Play Next queue
function startPlayNextSession(consoleId, index) {
    const console = state.consoles.find(c => c.id === consoleId);
    const customer = console.playNextQueue[index];

    console.playNextQueue.splice(index, 1);
    startSession(consoleId, customer.customerName, customer.duration);
    saveState();
    renderCurrentView();
}

// Timer Updates
function updateAllTimers() {
    let needsUpdate = false;

    state.consoles.forEach(console => {
        // Grace timers now count up indefinitely, no auto-cancel

        // Auto-start reservations
        if (console.reservations.length > 0 && console.status !== 'busy' && !console.graceTimer) {
            const nextRes = console.reservations[0];
            const resTime = parseTimeString(nextRes.startTime);
            const now = new Date();
            const timeDiff = (resTime - now) / 60000;

            // If reservation time is reached and no grace timer, start grace timer
            if (timeDiff <= 0) {
                const reservation = console.reservations.shift();
                console.graceTimer = {
                    customerName: reservation.customerName,
                    duration: reservation.duration,
                    startTime: Date.now()
                };
                console.status = console.reservations.length > 0 ? 'reserved' : 'available';
                needsUpdate = true;
            }
        }
    });

    if (needsUpdate) {
        saveState();
    }

    // Always re-render to update timer displays
    renderCurrentView();
}

function getRemainingTime(session) {
    return Math.floor((session.endTime - Date.now()) / 1000);
}

function formatTime(seconds) {
    if (seconds < 0) seconds = 0;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${mins}:${String(secs).padStart(2, '0')}`;
}

function parseTimeString(timeStr) {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
}

// Modal Management
function showModal(modalId) {
    document.getElementById('modalOverlay').classList.remove('hidden');
    document.getElementById(modalId).classList.remove('hidden');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.add('hidden');
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
    currentModalConsoleId = null;
    currentModalAction = null;
}

// Utility Functions
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}
