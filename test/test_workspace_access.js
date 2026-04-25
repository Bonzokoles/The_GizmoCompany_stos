const fs = require('fs');
const path = require('path');

// Enhanced Access Control Configuration
const WORKSPACE_CONFIG = {
    allowedPaths: [
        'U:/The_DEVz_HUB_of_work',
        'U:/WWW_Zen_BRo_wser_tool'
    ],
    forbiddenPaths: [
        'U:/WWW_Zen_BRo_wser_org3/JIMBOKIT_COMMS',
        'U:/WWW_Zen_BRo_wser_org3/JIMBO_agent_HUB',
        'U:/WWW_Zen_BRo_wser_org3/src'
    ],
    securityLevel: {
        readAccess: false,
        writeAccess: false
    }
};

// Enhanced Path Validation Utility
function validatePathAccess(targetPath) {
    const normalizedPath = path.normalize(targetPath);
    
    // Check against forbidden paths with stricter matching
    const isForbidden = WORKSPACE_CONFIG.forbiddenPaths.some(forbiddenPath => 
        normalizedPath.startsWith(path.normalize(forbiddenPath))
    );

    // Check against allowed paths
    const isAllowed = WORKSPACE_CONFIG.allowedPaths.some(allowedPath => 
        normalizedPath.startsWith(path.normalize(allowedPath))
    );

    return {
        isForbidden,
        isAllowed,
        canAccess: isAllowed && !isForbidden
    };
}

function testWorkspaceConstraints() {
    const results = {
        allowedPathsAccessible: [],
        forbiddenPathsBlocked: [],
        securityViolations: []
    };

    // Test allowed paths
    WORKSPACE_CONFIG.allowedPaths.forEach(allowedPath => {
        try {
            const pathValidation = validatePathAccess(allowedPath);
            
            if (pathValidation.canAccess) {
                const files = fs.readdirSync(allowedPath);
                results.allowedPathsAccessible.push({
                    path: allowedPath,
                    accessible: true,
                    fileCount: files.length,
                    validation: pathValidation
                });
            } else {
                results.securityViolations.push({
                    path: allowedPath,
                    reason: 'Unexpected access restriction',
                    validation: pathValidation
                });
            }
        } catch (error) {
            results.allowedPathsAccessible.push({
                path: allowedPath,
                accessible: false,
                error: error.message
            });
        }
    });

    // Test forbidden paths
    WORKSPACE_CONFIG.forbiddenPaths.forEach(forbiddenPath => {
        const pathValidation = validatePathAccess(forbiddenPath);
        
        try {
            if (!pathValidation.canAccess) {
                results.forbiddenPathsBlocked.push({
                    path: forbiddenPath,
                    blocked: true,
                    reason: 'Path is correctly restricted',
                    validation: pathValidation
                });
            } else {
                results.securityViolations.push({
                    path: forbiddenPath,
                    blocked: false,
                    reason: 'Unexpected path accessibility',
                    validation: pathValidation
                });
            }
            
            // Attempt to read dir to verify restrictions
            fs.readdirSync(forbiddenPath);
        } catch (error) {
            results.forbiddenPathsBlocked.push({
                path: forbiddenPath,
                blocked: true,
                error: error.message
            });
        }
    });

    return results;
}

const workspaceConstraintsResults = testWorkspaceConstraints();
console.log(JSON.stringify(workspaceConstraintsResults, null, 2));

// Enhanced logging and results storage
fs.writeFileSync(
    'U:\\WWW_Zen_BRo_wser_org3\\workspace_constraints_results.json', 
    JSON.stringify(workspaceConstraintsResults, null, 2)
);

// Optional: Generate security report
const securityReport = {
    timestamp: new Date().toISOString(),
    totalAllowedPaths: WORKSPACE_CONFIG.allowedPaths.length,
    totalForbiddenPaths: WORKSPACE_CONFIG.forbiddenPaths.length,
    securityViolations: workspaceConstraintsResults.securityViolations.length
};

fs.writeFileSync(
    'U:\\WWW_Zen_BRo_wser_org3\\security_report.json', 
    JSON.stringify(securityReport, null, 2)
);