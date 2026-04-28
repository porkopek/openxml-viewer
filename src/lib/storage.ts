import type { PackageKind, ViewerFontSize } from '../types';

const defaultFontSize: ViewerFontSize = 'md';
const validFontSizes = new Set<ViewerFontSize>(['xs', 'sm', 'md', 'lg', 'xl']);

export interface StoredState {
  visitCounts: Record<PackageKind, Record<string, number>>;
  lastPathByKind: Partial<Record<PackageKind, string>>;
  fontSize: ViewerFontSize;
}

const STORAGE_KEY = 'openxml-viewer.state.v1';

function createEmptyState(): StoredState {
  return {
    visitCounts: {
      word: {},
      spreadsheet: {},
      presentation: {},
      generic: {},
    },
    lastPathByKind: {},
    fontSize: defaultFontSize,
  };
}

export function loadStoredState(): StoredState {
  if (typeof window === 'undefined') {
    return createEmptyState();
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return createEmptyState();
    }

    const parsed = JSON.parse(raw) as Partial<StoredState>;
    return {
      visitCounts: {
        word: parsed.visitCounts?.word ?? {},
        spreadsheet: parsed.visitCounts?.spreadsheet ?? {},
        presentation: parsed.visitCounts?.presentation ?? {},
        generic: parsed.visitCounts?.generic ?? {},
      },
      lastPathByKind: parsed.lastPathByKind ?? {},
      fontSize: validFontSizes.has(parsed.fontSize as ViewerFontSize)
        ? (parsed.fontSize as ViewerFontSize)
        : defaultFontSize,
    };
  } catch {
    return createEmptyState();
  }
}

export function saveStoredState(state: StoredState): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
