import type { ChangeEvent } from 'react';
import type { SkillEntry, GooseSessionMeta } from '../agentHubTypes';

interface AgentSkillsTabProps {
  hubOnline: boolean;
  skillsList: SkillEntry[];
  skillSearch: string;
  skillExpanded: string | null;
  skillsLoading: boolean;
  showGooseImport: boolean;
  gooseSessions: GooseSessionMeta[];
  gooseImportBusy: Record<string, boolean>;
  gooseImportDone: Record<string, string>;
  onLoadSkills: () => void;
  onSearchSkills: (q: string) => void;
  onDeleteSkill: (id: string) => void;
  onExportSkills: () => void;
  onImportSkills: (e: ChangeEvent<HTMLInputElement>) => void;
  onSendToTask: (text: string) => void;
  onSendToChat: (text: string) => void;
  onCopy: (text: string) => void;
  onSkillSearchChange: (v: string) => void;
  onSkillExpandedChange: (id: string | null) => void;
  onToggleGooseImport: () => void;
  onImportGooseSession: (sessionId: string) => void;
  onLoadGooseSessions: () => void;
}

export function AgentSkillsTab({
  hubOnline, skillsList, skillSearch, skillExpanded, skillsLoading,
  showGooseImport, gooseSessions, gooseImportBusy, gooseImportDone,
  onLoadSkills, onSearchSkills, onDeleteSkill, onExportSkills, onImportSkills,
  onSendToTask, onSendToChat, onCopy,
  onSkillSearchChange, onSkillExpandedChange,
  onToggleGooseImport, onImportGooseSession, onLoadGooseSessions,
}: AgentSkillsTabProps) {
  return (
    <div className="ah-skills-panel">
      {/* Goose session import overlay */}
      {showGooseImport && (
        <div className="ah-goose-import">
          <div className="ah-goose-import-hdr">
            <span>🎯 Importuj sesję Goose Desktop</span>
            <button className="ah-act-btn" onClick={() => onToggleGooseImport()}>✕</button>
          </div>
          {gooseSessions.length === 0
            ? <p className="ah-empty">Brak sesji lub Goose Desktop nie uruchomiony</p>
            : <div className="ah-goose-sessions-list">
                {gooseSessions.map(s => (
                  <div key={s.id} className="ah-goose-session-row">
                    <div className="ah-goose-session-info">
                      <span className="ah-goose-session-name">{s.name}</span>
                      <span className="ah-goose-session-meta">
                        {s.msgCount} msg · {s.updatedAt.slice(0, 10)}
                        {s.provider && <span className="ah-goose-session-provider"> · {s.provider}</span>}
                      </span>
                      {s.workingDir && <span className="ah-goose-session-dir">{s.workingDir.slice(-40)}</span>}
                    </div>
                    <div className="ah-goose-session-actions">
                      {gooseImportDone[s.id]
                        ? <span className="ah-goose-import-result">{gooseImportDone[s.id]}</span>
                        : <button
                            className="ah-act-btn ah-act-primary"
                            disabled={gooseImportBusy[s.id]}
                            onClick={() => onImportGooseSession(s.id)}
                          >{gooseImportBusy[s.id] ? '⟳' : '⬆ importuj'}</button>
                      }
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      <div className="ah-skills-search-bar">
        <input
          className="ah-skills-search"
          placeholder="Szukaj skills semantycznie…"
          value={skillSearch}
          onChange={e => onSkillSearchChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onSearchSkills(skillSearch)}
        />
        <button className="ah-btn-send" onClick={() => onSearchSkills(skillSearch)}
          disabled={skillsLoading}>🔍</button>
      </div>
      <div className="ah-skills-list">
        {skillsLoading && <p className="ah-empty">Ładowanie…</p>}
        {!skillsLoading && skillsList.length === 0 &&
          <p className="ah-empty">Brak skills.<br />
            <span className="ah-empty-hint">Skills zapisują się automatycznie po każdym udanym Goose tasku</span>
          </p>}
        {skillsList.map(s => (
          <div key={s.id} className={`ah-skill-item${skillExpanded === s.id ? ' ah-skill-item-open' : ''}`}>
            <div className="ah-skill-hdr" onClick={() => onSkillExpandedChange(skillExpanded === s.id ? null : s.id)}>
              <span className="ah-skill-name">{s.name}</span>
              <span className="ah-skill-stats">
                {s.successCount != null && <span className="ah-skill-ok">✓{s.successCount}</span>}
                {s.failureCount != null && s.failureCount > 0 && <span className="ah-skill-fail">✗{s.failureCount}</span>}
              </span>
              <span className="ah-skill-chevron">{skillExpanded === s.id ? '▲' : '▼'}</span>
            </div>
            {skillExpanded === s.id && (
              <div className="ah-skill-body">
                <p className="ah-skill-desc">{s.description}</p>
                {s.tags && s.tags.length > 0 &&
                  <p className="ah-skill-tags">{s.tags.map(t => <span key={t} className="ah-skill-tag">{t}</span>)}</p>}
                {s.code && <pre className="ah-skill-code">{s.code.slice(0, 600)}{s.code.length > 600 ? '\n…' : ''}</pre>}
                <div className="ah-skill-actions">
                  <button className="ah-act-btn ah-act-primary" onClick={() => onSendToTask(s.description)}
                    title="Wyślij do Goose">⚡ uruchom</button>
                  <button className="ah-act-btn" onClick={() => onSendToChat(s.description)}
                    title="Wyślij do chatu">→ chat</button>
                  <button className="ah-act-btn" onClick={() => onCopy(s.code ?? s.description)}
                    title="Kopiuj">⎘</button>
                  <button className="ah-act-btn ah-act-danger" onClick={() => onDeleteSkill(s.id)}
                    title="Usuń skill">✕</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
