/**
 * Security Monitor Panel — React 19 + typed API
 */

import { useState, useEffect, useCallback } from 'react';
import type { AuditLog } from '../../types/electron';

interface SecurityMonitorProps {
  onClose: () => void;
}

export function SecurityMonitor({ onClose }: SecurityMonitorProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const { electronAPI } = window;

  const loadLogs = useCallback(async () => {
    try {
      const auditLogs = await electronAPI.security.getAuditLogs();
      setLogs(auditLogs);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  }, [electronAPI]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  return (
    <div className="security-panel floating-panel" role="complementary" aria-label="Monitor bezpieczeństwa">
      <div className="panel-header">
        <h2>🔒 Monitor bezpieczeństwa</h2>
        <button className="btn-close" onClick={onClose} aria-label="Zamknij monitor bezpieczeństwa">
          ×
        </button>
      </div>

      <div className="panel-content">
        <div className="audit-logs">
          <h3>Logi audytu:</h3>
          {logs.length === 0 ? (
            <p>Brak zarejestrowanych zdarzeń bezpieczeństwa</p>
          ) : (
            <ul>
              {logs.slice(-10).map((log, i) => (
                <li key={`${log.type}-${log.timestamp}-${i}`} className={`log-${log.type.toLowerCase()}`}>
                  <span className="log-type">{log.type}</span>
                  <span className="log-time">
                    {new Date(log.timestamp ?? Date.now()).toLocaleTimeString('pl-PL')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={loadLogs} className="btn-small">
          Odśwież logi
        </button>
      </div>
    </div>
  );
}