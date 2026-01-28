/**
 * ChatInput Component
 * 
 * Chat message input with:
 * - Text area for message
 * - Send button
 * - Press Enter to send (Shift+Enter for new line)
 * - Character limit indicator (optional)
 */

'use client';

import { useState, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type a message...'
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  /**
   * Handle send message
   */
  const handleSend = () => {
    if (!message.trim() || disabled) return;

    onSendMessage(message.trim());
    setMessage(''); // Clear input after sending
  };

  /**
   * Handle keyboard shortcuts
   * Enter: Send message
   * Shift+Enter: New line
   */
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-white dark:bg-gray-800">
      <div className="flex gap-2">
        {/* Text Input */}
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm"
          rows={2}
          maxLength={1000}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={!message.trim() || disabled}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium self-end"
          title="Send message (Enter)"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        </button>
      </div>

      {/* Helper Text */}
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        Press <span className="font-medium">Enter</span> to send, <span className="font-medium">Shift+Enter</span> for new line
      </p>
    </div>
  );
}
