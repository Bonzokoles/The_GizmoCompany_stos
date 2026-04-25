export interface ScriptOptions {
    scriptName: string;
    args?: string[];
    timeout?: number;
}

export interface SharedData {
    userId: string;
    sessionId: string;
    timestamp: Date;
}