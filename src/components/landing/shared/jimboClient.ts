export const JIMBO_KIT =
  import.meta.env.VITE_JIMBO_KIT_URL ?? "http://localhost:3701";
export const JIMBO_HUB =
  import.meta.env.VITE_JIMBO_HUB_URL ?? "http://localhost:4223";
export const JIMBO_GW =
  import.meta.env.VITE_JIMBO_GW_URL ??
  "https://jimbo-gateway.stolarnia-ams.workers.dev";

/** true gdy JIMBO_HUB odpowiada (timeout 2s) */
export async function isJimboOnline(): Promise<boolean> {
  try {
    const response = await fetch(`${JIMBO_HUB}/status`, {
      method: "GET",
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** JIMbo_KIT REST chat (do 30s) */
export async function jimboChat(
  message: string,
  sessionId?: string,
): Promise<string> {
  try {
    const response = await fetch(`${JIMBO_KIT}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, session_id: sessionId }),
      signal: AbortSignal.timeout(30000),
    });

    const data = (await response.json()) as {
      content?: string;
      response?: string;
      message?: string;
      text?: string;
      output?: string;
      result?: string;
    };

    return (
      data.content ??
      data.response ??
      data.message ??
      data.text ??
      data.output ??
      data.result ??
      ""
    );
  } catch {
    return "";
  }
}

/** JIMbo_KIT WebSocket streaming - zwraca WebSocket */
export function jimboStream(
  message: string,
  sessionId: string,
  onChunk: (t: string) => void,
  onDone: (full: string) => void,
  onTool?: (tool: string, result: string) => void,
): WebSocket {
  const wsUrl = JIMBO_KIT.replace(/^http/i, "ws").replace(/\/$/, "");
  const socket = new WebSocket(wsUrl);
  let full = "";

  socket.onopen = () => {
    socket.send(
      JSON.stringify({
        type: "chat:message",
        payload: { message, session_id: sessionId },
      }),
    );
  };

  socket.onmessage = (event) => {
    try {
      const data = JSON.parse(String(event.data)) as {
        type?: string;
        payload?: {
          content?: string;
          tool?: string;
          result?: string;
        };
      };

      if (data.type === "chat:stream") {
        const chunk = data.payload?.content ?? "";
        full += chunk;
        onChunk(chunk);
      }

      if (data.type === "chat:tool_use" && onTool) {
        onTool(data.payload?.tool ?? "", data.payload?.result ?? "");
      }

      if (data.type === "chat:stream_end") {
        const endContent = data.payload?.content ?? "";
        if (endContent && !full.endsWith(endContent)) {
          full += endContent;
        }
        onDone(full);
      }
    } catch {
      // ignore malformed frames
    }
  };

  return socket;
}

/** JIMBO_HUB agent runner */
export async function hubAgentRun(task: string): Promise<string> {
  try {
    const response = await fetch(`${JIMBO_HUB}/agent/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions: task }),
      signal: AbortSignal.timeout(30000),
    });

    const data = (await response.json()) as {
      output?: string;
      result?: string;
      message?: string;
      taskId?: string;
    };

    return data.output ?? data.result ?? data.message ?? data.taskId ?? "";
  } catch {
    return "";
  }
}

/** JIMBO_gateway CF Worker */
export async function cfGateway<T = unknown>(
  path: string,
  body?: unknown,
  method = "POST",
): Promise<T | null> {
  try {
    const response = await fetch(
      `${JIMBO_GW}${path.startsWith("/") ? path : `/${path}`}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(30000),
      },
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as T;
    return data;
  } catch {
    return null;
  }
}
