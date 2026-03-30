/**
 * CatalogBrowser — Local file library manager
 * Add/remove libraries, browse file trees, index content
 */

import { useState, useEffect, useCallback } from 'react';
import type { CatalogLibrary, CatalogTreeNode } from '../../types/electron';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

interface Props {
  onClose: () => void;
}

export function CatalogBrowser({ onClose }: Props) {
  const [libraries, setLibraries] = useState<CatalogLibrary[]>([]);
  const [selectedLib, setSelectedLib] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<CatalogTreeNode | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [stats, setStats] = useState<{ libraries: number; files: number; totalSize: number } | null>(null);

  // Add library form
  const [newName, setNewName] = useState('');
  const [newPath, setNewPath] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const loadLibraries = useCallback(async () => {
    if (!isElectron) return;
    const libs = await window.electronAPI.catalog.getLibraries();
    setLibraries(libs);
    const s = await window.electronAPI.catalog.getStats();
    setStats(s);
  }, []);

  useEffect(() => { loadLibraries(); }, [loadLibraries]);

  const handleAddLibrary = async () => {
    if (!newName.trim() || !newPath.trim()) return;
    const res = await window.electronAPI.catalog.addLibrary(newName, newPath);
    if (res.success) {
      setNewName('');
      setNewPath('');
      setShowAddForm(false);
      setStatus('✅ Biblioteka dodana');
      loadLibraries();
    } else {
      setStatus(`❌ ${res.error}`);
    }
  };

  const handleRemoveLibrary = async (id: string) => {
    await window.electronAPI.catalog.removeLibrary(id);
    if (selectedLib === id) {
      setSelectedLib(null);
      setFileTree(null);
    }
    setStatus('🗑️ Biblioteka usunięta');
    loadLibraries();
  };

  const handleIndex = async (id: string) => {
    setStatus('📇 Indeksowanie...');
    const res = await window.electronAPI.catalog.indexLibrary(id);
    if (res.success && res.data) {
      setStatus(`✅ Zaindeksowano ${res.data.indexed} plików (pominięto: ${res.data.skipped}, błędy: ${res.data.errors})`);
    } else {
      setStatus(`❌ ${res.error}`);
    }
    loadLibraries();
  };

  const handleIndexAll = async () => {
    setStatus('📇 Indeksowanie wszystkich bibliotek...');
    const res = await window.electronAPI.catalog.indexAll();
    if (res.success && res.data) {
      setStatus(`✅ Łącznie zaindeksowano ${res.data.total} plików (błędy: ${res.data.errors})`);
    } else {
      setStatus(`❌ ${res.error}`);
    }
    loadLibraries();
  };

  const handleSelectLib = async (id: string) => {
    setSelectedLib(id);
    setFileContent(null);
    setSelectedFile(null);
    const tree = await window.electronAPI.catalog.getFileTree(id);
    setFileTree(tree);
  };

  const handleFileClick = async (filePath: string) => {
    setSelectedFile(filePath);
    const res = await window.electronAPI.catalog.readFile(filePath);
    if (res.success && res.data) {
      setFileContent(res.data.content);
    } else {
      setFileContent('Nie można odczytać pliku');
    }
  };

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 'bold', fontSize: '16px' }}>📚 CatalogBrowser</span>
        <button onClick={onClose} style={closeBtnStyle}>✕</button>
      </div>

      {/* Stats */}
      {stats && (
        <div style={statsBar}>
          📁 {stats.libraries} bibl. | 📄 {stats.files} plików | 💾 {(stats.totalSize / 1024 / 1024).toFixed(1)} MB
        </div>
      )}

      {/* Status message */}
      {status && <div style={{ padding: '4px 12px', fontSize: '12px', color: '#64ffda' }}>{status}</div>}

      {/* Actions bar */}
      <div style={{ display: 'flex', gap: '4px', padding: '8px 12px' }}>
        <button onClick={() => setShowAddForm(v => !v)} style={actionBtn}>
          ➕ Dodaj bibliotekę
        </button>
        <button onClick={handleIndexAll} style={actionBtn}>
          📇 Indeksuj wszystko
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div style={{ padding: '8px 12px', borderBottom: '1px solid #233554' }}>
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nazwa biblioteki"
            style={inputStyle}
          />
          <input
            type="text"
            value={newPath}
            onChange={e => setNewPath(e.target.value)}
            placeholder="Ścieżka (np. C:\docs\moja-lib)"
            style={{ ...inputStyle, marginTop: '4px' }}
          />
          <button onClick={handleAddLibrary} style={{ ...actionBtn, marginTop: '6px' }}>💾 Zapisz</button>
        </div>
      )}

      {/* Libraries list */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '4px 12px' }}>
          {libraries.map(lib => (
            <div
              key={lib.id}
              style={{
                ...libCardStyle,
                borderLeft: selectedLib === lib.id ? '3px solid #64ffda' : '3px solid transparent',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span
                  style={{ cursor: 'pointer', color: '#ccd6f6', fontWeight: 'bold' }}
                  onClick={() => handleSelectLib(lib.id)}
                >
                  📁 {lib.name}
                </span>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button onClick={() => handleIndex(lib.id)} style={smallBtn} title="Indeksuj">📇</button>
                  <button onClick={() => handleRemoveLibrary(lib.id)} style={smallBtn} title="Usuń">🗑️</button>
                </div>
              </div>
              <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{lib.rootPath}</div>
              <div style={{ fontSize: '10px', color: '#4a5568' }}>{lib.extensions.join(', ')}</div>
            </div>
          ))}
        </div>

        {/* File tree */}
        {fileTree && (
          <div style={{ padding: '0 12px', borderTop: '1px solid #233554', marginTop: '8px' }}>
            <h4 style={{ color: '#64ffda', margin: '8px 0 4px' }}>Drzewo plików</h4>
            <TreeView node={fileTree} onFileClick={handleFileClick} depth={0} />
          </div>
        )}

        {/* File preview */}
        {selectedFile && fileContent !== null && (
          <div style={{ padding: '8px 12px', borderTop: '1px solid #233554', marginTop: '8px' }}>
            <h4 style={{ color: '#64ffda', margin: '0 0 4px' }}>📄 {selectedFile.split(/[/\\]/).pop()}</h4>
            <pre style={previewStyle}>{fileContent.substring(0, 5000)}</pre>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Tree view ──────────────────────────────────────────────────

function TreeView({ node, onFileClick, depth }: { node: CatalogTreeNode; onFileClick: (p: string) => void; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2);

  if (node.type === 'file') {
    return (
      <div
        style={{ paddingLeft: `${depth * 16}px`, cursor: 'pointer', padding: '2px 0', fontSize: '12px', color: '#a8b2d1' }}
        onClick={() => onFileClick(node.path)}
      >
        📄 {node.name} {node.size ? <span style={{ color: '#4a5568' }}>({(node.size / 1024).toFixed(1)}KB)</span> : null}
      </div>
    );
  }

  return (
    <div style={{ paddingLeft: `${depth * 16}px` }}>
      <div
        style={{ cursor: 'pointer', padding: '2px 0', fontSize: '12px', color: '#ccd6f6', fontWeight: 'bold' }}
        onClick={() => setExpanded(v => !v)}
      >
        {expanded ? '📂' : '📁'} {node.name}
      </div>
      {expanded && node.children?.map((child, i) => (
        <TreeView key={i} node={child} onFileClick={onFileClick} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────

const panelStyle: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  right: 0,
  width: '480px',
  height: '100%',
  background: '#0a192f',
  borderLeft: '1px solid #233554',
  display: 'flex',
  flexDirection: 'column',
  zIndex: 100,
  color: '#ccd6f6',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '10px 12px',
  borderBottom: '1px solid #233554',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#8892b0',
  cursor: 'pointer',
  fontSize: '18px',
};

const statsBar: React.CSSProperties = {
  padding: '6px 12px',
  fontSize: '12px',
  color: '#8892b0',
  background: '#112240',
  borderBottom: '1px solid #233554',
};

const actionBtn: React.CSSProperties = {
  background: '#1a365d',
  border: '1px solid #233554',
  borderRadius: '4px',
  color: '#64ffda',
  cursor: 'pointer',
  padding: '6px 10px',
  fontSize: '12px',
};

const smallBtn: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  cursor: 'pointer',
  fontSize: '14px',
  padding: '2px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#112240',
  border: '1px solid #233554',
  borderRadius: '4px',
  color: '#ccd6f6',
  padding: '6px 10px',
  fontSize: '13px',
  outline: 'none',
  boxSizing: 'border-box',
};

const libCardStyle: React.CSSProperties = {
  background: '#112240',
  borderRadius: '6px',
  padding: '8px 10px',
  marginBottom: '6px',
};

const previewStyle: React.CSSProperties = {
  background: '#112240',
  borderRadius: '4px',
  padding: '8px',
  fontSize: '11px',
  color: '#a8b2d1',
  overflow: 'auto',
  maxHeight: '200px',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
