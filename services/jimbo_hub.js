const net = require('net');
const fs = require('fs');
const path = require('path');

// Logging function
function log(message) {
    const logPath = path.join(__dirname, '..', 'logs', 'jimbo_hub_detailed.log');
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp} - ${message}\n`;
    
    try {
        fs.appendFileSync(logPath, logMessage);
        console.log(message);
    } catch (error) {
        console.error('Logging failed:', error);
    }
}

const server = net.createServer((socket) => {
    log(`JIMBO Hub: Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
        log(`JIMBO Hub: Received data: ${data.toString().trim()}`);
    });
    
    socket.on('end', () => {
        log('JIMBO Hub: Client disconnected');
    });
    
    socket.on('error', (error) => {
        log(`JIMBO Hub: Socket error: ${error.message}`);
    });
});

const PORT = 4224;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
    log(`JIMBO Hub server running on ${HOST}:${PORT}`);
});

server.on('error', (err) => {
    log(`JIMBO Hub server error: ${err.message}`);
    
    if (err.code === 'EADDRINUSE') {
        log('Port is already in use. Attempting to handle...');
        // Optional: Implement port release logic
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('JIMBO Hub: Received shutdown signal');
    server.close(() => {
        log('JIMBO Hub: Server closed');
        process.exit(0);
    });
});