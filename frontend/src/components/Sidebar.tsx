import React, { useMemo, useState } from 'react';
import { DiskNode } from '../types';

interface SidebarProps {
  internal: DiskNode[];
  external: DiskNode[];
  selectedId?: string;
  onSelect: (node: DiskNode) => void;
  filterTerm?: string;
}

type Section = 'internal' | 'external' | 'volumes';

interface VisibleNode {
  id: string;
  node: DiskNode;
  depth: number;
}

const MIN_SYSTEM_BYTES = 3 * 1024 * 1024 * 1024; // 3 GB

export default function Sidebar({ internal, external, selectedId, onSelect, filterTerm }: SidebarProps) {
  const [sectionCollapse, setSectionCollapse] = useState<Record<Section, boolean>>({
    internal: true,
    external: true,
    volumes: true,
  });
  const [nodeCollapse, setNodeCollapse] = useState<Record<string, boolean>>({});
  const [showSystemDisks, setShowSystemDisks] = useState(false);

  const filteredInternal = useMemo(
    () => filterTree(internal, filterTerm, showSystemDisks),
    [internal, filterTerm, showSystemDisks]
  );
  const filteredExternal = useMemo(
    () => filterTree(external, filterTerm, showSystemDisks),
    [external, filterTerm, showSystemDisks]
  );

  const visibleMap = useMemo(() => {
    const map = new Map<string, DiskNode>();
    const walker = (nodes: DiskNode[]) => {
      nodes.forEach((node) => {
        map.set(node.id, node);
        if (node.children) walker(node.children);
      });
    };
    walker(filteredInternal);
    walker(filteredExternal);
    return map;
  }, [filteredInternal, filteredExternal]);

  const buildVisibleList = (nodes: DiskNode[]): VisibleNode[] => {
    const list: VisibleNode[] = [];
    const dfs = (items: DiskNode[], depth: number) => {
      items.forEach((item) => {
        list.push({ id: item.id, node: item, depth });
        const isCollapsed = nodeCollapse[item.id];
        if (!isCollapsed && item.children && item.children.length > 0) {
          dfs(item.children, depth + 1);
        }
      });
    };
    dfs(nodes, 0);
    return list;
  };

  const internalList = buildVisibleList(sectionCollapse.internal ? [] : filteredInternal);
  const externalList = buildVisibleList(sectionCollapse.external ? [] : filteredExternal);

  const volumeNodes = useMemo(() => {
    const nodes: DiskNode[] = [];
    const collect = (items: DiskNode[]) => {
      items.forEach((node) => {
        if (node.children && node.children.length > 0) {
          collect(node.children);
        } else if (node.type !== 'disk') {
          nodes.push(node);
        }
      });
    };
    collect([...filteredInternal, ...filteredExternal]);
    const filteredVolumes = showSystemDisks
      ? nodes
      : nodes.filter((node) => (node.sizeBytes ?? Infinity) >= MIN_SYSTEM_BYTES);
    const seen = new Set<string>();
    return filteredVolumes.filter((node) => {
      if (seen.has(node.id)) return false;
      seen.add(node.id);
      return true;
    });
  }, [filteredInternal, filteredExternal, showSystemDisks]);

  const handleKeyNav = (event: React.KeyboardEvent<HTMLButtonElement>, targetId: string, list: VisibleNode[]) => {
    const idx = list.findIndex((item) => item.id === targetId);
    if (idx === -1) return;

    if (event.key === 'ArrowDown' && idx < list.length - 1) {
      onSelect(list[idx + 1].node);
      event.preventDefault();
    }
    if (event.key === 'ArrowUp' && idx > 0) {
      onSelect(list[idx - 1].node);
      event.preventDefault();
    }
    if (event.key === 'ArrowRight') {
      const current = visibleMap.get(targetId);
      if (current?.children?.length) {
        setNodeCollapse((prev) => ({ ...prev, [targetId]: false }));
      }
    }
    if (event.key === 'ArrowLeft') {
      const current = visibleMap.get(targetId);
      if (current?.children?.length) {
        setNodeCollapse((prev) => ({ ...prev, [targetId]: true }));
      }
    }
    if (event.key === 'Enter' || event.key === ' ') {
      const current = visibleMap.get(targetId);
      if (current?.children?.length) {
        setNodeCollapse((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
      }
      if (current) onSelect(current);
      event.preventDefault();
    }
  };

  return (
    <aside className="glass-card w-80 max-w-full p-4 flex flex-col gap-6 overflow-y-auto scroll-hidden">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>Discos do sistema (&lt;3GB)</span>
        <button
          type="button"
          onClick={() => setShowSystemDisks((prev) => !prev)}
          className={`px-3 py-1 rounded-full text-[11px] tracking-wide transition ${
            showSystemDisks ? 'glass text-cyan-200' : 'bg-white/5 text-slate-400'
          }`}
        >
          {showSystemDisks ? 'Mostrando' : 'Ocultos'}
        </button>
      </div>

      <SidebarSection
        title="INTERNAL"
        collapsed={sectionCollapse.internal}
        onToggle={() => setSectionCollapse((prev) => ({ ...prev, internal: !prev.internal }))}
      >
        {internalList.length === 0 && <EmptyState label="Sem discos internos" />}
        {internalList.map(({ node, depth }) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={depth}
            selectedId={selectedId}
            hasChildren={Boolean(node.children?.length)}
            collapsed={nodeCollapse[node.id] === true}
            onToggle={() => setNodeCollapse((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
            onSelect={onSelect}
            onKeyDown={(event) => handleKeyNav(event, node.id, internalList)}
          />
        ))}
      </SidebarSection>

      <SidebarSection
        title="EXTERNAL"
        collapsed={sectionCollapse.external}
        onToggle={() => setSectionCollapse((prev) => ({ ...prev, external: !prev.external }))}
      >
        {externalList.length === 0 && <EmptyState label="Sem dispositivos externos" />}
        {externalList.map(({ node, depth }) => (
          <TreeNode
            key={node.id}
            node={node}
            depth={depth}
            selectedId={selectedId}
            hasChildren={Boolean(node.children?.length)}
            collapsed={nodeCollapse[node.id] === true}
            onToggle={() => setNodeCollapse((prev) => ({ ...prev, [node.id]: !prev[node.id] }))}
            onSelect={onSelect}
            onKeyDown={(event) => handleKeyNav(event, node.id, externalList)}
          />
        ))}
      </SidebarSection>

      <SidebarSection
        title="VOLUMES"
        collapsed={sectionCollapse.volumes}
        onToggle={() => setSectionCollapse((prev) => ({ ...prev, volumes: !prev.volumes }))}
      >
        {volumeNodes.length === 0 && <EmptyState label="Nenhum volume" />}
        {!sectionCollapse.volumes && (
          <ul className="space-y-1">
            {volumeNodes.map((volume) => (
              <li key={volume.id}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm transition-all ${
                    volume.id === selectedId ? 'bg-cyan-300/30 text-white' : 'text-slate-300 hover:bg-white/5'
                  }`}
                  onClick={() => onSelect(volume)}
                  onKeyDown={(event) => handleKeyNav(event, volume.id, volumeNodes.map((node) => ({ id: node.id, node, depth: 0 })))}
                >
                  <div className="flex items-center justify-between">
                    <span>{volume.label || volume.name}</span>
                    <span className="text-xs text-slate-500">{volume.filesystem || volume.type}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </SidebarSection>
    </aside>
  );
}

function SidebarSection({ title, collapsed, onToggle, children }: SidebarSectionProps) {
  return (
    <section>
      <div className="flex items-center justify-between pb-1">
        <p className="text-[11px] tracking-[0.3em] text-slate-500">{title}</p>
        <button type="button" onClick={onToggle} className="text-xs text-slate-500 hover:text-white">
          {collapsed ? 'Mostrar' : 'Ocultar'}
        </button>
      </div>
      {!collapsed && <div className="space-y-1">{children}</div>}
    </section>
  );
}

interface SidebarSectionProps {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function TreeNode({
  node,
  depth,
  selectedId,
  hasChildren,
  collapsed,
  onToggle,
  onSelect,
  onKeyDown,
}: {
  node: DiskNode;
  depth: number;
  selectedId?: string;
  hasChildren: boolean;
  collapsed: boolean;
  onToggle: () => void;
  onSelect: (node: DiskNode) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLButtonElement>) => void;
}) {
  const isSelected = selectedId === node.id;
  return (
    <button
      type="button"
      onClick={() => onSelect(node)}
      onDoubleClick={() => hasChildren && onToggle()}
      onKeyDown={onKeyDown}
      className={`w-full flex items-center gap-2 rounded-xl px-3 py-2 transition-all focus-visible:ring-2 focus-visible:ring-cyan-300/40 ${
        isSelected ? 'bg-cyan-300/30 text-white shadow-inner' : 'text-slate-300 hover:bg-white/5'
      }`}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      {hasChildren ? (
        <ToggleIcon collapsed={collapsed} onClick={(event) => { event.stopPropagation(); onToggle(); }} />
      ) : (
        <span className="w-4" aria-hidden />
      )}
      <DiskIcon type={node.type} />
      <div className="flex-1 text-left">
        <div className="text-sm font-medium leading-tight">{getFriendlyName(node)}</div>
        <div className="text-[11px] text-slate-500">
          {node.size || '—'} • {node.filesystem || node.type}
        </div>
      </div>
      {node.isMounted && <span className="text-[10px] text-cyan-200">mounted</span>}
    </button>
  );
}

function ToggleIcon({ collapsed, onClick }: { collapsed: boolean; onClick: (event: React.MouseEvent) => void }) {
  return (
    <button
      type="button"
      className="text-xs text-slate-500 hover:text-white focus-visible:ring-1 focus-visible:ring-cyan-200 rounded"
      onClick={onClick}
      aria-label={collapsed ? 'Expandir' : 'Recolher'}
    >
      {collapsed ? '▶' : '▼'}
    </button>
  );
}

function DiskIcon({ type }: { type: string }) {
  if (type === 'disk') {
    return <span className="w-2.5 h-2.5 rounded-full border border-white/30 bg-white/10" aria-hidden />;
  }
  if (type.includes('part')) {
    return <span className="text-xs" aria-hidden>▣</span>;
  }
  return <span className="text-xs" aria-hidden>◇</span>;
}

function EmptyState({ label }: { label: string }) {
  return <p className="text-sm text-slate-600 px-2 py-1">{label}</p>;
}

function getFriendlyName(node: DiskNode): string {
  if (node.type === 'disk') {
    const vendor = node.label || node.model || node.name;
    const size = node.size ? node.size : '';
    return `${vendor}${size ? ` ${size}` : ''} (${node.name})`;
  }
  return node.label || node.name;
}

function filterTree(nodes: DiskNode[], term: string | undefined, showSystem: boolean): DiskNode[] {
  const lower = term?.toLowerCase();
  const walk = (items: DiskNode[]): DiskNode[] =>
    items
      .map((node) => {
        const children = node.children ? walk(node.children) : undefined;
        const matchesTerm = lower ? (node.label || node.name).toLowerCase().includes(lower) : true;
        const isSystemNode = !showSystem && (node.sizeBytes ?? Infinity) < MIN_SYSTEM_BYTES;
        if (isSystemNode) return null;
        if (matchesTerm || (children && children.length > 0)) {
          return { ...node, children };
        }
        return null;
      })
      .filter((node): node is DiskNode => Boolean(node));
  return walk(nodes);
}
