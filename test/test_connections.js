const { ServiceManager } = require('../scripts/advanced_service_manager');

async function runDetailedConnectionTests() {
    const serviceManager = new ServiceManager();
    
    try {
        const diagnosticReport = await serviceManager.runFullDiagnostics();
        
        // Detailed logging and analysis
        console.log('Detailed Connection Test Results:');
        console.log(JSON.stringify(diagnosticReport, null, 2));
        
        // Calculate passed tests
        const passedTests = Object.values(diagnosticReport.results)
            .filter(result => result.connected).length;
        const totalTests = Object.keys(diagnosticReport.results).length;
        
        console.log(`Passed: ${passedTests}/${totalTests} tests`);
        
        // Write results to file
        const fs = require('fs');
        fs.writeFileSync(
            'U:\\WWW_Zen_BRo_wser_org3\\connection_test_results.json', 
            JSON.stringify({
                ...diagnosticReport,
                summary: {
                    passedTests,
                    totalTests,
                    timestamp: new Date().toISOString()
                }
            }, null, 2)
        );
        
        return diagnosticReport;
    } catch (error) {
        console.error('Connection tests failed:', error);
        throw error;
    }
}

// Run tests
runDetailedConnectionTests().catch(console.error);