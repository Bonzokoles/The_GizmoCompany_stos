export function runScripts(scriptName: string, options?: ScriptOptions) {
    switch (scriptName) {
        case 'script1':
            // Logic for script1
            break;
        case 'script2':
            // Logic for script2
            break;
        // Add more scripts as needed
        default:
            console.error(`Script "${scriptName}" not found.`);
    }
}