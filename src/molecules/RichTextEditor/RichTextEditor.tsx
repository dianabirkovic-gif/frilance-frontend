import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, type ReactNode } from "react";
import {
  BoldIcon,
  BulletListIcon,
  ItalicIcon,
  OrderedListIcon,
  UnderlineIcon,
} from "../../atoms/icons/icons";
import { useLocale } from "../../i18n/useLocale";
import { isBlankNote } from "./richText";
import styles from "./RichTextEditor.module.css";

interface RichTextEditorProps {
  /** Sanitized HTML from the server, or null for an empty field. */
  value: string | null;
  /** Emits null — not "<p></p>" — when the field is emptied. */
  onChange: (html: string | null) => void;
  /** Names the editable region for assistive tech; there is no <label> to point at a contenteditable. */
  ariaLabel: string;
}

/**
 * The rich-text field behind a post's note (#24): bold, italic, underline and
 * the two kinds of list, with emoji as ordinary text.
 *
 * <p>Deliberately narrower than what TipTap ships, and matched to the elements
 * `PostNoteSanitizer` allows through on the server, so what a member can type
 * is what survives the round trip. Enable something here that the sanitizer
 * drops (headings, links, images, code blocks) and the server strips it back
 * out silently, which reads as data loss; the two lists are one decision and
 * must move together.
 *
 * <p>It is also the client half of not trusting stored markup: loading a note
 * back in means ProseMirror parsing it against this schema, which keeps only
 * nodes and marks the schema knows. That is defence in depth, not the defence
 * — the server sanitizes on write regardless of what any client does.
 */
export function RichTextEditor({ value, onChange, ariaLabel }: RichTextEditorProps) {
  const { t } = useLocale();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Everything the note has no use for and the sanitizer would drop.
        heading: false,
        blockquote: false,
        code: false,
        codeBlock: false,
        horizontalRule: false,
        link: false,
        strike: false,
      }),
    ],
    content: value ?? "",
    editorProps: {
      attributes: { class: styles.surface, "aria-label": ariaLabel, role: "textbox", "aria-multiline": "true" },
    },
    // `isBlankNote`, not TipTap's `editor.isEmpty`: the server has the final
    // say on what counts as a note, and the two disagreed in both directions.
    onUpdate: ({ editor: updated }) => {
      const html = updated.getHTML();
      onChange(isBlankNote(html) ? null : html);
    },
  });

  // The drawer reuses one editor across posts, so a new note has to replace
  // what is in it. `emitUpdate: false`: this is the parent's value arriving,
  // not the user typing — echoing it back would mark a pristine form dirty.
  useEffect(() => {
    if (!editor) return;
    const incoming = value ?? "";
    if (incoming !== editor.getHTML()) {
      editor.commands.setContent(incoming, { emitUpdate: false });
    }
  }, [editor, value]);

  const active = useEditorState({
    editor,
    selector: ({ editor: current }) => ({
      bold: current?.isActive("bold") ?? false,
      italic: current?.isActive("italic") ?? false,
      underline: current?.isActive("underline") ?? false,
      bulletList: current?.isActive("bulletList") ?? false,
      orderedList: current?.isActive("orderedList") ?? false,
    }),
  });

  return (
    <div className={styles.editor}>
      <div className={styles.toolbar} role="toolbar" aria-label={t.richTextEditor.toolbarLabel}>
        <ToolbarButton
          label={t.richTextEditor.bold}
          pressed={active?.bold ?? false}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          <BoldIcon width={14} height={14} />
        </ToolbarButton>
        <ToolbarButton
          label={t.richTextEditor.italic}
          pressed={active?.italic ?? false}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          <ItalicIcon width={14} height={14} />
        </ToolbarButton>
        <ToolbarButton
          label={t.richTextEditor.underline}
          pressed={active?.underline ?? false}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon width={14} height={14} />
        </ToolbarButton>
        <span className={styles.divider} aria-hidden="true" />
        <ToolbarButton
          label={t.richTextEditor.bulletList}
          pressed={active?.bulletList ?? false}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          <BulletListIcon width={14} height={14} />
        </ToolbarButton>
        <ToolbarButton
          label={t.richTextEditor.orderedList}
          pressed={active?.orderedList ?? false}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        >
          <OrderedListIcon width={14} height={14} />
        </ToolbarButton>
      </div>
      <EditorContent editor={editor} className={styles.content} />
    </div>
  );
}

/**
 * `type="button"`: the editor lives inside the post form, and a bare <button>
 * there submits it — one click on Ж and the post saves half-written.
 */
function ToolbarButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={pressed ? `${styles.tool} ${styles.toolActive}` : styles.tool}
      aria-label={label}
      aria-pressed={pressed}
      // The editor loses its selection to a focus change on mousedown, so the
      // command would apply to a collapsed cursor instead of the words the
      // user highlighted.
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
