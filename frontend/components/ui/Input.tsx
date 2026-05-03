'use client';

import React, { forwardRef } from 'react';
import { clsx } from 'clsx';

// =============================================================================
// UNLOCK Input Component
// Types: text | email | password | select | checkbox | textarea
// =============================================================================

interface BaseInputProps {
  label?:     string;
  error?:     string;
  hint?:      string;
  id?:        string;
}

// ---- Text / Email / Password ----
interface TextInputProps extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id'> {
  as?: 'input';
  type?: 'text' | 'email' | 'password' | 'number' | 'tel';
  leftIcon?:  React.ReactNode;
  rightIcon?: React.ReactNode;
  showPasswordToggle?: boolean;
}

// ---- Textarea ----
interface TextareaProps extends BaseInputProps, Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> {
  as: 'textarea';
}

// ---- Select ----
interface SelectProps extends BaseInputProps, Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'id'> {
  as: 'select';
  options: { value: string | number; label: string; disabled?: boolean }[];
  placeholder?: string;
}

// ---- Checkbox ----
interface CheckboxProps extends BaseInputProps, Omit<React.InputHTMLAttributes<HTMLInputElement>, 'id' | 'type'> {
  as: 'checkbox';
  children: React.ReactNode; // label content — can include links
}

type InputProps = TextInputProps | TextareaProps | SelectProps | CheckboxProps;

const baseInputClasses = clsx(
  'w-full bg-white',
  'border-2 border-[#E0E0E0] rounded-[8px]',
  'px-4 py-3',
  'font-body text-[16px] text-[#1A1A1A]',
  'placeholder:text-[#999999] placeholder:italic',
  'transition-all duration-200',
  'focus:outline-none focus:border-[#00A8A8] focus:ring-2 focus:ring-[#00A8A8]/20',
  'disabled:bg-[#F0F2F5] disabled:cursor-not-allowed disabled:text-[#999999]'
);

const errorInputClasses = 'border-[#FF6B6B] focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/20';

// ---- Label ----
function Label({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-semibold text-[#1A3A52] mb-1.5 font-heading"
    >
      {children}
    </label>
  );
}

// ---- Error message ----
function ErrorMsg({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} role="alert" className="mt-1.5 text-sm text-[#FF6B6B] flex items-center gap-1">
      <span aria-hidden="true">⚠</span> {message}
    </p>
  );
}

// ---- Hint ----
function Hint({ id, message }: { id?: string; message: string }) {
  return (
    <p id={id} className="mt-1 text-xs text-[#666666]">
      {message}
    </p>
  );
}

// =============================================================================
// Main Input Component
// =============================================================================
const Input = forwardRef<
  HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  InputProps
>((props, ref) => {
  const inputId = props.id || `input-${Math.random().toString(36).slice(2, 7)}`;
  const errorId = `${inputId}-error`;
  const hintId  = `${inputId}-hint`;

  // ---- Checkbox ----
  if (props.as === 'checkbox') {
    const { as: _as, label: _label, error, hint, children, id: _id, className, ...rest } = props;
    return (
      <div className="flex flex-col gap-1">
        <label className="flex items-start gap-3 cursor-pointer group">
          <input
            {...rest}
            ref={ref as React.Ref<HTMLInputElement>}
            type="checkbox"
            id={inputId}
            className={clsx(
              'mt-0.5 h-5 w-5 flex-shrink-0',
              'rounded border-2 border-[#E0E0E0]',
              'accent-[#00A8A8]',
              'cursor-pointer',
              'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
              error && 'border-[#FF6B6B]',
              className
            )}
            aria-describedby={error ? errorId : hint ? hintId : undefined}
            aria-invalid={!!error}
          />
          <span className="text-[15px] text-[#1A1A1A] leading-snug">{children}</span>
        </label>
        {error && <ErrorMsg id={errorId} message={error} />}
        {hint && !error && <Hint id={hintId} message={hint} />}
      </div>
    );
  }

  // ---- Select ----
  if (props.as === 'select') {
    const { as: _as, label, error, hint, options, placeholder, id: _id, className, ...rest } = props;
    return (
      <div className="flex flex-col">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <select
          {...rest}
          ref={ref as React.Ref<HTMLSelectElement>}
          id={inputId}
          className={clsx(
            baseInputClasses,
            error && errorInputClasses,
            'appearance-none cursor-pointer',
            'bg-[image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%231A3A52\' stroke-width=\'2\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' d=\'M19 9l-7 7-7-7\'/%3E%3C/svg%3E")]',
            'bg-no-repeat bg-[right_12px_center] bg-[length:20px]',
            'pr-10',
            className
          )}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <ErrorMsg id={errorId} message={error} />}
        {hint && !error && <Hint id={hintId} message={hint} />}
      </div>
    );
  }

  // ---- Textarea ----
  if (props.as === 'textarea') {
    const { as: _as, label, error, hint, id: _id, className, ...rest } = props;
    return (
      <div className="flex flex-col">
        {label && <Label htmlFor={inputId}>{label}</Label>}
        <textarea
          {...rest}
          ref={ref as React.Ref<HTMLTextAreaElement>}
          id={inputId}
          className={clsx(
            baseInputClasses,
            'min-h-[100px] resize-y',
            error && errorInputClasses,
            className
          )}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        />
        {error && <ErrorMsg id={errorId} message={error} />}
        {hint && !error && <Hint id={hintId} message={hint} />}
      </div>
    );
  }

  // ---- Text / Email / Password (default) ----
  const {
    as: _as,
    label,
    error,
    hint,
    leftIcon,
    rightIcon,
    showPasswordToggle,
    id: _id,
    className,
    type = 'text',
    ...rest
  } = props as TextInputProps;

  const [showPw, setShowPw] = React.useState(false);
  const inputType = type === 'password' && showPw ? 'text' : type;

  return (
    <div className="flex flex-col">
      {label && <Label htmlFor={inputId}>{label}</Label>}
      <div className="relative">
        {leftIcon && (
          <span
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[#999999]"
            aria-hidden="true"
          >
            {leftIcon}
          </span>
        )}
        <input
          {...rest}
          ref={ref as React.Ref<HTMLInputElement>}
          id={inputId}
          type={inputType}
          className={clsx(
            baseInputClasses,
            error && errorInputClasses,
            leftIcon  && 'pl-10',
            (rightIcon || (showPasswordToggle && type === 'password')) && 'pr-10',
            className
          )}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={!!error}
        />
        {/* Password toggle or right icon */}
        {showPasswordToggle && type === 'password' ? (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999] hover:text-[#1A3A52] transition-colors"
            aria-label={showPw ? 'Hide password' : 'Show password'}
          >
            {showPw ? '🙈' : '👁'}
          </button>
        ) : rightIcon ? (
          <span
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#999999]"
            aria-hidden="true"
          >
            {rightIcon}
          </span>
        ) : null}
      </div>
      {error && <ErrorMsg id={errorId} message={error} />}
      {hint && !error && <Hint id={hintId} message={hint} />}
    </div>
  );
});

Input.displayName = 'Input';
export default Input;
