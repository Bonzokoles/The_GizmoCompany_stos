const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');

const SERVICES = {
    jimboHub: {
        name: 'JIMBO Hub',
        startCommand: 'npm run start:jimbo-hub',
        port: 4224
    },
    localTool: {
        name: 'Local Tool',
        startCommand: 'npm run start:local-tool',
        port: 4111
    },
    viteServer: {
        name: 'Vite Server',
        startCommand: 'npm run dev',
        port: 5173
    },
    wranglerPages: {
        name: 'Wrangler Pages',
        startCommand: 'npx wrangler pages dev',
        port: 8788
    }
};

function checkPortInUse(port) {
    return new Promise((resolve) => {
        const server = net.createServer();
        server.listen(port, () => {
            server.close(() => {
                resolve(false); // Port is not in use
            });
        });
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                resolve(true); // Port is in use
            } else {
                resolve(false);
            }
        });
    });
}

async function runServiceDiagnostics() {
    const diagnosticLog = {
        timestamp: new Date().toISOString(),
        services: {}
    };

    for (const [key, service] of Object.entries(SERVICES)) {
        const portInUse = await checkPortInUse(service.port);
        
        if (!portInUse) {
            console.log(`${service.name} not running. Attempting restart...`);
            
            diagnosticLog.services[key] = {
                status: 'not_running',
                attempt_restart: true
            };

            try {
                // Attempt to restart service
                await new Promise((resolve, reject) => {
                    exec(service.startCommand, (error, stdout, stderr) => {
                        if (error) {
                            console.error(`Failed to restart ${service.name}:`, error);
                            diagnosticLog.services[key].restart_status = 'failed';
                            reject(error);
                        } else {
                            console.log(`${service.name} restarted successfully`);
                            diagnosticLog.services[key].restart_status = 'success';
                            resolve();
                        }
                    });
                });
            } catch (restartError) {
                console.error(`Restart failed for ${service.name}`, restartError);
            }
        } else {
            diagnosticLog.services[key] = {
                status: 'running',
                port: service.port
            };
        }
    }

    // Write diagnostic log
    try {
        fs.writeFileSync(
            path.join(__dirname, '..', 'logs', 'service_diagnostic_log.json'),
            JSON.stringify(diagnosticLog, null, 2)
        );
    } catch (writeError) {
        console.error('Failed to write diagnostic log:', writeError);
    }

    return diagnosticLog;
}

// Immediately Invoked Async Function
(async () => {
    try {
        const log = await runServiceDiagnostics();
        console.log('Diagnostic Results:', JSON.stringify(log, null, 2));
    } catch (error) {
        console.error('Diagnostic process failed:', error);
    }
})();