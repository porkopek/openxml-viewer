import { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import 'monaco-editor/esm/vs/basic-languages/xml/xml.contribution';

loader.config({ monaco });

(self as typeof globalThis & {
  MonacoEnvironment?: {
    getWorker: (_moduleId: string, label: string) => Worker;
  };
}).MonacoEnvironment = {
  getWorker(_moduleId, label) {
    switch (label) {
      case 'json':
        return new jsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new cssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new htmlWorker();
      case 'typescript':
      case 'javascript':
        return new tsWorker();
      default:
        return new editorWorker();
    }
  },
};

let themeRegistered = false;
const XML_ATTRIBUTE_COLOR_CLASS_COUNT = 24;

export function ensureOpenXmlTheme(): void {
  if (themeRegistered) {
    return;
  }

  monaco.editor.defineTheme('openxml-minimal', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '94A3B8' },
      { token: 'tag', foreground: '0F172A' },
      { token: 'attribute.name', foreground: '2563EB' },
      { token: 'attribute.value', foreground: 'BE123C' },
      { token: 'delimiter', foreground: '64748B' },
      { token: 'string', foreground: 'BE123C' },
      { token: 'number', foreground: '7C3AED' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#18181B',
      'editor.selectionBackground': '#DBEAFE',
      'editor.lineHighlightBackground': '#FAFAFA',
      'editorGutter.background': '#FFFFFF',
      'editorLineNumber.foreground': '#A1A1AA',
      'editorLineNumber.activeForeground': '#52525B',
      'editorWhitespace.foreground': '#D4D4D8',
      'editorIndentGuide.background1': '#F4F4F5',
      'editorIndentGuide.activeBackground1': '#CBD5E1',
      'editorBracketHighlight.foreground1': '#2563EB',
      'editorBracketHighlight.foreground2': '#7C3AED',
      'editorBracketHighlight.foreground3': '#0F766E',
      'editorBracketHighlight.foreground4': '#EA580C',
      'editorBracketHighlight.foreground5': '#DC2626',
      'editorBracketHighlight.foreground6': '#4338CA',
      'editorBracketHighlight.unexpectedBracket.foreground': '#DC2626',
      'editorFoldBackground': '#EEF2FF66',
      'editorInlayHint.foreground': '#94A3B8',
      'editorInlayHint.background': '#F8FAFC',
    },
  });

  themeRegistered = true;
}

function hashAttributeName(name: string): number {
  let hash = 2166136261;

  for (let index = 0; index < name.length; index += 1) {
    hash ^= name.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % XML_ATTRIBUTE_COLOR_CLASS_COUNT;
}

function isWhitespace(char: string | undefined): boolean {
  return char === ' ' || char === '\n' || char === '\r' || char === '\t';
}

function isXmlNameStart(char: string | undefined): boolean {
  return /[A-Za-z_:]/.test(char ?? '');
}

function isXmlNameCharacter(char: string | undefined): boolean {
  return /[A-Za-z0-9_.:-]/.test(char ?? '');
}

function skipWhitespace(input: string, index: number, end: number): number {
  let cursor = index;

  while (cursor < end && isWhitespace(input[cursor])) {
    cursor += 1;
  }

  return cursor;
}

function skipXmlName(input: string, index: number, end: number): number {
  let cursor = index;

  if (!isXmlNameStart(input[cursor])) {
    return cursor;
  }

  cursor += 1;

  while (cursor < end && isXmlNameCharacter(input[cursor])) {
    cursor += 1;
  }

  return cursor;
}

function findTagEnd(input: string, index: number): number {
  let quote: '"' | "'" | null = null;

  for (let cursor = index; cursor < input.length; cursor += 1) {
    const current = input[cursor];

    if (quote) {
      if (current === quote) {
        quote = null;
      }

      continue;
    }

    if (current === '"' || current === "'") {
      quote = current;
      continue;
    }

    if (current === '>') {
      return cursor;
    }
  }

  return input.length - 1;
}

function findLastNonWhitespaceIndex(input: string, start: number, end: number): number {
  let cursor = end - 1;

  while (cursor >= start && isWhitespace(input[cursor])) {
    cursor -= 1;
  }

  return cursor;
}

function findMatchingOpenTagIndex(
  stack: Array<{ name: string; start: number; openTagEnd: number }>,
  name: string
): number {
  for (let index = stack.length - 1; index >= 0; index -= 1) {
    if (stack[index].name === name) {
      return index;
    }
  }

  return -1;
}

function findXmlOuterRangeOffsets(input: string, cursorOffset: number): { start: number; end: number } | null {
  const stack: Array<{ name: string; start: number; openTagEnd: number }> = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] !== '<') {
      index += 1;
      continue;
    }

    if (input.startsWith('<!--', index)) {
      const commentEnd = input.indexOf('-->', index + 4);
      index = commentEnd === -1 ? input.length : commentEnd + 3;
      continue;
    }

    if (input.startsWith('<![CDATA[', index)) {
      const cdataEnd = input.indexOf(']]>', index + 9);
      index = cdataEnd === -1 ? input.length : cdataEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(input, index + 1);
    if (tagEnd <= index) {
      break;
    }

    let cursor = index + 1;

    if (input[cursor] === '?') {
      index = tagEnd + 1;
      continue;
    }

    if (input[cursor] === '!') {
      index = tagEnd + 1;
      continue;
    }

    const isClosingTag = input[cursor] === '/';
    if (isClosingTag) {
      cursor += 1;
    }

    cursor = skipWhitespace(input, cursor, tagEnd);
    const nameStart = cursor;
    const nameEnd = skipXmlName(input, cursor, tagEnd);

    if (nameEnd === nameStart) {
      index = tagEnd + 1;
      continue;
    }

    const tagName = input.slice(nameStart, nameEnd);

    if (isClosingTag) {
      const matchingIndex = findMatchingOpenTagIndex(stack, tagName);
      if (matchingIndex !== -1) {
        const [openTag] = stack.splice(matchingIndex, 1);
        if (cursorOffset >= openTag.start && cursorOffset <= openTag.openTagEnd) {
          return {
            start: openTag.start,
            end: tagEnd + 1,
          };
        }
      }

      index = tagEnd + 1;
      continue;
    }

    const lastNonWhitespaceIndex = findLastNonWhitespaceIndex(input, nameEnd, tagEnd);
    const isSelfClosing = lastNonWhitespaceIndex >= index && input[lastNonWhitespaceIndex] === '/';

    if (cursorOffset >= index && cursorOffset <= tagEnd) {
      if (isSelfClosing) {
        return {
          start: index,
          end: tagEnd + 1,
        };
      }

      stack.push({
        name: tagName,
        start: index,
        openTagEnd: tagEnd,
      });
      index = tagEnd + 1;
      continue;
    }

    if (!isSelfClosing) {
      stack.push({
        name: tagName,
        start: index,
        openTagEnd: tagEnd,
      });
    }

    index = tagEnd + 1;
  }

  return null;
}

