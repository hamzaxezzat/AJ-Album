'use client';
import { useEffect, useRef, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Underline from '@tiptap/extension-underline';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import type { JSONContent, Editor } from '@tiptap/react';
import type { RichTextContent, ContentBlock, TypographyProfile, BlockStyleOverride } from '@/types/album';

// ─── Types ───────────────────────────────────────────────────

interface InlineTextEditorProps {
  block: ContentBlock & { content: RichTextContent; typographyTokenRef: string };
  typography: TypographyProfile;
  canvasW: number;
  canvasH: number;
  onChange: (content: RichTextContent) => void;
  /** Called with the TipTap editor instance so parent can pass it to FloatingToolbar */
  onEditorReady: (editor: Editor) => void;
  onClickOutside: () => void;
}

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

/** Check if a block uses kashida justification */
function hasKashida(block: ContentBlock): boolean {
  if ('kashidaEnabled' in block) return (block as unknown as { kashidaEnabled?: boolean }).kashidaEnabled !== false;
  return block.type === ('body_paragraph' as string) || block.type === ('text_box' as string);
}

// ─── Component ───────────────────────────────────────────────

export function InlineTextEditor({
  block,
  typography,
  canvasW,
  canvasH,
  onChange,
  onEditorReady,
  onClickOutside,
}: InlineTextEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  // Resolve typography
  const token = typography[block.typographyTokenRef as keyof TypographyProfile];
  const overrides = block.styleOverrides;

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      Underline,
      TextStyle,
      Color,
    ],
    immediatelyRender: false,
    content: ((block.content ?? EMPTY_DOC) as JSONContent),
    editorProps: {
      attributes: {
        dir: 'rtl',
        lang: 'ar',
        style: [
          'outline: none',
          'min-height: 100%',
          'width: 100%',
          'cursor: text',
        ].join(';'),
      },
    },
    onUpdate({ editor }) {
      onChangeRef.current(editor.getJSON() as RichTextContent);
    },
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Click outside detection
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      // Check if click is on the floating toolbar (don't close)
      const toolbar = (e.target as HTMLElement)?.closest('[data-floating-toolbar]');
      if (toolbar) return;
      onClickOutside();
    }
  }, [onClickOutside]);

  useEffect(() => {
    // Delay so the click that started editing doesn't immediately close it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [handleClickOutside]);

  // Auto-focus
  useEffect(() => {
    if (editor) editor.commands.focus('end');
  }, [editor]);

  if (!editor || !token) return null;

  // Position in canvas pixels
  const left = block.position.x * canvasW;
  const top = block.position.y * canvasH;
  const width = block.position.width * canvasW;
  const height = block.position.height * canvasH;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        left,
        top,
        width,
        minHeight: height,
        zIndex: 200,
        // Typography from token + overrides
        fontFamily: token.fontFamily,
        fontWeight: overrides?.fontWeight ?? token.fontWeight,
        fontSize: overrides?.fontSize ?? token.fontSize,
        lineHeight: token.lineHeight,
        letterSpacing: token.letterSpacing !== 0 ? `${token.letterSpacing}em` : undefined,
        textAlign: overrides?.textAlign
          ?? (hasKashida(block) ? 'justify' : token.textAlign),
        textJustify: hasKashida(block) ? ('kashida' as React.CSSProperties['textJustify']) : undefined,
        direction: token.direction,
        color: overrides?.color ?? (block.type === 'main_title' ? '#D32F2F' : '#212121'),
        // Editing chrome
        outline: '2px solid #2196F3',
        outlineOffset: 2,
        borderRadius: 2,
        background: 'rgba(255,255,255,0.95)',
        cursor: 'text',
        boxSizing: 'border-box',
        padding: 0,
      }}
    >
      <EditorContent editor={editor} />
    </div>
  );
}
