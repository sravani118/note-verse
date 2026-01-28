/**
 * DocumentChat Component
 * 
 * Real-time chat space for document collaboration
 * Features:
 * - Scrollable message list
 * - Real-time message updates via Socket.io
 * - Message input with send button
 * - Different styling for own vs others' messages
 */

'use client';

import { useEffect, useRef } from 'react';
import ChatMessageItem from './ChatMessageItem';
import ChatInput from './ChatInput';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: Date;
}

interface DocumentChatProps {
  messages: ChatMessage[];
  currentUserId: string;
  onSendMessage: (message: string) => void;
  canSendMessage: boolean;
}

export default function DocumentChat({
  messages,
  currentUserId,
  onSendMessage,
  canSendMessage
}: DocumentChatProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          Chat Space
        </h3>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {messages.length} {messages.length === 1 ? 'message' : 'messages'}
        </p>
      </div>

      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <svg
              className="w-12 h-12 mx-auto mb-3 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">Start the conversation!</p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                id={msg.id}
                senderId={msg.senderId}
                senderName={msg.senderName}
                senderEmail={msg.senderEmail}
                message={msg.message}
                timestamp={msg.timestamp}
                isOwnMessage={msg.senderId === currentUserId}
              />
            ))}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Chat Input */}
      {canSendMessage ? (
        <ChatInput
          onSendMessage={onSendMessage}
          placeholder="Type a message..."
        />
      ) : (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            You have view-only access. Only editors and owners can send messages.
          </p>
        </div>
      )}
    </div>
  );
}
