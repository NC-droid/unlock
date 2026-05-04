'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { loginWithSignupPopup, apiFetch } from '@/lib/auth';

// =============================================================================
// UNLOCK RegisterForm
// Uses Azure Entra External ID popup flow for sign-up
// =============================================================================

// MSAL error codes we handle explicitly
const POPUP_BLOCKED  = 'popup_window_error';
const USER_CANCELLED = 'user_cancelled';

interface FormErrors {
  general?: string;
  terms?:   string;
}

export default function RegisterForm() {
  const router  = useRouter();
  const { success, error: showError } = useToast();

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading]             = useState(false);
  const [errors, setErrors]               = useState<FormErrors>({});

  async function handleSignUp() {
    const newErrors: FormErrors = {};

    if (!agreedToTerms) {
      newErrors.terms = 'Oops! You need to agree to our terms to get started.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      // 1. Trigger Azure popup sign-up/sign-in
      const result = await loginWithSignupPopup();

      if (!result) {
        setErrors({ general: "Hmm, sign-up was cancelled. Give it another try!" });
        setLoading(false);
        return;
      }

      // 2. Register user in our database
      const { error: apiError, status } = await apiFetch('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          name:            result.account.name || '',
          email:           result.account.username,
          parentalConsent: false, // TODO: add parental consent flow for under-13s
        }),
      });

      if (apiError) {
        if (status === 0) {
          // Network error: Azure account was created successfully, but our
          // backend server is unreachable. Show a clear, honest message so
          // the student isn't confused — they can sign in once the server is up.
          setErrors({
            general:
              "Your Microsoft account was created successfully! ✅ " +
              "We're having a little trouble reaching our server right now. " +
              "Please try signing in in a few minutes — your account will be ready.",
          });
        } else {
          showError(`Something went wrong setting up your profile: ${apiError}`);
        }
        setLoading(false);
        return;
      }

      success("Welcome to UNLOCK! 🎉 Let’s set up your profile.");

      // 3. Redirect to onboarding — loading stays true during navigation
      router.push('/onboarding');
    } catch (err: any) {
      console.error('[RegisterForm]', err);

      const code: string = err?.errorCode ?? err?.name ?? '';

      if (code === USER_CANCELLED) {
        // User deliberately closed the popup — silently reset, no error shown
        setLoading(false);
        return;
      }

      if (code === POPUP_BLOCKED) {
        setErrors({
          general:
            'Your browser blocked the sign-up popup. ' +
            'Please allow popups for this site and try again.',
        });
      } else {
        showError('Something unexpected happened. Please try again.');
      }

      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* General error */}
      {errors.general && (
        <div
          className="bg-red-50 border border-[#FF6B6B] rounded-lg p-3 text-sm text-[#FF6B6B]"
          role="alert"
        >
          {errors.general}
        </div>
      )}

      {/* What students get */}
      <div className="bg-[#F8F9FA] rounded-xl p-4 flex flex-col gap-2 text-sm text-[#666666]">
        <p className="font-semibold text-[#1A3A52] text-base mb-1">What you&apos;ll get:</p>
        {[
          '📚 Personalised study plans aligned to your NESA outcomes',
          '🧠 AI-powered quiz feedback',
          '🔥 Streaks and XP to keep you motivated',
          '📄 Instant analysis of your exam results',
        ].map((item) => (
          <div key={item} className="flex items-start gap-2">
            <span>{item}</span>
          </div>
        ))}
      </div>

      {/* Terms checkbox */}
      <Input
        as="checkbox"
        checked={agreedToTerms}
        onChange={(e) => {
          setAgreedToTerms((e.target as HTMLInputElement).checked);
          if (errors.terms) setErrors((prev) => ({ ...prev, terms: undefined }));
        }}
        error={errors.terms}
      >
        I agree to the{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00A8A8] underline hover:text-[#007C7C]"
        >
          Terms of Service
        </a>{' '}
        and{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#00A8A8] underline hover:text-[#007C7C]"
        >
          Privacy Policy
        </a>
      </Input>

      {/* CTA — triggers Azure popup */}
      <Button
        variant="primary"
        size="lg"
        fullWidth
        loading={loading}
        onClick={handleSignUp}
        disabled={loading}
      >
        {loading ? 'Creating your account…' : 'Create My Account 🚀'}
      </Button>

      <p className="text-center text-sm text-[#666666]">
        Already have an account?{' '}
        <a href="/auth/login" className="text-[#00A8A8] font-semibold hover:underline">
          Sign In
        </a>
      </p>

      <p className="text-center text-xs text-[#999999]">
        Your data is stored securely in Australia. We never share it with third parties.
      </p>
    </div>
  );
}
