/**
 * Document Settings Modal Component
 * 
 * Comprehensive document settings similar to Google Docs:
 * - Document Info (title, owner, dates)
 * - Access & Permissions (visibility, permissions, chat)
 * - Editor Preferences (font, size, page width, spell check)
 * - Document Actions (rename, download, copy, trash, restore)
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Info, Shield, Settings, Trash2, Download, Copy, RotateCcw } from 'lucide-react';
import { Editor } from '@tiptap/react';
import Dropdown from '@/app/components/Dropdown';

interface DocumentSettingsProps {
  documentId: string;
  isOwner: boolean;
  isEditor: boolean;
  onClose: () => void;
  currentTitle: string;
  onTitleChange: (title: string) => void;
  editor?: Editor | null;
  onSettingsUpdate?: (settings: {
    defaultFont: string;
    defaultFontSize: string;
    pageWidth: 'normal' | 'wide';
    spellCheck: boolean;
  }) => void;
}

interface DocumentInfo {
  title: string;
  owner: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  visibility: 'restricted' | 'public';
  publicPermission: 'viewer' | 'editor';
  chatEnabled: boolean;
  defaultFont: string;
  defaultFontSize: string;
  pageWidth: 'normal' | 'wide';
  spellCheck: boolean;
  isArchived: boolean;
  collaboratorCount: number;
}

export default function DocumentSettings({
  documentId,
  isOwner,
  isEditor,
  onClose,
  currentTitle,
  onTitleChange,
  editor,
  onSettingsUpdate
}: DocumentSettingsProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'access' | 'preferences' | 'actions'>('info');
  const [documentInfo, setDocumentInfo] = useState<DocumentInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showTrashConfirm, setShowTrashConfirm] = useState(false);

  // Form state - staged changes
  const [visibility, setVisibility] = useState<'restricted' | 'public'>('restricted');
  const [publicPermission, setPublicPermission] = useState<'viewer' | 'editor'>('viewer');
  const [chatEnabled, setChatEnabled] = useState(true);
  const [defaultFont, setDefaultFont] = useState('Arial');
  const [defaultFontSize, setDefaultFontSize] = useState('14');
  const [pageWidth, setPageWidth] = useState<'normal' | 'wide'>('normal');
  const [spellCheck, setSpellCheck] = useState(true);

  // Track if settings have been changed from original
  useEffect(() => {
    if (!documentInfo) return;
    
    const changed = 
      visibility !== documentInfo.visibility ||
      publicPermission !== documentInfo.publicPermission ||
      chatEnabled !== documentInfo.chatEnabled ||
      defaultFont !== documentInfo.defaultFont ||
      defaultFontSize !== documentInfo.defaultFontSize ||
      pageWidth !== documentInfo.pageWidth ||
      spellCheck !== documentInfo.spellCheck;
    
    setHasChanges(changed);
  }, [visibility, publicPermission, chatEnabled, defaultFont, defaultFontSize, pageWidth, spellCheck, documentInfo]);

  /**
   * Fetch document settings on mount
   */
  useEffect(() => {
    fetchDocumentSettings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  /**
   * Fetch document settings from API
   */
  const fetchDocumentSettings = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/documents/${documentId}/settings`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('API Error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch document settings');
      }

      const data = await response.json();
      console.log('Document settings loaded:', data);
      setDocumentInfo(data);
      
      // Populate form state
      setVisibility(data.visibility);
      setPublicPermission(data.publicPermission);
      setChatEnabled(data.chatEnabled);
      setDefaultFont(data.defaultFont);
      setDefaultFontSize(data.defaultFontSize);
      setPageWidth(data.pageWidth);
      setSpellCheck(data.spellCheck);
    } catch (error) {
      console.error('Error fetching document settings:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Update document settings
   */
  const updateSettings = async (settings: Partial<DocumentInfo>) => {
    if (!isOwner && !isEditor) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/documents/${documentId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const updated = await response.json();
      setDocumentInfo(updated);
    } catch (error) {
      console.error('Error updating settings:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Save all staged changes
   */
  const handleSaveChanges = async () => {
    if (!hasChanges || !isOwner) return;

    try {
      setSaving(true);
      const response = await fetch(`/api/documents/${documentId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visibility,
          publicPermission,
          chatEnabled,
          defaultFont,
          defaultFontSize,
          pageWidth,
          spellCheck,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }

      const updated = await response.json();
      setDocumentInfo(updated);
      setHasChanges(false);
      
      // Notify parent component about settings update
      if (onSettingsUpdate) {
        onSettingsUpdate({
          defaultFont,
          defaultFontSize,
          pageWidth,
          spellCheck,
        });
      }
      
      console.log('✅ Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Handle download document
   */
  const handleDownload = async (format: 'html' | 'txt') => {
    if (!editor) return;

    try {
      let content: string;
      let mimeType: string;
      let extension: string;

      if (format === 'html') {
        content = editor.getHTML();
        mimeType = 'text/html';
        extension = 'html';
      } else {
        content = editor.getText();
        mimeType = 'text/plain';
        extension = 'txt';
      }

      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentTitle}.${extension}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  /**
   * Handle document copy
   */
  const handleMakeCopy = async () => {
    if (!editor) return;

    try {
      const content = editor.getHTML();
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `${currentTitle} (Copy)`,
          content,
        }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        window.location.href = `/document/${newDoc.id}`;
      }
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  /**
   * Handle move to trash
   */
  const handleMoveToTrash = async () => {
    if (!isOwner) return;

    if (showTrashConfirm) {
      // User confirmed - proceed with deletion
      setShowTrashConfirm(false);
      try {
        const response = await fetch(`/api/documents/${documentId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          window.location.href = '/dashboard';
        }
      } catch (error) {
        console.error('Delete failed:', error);
      }
    } else {
      // First click - show confirmation
      setShowTrashConfirm(true);
    }
  };

  /**
   * Handle restore document
   */
  const handleRestore = async () => {
    if (!isOwner) return;

    try {
      await updateSettings({ isArchived: false });
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  /**
   * Format date for display
   */
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  if (!documentInfo) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Document Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700 px-6">
          <button
            onClick={() => setActiveTab('info')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Info className="w-4 h-4 inline mr-2" />
            Document Info
          </button>
          <button
            onClick={() => setActiveTab('access')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'access'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Shield className="w-4 h-4 inline mr-2" />
            Access & Permissions
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'preferences'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Editor Preferences
          </button>
          <button
            onClick={() => setActiveTab('actions')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'actions'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <Trash2 className="w-4 h-4 inline mr-2" />
            Actions
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Document Info Tab */}
          {activeTab === 'info' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Document Title
                </label>
                <input
                  type="text"
                  value={currentTitle}
                  onChange={(e) => onTitleChange(e.target.value)}
                  disabled={!isOwner && !isEditor}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Owner
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white">{documentInfo.owner.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{documentInfo.owner.email}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Created
                  </label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(documentInfo.createdAt)}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Modified
                  </label>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white">{formatDate(documentInfo.updatedAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Access & Permissions Tab */}
          {activeTab === 'access' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Visibility
                </label>
                <Dropdown
                  value={visibility}
                  onChange={(val) => setVisibility(val as 'restricted' | 'public')}
                  options={[
                    { value: 'restricted', label: 'Restricted - Only people with access can open' },
                    { value: 'public', label: 'Anyone with the link' }
                  ]}
                  disabled={!isOwner}
                />
              </div>

              {visibility === 'public' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    General Access Permission
                  </label>
                  <Dropdown
                    value={publicPermission}
                    onChange={(val) => setPublicPermission(val as 'viewer' | 'editor')}
                    options={[
                      { value: 'viewer', label: 'Viewer - Can view only' },
                      { value: 'editor', label: 'Editor - Can edit' }
                    ]}
                    disabled={!isOwner}
                  />
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Enable Document Chat</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Allow collaborators to chat in this document</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatEnabled}
                    onChange={(e) => {
                      setChatEnabled(e.target.checked);
                    }}
                    disabled={!isOwner}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  People with Access
                </label>
                <div className="px-4 py-2 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-900 dark:text-white">
                    {documentInfo.collaboratorCount + 1} people (including owner)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Editor Preferences Tab */}
          {activeTab === 'preferences' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Font Family
                </label>
                <Dropdown
                  value={defaultFont}
                  onChange={setDefaultFont}
                  options={[
                    { value: 'Arial', label: 'Arial' },
                    { value: 'Times New Roman', label: 'Times New Roman' },
                    { value: 'Courier New', label: 'Courier New' },
                    { value: 'Georgia', label: 'Georgia' },
                    { value: 'Verdana', label: 'Verdana' },
                    { value: 'Comic Sans MS', label: 'Comic Sans MS' },
                    { value: 'Impact', label: 'Impact' }
                  ]}
                  disabled={!isOwner}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Default Font Size
                </label>
                <Dropdown
                  value={defaultFontSize}
                  onChange={setDefaultFontSize}
                  options={['10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36'].map(size => ({
                    value: size,
                    label: `${size}px`
                  }))}
                  disabled={!isOwner}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Page Width
                </label>
                <Dropdown
                  value={pageWidth}
                  onChange={(val) => setPageWidth(val as 'normal' | 'wide')}
                  options={[
                    { value: 'normal', label: 'Normal (800px)' },
                    { value: 'wide', label: 'Wide (1200px)' }
                  ]}
                  disabled={!isOwner}
                />
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Spell Check</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Check spelling while typing</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={spellCheck}
                    onChange={(e) => {
                      setSpellCheck(e.target.checked);
                    }}
                    disabled={!isOwner}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600 peer-disabled:opacity-50 peer-disabled:cursor-not-allowed"></div>
                </label>
              </div>

              {!isOwner && (
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <p className="text-sm text-yellow-800 dark:text-yellow-200">
                    Only the document owner can change editor preferences.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions Tab */}
          {activeTab === 'actions' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <button
                  onClick={() => handleDownload('html')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Download as HTML</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Save document as HTML file</p>
                  </div>
                </button>

                <button
                  onClick={() => handleDownload('txt')}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left flex items-center gap-3"
                >
                  <Download className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Download as Text</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Save document as plain text</p>
                  </div>
                </button>

                <button
                  onClick={handleMakeCopy}
                  disabled={!editor}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Copy className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Make a Copy</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create a duplicate of this document</p>
                  </div>
                </button>
              </div>

              <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                {!documentInfo.isArchived ? (
                  <button
                    onClick={handleMoveToTrash}
                    disabled={!isOwner}
                    className={`w-full px-4 py-3 border rounded-lg transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed ${
                      showTrashConfirm
                        ? 'bg-red-100 dark:bg-red-900/40 border-red-300 dark:border-red-700'
                        : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30'
                    }`}
                  >
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div>
                      <p className="font-medium text-red-700 dark:text-red-300">
                        {showTrashConfirm ? 'Click again to confirm' : 'Move to Trash'}
                      </p>
                      <p className="text-sm text-red-600 dark:text-red-400">
                        {showTrashConfirm ? 'This action cannot be undone' : 'Delete this document'}
                      </p>
                    </div>
                  </button>
                ) : (
                  <button
                    onClick={handleRestore}
                    disabled={!isOwner}
                    className="w-full px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors text-left flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <RotateCcw className="w-5 h-5 text-green-600 dark:text-green-400" />
                    <div>
                      <p className="font-medium text-green-700 dark:text-green-300">Restore Document</p>
                      <p className="text-sm text-green-600 dark:text-green-400">Move document back from trash</p>
                    </div>
                  </button>
                )}

                {!isOwner && (
                  <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <p className="text-sm text-yellow-800 dark:text-yellow-200">
                      Only the document owner can delete or restore this document.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer with Save Button */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-between">
          {hasChanges ? (
            <>
              <p className="text-sm text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                You have unsaved changes
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Reset form to original values
                    if (documentInfo) {
                      setVisibility(documentInfo.visibility);
                      setPublicPermission(documentInfo.publicPermission);
                      setChatEnabled(documentInfo.chatEnabled);
                      setDefaultFont(documentInfo.defaultFont);
                      setDefaultFontSize(documentInfo.defaultFontSize);
                      setPageWidth(documentInfo.pageWidth);
                      setSpellCheck(documentInfo.spellCheck);
                      setHasChanges(false);
                    }
                  }}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveChanges}
                  disabled={saving || !isOwner}
                  className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-gray-600 dark:text-gray-400">All changes saved</p>
          )}
        </div>
      </div>
    </div>
  );
}
