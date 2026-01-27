/**
 * Collaborative Text Editor Component
 * 
 * Real-time collaborative text editor using Yjs CRDT
 * Features:
 * - Real-time synchronization
 * - Cursor tracking and display
 * - User presence indicators
 * - Typing indicators
 * - Conflict-free editing
 */

'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useSocket } from '@/lib/socket/useSocket';
import { useYjsProvider } from '@/lib/socket/useYjsProvider';
import * as Y from 'yjs';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface RemoteCursor {
  socketId: string;
  user: User;
  position: number;
  selection?: { start: number; end: number };
}

interface CollaborativeEditorProps {
  documentId: string;
  currentUser: User;
  initialContent?: string;
  onContentChange?: (content: string) => void;
  className?: string;
}

export default function CollaborativeEditor({
  documentId,
  currentUser,
  initialContent = '',
  onContentChange,
  className = ''
}: CollaborativeEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [remoteCursors, setRemoteCursors] = useState<Map<string, RemoteCursor>>(new Map());
  const [typingUsers, setTypingUsers] = useState<Set<string>>(new Set());
  const [activeUsers, setActiveUsers] = useState<any[]>([]);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const yTextRef = useRef<Y.Text | null>(null);
  const isUpdatingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Socket.io connection
  const { socket, isConnected } = useSocket();

  // Initialize Yjs provider
  const { ydoc, synced, getText } = useYjsProvider({
    socket,
    documentId,
    user: currentUser,
    onSync: (doc) => {
      // Get initial content when synced
      const yText = doc.getText('content');
      yTextRef.current = yText;
      const initialText = yText.toString();
      if (initialText) {
        setContent(initialText);
        if (onContentChange) {
          onContentChange(initialText);
        }
      }
    },
    onUsersChange: (users) => {
      setActiveUsers(users);
    }
  });

  /**
   * Initialize Yjs text binding
   */
  useEffect(() => {
    if (!ydoc || !synced) return;

    const yText = getText('content');
    if (!yText) return;
    
    yTextRef.current = yText;

    // If yText is empty and we have initial content, set it
    if (yText.length === 0 && initialContent) {
      yText.insert(0, initialContent);
    }

    // Observe Yjs text changes
    const observer = () => {
      if (isUpdatingRef.current) return;
      
      const newContent = yText.toString();
      setContent(newContent);
      
      if (onContentChange) {
        onContentChange(newContent);
      }
    };

    yText.observe(observer);

    return () => {
      yText.unobserve(observer);
    };
  }, [ydoc, synced, getText, initialContent, onContentChange]);

  /**
   * Handle local text changes
   */
  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (!yTextRef.current || !synced) return;

    const newValue = e.target.value;
    const yText = yTextRef.current;
    
    // Prevent feedback loop
    isUpdatingRef.current = true;

    try {
      // Calculate the diff between old and new content
      const oldContent = yText.toString();
      
      if (newValue.length > oldContent.length) {
        // Text was inserted
        const pos = findInsertPosition(oldContent, newValue);
        const insertedText = newValue.substring(pos, pos + (newValue.length - oldContent.length));
        yText.insert(pos, insertedText);
      } else if (newValue.length < oldContent.length) {
        // Text was deleted
        const pos = findDeletePosition(oldContent, newValue);
        const deleteCount = oldContent.length - newValue.length;
        yText.delete(pos, deleteCount);
      } else {
        // Text was replaced
        const pos = findReplacePosition(oldContent, newValue);
        if (pos !== -1) {
          yText.delete(pos, 1);
          yText.insert(pos, newValue[pos]);
        }
      }

      setContent(newValue);
      
      // Send typing indicator
      if (socket) {
        socket.emit('typing-start', { documentId });
        
        // Clear previous timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        
        // Stop typing after 1 second of inactivity
        typingTimeoutRef.current = setTimeout(() => {
          socket.emit('typing-stop', { documentId });
        }, 1000);
      }
    } finally {
      isUpdatingRef.current = false;
    }
  }, [synced, socket, documentId]);

  /**
   * Handle cursor position changes
   */
  const handleSelectionChange = useCallback(() => {
    if (!socket || !textareaRef.current) return;

    const position = textareaRef.current.selectionStart;
    const selection = {
      start: textareaRef.current.selectionStart,
      end: textareaRef.current.selectionEnd
    };

    // Broadcast cursor position
    socket.emit('cursor-update', {
      documentId,
      position,
      selection
    });
  }, [socket, documentId]);

  /**
   * Listen for remote cursor updates
   */
  useEffect(() => {
    if (!socket) return;

    const handleCursorUpdate = ({ socketId, user, position, selection }: any) => {
      setRemoteCursors(prev => {
        const newMap = new Map(prev);
        newMap.set(socketId, { socketId, user, position, selection });
        return newMap;
      });

      // Remove cursor after 5 seconds of inactivity
      setTimeout(() => {
        setRemoteCursors(prev => {
          const newMap = new Map(prev);
          newMap.delete(socketId);
          return newMap;
        });
      }, 5000);
    };

    const handleUserTyping = ({ socketId, user, isTyping }: any) => {
      setTypingUsers(prev => {
        const newSet = new Set(prev);
        if (isTyping) {
          newSet.add(user.name);
        } else {
          newSet.delete(user.name);
        }
        return newSet;
      });
    };

    socket.on('cursor-update', handleCursorUpdate);
    socket.on('user-typing', handleUserTyping);

    return () => {
      socket.off('cursor-update', handleCursorUpdate);
      socket.off('user-typing', handleUserTyping);
    };
  }, [socket]);

  return (
    <div className={`relative ${className}`}>
      {/* Connection Status */}
      <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-600' : 'bg-red-600'} animate-pulse`} />
            <span className="text-sm font-medium">
              {isConnected ? synced ? 'Synced' : 'Syncing...' : 'Disconnected'}
            </span>
          </div>

          {/* Active Users */}
          {activeUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">•</span>
              <div className="flex -space-x-2">
                {activeUsers.slice(0, 5).map((u, idx) => (
                  <div
                    key={u.socketId}
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800"
                    style={{ backgroundColor: u.user?.cursorColor || '#6366F1' }}
                    title={u.user?.name}
                  >
                    {u.user?.name?.charAt(0).toUpperCase()}
                  </div>
                ))}
                {activeUsers.length > 5 && (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-bold border-2 border-white dark:border-gray-800">
                    +{activeUsers.length - 5}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Typing Indicators */}
        {typingUsers.size > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-400 italic">
            {Array.from(typingUsers).slice(0, 2).join(', ')}
            {typingUsers.size > 2 && ` +${typingUsers.size - 2}`}
            {' '}typing...
          </div>
        )}
      </div>

      {/* Editor */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleTextChange}
          onSelect={handleSelectionChange}
          onBlur={handleSelectionChange}
          disabled={!synced}
          className="w-full min-h-[500px] p-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none text-gray-900 dark:text-white resize-y font-mono"
          placeholder={synced ? 'Start typing...' : 'Loading...'}
        />

        {/* Remote Cursors Overlay */}
        {Array.from(remoteCursors.values()).map((cursor) => (
          <div
            key={cursor.socketId}
            className="absolute pointer-events-none"
            style={{
              top: `${calculateCursorPosition(cursor.position, content)}px`,
              left: '24px',
              borderLeft: `2px solid ${cursor.user.cursorColor}`,
              height: '1.5em'
            }}
          >
            <div
              className="absolute -top-6 left-0 px-2 py-1 text-xs text-white rounded whitespace-nowrap"
              style={{ backgroundColor: cursor.user.cursorColor }}
            >
              {cursor.user.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper functions for text diff calculation
 */

function findInsertPosition(oldText: string, newText: string): number {
  for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }
  return oldText.length;
}

function findDeletePosition(oldText: string, newText: string): number {
  for (let i = 0; i < Math.min(oldText.length, newText.length); i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }
  return newText.length;
}

function findReplacePosition(oldText: string, newText: string): number {
  if (oldText.length !== newText.length) return -1;
  for (let i = 0; i < oldText.length; i++) {
    if (oldText[i] !== newText[i]) {
      return i;
    }
  }
  return -1;
}

function calculateCursorPosition(position: number, content: string): number {
  const lines = content.substring(0, position).split('\n').length;
  return lines * 24; // Approximate line height
}
