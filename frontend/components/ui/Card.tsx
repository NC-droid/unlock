import React from 'react';
import { clsx } from 'clsx';

// =============================================================================
// UNLOCK Card Component
// Variants: default | outlined | elevated | success
// =============================================================================

type CardVariant = 'default' | 'outlined' | 'elevated' | 'success' | 'ghost';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  padding?:  'none' | 'sm' | 'md' | 'lg';
  clickable?: boolean;
  children:   React.ReactNode;
}

const variantStyles: Record<CardVariant, string> = {
  default:  'bg-white border border-[#E0E0E0] shadow-[0_2px_8px_rgba(0,0,0,0.08)]',
  outlined: 'bg-white border-2 border-[#00A8A8]',
  elevated: 'bg-white border border-[#E0E0E0] shadow-[0_4px_16px_rgba(0,0,0,0.12)]',
  success:  'bg-white border-2 border-[#FFB81C] shadow-[0_4px_16px_rgba(255,184,28,0.20)]',
  ghost:    'bg-[#F8F9FA] border border-transparent',
};

const paddingStyles = {
  none: '',
  sm:   'p-3',
  md:   'p-4',
  lg:   'p-6',
};

export default function Card({
  variant   = 'default',
  padding   = 'md',
  clickable = false,
  children,
  className,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'rounded-[12px]',
        variantStyles[variant],
        paddingStyles[padding],
        clickable && [
          'cursor-pointer',
          'transition-all duration-200',
          'hover:shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:-translate-y-0.5',
          'active:scale-[0.99]',
          'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
        ],
        className
      )}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
    >
      {children}
    </div>
  );
}

// ---- Card sub-components for structured layout ----

export function CardHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('mb-3 flex items-start justify-between gap-2', className)}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={clsx('text-[20px] font-semibold text-[#1A3A52] font-heading leading-snug', className)}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardBody({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx('text-[15px] text-[#666666] leading-relaxed', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx('mt-4 flex items-center justify-between gap-3', className)}
      {...props}
    >
      {children}
    </div>
  );
}

// ---- XP Badge (reusable) ----
interface XPBadgeProps {
  xp: number;
  className?: string;
}

export function XPBadge({ xp, className }: XPBadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1',
        'bg-[#FFB81C] text-white',
        'px-3 py-1 rounded-pill',
        'font-mono text-sm font-semibold',
        'shadow-[0_4px_12px_rgba(255,184,28,0.30)]',
        className
      )}
    >
      ⭐ +{xp} XP
    </span>
  );
}

// ---- Progress Bar ----
interface ProgressBarProps {
  value:     number;   // 0–100
  max?:      number;
  variant?:  'primary' | 'success' | 'growth';
  showLabel?: boolean;
  label?:    string;
  className?: string;
  animated?:  boolean;
}

const progressColors = {
  primary: 'bg-[#00A8A8]',
  success: 'bg-[#FFB81C]',
  growth:  'bg-[#7FD856]',
};

export function ProgressBar({
  value,
  max = 100,
  variant = 'primary',
  showLabel = false,
  label,
  className,
  animated = true,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));

  return (
    <div className={clsx('w-full', className)}>
      {(showLabel || label) && (
        <div className="flex justify-between items-center mb-1.5">
          {label && <span className="text-sm text-[#666666]">{label}</span>}
          {showLabel && (
            <span className="text-sm font-mono font-semibold text-[#1A3A52]">
              {Math.round(pct)}%
            </span>
          )}
        </div>
      )}
      <div
        className="h-2 rounded-full bg-[#F0F2F5] overflow-hidden"
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label || 'Progress'}
      >
        <div
          className={clsx(
            'h-full rounded-full',
            progressColors[variant],
            animated && 'transition-[width] duration-500 ease-in-out'
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
