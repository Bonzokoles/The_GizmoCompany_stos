const net = require('net');
const fs = require('fs');
const path = require('path');

// Logging function
function log(message) {
    const logPath = path.join(__dirname, '..', 'logs', 'local_tool_detailed.log');
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
    log(`Local Tool: Client connected from ${socket.remoteAddress}:${socket.remotePort}`);
    
    socket.on('data', (data) => {
        log(`Local Tool: Received data: ${data.toString().trim()}`);
    });
    
    socket.on('end', () => {
        log('Local Tool: Client disconnected');
    });
    
    socket.on('error', (error) => {
        log(`Local Tool: Socket error: ${error.message}`);
    });
});

const PORT = 4111;
const HOST = 'localhost';

server.listen(PORT, HOST, () => {
    log(`Local Tool server running on ${HOST}:${PORT}`);
});

server.on('error', (err) => {
    log(`Local Tool server error: ${err.message}`);
    
    if (err.code === 'EADDRINUSE') {
        log('Port is already in use. Attempting to handle...');
        // Optional: Implement port release logic
    }
});

// Graceful shutdown
process.on('SIGINT', () => {
    log('Local Tool: Received shutdown signal');
    server.close(() => {
        log('Local Tool: Server closed');
        process.exit(0);
    });
});