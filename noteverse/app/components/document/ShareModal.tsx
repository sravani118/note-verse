'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Link2, Check, Globe, Lock, ChevronDown } from 'lucide-react';
import toast from 'react-hot-toast';
import Dropdown from '@/app/components/Dropdown';

interface Collaborator {
  _id: string;
  sharedWithEmail: string;
  permission: 'owner' | 'editor' | 'viewer';
  sharedWith?: {
    name?: string;
    email?: string;
  };
}

interface ShareModalProps {
  documentId: string;
  documentTitle?: string;
  isOwner: boolean;
  onClose: () => void;
  currentUserEmail: string;
  ownerEmail: string;
  visibility?: 'restricted' | 'public';
  publicPermission?: 'viewer' | 'editor';
}

export default function ShareModal({
  documentId,
  documentTitle = 'Untitled Document',
  isOwner,
  onClose,
  ownerEmail,
  visibility = 'restricted',
  publicPermission = 'viewer'
}: ShareModalProps) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'editor' | 'viewer'>('viewer');
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [generalAccess, setGeneralAccess] = useState<'restricted' | 'public'>(visibility);
  const [generalPermission, setGeneralPermission] = useState<'viewer' | 'editor'>(publicPermission);
  const [showGeneralDropdown, setShowGeneralDropdown] = useState(false);

  const loadCollaborators = useCallback(async () => {
    try {
      const response = await fetch(`/api/documents/${documentId}/share`);
      if (response.ok) {
        const data = await response.json();
        setCollaborators(data.collaborators || []);
      }
    } catch (error) {
      console.error('Failed to load collaborators:', error);
    }
  }, [documentId]);

  useEffect(() => {
    loadCollaborators();
  }, [loadCollaborators]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showGeneralDropdown) {
        setShowGeneralDropdown(false);
      }
    };

    if (showGeneralDropdown) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showGeneralDropdown]);

  const handleInvite = async () => {
    if (!email.trim() || !isOwner) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), permission }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmail('');
        setPermission('viewer');
        await loadCollaborators();
        toast.success('Collaborator added successfully');
      } else {
        toast.error(data.error || data.message || 'Failed to share document');
      }
    } catch (error) {
      console.error('Failed to share:', error);
      toast.error('Failed to share document');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePermission = async (shareId: string, newPermission: string) => {
    if (!isOwner) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/share/${shareId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permission: newPermission }),
      });

      if (response.ok) {
        await loadCollaborators();
        toast.success('Permission updated');
      } else {
        toast.error('Failed to update permission');
      }
    } catch (error) {
      console.error('Failed to update permission:', error);
      toast.error('Failed to update permission');
    }
  };

  const handleRemoveCollaborator = async (shareId: string) => {
    if (!isOwner) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/share/${shareId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await loadCollaborators();
        toast.success('Collaborator removed');
      } else {
        toast.error('Failed to remove collaborator');
      }
    } catch (error) {
      console.error('Failed to remove collaborator:', error);
      toast.error('Failed to remove collaborator');
    }
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/document/${documentId}`;
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success('Link copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUpdateGeneralAccess = async (newVisibility: 'restricted' | 'public', newPermission?: 'viewer' | 'editor') => {
    if (!isOwner) return;

    try {
      const response = await fetch(`/api/documents/${documentId}/access`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility: newVisibility,
          publicPermission: newPermission || generalPermission
        }),
      });

      if (response.ok) {
        setGeneralAccess(newVisibility);
        if (newPermission) setGeneralPermission(newPermission);
        setShowGeneralDropdown(false);
        toast.success(
          newVisibility === 'public' 
            ? 'Anyone with the link can now access' 
            : 'Access restricted to invited people'
        );
      } else {
        toast.error('Failed to update access settings');
      }
    } catch (error) {
      console.error('Failed to update general access:', error);
      toast.error('Failed to update access settings');
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return email ? email[0].toUpperCase() : '?';
  };

  const getAvatarColor = (email: string) => {
    const colors = [
      'bg-blue-500',
      'bg-green-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-orange-500',
      'bg-teal-500',
    ];
    const index = email.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Share: {documentTitle}
            </h2>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

        <div className="overflow-y-auto max-h-[calc(90vh-80px)]">
          {/* Add people section */}
          {isOwner && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Add people, groups"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                  disabled={loading}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                           bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                           focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                           disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <Dropdown
                  value={permission}
                  onChange={(val) => setPermission(val as 'editor' | 'viewer')}
                  options={[
                    { value: 'viewer', label: 'Viewer' },
                    { value: 'editor', label: 'Editor' }
                  ]}
                  disabled={loading}
                  className="w-40"
                />
                <button
                  onClick={handleInvite}
                  disabled={!email.trim() || loading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg
                           disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* People with access */}
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              People with access
            </h3>
            <div className="space-y-2">
              {/* Owner */}
              <div className="flex items-center gap-3 py-2">
                <div className={`w-10 h-10 rounded-full ${getAvatarColor(ownerEmail)} flex items-center justify-center text-white font-semibold`}>
                  {getInitials(undefined, ownerEmail)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {ownerEmail}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Owner</div>
                </div>
              </div>

              {/* Collaborators */}
              {collaborators.map((collab) => (
                <div key={collab._id} className="flex items-center gap-3 py-2 group">
                  <div className={`w-10 h-10 rounded-full ${getAvatarColor(collab.sharedWithEmail)} flex items-center justify-center text-white font-semibold`}>
                    {getInitials(collab.sharedWith?.name, collab.sharedWithEmail)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {collab.sharedWith?.name || collab.sharedWithEmail}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {collab.sharedWithEmail}
                    </div>
                  </div>
                  {isOwner && collab.permission !== 'owner' ? (
                    <div className="flex items-center gap-1">
                      <Dropdown
                        value={collab.permission}
                        onChange={(val) => handleUpdatePermission(collab._id, val)}
                        options={[
                          { value: 'viewer', label: 'Viewer' },
                          { value: 'editor', label: 'Editor' }
                        ]}
                        className="w-32 text-sm"
                      />
                      <button
                        onClick={() => handleRemoveCollaborator(collab._id)}
                        className="px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <div className="px-2 py-1 text-sm text-gray-600 dark:text-gray-400 capitalize">
                      {collab.permission}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* General access */}
          {isOwner && (
            <div className="px-6 py-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                General access
              </h3>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  {generalAccess === 'public' ? (
                    <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="relative">
                    <button
                      onClick={() => setShowGeneralDropdown(!showGeneralDropdown)}
                      className="w-full flex items-center justify-between px-3 py-2 text-sm text-left
                               border border-gray-300 dark:border-gray-600 rounded-lg
                               bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                               hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                      <div>
                        <div className="font-medium">
                          {generalAccess === 'public' ? 'Anyone with the link' : 'Restricted'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {generalAccess === 'public' 
                            ? 'Anyone on the internet with the link can view'
                            : 'Only people with access can open'
                          }
                        </div>
                      </div>
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    </button>

                    {showGeneralDropdown && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 
                                    border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg z-10">
                        <button
                          onClick={() => handleUpdateGeneralAccess('restricted')}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 
                                   flex items-start gap-3 transition-colors"
                        >
                          <Lock className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Restricted
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Only people with access can open
                            </div>
                          </div>
                        </button>
                        <button
                          onClick={() => handleUpdateGeneralAccess('public')}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-600 
                                   flex items-start gap-3 border-t border-gray-200 dark:border-gray-600 transition-colors"
                        >
                          <Globe className="w-5 h-5 text-gray-600 dark:text-gray-400 mt-0.5" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              Anyone with the link
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Anyone on the internet with the link can view
                            </div>
                          </div>
                        </button>
                      </div>
                    )}
                  </div>

                  {generalAccess === 'public' && (
                    <div className="mt-2">
                      <Dropdown
                        value={generalPermission}
                        onChange={(val) => handleUpdateGeneralAccess('public', val as 'viewer' | 'editor')}
                        options={[
                          { value: 'viewer', label: 'Viewer' },
                          { value: 'editor', label: 'Editor' }
                        ]}
                        className="text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Copy link section */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleCopyLink}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 
                       border border-gray-300 dark:border-gray-600 rounded-lg
                       bg-white dark:bg-gray-700 text-gray-900 dark:text-white
                       hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium">Link copied</span>
                </>
              ) : (
                <>
                  <Link2 className="w-4 h-4" />
                  <span className="text-sm font-medium">Copy link</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
