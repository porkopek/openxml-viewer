import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import type { editor as MonacoEditor, IDisposable } from 'monaco-editor';
import { CodeViewer } from './components/CodeViewer';
import { FileTreePane } from './components/FileTreePane';
import { PackageDropzone } from './components/PackageDropzone';
import { TopBar } from './components/TopBar';
import { loadOpenXmlPackage, loadViewerDocument } from './lib/openxml';
import { getQuickLinks } from './lib/quickLinks';
import { loadStoredState, saveStoredState } from './lib/storage';
import type { OpenXmlPackage, ViewerDocument, ViewerFontSize } from './types';

const openXmlFileAccept = '.docx,.docm,.dotx,.dotm,.xlsx,.xlsm,.xltx,.xltm,.pptx,.pptm,.potx,.potm,.ppsx,.ppsm,.zip';

function kindLabel(kind: OpenXmlPackage['kind']): string {
  switch (kind) {
    case 'word':
      return 'wordprocessingml';
    case 'spreadsheet':
      return 'spreadsheetml';
    case 'presentation':
      return 'presentationml';
    default:
      return 'openxml package';
  }
}

export default function App() {
  const openRef = useRef<(() => void) | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<MonacoEditor.IStandaloneCodeEditor | null>(null);
  const selectionSubscriptionRef = useRef<IDisposable | null>(null);
  const documentCacheRef = useRef<Map<string, ViewerDocument>>(new Map());

  const [storedState, setStoredState] = useState(() => loadStoredState());
  const [packageState, setPackageState] = useState<OpenXmlPackage | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [currentDocument, setCurrentDocument] = useState<ViewerDocument | null>(null);
  const [packageLoading, setPackageLoading] = useState(false);
  const [documentLoading, setDocumentLoading] = useState(false);
  const [packageError, setPackageError] = useState<string | null>(null);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [canCopySelection, setCanCopySelection] = useState(false);

  const quickLinks = useMemo(() => {
    if (!packageState) {
      return [];
    }

    return getQuickLinks(
      packageState.kind,
      packageState.entryPaths,
      storedState.visitCounts[packageState.kind]
    );
  }, [packageState, storedState]);

  useEffect(() => {
    saveStoredState(storedState);
  }, [storedState]);

  useEffect(() => {
    if (!statusMessage) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setStatusMessage(null), 1800);
    return () => window.clearTimeout(timeout);
  }, [statusMessage]);

  useEffect(() => {
    return () => {
      selectionSubscriptionRef.current?.dispose();
    };
  }, []);

  useEffect(() => {
    if (!packageState || !selectedPath) {
      return;
    }

    setStoredState((current) => {
      const currentVisitCounts = current.visitCounts[packageState.kind];
      return {
        ...current,
        visitCounts: {
          ...current.visitCounts,
          [packageState.kind]: {
            ...currentVisitCounts,
            [selectedPath]: (currentVisitCounts[selectedPath] ?? 0) + 1,
          },
        },
        lastPathByKind: {
          ...current.lastPathByKind,
          [packageState.kind]: selectedPath,
        },
      };
    });
  }, [packageState, selectedPath]);

  useEffect(() => {
    if (!packageState || !selectedPath) {
      return;
    }

    setCanCopySelection(false);

    const cachedDocument = documentCacheRef.current.get(selectedPath);
    if (cachedDocument) {
      setCurrentDocument(cachedDocument);
      setDocumentLoading(false);
      setViewerError(null);
      return;
    }

    let cancelled = false;
    setDocumentLoading(true);
    setCurrentDocument(null);
    setViewerError(null);
    setCanCopySelection(false);

    void loadViewerDocument(packageState, selectedPath)
      .then((nextDocument) => {
        if (cancelled) {
          return;
        }

        documentCacheRef.current.set(selectedPath, nextDocument);
        setCurrentDocument(nextDocument);
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }

        setViewerError(error instanceof Error ? error.message : 'Could not open this part.');
      })
      .finally(() => {
        if (!cancelled) {
          setDocumentLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [packageState, selectedPath]);

  async function handleIncomingFile(file: File) {
    setPackageLoading(true);
    setPackageError(null);
    setViewerError(null);
    setStatusMessage(null);
    setCurrentDocument(null);
    setSelectedPath(null);
    setCanCopySelection(false);

    try {
      const nextPackage = await loadOpenXmlPackage(file);
      const rememberedPath = storedState.lastPathByKind[nextPackage.kind];
      const initialPath = rememberedPath && nextPackage.entryPaths.includes(rememberedPath)
        ? rememberedPath
        : nextPackage.defaultPath;

      documentCacheRef.current = new Map();
      setPackageState(nextPackage);
      setSelectedPath(initialPath);
    } catch (error: unknown) {
      setPackageState(null);
      setPackageError(error instanceof Error ? error.message : 'Could not open this package.');
    } finally {
      setPackageLoading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';

    if (file) {
      void handleIncomingFile(file);
    }
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(`${label} copied`);
    } catch {
      setStatusMessage(`Could not copy ${label.toLowerCase()}`);
    }
  }

  function handleEditorMount(editorInstance: MonacoEditor.IStandaloneCodeEditor) {
    editorRef.current = editorInstance;
    selectionSubscriptionRef.current?.dispose();
    selectionSubscriptionRef.current = editorInstance.onDidChangeCursorSelection(() => {
      const selection = editorInstance.getSelection();
      setCanCopySelection(Boolean(selection && !selection.isEmpty()));
    });

    const selection = editorInstance.getSelection();
    setCanCopySelection(Boolean(selection && !selection.isEmpty()));
  }

  function handleCopySelection() {
    const editorInstance = editorRef.current;
    const selection = editorInstance?.getSelection();
    const model = editorInstance?.getModel();

    if (!editorInstance || !selection || selection.isEmpty() || !model) {
      return;
    }

    void copyToClipboard(model.getValueInRange(selection), 'Selection');
  }

  function handleCopyFile() {
    if (!currentDocument) {
      return;
    }

    void copyToClipboard(currentDocument.content, 'File');
  }

  function handleFoldAll() {
    const action = editorRef.current?.getAction('editor.foldAll');
    if (action) {
      void action.run();
    }
  }

  function handleFontSizeChange(nextFontSize: ViewerFontSize) {
    setStoredState((current) => (
      current.fontSize === nextFontSize
        ? current
        : {
            ...current,
            fontSize: nextFontSize,
          }
    ));
  }

  function handleFoldLevel(level: number) {
    const editorInstance = editorRef.current;
    if (!editorInstance) {
      return;
    }

    const nativeLevel = Math.min(level, 7);
    const unfoldAction = editorInstance.getAction('editor.unfoldAll');
    const foldAction = editorInstance.getAction(`editor.foldLevel${nativeLevel}`);

    if (!unfoldAction || !foldAction) {
      return;
    }

    void unfoldAction.run().then(() => foldAction.run()).then(() => {
      if (level > 7) {
        setStatusMessage(`Monaco supports native fold levels up to 7, so ${level} uses level 7.`);
      }
    });
  }

  function handleUnfoldAll() {
    const action = editorRef.current?.getAction('editor.unfoldAll');
    if (action) {
      void action.run();
    }
  }

  if (!packageState) {
    return (
      <>
        <input
          ref={fileInputRef}
          type="file"
          accept={openXmlFileAccept}
          className="hidden"
          onChange={handleInputChange}
        />
        <PackageDropzone
          loading={packageLoading}
          error={packageError}
          openRef={openRef}
          onFile={handleIncomingFile}
          onReject={setPackageError}
        />
      </>
    );
  }

  return (
    <div className="flex h-full min-h-screen flex-col bg-zinc-50">
      <input
        ref={fileInputRef}
        type="file"
        accept={openXmlFileAccept}
        className="hidden"
        onChange={handleInputChange}
      />
      <TopBar
        fileName={packageState.fileName}
        kindLabel={kindLabel(packageState.kind)}
        selectedPath={selectedPath}
        quickLinks={quickLinks}
        fontSize={storedState.fontSize}
        hasDocument={Boolean(currentDocument)}
        canCopySelection={canCopySelection}
        statusMessage={statusMessage}
        onOpenPackage={() => fileInputRef.current?.click()}
        onCopySelection={handleCopySelection}
        onCopyFile={handleCopyFile}
        onFontSizeChange={handleFontSizeChange}
        onFoldAll={handleFoldAll}
        onFoldLevel={handleFoldLevel}
        onUnfoldAll={handleUnfoldAll}
        onSelectQuickLink={setSelectedPath}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[minmax(280px,340px)_1fr]">
        <FileTreePane
          key={`${packageState.fileName}-${packageState.entryPaths.length}`}
          fileName={packageState.fileName}
          treeData={packageState.treeData}
          rootExpandedValues={packageState.rootExpandedValues}
          selectedPath={selectedPath}
          onSelectPath={setSelectedPath}
        />

        <CodeViewer
          document={currentDocument}
          fontSize={storedState.fontSize}
          loading={documentLoading}
          error={viewerError}
          onEditorMount={handleEditorMount}
        />
      </div>
    </div>
  );
}
