/**
 * Security Monitor Panel — React 19 + typed API + useSyncExternalStore
 */

import { useSyncExternalStore, useCallback } from "react";
import type { AuditLog } from "../../types/electron";

interface SecurityMonitorProps {
  onClose: () => void;
}

// External store for audit logs (subscribes to real-time IPC events)
let cachedLogs: AuditLog[] = [];
const listeners = new Set<() => void>();
let isInitialized = false;

async function initializeLogs() {
  if (isInitialized) return;
  isInitialized = true;

  // Guard: Only initialize if electronAPI exists (Electron mode)
  if (
    typeof window === "undefined" ||
    !window.electronAPI?.security?.getAuditLogs
  ) {
    return;
  }

  try {
    const auditLogs = await window.electronAPI.security.getAuditLogs();
    cachedLogs = auditLogs;
    listeners.forEach((listener) => listener());
  } catch (error) {
    console.error("Failed to initialize audit logs:", error);
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);

  // Initialize logs on first subscription
  void initializeLogs();

  // Subscribe to real-time audit log events from Electron
  const handleNewLog = (log: AuditLog) => {
    cachedLogs = [...cachedLogs, log];
    listeners.forEach((listener) => listener());
  };

  // Guard: Only subscribe if electronAPI exists (Electron mode)
  if (
    typeof window !== "undefined" &&
    window.electronAPI?.security?.onAuditLog
  ) {
    window.electronAPI.security.onAuditLog(handleNewLog);
  }

  return () => {
    listeners.delete(callback);
    // Guard: Only unsubscribe if electronAPI exists
    if (
      typeof window !== "undefined" &&
      window.electronAPI?.security?.offAuditLog
    ) {
      window.electronAPI.security.offAuditLog(handleNewLog);
    }
  };
}

function getSnapshot() {
  return cachedLogs;
}
// Guard: Only refresh if electronAPI exists (Electron mode)
if (
  typeof window === "undefined" ||
  !window.electronAPI?.security?.getAuditLogs
) {
  return;
}

export function SecurityMonitor({ onClose }: SecurityMonitorProps) {
  const logs = useSyncExternalStore(subscribe, getSnapshot);

  const refreshLogs = useCallback(async () => {
    try {
      const auditLogs = await window.electronAPI.security.getAuditLogs();
      cachedLogs = auditLogs;
      listeners.forEach((listener) => listener());
    } catch (error) {
      console.error("Failed to refresh logs:", error);
    }
  }, []);

  return (
    <div
      className="security-panel floating-panel"
      role="complementary"
      aria-label="Monitor bezpieczeństwa"
    >
      <div className="panel-header">
        <h2>🔒 Monitor bezpieczeństwa</h2>
        <button
          className="btn-close"
          onClick={onClose}
          aria-label="Zamknij monitor bezpieczeństwa"
        >
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
                <li
                  key={`${log.type}-${log.timestamp}-${i}`}
                  className={`log-${log.type.toLowerCase()}`}
                >
                  <span className="log-type">{log.type}</span>
                  <span className="log-time">
                    {new Date(log.timestamp ?? Date.now()).toLocaleTimeString(
                      "pl-PL",
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button onClick={refreshLogs} className="btn-small">
          Odśwież logi
        </button>
      </div>
    </div>
  );
}
