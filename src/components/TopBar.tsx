import { SegmentedControl } from '@mantine/core';
import type { QuickLink, ViewerFontSize } from '../types';
import { LinkButton } from './LinkButton';

interface TopBarProps {
  fileName: string;
  kindLabel: string;
  selectedPath: string | null;
  quickLinks: QuickLink[];
  fontSize: ViewerFontSize;
  hasDocument: boolean;
  canCopySelection: boolean;
  statusMessage: string | null;
  onOpenPackage: () => void;
  onCopySelection: () => void;
  onCopyFile: () => void;
  onFontSizeChange: (value: ViewerFontSize) => void;
  onFoldAll: () => void;
  onFoldLevel: (level: number) => void;
  onUnfoldAll: () => void;
  onSelectQuickLink: (path: string) => void;
}

export function TopBar({
  fileName,
  kindLabel,
  selectedPath,
  quickLinks,
  fontSize,
  hasDocument,
  canCopySelection,
  statusMessage,
  onOpenPackage,
  onCopySelection,
  onCopyFile,
  onFontSizeChange,
  onFoldAll,
  onFoldLevel,
  onUnfoldAll,
  onSelectQuickLink,
}: TopBarProps) {
  const foldLevels = Array.from({ length: 9 }, (_, index) => index + 1);
  const fontSizes: ViewerFontSize[] = ['xs', 'sm', 'md', 'lg', 'xl'];

  return (
    <header className="border-b border-zinc-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="min-w-0 pr-2">
          <div className="truncate text-sm font-medium text-zinc-950">{fileName}</div>
          <div className="text-xs uppercase tracking-[0.14em] text-zinc-400">{kindLabel}</div>
        </div>

        <LinkButton onClick={onOpenPackage}>open package</LinkButton>
        <LinkButton onClick={onCopySelection} disabled={!canCopySelection}>
          copy selection
        </LinkButton>
        <LinkButton onClick={onCopyFile} disabled={!hasDocument}>
          copy file
        </LinkButton>
        <LinkButton onClick={onFoldAll} disabled={!hasDocument}>
          fold all
        </LinkButton>
        <LinkButton onClick={onUnfoldAll} disabled={!hasDocument}>
          unfold all
        </LinkButton>

        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-[0.14em] text-zinc-400">font</span>
          <SegmentedControl<ViewerFontSize>
            value={fontSize}
            onChange={onFontSizeChange}
            size="xs"
            radius="xl"
            transitionDuration={100}
            data={fontSizes}
            styles={{
              root: {
                background: '#f4f4f5',
                border: '1px solid #e4e4e7',
              },
              indicator: {
                background: '#ffffff',
                border: '1px solid #d4d4d8',
                boxShadow: 'none',
              },
              label: {
                color: '#52525b',
                fontSize: '12px',
                lineHeight: 1,
                padding: '6px 10px',
              },
              innerLabel: {
                fontWeight: 500,
              },
            }}
          />
        </div>

        <span className="text-xs uppercase tracking-[0.14em] text-zinc-400">levels</span>

        {foldLevels.map((level) => (
          <LinkButton key={level} onClick={() => onFoldLevel(level)} disabled={!hasDocument}>
            {level}
          </LinkButton>
        ))}

        {quickLinks.length > 0 ? <span className="text-xs uppercase tracking-[0.14em] text-zinc-400">quick files</span> : null}

        {quickLinks.map((link) => (
          <LinkButton
            key={link.path}
            active={selectedPath === link.path}
            title={link.path}
            onClick={() => onSelectQuickLink(link.path)}
          >
            {link.label}
          </LinkButton>
        ))}

        {statusMessage ? <span className="ml-auto text-xs text-zinc-500">{statusMessage}</span> : null}
      </div>
    </header>
  );
}
