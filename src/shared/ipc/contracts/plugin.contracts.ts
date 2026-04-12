export interface PluginLoadRequest {
    pluginId: string;
    configPath?: string;
}

export interface PluginLoadResponse {
    success: boolean;
    pluginId: string;
    error?: string;
}

export interface PluginListResponse {
    plugins: Array<{ id: string; name: string; active: boolean }>;
}

export interface PluginInvokeRequest {
    pluginId: string;
    method: string;
    args: unknown[];
}

export interface PluginInvokeResponse {
    result: unknown;
    error?: string;
}