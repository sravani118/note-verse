'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProfileHeader from '../components/profile/ProfileHeader';
import Preferences from '../components/profile/Preferences';
import CollaborationIdentity from '../components/profile/CollaborationIdentity';
import SecuritySettings from '../components/profile/SecuritySettings';
import ActivitySummary from '../components/profile/ActivitySummary';
import DangerZone from '../components/profile/DangerZone';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  
  // User profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'Owner',
    displayName: '',
    cursorColor: '#6366F1',
    timeZone: 'UTC',
    lastLogin: new Date().toISOString()
  });

  // Preferences state
  const [preferences, setPreferences] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    fontSize: '14px',
    fontFamily: 'Inter',
    lineSpacing: '1.5',
    autoSave: true
  });

  // Activity stats
  const [stats, setStats] = useState({
    documentsCreated: 0,
    documentsShared: 0,
    lastEditedDocument: 'No documents yet'
  });

  const [recentActivity, setRecentActivity] = useState<Array<{
    id: string;
    action: string;
    document: string;
    timestamp: string;
  }>>([]);

  const [loading, setLoading] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    
    if (session?.user) {
      setProfile(prev => ({
        ...prev,
        name: session.user?.name || '',
        email: session.user?.email || '',
        displayName: session.user?.name || ''
      }));
    }
  }, [status, session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Handler functions
  const handleNameChange = async (name: string) => {
    setProfile({ ...profile, name });
    // TODO: API call to update name
    showSaveMessage('Name updated successfully!');
  };

  const handleAvatarChange = async (file: File) => {
    // TODO: Upload avatar and update profile
    showSaveMessage('Avatar updated successfully!');
  };

  const handlePreferencesChange = async (newPreferences: typeof preferences) => {
    setPreferences(newPreferences);
    // TODO: API call to save preferences
    showSaveMessage('Preferences saved!');
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    // TODO: API call to change password
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        showSaveMessage('Password changed successfully!');
        resolve();
      }, 1000);
    });
  };

  const handleExportData = () => {
    // TODO: Generate and download user data export
    alert('Exporting your data...');
  };

  const handleDeleteAccount = () => {
    // TODO: API call to delete account
    alert('Account deletion initiated. You will be logged out.');
    router.push('/');
  };

  const showSaveMessage = (message: string) => {
    setSaveMessage(message);
    setTimeout(() => setSaveMessage(''), 3000);
  };

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

            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Save Message Toast */}
      {saveMessage && (
        <div className="fixed top-20 right-6 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {saveMessage}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Profile Settings</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your account settings and preferences</p>
        </div>

        <div className="space-y-6">
          <ProfileHeader
            name={profile.name}
            email={profile.email}
            role={profile.role}
            onNameChange={handleNameChange}
            onAvatarChange={handleAvatarChange}
          />

          <Preferences
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />

          <CollaborationIdentity
            displayName={profile.displayName}
            cursorColor={profile.cursorColor}
            timeZone={profile.timeZone}
            onDisplayNameChange={(name) => setProfile({ ...profile, displayName: name })}
            onCursorColorChange={(color) => setProfile({ ...profile, cursorColor: color })}
            onTimeZoneChange={(tz) => setProfile({ ...profile, timeZone: tz })}
          />

          <SecuritySettings
            lastLogin={profile.lastLogin}
            onPasswordChange={handlePasswordChange}
          />

          <ActivitySummary
            stats={stats}
            recentActivity={recentActivity}
          />

          <DangerZone
            onExportData={handleExportData}
            onDeleteAccount={handleDeleteAccount}
          />
        </div>
      </main>
    </div>
  );
}
