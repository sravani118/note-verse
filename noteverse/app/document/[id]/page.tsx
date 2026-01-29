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

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import { useSocket } from '@/lib/socket/useSocket';
import { useYjsProvider } from '@/lib/socket/useYjsProvider';
import { useUserProfile } from '@/app/hooks/useUserProfile';
import toast from 'react-hot-toast';
import ThemeToggle from '@/app/components/ThemeToggle';
import { Editor as TipTapEditorInstance } from '@tiptap/react';
import DocumentHeader from '@/app/components/document/DocumentHeader';
import EditorToolbar from '@/app/components/document/EditorToolbar';
import DocumentTabs from '@/app/components/document/DocumentTabs';
import TipTapEditor from '@/app/components/document/TipTapEditor';
import RightSidebar from '@/app/components/document/RightSidebar';
import StatusBar from '@/app/components/document/StatusBar';
import ShareModal from '@/app/components/document/ShareModal';
import DocumentSettings from '@/app/components/document/DocumentSettings';
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
  const { profile: userProfile, loading: profileLoading } = useUserProfile();

  // Document state
  const [documentTitle, setDocumentTitle] = useState('Untitled Document');
  const documentTitleRef = useRef('Untitled Document'); // Keep ref in sync with state for closures
  const [documentContent, setDocumentContent] = useState(''); // Store fetched content
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [activeUsers, setActiveUsers] = useState<User[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0); // Track unread messages
  const [isChatOpen, setIsChatOpen] = useState(true); // Track if chat panel is open
  const contentLoadedRef = useRef(false); // Track if initial content has been loaded

  // Debug: Track chat messages changes
  useEffect(() => {
    console.log('\ud83d\udcac Chat messages updated:', chatMessages.length, 'messages');
    chatMessages.forEach((msg, idx) => {
      console.log(`  [${idx}] ${msg.senderName}: ${msg.message} (${msg.timestamp})`);
    });
  }, [chatMessages]);

  // Tab state - Each tab has independent content stored as HTML
  const [tabs, setTabs] = useState<Tab[]>([
    { id: 'tab-1', name: 'Tab 1', content: '' }
  ]);
  const [activeTabId, setActiveTabId] = useState('tab-1');

  /**
   * Save current editor content to active tab before switching
   */
  const saveCurrentTabContent = useCallback(() => {
    if (editor && activeTabId) {
      const html = editor.getHTML();
      setTabs(prevTabs => 
        prevTabs.map(tab => 
          tab.id === activeTabId 
            ? { ...tab, content: html }
            : tab
        )
      );
    }
  }, [editor, activeTabId]);

  // Auto-save timeout
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [userPermission, setUserPermission] = useState<'viewer' | 'editor' | 'owner' | null>(null);
  const [ownerEmail, setOwnerEmail] = useState('');
  const [visibility, setVisibility] = useState<'restricted' | 'public'>('restricted');
  const [publicPermission, setPublicPermission] = useState<'viewer' | 'editor'>('viewer');

  // Document Settings modal state
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // Editor settings state
  const [editorSettings, setEditorSettings] = useState({
    defaultFont: 'Arial',
    defaultFontSize: '14',
    pageWidth: 'normal' as 'normal' | 'wide',
    spellCheck: true,
  });

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
          toast.error('Failed to load document');
          router.push('/dashboard');
          return;
        }

        const docData = await docResponse.json();
        const docOwnerEmail = docData.document?.userId?.email;
        const docVisibility = docData.document?.visibility || 'restricted';
        const docPublicPermission = docData.document?.publicPermission || 'viewer';
        const docTitle = docData.document?.title || 'Untitled Document';
        const docContent = docData.document?.content || '';
        const isNewDoc = docData.document?.isNew || false;
        
        console.log('📄 Document loaded from API:', { 
          title: docTitle,
          isNew: isNewDoc,
          contentLength: docContent.length,
          rawTitle: docData.document?.title,
          alreadyLoaded: contentLoadedRef.current 
        });
        
        setOwnerEmail(docOwnerEmail || '');
        setVisibility(docVisibility);
        setPublicPermission(docPublicPermission);
        setDocumentTitle(docTitle);
        documentTitleRef.current = docTitle; // Keep ref in sync
        setDocumentContent(docContent); // Store content in state
        
        // Load editor settings from document
        if (docData.document?.settings) {
          const settings = docData.document.settings;
          setEditorSettings({
            defaultFont: settings.defaultFont || 'Arial',
            defaultFontSize: settings.defaultFontSize || '14',
            pageWidth: settings.pageWidth || 'normal',
            spellCheck: settings.spellCheck !== false
          });
        }
        
        const isDocOwner = docOwnerEmail === session.user.email;
        setIsOwner(isDocOwner);

        if (isDocOwner) {
          setUserPermission('owner');
          return; // Owner has full access
        }

        // Check if user has explicit shared access
        const shareResponse = await fetch(`/api/documents/${documentId}/share`);
        if (shareResponse.ok) {
          const shareData = await shareResponse.json();
          const userShare = shareData.collaborators?.find(
            (s: { sharedWithEmail: string; permission: string }) => 
              s.sharedWithEmail === session.user.email
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
        toast.error('You do not have permission to access this document');
        router.push('/dashboard');
      } catch (error) {
        console.error('Error checking permission:', error);
        toast.error('Failed to check document permissions');
        router.push('/dashboard');
      }
    };

    checkPermission();
  }, [session, documentId, router]);

  // Fetch chat messages
  const fetchChatMessages = useCallback(async () => {
    if (!documentId) return;
    
    setLoadingChat(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/chat`);
      
      console.log(`📨 Chat API response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Fetched chat messages:', data.messages?.length || 0, 'messages');
        setChatMessages(data.messages || []);
      } else {
        // Read response body once as text first
        const responseText = await response.text();
        
        let errorDetails = {
          status: response.status,
          statusText: response.statusText,
          url: `/api/documents/${documentId}/chat`,
          error: 'Unknown error',
          details: responseText || 'No response body'
        };
        
        // Try to parse as JSON
        if (responseText) {
          try {
            const errorJson = JSON.parse(responseText);
            errorDetails.error = errorJson.error || errorJson.message || 'Unknown error';
            if (errorJson.details) {
              errorDetails.details = errorJson.details;
            }
          } catch (e) {
            // Not JSON, keep the text as details
            console.log('⚠️ Response is not JSON, raw text:', responseText.substring(0, 200));
          }
        }
        
        // Only log error for non-404 cases (404 means chat doesn't exist yet, which is normal)
        if (response.status === 404) {
          console.log('ℹ️ Chat not found for this document (will be created when first message is sent)');
        } else {
          console.error('❌ Failed to fetch chat messages:', JSON.stringify(errorDetails, null, 2));
          console.warn('⚠️ Chat messages could not be loaded. Starting with empty chat.');
        }
        setChatMessages([]); // Start with empty chat
      }
    } catch (error) {
      console.error('❌ Exception while fetching chat messages:', error);
      setChatMessages([]); // Start with empty chat on error
    } finally {
      setLoadingChat(false);
    }
  }, [documentId]);

  useEffect(() => {
    fetchChatMessages();
  }, [fetchChatMessages]);

  // Initialize Socket.io connection
  const { socket, isConnected, isConnecting } = useSocket();

  // Get current user info (memoized to prevent re-renders)
  const currentUser: User = useMemo(() => ({
    id: session?.user?.id || 'anonymous',
    name: userProfile?.displayName || session?.user?.name || 'Anonymous',
    email: session?.user?.email || 'anonymous@example.com',
    cursorColor: userProfile?.cursorColor || generateRandomColor()
  }), [session?.user?.id, session?.user?.name, session?.user?.email, userProfile?.displayName, userProfile?.cursorColor]);

  // Initialize Yjs provider for collaboration
  const { ydoc, synced } = useYjsProvider({
    socket,
    documentId,
    user: currentUser,
    onSync: () => {
      console.log('✅ Yjs document synced with server');
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onUsersChange: (users: any[]) => {
      // Update active users list
      const mappedUsers = users.map((u) => u.user).filter((u) => u && u.id !== currentUser.id);
      setActiveUsers(mappedUsers);
    }
  });

  // Load document content into Yjs when ydoc becomes available
  useEffect(() => {
    if (!ydoc || !documentContent || contentLoadedRef.current) {
      return;
    }

    console.log(`📥 Loading content into Yjs (${documentContent.length} characters)`);
    const metadata = ydoc.getMap('metadata');
    metadata.set('initialContent', documentContent);
    console.log('✅ Content stored in Yjs metadata, will be loaded by editor when ready');
  }, [ydoc, documentContent]);

  /**
   * Socket.io chat event listeners
   */
  useEffect(() => {
    if (!socket || !isConnected) {
      console.log('⚠️ Socket not ready for chat listeners:', { socket: !!socket, isConnected });
      return;
    }

    console.log('🎧 Setting up chat message listener');
    console.log('  - Socket ID:', socket.id);
    console.log('  - Socket connected:', socket.connected);
    console.log('  - Document ID:', documentId);
    
    // Test socket is working
    socket.emit('test-event', { test: 'ping' });
    console.log('  - Test event emitted to verify socket works');

    // Listen for incoming chat messages
    const handleChatMessage = (message: any) => {
      console.log('🔔 🔔 🔔 RECEIVED CHAT MESSAGE FROM SOCKET.IO');
      console.log('  - Full message object:', message);
      console.log('  - ID:', message.id);
      console.log('  - Sender:', message.senderName, '(', message.senderId, ')');
      console.log('  - Message text:', message.message);
      console.log('  - Timestamp (raw):', message.timestamp);
      console.log('  - Timestamp type:', typeof message.timestamp);
      
      // Convert timestamp string to Date object (Socket.io serializes Date to string)
      const formattedMessage = {
        ...message,
        timestamp: new Date(message.timestamp)
      };
      
      console.log('  - Timestamp (converted):', formattedMessage.timestamp);
      console.log('  - Is valid date:', !isNaN(formattedMessage.timestamp.getTime()));
      
      console.log('💾 Updating chat messages state...');
      setChatMessages((prev) => {
        console.log(`  - Previous message count: ${prev.length}`);
        const newMessages = [...prev, formattedMessage];
        console.log(`  - New message count: ${newMessages.length}`);
        console.log('✅ State updated! Message should now appear in UI.');
        return newMessages;
      });
      
      // Increment unread count if chat is not currently visible
      // Only count messages from other users
      if (!isChatOpen && message.senderId !== currentUser.id) {
        setUnreadChatCount(prev => prev + 1);
      }
    };

    // Register listener
    socket.on('receive-chat-message', handleChatMessage);
    console.log('✅ Chat message listener registered');
    
    // Verify listener is registered
    console.log('  - Registered listeners:', socket.listeners('receive-chat-message').length);

    return () => {
      console.log('🔇 Removing chat message listener');
      socket.off('receive-chat-message', handleChatMessage);
    };
  }, [socket, isConnected, documentId, isChatOpen, currentUser.id]); // Added dependencies for unread tracking

  /**
   * Send chat message
   */
  const handleSendChatMessage = async (message: string) => {
    if (!message.trim() || !socket) return;

    console.log('📤 Sending chat message:', message);
    console.log('  - Socket connected:', socket.connected);
    console.log('  - Document ID:', documentId);
    console.log('  - Current user:', currentUser.name, currentUser.id);

    try {
      // Emit via Socket.io for real-time delivery
      socket.emit('send-chat-message', {
        documentId,
        message: message.trim()
      });
      
      console.log('✅ Message emitted via Socket.io');

      // Also save to database
      const response = await fetch(`/api/documents/${documentId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: message.trim() })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Failed to save chat message:', error.error || error);
        
        // Show user-friendly error if permission denied
        if (response.status === 403) {
          toast.error('You do not have permission to send messages. Only editors and owners can send messages.', { duration: 5000 });
        } else {
          console.warn('⚠️ Message sent via Socket.io but not saved to database');
        }
      } else {
        console.log('✅ Chat message saved to database');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  };

  /**
   * Auto-save document content
   */
  const handleAutoSave = async (editor: Editor) => {
    try {
      setSaveStatus('saving');
      
      // Get document content
      const content = editor.getHTML();
      
      // Use ref to get current title (avoids stale closure issue)
      const currentTitle = documentTitleRef.current;
      
      console.log('💾 Auto-saving document:', { 
        title: currentTitle, 
        contentLength: content.length,
        wordCount,
        charCount 
      });
      
      // Save to API
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          content,
          title: currentTitle,
          wordCount,
          charCount
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Failed to auto-save:', errorData);
        throw new Error('Failed to save document');
      }
      
      const result = await response.json();
      console.log('✅ Document auto-saved:', result);
      setSaveStatus('saved');
      setLastSaved(new Date());
    } catch (error) {
      console.error('Error saving document:', error);
      setSaveStatus('unsaved');
    }
  };

  /**
   * Handle editor ready event - apply initial settings and setup listeners
   */
  const handleEditorReady = useCallback((editorInstance: TipTapEditorInstance) => {
    console.log('🎯 Editor ready callback triggered');
    setEditor(editorInstance);
    
    // Load initial content from Yjs metadata if available and not already loaded
    if (ydoc && !contentLoadedRef.current) {
      const metadata = ydoc.getMap('metadata');
      const initialContent = metadata.get('initialContent');
      
      if (initialContent && typeof initialContent === 'string') {
        console.log(`📄 [handleEditorReady] Loading ${initialContent.length} characters of saved content into editor`);
        editorInstance.commands.setContent(initialContent);
        metadata.delete('initialContent');
        contentLoadedRef.current = true;
        console.log('✅ Content loaded via handleEditorReady');
      } else {
        console.log('ℹ️ No initial content found in metadata');
      }
    }
    
    // Apply initial editor settings
    if (editorSettings.defaultFont) {
      editorInstance.chain().focus().setFontFamily(editorSettings.defaultFont).run();
    }
    if (editorSettings.defaultFontSize) {
      const fontSize = `${editorSettings.defaultFontSize}px`;
      editorInstance.chain().focus().selectAll().setMark('textStyle', { fontSize }).run();
    }
    
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
    
    console.log('✅ Editor ready - initial settings applied');
  }, [editorSettings, ydoc]);

  /**
   * Handle document title change
   */
  const handleTitleChange = async (newTitle: string) => {
    console.log('📝 Title change requested:', { oldTitle: documentTitle, newTitle });
    setDocumentTitle(newTitle);
    documentTitleRef.current = newTitle; // Keep ref in sync
    setSaveStatus('unsaved');
    
    // Debounce title save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    
    const timeout = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        console.log('💾 Saving title to API:', newTitle);
        
        // Save to API
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: newTitle })
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Failed to save title:', errorData);
          throw new Error('Failed to save title');
        }
        
        const result = await response.json();
        console.log('✅ Title saved successfully:', result);
        setSaveStatus('saved');
        setLastSaved(new Date());
      } catch (error) {
        console.error('Error saving title:', error);
        setSaveStatus('unsaved');
        toast.error('Failed to save title');
      }
    }, 1000);
    
    setSaveTimeout(timeout);
  };

  /**
   * Handle settings update from DocumentSettings modal
   */
  const handleSettingsUpdate = useCallback((settings: {
    defaultFont: string;
    defaultFontSize: string;
    pageWidth: 'normal' | 'wide';
    spellCheck: boolean;
  }) => {
    setEditorSettings(settings);
    
    // Apply font settings to editor if available
    if (editor) {
      // Apply font family to entire document
      editor.chain().focus().setFontFamily(settings.defaultFont).run();
      
      // Apply font size (convert to px)
      const fontSize = `${settings.defaultFontSize}px`;
      editor.chain().focus().selectAll().setMark('textStyle', { fontSize }).run();
      
      console.log('✅ Editor settings applied:', settings);
    }
    
    toast.success('Document settings updated successfully');
  }, [editor]);

  /**
   * Handle share button click
   */
  const handleShare = () => {
    setShowShareModal(true);
  };

  /**
   * Tab management functions
   */
  const handleTabChange = (tabId: string) => {
    // Save current tab content before switching
    saveCurrentTabContent();
    
    // Switch to new tab
    setActiveTabId(tabId);
    
    // Load the new tab's content into editor
    const newTab = tabs.find(t => t.id === tabId);
    if (newTab && editor) {
      editor.commands.setContent(newTab.content || '');
    }
  };

  const handleTabAdd = () => {
    // Save current tab content first
    saveCurrentTabContent();
    
    const newTabId = `tab-${Date.now()}`; // Use timestamp for unique ID
    const newTab: Tab = {
      id: newTabId,
      name: `Tab ${tabs.length + 1}`,
      content: '' // Empty content for new tab
    };
    
    setTabs([...tabs, newTab]);
    setActiveTabId(newTabId);
    
    // Clear editor for new tab
    if (editor) {
      editor.commands.setContent('');
    }
  };

  /**
   * Periodically save tab content (auto-save for tabs)
   */
  useEffect(() => {
    const interval = setInterval(() => {
      saveCurrentTabContent();
    }, 5000); // Save every 5 seconds

    return () => clearInterval(interval);
  }, [saveCurrentTabContent]);

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
      const firstTab = newTabs[0];
      setActiveTabId(firstTab.id);
      
      // Load first tab's content
      if (editor) {
        editor.commands.setContent(firstTab.content || '');
      }
    }
  };

  /**
   * Handle chat panel open - clear unread count
   */
  const handleChatOpen = () => {
    setUnreadChatCount(0);
    setIsChatOpen(true);
  };

  /**
   * Handle sidebar open/close tracking
   */
  const handleSidebarStateChange = (isOpen: boolean, activeTab: string) => {
    if (isOpen && activeTab === 'chat') {
      setIsChatOpen(true);
      setUnreadChatCount(0);
    } else {
      setIsChatOpen(false);
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
    // Layout Structure:
    // - Fixed Header: 56px (h-14) at top
    // - Fixed Toolbar: 48px (h-12) below header  
    // - Fixed Right Sidebar: 104px from top (header+toolbar), 32px from bottom (footer)
    // - Fixed Footer: 32px at bottom
    // - Main editor: Scrollable content area with left/right padding for sidebars
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900 overflow-hidden">
      {/* Fixed Document Header - 56px height */}
      <DocumentHeader
        title={documentTitle}
        onTitleChange={handleTitleChange}
        saveStatus={saveStatus}
        activeUsers={activeUsers}
        onShare={handleShare}
        onOpenSettings={() => setShowSettingsModal(true)}
        documentId={documentId}
        editor={editor}
      />

      {/* Fixed Editor Toolbar - 48px height */}
      <EditorToolbar 
        editor={editor} 
        currentFont={editorSettings.defaultFont}
        currentFontSize={editorSettings.defaultFontSize}
      />

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
        <div 
          className={`mx-auto py-6 px-4 transition-all duration-300 ${
            editorSettings.pageWidth === 'wide' ? 'max-w-[1200px]' : 'max-w-[850px]'
          }`}
        >
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
            {/* Read-only banner - only show after permission is determined */}
            {userPermission === 'viewer' && (
              <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-blue-500 text-white px-6 py-2 rounded-lg shadow-lg z-40">
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

      {/* Fixed Right Sidebar - Positioned between toolbar (104px) and footer (32px) */}
      <RightSidebar
        documentId={documentId}
        activeUsers={[currentUser, ...activeUsers]}
        chatMessages={chatMessages}
        currentUserId={currentUser.id}
        onSendMessage={handleSendChatMessage}
        canSendMessage={userPermission === 'editor' || userPermission === 'owner'}
        unreadCount={unreadChatCount}
        onChatOpen={handleChatOpen}
      />

      {/* Fixed Status Bar - 32px height at bottom */}
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
          documentTitle={documentTitle}
          isOwner={isOwner}
          onClose={() => setShowShareModal(false)}
          currentUserEmail={session?.user?.email || ''}
          ownerEmail={ownerEmail}
          visibility={visibility}
          publicPermission={publicPermission}
        />
      )}

      {/* Document Settings Modal */}
      {showSettingsModal && (
        <DocumentSettings
          documentId={documentId}
          isOwner={isOwner}
          isEditor={userPermission === 'editor' || userPermission === 'owner'}
          onClose={() => setShowSettingsModal(false)}
          currentTitle={documentTitle}
          onTitleChange={handleTitleChange}
          editor={editor}
          onSettingsUpdate={handleSettingsUpdate}
        />
      )}

      {/* Connection Status - Professional & Subtle */}
      {!isConnected && isConnecting && (
        <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-yellow-200 dark:border-yellow-800 px-4 py-2 rounded-md shadow-sm z-50">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-yellow-600 dark:text-yellow-400 animate-spin" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Reconnecting...</span>
          </div>
        </div>
      )}
      
      {!isConnected && !isConnecting && (
        <div className="fixed top-4 right-4 bg-white dark:bg-gray-800 border border-red-200 dark:border-red-800 px-4 py-2 rounded-md shadow-sm z-50">
          <div className="flex items-center gap-2 text-sm">
            <svg className="w-4 h-4 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414" />
            </svg>
            <span className="text-gray-700 dark:text-gray-300">Offline</span>
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
