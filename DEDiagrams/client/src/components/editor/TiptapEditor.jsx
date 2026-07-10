import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { useEffect } from 'react';
import './TiptapEditor.css';

/**
 * Collaborative rich-text editor for node documentation.
 *
 * When a `fragment` (Y.XmlFragment) is provided, changes are synced in real-time
 * across all connected clients. When no fragment is provided (local/offline mode),
 * falls back to uncontrolled editing with `initialContent` and `onChange`.
 *
 * @param {{
 *   fragment?: import('yjs').XmlFragment,
 *   initialContent?: string,
 *   onChange?: (html: string) => void,
 *   awareness?: any,
 *   currentUser?: { displayName: string, color: string },
 *   readOnly?: boolean,
 * }} props
 */
export default function TiptapEditor({
  fragment,
  initialContent,
  onChange,
  awareness,
  currentUser,
  readOnly = false,
}) {
  const extensions = [
    StarterKit.configure({
      history: fragment ? false : true,
    }),
    ...(fragment
      ? [
          Collaboration.configure({ document: fragment }),
          ...(awareness && currentUser
            ? [CollaborationCursor.configure({
                provider: { awareness },
                user: {
                  name: currentUser.displayName,
                  color: currentUser.color ?? '#58a6ff',
                },
              })]
            : []),
        ]
      : []),
  ];

  const editor = useEditor({
    extensions,
    content: fragment ? undefined : (initialContent || ''),
    editable: !readOnly,
    onUpdate: ({ editor }) => {
      if (!fragment && onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  useEffect(() => {
    if (!fragment && editor && !editor.isDestroyed) {
      editor.commands.setContent(initialContent || '');
    }
  }, [initialContent, fragment, editor]);

  return (
    <div className="tiptap-wrapper">
      <EditorContent editor={editor} />
    </div>
  );
}
