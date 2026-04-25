import type { ContainerInfo, NamespaceInfo } from '../agentHubTypes';

interface AgentPodmanTabProps {
  podmanAvail: boolean;
  containers: ContainerInfo[];
  nsInfo: NamespaceInfo;
  containerLogs: Record<string, string>;
  logsContainer: string | null;
  podmanBusy: Record<string, boolean>;
  onPodmanAction: (name: string, action: 'start' | 'stop' | 'restart') => void;
  onFetchLogs: (name: string) => void;
}

export function AgentPodmanTab({
  podmanAvail, containers, nsInfo, containerLogs, logsContainer, podmanBusy,
  onPodmanAction, onFetchLogs,
}: AgentPodmanTabProps) {
  return (
    <div className="ah-podman-panel">
      {/* Namespace pills */}
      <div className="ah-ns-bar">
        <span className="ah-ns-label">Active namespaces:</span>
        {nsInfo.all.length === 0
          ? <span className="ah-ns-empty">brak danych</span>
          : nsInfo.all.map(ns => (
            <span
              key={ns}
              className={`ah-ns-pill${nsInfo.active.includes(ns) ? ' ah-ns-pill-on' : ''}`}
              title={`${nsInfo.counts[ns] ?? 0} skills`}
            >
              {ns}
              {nsInfo.counts[ns] ? <span className="ah-ns-count">{nsInfo.counts[ns]}</span> : null}
            </span>
          ))
        }
      </div>

      {!podmanAvail && (
        <p className="ah-empty">Podman niedostępny — zainstaluj Podman i upewnij się że jest w PATH</p>
      )}

      {/* Container list */}
      <div className="ah-container-list">
        {containers.length === 0 && podmanAvail && (
          <p className="ah-empty">Brak kontenerów — uruchom: podman ps -a</p>
        )}
        {containers.map(c => (
          <div key={c.id} className={`ah-container-row ah-c-${c.state}`}>
            <span className={`ah-c-dot ah-c-dot-${c.state}`} title={c.state} />
            <div className="ah-c-info">
              <span className="ah-c-name">{c.name}</span>
              <span className="ah-c-image">{c.image.split('/').pop()?.split(':')[0]}</span>
              {c.namespace && c.namespace !== 'global' &&
                <span className="ah-c-ns">{c.namespace}</span>}
              {c.ports && <span className="ah-c-ports">{c.ports.slice(0, 30)}</span>}
            </div>
            <div className="ah-c-actions">
              {c.state !== 'running'
                ? <button className="ah-act-btn ah-act-primary" disabled={podmanBusy[c.name]}
                    onClick={() => onPodmanAction(c.name, 'start')}>▶ start</button>
                : <button className="ah-act-btn ah-act-danger" disabled={podmanBusy[c.name]}
                    onClick={() => onPodmanAction(c.name, 'stop')}>■ stop</button>
              }
              <button className="ah-act-btn" disabled={podmanBusy[c.name]}
                onClick={() => onPodmanAction(c.name, 'restart')}>↺</button>
              <button
                className={`ah-act-btn${logsContainer === c.name ? ' ah-tab-btn-on' : ''}`}
                onClick={() => onFetchLogs(c.name)}
              >logs</button>
            </div>
            {logsContainer === c.name && (
              <pre className="ah-c-logs">
                {containerLogs[c.name] ?? 'Ładowanie…'}
              </pre>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
