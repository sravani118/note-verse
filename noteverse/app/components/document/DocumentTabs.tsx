/**
 * Document Tabs Component
 * 
 * Left sidebar with:
 * - Tab management (add, switch, rename tabs)
 * - Document outline view (headings from current tab)
 * - Google Docs-style design
 */

'use client';

import { useState, useEffect } from 'react';
import { Editor } from '@tiptap/react';

interface Tab {
  id: string;
  name: string;
  content: string;
}

interface Heading {
  level: number;
  text: string;
  id: string;
}

interface DocumentTabsProps {
  editor: Editor | null;
  activeTabId: string;
  tabs: Tab[];
  onTabChange: (tabId: string) => void;
  onTabAdd: () => void;
  onTabRename: (tabId: string, newName: string) => void;
  onTabDelete?: (tabId: string) => void;
}

export default function DocumentTabs({
  editor,
  activeTabId,
  tabs,
  onTabChange,
  onTabAdd,
  onTabRename,
  onTabDelete
}: DocumentTabsProps) {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);

  /**
   * Extract headings from editor content for outline view
   */
  useEffect(() => {
    if (!editor) return;

    const updateHeadings = () => {
      const headingNodes: Heading[] = [];
      const json = editor.getJSON();

      // Traverse the document and extract headings
      const traverse = (node: unknown) => {
        const n = node as { type?: string; attrs?: { level?: number }; content?: unknown[] };
        if (n.type === 'heading' && n.content) {
          const text = n.content
            .map((c: unknown) => (c as { text?: string }).text || '')
            .join('');
          
          if (text.trim() && n.attrs?.level) {
            headingNodes.push({
              level: n.attrs.level,
              text: text.trim(),
              id: Math.random().toString(36).substring(7)
            });
          }
        }

        if (n.content) {
          n.content.forEach(traverse);
        }
      };

      if (json.content) {
        json.content.forEach(traverse);
      }

      setHeadings(headingNodes);
    };

    // Update on content change
    editor.on('update', updateHeadings);
    updateHeadings();

    return () => {
      editor.off('update', updateHeadings);
    };
  }, [editor]);

  const handleTabClick = (tabId: string) => {
    if (editingTabId !== tabId) {
      onTabChange(tabId);
    }
  };

  const handleTabDoubleClick = (tab: Tab) => {
    setEditingTabId(tab.id);
    setEditName(tab.name);
  };

  const handleTabRenameSubmit = (tabId: string) => {
    if (editName.trim()) {
      onTabRename(tabId, editName.trim());
    }
    setEditingTabId(null);
    setEditName('');
  };

  const scrollToHeading = (headingText: string) => {
    if (!editor) return;

    // Find the heading in the editor and scroll to it
    const { state } = editor;
    let targetPos = null;

    state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        const text = node.textContent;
        if (text === headingText) {
          targetPos = pos;
          return false;
        }
      }
    });

    if (targetPos !== null) {
      editor.commands.focus();
      editor.commands.setTextSelection(targetPos);
      
      // Scroll the element into view
      const element = document.querySelector('[data-heading-text="' + headingText + '"]');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (isCollapsed) {
    return (
      <div className="fixed left-0 top-14 bottom-0 z-30 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 w-12">
        <button
          onClick={() => setIsCollapsed(false)}
          className="w-full h-12 flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          title="Expand sidebar"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed left-0 top-14 bottom-0 z-30 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 w-64 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Document Tabs</h2>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Tabs List */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-2 space-y-1">
          {tabs.map((tab) => (
            <div key={tab.id} className="relative group">
              {editingTabId === tab.id ? (
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  onBlur={() => handleTabRenameSubmit(tab.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTabRenameSubmit(tab.id);
                    if (e.key === 'Escape') {
                      setEditingTabId(null);
                      setEditName('');
                    }
                  }}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border-2 border-indigo-500 rounded focus:outline-none"
                  autoFocus
                />
              ) : (
                <div className="relative group">
                  <button
                    onClick={() => handleTabClick(tab.id)}
                    onDoubleClick={() => handleTabDoubleClick(tab)}
                    className={`
                      w-full px-3 py-2 text-sm text-left rounded transition-colors
                      ${activeTabId === tab.id
                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span className="truncate">{tab.name}</span>
                    </div>
                  </button>
                  {onTabDelete && tabs.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(`Delete tab "${tab.name}"?`)) {
                          onTabDelete(tab.id);
                        }
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-opacity z-10"
                      title="Delete tab"
                    >
                      <svg className="w-3 h-3 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}

          {/* Add Tab Button */}
          <button
            onClick={onTabAdd}
            className="w-full px-3 py-2 text-sm text-left text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Tab</span>
          </button>
        </div>

        {/* Outline View - Headings from current tab */}
        {headings.length > 0 && (
          <div className="mt-4 px-2 pb-4">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
              Outline
            </div>
            <div className="space-y-1">
              {headings.map((heading, index) => (
                <button
                  key={index}
                  onClick={() => scrollToHeading(heading.text)}
                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 rounded transition-colors"
                  style={{ paddingLeft: `${heading.level * 8 + 12}px` }}
                >
                  <span className="truncate block">{heading.text}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
