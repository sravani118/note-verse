/**
 * Document Editor Page - Google Docs Style
 * 
 * Full collaborative document editor with:
 * - Real-time collaboration using Socket.io + Yjs
 * - TipTap rich text editor
 * - Live cursors and user presence
 * - Auto-save functionality
 * - Document tabs with outline view
 * - Comments, history, and user management
 * 
 * Route: /document/[id]
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/lib/socket/useSocket';
import { useYjsProvider } from '@/lib/socket/useYjsProvider';
import DocumentHeader from '@/app/components/document/DocumentHeader';
import EditorToolbar from '@/app/components/document/EditorToolbar';
import DocumentTabs from '@/app/components/document/DocumentTabs';
import TipTapEditor from '@/app/components/document/TipTapEditor';
import RightSidebar from '@/app/components/document/RightSidebar';
import StatusBar from '@/app/components/document/StatusBar';
import ShareModal from '@/app/components/document/ShareModal';
import { Editor } from '@tiptap/react';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface Tab {
  id: string;
  name: string;
  content: string;
}

export default function DocumentPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const documentId = params?.id as string;

  // Document state
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);

  // Tab state
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'tab-1', name: 'Tab 1', content: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  // Auto-save timeout
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userPermission, setUserPermission] = useState<'viewer' | 'editor' | 'owner'>('viewer');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [visibility, setVisibility] = useState<'restricted' | 'public'>('restricted');
  const [publicPermission, setPublicPermission] = useState<'viewer' | 'editor'>('viewer');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  // Check user permission for this document
  useEffect(() => {
    const checkPermission = async () => {
      if (!session?.user?.email || !documentId) return;

      try {
        // Fetch document to check ownership and visibility
        const docResponse = await fetch(`/api/documents/${documentId}`);
        if (!docResponse.ok) {
          alert('Failed to load document.');
          router.push('/dashboard');
          return;
        }

        const docData = await docResponse.json();
        const docOwnerEmail = docData.document?.userId?.email;
        const docVisibility = docData.document?.visibility || 'restricted';
        const docPublicPermission = docData.document?.publicPermission || 'viewer';
        
        setOwnerEmail(docOwnerEmail || '');
        setVisibility(docVisibility);
        setPublicPermission(docPublicPermission);
        
        const isDocOwner = docOwnerEmail === session.user.email;
        setIsOwner(isDocOwner);

        if (isDocOwner) {
          setUserPermission('owner');
          return; // Owner has full access, no need to check further
        }

        // Check if user has shared access
        const shareResponse = await fetch(`/api/documents/${documentId}/share`);
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          const userShare = shareData.shares?.find(
            (s: { sharedWithEmail: string; permission: string }) => s.sharedWithEmail === session.user.email
          );

          if (userShare) {
            setUserPermission(userShare.permission);
            return; // User has explicit shared access
          }
        }

        // Check if document is public (Anyone with the link)
        if (docVisibility === 'public') {
          // User can access via public link
          setUserPermission(docPublicPermission as 'viewer' | 'editor');
          return;
        }

        // User has no access - redirect
        alert('You do not have permission to access this document.');
        router.push('/dashboard');
      } catch (error) {
        console.error('Error checking permission:', error);
        alert('Failed to check document permissions.');
        router.push('/dashboard');
      }
    };

    checkPermission();
  }, [session, documentId, router]);

  // Initialize Socket.io connection
  const { socket, isConnected } = useSocket();

  // Get current user info
  const currentUser: User = {
    id: session?.user?.id || 'anonymous',
    name: session?.user?.name || 'Anonymous',
    email: session?.user?.email || 'anonymous@example.com',
    cursorColor: generateRandomColor()
  };

  // Initialize Yjs provider for collaboration
  const { ydoc, synced } = useYjsProvider({
    socket,
    documentId,
    user: currentUser,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUsersChange: (users: any[]) => {
      // Update active users list
      const mappedUsers = users.map((u) => u.user).filter((u) => u && u.id !== currentUser.id);
      setActiveUsers(mappedUsers);
    }
  });

  /**
   * Handle editor ready
   */
  const handleEditorReady = useCallback((editorInstance: Editor) => {
    setEditor(editorInstance);

    // Listen for content changes
    editorInstance.on('update', ({ editor }) => {
      // Update word and character count
      const text = editor.getText();
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      const chars = text.length;
      
      setWordCount(words);
      setCharCount(chars);

      // Trigger auto-save
      setSaveStatus('unsaved');
      
      // Debounce save
      const timeout = setTimeout(() => {
        handleAutoSave(editor);
      }, 2000); // Save after 2 seconds of inactivity
      
      setSaveTimeout(timeout);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Auto-save document content
   */
  const handleAutoSave = async (editor: Editor) => {
    try {
      setSaveStatus('saving');
      
      // Get document content
      const content = editor.getHTML();
      
      // Save to API
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          title: documentTitle,
          wordCount,
          charCount
        })
      });

      if (!response.ok) {
        throw new Error('Failed to save document');
      }
      
      setSaveStatus('saved');
      setLastSaved(new Date());
      console.log('📄 Document auto-saved');
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('unsaved');
    }
  };

  /**
   * Handle document title change
   */
  const handleTitleChange = async (newTitle: string) => {
    setDocumentTitle(newTitle);
    setSaveStatus('unsaved');
    
    // Debounce title save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        
        // Save to API
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });

        if (!response.ok) {
          throw new Error('Failed to save title');
        }
        
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving title:', error);
        setSaveStatus('unsaved');
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  /**
   * Handle share button click
   */
  const handleShare = () => {
    setShowShareModal(true);
  };

  /**
   * Handle add comment
   */
  const handleAddComment = (text: string) => {
    // TODO: Implement comment creation
    console.log('Adding comment:', text);
    alert(`Comment added: ${text}\n\nThis will be implemented with the Comment schema.`);
  };

  /**
   * Handle restore version
   * Updates the Yjs document which syncs to all collaborators in real-time
   */
  const handleRestoreVersion = useCallback((content: string, title: string) => {
    if (!editor) return;

    // Update document title
    setDocumentTitle(title);
    
    // Clear and set new content in TipTap editor
    // This will automatically sync via Yjs to all connected users
    editor.commands.setContent(content);

    // Update stats
    const text = editor.getText();
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const chars = text.length;
    
    setWordCount(words);
    setCharCount(chars);

    console.log('✅ Document restored and synced to all collaborators');
  }, [editor]);

  /**
   * Tab management functions
   */
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    // TODO: Load tab content into editor
  };

  const handleTabAdd = () => {
    const newTabId = `tab-${tabs.length + 1}`;
    const newTab: Tab = {
      id: newTabId,
      name: `Tab ${tabs.length + 1}`,
      content: ''
    };
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
  };

  const handleTabRename = (tabId: string, newName: string) => {
    setTabs(tabs.map(tab => 
      tab.id === tabId ? { ...tab, name: newName } : tab
    ));
  };

  const handleTabDelete = (tabId: string) => {
    if (tabs.length === 1) return; // Don't delete last tab
    
    const newTabs = tabs.filter(tab => tab.id !== tabId);
    setTabs(newTabs);
    
    // Switch to first tab if deleting active tab
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id);
    }
  };

  // Loading state
  if (status === 'loading' || !session) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Sticky Document Header */}
      <DocumentHeader
        title={documentTitle}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        activeUsers={activeUsers}
        onShare={handleShare}
      />

      {/* Sticky Editor Toolbar */}
      <EditorToolbar editor={editor} />

      {/* Left Sidebar - Document Tabs */}
      <DocumentTabs
        editor={editor}
        activeTabId={activeTabId}
        tabs={tabs}
        onTabChange={handleTabChange}
        onTabAdd={handleTabAdd}
        onTabRename={handleTabRename}
        onTabDelete={handleTabDelete}
      />

      {/* Main Editor Area - ONLY SCROLLABLE PART */}
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-900 pl-64 pr-80 pb-10">
        <div className="max-w-[850px] mx-auto py-6 px-4">
          {/* White document card - Google Docs style */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg min-h-[calc(100vh-180px)] p-16">
            <TipTapEditor
              key={documentId}
              ydoc={ydoc}
              currentUser={currentUser}
              onReady={handleEditorReady}
              provider={null}
              readOnly={userPermission === 'viewer'}
            />
            {/* Read-only banner */}
            {userPermission === 'viewer' && (
              <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-lg shadow-lg z-40">
                <div className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span className="font-medium">View-only mode</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Fixed Right Sidebar */}
      <RightSidebar
        documentId={documentId}
        activeUsers={[currentUser, ...activeUsers]}
        comments={[]}
        onAddComment={handleAddComment}
        onRestoreVersion={handleRestoreVersion}
      />

      {/* Fixed Status Bar */}
      <StatusBar
        isConnected={isConnected && synced}
        lastSaved={lastSaved}
        wordCount={wordCount}
        charCount={charCount}
      />

      {/* Share Modal */}
      {showShareModal && (
        <ShareModal
          documentId={documentId}
          isOwner={isOwner}
          onClose={() => setShowShareModal(false)}
          currentUserEmail={session?.user?.email || ''}
          ownerEmail={ownerEmail}
          visibility={visibility}
          publicPermission={publicPermission}
        />
      )}

      {/* Connection Status Toast (when disconnected) */}
      {!isConnected && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-pulse">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">Connection lost. Trying to reconnect...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Generate random color for user cursor
 */
function generateRandomColor(): string {
  const colors = [
    '#EF4444', // Red
    '#F59E0B', // Amber
    '#10B981', // Green
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#14B8A6', // Teal
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
