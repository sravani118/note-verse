'use client';

interface PreferencesProps {
  preferences: {
    theme: 'light' | 'dark' | 'system';
    fontSize: string;
    fontFamily: string;
    lineSpacing: string;
    autoSave: boolean;
  };
  onPreferencesChange: (preferences: any) => void;
}

export default function Preferences({ preferences, onPreferencesChange }: PreferencesProps) {
  const updatePreference = (key: string, value: any) => {
    onPreferencesChange({ ...preferences, [key]: value });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Personal Preferences</h2>
      
      <div className="space-y-6">
        {/* Theme Selector */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Theme</label>
          <div className="flex gap-3">
            {['light', 'dark', 'system'].map((theme) => (
              <button
                key={theme}
                onClick={() => updatePreference('theme', theme)}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  preferences.theme === theme
                    ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  {theme === 'light' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  )}
                  {theme === 'dark' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                    </svg>
                  )}
                  {theme === 'system' && (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  )}
                  <span className="capitalize font-medium">{theme}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Editor Font Size</label>
          <select
            value={preferences.fontSize}
            onChange={(e) => updatePreference('fontSize', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="12px">Small (12px)</option>
            <option value="14px">Medium (14px)</option>
            <option value="16px">Large (16px)</option>
            <option value="18px">Extra Large (18px)</option>
          </select>
        </div>

        {/* Font Family */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Editor Font Family</label>
          <select
            value={preferences.fontFamily}
            onChange={(e) => updatePreference('fontFamily', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="Inter">Inter</option>
            <option value="Roboto">Roboto</option>
            <option value="Monaco">Monaco</option>
            <option value="Courier New">Courier New</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        {/* Line Spacing */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Line Spacing</label>
          <select
            value={preferences.lineSpacing}
            onChange={(e) => updatePreference('lineSpacing', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="1">Tight (1.0)</option>
            <option value="1.5">Normal (1.5)</option>
            <option value="2">Relaxed (2.0)</option>
          </select>
        </div>

        {/* Auto Save Toggle */}
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Auto-save</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Automatically save changes as you type</p>
          </div>
          <button
            onClick={() => updatePreference('autoSave', !preferences.autoSave)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              preferences.autoSave ? 'bg-indigo-600' : 'bg-gray-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                preferences.autoSave ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
