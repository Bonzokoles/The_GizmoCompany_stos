/**
 * PanelHost.tsx — renders the currently active floating panel
 *
 * Wraps the panel in Suspense (lazy loading fallback) and an ErrorBoundary
 * so a crash inside one panel never takes down the whole browser shell.
 */

import { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PANEL_BY_ID } from './panel-registry';
import type { PanelId, PanelContext } from './shell.types';

interface PanelHostProps {
  /** Which panel to render — null means no panel */
  activePanel: PanelId | null;
  /** Shared context forwarded to every panel */
  ctx: PanelContext;
}

function PanelFallback() {
  return <div className="panel-loading">Ładowanie panelu...</div>;
}

export function PanelHost({ activePanel, ctx }: PanelHostProps) {
  if (!activePanel) return null;

  const entry = PANEL_BY_ID[activePanel];
  if (!entry) return null;

  return (
    <Suspense fallback={<PanelFallback />}>
      <ErrorBoundary>
        {entry.render(ctx)}
      </ErrorBoundary>
    </Suspense>
  );
}
