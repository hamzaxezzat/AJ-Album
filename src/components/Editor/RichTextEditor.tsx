'use client';
import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import type { JSONContent } from '@tiptap/react';
import type { RichTextContent } from '@/types/album';
import styles from './RichTextEditor.module.css';

interface RichTextEditorProps {
  value: RichTextContent | null | undefined;
  onChange: (content: RichTextContent) => void;
  placeholder?: string;
  minHeight?: number;
}

const PRESET_COLORS = [
  { label: 'أحمر', value: '#D32F2F' },
  { label: 'أبيض', value: '#FFFFFF' },
  { label: 'أسود', value: '#212121' },
  { label: 'رمادي', value: '#757575' },
];

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'اكتب هنا...',
  minHeight = 80,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: (value ?? { type: 'doc', content: [{ type: 'paragraph' }] }) as JSONContent,
    editorProps: {
      attributes: {
        dir: 'rtl',
        lang: 'ar',
        class: styles.editorArea,
        style: `min-height:${minHeight}px`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getJSON() as RichTextContent);
    },
  });

  // Sync external value changes (e.g. switching slides)
  useEffect(() => {
    if (!editor) return;
    const incoming = JSON.stringify(value ?? null);
    const current = JSON.stringify(editor.getJSON());
    if (incoming !== current) {
      editor.commands.setContent(
        (value ?? { type: 'doc', content: [{ type: 'paragraph' }] }) as JSONContent,
      );
    }
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('bold') ? styles.btnActive : ''}`}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run(); }}
          title="عريض"
        >
          <strong>B</strong>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('italic') ? styles.btnActive : ''}`}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run(); }}
          title="مائل"
        >
          <em>I</em>
        </button>
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('strike') ? styles.btnActive : ''}`}
          onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleStrike().run(); }}
          title="يتوسطه خط"
        >
          <s>S</s>
        </button>

        <span className={styles.divider} />

        {/* Highlight (yellow) */}
        <button
          type="button"
          className={`${styles.btn} ${editor.isActive('highlight', { color: '#FFF176' }) ? styles.btnActive : ''}`}
          onMouseDown={(e) => {
            e.preventDefault();
            if (editor.isActive('highlight')) {
              editor.chain().focus().unsetHighlight().run();
            } else {
              editor.chain().focus().setHighlight({ color: '#FFF176' }).run();
            }
          }}
          title="تظليل أصفر"
          style={{ backgroundColor: '#FFF176', color: '#000' }}
        >
          H
        </button>

        <span className={styles.divider} />

        {/* Color presets */}
        {PRESET_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            className={`${styles.colorBtn} ${editor.isActive('textStyle', { color: c.value }) ? styles.colorBtnActive : ''}`}
            onMouseDown={(e) => {
              e.preventDefault();
              if (editor.isActive('textStyle', { color: c.value })) {
                editor.chain().focus().unsetColor().run();
              } else {
                editor.chain().focus().setColor(c.value).run();
              }
            }}
            title={c.label}
            style={{ backgroundColor: c.value, border: c.value === '#FFFFFF' ? '1px solid #ccc' : 'none' }}
          />
        ))}
      </div>

      {/* Editor */}
      <EditorContent editor={editor} className={styles.editorContent} />
    </div>
  );
}
