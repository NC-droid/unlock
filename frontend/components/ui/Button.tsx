'use client';

import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// UNLOCK Button Component
// Variants: primary | secondary | success | ghost | danger
// =============================================================================

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'ghost' | 'danger';
export type ButtonSize    = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:  ButtonVariant;
  size?:     ButtonSize;
  loading?:  boolean;
  fullWidth?: boolean;
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: [
    'bg-[#00A8A8] text-white',
    'hover:bg-[#007C7C] hover:shadow-[0_4px_12px_rgba(0,168,168,0.30)]',
    'active:scale-[0.98]',
    'disabled:bg-[#B8E6E6] disabled:text-white/70',
  ].join(' '),

  secondary: [
    'bg-[#F8F9FA] text-[#1A3A52] border-2 border-[#1A3A52]',
    'hover:bg-[#F0F2F5]',
    'active:scale-[0.98]',
    'disabled:border-[#E0E0E0] disabled:text-[#999999]',
  ].join(' '),

  success: [
    'bg-[#FFB81C] text-white shadow-[0_4px_12px_rgba(255,184,28,0.30)]',
    'hover:bg-[#FFA500] hover:shadow-[0_6px_16px_rgba(255,184,28,0.40)]',
    'active:scale-[0.98]',
    'disabled:bg-[#FFE08A] disabled:shadow-none',
  ].join(' '),

  ghost: [
    'bg-transparent text-[#00A8A8]',
    'hover:bg-[#F8F9FA]',
    'active:scale-[0.98]',
    'disabled:text-[#999999]',
  ].join(' '),

  danger: [
    'bg-[#FF6B6B] text-white',
    'hover:bg-[#e05555]',
    'active:scale-[0.98]',
    'disabled:bg-[#FFB8B8]',
  ].join(' '),
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm min-h-[36px]',
  md: 'px-6 py-3 text-base min-h-[44px]',   // 44px min for touch targets
  lg: 'px-8 py-4 text-lg min-h-[52px]',
};

function Spinner() {
  return (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      {...props}
      disabled={isDisabled}
      className={clsx(
        // Base
        'inline-flex items-center justify-center gap-2',
        'font-heading font-semibold rounded-[10px]',
        'transition-all duration-200 ease-out',
        'cursor-pointer select-none',
        'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
        // Variant
        variantStyles[variant],
        // Size
        sizeStyles[size],
        // Full width
        fullWidth && 'w-full',
        // Disabled
        isDisabled && 'cursor-not-allowed opacity-60 transform-none',
        className
      )}
      aria-busy={loading}
    >
      {loading ? (
        <Spinner />
      ) : leftIcon ? (
        <span aria-hidden="true">{leftIcon}</span>
      ) : null}
      {children}
      {!loading && rightIcon && <span aria-hidden="true">{rightIcon}</span>}
    </button>
  );
}
