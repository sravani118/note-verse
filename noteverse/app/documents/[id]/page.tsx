/**
 * Document Editor Page
 * 
 * Example usage of the CollaborativeEditor component
 * This page demonstrates how to integrate real-time collaboration
 * into a document editing interface
 */

'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, useParams } from 'next/navigation';
import CollaborativeEditor from '@/app/components/editor/CollaborativeEditor';
import Link from 'next/link';

export default function DocumentEditorPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const documentId = params?.id as string;

  const [document, setDocument] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  // Fetch document details
  useEffect(() => {
    if (!documentId) return;

    const fetchDocument = async () => {
      try {
        // TODO: Replace with actual API call
        // const response = await fetch(`/api/documents/${documentId}`);
        // const data = await response.json();
        
        // Mock document for demo
        const mockDocument = {
          id: documentId,
          title: 'Untitled Document',
          content: '',
          owner: session?.user,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setDocument(mockDocument);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching document:', error);
        setLoading(false);
      }
    };

    fetchDocument();
  }, [documentId, session]);

  /**
   * Handle content changes from collaborative editor
   * Save to database with debouncing
   */
  const handleContentChange = async (content: string) => {
    setSaveStatus('unsaved');

    // Debounce saving to database
    // In production, implement proper debouncing
    setTimeout(async () => {
      try {
        setSaveStatus('saving');
        
        // TODO: Save to API
        // await fetch(`/api/documents/${documentId}`, {
        //   method: 'PUT',
        //   headers: { 'Content-Type': 'application/json' },
        //   body: JSON.stringify({ content })
        // });
        
        setSaveStatus('saved');
        console.log('💾 Document saved');
      } catch (error) {
        console.error('Error saving document:', error);
        setSaveStatus('unsaved');
      }
    }, 2000);
  };

  if (loading || status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Back button and title */}
            <div className="flex items-center gap-4">
              <Link
                href="/dashboard"
                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              
              <input
                type="text"
                defaultValue={document?.title}
                className="text-xl font-semibold bg-transparent border-none focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded px-2 py-1 text-gray-900 dark:text-white"
                placeholder="Untitled Document"
                // TODO: Implement title update
                onBlur={(e) => console.log('Update title:', e.target.value)}
              />
            </div>

            {/* Right: Save status and actions */}
            <div className="flex items-center gap-4">
              {/* Save Status */}
              <div className="flex items-center gap-2">
                {saveStatus === 'saved' && (
                  <>
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saved</span>
                  </>
                )}
                {saveStatus === 'saving' && (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Saving...</span>
                  </>
                )}
                {saveStatus === 'unsaved' && (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm text-gray-600 dark:text-gray-400">Unsaved changes</span>
                  </>
                )}
              </div>

              {/* Share Button */}
              <button
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                onClick={() => {
                  // TODO: Open share modal
                  console.log('Share document');
                }}
              >
                Share
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Editor */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CollaborativeEditor
          documentId={documentId}
          currentUser={{
            id: session.user.id || '',
            name: session.user.name || 'Anonymous',
            email: session.user.email || '',
            cursorColor: session.user.cursorColor || '#6366F1'
          }}
          initialContent={document?.content || ''}
          onContentChange={handleContentChange}
          className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6"
        />
      </main>
    </div>
  );
}
