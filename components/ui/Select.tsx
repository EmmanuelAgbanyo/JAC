import React, { type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: Array<{ value: string | number; label: string }>;
}

const Select = ({ label, id, error, options, className, value, ...props }: SelectProps) => {
  const isPlaceholderSelected = value === "" || value === undefined;
  // Placeholder text is light gray if a placeholder is selected, otherwise dark gray for actual value.
  const textColorClass = isPlaceholderSelected ? 'text-gray-500' : 'text-gray-900';

  const placeholderText = options.length === 0 
    ? (label ? `No ${label.toLowerCase()} available` : 'No options available')
    : `Select ${label?.toLowerCase() || 'an option'}`;
  
  // Disable placeholder if field is required and no actual value is selected,
  // or if there are no options to choose from at all.
  const isPlaceholderDisabled = (props.required && isPlaceholderSelected) || options.length === 0;

  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
      <select
        id={id}
        value={value}
        className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border ${error ? 'border-red-500' : 'border-gray-300'} focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md bg-white ${textColorClass} ${className || ''}`}
        {...props}
      >
        <option value="" disabled={isPlaceholderDisabled} hidden={isPlaceholderSelected && props.required}> {/* Hide placeholder from list if required and selected for better UX */}
          {placeholderText}
        </option>
        {options.map(option => (
          <option key={option.value} value={option.value} className="text-gray-900"> {/* Ensure options have dark text */}
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;