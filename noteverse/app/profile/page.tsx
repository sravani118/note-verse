'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import ThemeToggle from '../components/ThemeToggle';
import { useTheme } from '../components/ThemeProvider';
import ProfileHeader from '../components/profile/ProfileHeader';
import Preferences from '../components/profile/Preferences';
import CollaborationIdentity from '../components/profile/CollaborationIdentity';
import SecuritySettings from '../components/profile/SecuritySettings';
import ActivitySummary from '../components/profile/ActivitySummary';
import DangerZone from '../components/profile/DangerZone';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { setTheme } = useTheme();
  
  // User profile state
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    image: '',
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

  const [loading, setLoading] = useState(true);

  // Fetch profile data on mount
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
      return;
    }
    
    if (status === 'authenticated') {
      fetchProfile(true); // Apply theme on initial load
    }
  }, [status, router]);

  const fetchProfile = async (applyTheme: boolean = false) => {
    try {
      setLoading(true);
      const response = await fetch('/api/profile');
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Profile fetch error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to fetch profile');
      }

      const data = await response.json();
      
      console.log('Profile data received:', data);
      
      setProfile({
        name: data.name || '',
        email: data.email || '',
        image: data.image || '',
        role: data.role ? data.role.charAt(0).toUpperCase() + data.role.slice(1) : 'Owner',
        displayName: data.displayName || data.name || '',
        cursorColor: data.cursorColor || '#6366F1',
        timeZone: data.timeZone || 'UTC',
        lastLogin: data.lastLogin || new Date().toISOString()
      });

      setPreferences(data.preferences || {
        theme: 'system',
        fontSize: '14px',
        fontFamily: 'Inter',
        lineSpacing: '1.5',
        autoSave: true
      });
      
      setStats(data.stats || {
        documentsCreated: 0,
        documentsShared: 0,
        lastEditedDocument: 'No documents yet'
      });
      
      setRecentActivity(data.recentActivity || []);
      
      // Apply user's saved theme only on initial load
      if (applyTheme && data.preferences.theme) {
        setTheme(data.preferences.theme);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      console.log('Updating profile with:', updates);
      
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          console.error('Failed to parse error response:', parseError);
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
        
        console.error('Profile update error:', response.status, errorData);
        
        // Show detailed error message
        const errorMessage = errorData.details 
          ? `${errorData.error}: ${errorData.details}`
          : errorData.error || 'Failed to update profile';
          
        throw new Error(errorMessage);
      }

      const data = await response.json();
      toast.success('Profile updated successfully');
      return data;
    } catch (error: any) {
      console.error('Error updating profile:', error);
      console.error('Error stack:', error.stack);
      
      // Show user-friendly error message
      const userMessage = error.message || 'Failed to update profile. Please try again.';
      toast.error(userMessage);
      
      throw error;
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Handler functions
  const handleNameChange = async (name: string) => {
    // Client-side validation
    if (!name || name.trim().length === 0) {
      toast.error('Name cannot be empty');
      return;
    }
    if (name.length > 100) {
      toast.error('Name cannot exceed 100 characters');
      return;
    }
    
    setProfile({ ...profile, name });
    try {
      await updateProfile({ name: name.trim() });
      // Refresh profile data to ensure consistency
      await fetchProfile(false);
    } catch (error) {
      // Error already handled in updateProfile
      // Revert the local state
      await fetchProfile(false);
    }
  };

  const handleAvatarChange = async (file: File) => {
    try {
      // For now, we'll use a placeholder URL
      // In production, upload to cloud storage (S3, Cloudinary, etc.)
      const reader = new FileReader();
      reader.onloadend = async () => {
        const imageUrl = reader.result as string;
        await updateProfile({ image: imageUrl });
        toast.success('Profile photo updated successfully');
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to update profile photo');
    }
  };
  const handleAvatarDelete = async () => {
    try {
      await updateProfile({ image: null });
      setProfile({ ...profile, image: '' });
      toast.success('Profile photo deleted successfully');
      await fetchProfile(false); // Don't reapply theme
    } catch (error) {
      toast.error('Failed to delete profile photo');
    }
  };
  const handlePreferencesChange = async (newPreferences: typeof preferences) => {
    setPreferences(newPreferences);
    await updateProfile({
      theme: newPreferences.theme,
      fontSize: newPreferences.fontSize,
      fontFamily: newPreferences.fontFamily,
      lineSpacing: newPreferences.lineSpacing,
      autoSave: newPreferences.autoSave
    });
  };

  const handleDisplayNameChange = async (displayName: string) => {
    // Client-side validation
    if (displayName && displayName.length > 100) {
      toast.error('Display name cannot exceed 100 characters');
      return;
    }
    
    setProfile({ ...profile, displayName });
    try {
      await updateProfile({ displayName });
      await fetchProfile(false);
    } catch (error) {
      await fetchProfile(false);
    }
  };

  const handleCursorColorChange = async (cursorColor: string) => {
    // Client-side validation for hex color
    if (cursorColor && !/^#[0-9A-F]{6}$/i.test(cursorColor)) {
      toast.error('Invalid color format. Use hex format like #6366F1');
      return;
    }
    
    setProfile({ ...profile, cursorColor });
    try {
      await updateProfile({ cursorColor });
      await fetchProfile(false);
    } catch (error) {
      await fetchProfile(false);
    }
  };

  const handleTimeZoneChange = async (timeZone: string) => {
    setProfile({ ...profile, timeZone });
    await updateProfile({ timeZone });
  };

  const handlePasswordChange = async (currentPassword: string, newPassword: string) => {
    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to change password');
      }

      toast.success('Password changed successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to change password');
      throw error;
    }
  };

  const handleExportData = async () => {
    try {
      toast.loading('Exporting your data...');
      const response = await fetch('/api/profile/export');
      
      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `noteverse-data-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.dismiss();
      toast.success('Data exported successfully');
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to export data');
    }
  };

  const handleDeleteAccount = async () => {
    try {
      const response = await fetch('/api/profile', {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete account');
      }

      toast.success('Account deleted successfully');
      router.push('/');
    } catch (error) {
      toast.error('Failed to delete account');
    }
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

            <ThemeToggle />
          </div>
        </div>
      </header>

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
            avatarUrl={profile.image}
            onNameChange={handleNameChange}
            onAvatarChange={handleAvatarChange}
            onAvatarDelete={handleAvatarDelete}
          />

          <Preferences
            preferences={preferences}
            onPreferencesChange={handlePreferencesChange}
          />

          <CollaborationIdentity
            displayName={profile.displayName}
            cursorColor={profile.cursorColor}
            timeZone={profile.timeZone}
            onDisplayNameChange={handleDisplayNameChange}
            onCursorColorChange={handleCursorColorChange}
            onTimeZoneChange={handleTimeZoneChange}
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
