import type { PackageKind, QuickLink } from '../types';

interface ShortcutDefinition {
  label: string;
  path: string;
  priority: number;
}

const genericShortcuts: ShortcutDefinition[] = [
  { label: 'content-types', path: '[Content_Types].xml', priority: 40 },
  { label: 'rels', path: '_rels/.rels', priority: 41 },
  { label: 'core', path: 'docProps/core.xml', priority: 42 },
  { label: 'app', path: 'docProps/app.xml', priority: 43 },
];

const packageShortcuts: Record<PackageKind, ShortcutDefinition[]> = {
  word: [
    { label: 'document', path: 'word/document.xml', priority: 1 },
    { label: 'styles', path: 'word/styles.xml', priority: 2 },
    { label: 'numbering', path: 'word/numbering.xml', priority: 3 },
    { label: 'settings', path: 'word/settings.xml', priority: 4 },
    { label: 'fontTable', path: 'word/fontTable.xml', priority: 5 },
    { label: 'theme1', path: 'word/theme/theme1.xml', priority: 6 },
    { label: 'document.rels', path: 'word/_rels/document.xml.rels', priority: 7 },
    { label: 'comments', path: 'word/comments.xml', priority: 8 },
  ],
  spreadsheet: [
    { label: 'workbook', path: 'xl/workbook.xml', priority: 1 },
    { label: 'sharedStrings', path: 'xl/sharedStrings.xml', priority: 2 },
    { label: 'styles', path: 'xl/styles.xml', priority: 3 },
    { label: 'sheet1', path: 'xl/worksheets/sheet1.xml', priority: 4 },
    { label: 'theme1', path: 'xl/theme/theme1.xml', priority: 5 },
    { label: 'workbook.rels', path: 'xl/_rels/workbook.xml.rels', priority: 6 },
  ],
  presentation: [
    { label: 'presentation', path: 'ppt/presentation.xml', priority: 1 },
    { label: 'slide1', path: 'ppt/slides/slide1.xml', priority: 2 },
    { label: 'theme1', path: 'ppt/theme/theme1.xml', priority: 3 },
    { label: 'slideMaster1', path: 'ppt/slideMasters/slideMaster1.xml', priority: 4 },
    { label: 'presentation.rels', path: 'ppt/_rels/presentation.xml.rels', priority: 5 },
    { label: 'presProps', path: 'ppt/presProps.xml', priority: 6 },
    { label: 'viewProps', path: 'ppt/viewProps.xml', priority: 7 },
  ],
  generic: [],
};

function dedupeByPath(links: QuickLink[]): QuickLink[] {
  const seen = new Set<string>();

  return links.filter((link) => {
    if (seen.has(link.path)) {
      return false;
    }

    seen.add(link.path);
    return true;
  });
}

function shortLabelFromPath(path: string): string {
  const name = path.split('/').pop() ?? path;
  const base = name.replace(/\.[^.]+$/, '');
  return base.length > 18 ? `${base.slice(0, 15)}…` : base;
}

function isLikelyTextPath(path: string): boolean {
  return /\.(xml|rels|txt|json|html|htm|vml|xsd|svg|yml|yaml|md)$/i.test(path);
}

export function getPreferredPath(kind: PackageKind, filePaths: string[], lastPath?: string | null): string | null {
  if (lastPath && filePaths.includes(lastPath)) {
    return lastPath;
  }

  const candidates = [...packageShortcuts[kind], ...genericShortcuts].sort((left, right) => left.priority - right.priority);
  for (const candidate of candidates) {
    if (filePaths.includes(candidate.path)) {
      return candidate.path;
    }
  }

  return filePaths.find(isLikelyTextPath) ?? filePaths[0] ?? null;
}

export function getQuickLinks(
  kind: PackageKind,
  filePaths: string[],
  visitCounts: Record<string, number> = {}
): QuickLink[] {
  const shortcutLinks = [...packageShortcuts[kind], ...genericShortcuts]
    .filter((shortcut) => filePaths.includes(shortcut.path))
    .map<QuickLink>((shortcut) => ({
      label: shortcut.label,
      path: shortcut.path,
      score: (visitCounts[shortcut.path] ?? 0) * 100 + (100 - shortcut.priority),
    }));

  const dynamicLinks = Object.entries(visitCounts)
    .filter(([path, count]) => count > 0 && filePaths.includes(path))
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 4)
    .map<QuickLink>(([path, count]) => ({
      label: shortLabelFromPath(path),
      path,
      score: count * 1000,
    }));

  return dedupeByPath([...shortcutLinks, ...dynamicLinks])
    .sort((left, right) => right.score - left.score || left.label.localeCompare(right.label))
    .slice(0, 8);
}
