'use client';
import { useEffect, useRef } from 'react';
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
  /** Increment this to force the editor to re-sync even if text didn't change (e.g. after reformat). */
  resetKey?: number;
}

const PRESET_COLORS = [
  { label: 'أحمر', value: '#D32F2F' },
  { label: 'أبيض', value: '#FFFFFF' },
  { label: 'أسود', value: '#212121' },
  { label: 'رمادي', value: '#757575' },
];

const EMPTY_DOC: JSONContent = { type: 'doc', content: [{ type: 'paragraph' }] };

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'اكتب هنا...',
  minHeight = 80,
  resetKey,
}: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => { onChangeRef.current = onChange; }, [onChange]);

  const isProgrammaticUpdate = useRef(false);
  // Track JSON of the last value we emitted so we can skip echo updates.
  const lastEmittedJson = useRef<string>('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    immediatelyRender: false,
    content: (value ?? EMPTY_DOC) as JSONContent,
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
      if (isProgrammaticUpdate.current) return;
      const json = editor.getJSON();
      const str = JSON.stringify(json);
      lastEmittedJson.current = str;
      onChangeRef.current(json as RichTextContent);
    },
  });

  // Sync external value changes (e.g. switching slides, reformatting from parent).
  // Compare full JSON so structural changes (paragraphs ↔ lists) are applied.
  useEffect(() => {
    if (!editor) return;
    const incoming = value ?? EMPTY_DOC;
    const incomingStr = JSON.stringify(incoming);
    // Skip if this change originated from our own onUpdate (echo loop prevention).
    if (incomingStr === lastEmittedJson.current) return;
    isProgrammaticUpdate.current = true;
    editor.commands.setContent(incoming as JSONContent);
    isProgrammaticUpdate.current = false;
    lastEmittedJson.current = incomingStr;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor, resetKey]);

  if (!editor) return null;

  const btn = (active: boolean, handler: () => void, title: string, children: React.ReactNode) => (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.btnActive : ''}`}
      onMouseDown={(e) => { e.preventDefault(); handler(); }}
      title={title}
    >
      {children}
    </button>
  );

  return (
    <div className={styles.root}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        {/* Text format */}
        {btn(editor.isActive('bold'), () => editor.chain().focus().toggleBold().run(), 'عريض', <strong>B</strong>)}
        {btn(editor.isActive('italic'), () => editor.chain().focus().toggleItalic().run(), 'مائل', <em>I</em>)}
        {btn(editor.isActive('strike'), () => editor.chain().focus().toggleStrike().run(), 'يتوسطه خط', <s>S</s>)}

        <span className={styles.divider} />

        {/* Lists */}
        {btn(
          editor.isActive('bulletList'),
          () => editor.chain().focus().toggleBulletList().run(),
          'قائمة نقطية',
          <span style={{ fontSize: 13 }}>•≡</span>,
        )}
        {btn(
          editor.isActive('orderedList'),
          () => editor.chain().focus().toggleOrderedList().run(),
          'قائمة مرقمة',
          <span style={{ fontSize: 13 }}>1≡</span>,
        )}

        <span className={styles.divider} />

        {/* Highlight */}
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
