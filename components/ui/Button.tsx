
import React, { type ButtonHTMLAttributes, type ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'info' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: ReactNode;
}

const Button = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  children,
  className,
  ...props
}: ButtonProps) => {
  const baseStyles = "font-semibold rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition ease-in-out duration-150 flex items-center justify-center";
  
  const variantStyles = {
    primary: 'bg-primary hover:opacity-90 text-white focus:ring-primary',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-400 border border-gray-300',
    danger: 'bg-danger hover:opacity-90 text-white focus:ring-danger',
    success: 'bg-success hover:opacity-90 text-white focus:ring-success',
    warning: 'bg-warning hover:opacity-90 text-white focus:ring-warning',
    info: 'bg-info hover:opacity-90 text-white focus:ring-info',
    ghost: 'bg-white/10 hover:bg-white/20 text-white focus:ring-white'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type="button"
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${isLoading ? 'opacity-75 cursor-not-allowed' : ''} ${className || ''}`}
      disabled={isLoading || props.disabled}
      {...props}
    >
      {isLoading && (
        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;