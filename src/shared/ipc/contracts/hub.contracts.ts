export interface HubQueryAgentRequest {
    agentId: string;
    prompt: string;
    context?: Record<string, unknown>;
}

export interface HubQueryAgentResponse {
    response: string;
    agentId: string;
}

export interface HubListAgentsResponse {
    agents: Array<{ id: string; name: string; status: string }>;
}