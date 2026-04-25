const fs = require('fs');
const path = require('path');
const { exec, spawn } = require('child_process');

class ZenoBrowserStartupMonitor {
    constructor() {
        this.logFile = path.join(__dirname, '..', 'logs', 'zeno_browser_startup.log');
        this.configFile = path.join(__dirname, '..', 'WORKSPACE_META_DATA', 'ZADANIE_URUCHOMIENIE.md');
    }

    log(message) {
        const timestamp = new Date().toISOString();
        const logMessage = `${timestamp} - ${message}\n`;
        
        try {
            fs.appendFileSync(this.logFile, logMessage);
            console.log(message);
        } catch (error) {
            console.error('Logging failed:', error);
        }
    }

    async monitorStartup() {
        this.log('Starting ZENO Browser Startup Monitor');
        
        return new Promise((resolve, reject) => {
            const shortcutPath = 'C:\\Users\\Bonzo2\\Desktop\\ZENO Browser.lnk';
            
            // Execute the shortcut and monitor its behavior
            const startupProcess = exec(`start "" "${shortcutPath}"`, (error, stdout, stderr) => {
                if (error) {
                    this.log(`Startup execution error: ${error.message}`);
                    reject(error);
                    return;
                }
                
                this.log('Shortcut execution initiated');
                this.log(`STDOUT: ${stdout}`);
                this.log(`STDERR: ${stderr}`);
            });

            // Monitor process lifecycle
            let processTerminated = false;
            let terminationReason = '';

            // Track process termination
            startupProcess.on('exit', (code, signal) => {
                processTerminated = true;
                terminationReason = `Process exited - Code: ${code}, Signal: ${signal}`;
                this.log(terminationReason);
                resolve({
                    terminated: true,
                    code,
                    signal,
                    reason: terminationReason
                });
            });

            // Timeout to ensure we capture any immediate termination
            setTimeout(() => {
                if (!processTerminated) {
                    this.log('Startup process appears to be running');
                    resolve({
                        terminated: false,
                        reason: 'Process remained active'
                    });
                }
            }, 10000); // 10-second observation window
        });
    }

    async runFullDiagnostic() {
        try {
            const startupResult = await this.monitorStartup();
            
            // Write comprehensive report
            const reportPath = path.join(__dirname, '..', 'logs', 'zeno_browser_startup_report.json');
            fs.writeFileSync(reportPath, JSON.stringify({
                timestamp: new Date().toISOString(),
                ...startupResult
            }, null, 2));

            this.log('Full diagnostic completed');
            return startupResult;
        } catch (error) {
            this.log(`Diagnostic failed: ${error.message}`);
            throw error;
        }
    }
}

// Run the monitor if script is executed directly
if (require.main === module) {
    (async () => {
        const monitor = new ZenoBrowserStartupMonitor();
        try {
            await monitor.runFullDiagnostic();
        } catch (error) {
            console.error('Startup monitoring failed:', error);
        }
    })();

module.exports = ZenoBrowserStartupMonitor;