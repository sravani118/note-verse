/**
 * Reusable Dropdown Component
 * 
 * Google Docs-style dropdown with:
 * - Clean minimal styling
 * - Visible chevron indicator
 * - Smooth hover states
 * - Dark mode support
 */

'use client';

import { ChevronDown } from 'lucide-react';

interface DropdownProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{
    value: string;
    label: string;
  }>;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
  name?: string;
  required?: boolean;
  'aria-label'?: string;
}

export default function Dropdown({
  value,
  onChange,
  options,
  disabled = false,
  placeholder,
  className = '',
  id,
  name,
  required = false,
  'aria-label': ariaLabel
}: DropdownProps) {
  return (
    <div className={`relative ${className}`}>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        required={required}
        aria-label={ariaLabel}
        className="
          w-full pl-3 pr-9 py-2
          border border-gray-300 dark:border-gray-600 
          rounded-md
          bg-white dark:bg-gray-800 
          text-sm text-gray-700 dark:text-gray-200
          hover:bg-gray-50 dark:hover:bg-gray-750
          focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-gray-900
          transition-all duration-150
          cursor-pointer
          appearance-none
        "
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      
      {/* Chevron Icon - Google Docs style */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown 
          className={`w-4 h-4 ${
            disabled 
              ? 'text-gray-400 dark:text-gray-600' 
              : 'text-gray-500 dark:text-gray-400'
          }`}
        />
      </div>
    </div>
  );
}

/**
 * Usage Examples:
 * 
 * Basic:
 * <Dropdown
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={[
 *     { value: 'option1', label: 'Option 1' },
 *     { value: 'option2', label: 'Option 2' }
 *   ]}
 * />
 * 
 * With placeholder:
 * <Dropdown
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={options}
 *   placeholder="Select an option..."
 * />
 * 
 * Disabled:
 * <Dropdown
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={options}
 *   disabled={true}
 * />
 * 
 * With custom className:
 * <Dropdown
 *   value={selectedValue}
 *   onChange={setSelectedValue}
 *   options={options}
 *   className="max-w-xs"
 * />
 */
