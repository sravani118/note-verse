'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface UserProfile {
  displayName: string;
  cursorColor: string;
  theme: 'light' | 'dark' | 'system';
  fontSize: string;
  fontFamily: string;
  lineSpacing: string;
  autoSave: boolean;
}

export function useUserProfile() {
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    if (status === 'unauthenticated') {
      setLoading(false);
      return;
    }

    const fetchProfile = async () => {
      try {
        const response = await fetch('/api/profile');
        if (!response.ok) {
          throw new Error('Failed to fetch profile');
        }
        const data = await response.json();
        
        setProfile({
          displayName: data.displayName || data.name,
          cursorColor: data.cursorColor,
          theme: data.preferences.theme,
          fontSize: data.preferences.fontSize,
          fontFamily: data.preferences.fontFamily,
          lineSpacing: data.preferences.lineSpacing,
          autoSave: data.preferences.autoSave
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [status]);

  return { profile, loading };
}
