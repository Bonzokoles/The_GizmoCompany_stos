/**
 * AgentsCreatorPanel  Build themed AI agents with personal knowledge bases
 * Workspace-based: domain templates, KB import, mini RAG, AI context generator
 */

import { useState, useEffect, useCallback } from 'react';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

//  Types (mirrored from backend) 

interface AgentWorkspace {
  id: string;
  name: string;
  domain: string;
  model: string;
  description: string;
  systemPrompt: string;
  knowledgeFiles: number;
  ragIndexed: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentKBFile {
  name: string;
  path: string;
  size: number;
  type: 'local' | 'imported' | 'web';
  source?: string;
  addedAt: string;
}

interface DomainTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  suggestedTopics: string[];
  systemPromptTemplate: string;
  promptSnippets: Array<{ name: string; prompt: string }>;
}

interface PromptSnippet {
  name: string;
  prompt: string;
}

type ActiveTab = 'workspaces' | 'knowledge' | 'prompts' | 'rag' | 'ai';

interface Props {
  onClose: () => void;
}

export function AgentsCreatorPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('workspaces');
  const [status, setStatus] = useState<string | null>(null);

  // Workspaces
  const [workspaces, setWorkspaces] = useState<AgentWorkspace[]>([]);
  const [selectedWs, setSelectedWs] = useState<AgentWorkspace | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [templates, setTemplates] = useState<DomainTemplate[]>([]);
  const [newWs, setNewWs] = useState({ name: '', domain: '', model: 'gemini-2.0-flash', description: '' });

  // Knowledge
  const [kbFiles, setKbFiles] = useState<AgentKBFile[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [importUrl, setImportUrl] = useState('');
  const [importTopicId, setImportTopicId] = useState('');

  // Prompts
  const [systemPrompt, setSystemPrompt] = useState('');
  const [snippets, setSnippets] = useState<PromptSnippet[]>([]);
  const [newSnippet, setNewSnippet] = useState({ name: '', prompt: '' });

  // RAG
  const [ragQuery, setRagQuery] = useState('');
  const [ragResults, setRagResults] = useState<Array<{ filePath: string; fileName: string; snippet: string; rank: number }>>([]);

  // AI Context
  const [aiContext, setAiContext] = useState('');

  //  Data Loading 

  const loadWorkspaces = useCallback(async () => {
    if (!isElectron) return;
    try {
      const [ws, tpl] = await Promise.all([
        window.electronAPI.agentsCreator.listWorkspaces(),
        window.electronAPI.agentsCreator.getDomainTemplates(),
      ]);
      setWorkspaces(ws);
      setTemplates(tpl);
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  }, []);

  useEffect(() => { loadWorkspaces(); }, [loadWorkspaces]);

  const loadWorkspaceData = useCallback(async (agentId: string) => {
    if (!isElectron) return;
    try {
      const [files, snips] = await Promise.all([
        window.electronAPI.agentsCreator.getKBFiles(agentId),
        window.electronAPI.agentsCreator.getPromptSnippets(agentId),
      ]);
      setKbFiles(files);
      setSnippets(snips);
      setFileContent(null);
      setSelectedFile(null);
    } catch { /* skip */ }
  }, []);

  //  Workspace Actions 

  const handleSelectWorkspace = async (ws: AgentWorkspace) => {
    setSelectedWs(ws);
    setSystemPrompt(ws.systemPrompt);
    setActiveTab('knowledge');
    await loadWorkspaceData(ws.id);
  };

  const handleCreateWorkspace = async () => {
    if (!newWs.name.trim()) return;
    setStatus('\u23f3 Tworzenie workspace...');
    try {
      const res = await window.electronAPI.agentsCreator.createWorkspace(newWs);
      if (res.success && res.data) {
        setStatus('\u2705 Workspace "' + res.data.name + '" utworzony');
        setShowCreate(false);
        setNewWs({ name: '', domain: '', model: 'gemini-2.0-flash', description: '' });
        await loadWorkspaces();
        await handleSelectWorkspace(res.data);
      } else {
        setStatus('\u274c ' + (res.error || 'Blad'));
      }
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleDeleteWorkspace = async (agentId: string) => {
    if (!confirm('Usunac workspace "' + agentId + '" i wszystkie jego dane?')) return;
    try {
      await window.electronAPI.agentsCreator.deleteWorkspace(agentId);
      setStatus('\ud83d\uddd1 Workspace usuniety');
      setSelectedWs(null);
      setActiveTab('workspaces');
      await loadWorkspaces();
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  //  Knowledge Actions 

  const handleReadFile = async (fileName: string) => {
    if (!selectedWs) return;
    setSelectedFile(fileName);
    try {
      const content = await window.electronAPI.agentsCreator.readKBFile(selectedWs.id, fileName);
      setFileContent(content || 'Nie mozna odczytac pliku');
    } catch {
      setFileContent('Blad odczytu');
    }
  };

  const handleImportFromTopic = async () => {
    if (!selectedWs || !importTopicId) return;
    setStatus('\u23f3 Import z tematu ' + importTopicId + '...');
    try {
      const res = await window.electronAPI.agentsCreator.importFromTopic(selectedWs.id, importTopicId);
      if (res.success && res.data) {
        setStatus('\u2705 Zaimportowano ' + res.data.imported + ' plikow (bledy: ' + res.data.errors + ')');
        await loadWorkspaceData(selectedWs.id);
      } else {
        setStatus('\u274c ' + (res.error || 'Blad'));
      }
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleImportFromUrl = async () => {
    if (!selectedWs || !importUrl.trim()) return;
    setStatus('\u23f3 Pobieranie z URL...');
    try {
      const res = await window.electronAPI.agentsCreator.importFromUrl(selectedWs.id, importUrl);
      if (res.success && res.data) {
        setStatus('\u2705 Pobrano: ' + res.data.name + ' (' + (res.data.size / 1024).toFixed(1) + ' KB)');
        setImportUrl('');
        await loadWorkspaceData(selectedWs.id);
      } else {
        setStatus('\u274c ' + (res.error || 'Blad'));
      }
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleRemoveFile = async (fileName: string) => {
    if (!selectedWs) return;
    try {
      await window.electronAPI.agentsCreator.removeKBFile(selectedWs.id, fileName);
      setStatus('\ud83d\uddd1 Ussunieto: ' + fileName);
      await loadWorkspaceData(selectedWs.id);
      if (selectedFile === fileName) { setFileContent(null); setSelectedFile(null); }
    } catch { /* skip */ }
  };

  //  Prompt Actions 

  const handleSaveSystemPrompt = async () => {
    if (!selectedWs) return;
    try {
      await window.electronAPI.agentsCreator.updateWorkspace(selectedWs.id, { systemPrompt });
      setSelectedWs(prev => prev ? { ...prev, systemPrompt } : null);
      setStatus('\u2705 System prompt zapisany');
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleAddSnippet = async () => {
    if (!selectedWs || !newSnippet.name.trim()) return;
    try {
      await window.electronAPI.agentsCreator.addPromptSnippet(selectedWs.id, newSnippet);
      setNewSnippet({ name: '', prompt: '' });
      const snips = await window.electronAPI.agentsCreator.getPromptSnippets(selectedWs.id);
      setSnippets(snips);
      setStatus('\u2705 Snippet dodany');
    } catch { /* skip */ }
  };

  //  RAG Actions 

  const handleIndexRag = async () => {
    if (!selectedWs) return;
    setStatus('\u23f3 Indeksowanie RAG...');
    try {
      const res = await window.electronAPI.agentsCreator.indexRag(selectedWs.id);
      if (res.success && res.data) {
        setStatus('\u2705 Zaindeksowano ' + res.data.indexed + ' plikow (bledy: ' + res.data.errors + ')');
      } else {
        setStatus('\u274c ' + (res.error || 'Blad'));
      }
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleSearchRag = async () => {
    if (!selectedWs || !ragQuery.trim()) return;
    setStatus('\ud83d\udd0d Szukam w RAG...');
    try {
      const results = await window.electronAPI.agentsCreator.searchRag(selectedWs.id, ragQuery);
      setRagResults(results);
      setStatus('\u2705 Znaleziono ' + results.length + ' wynikow');
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  //  AI Context 

  const handleGenerateContext = async () => {
    if (!selectedWs) return;
    setStatus('\u23f3 Generowanie kontekstu AI...');
    try {
      const ctx = await window.electronAPI.agentsCreator.generateContext(selectedWs.id);
      setAiContext(ctx);
      setStatus('\u2705 Kontekst wygenerowany (' + ctx.length + ' znakow)');
    } catch (err: any) {
      setStatus('\u274c ' + err.message);
    }
  };

  const handleCopyContext = () => {
    navigator.clipboard.writeText(aiContext);
    setStatus('\ud83d\udccb Skopiowano do schowka');
  };

  //  Tab config 

  const TABS: { id: ActiveTab; label: string; icon: string; needsWs: boolean }[] = [
    { id: 'workspaces', label: 'Agenci', icon: '\ud83e\uddd1\u200d\ud83d\udcbb', needsWs: false },
    { id: 'knowledge', label: 'Wiedza', icon: '\ud83d\udcda', needsWs: true },
    { id: 'prompts', label: 'Prompty', icon: '\u270d\ufe0f', needsWs: true },
    { id: 'rag', label: 'RAG', icon: '\ud83e\udde0', needsWs: true },
    { id: 'ai', label: 'AI Asystent', icon: '\u2728', needsWs: true },
  ];

  // Known KB topics for import
  const KB_TOPICS = [
    '01_AI_SEO', '02_WHITECAT_SYSTEM', '03_PYTHON_AUTOMATION', '04_ECOMMERCE_SHOPS',
    '05_AGENTS_AND_RAG', '06_FINANCE', '07_B2B_SALES', '08_MARKETPLACE',
    '09_BUY_AND_SELL', '10_MARKET_ANALYSIS', '11_OPPORTUNITIES', '12_FORECASTING',
    '13_AI_NEWS', '14_BLOG_TOPICS', '15_READY_ARTICLES', '16_PROMPT_LIBRARY',
    '17_AGENT_KNOWLEDGE', '18_MCP_TOOLS', '19_PROJECT_PLANS', '20_TRAINING_CORPUS',
  ];

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>\ud83e\uddd1\u200d\ud83d\udcbb</span>
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Agents Creator</span>
          {selectedWs && (
            <span style={{ fontSize: '12px', color: '#64ffda' }}>\u2014 {selectedWs.name}</span>
          )}
        </div>
        <button onClick={onClose} style={closeBtnStyle}>\u2715</button>
      </div>

      {/* Status */}
      {status && <div style={{ padding: '4px 12px', fontSize: '12px', color: '#64ffda' }}>{status}</div>}

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              if (tab.needsWs && !selectedWs) {
                setStatus('\u26a0\ufe0f Najpierw wybierz workspace');
                return;
              }
              setActiveTab(tab.id);
            }}
            style={{
              ...tabBtnStyle,
              borderBottom: activeTab === tab.id ? '2px solid #64ffda' : '2px solid transparent',
              color: activeTab === tab.id ? '#64ffda' : (tab.needsWs && !selectedWs ? '#3a4a6a' : '#8892b0'),
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>

        {/*  WORKSPACES TAB  */}
        {activeTab === 'workspaces' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button onClick={() => setShowCreate(v => !v)} style={actionBtn}>
                \u2795 Nowy agent workspace
              </button>
              {selectedWs && (
                <button onClick={() => { setSelectedWs(null); setActiveTab('workspaces'); }} style={{ ...actionBtn, background: '#1a365d' }}>
                  \u21a9 Deselect
                </button>
              )}
            </div>

            {showCreate && (
              <div style={formSection}>
                <input
                  value={newWs.name}
                  onChange={e => setNewWs(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nazwa agenta (np. Finance Expert)"
                  style={inputStyle}
                />
                <input
                  value={newWs.description}
                  onChange={e => setNewWs(p => ({ ...p, description: e.target.value }))}
                  placeholder="Opis..."
                  style={{ ...inputStyle, marginTop: '4px' }}
                />
                <select
                  value={newWs.model}
                  onChange={e => setNewWs(p => ({ ...p, model: e.target.value }))}
                  style={{ ...inputStyle, marginTop: '4px' }}
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="deepseek-r1">DeepSeek R1</option>
                  <option value="qwen-2.5-14b">Qwen 2.5 14B</option>
                </select>

                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8892b0' }}>Domena (szablon):</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setNewWs(p => ({ ...p, domain: tpl.id }))}
                      style={{
                        ...tagBtn,
                        background: newWs.domain === tpl.id ? '#1a365d' : '#0d2137',
                        borderColor: newWs.domain === tpl.id ? '#64ffda' : '#233554',
                      }}
                    >
                      {tpl.icon} {tpl.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setNewWs(p => ({ ...p, domain: 'custom' }))}
                    style={{
                      ...tagBtn,
                      background: newWs.domain === 'custom' ? '#1a365d' : '#0d2137',
                      borderColor: newWs.domain === 'custom' ? '#64ffda' : '#233554',
                    }}
                  >
                    \ud83c\udfaf Custom
                  </button>
                </div>

                {newWs.domain && templates.find(t => t.id === newWs.domain) && (
                  <div style={{ marginTop: '6px', fontSize: '11px', color: '#4a5568' }}>
                    Sugerowane bazy wiedzy: {templates.find(t => t.id === newWs.domain)!.suggestedTopics.join(', ')}
                  </div>
                )}

                <button onClick={handleCreateWorkspace} style={{ ...actionBtn, marginTop: '8px' }}>
                  \ud83d\ude80 Utworz workspace
                </button>
              </div>
            )}

            {/* Workspace list */}
            {workspaces.map(ws => (
              <div
                key={ws.id}
                onClick={() => handleSelectWorkspace(ws)}
                style={{
                  ...cardStyle,
                  borderLeft: selectedWs?.id === ws.id ? '3px solid #64ffda' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}>
                    {templates.find(t => t.id === ws.domain)?.icon || '\ud83c\udfaf'} {ws.name}
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <span style={{ fontSize: '10px', color: '#4a5568' }}>{ws.model}</span>
                    <button
                      onClick={e => { e.stopPropagation(); handleDeleteWorkspace(ws.id); }}
                      style={{ ...smallActionBtn, color: '#ff6b6b', fontSize: '11px' }}
                      title="Usun"
                    >
                      \ud83d\uddd1
                    </button>
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{ws.description}</div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '10px', color: '#4a5568' }}>
                  <span>\ud83d\udcda {ws.knowledgeFiles} plikow</span>
                  <span>{ws.ragIndexed ? '\u2705 RAG' : '\u26a0\ufe0f brak RAG'}</span>
                  <span>\ud83d\udcc5 {ws.updatedAt.split('T')[0]}</span>
                </div>
              </div>
            ))}

            {workspaces.length === 0 && !showCreate && (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: '30px' }}>
                Brak workspace\u2019ow. Kliknij \u2795 zeby utworzyc pierwszego agenta.
              </div>
            )}
          </div>
        )}

        {/*  KNOWLEDGE TAB  */}
        {activeTab === 'knowledge' && selectedWs && (
          <div>
            {/* Import section */}
            <div style={formSection}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '6px' }}>
                \ud83d\udce5 Import wiedzy
              </div>

              {/* From topic */}
              <div style={{ display: 'flex', gap: '4px', marginBottom: '6px' }}>
                <select
                  value={importTopicId}
                  onChange={e => setImportTopicId(e.target.value)}
                  style={{ ...inputStyle, flex: 1 }}
                >
                  <option value="">-- Wybierz temat z Knowledge Base --</option>
                  {KB_TOPICS.map(t => (
                    <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                  ))}
                </select>
                <button onClick={handleImportFromTopic} style={actionBtn} disabled={!importTopicId}>
                  \ud83d\udce6 Import
                </button>
              </div>

              {/* From URL */}
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  value={importUrl}
                  onChange={e => setImportUrl(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleImportFromUrl()}
                  placeholder="https://... (pobierz z internetu)"
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={handleImportFromUrl} style={actionBtn} disabled={!importUrl.trim()}>
                  \ud83c\udf10 Pobierz
                </button>
              </div>
            </div>

            {/* File list */}
            <div style={{ marginTop: '8px' }}>
              <div style={{ fontSize: '13px', color: '#ccd6f6', marginBottom: '4px' }}>
                \ud83d\udcc2 Pliki wiedzy ({kbFiles.length})
              </div>
              {kbFiles.map((f, i) => (
                <div
                  key={i}
                  style={{
                    ...fileItemStyle,
                    background: selectedFile === f.name ? '#1a365d' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span
                      onClick={() => handleReadFile(f.name)}
                      style={{ cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', flex: 1 }}
                    >
                      \ud83d\udcc4 {f.name}
                    </span>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#4a5568' }}>
                        {(f.size / 1024).toFixed(1)} KB
                      </span>
                      {f.type === 'web' && <span style={typeBadge}>\ud83c\udf10</span>}
                      {f.type === 'imported' && <span style={typeBadge}>\ud83d\udce6</span>}
                      <button
                        onClick={() => handleRemoveFile(f.name)}
                        style={{ ...smallActionBtn, color: '#ff6b6b' }}
                      >
                        \u2715
                      </button>
                    </div>
                  </div>
                  {f.source && (
                    <div style={{ fontSize: '10px', color: '#3a4a6a', marginTop: '1px' }}>
                      {f.source.length > 80 ? f.source.substring(0, 80) + '...' : f.source}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* File preview */}
            {fileContent && (
              <div style={{ borderTop: '1px solid #233554', marginTop: '8px', paddingTop: '8px' }}>
                <div style={{ fontSize: '13px', color: '#64ffda', marginBottom: '4px' }}>
                  \ud83d\udc41 {selectedFile}
                </div>
                <pre style={previewStyle}>{fileContent.substring(0, 6000)}</pre>
              </div>
            )}
          </div>
        )}

        {/*  PROMPTS TAB  */}
        {activeTab === 'prompts' && selectedWs && (
          <div>
            {/* System prompt */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                \ud83e\udde0 System Prompt
              </div>
              <textarea
                value={systemPrompt}
                onChange={e => setSystemPrompt(e.target.value)}
                style={{ ...inputStyle, minHeight: '120px', resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }}
              />
              <button onClick={handleSaveSystemPrompt} style={{ ...actionBtn, marginTop: '4px' }}>
                \ud83d\udcbe Zapisz prompt
              </button>
            </div>

            {/* Snippets */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                \ud83d\udccb Szablony prompt\u00f3w ({snippets.length})
              </div>
              {snippets.map((s, i) => (
                <div key={i} style={snippetCard}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ccd6f6' }}>{s.name}</div>
                  <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{s.prompt}</div>
                  <button
                    onClick={() => navigator.clipboard.writeText(s.prompt)}
                    style={{ ...smallActionBtn, marginTop: '4px' }}
                  >
                    \ud83d\udccb Kopiuj
                  </button>
                </div>
              ))}

              {/* Add snippet */}
              <div style={{ ...formSection, marginTop: '8px' }}>
                <input
                  value={newSnippet.name}
                  onChange={e => setNewSnippet(p => ({ ...p, name: e.target.value }))}
                  placeholder="Nazwa snippetu"
                  style={inputStyle}
                />
                <textarea
                  value={newSnippet.prompt}
                  onChange={e => setNewSnippet(p => ({ ...p, prompt: e.target.value }))}
                  placeholder="Tresc promptu..."
                  style={{ ...inputStyle, marginTop: '4px', minHeight: '50px', resize: 'vertical' }}
                />
                <button onClick={handleAddSnippet} style={{ ...actionBtn, marginTop: '4px' }} disabled={!newSnippet.name.trim()}>
                  \u2795 Dodaj snippet
                </button>
              </div>
            </div>
          </div>
        )}

        {/*  RAG TAB  */}
        {activeTab === 'rag' && selectedWs && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                \ud83d\uddc3 Mini RAG System
              </div>
              <div style={{ fontSize: '12px', color: '#8892b0', marginBottom: '8px' }}>
                Indeksuj pliki wiedzy agenta za pomoca FTS5 i przeszukuj je semantycznie.
                {selectedWs.ragIndexed
                  ? <span style={{ color: '#64ffda' }}> \u2705 Zaindeksowano</span>
                  : <span style={{ color: '#f7c948' }}> \u26a0\ufe0f Nie zaindeksowano</span>
                }
              </div>
              <button onClick={handleIndexRag} style={actionBtn}>
                \ud83d\udd04 Indeksuj wiedze ({kbFiles.length} plikow)
              </button>
            </div>

            {/* Search */}
            <div style={{ marginTop: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                \ud83d\udd0d Szukaj w RAG
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <input
                  value={ragQuery}
                  onChange={e => setRagQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearchRag()}
                  placeholder="Wpisz zapytanie..."
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button onClick={handleSearchRag} style={actionBtn}>\ud83d\udd0d</button>
              </div>
              {ragResults.map((r, i) => (
                <div key={i} style={searchResultStyle}>
                  <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ccd6f6' }}>\ud83d\udcc4 {r.fileName}</div>
                  <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{r.snippet}</div>
                  <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{r.filePath}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/*  AI ASSISTANT TAB  */}
        {activeTab === 'ai' && selectedWs && (
          <div>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                \u2728 AI Asystent  Kontekst agenta
              </div>
              <div style={{ fontSize: '12px', color: '#8892b0', marginBottom: '8px' }}>
                Wygeneruj kontekst z system promptu + baz wiedzy. Skopiuj go i uzyj w panelu AI
                lub zewnetrznym modelu, aby asystent pomogl skompletowac wiedze agenta.
              </div>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button onClick={handleGenerateContext} style={actionBtn}>
                  \ud83d\udcdd Generuj kontekst
                </button>
                {aiContext && (
                  <button onClick={handleCopyContext} style={{ ...actionBtn, background: '#1a365d' }}>
                    \ud83d\udccb Kopiuj do schowka
                  </button>
                )}
              </div>
            </div>

            {aiContext && (
              <pre style={{ ...previewStyle, maxHeight: '400px' }}>{aiContext}</pre>
            )}

            {/* Quick prompts for AI */}
            {snippets.length > 0 && (
              <div style={{ marginTop: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#ccd6f6', marginBottom: '4px' }}>
                  \ud83d\ude80 Szybkie prompty
                </div>
                {snippets.map((s, i) => (
                  <div key={i} style={{ ...snippetCard, cursor: 'pointer' }} onClick={() => navigator.clipboard.writeText(s.prompt)}>
                    <span style={{ fontWeight: 'bold', fontSize: '12px' }}>{s.name}</span>
                    <span style={{ fontSize: '11px', color: '#8892b0', marginLeft: '8px' }}>{s.prompt.substring(0, 60)}...</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

//  Styles 

const panelStyle: React.CSSProperties = {
  position: 'absolute', top: 0, right: 0, bottom: 0,
  width: '540px', background: '#0a192f', color: '#ccd6f6',
  display: 'flex', flexDirection: 'column',
  borderLeft: '1px solid #233554', zIndex: 200,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '8px 12px', borderBottom: '1px solid #233554', background: '#112240',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#8892b0',
  cursor: 'pointer', fontSize: '16px', padding: '4px',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex', gap: '2px', padding: '4px 12px',
  borderBottom: '1px solid #233554', flexWrap: 'wrap',
};

const tabBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  padding: '6px 8px', fontSize: '12px', transition: 'color 0.2s',
};

const actionBtn: React.CSSProperties = {
  background: '#112240', border: '1px solid #233554', color: '#64ffda',
  cursor: 'pointer', padding: '6px 10px', borderRadius: '4px', fontSize: '12px',
};

const smallActionBtn: React.CSSProperties = {
  background: 'transparent', border: 'none', cursor: 'pointer',
  color: '#64ffda', fontSize: '12px', padding: '2px 4px',
};

const inputStyle: React.CSSProperties = {
  background: '#0d2137', border: '1px solid #233554', color: '#ccd6f6',
  padding: '6px 8px', borderRadius: '4px', fontSize: '12px',
  width: '100%', boxSizing: 'border-box',
};

const formSection: React.CSSProperties = {
  background: '#112240', borderRadius: '6px', padding: '10px', marginBottom: '8px',
  border: '1px solid #233554',
};

const cardStyle: React.CSSProperties = {
  padding: '8px 10px', marginBottom: '4px', borderRadius: '4px',
  background: '#112240', cursor: 'pointer', transition: 'background 0.2s',
};

const tagBtn: React.CSSProperties = {
  background: '#0d2137', border: '1px solid #233554', color: '#a8b2d1',
  cursor: 'pointer', padding: '3px 8px', borderRadius: '12px', fontSize: '11px',
};

const fileItemStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: '3px', marginBottom: '2px',
  transition: 'background 0.15s',
};

const typeBadge: React.CSSProperties = {
  fontSize: '10px', padding: '1px 4px', borderRadius: '3px',
  background: '#1a365d', color: '#8892b0',
};

const previewStyle: React.CSSProperties = {
  background: '#0d2137', border: '1px solid #233554', borderRadius: '4px',
  padding: '8px', fontSize: '11px', color: '#a8b2d1', whiteSpace: 'pre-wrap',
  wordBreak: 'break-word', maxHeight: '300px', overflow: 'auto',
  fontFamily: 'Consolas, "Courier New", monospace',
};

const snippetCard: React.CSSProperties = {
  padding: '6px 8px', background: '#112240', borderRadius: '4px',
  marginBottom: '4px', border: '1px solid #233554',
};

const searchResultStyle: React.CSSProperties = {
  padding: '6px 8px', borderRadius: '3px', marginTop: '4px',
  background: '#112240', border: '1px solid #233554',
};
