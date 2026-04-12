import { useState } from "react";

interface FolderNode {
  name: string;
  path: string;
  type: "folder" | "file";
  children?: FolderNode[];
}

const APP_FOLDERS: FolderNode[] = [
  {
    name: "ZENO Browser",
    path: "/",
    type: "folder",
    children: [
      {
        name: "src",
        path: "/src",
        type: "folder",
        children: [
          {
            name: "components",
            path: "/src/components",
            type: "folder",
            children: [],
          },
          {
            name: "styles",
            path: "/src/styles",
            type: "folder",
            children: [],
          },
          {
            name: "types",
            path: "/src/types",
            type: "folder",
            children: [],
          },
        ],
      },
      {
        name: "src-electron",
        path: "/src-electron",
        type: "folder",
        children: [
          {
            name: "app",
            path: "/src-electron/app",
            type: "folder",
            children: [],
          },
          {
            name: "ipc",
            path: "/src-electron/ipc",
            type: "folder",
            children: [],
          },
          {
            name: "preload",
            path: "/src-electron/preload",
            type: "folder",
            children: [],
          },
        ],
      },
      {
        name: "JIMbo_kit",
        path: "/JIMbo_kit",
        type: "folder",
        children: [],
      },
      {
        name: "JIMBO_agent_HUB",
        path: "/JIMBO_agent_HUB",
        type: "folder",
        children: [],
      },
    ],
  },
];

interface TreeNodeProps {
  node: FolderNode;
  depth: number;
}

function TreeNode({ node, depth }: TreeNodeProps) {
  const [open, setOpen] = useState(depth === 0);
  const isFolder = node.type === "folder";
  const hasChildren = isFolder && (node.children?.length ?? 0) > 0;

  return (
    <div>
      <button
        className="folder-panel__item"
        style={{ paddingLeft: `${8 + depth * 14}px` }}
        onClick={() => isFolder && setOpen((v) => !v)}
        aria-expanded={isFolder ? open : undefined}
        title={node.path}
      >
        <span className="folder-panel__icon">
          {isFolder ? (open ? "▾" : "▸") : "·"}
        </span>
        <span className="folder-panel__name">{node.name}</span>
      </button>

      {isFolder && open && hasChildren && (
        <div>
          {node.children!.map((child) => (
            <TreeNode key={child.path} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function AppFolderPanel() {
  return (
    <nav className="folder-panel" aria-label="App folders">
      <div className="folder-panel__header">
        <span>EXPLORER</span>
      </div>
      <div className="folder-panel__tree">
        {APP_FOLDERS.map((node) => (
          <TreeNode key={node.path} node={node} depth={0} />
        ))}
      </div>
    </nav>
  );
}
