# WORKFLOW CARD - Przewodnik tworzenia karty z wezlami przepływu pracy

Bazuje na @xyflow/react (React Flow v12) — tej samej bibliotece co SkillGraphPanel.tsx.

---

## 1. Struktura pliku

```
src/components/
└── workflows/
    └── MyWorkflowCard/
        └── index.tsx   ← caly komponent: typy, wezly, panel
```

---

## 2. Zdefiniuj dane węzła (NodeData)

```tsx
import type { Node, Edge } from '@xyflow/react';

interface WorkflowNodeData {
  label:       string;
  type:        'start' | 'task' | 'decision' | 'end';
  description: string;
  status?:     'idle' | 'running' | 'done' | 'error';
  [key: string]: unknown;
}

type WFNode = Node<WorkflowNodeData>;
```

---

## 3. Custom Node — komponent węzła

```tsx
import { Handle, Position, type NodeProps } from '@xyflow/react';

const STATUS_COLOR: Record<string, string> = {
  idle:    '#334155',
  running: '#f59e0b',
  done:    '#22c55e',
  error:   '#ef4444',
};

const TYPE_ICON: Record<string, string> = {
  start: '▶', task: '⚙', decision: '◇', end: '■',
};

function WorkflowNode({ data, selected }: NodeProps) {
  const d = data as WorkflowNodeData;
  const color = STATUS_COLOR[d.status ?? 'idle'];
  return (
    <div style={{
      background: selected ? '#1e1e2e' : '#13131f',
      border: 1.5px solid \,
      borderRadius: 8,
      padding: '8px 12px',
      minWidth: 140,
      cursor: 'pointer',
    }}>
      {d.type !== 'start' && <Handle type="target" position={Position.Left} />}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color, fontSize: 14 }}>{TYPE_ICON[d.type]}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#e2e8f0' }}>{d.label}</span>
      </div>
      <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 3 }}>{d.description}</div>
      {d.type !== 'end' && <Handle type="source" position={Position.Right} />}
    </div>
  );
}

// WAZNE: zarejestruj POZA komponentem!
const NODE_TYPES = { workflowNode: WorkflowNode };
```

---

## 4. Dane startowe — wezly i krawedzie

```tsx
const INITIAL_NODES: WFNode[] = [
  { id: '1', type: 'workflowNode', position: { x: 50,  y: 150 },
    data: { label: 'START',       type: 'start',    description: 'Punkt wejscia', status: 'done' } },
  { id: '2', type: 'workflowNode', position: { x: 250, y: 80 },
    data: { label: 'Fetch danych', type: 'task',     description: 'Pobierz dane z API', status: 'running' } },
  { id: '3', type: 'workflowNode', position: { x: 250, y: 220 },
    data: { label: 'Walidacja',    type: 'task',     description: 'Sprawdź schemat', status: 'idle' } },
  { id: '4', type: 'workflowNode', position: { x: 460, y: 150 },
    data: { label: 'OK?',          type: 'decision', description: 'Dane poprawne?', status: 'idle' } },
  { id: '5', type: 'workflowNode', position: { x: 660, y: 150 },
    data: { label: 'KONIEC',       type: 'end',      description: 'Zakończono', status: 'idle' } },
];

const INITIAL_EDGES: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', label: 'fetch' },
  { id: 'e1-3', source: '1', target: '3', label: 'validate' },
  { id: 'e2-4', source: '2', target: '4' },
  { id: 'e3-4', source: '3', target: '4' },
  { id: 'e4-5', source: '4', target: '5', label: 'TAK' },
  { id: 'e4-2', source: '4', target: '2', label: 'NIE', style: { stroke: '#ef4444' } },
];
```

---

## 5. Główny komponent karty

