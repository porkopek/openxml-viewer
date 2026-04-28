import { useEffect, useMemo, useState } from 'react';
import { filterTreeData, getTreeExpandedState, ScrollArea, type TreeNodeData } from '@mantine/core';
import {
  IconCheck,
  IconChevronRight,
  IconCopy,
  IconFile,
  IconFileCode,
  IconFileSpreadsheet,
  IconFolder,
  IconFolderOpen,
  IconPhoto,
  IconPresentation,
} from '@tabler/icons-react';

interface FileTreePaneProps {
  fileName: string;
  treeData: TreeNodeData[];
  rootExpandedValues: string[];
  selectedPath: string | null;
  onSelectPath: (path: string) => void;
}

type ExpandedState = ReturnType<typeof getTreeExpandedState>;

interface FileTreeNodeProps {
  node: TreeNodeData;
  depth: number;
  expandedState: ExpandedState;
  selectedPath: string | null;
  searchActive: boolean;
  copiedPath: string | null;
  onToggleExpanded: (path: string) => void;
  onCopyPath: (path: string) => void;
  onSelectPath: (path: string) => void;
}

function getNodeIcon(path: string, hasChildren: boolean, expanded: boolean) {
  if (hasChildren) {
    return expanded ? (
      <IconFolderOpen size={16} stroke={1.6} className="text-zinc-500" />
    ) : (
      <IconFolder size={16} stroke={1.6} className="text-zinc-500" />
    );
  }

  if (/\.(png|jpg|jpeg|gif|webp|svg)$/i.test(path)) {
    return <IconPhoto size={16} stroke={1.6} className="text-zinc-500" />;
  }

  if (path.startsWith('xl/')) {
    return <IconFileSpreadsheet size={16} stroke={1.6} className="text-zinc-500" />;
  }

  if (path.startsWith('ppt/')) {
    return <IconPresentation size={16} stroke={1.6} className="text-zinc-500" />;
  }

  if (/\.(xml|rels|json|vml|xsd|html|htm|css|js|ts|txt|md)$/i.test(path)) {
    return <IconFileCode size={16} stroke={1.6} className="text-zinc-500" />;
  }

  return <IconFile size={16} stroke={1.6} className="text-zinc-500" />;
}

function FileTreeNode({
  node,
  depth,
  expandedState,
  selectedPath,
  searchActive,
  copiedPath,
  onToggleExpanded,
  onCopyPath,
  onSelectPath,
}: FileTreeNodeProps) {
  const children = Array.isArray(node.children) ? node.children : [];
  const hasChildren = children.length > 0;
  const expanded = hasChildren ? Boolean(expandedState[node.value]) : false;
  const selected = selectedPath === node.value;
  const label = typeof node.label === 'string' ? node.label : node.value;

  return (
    <li>
      <div className="group flex items-center gap-1">
        <button
          type="button"
          title={node.value}
          onClick={() => {
            if (hasChildren) {
              onToggleExpanded(node.value);
              return;
            }

            onSelectPath(node.value);
          }}
          className={[
            'flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1 text-left text-sm transition',
            selected ? 'bg-blue-50 text-zinc-950' : 'text-zinc-700 hover:bg-zinc-50',
          ].join(' ')}
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span
            className={`inline-flex h-4 w-4 items-center justify-center transition ${hasChildren ? 'text-zinc-500' : 'opacity-0'}`}
            aria-hidden="true"
          >
            {hasChildren ? (
              <IconChevronRight
                size={14}
                stroke={1.6}
                className={expanded ? 'rotate-90 transition-transform' : 'transition-transform'}
              />
            ) : null}
          </span>
          {getNodeIcon(node.value, hasChildren, expanded)}
          <span className="min-w-0 truncate">{label}</span>
          {searchActive && hasChildren ? <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-zinc-400">folder</span> : null}
        </button>

        <button
          type="button"
          title="Copy node path"
          aria-label={`Copy path for ${label}`}
          onClick={(event) => {
            event.stopPropagation();
            onCopyPath(node.value);
          }}
          className={[
            'mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition',
            copiedPath === node.value
              ? 'text-zinc-700 opacity-100'
              : 'text-zinc-400 opacity-0 group-hover:opacity-100 hover:text-zinc-700',
          ].join(' ')}
        >
          {copiedPath === node.value ? <IconCheck size={14} stroke={1.8} /> : <IconCopy size={14} stroke={1.8} />}
        </button>
      </div>

      {hasChildren && expanded ? (
        <ul className="relative">
          {children.map((child) => (
            <FileTreeNode
              key={child.value}
              node={child}
              depth={depth + 1}
              expandedState={expandedState}
              selectedPath={selectedPath}
              searchActive={searchActive}
              copiedPath={copiedPath}
              onToggleExpanded={onToggleExpanded}
              onCopyPath={onCopyPath}
              onSelectPath={onSelectPath}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function FileTreePane({ fileName, treeData, rootExpandedValues, selectedPath, onSelectPath }: FileTreePaneProps) {
  const [query, setQuery] = useState('');
  const [expandedState, setExpandedState] = useState<ExpandedState>(() =>
    getTreeExpandedState(treeData, rootExpandedValues)
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  useEffect(() => {
    setQuery('');
    setExpandedState(getTreeExpandedState(treeData, rootExpandedValues));
    setCopiedPath(null);
  }, [treeData, rootExpandedValues]);

  useEffect(() => {
    if (!copiedPath) {
      return undefined;
    }

    const timeout = window.setTimeout(() => {
      setCopiedPath((current) => (current === copiedPath ? null : current));
    }, 1400);

    return () => window.clearTimeout(timeout);
  }, [copiedPath]);

  const filteredData = useMemo(() => filterTreeData(treeData, query), [treeData, query]);
  const searchActive = query.trim().length > 0;
  const displayExpandedState = useMemo(
    () => (searchActive ? getTreeExpandedState(filteredData, '*') : expandedState),
    [expandedState, filteredData, searchActive]
  );

  function handleToggleExpanded(path: string) {
    if (searchActive) {
      return;
    }

    setExpandedState((current) => ({
      ...current,
      [path]: !current[path],
    }));
  }

  function handleCopyPath(path: string) {
    void navigator.clipboard.writeText(path).then(() => {
      setCopiedPath(path);
    });
  }

  return (
    <aside className="flex min-h-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-3 py-3">
        <div className="mb-2 min-w-0 truncate text-xs uppercase tracking-[0.14em] text-zinc-400">{fileName}</div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Filter files"
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400"
        />
      </div>

      <ScrollArea className="min-h-0 flex-1 p-2">
        {filteredData.length > 0 ? (
          <ul className="space-y-0.5">
            {filteredData.map((node) => (
              <FileTreeNode
                key={node.value}
                node={node}
                depth={0}
                expandedState={displayExpandedState}
                selectedPath={selectedPath}
                searchActive={searchActive}
                copiedPath={copiedPath}
                onToggleExpanded={handleToggleExpanded}
                onCopyPath={handleCopyPath}
                onSelectPath={onSelectPath}
              />
            ))}
          </ul>
        ) : (
          <div className="px-2 py-4 text-sm text-zinc-500">No matching files.</div>
        )}
      </ScrollArea>
    </aside>
  );
}
