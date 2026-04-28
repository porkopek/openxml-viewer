import { useEffect, useMemo, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Loader } from '@mantine/core';
import type { editor, IDisposable, IPosition } from 'monaco-editor';
import {
  createXmlAttributeColorDecorations,
  ensureOpenXmlTheme,
  findXmlOuterNodeRange,
} from '../lib/monaco';
import { formatBytes } from '../lib/openxml';
import type { ViewerDocument, ViewerFontSize } from '../types';

const fontSizeMap: Record<ViewerFontSize, number> = {
  xs: 11,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
};

const baseEditorOptions: editor.IStandaloneEditorConstructionOptions = {
  automaticLayout: true,
  readOnly: true,
  minimap: { enabled: false },
  lineNumbersMinChars: 4,
  fontFamily: 'SFMono-Regular, Consolas, "Liberation Mono", Menlo, monospace',
  renderWhitespace: 'all',
  scrollBeyondLastLine: false,
  renderLineHighlight: 'line',
  wordWrap: 'off',
  folding: true,
  foldingStrategy: 'auto',
  foldingHighlight: true,
  showFoldingControls: 'mouseover',
  guides: {
    indentation: true,
    bracketPairs: true,
  },
  bracketPairColorization: {
    enabled: true,
    independentColorPoolPerBracketType: true,
  },
  padding: {
    top: 16,
    bottom: 16,
  },
};

interface CodeViewerProps {
  document: ViewerDocument | null;
  fontSize: ViewerFontSize;
  loading: boolean;
  error: string | null;
  onEditorMount: (editor: editor.IStandaloneCodeEditor) => void;
}

export function CodeViewer({ document, fontSize, loading, error, onEditorMount }: CodeViewerProps) {
  ensureOpenXmlTheme();
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const decorationsRef = useRef<editor.IEditorDecorationsCollection | null>(null);
  const modelSubscriptionRef = useRef<IDisposable | null>(null);
  const mouseDownSubscriptionRef = useRef<IDisposable | null>(null);
  const contextMenuSubscriptionRef = useRef<IDisposable | null>(null);

  const editorOptions = useMemo<editor.IStandaloneEditorConstructionOptions>(
    () => ({
      ...baseEditorOptions,
      fontSize: fontSizeMap[fontSize],
    }),
    [fontSize]
  );

  function applyAttributeDecorations() {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      return;
    }

    if (!decorationsRef.current) {
      decorationsRef.current = editorInstance.createDecorationsCollection();
    }

    decorationsRef.current.set(
      createXmlAttributeColorDecorations(editorInstance.getModel(), document?.language)
    );
  }

  function maybeSelectOuterXmlNode(position: IPosition | null | undefined) {
    const editorInstance = editorRef.current;
    if (!editorInstance || document?.language !== 'xml') {
      return;
    }

    const selection = editorInstance.getSelection();
    if (selection && !selection.isEmpty()) {
      return;
    }

    const range = findXmlOuterNodeRange(editorInstance.getModel(), position, document.language);
    if (!range) {
      return;
    }

    editorInstance.setSelection(range);
  }

  useEffect(() => {
    if (!editorRef.current) {
      return undefined;
    }

    const frame = window.requestAnimationFrame(() => {
      applyAttributeDecorations();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [document?.content, document?.language, document?.path]);

  useEffect(() => {
    return () => {
      modelSubscriptionRef.current?.dispose();
      mouseDownSubscriptionRef.current?.dispose();
      contextMenuSubscriptionRef.current?.dispose();
      decorationsRef.current?.clear();
    };
  }, []);

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-white">
      <div className="border-b border-zinc-200 px-4 py-3">
        {document ? (
          <>
            <div className="truncate text-sm font-medium text-zinc-950">{document.path}</div>
            <div className="mt-1 text-xs text-zinc-500">
              {document.binary ? 'binary hex preview' : document.language} · {formatBytes(document.size)}
              {document.truncated ? ' · truncated' : ''}
            </div>
          </>
        ) : (
          <div className="text-sm text-zinc-500">Select a file to inspect it.</div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {error ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-red-600">{error}</div>
        ) : loading ? (
          <div className="flex h-full items-center justify-center gap-3 text-sm text-zinc-500">
            <Loader size="sm" color="gray" />
            <span>Opening file…</span>
          </div>
        ) : document ? (
          <Editor
            path={document.path}
            language={document.language}
            theme="openxml-minimal"
            value={document.content}
            options={editorOptions}
            onMount={(editorInstance) => {
              editorRef.current = editorInstance;
              decorationsRef.current = editorInstance.createDecorationsCollection();
              modelSubscriptionRef.current?.dispose();
              mouseDownSubscriptionRef.current?.dispose();
              contextMenuSubscriptionRef.current?.dispose();
              modelSubscriptionRef.current = editorInstance.onDidChangeModel(() => {
                window.requestAnimationFrame(() => {
                  applyAttributeDecorations();
                });
              });
              mouseDownSubscriptionRef.current = editorInstance.onMouseDown((event) => {
                if (event.event.rightButton) {
                  maybeSelectOuterXmlNode(event.target.position);
                }
              });
              contextMenuSubscriptionRef.current = editorInstance.onContextMenu((event) => {
                maybeSelectOuterXmlNode(event.target.position ?? editorInstance.getPosition());
              });
              onEditorMount(editorInstance);
              window.requestAnimationFrame(() => {
                applyAttributeDecorations();
              });
            }}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-zinc-500">
            Choose a part from the tree to preview it here.
          </div>
        )}
      </div>
    </section>
  );
}
