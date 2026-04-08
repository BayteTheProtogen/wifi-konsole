const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Configuration
const PORT = process.env.PORT || 8000;
const HOST = '0.0.0.0';
const DATA_FILE = path.join(__dirname, 'data.json');

// Initial State Template
const INITIAL_STATE = {
    consoles: [],
    settings: {
        graceMinutes: 5,
        defaultMaxTime: 60
    }
};

// --- Persistence Layer ---

// Ensure data file exists
if (!fs.existsSync(DATA_FILE)) {
    saveData(INITIAL_STATE);
}

function loadData() {
    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        return JSON.parse(raw);
    } catch (err) {
        console.error("Error reading data file, resetting to initial:", err);
        return INITIAL_STATE;
    }
}

function saveData(data) {
    try {
        // Simple backup mechanism could be added here if needed
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (err) {
        console.error("Error writing data file:", err);
    }
}

// Load state into memory
let currentState = loadData();

// --- Server Setup ---

// Serve static files
app.use(express.static(__dirname));

// Fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Socket.IO Handling ---

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Send current state immediately upon connection
    socket.emit('state-update', currentState);

    // Handle updates from clients
    socket.on('update-state', (newState) => {
        // Basic validation: ensure it's an object
        if (typeof newState === 'object' && newState !== null) {
            // Update server memory
            currentState = newState;
            
            // Persist to disk
            saveData(currentState);
            
            // Broadcast to ALL connected clients (including sender, to ensure sync)
            io.emit('state-update', currentState);
        }
    });

    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
    });
});

// Start server
server.listen(PORT, HOST, () => {
    console.log('='.repeat(50));
    console.log('Gaming Console Manager Server Started!');
    console.log('='.repeat(50));
    console.log(`\nLocal access:     http://localhost:${PORT}`);
    console.log(`Network access:   http://${getLocalIP()}:${PORT}`);
    console.log('\nPress Ctrl+C to stop the server\n');
});

// Helper: Get local IP
function getLocalIP() {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                return net.address;
            }
        }
    }
    return 'localhost';
}
