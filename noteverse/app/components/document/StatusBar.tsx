/**
 * Status Bar Component
 * 
 * Fixed bottom status bar with:
 * - Connection status (left)
 * - Last saved time (center)
 * - Word and character count (right)
 */

'use client';

interface StatusBarProps {
  isConnected: boolean;
  lastSaved: Date | null;
  wordCount: number;
  charCount: number;
}

export default function StatusBar({
  isConnected,
  lastSaved,
  wordCount,
  charCount
}: StatusBarProps) {
  const formatLastSaved = () => {
    if (!lastSaved) return 'Never saved';
    
    const now = new Date();
    const diffMs = now.getTime() - lastSaved.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Last saved: Just now';
    if (diffMins < 60) return `Last saved: ${diffMins} min ago`;
    
    return `Last saved: ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-2 z-40 pl-64 pr-80">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
        {/* Left: Connection Status */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
          <span className="font-medium">{isConnected ? 'Connected' : 'Disconnected'}</span>
        </div>

        {/* Center: Last Saved */}
        <div className="flex items-center gap-2">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{formatLastSaved()}</span>
        </div>

        {/* Right: Word and Character Count */}
        <div className="flex items-center gap-4">
          <span className="font-medium">{wordCount} words</span>
          <span className="text-gray-400 dark:text-gray-500">•</span>
          <span className="font-medium">{charCount} characters</span>
        </div>
      </div>
    </div>
  );
}