function collectXmlAttributeOffsets(input: string): Array<{ start: number; end: number; name: string }> {
  const result: Array<{ start: number; end: number; name: string }> = [];
  let index = 0;

  while (index < input.length) {
    if (input[index] !== '<') {
      index += 1;
      continue;
    }

    if (input.startsWith('<!--', index)) {
      const commentEnd = input.indexOf('-->', index + 4);
      index = commentEnd === -1 ? input.length : commentEnd + 3;
      continue;
    }

    if (input.startsWith('<![CDATA[', index)) {
      const cdataEnd = input.indexOf(']]>', index + 9);
      index = cdataEnd === -1 ? input.length : cdataEnd + 3;
      continue;
    }

    const tagEnd = findTagEnd(input, index + 1);
    if (tagEnd <= index) {
      break;
    }

    let cursor = index + 1;

    if (input[cursor] === '/') {
      index = tagEnd + 1;
      continue;
    }

    if (input[cursor] === '?') {
      cursor += 1;
    }

    if (input[cursor] === '!') {
      index = tagEnd + 1;
      continue;
    }

    cursor = skipWhitespace(input, cursor, tagEnd);
    cursor = skipXmlName(input, cursor, tagEnd);

    while (cursor < tagEnd) {
      cursor = skipWhitespace(input, cursor, tagEnd);

      const current = input[cursor];
      if (!current || current === '/' || current === '?' || current === '>') {
        break;
      }

      const nameStart = cursor;
      const nameEnd = skipXmlName(input, cursor, tagEnd);

      if (nameEnd === cursor) {
        cursor += 1;
        continue;
      }

      const afterName = skipWhitespace(input, nameEnd, tagEnd);
      if (input[afterName] !== '=') {
        cursor = nameEnd;
        continue;
      }

      result.push({
        start: nameStart,
        end: nameEnd,
        name: input.slice(nameStart, nameEnd),
      });

      cursor = skipWhitespace(input, afterName + 1, tagEnd);

      const quote = input[cursor];
      if (quote === '"' || quote === "'") {
        cursor += 1;

        while (cursor < tagEnd && input[cursor] !== quote) {
          cursor += 1;
        }

        if (cursor < tagEnd) {
          cursor += 1;
        }

        continue;
      }

      while (
        cursor < tagEnd &&
        !isWhitespace(input[cursor]) &&
        input[cursor] !== '/' &&
        input[cursor] !== '?' &&
        input[cursor] !== '>'
      ) {
        cursor += 1;
      }
    }

    index = tagEnd + 1;
  }

  return result;
}

export function createXmlAttributeColorDecorations(
  model: monaco.editor.ITextModel | null,
  language: string | null | undefined
): monaco.editor.IModelDeltaDecoration[] {
  if (!model || language !== 'xml') {
    return [];
  }

  return collectXmlAttributeOffsets(model.getValue()).map(({ start, end, name }) => {
    const startPosition = model.getPositionAt(start);
    const endPosition = model.getPositionAt(end);

    return {
      range: new monaco.Range(
        startPosition.lineNumber,
        startPosition.column,
        endPosition.lineNumber,
        endPosition.column
      ),
      options: {
        inlineClassName: `openxml-xml-attribute-${hashAttributeName(name)}`,
        inlineClassNameAffectsLetterSpacing: true,
      },
    };
  });
}

export function findXmlOuterNodeRange(
  model: monaco.editor.ITextModel | null,
  position: monaco.IPosition | null | undefined,
  language: string | null | undefined
): monaco.Range | null {
  if (!model || !position || language !== 'xml') {
    return null;
  }

  const offsets = findXmlOuterRangeOffsets(model.getValue(), model.getOffsetAt(position));
  if (!offsets) {
    return null;
  }

  const startPosition = model.getPositionAt(offsets.start);
  const endPosition = model.getPositionAt(offsets.end);

  return new monaco.Range(
    startPosition.lineNumber,
    startPosition.column,
    endPosition.lineNumber,
    endPosition.column
  );
}

export { monaco };
