import type { TreeNodeData } from '@mantine/core';
import type JSZip from 'jszip';

export type PackageKind = 'word' | 'spreadsheet' | 'presentation' | 'generic';
export type ViewerFontSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface PackageEntryMeta {
  path: string;
  name: string;
  extension: string;
  isLikelyText: boolean;
}

export interface ViewerDocument {
  path: string;
  content: string;
  language: string;
  size: number;
  binary: boolean;
  truncated?: boolean;
}

export interface QuickLink {
  label: string;
  path: string;
  score: number;
}

export interface OpenXmlPackage {
  fileName: string;
  kind: PackageKind;
  zip: JSZip;
  entryPaths: string[];
  entries: Record<string, PackageEntryMeta>;
  treeData: TreeNodeData[];
  rootExpandedValues: string[];
  defaultPath: string | null;
}
