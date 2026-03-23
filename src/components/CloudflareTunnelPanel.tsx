/**
 * Cloudflare Tunnel Management Panel — React 19 + typed API
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { TunnelStatus, TunnelMetrics } from '../types/electron';
import './CloudflareTunnelPanel.css';

interface CloudflareTunnelPanelProps {
  onClose: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: '#00aa00',
  error: '#ff0000',
  disconnected: '#ffaa00',
};

export function CloudflareTunnelPanel({ onClose }: CloudflareTunnelPanelProps) {
  const [tunnels, setTunnels] = useState<TunnelStatus[]>([]);
  const [metrics, setMetrics] = useState<TunnelMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { electronAPI } = window;

  const loadTunnelStatus = useCallback(async () => {
    try {
      const [status, metricsData] = await Promise.all([
        electronAPI.tunnel?.status(),
        electronAPI.tunnel?.metrics(),
      ]);

      if (status) setTunnels(status);
      if (metricsData) setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load tunnel status:', error);
    }
  }, [electronAPI]);

  useEffect(() => {
    loadTunnelStatus();

    if (autoRefresh) {
      intervalRef.current = setInterval(loadTunnelStatus, 5000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [autoRefresh, loadTunnelStatus]);

  const handleReconnect = useCallback(async () => {
    setLoading(true);
    try {
      await electronAPI.tunnel?.reconnect();
      await loadTunnelStatus();
    } finally {
      setLoading(false);
    }
  }, [electronAPI, loadTunnelStatus]);

  return (
    <div className="tunnel-panel floating-panel" role="complementary" aria-label="Panel Cloudflare Tunnel">
      <div className="panel-header">
        <h2>🌐 Cloudflare Tunnels</h2>
        <button className="btn-close" onClick={onClose} aria-label="Zamknij panel tuneli">
          ×
        </button>
      </div>

      <div className="panel-content">
        {/* Metrics Summary */}
        {metrics && (
          <div className="metrics-summary">
            <div className="metric">
              <span className="metric-label">Aktywne trasy</span>
              <span className="metric-value">{metrics.activeConnections}/{metrics.totalRequests}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Błędy</span>
              <span className="metric-value error">{metrics.errorRate}</span>
            </div>
            <div className="metric">
              <span className="metric-label">Śr. latencja</span>
              <span className="metric-value">
                {(metrics.avgLatency || 0).toFixed(1)}ms
              </span>
            </div>
          </div>
        )}

        {/* Tunnel Status Table */}
        <div className="tunnels-table">
          <table>
            <thead>
              <tr>
                <th>Hostname</th>
                <th>Usługa</th>
                <th>Status</th>
                <th>Uptime</th>
                <th>RPM</th>
              </tr>
            </thead>
            <tbody>
              {tunnels.map((tunnel) => (
                <tr key={tunnel.hostname}>
                  <td className="hostname">
                    <a
                      href={`https://${tunnel.hostname}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {tunnel.hostname}
                    </a>
                  </td>
                  <td className="service">{tunnel.service}</td>
                  <td className="status">
                    <span
                      className={`status-badge status-${tunnel.status}`}
                      style={{ backgroundColor: STATUS_COLORS[tunnel.status] ?? '#666' }}
                    >
                      {tunnel.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="uptime">{tunnel.uptime}s</td>
                  <td className="rpm">{tunnel.requestsPerMinute}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Controls */}
        <div className="panel-controls">
          <label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
            />
            Auto-odświeżanie
          </label>

          <button
            className="btn-primary"
            onClick={handleReconnect}
            disabled={loading}
          >
            {loading ? 'Łączenie...' : 'Połącz ponownie'}
          </button>

          <button className="btn-secondary" onClick={loadTunnelStatus}>
            Odśwież
          </button>
        </div>
      </div>
    </div>
  );
}