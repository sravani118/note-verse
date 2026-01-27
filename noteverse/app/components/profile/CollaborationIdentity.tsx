'use client';

interface CollaborationIdentityProps {
  displayName: string;
  cursorColor: string;
  timeZone: string;
  onDisplayNameChange: (name: string) => void;
  onCursorColorChange: (color: string) => void;
  onTimeZoneChange: (tz: string) => void;
}

export default function CollaborationIdentity({
  displayName,
  cursorColor,
  timeZone,
  onDisplayNameChange,
  onCursorColorChange,
  onTimeZoneChange
}: CollaborationIdentityProps) {
  const cursorColors = [
    '#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', 
    '#10B981', '#3B82F6', '#EF4444', '#14B8A6'
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Collaboration Identity</h2>
      
      <div className="space-y-6">
        {/* Display Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Display Name for Collaborators
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
            placeholder="How others see you in documents"
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This name appears when you collaborate on documents
          </p>
        </div>

        {/* Cursor Color */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Cursor Color
          </label>
          <div className="flex gap-3 flex-wrap">
            {cursorColors.map((color) => (
              <button
                key={color}
                onClick={() => onCursorColorChange(color)}
                className={`w-12 h-12 rounded-lg transition-all ${
                  cursorColor === color 
                    ? 'ring-4 ring-offset-2 ring-indigo-600' 
                    : 'hover:scale-110'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
            <label className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-indigo-600 transition-colors">
              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <input
                type="color"
                value={cursorColor}
                onChange={(e) => onCursorColorChange(e.target.value)}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Choose a unique color for your cursor in collaborative sessions
          </p>
        </div>

        {/* Time Zone */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Time Zone</label>
          <select
            value={timeZone}
            onChange={(e) => onTimeZoneChange(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="UTC">UTC (Coordinated Universal Time)</option>
            <option value="America/New_York">Eastern Time (ET)</option>
            <option value="America/Chicago">Central Time (CT)</option>
            <option value="America/Denver">Mountain Time (MT)</option>
            <option value="America/Los_Angeles">Pacific Time (PT)</option>
            <option value="Europe/London">London (GMT)</option>
            <option value="Europe/Paris">Paris (CET)</option>
            <option value="Asia/Tokyo">Tokyo (JST)</option>
            <option value="Asia/Shanghai">Shanghai (CST)</option>
            <option value="Asia/Kolkata">India (IST)</option>
          </select>
        </div>
      </div>
    </div>
  );
}
