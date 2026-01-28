/**
 * Reusable Dropdown Component
 * 
 * Consistent dropdown styling across the application with:
 * - Uniform height and border-radius
 * - Focus/hover states
 * - Dark mode support
 * - Disabled state styling
 * - Full accessibility
 */

'use client';

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
    <select
      id={id}
      name={name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      required={required}
      aria-label={ariaLabel}
      className={`
        w-full px-4 py-2.5 
        border border-gray-300 dark:border-gray-600 
        rounded-lg
        bg-white dark:bg-gray-700 
        text-gray-900 dark:text-white
        focus:ring-2 focus:ring-indigo-500 focus:border-transparent
        hover:border-gray-400 dark:hover:border-gray-500
        disabled:opacity-50 disabled:cursor-not-allowed
        transition-colors duration-200
        outline-none
        ${className}
      `.trim().replace(/\s+/g, ' ')}
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
