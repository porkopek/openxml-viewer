import type { TreeNodeData } from '@mantine/core';

interface BranchNode {
  name: string;
  path: string;
  file: boolean;
  children: Map<string, BranchNode>;
}

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

function createBranch(name: string, path: string, file = false): BranchNode {
  return {
    name,
    path,
    file,
    children: new Map<string, BranchNode>(),
  };
}

function insertPath(store: Map<string, BranchNode>, fullPath: string): void {
  const segments = fullPath.split('/').filter(Boolean);
  let current = store;
  let currentPath = '';

  segments.forEach((segment, index) => {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment;
    const isFile = index === segments.length - 1;

    if (!current.has(segment)) {
      current.set(segment, createBranch(segment, currentPath, isFile));
    }

    const next = current.get(segment)!;
    if (isFile) {
      next.file = true;
    }
    current = next.children;
  });
}

function sortBranches(left: BranchNode, right: BranchNode): number {
  if (left.file !== right.file) {
    return left.file ? 1 : -1;
  }

  return collator.compare(left.name, right.name);
}

function toTreeNode(branch: BranchNode): TreeNodeData {
  const children = Array.from(branch.children.values()).sort(sortBranches).map(toTreeNode);

  if (children.length > 0) {
    return {
      value: branch.path,
      label: branch.name,
      children,
    };
  }

  return {
    value: branch.path,
    label: branch.name,
  };
}

export function buildTreeData(paths: string[]): TreeNodeData[] {
  const root = new Map<string, BranchNode>();

  paths.forEach((path) => insertPath(root, path));

  return Array.from(root.values()).sort(sortBranches).map(toTreeNode);
}

export function getRootExpandedValues(data: TreeNodeData[]): string[] {
  return data.filter((node) => Array.isArray(node.children) && node.children.length > 0).map((node) => node.value);
}
