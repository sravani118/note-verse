'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import toast from 'react-hot-toast';
import DocumentCard from '../components/dashboard/DocumentCard';
import DocumentSkeleton from '../components/dashboard/DocumentSkeleton';
import EmptyState from '../components/dashboard/EmptyState';
import SearchBar from '../components/dashboard/SearchBar';
import ViewToggle from '../components/dashboard/ViewToggle';
import ShareModal from '../components/document/ShareModal';

interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  collaborators?: Array<{ name: string; avatar?: string }>;
  isShared?: boolean;
  role?: string; // 'editor' or 'viewer'
  owner?: { name: string; email: string };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  
  // Document management state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [sharedDocuments, setSharedDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'my-docs' | 'shared'>('my-docs');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareDocumentId, setShareDocumentId] = useState<string>('');
  const [shareDocumentTitle, setShareDocumentTitle] = useState<string>('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    
    // Fetch documents when authenticated
    if (status === 'authenticated') {
      fetchDocuments();
    }
  }, [status, router]);
  
  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
        setSharedDocuments(data.sharedDocuments || []);
      } else {
        console.error('Failed to fetch documents');
        setDocuments([]);
        setSharedDocuments([]);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setDocuments([]);
      setSharedDocuments([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    };

    if (showProfileMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileMenu]);
  
  const handleCreateDocument = () => {
    // Generate a unique document ID
    const newDocId = 'doc-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
    // Navigate to new document editor
    router.push(`/document/${newDocId}`);
  };
  
  const handleDeleteDocument = async (id: string) => {
    try {
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Remove from local state
        setDocuments(docs => docs.filter(doc => doc.id !== id));
        setSharedDocuments(docs => docs.filter(doc => doc.id !== id));
        toast.success('Document deleted successfully');
      } else {
        toast.error('Failed to delete document. You may not have permission.');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document. Please try again.');
    }
  };

  const handleDuplicateDocument = async (id: string) => {
    try {
      // Find the original document
      const originalDoc = documents.find(doc => doc.id === id) || sharedDocuments.find(doc => doc.id === id);
      if (!originalDoc) {
        toast.error('Document not found');
        return;
      }

      // Create a duplicate
      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: `${originalDoc.title} (Copy)`,
          content: originalDoc.content,
        }),
      });

      if (response.ok) {
        const newDoc = await response.json();
        // Add to local state
        setDocuments(docs => [newDoc, ...docs]);
        // Navigate to the new document
        router.push(`/document/${newDoc.id}`);
      } else {
        toast.error('Failed to duplicate document');
      }
    } catch (error) {
      console.error('Error duplicating document:', error);
      toast.error('Failed to duplicate document. Please try again.');
    }
  };

  const handleShareDocument = (id: string) => {
    // Find the document to get its title
    const doc = documents.find(d => d.id === id) || sharedDocuments.find(d => d.id === id);
    setShareDocumentId(id);
    setShareDocumentTitle(doc?.title || 'Untitled Document');
    setShareModalOpen(true);
  };
  
  const currentDocuments = activeTab === 'my-docs' ? documents : sharedDocuments;
  
  const filteredDocuments = currentDocuments.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-white">NoteVerse</span>
            </Link>

            <div className="flex items-center gap-4">
              <ThemeToggle />
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold hover:shadow-lg transition-all cursor-pointer"
                >
                  {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
                </button>

                {/* Profile Dropdown */}
                {showProfileMenu && (
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold">
                          {session.user?.name?.charAt(0).toUpperCase() || session.user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-white font-bold text-lg">{session.user?.name || 'User'}</h3>
                          <p className="text-indigo-100 text-sm">{session.user?.email}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <Link href="/profile" className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Edit Profile</span>
                      </Link>
                      <Link href="/profile" className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span className="text-gray-700 dark:text-gray-300 font-medium">Settings</span>
                      </Link>
                      <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                      <button
                        onClick={() => signOut({ callbackUrl: '/' })}
                        className="w-full text-left px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-3"
                      >
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span className="text-red-600 font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Welcome back, {session.user?.name || session.user?.email?.split('@')[0] || 'User'}! 👋
          </h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your notes and collaborate with your team</p>
        </div>

        {/* Stats Overview */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-1">Total Documents</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{documents.length}</p>
              </div>
              <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl border border-purple-100 dark:border-purple-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300 mb-1">Shared With Me</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{sharedDocuments.length}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 rounded-xl border border-blue-100 dark:border-blue-800 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Collaborators</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {new Set(documents.flatMap(d => d.collaborators?.map(c => c.name) || [])).size}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateDocument}
            className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 hover:from-indigo-700 hover:to-purple-700 transition-all group"
          >
            <div className="flex items-center justify-center flex-col gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <p className="text-white font-semibold">Create New Document</p>
            </div>
          </button>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            <div className="flex items-center gap-4 w-full lg:w-auto">
              {/* Tabs */}
              <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button
                  onClick={() => setActiveTab('my-docs')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'my-docs'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  My Documents ({documents.length})
                </button>
                <button
                  onClick={() => setActiveTab('shared')}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    activeTab === 'shared'
                      ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-400 shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  Shared With Me ({sharedDocuments.length})
                </button>
              </div>
            </div>

            <div className="flex items-center gap-4 w-full lg:w-auto">
              {/* Search */}
              <div className="flex-1 lg:w-80">
                <SearchBar value={searchQuery} onChange={setSearchQuery} />
              </div>

              {/* View Toggle */}
              <ViewToggle view={view} onChange={setView} />
            </div>
          </div>
        </div>

        {/* Documents Grid/List */}
        {loading ? (
          <div className={view === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <DocumentSkeleton key={i} />
            ))}
          </div>
        ) : filteredDocuments.length === 0 ? (
          searchQuery ? (
            <EmptyState
              title="No documents found"
              description={`No documents match your search "${searchQuery}". Try different keywords.`}
              actionLabel="Clear Search"
              onAction={() => setSearchQuery('')}
            />
          ) : (
            <EmptyState
              title={activeTab === 'my-docs' ? 'No documents yet' : 'No shared documents'}
              description={
                activeTab === 'my-docs'
                  ? 'Get started by creating your first document. Collaborate with your team in real-time.'
                  : 'Documents shared with you by your team will appear here.'
              }
              actionLabel={activeTab === 'my-docs' ? 'Create First Document' : undefined}
              onAction={activeTab === 'my-docs' ? handleCreateDocument : undefined}
            />
          )
        ) : (
          <div className={view === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
            {filteredDocuments.map((doc) => (
              <DocumentCard
                key={doc.id}
                {...doc}
                onDelete={handleDeleteDocument}
                onDuplicate={handleDuplicateDocument}
                onShare={handleShareDocument}
              />
            ))}
          </div>
        )}

        {/* Results Count */}
        {!loading && filteredDocuments.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-gray-600 dark:text-gray-400">
              Showing {filteredDocuments.length} of {currentDocuments.length} document{currentDocuments.length !== 1 ? 's' : ''}
              {searchQuery && ` matching "${searchQuery}"`}
            </p>
          </div>
        )}
      </main>

      {/* Share Modal */}
      {shareModalOpen && session?.user?.email && (
        <ShareModal
          documentId={shareDocumentId}
          documentTitle={shareDocumentTitle}
          isOwner={true}
          currentUserEmail={session.user.email}
          ownerEmail={session.user.email}
          onClose={() => setShareModalOpen(false)}
        />
      )}
    </div>
  );
}
