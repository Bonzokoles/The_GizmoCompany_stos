const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Logging function
function log(message) {
    const logPath = path.join(__dirname, '..', 'logs', 'websocket_detailed.log');
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    try {
        fs.appendFileSync(logPath, logMessage);
        console.log(message);
    } catch (error) {
        console.error('Logging failed:', error);
    }
}

const PORT = 4225;
const HOST = 'localhost';

const wss = new WebSocket.Server({ 
    port: PORT, 
    host: HOST 
}, () => {
    log(`WebSocket server running on ${HOST}:${PORT}`);
});

wss.on('connection', function connection(ws, req) {
    log(`WebSocket: Client connected from ${req.socket.remoteAddress}`);
    
    ws.on('message', function incoming(message) {
        log(`WebSocket: Received message: ${message.toString()}`);
    });
    
    ws.on('close', () => {
        log('WebSocket: Client disconnected');
    });
    
    ws.on('error', (error) => {
        log(`WebSocket: Client error: ${error.message}`);
    });
});

wss.on('error', (err) => {
    log(`WebSocket server error: ${err.message}`);
    
    if (err.code === 'EADDRINUSE') {
        log('Port is already in use. Attempting to handle...');
        // Optional: Implement port release logic
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('WebSocket: Received shutdown signal');
    wss.close(() => {
        log('WebSocket: Server closed');
        process.exit(0);
    });
});