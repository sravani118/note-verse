/**
 * Right Sidebar Component
 * 
 * Collapsible sidebar with tabs:
 * - Chat: Real-time chat space for document collaboration
 * - Users: Active collaborators list
 */

'use client';

import { useState } from 'react';
import DocumentChat from './DocumentChat';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: Date;
}

interface RightSidebarProps {
  documentId: string;
  activeUsers: User[];
  chatMessages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  canSendMessage: boolean;
  unreadCount?: number; // New: unread message count
  onChatOpen?: () => void; // New: callback when chat is opened
}

export default function RightSidebar({
  activeUsers,
  chatMessages,
  currentUserId,
  onSendMessage,
  canSendMessage,
  unreadCount = 0,
  onChatOpen
}: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'chat' | 'users'>('chat');

  /**
   * Handle opening chat tab - clear unread count
   */
  const handleChatTabClick = () => {
    setActiveTab('chat');
    if (onChatOpen) {
      onChatOpen();
    }
  };

  /**
   * Handle opening sidebar - if it was closed and user opens to chat, clear unread
   */
  const handleOpenSidebar = () => {
    setIsOpen(true);
    if (activeTab === 'chat' && onChatOpen) {
      onChatOpen();
    }
  };

  // Get user initials
  const getInitials = (name: string) => {
    if (!name || !name.trim()) return '?';
    return name
      .trim()
      .split(' ')
      .filter(n => n.length > 0)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative">
      {/* Toggle Button (when closed) - FIXED POSITION: Below toolbar on right edge */}
      {!isOpen && (
        <button
          onClick={handleOpenSidebar}
          className="fixed right-0 top-[104px] bg-indigo-600 text-white p-3 rounded-l-lg shadow-lg hover:bg-indigo-700 transition-colors z-30"
          title="Open sidebar"
        >
          {/* Show unread badge if there are unread messages */}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -left-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Sidebar Panel - Fixed positioning between toolbar and footer */}
      {/* Layout: Header (56px) + Toolbar (48px) = 104px from top, Footer (~32px) from bottom */}
      <div
        className={`
          fixed right-0 top-[104px] bottom-[32px] w-80 
          flex flex-col
          bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 
          shadow-lg transform transition-transform duration-300 ease-in-out z-30
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        {/* Header with Tabs */}
        <div className="flex flex-col border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-2">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Collaboration</h3>
            {/* Close Button */}
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Close sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="flex gap-1 px-4 pb-2">
            <button
              onClick={handleChatTabClick}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors relative ${
                activeTab === 'chat'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Chat
              {/* Unread indicator badge */}
              {unreadCount > 0 && activeTab !== 'chat' && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                activeTab === 'users'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Users ({activeUsers.length})
            </button>
          </div>
        </div>

        {/* Tab Content - Fills remaining space between header and bottom */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Chat Tab */}
          {activeTab === 'chat' && (
            <DocumentChat
              messages={chatMessages}
              currentUserId={currentUserId}
              onSendMessage={onSendMessage}
              canSendMessage={canSendMessage}
            />
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-4 space-y-3 overflow-y-auto h-full">
              <div className="mb-2">
                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Active Now ({activeUsers.length})
                </h4>
              </div>
              {activeUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: user.cursorColor }}
                  >
                    {getInitials(user.name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {user.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Online</span>
                  </div>
                </div>
              ))}
              {activeUsers.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm">No active users</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
