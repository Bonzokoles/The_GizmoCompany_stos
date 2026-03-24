/**
 * Tab Bar Component — React 19 + typed props + ARIA
 */

import { memo, useCallback } from 'react';
import type { Tab } from '../../types/electron';

interface TabBarProps {
  tabs: Tab[];
  onTabClick: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onNewTab: () => void;
}

export const TabBar = memo(function TabBar({
  tabs,
  onTabClick,
  onTabClose,
  onNewTab,
}: TabBarProps) {
  const handleClose = useCallback(
    (e: React.MouseEvent, tabId: string) => {
      e.stopPropagation();
      onTabClose(tabId);
    },
    [onTabClose],
  );

  return (
    <nav className="tab-bar" role="tablist" aria-label="Zakładki przeglądarki">
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`tab ${tab.isActive ? 'active' : ''}`}
          role="tab"
          aria-selected={tab.isActive}
          tabIndex={tab.isActive ? 0 : -1}
          onClick={() => onTabClick(tab.id)}
          onKeyDown={(e) => e.key === 'Enter' && onTabClick(tab.id)}
        >
          <span className="tab-title">{tab.title || 'Nowa karta'}</span>
          <button
            className="btn-close-tab"
            onClick={(e) => handleClose(e, tab.id)}
            aria-label={`Zamknij kartę ${tab.title || 'Nowa karta'}`}
          >
            ×
          </button>
        </div>
      ))}
      <button className="btn-new-tab" onClick={onNewTab} aria-label="Nowa karta">
        +
      </button>
    </nav>
  );
});