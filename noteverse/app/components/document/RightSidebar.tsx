/**
 * Right Sidebar Component
 * 
 * Collapsible sidebar with tabs:
 * - Comments: View and add comments
 * - History: Document version history with restore functionality
 * - Users: Active collaborators list
 */

'use client';

import { useState, useEffect } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface Comment {
  id: string;
  user: User;
  text: string;
  timestamp: Date;
}

interface Version {
  id: string;
  versionNumber: number;
  title: string;
  content: string;
  changeType: 'auto' | 'manual' | 'restore';
  description?: string;
  wordCount: number;
  characterCount: number;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
  };
}

interface RightSidebarProps {
  documentId: string;
  activeUsers: User[];
  comments?: Comment[];
  onAddComment?: (text: string) => void;
  onRestoreVersion?: (content: string, title: string) => void;
}

export default function RightSidebar({
  documentId,
  activeUsers,
  comments = [],
  onAddComment,
  onRestoreVersion
}: RightSidebarProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'comments' | 'history' | 'users'>('users');
  const [commentText, setCommentText] = useState('');
  const [versions, setVersions] = useState<Version[]>([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState<string | null>(null);

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Fetch version history
  useEffect(() => {
    if (activeTab === 'history' && documentId) {
      fetchVersions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, documentId]);

  const fetchVersions = async () => {
    setLoadingVersions(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/versions`);
      if (response.ok) {
        const data = await response.json();
        setVersions(data.versions || []);
      } else {
        // Silently handle error - versions may not exist yet
        setVersions([]);
      }
    } catch {
      // Silently handle error - versions may not exist yet
      setVersions([]);
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleAddComment = () => {
    if (commentText.trim() && onAddComment) {
      onAddComment(commentText.trim());
      setCommentText('');
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    if (!confirm(`Are you sure you want to restore to this version? Current changes will be backed up.`)) {
      return;
    }

    setRestoringVersion(versionId);
    try {
      const response = await fetch(
        `/api/documents/${documentId}/versions/${versionId}/restore`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }
      );

      if (response.ok) {
        const data = await response.json();
        
        // Notify parent component to update editor content
        if (onRestoreVersion) {
          onRestoreVersion(data.restoredContent.content, data.restoredContent.title);
        }

        // Refresh version list
        await fetchVersions();

        alert('Document restored successfully! All collaborators will see the updated content.');
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Failed to restore version: ${error.error}`);
      }
    } catch {
      // Silently handle error
      alert('Failed to restore version. Please try again.');
    } finally {
      setRestoringVersion(null);
    }
  };

  const formatRelativeTime = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

  return (
    <>
      {/* Toggle Button (when closed) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed right-0 top-1/2 -translate-y-1/2 bg-white dark:bg-gray-800 border-l border-t border-b border-gray-200 dark:border-gray-700 rounded-l-lg p-2 shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors z-40"
          title="Open sidebar"
        >
          <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed right-0 w-80 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-lg transform transition-transform duration-300 ease-in-out z-30
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ top: '104px', bottom: 0 }}
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
              onClick={() => setActiveTab('comments')}
              className={`px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                activeTab === 'comments'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Comments
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                activeTab === 'history'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              History
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`px-3 py-1 text-sm font-medium rounded transition-colors ${
                activeTab === 'users'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              Users
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto h-[calc(100vh-170px)]">
          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div className="p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <p className="text-sm">No comments yet</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: comment.user.cursorColor }}
                    >
                      {comment.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.user.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatRelativeTime(comment.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">{comment.text}</p>
                    </div>
                  </div>
                ))
              )}

              {/* Add Comment */}
              <div className="sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-200 dark:border-gray-700 -mx-4 px-4 pb-4">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add comment..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  rows={3}
                />
                <button
                  onClick={handleAddComment}
                  disabled={!commentText.trim()}
                  className="mt-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Add Comment
                </button>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="p-4 space-y-4">
              {loadingVersions ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Loading versions...</p>
                </div>
              ) : versions.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm">No version history yet</p>
                  <p className="text-xs mt-1">Versions are auto-saved every 5 minutes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {versions.map((version, index) => (
                    <div 
                      key={version.id} 
                      className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors"
                    >
                      {/* Version Header */}
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                              v{version.versionNumber}
                            </span>
                            {index === 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                                Current
                              </span>
                            )}
                            {version.changeType === 'manual' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                Manual
                              </span>
                            )}
                            {version.changeType === 'restore' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                Restored
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 dark:text-gray-400">
                            {formatRelativeTime(new Date(version.createdAt))}
                          </p>
                        </div>
                      </div>

                      {/* Author Info */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {version.author.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm text-gray-700 dark:text-gray-300">
                          {version.author.name}
                        </span>
                      </div>

                      {/* Description */}
                      {version.description && (
                        <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 italic">
                          {version.description}
                        </p>
                      )}

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <span>{version.wordCount} words</span>
                        <span>•</span>
                        <span>{version.characterCount} chars</span>
                      </div>

                      {/* Restore Button */}
                      {index !== 0 && (
                        <button
                          onClick={() => handleRestoreVersion(version.id)}
                          disabled={restoringVersion === version.id}
                          className="w-full mt-2 px-3 py-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 border border-indigo-600 dark:border-indigo-400 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {restoringVersion === version.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Restoring...
                            </span>
                          ) : (
                            'Restore This Version'
                          )}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                Active Now ({activeUsers.length})
              </h3>
              {activeUsers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <p className="text-sm">No active users</p>
                </div>
              ) : (
                activeUsers.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: user.cursorColor }}
                      title={user.email}
                    >
                      {getInitials(user.name)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-gray-900 dark:text-white">
                        {user.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Online</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </aside>
    </>
  );
}