/**
 * Document Header Component
 * 
 * Top header bar with:
 * - Editable document title
 * - Save status indicator
 * - Active collaborators avatars
 * - Share button
 * - More options menu
 */

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import ThemeToggle from '../ThemeToggle';
import { Bell, Check, X as XIcon } from 'lucide-react';

interface User {
  id: string;
  name: string;
  email: string;
  cursorColor: string;
}

interface AccessRequest {
  _id: string;
  requesterEmail: string;
  requesterName: string;
  createdAt: string;
}

interface DocumentHeaderProps {
  title: string;
  onTitleChange: (title: string) => void;
  saveStatus: 'saved' | 'saving' | 'unsaved';
  activeUsers: User[];
  onShare?: () => void;
  onOpenSettings?: () => void;
  documentId?: string;
  editor?: any;
  isViewOnly?: boolean;
  userPermission?: 'viewer' | 'editor' | 'owner' | null;
  onRequestAccess?: () => void;
}

export default function DocumentHeader({
  title,
  onTitleChange,
  saveStatus,
  activeUsers,
  onShare,
  onOpenSettings,
  documentId,
  editor,
  isViewOnly = false,
  userPermission = null,
  onRequestAccess
}: DocumentHeaderProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const [showMenu, setShowMenu] = useState(false);
  const [showAccessRequests, setShowAccessRequests] = useState(false);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);

  // Sync local title with prop when it changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  // Load access requests for owners
  useEffect(() => {
    if (userPermission === 'owner' && documentId) {
      loadAccessRequests();
    }
  }, [userPermission, documentId]);

  const loadAccessRequests = async () => {
    if (!documentId) return;
    
    try {
      const response = await fetch(`/api/documents/${documentId}/access-request`);
      if (response.ok) {
        const data = await response.json();
        setAccessRequests(data.requests || []);
      }
    } catch (error) {
      console.error('Error loading access requests:', error);
    }
  };

  const handleAccessRequest = async (requestId: string, action: 'approve' | 'reject') => {
    setLoadingRequests(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/access-request/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        // Reload requests
        await loadAccessRequests();
      } else {
        toast.error(data.error || 'Failed to process request');
      }
    } catch (error) {
      console.error('Error processing access request:', error);
      toast.error('Failed to process request');
    } finally {
      setLoadingRequests(false);
    }
  };

  // Sync local title with prop when it changes
  useEffect(() => {
    setLocalTitle(title);
  }, [title]);

  const handleTitleSubmit = () => {
    setIsEditingTitle(false);
    if (!isViewOnly && localTitle.trim() !== title) {
      onTitleChange(localTitle.trim() || 'Untitled Document');
    }
  };

  const getSaveStatusText = () => {
    switch (saveStatus) {
      case 'saving':
        return 'Saving…';
      case 'saved':
        return 'Saved';
      case 'unsaved':
        return 'Unsaved changes';
      default:
        return '';
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

  /**
   * Download document as HTML
   */
  const handleDownload = () => {
    if (!editor) {
      toast.error('Editor not ready');
      return;
    }

    try {
      const html = editor.getHTML();
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowMenu(false);
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  /**
   * Make a copy of the document
   */
  const handleMakeCopy = async () => {
    if (!documentId || !editor) {
      toast.error('Cannot copy document at this time');
      return;
    }

    try {
      const content = editor.getHTML();
      
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${title} (Copy)`,
          content: content
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create copy');
      }

      const data = await response.json();
      
      // Redirect to the new document
      window.location.href = `/document/${data.document._id}`;
    } catch (error) {
      console.error('Make copy failed:', error);
      toast.error('Failed to make a copy of the document');
    }
    setShowMenu(false);
  };

  /**
   * Move document to trash
   */
  const handleMoveToTrash = async () => {
    if (!documentId) {
      toast.error('Cannot move document to trash at this time');
      return;
    }

    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete document');
      }

      toast.success('Document moved to trash');
      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to move document to trash');
    }
    setShowMenu(false);
  };

  return (
    <header className="sticky top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 dark:bg-gray-800 dark:border-gray-700 h-14">
      <div className="flex items-center justify-between h-full px-4">
        {/* Left: Title and Status */}
        <div className="flex items-center gap-4">
          {/* Back to Dashboard */}
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
            title="Back to Dashboard"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>

          {/* Document Title */}
          <div>
            {isEditingTitle && !isViewOnly ? (
              <input
                type="text"
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setLocalTitle(title);
                    setIsEditingTitle(false);
                  }
                }}
                className="text-lg font-semibold bg-transparent border-b-2 border-indigo-600 focus:outline-none text-gray-900 dark:text-white px-1"
                autoFocus
              />
            ) : (
              <h1
                onClick={() => !isViewOnly && setIsEditingTitle(true)}
                className={`text-lg font-semibold text-gray-900 dark:text-white px-2 py-1 rounded transition-colors ${
                  isViewOnly ? 'cursor-default' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                title={isViewOnly ? 'Viewing document' : 'Click to edit title'}
              >
                {title}
              </h1>
            )}
            
            {/* Save Status / View-only indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 px-2">
              {isViewOnly ? (
                <>
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <span>Viewing</span>
                </>
              ) : (
                <>
                  {saveStatus === 'saving' && (
                    <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-500"></div>
                  )}
                  {saveStatus === 'saved' && (
                    <svg className="w-3 h-3 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{getSaveStatusText()}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Collaborators and Actions */}
        <div className="flex items-center gap-4">
          {/* Access Requests Notification for Owners */}
          {userPermission === 'owner' && accessRequests.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowAccessRequests(!showAccessRequests)}
                className="relative p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                title="Access requests"
              >
                <Bell className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                {accessRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {accessRequests.length}
                  </span>
                )}
              </button>

              {/* Access Requests Dropdown */}
              {showAccessRequests && (
                <div className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50">
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Edit Access Requests ({accessRequests.length})
                    </h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {accessRequests.map((request) => (
                      <div 
                        key={request._id}
                        className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {request.requesterName}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              {request.requesterEmail}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                              {new Date(request.createdAt).toLocaleString()}
                            </p>
                          </div>
                          <div className="flex gap-2 ml-3">
                            <button
                              onClick={() => handleAccessRequest(request._id, 'approve')}
                              disabled={loadingRequests}
                              className="p-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-400 rounded-md transition-colors disabled:opacity-50"
                              title="Approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleAccessRequest(request._id, 'reject')}
                              disabled={loadingRequests}
                              className="p-1.5 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 rounded-md transition-colors disabled:opacity-50"
                              title="Reject"
                            >
                              <XIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Request edit access button for viewers */}
          {userPermission === 'viewer' && onRequestAccess && (
            <button
              onClick={onRequestAccess}
              className="px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors"
            >
              Request edit access
            </button>
          )}
          
          {/* Active Collaborators - Circular avatars */}
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {activeUsers.slice(0, 5).map((user) => (
                <div
                  key={user.id}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold border-2 border-white dark:border-gray-800 shadow-sm"
                  style={{ backgroundColor: user.cursorColor }}
                  title={user.name}
                >
                  {getInitials(user.name)}
                </div>
              ))}
              {activeUsers.length > 5 && (
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs font-semibold border-2 border-white dark:border-gray-800 shadow-sm"
                  title={`${activeUsers.length - 5} more users`}
                >
                  +{activeUsers.length - 5}
                </div>
              )}
            </div>
            {activeUsers.length > 0 && (
              <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                {activeUsers.length + 1} online
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Share Button */}
          <button
            onClick={onShare}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>Share</span>
          </button>

          {/* More Options Menu */}
          <div className="relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="More options"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowMenu(false)}
                ></div>
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                  <button 
                    onClick={handleDownload}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download
                  </button>
                  <button 
                    onClick={handleMakeCopy}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Make a copy
                  </button>
                  <button 
                    onClick={() => {
                      setShowMenu(false);
                      if (onOpenSettings) onOpenSettings();
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Document settings
                  </button>
                  <hr className="my-1 border-gray-200 dark:border-gray-700" />
                  <button 
                    onClick={handleMoveToTrash}
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Move to trash
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
