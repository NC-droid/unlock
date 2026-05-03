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

export default function LoginForm() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleLogin() {
    setErrorMsg(null);
    setLoading(true);

    try {
      // Check if already logged in
      const alreadyAuth = await isAuthenticated();
      if (alreadyAuth) {
        router.push('/dashboard');
        return;
      }

      // Trigger Azure popup
      const result = await loginWithPopup();

      if (!result) {
        setErrorMsg('Oops! That didn\'t work. Give it another try?');
        setLoading(false);
        return;
      }

      success(`Welcome back! 👋`);
      router.push('/dashboard');
    } catch (err) {
      console.error('[LoginForm]', err);
      showError('Something unexpected happened. Please try again.');
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
        You&apos;ll sign in securely through your school or personal account.
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
