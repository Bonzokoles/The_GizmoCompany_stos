#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..');

async function findFiles(pattern) {
    const { execSync } = await import('child_process');
    const cmd = `find "${ROOT}" -type f -name "${pattern}" 2>/dev/null || echo ""`;
    const output = execSync(cmd, { encoding: 'utf-8' });
    return output.trim().split('\n').filter(Boolean);
}

async function readFileIfExists(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf-8');
    } catch {
        return null;
    }
}

function extractToolIdsFromAgentsConfig(content) {
    const toolIds = [];
    const regex = /toolIds\s*:\s*\[([^\]]+)\]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const idsString = match[1];
        const ids = idsString.match(/['"]([^'"]+)['"]/g)?.map(id => id.replace(/['"]/g, '')) || [];
        toolIds.push(...ids);
    }
    return [...new Set(toolIds)];
}

function extractApiEndpointsFromHubServer(content) {
    const endpoints = [];
    // Pattern for app.METHOD('path', ...)
    const regex = /app\.(get|post|put|delete|patch)\s*\(\s*['"]([^'"]+)['"]/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        endpoints.push({ method, path });
    }
    return endpoints;
}

function extractFunctionsFromMoaPipeline(content) {
    const functions = [];
    // Function declarations
    const funcRegex = /(?:function\s+(\w+)\s*\(|const\s+(\w+)\s*=\s*(?:\([^)]*\)|\(\))\s*=>)/g;
    let match;
    while ((match = funcRegex.exec(content)) !== null) {
        const name = match[1] || match[2];
        functions.push(name);
    }
    // Exported functions
    const exportRegex = /export\s+(?:function\s+(\w+)|const\s+(\w+)|class\s+(\w+))/g;
    const exports = [];
    let exportMatch;
    while ((exportMatch = exportRegex.exec(content)) !== null) {
        const name = exportMatch[1] || exportMatch[2] || exportMatch[3];
        exports.push(name);
    }
    return { functions, exports };
}

async function main() {
    console.log('🔍 MOA Pipeline Tools Analysis');
    console.log('===============================');
    
    const report = {
        timestamp: new Date().toISOString(),
        root: ROOT,
        toolCategories: {}
    };
    
    // 1. Agents config toolIds
    const agentsConfigPath = path.join(ROOT, 'agents.config.ts');
    const agentsContent = await readFileIfExists(agentsConfigPath);
    if (agentsContent) {
        const toolIds = extractToolIdsFromAgentsConfig(agentsContent);
        report.toolCategories.agentTools = {
            source: 'agents.config.ts',
            description: 'Tool IDs defined for agents',
            tools: toolIds.map(id => ({
                id,
                type: 'agent_tool',
                enabled: true,
                permissions: ['agent_execution']
            }))
        };
        console.log(`✅ Agent toolIds: ${toolIds.length} found`);
    }
    
    // 2. Hub server API endpoints
    const hubServerPath = path.join(ROOT, 'JIMBO_agent_HUB', 'hub-server.ts');
    const hubContent = await readFileIfExists(hubServerPath);
    if (hubContent) {
        const endpoints = extractApiEndpointsFromHubServer(hubContent);
        report.toolCategories.apiEndpoints = {
            source: 'hub-server.ts',
            description: 'REST API endpoints exposed by JIMBO Agent HUB',
            tools: endpoints.map(ep => ({
                id: `${ep.method} ${ep.path}`,
                type: 'api_endpoint',
                enabled: true,
                permissions: ['http_access']
            }))
        };
        console.log(`✅ API endpoints: ${endpoints.length} found`);
    }
    
    // 3. MOA Pipeline functions
    const moaPath = path.join(__dirname, 'moa-pipeline.mjs');
    const moaContent = await readFileIfExists(moaPath);
    if (moaContent) {
        const { functions, exports } = extractFunctionsFromMoaPipeline(moaContent);
        report.toolCategories.moaFunctions = {
            source: 'moa-pipeline.mjs',
            description: 'Functions defined in MOA Pipeline',
            tools: functions.map(name => ({
                id: name,
                type: 'function',
                isExported: exports.includes(name),
                enabled: true,
                permissions: ['script_execution']
            }))
        };
        console.log(`✅ MOA functions: ${functions.length} found (${exports.length} exported)`);
    }
    
    // 4. Search for other tool definitions
    const toolFiles = await findFiles('*.ts');
    const toolFilesJs = await findFiles('*.js');
    const toolFilesMjs = await findFiles('*.mjs');
    const allFiles = [...toolFiles, ...toolFilesJs, ...toolFilesMjs].slice(0, 20); // Limit
    
    const otherTools = [];
    for (const file of allFiles) {
        if (file.includes('node_modules') || file.includes('.git')) continue;
        const content = await readFileIfExists(file);
        if (!content) continue;
        
        // Look for tool definitions: tools: { ... }
        const toolsMatch = content.match(/tools\s*:\s*{([^}]+(?:\{[^{}]*\}[^}]*)*)}/s);
        if (toolsMatch) {
            const relativePath = path.relative(ROOT, file);
            otherTools.push({
                file: relativePath,
                pattern: 'tools object'
            });
        }
        
        // Look for const tools = { ... }
        const constToolsMatch = content.match(/const\s+tools\s*=\s*{([^}]+(?:\{[^{}]*\}[^}]*)*)}/s);
        if (constToolsMatch) {
            const relativePath = path.relative(ROOT, file);
            otherTools.push({
                file: relativePath,
                pattern: 'const tools'
            });
        }
    }
    
    if (otherTools.length > 0) {
        report.toolCategories.otherToolDefinitions = {
            source: 'various files',
            description: 'Other tool definitions found in codebase',
            tools: otherTools.map(t => ({
                id: t.file,
                type: 'tool_definition',
                pattern: t.pattern,
                enabled: true
            }))
        };
        console.log(`✅ Other tool definitions: ${otherTools.length} found`);
    }
    
    // Calculate totals
    let totalTools = 0;
    for (const category of Object.values(report.toolCategories)) {
        totalTools += category.tools.length;
    }
    
    report.summary = {
        totalTools,
        categories: Object.keys(report.toolCategories).length,
        timestamp: new Date().toISOString()
    };
    
    // Output report
    console.log('\n📊 FINAL REPORT');
    console.log('===============');
    console.log(JSON.stringify(report, null, 2));
    
    // Save to file
    const reportPath = path.join(__dirname, 'check-moa-tools-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Report saved to: ${reportPath}`);
    
    return report;
}

main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
});
