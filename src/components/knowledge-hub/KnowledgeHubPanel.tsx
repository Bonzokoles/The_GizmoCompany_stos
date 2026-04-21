/**
 * KnowledgeHubPanel  Unified panel for local libraries + D1/R2 cloud resources
 * Browse knowledge topics, create themed agents, search indexed content
 */

import { useState, useEffect, useCallback } from 'react';

const isElectron = typeof window !== 'undefined' && !!window.electronAPI;

//  Types (mirrored from backend) 

interface KnowledgeTopic {
  id: string;
  name: string;
  category: string;
  path: string;
  fileCount: number;
  description: string;
  icon: string;
}

interface AgentDefinition {
  id: string;
  name: string;
  role: string;
  knowledgeTopics: string[];
  systemPrompt?: string;
  model?: string;
  createdAt: string;
}

interface CloudResource {
  type: 'd1' | 'r2';
  id: string;
  name: string;
  description: string;
  project: string;
  category?: string;
}

interface TopicFile {
  name: string;
  path: string;
  snippet: string;
  size: number;
}

interface HubStats {
  localLibraries: number;
  knowledgeTopics: number;
  agents: number;
  indexedFiles: number;
  totalSizeMB: number;
  cloudDatabases: number;
  cloudBuckets: number;
}

interface D1TableInfo {
  name: string;
  rowCount?: number;
}

type ActiveTab = 'topics' | 'agents' | 'cloud' | 'search';
type CloudSubTab = 'd1' | 'r2';

interface Props {
  onClose: () => void;
}

