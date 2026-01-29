'use client';

import Link from 'next/link';
import { useState } from 'react';

interface DocumentCardProps {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  collaborators?: Array<{ name: string; avatar?: string }>;
  isShared?: boolean;
  role?: string; // 'owner', 'editor', 'viewer'
  owner?: { name: string; email: string };
  onDelete: (id: string) => void;
  onDuplicate?: (id: string) => void;
  onShare?: (id: string) => void;
}

export default function DocumentCard({
  id,
  title,
  content,
  createdAt,
  updatedAt,
  collaborators = [],
  isShared = false,
  role,
  owner,
  onDelete,
  onDuplicate,
  onShare
}: DocumentCardProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const handleDelete = () => {
    onDelete(id);
    setShowDeleteModal(false);
  };

  const handleDuplicate = () => {
    if (onDuplicate) {
      onDuplicate(id);
      setShowMenu(false);
    }
  };

  const handleShare = () => {
    if (onShare) {
      onShare(id);
      setShowMenu(false);
    }
  };

  /**
   * Strip HTML tags and decode entities from content for clean preview
   * Removes <p>, </p>, and other HTML tags that shouldn't display
   */
  const stripHtmlTags = (html: string): string => {
    // Remove HTML tags
    const withoutTags = html.replace(/<[^>]*>/g, ' ');
    // Decode HTML entities
    const textarea = document.createElement('textarea');
    textarea.innerHTML = withoutTags;
    // Clean up extra whitespace
    return textarea.value.replace(/\s+/g, ' ').trim();
  };

  const truncateContent = (text: string, maxLength: number = 120) => {
    // First strip HTML tags
    const cleanText = stripHtmlTags(text);
    if (cleanText.length <= maxLength) return cleanText;
    return cleanText.slice(0, maxLength) + '...';
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-all group">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <Link href={`/document/${id}`} className="block group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 line-clamp-2">
                {title}
              </h3>
            </Link>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {isShared && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs rounded-full font-medium">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Shared
                </span>
              )}
              {role && role !== 'owner' && (
                <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-full font-medium ${
                  role === 'editor'
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                    : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                }`}>
                  {role === 'editor' ? (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Can Edit
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      View Only
                    </>
                  )}
                </span>
              )}
            </div>
            {owner && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Owner: {owner.name || owner.email}
              </p>
            )}
          </div>

          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {showMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                  <Link
                    href={`/document/${id}`}
                    className="block px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-t-lg"
                  >
                    Open
                  </Link>
                  <button
                    onClick={handleDuplicate}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={handleShare}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Share
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700" />
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowDeleteModal(true);
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-b-lg"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4 line-clamp-3">
          {truncateContent(content)}
        </p>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {collaborators.length > 0 && (
              <div className="flex -space-x-2">
                {collaborators.slice(0, 3).map((collab, idx) => (
                  <div
                    key={idx}
                    className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold border-2 border-white dark:border-gray-800"
                    title={collab.name}
                  >
                    {collab.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {collaborators.length > 3 && (
                  <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center text-gray-700 dark:text-gray-300 text-xs font-bold border-2 border-white dark:border-gray-800">
                    +{collaborators.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400">
            Updated {new Date(updatedAt).toLocaleDateString()}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Delete Document</h3>
            </div>
            
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete "<strong>{title}</strong>"? This action cannot be undone.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
