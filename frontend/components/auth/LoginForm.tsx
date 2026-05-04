'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { loginWithPopup, isAuthenticated } from '@/lib/auth';

// =============================================================================
// UNLOCK LoginForm
// Uses Azure Entra External ID popup flow for sign-in
// =============================================================================

// MSAL error codes we handle explicitly
const POPUP_BLOCKED  = 'popup_window_error';
const USER_CANCELLED = 'user_cancelled';

export default function LoginForm() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMsg(null);
    setLoading(true);

    try {
      // Check if already logged in — keep spinner active during navigation
      const alreadyAuth = await isAuthenticated();
      if (alreadyAuth) {
        router.push('/dashboard');
        return;
      }

      // Trigger Azure popup
      const result = await loginWithPopup();

      if (!result) {
        setErrorMsg("Oops! That didn't work. Give it another try?");
        setLoading(false);
        return;
      }

      success('Welcome back! 👋');
      router.push('/dashboard');
      // loading stays true intentionally — spinner persists during navigation
    } catch (err: any) {
      console.error('[LoginForm]', err);

      const code: string = err?.errorCode ?? err?.name ?? '';

      if (code === USER_CANCELLED) {
        // User deliberately closed the popup — silently reset, no error shown
        setLoading(false);
        return;
      }

      if (code === POPUP_BLOCKED) {
        setErrorMsg(
          'Your browser blocked the sign-in popup. ' +
          'Please allow popups for this site and try again.'
        );
      } else {
        showError('Something unexpected happened. Please try again.');
      }

      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {errorMsg && (
        <div
          className="bg-red-50 border border-[#FF6B6B] rounded-lg p-3 text-sm text-[#FF6B6B]"
          role="alert"
        >
          {errorMsg}
        </div>
      )}

      {/* Sign in info */}
      <p className="text-[#666666] text-sm text-center leading-relaxed">
        You&apos;ll sign in securely through your school or personal Microsoft account.
        <br />No password to remember here!
      </p>

      {/* Sign in button */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onClick={handleLogin}
        disabled={loading}
      >
        {loading ? 'Signing you in…' : 'Sign In to UNLOCK 🔐'}
      </Button>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-[#E0E0E0]" />
        <span className="text-xs text-[#999999] flex-shrink-0">or</span>
        <div className="flex-1 h-px bg-[#E0E0E0]" />
      </div>

      {/* Don't have an account */}
      <p className="text-center text-sm text-[#666666]">
        Don&apos;t have an account?{' '}
        <a href="/auth/register" className="text-[#00A8A8] font-semibold hover:underline">
          Join UNLOCK free
        </a>
      </p>

      <p className="text-center text-xs text-[#999999]">
        Having trouble?{' '}
        <a href="mailto:hello@unlock-app.com" className="text-[#00A8A8] hover:underline">
          Contact us
        </a>
      </p>
    </div>
  );
}
