'use client';

import React, { createContext, useContext, useCallback, useState, useEffect } from 'react';
import { clsx } from 'clsx';

// =============================================================================
// UNLOCK Toast Notification System
// =============================================================================

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id:       string;
  type:     ToastType;
  message:  string;
  duration?: number;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error:   (message: string) => void;
  info:    (message: string) => void;
  warning: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, { bg: string; icon: string }> = {
  success: { bg: 'bg-[#FFB81C]', icon: '✓' },
  error:   { bg: 'bg-[#FF6B6B]', icon: '✕' },
  info:    { bg: 'bg-[#00A8A8]', icon: 'ℹ' },
  warning: { bg: 'bg-[#FFB81C]', icon: '⚠' },
};

function ToastItem({ toast, onRemove }: { toast: Toast; onRemove: (id: string) => void }) {
  const { bg, icon } = toastStyles[toast.type];

  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), toast.duration || 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  return (
    <div
      className={clsx(
        'flex items-center gap-3',
        'max-w-[360px] w-full',
        'px-4 py-3 rounded-lg',
        'text-white text-sm font-body',
        'shadow-[0_4px_16px_rgba(0,0,0,0.15)]',
        'animate-[slideInBottom_300ms_ease-out]',
        bg
      )}
      role="alert"
      aria-live="polite"
    >
      <span className="text-lg font-bold flex-shrink-0" aria-hidden="true">{icon}</span>
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev.slice(-4), { id, type, message, duration }]); // Max 5 at once
  }, []);

  const value: ToastContextValue = {
    toast:   add,
    success: (msg) => add(msg, 'success'),
    error:   (msg) => add(msg, 'error'),
    info:    (msg) => add(msg, 'info'),
    warning: (msg) => add(msg, 'warning'),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container — bottom-right on desktop, bottom-left on mobile */}
      <div
        className="fixed bottom-4 left-4 sm:left-auto sm:right-4 z-50 flex flex-col gap-2"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={remove} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
