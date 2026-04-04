/**
 * SkillGraphPanel — React Flow graf biblioteki skills
 *
 * Nodes  = skills (kolorowane per namespace)
 * Edges  = cosine similarity >= threshold
 * Toolbar: filtr namespace, threshold slider, refresh, minimap toggle
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  Handle,
  Position,
  Panel,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const HUB = 'http://localhost:4224';

/* ── Namespace colors ── */
const NS_COLOR: Record<string, string> = {
  global:    '#6366f1',
  analytics: '#3b82f6',
  search:    '#22c55e',
  media:     '#a855f7',
  finance:   '#f59e0b',
};
const nsColor = (ns: string) => NS_COLOR[ns] ?? '#6366f1';

/* ── Custom node ── */
interface SkillNodeData {
  label:       string;
  namespace:   string;
  description: string;
  tags:        string[];
  ok:          number;
  fail:        number;
  color:       string;
  [key: string]: unknown;
}

function SkillNode({ data, selected }: NodeProps) {
  const d = data as SkillNodeData;
  const color = d.color ?? nsColor(d.namespace);
  return (
    <div
      style={{
        background: selected ? '#1e1e2e' : '#13131f',
        border: `1.5px solid ${color}${selected ? 'ff' : '60'}`,
        borderRadius: 8,
        padding: '6px 10px',
        minWidth: 120,
        maxWidth: 140,
        cursor: 'pointer',
        boxShadow: selected ? `0 0 12px ${color}50` : 'none',
        transition: 'all 0.15s',
      }}
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <div style={{ fontSize: 10, color, fontWeight: 700, marginBottom: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {d.label}
      </div>
      <div style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {d.namespace}
      </div>
      {(d.ok > 0 || d.fail > 0) && (
        <div style={{ fontSize: 9, marginTop: 2, display: 'flex', gap: 4 }}>
          {d.ok   > 0 && <span style={{ color: '#4ade80' }}>✓{d.ok}</span>}
          {d.fail > 0 && <span style={{ color: '#f87171' }}>✗{d.fail}</span>}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const NODE_TYPES = { skillNode: SkillNode };

/* ── Tooltip overlay ── */
interface TooltipInfo { x: number; y: number; data: SkillNodeData }

/* ── Main component ── */
interface GraphData {
  nodes:      Node[];
  edges:      Edge[];
  total:      number;
  namespaces: string[];
}

export function SkillGraphPanel() {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [loading,    setLoading]    = useState(false);
  const [threshold,  setThreshold]  = useState(0.65);
  const [nsFilter,   setNsFilter]   = useState('all');
  const [allNs,      setAllNs]      = useState<string[]>([]);
  const [total,      setTotal]      = useState(0);
  const [showMinimap,setShowMinimap]= useState(true);
  const [tooltip,    setTooltip]    = useState<TooltipInfo | null>(null);
  const [selected,   setSelected]   = useState<SkillNodeData | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadGraph = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ threshold: String(threshold) });
      if (nsFilter !== 'all') params.set('namespace', nsFilter);
      const r = await fetch(`${HUB}/skills/graph?${params}`);
      const d = await r.json() as GraphData;
      setNodes(d.nodes ?? []);
      setEdges(d.edges ?? []);
      setTotal(d.total ?? 0);
      setAllNs(d.namespaces ?? []);
    } catch { /* hub offline */ }
    finally { setLoading(false); }
  }, [threshold, nsFilter, setNodes, setEdges]);

  useEffect(() => { loadGraph(); }, [loadGraph]);

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelected(prev => prev?.label === (node.data as SkillNodeData).label ? null : node.data as SkillNodeData);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#0d0d14' }}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={NODE_TYPES}
        onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        fitView
        minZoom={0.15}
        maxZoom={2}
        defaultEdgeOptions={{
          style: { stroke: '#334155', strokeWidth: 1 },
          labelStyle: { fontSize: 9, fill: '#64748b' },
          labelBgStyle: { fill: '#0d0d14', fillOpacity: 0.8 },
        }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls
          style={{ background: '#13131f', border: '1px solid #ffffff15', borderRadius: 6 }}
        />
        {showMinimap && (
          <MiniMap
            nodeColor={(n) => nsColor((n.data as SkillNodeData)?.namespace ?? 'global')}
            maskColor="#0d0d1480"
            style={{ background: '#0d0d14', border: '1px solid #ffffff15', borderRadius: 6 }}
          />
        )}

        {/* ── Toolbar panel (top-left) ── */}
        <Panel position="top-left">
          <div className="sg-toolbar">
            {/* Namespace filter pills */}
            <div className="sg-ns-row">
              {['all', ...allNs].map(ns => (
                <button
                  key={ns}
                  className={`sg-ns-pill${nsFilter === ns ? ' sg-ns-pill-on' : ''}`}
                  style={nsFilter === ns && ns !== 'all'
                    ? { borderColor: nsColor(ns), color: nsColor(ns), background: `${nsColor(ns)}18` }
                    : {}}
                  onClick={() => setNsFilter(ns)}
                >
                  {ns}
                </button>
              ))}
            </div>

            {/* Threshold slider */}
            <div className="sg-threshold-row">
              <span className="sg-lbl">Próg podobieństwa:</span>
              <input
                type="range" min={0.4} max={0.95} step={0.05}
                value={threshold}
                onChange={e => setThreshold(parseFloat(e.target.value))}
                onMouseUp={loadGraph}
                className="sg-slider"
              />
              <span className="sg-val">{threshold.toFixed(2)}</span>
              <button className="sg-btn" onClick={loadGraph} disabled={loading} title="Odśwież">
                {loading ? '…' : '↺'}
              </button>
              <button className="sg-btn" onClick={() => setShowMinimap(v => !v)} title="Minimap">
                {showMinimap ? '⊟' : '⊞'}
              </button>
            </div>

            {/* Stats */}
            <div className="sg-stats">
              <span>{total} skills</span>
              <span>·</span>
              <span>{edges.length} połączeń</span>
              {loading && <span className="sg-loading">⟳ ładowanie…</span>}
            </div>
          </div>
        </Panel>

        {/* ── Nodes = 0 hint ── */}
        {!loading && nodes.length === 0 && (
          <Panel position="top-center">
            <div className="sg-empty">
              Brak skills do wyświetlenia — uruchom kilka tasków przez Goose
            </div>
          </Panel>
        )}
      </ReactFlow>

      {/* ── Detail panel (selected node) ── */}
      {selected && (
        <div className="sg-detail">
          <div className="sg-detail-hdr">
            <span
              className="sg-detail-ns"
              style={{ background: `${nsColor(selected.namespace)}22`, color: nsColor(selected.namespace), borderColor: `${nsColor(selected.namespace)}40` }}
            >
              {selected.namespace}
            </span>
            <span className="sg-detail-name">{selected.label}</span>
            <button className="sg-btn" onClick={() => setSelected(null)}>✕</button>
          </div>
          <p className="sg-detail-desc">{selected.description}</p>
          {selected.tags?.length > 0 && (
            <div className="sg-detail-tags">
              {selected.tags.map((t: string) => <span key={t} className="sg-tag">{t}</span>)}
            </div>
          )}
          {(selected.ok > 0 || selected.fail > 0) && (
            <div className="sg-detail-stats">
              <span style={{ color: '#4ade80' }}>✓ {selected.ok} sukces</span>
              {selected.fail > 0 && <span style={{ color: '#f87171' }}>✗ {selected.fail} błąd</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