```tsx
import {
  ReactFlow, Background, Controls, MiniMap, Panel,
  useNodesState, useEdgesState, addEdge, type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useCallback, useState } from 'react';

export function WorkflowCard() {
  const [nodes, setNodes, onNodesChange] = useNodesState<WFNode>(INITIAL_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(INITIAL_EDGES);
  const [selected, setSelected] = useState<WorkflowNodeData | null>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges(eds => addEdge(params, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: WFNode) => {
    setSelected(prev => prev?.label === node.data.label ? null : node.data);
  }, []);

  const addTask = () => {
    const id = String(Date.now());
    setNodes(prev => [...prev, {
      id, type: 'workflowNode',
      position: { x: Math.random() * 400 + 100, y: Math.random() * 200 + 100 },
      data: { label: 'Krok ' + (prev.length + 1), type: 'task', description: 'Nowy krok', status: 'idle' },
    }]);
  };

  return (
    <div style={{ width: '100%', height: '100%', background: '#0d0d14', position: 'relative' }}>
      <ReactFlow
        nodes={nodes} edges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        onConnect={onConnect} onNodeClick={onNodeClick}
        onPaneClick={() => setSelected(null)}
        nodeTypes={NODE_TYPES}
        fitView
        defaultEdgeOptions={{ style: { stroke: '#334155', strokeWidth: 1.5 } }}
      >
        <Background color="#1e293b" gap={24} size={1} />
        <Controls style={{ background: '#13131f', border: '1px solid #ffffff15', borderRadius: 6 }} />
        <MiniMap maskColor="#0d0d1480" style={{ background: '#0d0d14' }} />

        <Panel position="top-left">
          <div style={{ display: 'flex', gap: 6, background: '#13131f',
            border: '1px solid #ffffff15', borderRadius: 8, padding: '6px 10px' }}>
            <span style={{ color: '#64748b', fontSize: 11 }}>WORKFLOW</span>
            <button onClick={addTask} style={{ background: '#6366f120', color: '#818cf8',
              border: '1px solid #6366f140', borderRadius: 4, padding: '2px 8px',
              fontSize: 10, cursor: 'pointer' }}>
              + Krok
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {selected && (
        <div style={{ position: 'absolute', right: 12, top: 12, background: '#13131f',
          border: '1px solid #ffffff15', borderRadius: 8, padding: 12, minWidth: 200, zIndex: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ color: '#e2e8f0', fontWeight: 700, fontSize: 12 }}>{selected.label}</span>
            <button onClick={() => setSelected(null)}
              style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}>×</button>
          </div>
          <p style={{ color: '#94a3b8', fontSize: 10, margin: 0 }}>{selected.description}</p>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Rejestracja w panel-registry.tsx

```tsx
// src/components/browser-core/panel-registry.tsx
const WorkflowCard = lazy(() =>
  import('../workflows/MyWorkflowCard').then(m => ({ default: m.WorkflowCard }))
);

// W PANEL_MAP dodaj:
'workflow-card': { component: WorkflowCard, title: 'Workflow' },
```

Otwierasz przez: `openPanel('workflow-card')`

---

## 7. Tabela typów węzłów

| type       | Opis                    | Handles           |
|------------|-------------------------|-------------------|
| start      | Punkt startowy          | tylko source →    |
| task       | Krok wykonujący pracę   | ← target + source → |
| decision   | Rozgałęzienie (if/else) | ← target + source → |
| end        | Punkt końcowy           | tylko ← target    |

---

## 8. Schemat przepływu

```
[START] ──fetch──▶ [Fetch danych] ──▶
      ╲─validate─▶ [Walidacja]    ──▶ [OK?] ──TAK──▶ [KONIEC]
                                         ╲──NIE──▶ [Fetch danych] (pętla)
```

---

## 9. Zalezności

Upewnij się ze w package.json masz: `@xyflow/react`: `^12.x.x`

Jesli brak: `npm install @xyflow/react`

CSS musi byc zaimportowany raz: `import '@xyflow/react/dist/style.css'`
