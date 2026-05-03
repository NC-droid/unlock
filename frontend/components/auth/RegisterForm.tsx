'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { loginWithPopup, apiFetch } from '@/lib/auth';

// =============================================================================
// UNLOCK RegisterForm
// Uses Azure Entra External ID popup flow for sign-up
// =============================================================================

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

  // Azure Entra External ID handles email/password fields in its popup
  // Our job: trigger the popup, then register the user in our DB

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
      const result = await loginWithPopup();

      if (!result) {
        setErrors({ general: 'Hmm, sign-up was cancelled. Give it another try!' });
        setLoading(false);
        return;
      }

      // 2. Register user in our database
      const { error: apiError } = await apiFetch('/api/users/register', {
        method: 'POST',
        body: JSON.stringify({
          name:  result.account.name || '',
          email: result.account.username,
          parentalConsent: false, // TODO: add parental consent flow for under-13s
        }),
      });

      if (apiError) {
        showError(`Something went wrong: ${apiError}`);
        setLoading(false);
        return;
      }

      success('Welcome to UNLOCK! 🎉 Let\'s set up your profile.');

      // 3. Redirect to onboarding
      router.push('/onboarding');
    } catch (err) {
      console.error('[RegisterForm]', err);
      showError('Something unexpected happened. Please try again.');
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
