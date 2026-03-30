/**
 * SidebarOverlay — Collapsible left sidebar available on any page
 * Reuses CATEGORIES from StartPage, slides in from left with backdrop
 */

import { useState, useCallback } from 'react';
import { CATEGORIES } from './StartPage';
import type { Category } from './StartPage';

interface SidebarOverlayProps {
  onNavigate: (url: string) => void;
  onClose: () => void;
}

export function SidebarOverlay({ onNavigate, onClose }: SidebarOverlayProps) {
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const activeCat: Category | undefined = CATEGORIES.find(c => c.id === openCategory);

  const handleLinkClick = useCallback(
    (url: string) => {
      onNavigate(url);
      onClose();
    },
    [onNavigate, onClose]
  );

  return (
    <>
      <style>{`
        @keyframes sidebarIn {
          from { transform: translateX(-100%); opacity: 0; }
          to   { transform: translateX(0);     opacity: 1; }
        }
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        .sb-btn:active { transform: scale(0.97); }
        .sb-item:active { transform: scale(0.96); }
      `}</style>
    <div style={{ ...styles.backdrop, animation: 'backdropIn 150ms ease-out' }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ ...styles.sidebar, animation: 'sidebarIn 200ms cubic-bezier(0.23, 1, 0.32, 1)' }}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.brand}>☰ Menu</span>
          <button
            className="sb-btn"
            onClick={onClose}
            style={styles.closeBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#ffffff15'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            ✕
          </button>
        </div>

        {/* Quick Links */}
        <div style={styles.quickLinks}>
          <button
            className="sb-btn"
            onClick={() => handleLinkClick('file:///C:/Users/Bonzo2/Desktop/TOOLS_CATALOG.html')}
            style={styles.quickLinkBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4f8ef720'; (e.currentTarget as HTMLElement).style.borderColor = '#4f8ef7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16162e'; (e.currentTarget as HTMLElement).style.borderColor = '#2a2a4a'; }}
          >
            📋 Katalog Narzędzi
          </button>
          <button
            className="sb-btn"
            onClick={() => handleLinkClick('zeno://analytics')}
            style={styles.quickLinkBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4f8ef720'; (e.currentTarget as HTMLElement).style.borderColor = '#4f8ef7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16162e'; (e.currentTarget as HTMLElement).style.borderColor = '#2a2a4a'; }}
          >
            📊 Analytics (Umami)
          </button>
          <button
            className="sb-btn"
            onClick={() => handleLinkClick('zeno://search')}
            style={styles.quickLinkBtn}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#4f8ef720'; (e.currentTarget as HTMLElement).style.borderColor = '#4f8ef7'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#16162e'; (e.currentTarget as HTMLElement).style.borderColor = '#2a2a4a'; }}
          >
            🔍 Wyszukiwarka
          </button>
        </div>

        {/* Category list */}
        <div style={styles.categoryList}>
          {CATEGORIES.map(cat => (
            <div key={cat.id}>
              <button
                onClick={() => setOpenCategory(openCategory === cat.id ? null : cat.id)}
                style={{
                  ...styles.catBtn,
                  borderLeft: openCategory === cat.id ? `3px solid ${cat.color}` : '3px solid transparent',
                  color: openCategory === cat.id ? cat.color : '#aaaacc',
                  background: openCategory === cat.id ? cat.color + '12' : 'transparent',
                }}
                onMouseEnter={e => {
                  if (openCategory !== cat.id) {
                    (e.currentTarget as HTMLElement).style.background = '#ffffff08';
                    (e.currentTarget as HTMLElement).style.color = cat.color;
                  }
                }}
                onMouseLeave={e => {
                  if (openCategory !== cat.id) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = '#aaaacc';
                  }
                }}
              >
                {cat.title}
              </button>

              {/* Expanded items inline */}
              {openCategory === cat.id && activeCat && (
                <div style={styles.itemList}>
                  {activeCat.items.map(item => (
                    <button
                      key={item.url}
                      className="sb-item"
                      onClick={() => handleLinkClick(item.url)}
                      style={{ ...styles.itemBtn, borderColor: cat.color + '30' }}
                      onMouseEnter={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = cat.color;
                        (e.currentTarget as HTMLElement).style.background = cat.color + '18';
                        (e.currentTarget as HTMLElement).style.color = '#ffffff';
                      }}
                      onMouseLeave={e => {
                        (e.currentTarget as HTMLElement).style.borderColor = cat.color + '30';
                        (e.currentTarget as HTMLElement).style.background = '#16162e';
                        (e.currentTarget as HTMLElement).style.color = '#ccccdd';
                      }}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
    </>
  );
}

const styles: Record<string, React.CSSProperties> = {
  backdrop: {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 50,
    display: 'flex',
  },
  sidebar: {
    width: 260,
    height: '100%',
    background: '#0d0d1a',
    borderRight: '1px solid #1a1a35',
    display: 'flex',
    flexDirection: 'column' as const,
    boxShadow: '4px 0 24px rgba(0, 0, 0, 0.5)',
    overflowY: 'auto' as const,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    borderBottom: '1px solid #1a1a35',
    flexShrink: 0,
  },
  brand: {
    fontSize: 14,
    fontWeight: 700,
    color: '#00d4ff',
    letterSpacing: 0.5,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#888',
    fontSize: 14,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: 4,
    transition: 'background 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
  },
  categoryList: {
    flex: 1,
    padding: '8px 0',
    overflowY: 'auto' as const,
  },
  quickLinks: {
    padding: '10px 14px 2px',
    borderBottom: '1px solid #1a1a35',
  },
  quickLinkBtn: {
    display: 'block',
    width: '100%',
    padding: '7px 12px',
    fontSize: 13,
    fontWeight: 600,
    color: '#4f8ef7',
    background: '#16162e',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    cursor: 'pointer',
    textAlign: 'left' as const,
    transition: 'background 150ms ease-out, border-color 150ms ease-out, transform 150ms ease-out',
    marginBottom: 8,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  catBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 500,
    background: 'transparent',
    border: 'none',
    borderRadius: 0,
    cursor: 'pointer',
    transition: 'background 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    whiteSpace: 'nowrap' as const,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
  itemList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: 6,
    padding: '6px 14px 10px 20px',
  },
  itemBtn: {
    padding: '4px 10px',
    fontSize: 12,
    fontWeight: 500,
    color: '#ccccdd',
    background: '#16162e',
    border: '1px solid #2a2a4a',
    borderRadius: 4,
    cursor: 'pointer',
    transition: 'background 150ms ease-out, border-color 150ms ease-out, color 150ms ease-out, transform 150ms ease-out',
    whiteSpace: 'nowrap' as const,
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
  },
};
