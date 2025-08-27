import React, { type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = ({ label, id, error, className, type, ...props }: InputProps) => {
  const isDateInput = type === 'date';

  return (
    <div className="mb-4">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-dark-textSecondary mb-1">{label}</label>}
      <div className="relative"> {/* Wrapper for input and potential icon */}
        <input
          id={id}
          type={type}
          className={`mt-1 block w-full px-3 py-2 bg-white dark:bg-dark-secondary border ${error ? 'border-red-500' : 'border-gray-300 dark:border-dark-border'} rounded-md shadow-sm focus:outline-none focus:ring-primary focus:border-primary sm:text-sm text-gray-900 dark:text-dark-text placeholder:text-gray-500 dark:placeholder:text-dark-textSecondary ${isDateInput ? 'pr-10 cursor-pointer' : ''} ${className || ''}`}
          {...props}
        />
        {isDateInput && (
          // This icon is purely visual. The native calendar picker indicator 
          // should ideally be hidden or made transparent via global CSS (see index.html).
          // The emoji matches the icon style used elsewhere in the app.
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none top-1"> {/* top-1 aligns with input's mt-1 */}
             <span className="text-gray-400 dark:text-dark-textSecondary text-lg">🗓️</span>
          </div>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Input;