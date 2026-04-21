/**
 * PanelHost.tsx — renders all currently open floating panels
 *
 * Each panel gets its own Suspense fallback and ErrorBoundary so a crash
 * inside one panel never takes down the whole browser shell.
 */

import { Suspense } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { PANEL_BY_ID } from './panel-registry';
import type { PanelId, PanelContext } from './shell.types';

interface PanelHostProps {
  openPanels: Set<PanelId>;
  getContext: (id: PanelId) => PanelContext;
}

function PanelFallback() {
  return <div className="panel-loading">Ładowanie panelu...</div>;
}

export function PanelHost({ openPanels, getContext }: PanelHostProps) {
  if (openPanels.size === 0) return null;
  return (
    <>
      {[...openPanels].map((id) => {
        const entry = PANEL_BY_ID[id];
        if (!entry) return null;
        return (
          <Suspense key={id} fallback={<PanelFallback />}>
            <ErrorBoundary>
              {entry.render(getContext(id))}
            </ErrorBoundary>
          </Suspense>
        );
      })}
    </>
  );
}
