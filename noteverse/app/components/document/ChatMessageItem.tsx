/**
 * ChatMessageItem Component
 * 
 * Displays a single chat message with:
 * - User avatar/initial
 * - Username
 * - Message text
 * - Timestamp
 * - Different styling for own vs others' messages
 */

'use client';

interface ChatMessageItemProps {
  id: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  message: string;
  timestamp: Date;
  isOwnMessage: boolean;
}

export default function ChatMessageItem({
  senderName,
  senderEmail,
  message,
  timestamp,
  isOwnMessage
}: ChatMessageItemProps) {
  /**
   * Get user initials from name
   */
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  /**
   * Get avatar color based on email
   */
  const getAvatarColor = (email: string) => {
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
    const index = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  /**
   * Format timestamp to relative time
   */
  const formatTime = (date: Date) => {
    const now = new Date();
    const messageDate = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - messageDate.getTime()) / 1000);

    if (diffInSeconds < 60) {
      return 'just now';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `${minutes}m ago`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `${hours}h ago`;
    } else {
      return messageDate.toLocaleDateString();
    }
  };

  return (
    <div
      className={`flex gap-2 ${
        isOwnMessage ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar */}
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
        style={{ backgroundColor: getAvatarColor(senderEmail) }}
      >
        {getInitials(senderName)}
      </div>

      {/* Message Content */}
      <div
        className={`flex flex-col max-w-[70%] ${
          isOwnMessage ? 'items-end' : 'items-start'
        }`}
      >
        {/* Header: Name & Timestamp */}
        <div className="flex items-center gap-2 mb-1 px-1">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {isOwnMessage ? 'You' : senderName}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTime(timestamp)}
          </span>
        </div>

        {/* Message Bubble */}
        <div
          className={`px-3 py-2 rounded-lg break-words ${
            isOwnMessage
              ? 'bg-indigo-600 text-white rounded-br-none'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-none'
          }`}
        >
          <p className="text-sm whitespace-pre-wrap">{message}</p>
        </div>
      </div>
    </div>
  );
}
