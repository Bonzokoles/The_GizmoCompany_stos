const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const net = require('net');
const WebSocket = require('ws');

class ServiceManager {
    constructor() {
        this.services = {
            jimboHub: {
                name: 'JIMBO Hub',
                startCommand: 'npm run start:jimbo-hub',
                port: 4224,
                processRef: null,
                logFile: path.join(__dirname, '..', 'logs', 'jimbo_hub.log')
            },
            localTool: {
                name: 'Local Tool',
                startCommand: 'npm run start:local-tool',
                port: 4111,
                processRef: null,
                logFile: path.join(__dirname, '..', 'logs', 'local_tool.log')
            },
            viteServer: {
                name: 'Vite Server',
                startCommand: 'npm run dev',
                port: 5173,
                processRef: null,
                logFile: path.join(__dirname, '..', 'logs', 'vite_server.log')
            },
            wranglerPages: {
                name: 'Wrangler Pages',
                startCommand: 'npx wrangler pages dev',
                port: 8788,
                processRef: null,
                logFile: path.join(__dirname, '..', 'logs', 'wrangler_pages.log')
            },
            websocketServer: {
                name: 'WebSocket Server',
                startCommand: 'npm run start:websocket',
                port: 4225,
                processRef: null,
                logFile: path.join(__dirname, '..', 'logs', 'websocket_server.log')
            }
        };

        this.diagnosticLog = {
            timestamp: new Date().toISOString(),
            services: {}
        };
    }

    // Ensure log directory exists and log file is writable
    ensureLogFile(logFilePath) {
        try {
            const logDir = path.dirname(logFilePath);
            
            // Ensure log directory exists
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true });
            }

            // Create file if not exists
            if (!fs.existsSync(logFilePath)) {
                fs.writeFileSync(logFilePath, '', 'utf8');
            }

            return true;
        } catch (error) {
            console.error(`Failed to prepare log file ${logFilePath}:`, error);
            return false;
        }
    }

    async checkPortInUse(port) {
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

    async testWebSocketConnection(url) {
        return new Promise((resolve) => {
            const ws = new WebSocket(url);
            
            const timeout = setTimeout(() => {
                ws.close();
                resolve({ connected: false, reason: 'Connection Timeout' });
            }, 5000);

            ws.on('open', () => {
                clearTimeout(timeout);
                ws.close();
                resolve({ connected: true });
            });
            
            ws.on('error', (error) => {
                clearTimeout(timeout);
                resolve({ 
                    connected: false, 
                    error: error.message 
                });
            });
        });
    }

    async startService(serviceKey) {
        const service = this.services[serviceKey];
        
        // Ensure log file is ready
        if (!this.ensureLogFile(service.logFile)) {
            console.error(`Could not prepare log file for ${service.name}`);
            return false;
        }
        
        // Check if port is already in use
        const portInUse = await this.checkPortInUse(service.port);
        if (portInUse) {
            console.log(`${service.name} port ${service.port} is already in use.`);
            return false;
        }

        // Spawn the service process with log file
        service.processRef = spawn(service.startCommand, {
            shell: true,
            stdio: ['ignore', 'append', 'append']
        });

        // Basic error handling
        service.processRef.on('error', (err) => {
            console.error(`Failed to start ${service.name}:`, err);
        });

        console.log(`Started ${service.name} on port ${service.port}`);
        return true;
    }

    async stopService(serviceKey) {
        const service = this.services[serviceKey];
        
        if (service.processRef) {
            service.processRef.kill('SIGTERM');
            console.log(`Stopped ${service.name}`);
        }
    }

    async runFullDiagnostics() {
        const diagnosticResults = {};

        // Test each service
        for (const [key, service] of Object.entries(this.services)) {
            try {
                // Check port availability
                const portInUse = await this.checkPortInUse(service.port);
                
                if (!portInUse) {
                    // Start the service if not running
                    await this.startService(key);
                }

                // Perform connection test based on service type
                let connectionTest;
                if (key === 'websocketServer') {
                    connectionTest = await this.testWebSocketConnection(`ws://localhost:${service.port}`);
                } else {
                    connectionTest = await new Promise((resolve) => {
                        const testSocket = new net.Socket();
                        testSocket.setTimeout(3000);
                        
                        testSocket.connect(service.port, 'localhost', () => {
                            testSocket.destroy();
                            resolve({ connected: true });
                        });
                        
                        testSocket.on('error', () => {
                            testSocket.destroy();
                            resolve({ connected: false });
                        });
                        
                        testSocket.on('timeout', () => {
                            testSocket.destroy();
                            resolve({ connected: false, reason: 'Connection Timeout' });
                        });
                    });
                }

                diagnosticResults[key] = {
                    name: service.name,
                    port: service.port,
                    ...connectionTest
                };
            } catch (error) {
                diagnosticResults[key] = {
                    name: service.name,
                    connected: false,
                    error: error.message
                };
            }
        }

        // Generate comprehensive diagnostic report
        const fullReport = {
            timestamp: new Date().toISOString(),
            results: diagnosticResults,
            summary: {
                totalServices: Object.keys(this.services).length,
                connectedServices: Object.values(diagnosticResults).filter(r => r.connected).length
            }
        };

        // Write diagnostic report
        const reportPath = path.join(__dirname, '..', 'logs', 'full_diagnostic_report.json');
        
        try {
            fs.writeFileSync(reportPath, JSON.stringify(fullReport, null, 2));
        } catch (writeError) {
            console.error('Failed to write diagnostic report:', writeError);
        }

        console.log('Full Diagnostic Report:', JSON.stringify(fullReport.summary, null, 2));
        return fullReport;
    }
}

// Export the ServiceManager to enable importing in other scripts
module.exports = { ServiceManager };

// Run diagnostics and service management if script is run directly
if (require.main === module) {
    (async () => {
        const serviceManager = new ServiceManager();
        
        try {
            await serviceManager.runFullDiagnostics();
        } catch (error) {
            console.error('Diagnostic process failed:', error);
        }
    })();
}