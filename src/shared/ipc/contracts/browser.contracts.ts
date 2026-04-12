export interface BrowserNavigateRequest {
    tabId?: string;
    url: string;
}

export interface BrowserNavigateResponse {
    success: boolean;
    finalUrl?: string;
    error?: string;
}

export interface BrowserOpenTabRequest {
    url?: string;
}

export interface BrowserOpenTabResponse {
    success: boolean;
    tabId?: string;
    error?: string;
}

export interface BrowserCloseTabRequest {
    tabId: string;
}

export interface BrowserCloseTabResponse {
    success: boolean;
}

export interface BrowserGetTabsResponse {
    success: boolean;
    tabs?: unknown[];
    error?: string;
}