'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { Metadata } from 'next';
import Button from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { isAuthenticated, apiFetch } from '@/lib/auth';
import { clsx } from 'clsx';

// =============================================================================
// Onboarding Page
// Step 1: Select year level (7–10)
// Step 2: Select subjects
// Step 3: Rate confidence per subject (1–5)
// =============================================================================

type Subject = 'English' | 'Maths' | 'Science' | 'History' | 'Geography';

const SUBJECTS: Subject[] = ['English', 'Maths', 'Science', 'History', 'Geography'];

const SUBJECT_ICONS: Record<Subject, string> = {
  English: '📖',
  Maths:   '🔢',
  Science: '🔬',
  History: '🏛',
  Geography: '🌏',
};

const CONFIDENCE_LABELS = ['', 'Need lots of help', 'Some struggles', 'Getting there', 'Pretty good', 'I\'ve got this!'];
const CONFIDENCE_COLORS  = ['', '#FF6B6B', '#FFB81C', '#FFB81C', '#7FD856', '#00A8A8'];

type OnboardingStep = 'year' | 'subjects' | 'confidence' | 'done';

export default function OnboardingPage() {
  const router = useRouter();
  const { success, error: showError } = useToast();

  const [step, setStep]                   = useState<OnboardingStep>('year');
  const [yearGroup, setYearGroup]         = useState<number | null>(null);
  const [subjects, setSubjects]           = useState<Subject[]>([]);
  const [confidence, setConfidence]       = useState<Partial<Record<Subject, number>>>({});
  const [loading, setLoading]             = useState(false);
  const [authChecked, setAuthChecked]     = useState(false);

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    isAuthenticated().then((auth) => {
      if (!auth) router.replace('/auth/login');
      else setAuthChecked(true);
    });
  }, [router]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#00A8A8] border-t-transparent rounded-full" />
      </div>
    );
  }

  // ---- Step: Year ----
  if (step === 'year') {
    return (
      <OnboardingShell step={1} totalSteps={3} title="What year are you in?">
        <p className="text-[#666666] text-center mb-8">
          We&apos;ll personalise your study plan based on your NESA outcomes.
        </p>
        <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
          {[7, 8, 9, 10].map((y) => (
            <button
              key={y}
              onClick={() => setYearGroup(y)}
              className={clsx(
                'h-20 rounded-xl font-heading font-bold text-2xl',
                'border-2 transition-all duration-200',
                'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
                yearGroup === y
                  ? 'bg-[#00A8A8] border-[#00A8A8] text-white shadow-[0_4px_12px_rgba(0,168,168,0.30)] scale-105'
                  : 'bg-white border-[#E0E0E0] text-[#1A3A52] hover:border-[#00A8A8] hover:text-[#00A8A8]'
              )}
              aria-pressed={yearGroup === y}
            >
              Year {y}
            </button>
          ))}
        </div>
        <div className="mt-10 flex justify-center">
          <Button
            variant="primary"
            size="lg"
            onClick={() => setStep('subjects')}
            disabled={yearGroup === null}
          >
            Next: Pick My Subjects →
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  // ---- Step: Subjects ----
  if (step === 'subjects') {
    function toggleSubject(s: Subject) {
      setSubjects((prev) =>
        prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
      );
    }

    return (
      <OnboardingShell step={2} totalSteps={3} title="Which subjects are you taking?">
        <p className="text-[#666666] text-center mb-8">
          Pick all that apply — you can add more later.
        </p>
        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {SUBJECTS.map((s) => {
            const selected = subjects.includes(s);
            return (
              <button
                key={s}
                onClick={() => toggleSubject(s)}
                className={clsx(
                  'flex items-center gap-4 px-5 py-4 rounded-xl',
                  'border-2 transition-all duration-200 text-left',
                  'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
                  selected
                    ? 'bg-[#00A8A8]/10 border-[#00A8A8] shadow-[0_2px_8px_rgba(0,168,168,0.15)]'
                    : 'bg-white border-[#E0E0E0] hover:border-[#00A8A8]'
                )}
                aria-pressed={selected}
              >
                <span className="text-2xl" aria-hidden="true">{SUBJECT_ICONS[s]}</span>
                <span className={clsx('font-heading font-semibold text-lg', selected ? 'text-[#00A8A8]' : 'text-[#1A3A52]')}>
                  {s}
                </span>
                {selected && (
                  <span className="ml-auto text-[#00A8A8] font-bold" aria-hidden="true">✓</span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-10 flex justify-between max-w-sm mx-auto">
          <Button variant="secondary" onClick={() => setStep('year')}>← Back</Button>
          <Button
            variant="primary"
            onClick={() => setStep('confidence')}
            disabled={subjects.length === 0}
          >
            Next: Rate Confidence →
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  // ---- Step: Confidence ----
  if (step === 'confidence') {
    const currentSubject  = subjects.find((s) => confidence[s] === undefined) || null;
    const allRated = subjects.every((s) => confidence[s] !== undefined);

    function rateConfidence(subject: Subject, level: number) {
      setConfidence((prev) => ({ ...prev, [subject]: level }));
    }

    async function handleFinish() {
      setLoading(true);
      const { error: apiError } = await apiFetch('/api/users/me', {
        method: 'PATCH',
        body: JSON.stringify({
          yearGroup,
          enrolledSubjects:     subjects,
          confidencePerSubject: confidence,
          onboardingComplete:   true,
        }),
      });

      if (apiError) {
        showError('Hmm, something went wrong saving your profile. Try again?');
        setLoading(false);
        return;
      }

      success('Profile saved! Your study plan will be ready soon. 🎉');
      router.push('/dashboard');
    }

    return (
      <OnboardingShell step={3} totalSteps={3} title="How confident are you?">
        <p className="text-[#666666] text-center mb-8">
          Be honest — this helps us build a plan that actually helps.
        </p>
        <div className="flex flex-col gap-6 max-w-sm mx-auto">
          {subjects.map((s) => {
            const level = confidence[s];
            const isActive = s === currentSubject;
            return (
              <div
                key={s}
                className={clsx(
                  'rounded-xl border-2 p-4 transition-all duration-200',
                  level !== undefined
                    ? 'border-[#00A8A8] bg-[#00A8A8]/5'
                    : isActive
                    ? 'border-[#FFB81C] bg-[#FFB81C]/5'
                    : 'border-[#E0E0E0] bg-white opacity-60'
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-xl" aria-hidden="true">{SUBJECT_ICONS[s]}</span>
                  <span className="font-heading font-semibold text-[#1A3A52]">{s}</span>
                  {level !== undefined && (
                    <span className="ml-auto text-xs font-semibold" style={{ color: CONFIDENCE_COLORS[level] }}>
                      {CONFIDENCE_LABELS[level]}
                    </span>
                  )}
                </div>
                <div className="flex gap-2" role="group" aria-label={`${s} confidence level`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      onClick={() => rateConfidence(s, n)}
                      className={clsx(
                        'flex-1 h-10 rounded-lg font-mono font-bold text-sm',
                        'border-2 transition-all duration-150',
                        'focus-visible:outline focus-visible:outline-3 focus-visible:outline-[#00A8A8] focus-visible:outline-offset-2',
                        level === n
                          ? 'text-white border-transparent'
                          : 'bg-white border-[#E0E0E0] text-[#999999] hover:border-current'
                      )}
                      style={
                        level === n
                          ? { backgroundColor: CONFIDENCE_COLORS[n], borderColor: CONFIDENCE_COLORS[n] }
                          : {}
                      }
                      aria-pressed={level === n}
                      aria-label={`${n} — ${CONFIDENCE_LABELS[n]}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-10 flex justify-between max-w-sm mx-auto">
          <Button variant="secondary" onClick={() => setStep('subjects')}>← Back</Button>
          <Button
            variant="primary"
            loading={loading}
            onClick={handleFinish}
            disabled={!allRated || loading}
          >
            {loading ? 'Saving…' : 'Let\'s Go! 🚀'}
          </Button>
        </div>
      </OnboardingShell>
    );
  }

  return null;
}

// ---- Shared onboarding shell ----
function OnboardingShell({
  step,
  totalSteps,
  title,
  children,
}: {
  step:       number;
  totalSteps: number;
  title:      string;
  children:   React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-start bg-[#F8F9FA] py-12 px-4">
      {/* Logo */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-9 h-9 bg-[#00A8A8] rounded-xl flex items-center justify-center">
          <span className="text-white text-lg">🔓</span>
        </div>
        <span className="text-[#1A3A52] font-heading font-bold text-xl">UNLOCK</span>
      </div>

      {/* Progress indicator */}
      <div className="flex gap-2 mb-8" aria-label={`Step ${step} of ${totalSteps}`}>
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={clsx(
              'h-2 rounded-full transition-all duration-300',
              i + 1 <= step ? 'bg-[#00A8A8] w-8' : 'bg-[#E0E0E0] w-4'
            )}
          />
        ))}
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-[0_4px_32px_rgba(0,0,0,0.08)] p-8 w-full max-w-lg">
        <h2 className="text-[#1A3A52] font-heading text-2xl font-bold text-center mb-1">
          {title}
        </h2>
        {children}
      </div>

      <p className="mt-6 text-xs text-[#999999]">
        Step {step} of {totalSteps} — Almost there!
      </p>
    </div>
  );
}
