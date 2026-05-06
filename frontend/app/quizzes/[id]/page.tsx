'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import { isAuthenticated, apiFetch } from '@/lib/auth';
import { clsx } from 'clsx';

// =============================================================================
// Quiz Taking Page — one question at a time
// =============================================================================

interface Question {
  questionId:    string;
  questionOrder: number;
  questionText:  string;
  questionType:  'multiple_choice' | 'short_answer';
  options:       string[];
  nesaOutcomeId: string | null;
}

interface QuizData {
  quizId:        string;
  title:         string;
  subject:       string;
  topic:         string;
  quizType:      string;
  yearGroup:     number;
  questionCount: number;
  questions:     Question[];
}

export default function QuizPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [quiz, setQuiz]               = useState<QuizData | null>(null);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [error, setError]             = useState<string | null>(null);

  // Quiz state
  const [currentIdx, setCurrentIdx]   = useState(0);
  const [answers, setAnswers]         = useState<Record<string, string>>({});
  const [selected, setSelected]       = useState<string>('');
  const [shortAnswer, setShortAnswer] = useState('');

  useEffect(() => {
    async function load() {
      const auth = await isAuthenticated();
      if (!auth) { router.replace('/auth/login'); return; }

      const { data, error: err } = await apiFetch<QuizData>(`/api/quizzes/${quizId}`);
      if (err || !data) {
        setError('Could not load this quiz. Please go back and try again.');
      } else {
        setQuiz(data);
      }
      setLoading(false);
    }
    load();
  }, [quizId, router]);

  const currentQuestion = quiz?.questions[currentIdx];
  const isLastQuestion  = quiz ? currentIdx === quiz.questions.length - 1 : false;
  const progress        = quiz ? ((currentIdx) / quiz.questions.length) * 100 : 0;

  function handleSelect(option: string) {
    setSelected(option);
  }

  function handleNext() {
    if (!currentQuestion) return;
    const answer = currentQuestion.questionType === 'multiple_choice' ? selected : shortAnswer;
    if (!answer.trim()) return;

    const newAnswers = { ...answers, [currentQuestion.questionId]: answer };
    setAnswers(newAnswers);
    setSelected('');
    setShortAnswer('');

    if (isLastQuestion) {
      submitQuiz(newAnswers);
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  const submitQuiz = useCallback(async (finalAnswers: Record<string, string>) => {
    if (!quiz) return;
    setSubmitting(true);

    const payload = {
      answers: Object.entries(finalAnswers).map(([questionId, studentAnswer]) => ({
        questionId,
        studentAnswer,
      })),
    };

    const { data, error: err } = await apiFetch(`/api/quizzes/${quiz.quizId}/submit`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (err || !data) {
      setError('Failed to submit quiz. Please try again.');
      setSubmitting(false);
      return;
    }

    // Navigate to results page, passing results via sessionStorage
    sessionStorage.setItem(`quiz-results-${quiz.quizId}`, JSON.stringify(data));
    router.push(`/quizzes/${quiz.quizId}/results`);
  }, [quiz, router]);

  const currentAnswer = currentQuestion?.questionType === 'multiple_choice'
    ? selected
    : shortAnswer;
  const canProceed = currentAnswer.trim().length > 0;

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">⏳</div>
          <p className="text-[#666666]">Loading quiz…</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-4xl mb-4">😕</div>
          <p className="text-[#E85D4A] font-medium mb-4">{error ?? 'Quiz not found.'}</p>
          <Button variant="primary" onClick={() => router.push('/quizzes')}>← Back to Quizzes</Button>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">📊</div>
          <p className="text-[#1A3A52] font-semibold text-lg">Grading your answers…</p>
          <p className="text-[#666666] mt-2">Just a moment!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Header */}
      <div className="bg-[#1A3A52] px-6 py-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={() => router.push('/quizzes')}
              className="text-white/60 hover:text-white text-sm transition-colors"
            >
              ✕ Exit Quiz
            </button>
            <span className="text-white/80 text-sm font-mono">
              {currentIdx + 1} / {quiz.questions.length}
            </span>
          </div>
          {/* Progress bar */}
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7FD856] rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-white/60 text-xs mt-2 truncate">{quiz.title}</p>
        </div>
      </div>

      {/* Question */}
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-2xl">
          {/* Question card */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0] p-6 mb-6">
            <div className="flex items-start gap-3 mb-5">
              <span className="bg-[#1A3A52] text-white text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
                {currentIdx + 1}
              </span>
              <p className="text-[#1A3A52] font-medium text-lg leading-snug">
                {currentQuestion?.questionText}
              </p>
            </div>

            {/* Multiple choice options */}
            {currentQuestion?.questionType === 'multiple_choice' && (
              <div className="flex flex-col gap-3">
                {currentQuestion.options.map((option, i) => {
                  const letters = ['A', 'B', 'C', 'D'];
                  const isSelected = selected === option;
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(option)}
                      className={clsx(
                        'w-full text-left p-4 rounded-xl border-2 transition-all duration-150 flex items-start gap-3',
                        isSelected
                          ? 'border-[#00A8A8] bg-[#00A8A8]/8'
                          : 'border-[#E8ECF0] hover:border-[#00A8A8]/50 hover:bg-[#F8F9FA]'
                      )}
                    >
                      <span
                        className={clsx(
                          'w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                          isSelected
                            ? 'bg-[#00A8A8] text-white'
                            : 'bg-[#F0F2F5] text-[#666666]'
                        )}
                      >
                        {letters[i]}
                      </span>
                      <span className={clsx(
                        'text-sm leading-snug mt-0.5',
                        isSelected ? 'text-[#1A3A52] font-medium' : 'text-[#444444]'
                      )}>
                        {option}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Short answer input */}
            {currentQuestion?.questionType === 'short_answer' && (
              <div>
                <label className="block text-sm text-[#666666] mb-2">Your answer:</label>
                <textarea
                  value={shortAnswer}
                  onChange={(e) => setShortAnswer(e.target.value)}
                  placeholder="Type your answer here…"
                  rows={3}
                  className="w-full border-2 border-[#E8ECF0] rounded-xl px-4 py-3 text-[#1A3A52] text-sm resize-none focus:outline-none focus:border-[#00A8A8] transition-colors"
                />
                <p className="text-xs text-[#999999] mt-1">
                  Tip: separate multiple items with commas if needed.
                </p>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => {
                if (currentIdx > 0) {
                  setCurrentIdx((i) => i - 1);
                  setSelected(answers[quiz.questions[currentIdx - 1].questionId] ?? '');
                  setShortAnswer(answers[quiz.questions[currentIdx - 1].questionId] ?? '');
                }
              }}
              disabled={currentIdx === 0}
              className="text-sm text-[#666666] disabled:opacity-30 hover:text-[#1A3A52] transition-colors"
            >
              ← Previous
            </button>

            <Button
              variant="primary"
              onClick={handleNext}
              disabled={!canProceed}
              loading={submitting}
              className="px-8"
            >
              {isLastQuestion ? 'Submit Quiz ✓' : 'Next Question →'}
            </Button>
          </div>

          {/* Question dots */}
          <div className="flex justify-center gap-1.5 mt-6 flex-wrap">
            {quiz.questions.map((q, i) => (
              <div
                key={i}
                className={clsx(
                  'w-2.5 h-2.5 rounded-full transition-all',
                  i === currentIdx
                    ? 'bg-[#1A3A52] scale-110'
                    : answers[q.questionId]
                    ? 'bg-[#7FD856]'
                    : 'bg-[#E8ECF0]'
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
