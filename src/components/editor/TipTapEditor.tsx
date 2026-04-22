'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Youtube from '@tiptap/extension-youtube'
import { useState, useCallback } from 'react'
import { ImageInsertModal } from './ImageInsertModal'
import { VideoInsertModal } from './VideoInsertModal'

interface TipTapEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
}

function ToolbarButton({
  onClick,
  active,
  title,
  children,
}: {
  onClick: () => void
  active?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`w-8 h-8 flex items-center justify-center rounded text-sm transition-colors ${
        active
          ? 'bg-primary/20 text-primary'
          : 'text-muted-foreground hover:bg-surface hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Divider() {
  return <div className="w-px h-5 bg-border mx-1" />
}

export function TipTapEditor({ content, onChange, placeholder = 'Write something…' }: TipTapEditorProps) {
  const [showImageModal, setShowImageModal] = useState(false)
  const [showVideoModal, setShowVideoModal] = useState(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      // StarterKit@3 bundles Link and Underline — configure Link here
      // instead of registering it twice (duplicate extensions break the
      // schema and silently disable commands like toggleHeading).
      StarterKit.configure({
        link: {
          openOnClick: false,
          HTMLAttributes: { class: 'text-primary underline cursor-pointer' },
        },
      }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image.configure({ HTMLAttributes: { class: 'max-w-full rounded-lg my-4' } }),
      Youtube.configure({ controls: true, HTMLAttributes: { class: 'w-full aspect-video rounded-lg my-4' } }),
      Placeholder.configure({ placeholder }),
      CharacterCount,
    ],
    content,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        // `@tailwindcss/typography` is NOT installed in this project, so `prose`
        // + `prose-invert` are silent no-ops. Tailwind 4's preflight also resets
        // `list-style: none` on <ul>/<ol>, which is why list blocks authored in
        // the editor rendered without bullets — completely invisible as lists
        // to the author, even though the saved HTML was a real <ul><li>. All
        // typography here is built from core `[&_el]:…` arbitrary selectors,
        // kept in sync with terms/page.tsx so WYSIWYG holds on the public side.
        class: [
          'max-w-none',
          'min-h-[320px] px-4 py-3 focus:outline-none leading-relaxed',
          '[&_h1]:text-3xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-3',
          '[&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2',
          '[&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-2',
          '[&_p]:my-2',
          // Restore list markers stripped by Tailwind preflight
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3',
          '[&_li]:my-1 [&_li]:marker:text-muted-foreground',
          // Nested lists (TipTap emits these for Tab-indented items)
          '[&_ul_ul]:list-[circle] [&_ol_ol]:list-[lower-alpha]',
          // Inline formatting parity with public renderer
          '[&_a]:text-primary [&_a]:underline [&_a]:underline-offset-2',
          '[&_strong]:font-semibold',
          '[&_em]:italic',
          '[&_u]:underline [&_u]:underline-offset-2',
          '[&_blockquote]:border-l-[3px] [&_blockquote]:border-l-primary [&_blockquote]:pl-4 [&_blockquote]:my-4 [&_blockquote]:text-muted-foreground',
          '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-[14px]',
          '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:my-4 [&_pre]:overflow-x-auto',
          '[&_pre_code]:bg-transparent [&_pre_code]:p-0',
          '[&_hr]:border-border [&_hr]:my-6',
          '[&_img]:rounded-lg [&_img]:my-4 [&_img]:max-w-full',
        ].join(' '),
      },
    },
  })

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (url === '') { editor.chain().focus().unsetLink().run(); return }
    editor.chain().focus().setLink({ href: url }).run()
  }, [editor])

  const insertImage = useCallback(
    ({ src, alt, width }: { src: string; alt: string; width?: number }) => {
      if (!editor) return
      editor.chain().focus().setImage({ src, alt }).run()
      setShowImageModal(false)
    },
    [editor],
  )

  const insertVideo = useCallback(
    (url: string) => {
      if (!editor) return
      editor.chain().focus().setYoutubeVideo({ src: url }).run()
      setShowVideoModal(false)
    },
    [editor],
  )

  if (!editor) return null

  const chars = editor.storage.characterCount.characters()
  const words = editor.storage.characterCount.words()

  return (
    <div className="border border-border rounded-xl overflow-hidden bg-card">
      {/* Sticky toolbar */}
      <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 px-2 py-1.5 border-b border-border bg-card">
        {/* Undo / Redo */}
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo" active={false}>
          ↩
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo" active={false}>
          ↪
        </ToolbarButton>
        <Divider />

        {/* Headings */}
        {([1, 2, 3] as const).map((level) => (
          <ToolbarButton
            key={level}
            onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
            active={editor.isActive('heading', { level })}
            title={`Heading ${level}`}
          >
            <span className="font-bold text-xs">H{level}</span>
          </ToolbarButton>
        ))}
        <ToolbarButton
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="Paragraph"
        >
          <span className="text-xs">P</span>
        </ToolbarButton>
        <Divider />

        {/* Inline formatting */}
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')} title="Bold">
          <strong>B</strong>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')} title="Italic">
          <em>I</em>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')} title="Underline">
          <span className="underline">U</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')} title="Strikethrough">
          <span className="line-through">S</span>
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleCode().run()} active={editor.isActive('code')} title="Inline code">
          {'<>'}
        </ToolbarButton>
        <ToolbarButton onClick={setLink} active={editor.isActive('link')} title="Link">
          🔗
        </ToolbarButton>
        <Divider />

        {/* Lists */}
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet list"
        >
          •≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered list"
        >
          1≡
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Blockquote"
        >
          "
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code block"
        >
          {'{}'}
        </ToolbarButton>
        <Divider />

        {/* Alignment */}
        {(['left', 'center', 'right', 'justify'] as const).map((align) => (
          <ToolbarButton
            key={align}
            onClick={() => editor.chain().focus().setTextAlign(align).run()}
            active={editor.isActive({ textAlign: align })}
            title={`Align ${align}`}
          >
            <span className="text-xs">{align === 'left' ? '⬅' : align === 'center' ? '↔' : align === 'right' ? '➡' : '≡'}</span>
          </ToolbarButton>
        ))}
        <Divider />

        {/* Media */}
        <ToolbarButton onClick={() => setShowImageModal(true)} title="Insert image" active={false}>
          🖼
        </ToolbarButton>
        <ToolbarButton onClick={() => setShowVideoModal(true)} title="Insert video" active={false}>
          ▶
        </ToolbarButton>
        <ToolbarButton
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal rule"
          active={false}
        >
          —
        </ToolbarButton>
      </div>

      {/* Editor area */}
      <EditorContent editor={editor} />

      {/* Footer: word/char count */}
      <div className="px-4 py-2 border-t border-border flex justify-end">
        <span className="text-xs text-muted-foreground">
          {words} words · {chars} characters
        </span>
      </div>

      {showImageModal && (
        <ImageInsertModal onInsert={insertImage} onClose={() => setShowImageModal(false)} />
      )}
      {showVideoModal && (
        <VideoInsertModal onInsert={insertVideo} onClose={() => setShowVideoModal(false)} />
      )}
    </div>
  )
}