export function KnowledgeHubPanel({ onClose }: Props) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('topics');
  const [stats, setStats] = useState<HubStats | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Topics
  const [topics, setTopics] = useState<KnowledgeTopic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [topicFiles, setTopicFiles] = useState<TopicFile[]>([]);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);

  // Agents
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [newAgent, setNewAgent] = useState({ id: '', name: '', role: '', systemPrompt: '', model: 'gemini-1.5-pro', knowledgeTopics: [] as string[] });

  // Cloud
  const [cloudResources, setCloudResources] = useState<CloudResource[]>([]);
  const [cloudSubTab, setCloudSubTab] = useState<CloudSubTab>('d1');
  const [d1Tables, setD1Tables] = useState<D1TableInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [queryResult, setQueryResult] = useState<string | null>(null);

  // Search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ filePath: string; fileName: string; snippet: string; rank: number }>>([]);

  //  Load data 

  const loadData = useCallback(async () => {
    if (!isElectron) return;
    try {
      const [s, t, a, c] = await Promise.all([
        window.electronAPI.knowledgeHub.getStats(),
        window.electronAPI.knowledgeHub.getTopics(),
        window.electronAPI.knowledgeHub.getAgents(),
        window.electronAPI.knowledgeHub.getCloudResources(),
      ]);
      setStats(s);
      setTopics(t);
      setAgents(a);
      setCloudResources(c);
    } catch (err: any) {
      setStatus(` ${err.message}`);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  //  Actions 

  const handleAutoRegister = async () => {
    setStatus(' Rejestrowanie bibliotek HUB...');
    const res = await window.electronAPI.knowledgeHub.autoRegister();
    if (res.success) {
      setStatus(` Zarejestrowano ${res.data!.registered} bibl. (pominięto: ${res.data!.skipped})`);
      loadData();
    } else {
      setStatus(` ${res.error}`);
    }
  };

  const handleSelectTopic = async (topicId: string) => {
    setSelectedTopic(topicId);
    setFileContent(null);
    setSelectedFilePath(null);
    const files = await window.electronAPI.knowledgeHub.getTopicFiles(topicId);
    setTopicFiles(files);
  };

  const handleReadFile = async (filePath: string) => {
    setSelectedFilePath(filePath);
    // file.read → IPC file:read → { success, content, size, modified, error }
    const res = await window.electronAPI.file?.read(filePath);
    if (res?.success && res.content) {
      setFileContent(res.content);
    } else {
      setFileContent(res?.error ?? 'Nie można odczytać pliku');
    }
  };

  const handleCreateAgent = async () => {
    if (!newAgent.id || !newAgent.name) return;
    const res = await window.electronAPI.knowledgeHub.createAgent(newAgent);
    if (res.success) {
      setStatus(` Agent "${newAgent.name}" utworzony`);
      setShowCreateAgent(false);
      setNewAgent({ id: '', name: '', role: '', systemPrompt: '', model: 'gemini-1.5-pro', knowledgeTopics: [] });
      loadData();
    } else {
      setStatus(` ${res.error}`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setStatus(' Szukam...');
    const res = await window.electronAPI.knowledgeHub.searchKnowledge(searchQuery);
    if (res.success && res.data) {
      setSearchResults(res.data);
      setStatus(` Znaleziono ${res.data.length} wyników`);
    } else {
      setStatus(` ${res.error}`);
    }
  };

  const handleQueryD1 = async (dbId: string) => {
    setSelectedDb(dbId);
    setQueryResult(null);
    setD1Tables([]);
    // Fetch tables via Pages API
    try {
      const resp = await fetch(`/api/db/tables/${dbId}`);
      if (resp.ok) {
        const data = await resp.json();
        setD1Tables(data.tables || []);
      } else {
        setD1Tables([]);
        setQueryResult('Brak dostępu do D1 API (wymaga deploy na CF Pages)');
      }
    } catch {
      setQueryResult('D1 API niedostępne lokalnie  deploy na zenbrowsers.org');
    }
  };

  const toggleTopicForAgent = (topicId: string) => {
    setNewAgent(prev => ({
      ...prev,
      knowledgeTopics: prev.knowledgeTopics.includes(topicId)
        ? prev.knowledgeTopics.filter(t => t !== topicId)
        : [...prev.knowledgeTopics, topicId],
    }));
  };

  //  Category grouping 

  const topicsByCategory = topics.reduce((acc, t) => {
    (acc[t.category] = acc[t.category] || []).push(t);
    return acc;
  }, {} as Record<string, KnowledgeTopic[]>);

  const CATEGORY_LABELS: Record<string, string> = {
    tech: ' Technologia',
    business: ' Biznes',
    intelligence: ' Intelligence',
    content: ' Content',
    other: ' Inne',
  };

  //  TABS 

  const TABS: { id: ActiveTab; label: string; icon: string }[] = [
    { id: 'topics', label: 'Bazy wiedzy', icon: '' },
    { id: 'agents', label: 'Agenci', icon: '' },
    { id: 'cloud', label: 'D1 / R2', icon: '' },
    { id: 'search', label: 'Szukaj', icon: '' },
  ];

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}></span>
          <span style={{ fontWeight: 'bold', fontSize: '15px' }}>Knowledge Hub</span>
        </div>
        <button onClick={onClose} style={closeBtnStyle}></button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={statsBar}>
           {stats.localLibraries} bibl. |  {stats.knowledgeTopics} tematów |  {stats.agents} agentów |
           {stats.indexedFiles} plików |  {stats.totalSizeMB} MB |
           {stats.cloudDatabases} D1 + {stats.cloudBuckets} R2
        </div>
      )}

      {/* Status */}
      {status && <div style={{ padding: '4px 12px', fontSize: '12px', color: '#64ffda' }}>{status}</div>}

      {/* Tab bar */}
      <div style={tabBarStyle}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...tabBtnStyle,
              borderBottom: activeTab === tab.id ? '2px solid #64ffda' : '2px solid transparent',
              color: activeTab === tab.id ? '#64ffda' : '#8892b0',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
        <button onClick={handleAutoRegister} style={{ ...smallActionBtn, marginLeft: 'auto' }} title="Zarejestruj biblioteki HUB">
           Sync HUB
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px' }}>

        {/*  TOPICS TAB  */}
        {activeTab === 'topics' && (
          <div>
            {Object.entries(topicsByCategory).map(([cat, catTopics]) => (
              <div key={cat} style={{ marginBottom: '12px' }}>
                <h4 style={{ color: '#64ffda', margin: '8px 0 4px', fontSize: '13px' }}>
                  {CATEGORY_LABELS[cat] || cat}
                </h4>
                {catTopics.map(topic => (
                  <div
                    key={topic.id}
                    onClick={() => handleSelectTopic(topic.id)}
                    style={{
                      ...topicCardStyle,
                      borderLeft: selectedTopic === topic.id ? '3px solid #64ffda' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>{topic.icon} <b>{topic.name}</b></span>
                      <span style={{ color: '#4a5568', fontSize: '11px' }}>{topic.fileCount} plików</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{topic.description}</div>
                  </div>
                ))}
              </div>
            ))}

            {/* Topic files preview */}
            {selectedTopic && topicFiles.length > 0 && (
              <div style={{ borderTop: '1px solid #233554', marginTop: '8px', paddingTop: '8px' }}>
                <h4 style={{ color: '#64ffda', margin: '0 0 4px', fontSize: '13px' }}>
                   Pliki w {selectedTopic}
                </h4>
                {topicFiles.map((f, i) => (
                  <div
                    key={i}
                    onClick={() => handleReadFile(f.path)}
                    style={{
                      ...fileItemStyle,
                      background: selectedFilePath === f.path ? '#1a365d' : 'transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold', fontSize: '12px' }}> {f.name}</span>
                      <span style={{ color: '#4a5568', fontSize: '10px' }}>{(f.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>
                      {f.snippet}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* File content preview */}
            {fileContent && (
              <div style={{ borderTop: '1px solid #233554', marginTop: '8px', paddingTop: '8px' }}>
                <h4 style={{ color: '#64ffda', margin: '0 0 4px', fontSize: '13px' }}>
                   {selectedFilePath?.split(/[/\\]/).pop()}
                </h4>
                <pre style={previewStyle}>{fileContent.substring(0, 8000)}</pre>
              </div>
            )}
          </div>
        )}

        {/*  AGENTS TAB  */}
        {activeTab === 'agents' && (
          <div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button onClick={() => setShowCreateAgent(v => !v)} style={actionBtn}>
                 Nowy agent tematyczny
              </button>
            </div>

            {showCreateAgent && (
              <div style={formSection}>
                <input value={newAgent.name} onChange={e => setNewAgent(p => ({ ...p, name: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-') }))} placeholder="Nazwa agenta" style={inputStyle} />
                <input value={newAgent.role} onChange={e => setNewAgent(p => ({ ...p, role: e.target.value }))} placeholder="Rola (np. SEO Expert)" style={{ ...inputStyle, marginTop: '4px' }} />
                <select value={newAgent.model} onChange={e => setNewAgent(p => ({ ...p, model: e.target.value }))} style={{ ...inputStyle, marginTop: '4px' }}>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="claude-sonnet-4">Claude Sonnet 4</option>
                  <option value="gpt-4o">GPT-4o</option>
                  <option value="deepseek-r1">DeepSeek R1</option>
                </select>
                <textarea
                  value={newAgent.systemPrompt}
                  onChange={e => setNewAgent(p => ({ ...p, systemPrompt: e.target.value }))}
                  placeholder="System prompt..."
                  style={{ ...inputStyle, marginTop: '4px', minHeight: '60px', resize: 'vertical' }}
                />
                <div style={{ marginTop: '6px', fontSize: '12px', color: '#8892b0' }}>Powiązane bazy wiedzy:</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                  {topics.map(t => (
                    <button
                      key={t.id}
                      onClick={() => toggleTopicForAgent(t.id)}
                      style={{
                        ...tagBtn,
                        background: newAgent.knowledgeTopics.includes(t.id) ? '#1a365d' : '#0d2137',
                        borderColor: newAgent.knowledgeTopics.includes(t.id) ? '#64ffda' : '#233554',
                      }}
                    >
                      {t.icon} {t.name}
                    </button>
                  ))}
                </div>
                <button onClick={handleCreateAgent} style={{ ...actionBtn, marginTop: '8px' }}> Utwórz agenta</button>
              </div>
            )}

            {agents.map(agent => (
              <div key={agent.id} style={agentCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 'bold' }}> {agent.name}</span>
                  <span style={{ fontSize: '10px', color: '#4a5568' }}>{agent.model || 'default'}</span>
                </div>
                <div style={{ fontSize: '12px', color: '#8892b0', marginTop: '2px' }}>Role: {agent.role}</div>
                {agent.knowledgeTopics.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
                    {agent.knowledgeTopics.map(t => (
                      <span key={t} style={topicTag}>{t}</span>
                    ))}
                  </div>
                )}
                {agent.systemPrompt && (
                  <div style={{ fontSize: '11px', color: '#4a5568', marginTop: '4px', fontStyle: 'italic' }}>
                    {agent.systemPrompt.substring(0, 120)}...
                  </div>
                )}
              </div>
            ))}

            {agents.length === 0 && !showCreateAgent && (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: '20px' }}>
                Brak zdefiniowanych agentów. Kliknij  żeby utworzyć.
              </div>
            )}
          </div>
        )}

        {/*  CLOUD TAB  */}
        {activeTab === 'cloud' && (
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <button onClick={() => setCloudSubTab('d1')} style={{ ...tabBtnStyle, borderBottom: cloudSubTab === 'd1' ? '2px solid #64ffda' : 'none', color: cloudSubTab === 'd1' ? '#64ffda' : '#8892b0' }}>
                 D1 Databases
              </button>
              <button onClick={() => setCloudSubTab('r2')} style={{ ...tabBtnStyle, borderBottom: cloudSubTab === 'r2' ? '2px solid #64ffda' : 'none', color: cloudSubTab === 'r2' ? '#64ffda' : '#8892b0' }}>
                 R2 Buckets
              </button>
            </div>

            {cloudSubTab === 'd1' && (
              <div>
                {cloudResources.filter(r => r.type === 'd1').map(db => (
                  <div key={db.id} style={cloudCardStyle} onClick={() => handleQueryD1(db.id)}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}> {db.name}</span>
                      <span style={{ fontSize: '10px', color: '#4a5568' }}>{db.project}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{db.description}</div>
                    <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px', fontFamily: 'monospace' }}>{db.id}</div>
                  </div>
                ))}

                {selectedDb && d1Tables.length > 0 && (
                  <div style={{ borderTop: '1px solid #233554', marginTop: '8px', paddingTop: '8px' }}>
                    <h4 style={{ color: '#64ffda', margin: '0 0 4px', fontSize: '13px' }}> Tabele</h4>
                    {d1Tables.map((t, i) => (
                      <div key={i} style={{ padding: '4px 8px', fontSize: '12px', color: '#a8b2d1', background: '#112240', borderRadius: '3px', marginBottom: '2px' }}>
                         {t.name} {t.rowCount != null && <span style={{ color: '#4a5568' }}>({t.rowCount} rows)</span>}
                      </div>
                    ))}
                  </div>
                )}
                {queryResult && (
                  <pre style={{ ...previewStyle, marginTop: '8px' }}>{queryResult}</pre>
                )}
              </div>
            )}

            {cloudSubTab === 'r2' && (
              <div>
                {cloudResources.filter(r => r.type === 'r2').map(bucket => (
                  <div key={bucket.id} style={cloudCardStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 'bold' }}> {bucket.name}</span>
                      <span style={categoryBadge}>{bucket.category}</span>
                    </div>
                    <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }}>{bucket.description}</div>
                    <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{bucket.project}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/*  SEARCH TAB  */}
        {activeTab === 'search' && (
          <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                placeholder="Szukaj w bazach wiedzy..."
                style={{ ...inputStyle, flex: 1 }}
              />
              <button onClick={handleSearch} style={actionBtn}></button>
            </div>

            {searchResults.map((r, i) => (
              <div key={i} onClick={() => handleReadFile(r.filePath)} style={searchResultStyle}>
                <div style={{ fontWeight: 'bold', fontSize: '12px', color: '#ccd6f6' }}> {r.fileName}</div>
                <div style={{ fontSize: '11px', color: '#8892b0', marginTop: '2px' }} dangerouslySetInnerHTML={{ __html: r.snippet }} />
                <div style={{ fontSize: '10px', color: '#4a5568', marginTop: '2px' }}>{r.filePath}</div>
              </div>
            ))}

            {fileContent && (
              <div style={{ borderTop: '1px solid #233554', marginTop: '8px', paddingTop: '8px' }}>
                <h4 style={{ color: '#64ffda', margin: '0 0 4px', fontSize: '13px' }}>
                   {selectedFilePath?.split(/[/\\]/).pop()}
                </h4>
                <pre style={previewStyle}>{fileContent.substring(0, 8000)}</pre>
              </div>
            )}

            {searchResults.length === 0 && searchQuery && (
              <div style={{ color: '#4a5568', textAlign: 'center', padding: '20px' }}>
                Wpisz zapytanie i naciśnij Enter lub 
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
  position: 'absolute', top: 0, right: 0,
  width: '520px', height: '100%',
  background: '#0a192f',
  borderLeft: '1px solid #233554',
  display: 'flex', flexDirection: 'column',
  zIndex: 100, color: '#ccd6f6',
};

const headerStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '10px 12px', borderBottom: '1px solid #233554',
};

const closeBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', color: '#8892b0',
  cursor: 'pointer', fontSize: '18px',
};

const statsBar: React.CSSProperties = {
  padding: '6px 12px', fontSize: '11px', color: '#8892b0',
  background: '#112240', borderBottom: '1px solid #233554',
};

const tabBarStyle: React.CSSProperties = {
  display: 'flex', gap: '2px', padding: '4px 12px',
  borderBottom: '1px solid #233554', alignItems: 'center',
};

const tabBtnStyle: React.CSSProperties = {
  background: 'transparent', border: 'none', padding: '6px 10px',
  cursor: 'pointer', fontSize: '12px', color: '#8892b0',
};

const smallActionBtn: React.CSSProperties = {
  background: '#1a365d', border: '1px solid #233554',
  borderRadius: '4px', color: '#64ffda', cursor: 'pointer',
  padding: '4px 8px', fontSize: '11px',
};

const actionBtn: React.CSSProperties = {
  background: '#1a365d', border: '1px solid #233554',
  borderRadius: '4px', color: '#64ffda', cursor: 'pointer',
  padding: '6px 10px', fontSize: '12px',
};

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '6px 8px', background: '#112240',
  border: '1px solid #233554', borderRadius: '4px',
  color: '#ccd6f6', fontSize: '12px', outline: 'none',
  boxSizing: 'border-box',
};

const topicCardStyle: React.CSSProperties = {
  padding: '6px 8px', cursor: 'pointer',
  borderRadius: '4px', marginBottom: '3px',
  background: '#112240', fontSize: '12px',
  transition: 'background 0.15s',
};

const fileItemStyle: React.CSSProperties = {
  padding: '6px 8px', cursor: 'pointer',
  borderRadius: '4px', marginBottom: '2px',
  transition: 'background 0.15s',
};

const agentCardStyle: React.CSSProperties = {
  padding: '8px 10px', background: '#112240',
  borderRadius: '4px', marginBottom: '4px',
  borderLeft: '3px solid #64ffda',
};

const cloudCardStyle: React.CSSProperties = {
  padding: '8px 10px', background: '#112240',
  borderRadius: '4px', marginBottom: '4px', cursor: 'pointer',
  transition: 'background 0.15s',
};

const formSection: React.CSSProperties = {
  padding: '8px 10px', background: '#0d2137',
  borderRadius: '4px', marginBottom: '8px',
  border: '1px solid #233554',
};

const tagBtn: React.CSSProperties = {
  padding: '2px 6px', fontSize: '10px',
  border: '1px solid #233554', borderRadius: '3px',
  cursor: 'pointer', color: '#a8b2d1', background: '#0d2137',
};

const topicTag: React.CSSProperties = {
  padding: '1px 6px', fontSize: '10px', color: '#64ffda',
  background: '#1a365d', borderRadius: '3px',
};

const categoryBadge: React.CSSProperties = {
  padding: '1px 6px', fontSize: '10px', color: '#64ffda',
  background: '#1a365d', borderRadius: '3px',
};

const previewStyle: React.CSSProperties = {
  background: '#0d2137', padding: '8px',
  borderRadius: '4px', fontSize: '11px',
  color: '#a8b2d1', whiteSpace: 'pre-wrap',
  wordBreak: 'break-word', maxHeight: '300px',
  overflow: 'auto', border: '1px solid #233554',
};

const searchResultStyle: React.CSSProperties = {
  padding: '6px 8px', cursor: 'pointer',
  borderRadius: '4px', marginBottom: '3px',
  background: '#112240', transition: 'background 0.15s',
};
