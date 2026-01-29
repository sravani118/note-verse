/**
 * TipTap Collaborative Editor Component
 * 
 * Main editor with:
 * - TipTap rich text editing
 * - Yjs CRDT collaboration
 * - Real-time cursor synchronization
 * - Collaborative awareness (user presence)
 * - Live cursor indicators
 */

'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Collaboration from '@tiptap/extension-collaboration';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { FontFamily } from '@tiptap/extension-font-family';
import FontSize from 'tiptap-extension-font-size';
import { ResizableImageExtension } from '../editor/ResizableImageExtension';
// import CollaborationCursor from '@tiptap/extension-collaboration-cursor'; // Version conflict - to be added later
import * as Y from 'yjs';
import { useEffect, useRef, useMemo } from 'react';

import { Editor as TipTapEditorInstance } from '@tiptap/react';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface TipTapEditorProps {
  ydoc: Y.Doc | null;
  currentUser: User;
  onReady?: (editor: TipTapEditorInstance) => void;
  provider?: unknown; // Yjs provider for awareness
  readOnly?: boolean; // Whether editor is read-only (view-only permission)
}

export default function TipTapEditor({ ydoc, currentUser, onReady, readOnly = false }: TipTapEditorProps) {
  const hasCalledOnReady = useRef(false);
  const hasLoadedContent = useRef(false); // Track if initial content has been loaded
  
  // Memoize extensions to prevent duplicate registration
  const extensions = useMemo(() => {
    console.log('🔧 Configuring TipTap extensions with collaboration support');
    
    const exts = [
      // StarterKit without history - Collaboration extension provides its own history
      StarterKit.configure({
        history: false,
        dropcursor: {
          color: currentUser.cursorColor,
          width: 2,
        },
      } as any),
      // Add extensions not included in StarterKit
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Start writing your notes here…',
      }),
      // Text formatting extensions
      Underline,
      TextStyle, // Required for Color and FontFamily to work
      Color, // Text color
      Highlight.configure({ // Highlight/background color
        multicolor: true,
      }),
      FontFamily.configure({
        types: ['textStyle'], // Apply to textStyle marks
      }),
      FontSize,
      // Link extension
      Link.configure({
        openOnClick: true,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class: 'text-indigo-600 dark:text-indigo-400 underline cursor-pointer hover:text-indigo-800 dark:hover:text-indigo-300',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      // Resizable Image extension
      ResizableImageExtension.configure({
        inline: true,
        allowBase64: true,
      }),
    ];

    // Add Collaboration extension if ydoc exists
    if (ydoc) {
      exts.push(
        Collaboration.configure({
          document: ydoc,
        }) as any
      );

      // TODO: Add CollaborationCursor when version is compatible
      // if (provider) {
      //   exts.push(
      //     CollaborationCursor.configure({
      //       provider: provider,
      //       user: {
      //         name: currentUser.name,
      //         color: currentUser.cursorColor,
      //       },
      //     })
      //   );
      // }
    }

    return exts;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ydoc]);
  
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    extensions: extensions as any,
    editable: !readOnly, // Make editor non-editable if readOnly is true
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none min-h-[600px]',
      },
    },
  });

  useEffect(() => {
    if (!editor || !ydoc) return;

    // Load initial content from Yjs metadata if available (only once)
    if (!hasLoadedContent.current) {
      const metadata = ydoc.getMap('metadata');
      const initialContent = metadata.get('initialContent');
      
      if (initialContent && typeof initialContent === 'string') {
        console.log(`📄 Loading ${initialContent.length} characters of saved content into editor`);
        editor.commands.setContent(initialContent);
        metadata.delete('initialContent'); // Clear after loading
        hasLoadedContent.current = true;
        console.log('✅ Content loaded into editor');
      }
    }

    // Notify parent when editor is ready (only once)
    if (onReady && !hasCalledOnReady.current) {
      hasCalledOnReady.current = true;
      onReady(editor);
    }
  }, [editor, ydoc, onReady]);

  // Update editable state when readOnly changes
  useEffect(() => {
    if (editor) {
      editor.setEditable(!readOnly);
    }
  }, [editor, readOnly]);

  if (!ydoc) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Connecting to document...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <EditorContent editor={editor} />

      {/* Custom styles for TipTap */}
      <style jsx global>{`
        /* TipTap Editor Styles */
        .ProseMirror {
          outline: none;
        }

        .ProseMirror p.is-editor-empty:first-child::before {
          color: #adb5bd;
          content: attr(data-placeholder);
          float: left;
          height: 0;
          pointer-events: none;
        }

        /* Collaboration Cursor Styles */
        .collaboration-cursor__caret {
          border-left: 2px solid;
          border-right: 2px solid;
          margin-left: -1px;
          margin-right: -1px;
          pointer-events: none;
          position: relative;
          word-break: normal;
        }

        .collaboration-cursor__label {
          border-radius: 3px;
          color: #fff;
          font-size: 12px;
          font-style: normal;
          font-weight: 600;
          left: -1px;
          line-height: normal;
          padding: 2px 6px;
          position: absolute;
          top: -1.4em;
          user-select: none;
          white-space: nowrap;
        }

        /* Heading Styles */
        .ProseMirror h1 {
          font-size: 2.25rem;
          font-weight: 700;
          line-height: 1.2;
          margin-top: 1.5rem;
          margin-bottom: 1rem;
        }

        .ProseMirror h2 {
          font-size: 1.875rem;
          font-weight: 700;
          line-height: 1.3;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
        }

        /* List Styles */
        .ProseMirror ul,
        .ProseMirror ol {
          padding-left: 1.5rem;
          margin: 1rem 0;
        }

        .ProseMirror ul li {
          list-style-type: disc;
        }

        .ProseMirror ol li {
          list-style-type: decimal;
        }

        /* Code Block Styles */
        .ProseMirror pre {
          background: #1e293b;
          border-radius: 0.5rem;
          color: #e2e8f0;
          font-family: 'Courier New', monospace;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }

        .ProseMirror code {
          background: #f1f5f9;
          border-radius: 0.25rem;
          color: #e11d48;
          font-family: 'Courier New', monospace;
          padding: 0.125rem 0.25rem;
        }

        .dark .ProseMirror code {
          background: #1e293b;
          color: #f472b6;
        }

        /* Link Styles */
        .ProseMirror a {
          color: #4f46e5;
          text-decoration: underline;
          cursor: pointer;
        }

        .ProseMirror a:hover {
          color: #4338ca;
        }

        .dark .ProseMirror a {
          color: #818cf8;
        }

        .dark .ProseMirror a:hover {
          color: #a5b4fc;
        }

        /* Selection Styles */
        .ProseMirror ::selection {
          background: #e0e7ff;
          color: inherit;
        }

        .dark .ProseMirror ::selection {
          background: #4338ca;
          color: #fff;
        }
      `}</style>
    </div>
  );
}
