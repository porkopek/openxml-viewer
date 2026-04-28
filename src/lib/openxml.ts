import JSZip from 'jszip';
import formatXml from 'xml-formatter';
import type { OpenXmlPackage, PackageEntryMeta, PackageKind, ViewerDocument } from '../types';
import { getPreferredPath } from './quickLinks';
import { buildTreeData, getRootExpandedValues } from './tree';

const MAX_HEX_BYTES = 8 * 1024;
const textExtensions = new Set([
  'xml',
  'rels',
  'txt',
  'json',
  'csv',
  'tsv',
  'html',
  'htm',
  'vml',
  'xsd',
  'svg',
  'yml',
  'yaml',
  'md',
  'css',
  'js',
  'ts',
]);

const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: 'base',
});

export async function loadOpenXmlPackage(file: File, lastPath?: string | null): Promise<OpenXmlPackage> {
  let zip: JSZip;

  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error('This file could not be opened as an OpenXML package.');
  }

  const entryPaths = Object.values(zip.files)
    .filter((entry) => !entry.dir)
    .map((entry) => entry.name)
    .sort(collator.compare);

  if (entryPaths.length === 0) {
    throw new Error('This package is empty.');
  }

  const entries = entryPaths.reduce<Record<string, PackageEntryMeta>>((accumulator, path) => {
    accumulator[path] = createMeta(path);
    return accumulator;
  }, {});

  const treeData = buildTreeData(entryPaths);
  const kind = detectPackageKind(entryPaths);

  return {
    fileName: file.name,
    kind,
    zip,
    entryPaths,
    entries,
    treeData,
    rootExpandedValues: getRootExpandedValues(treeData),
    defaultPath: getPreferredPath(kind, entryPaths, lastPath),
  };
}

export async function loadViewerDocument(pkg: OpenXmlPackage, path: string): Promise<ViewerDocument> {
  const entry = pkg.zip.file(path);
  if (!entry) {
    throw new Error(`Could not find ${path} inside this package.`);
  }

  const bytes = await entry.async('uint8array');
  const size = bytes.byteLength;
  const meta = pkg.entries[path];

  if (meta?.isLikelyText && isProbablyText(bytes)) {
    const decoded = decodeText(bytes);
    return {
      path,
      content: formatTextContent(path, decoded),
      language: inferLanguage(path),
      size,
      binary: false,
    };
  }

  return {
    path,
    content: createHexPreview(bytes),
    language: 'plaintext',
    size,
    binary: true,
    truncated: size > MAX_HEX_BYTES,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function createMeta(path: string): PackageEntryMeta {
  const name = path.split('/').pop() ?? path;
  const extension = getExtension(path);

  return {
    path,
    name,
    extension,
    isLikelyText: textExtensions.has(extension),
  };
}

function detectPackageKind(entryPaths: string[]): PackageKind {
  if (entryPaths.some((path) => path.startsWith('word/'))) {
    return 'word';
  }

  if (entryPaths.some((path) => path.startsWith('xl/'))) {
    return 'spreadsheet';
  }

  if (entryPaths.some((path) => path.startsWith('ppt/'))) {
    return 'presentation';
  }

  return 'generic';
}

function getExtension(path: string): string {
  if (path.endsWith('.rels')) {
    return 'rels';
  }

  const name = path.split('/').pop() ?? path;
  const dotIndex = name.lastIndexOf('.');
  return dotIndex === -1 ? '' : name.slice(dotIndex + 1).toLowerCase();
}

function inferLanguage(path: string): string {
  const extension = getExtension(path);

  if (['xml', 'rels', 'vml', 'xsd', 'svg'].includes(extension)) {
    return 'xml';
  }

  if (extension === 'json') {
    return 'json';
  }

  if (['html', 'htm'].includes(extension)) {
    return 'html';
  }

  if (extension === 'ts') {
    return 'typescript';
  }

  if (extension === 'js') {
    return 'javascript';
  }

  if (extension === 'css') {
    return 'css';
  }

  if (extension === 'md') {
    return 'markdown';
  }

  return 'plaintext';
}

function isProbablyText(bytes: Uint8Array): boolean {
  if (bytes.length === 0) {
    return true;
  }

  const sample = bytes.subarray(0, Math.min(bytes.length, 2048));
  let suspicious = 0;

  for (const byte of sample) {
    if (byte === 0) {
      return false;
    }

    if (byte < 7 || (byte > 14 && byte < 32)) {
      suspicious += 1;
    }
  }

  return suspicious / sample.length < 0.15;
}

function decodeText(bytes: Uint8Array): string {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  }

  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  }

  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    try {
      return new TextDecoder('utf-16le', { fatal: true }).decode(bytes);
    } catch {
      return new TextDecoder().decode(bytes);
    }
  }
}

function formatTextContent(path: string, input: string): string {
  const normalized = input.replace(/\uFEFF/g, '').replace(/\r\n?/g, '\n');
  const extension = getExtension(path);

  if (['xml', 'rels', 'vml', 'xsd', 'svg'].includes(extension)) {
    const xmlCandidate = normalized.trim();
    try {
      return formatXml(xmlCandidate, {
        indentation: '  ',
        collapseContent: true,
        lineSeparator: '\n',
      }).trimEnd();
    } catch {
      return xmlCandidate;
    }
  }

  if (extension === 'json') {
    try {
      return JSON.stringify(JSON.parse(normalized), null, 2);
    } catch {
      return normalized;
    }
  }

  return normalized;
}

function createHexPreview(bytes: Uint8Array): string {
  const sliced = bytes.subarray(0, MAX_HEX_BYTES);
  const lines: string[] = [];

  for (let offset = 0; offset < sliced.length; offset += 16) {
    const row = sliced.subarray(offset, offset + 16);
    const hex = Array.from(row)
      .map((byte) => byte.toString(16).toUpperCase().padStart(2, '0'))
      .join(' ')
      .padEnd(16 * 3 - 1, ' ');
    const ascii = Array.from(row)
      .map((byte) => (byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : '.'))
      .join('')
      .padEnd(16, ' ');

    lines.push(`${offset.toString(16).toUpperCase().padStart(8, '0')}  ${hex}  |${ascii}|`);
  }

  if (bytes.length > MAX_HEX_BYTES) {
    lines.push('');
    lines.push(`… truncated after ${formatBytes(MAX_HEX_BYTES)} of ${formatBytes(bytes.length)}.`);
  }

  return lines.join('\n');
}
