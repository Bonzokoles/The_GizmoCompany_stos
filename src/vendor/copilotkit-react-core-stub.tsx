import type { ReactNode } from 'react';

export function CopilotKit({ children }: { children: ReactNode; runtimeUrl?: string }) {
  return <>{children}</>;
}

export function useCopilotAction(_config: unknown): void {
  // no-op stub for web/CF Pages builds
}
