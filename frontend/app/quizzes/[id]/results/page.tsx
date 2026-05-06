'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card, { CardTitle, CardBody } from '@/components/ui/Card';
import { clsx } from 'clsx';

// =============================================================================
// Quiz Results Page
// Reads results from sessionStorage (set by quiz page after submission)
// =============================================================================

interface GradedAnswer {
  questionId:    string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect:     boolean;
  explanation:   string;
  outcomeId:     string | null;
}

interface QuizResults {
  score: {
    correct:      number;
    total:        number;
    scorePercent: number;
    xpAwarded:    number;
  };
  outcomeBreakdown: Record<string, number>;
  answers:          GradedAnswer[];
  gamification: {
    xp_total:       number;
    level:          number;
    current_streak: number;
  } | null;
}

function ScoreRing({ percent }: { percent: number }) {
  const radius      = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDash  = (percent / 100) * circumference;
  const colour =
    percent >= 80 ? '#7FD856' :
    percent >= 60 ? '#FFB81C' :
    '#E85D4A';

  return (
    <div className="relative flex items-center justify-center" style={{ width: 140, height: 140 }}>
      <svg width="140" height="140" className="-rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#E8ECF0" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={radius} fill="none"
          stroke={colour} strokeWidth="10"
          strokeDasharray={`${strokeDash} ${circumference}`}
          strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-mono font-bold text-3xl" style={{ color: colour }}>{percent}%</div>
        <div className="text-xs text-[#666666]">score</div>
      </div>
    </div>
  );
}

export default function QuizResultsPage() {
  const router = useRouter();
  const params = useParams();
  const quizId = params.id as string;

  const [results, setResults] = useState<QuizResults | null>(null);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem(`quiz-results-${quizId}`);
    if (stored) {
      try {
        setResults(JSON.parse(stored));
      } catch {
        router.push('/quizzes');
      }
    } else {
      router.push('/quizzes');
    }
  }, [quizId, router]);

  if (!results) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex items-center justify-center">
        <div className="animate-spin text-3xl">⏳</div>
      </div>
    );
  }

  const { score, answers, gamification } = results;
  const message =
    score.scorePercent >= 90 ? "Outstanding! 🎉"  :
    score.scorePercent >= 70 ? "Great work! 🌟"   :
    score.scorePercent >= 50 ? "Good effort! 💪"  :
    "Keep practising! 📚";

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <nav className="bg-[#1A3A52] h-16 flex items-center px-6">
        <div className="flex items-center gap-2">
          <span className="text-white text-xl">🔓</span>
          <span className="text-white font-bold text-lg tracking-tight hidden sm:block">UNLOCK</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Score card */}
        <Card variant="default" padding="lg" className="text-center mb-6 overflow-hidden">
          <div className="bg-gradient-to-b from-[#1A3A52]/5 to-transparent -mx-6 -mt-6 px-6 pt-8 pb-4 mb-4">
            <h1 className="font-bold text-2xl text-[#1A3A52] mb-1">Quiz Complete!</h1>
            <p className="text-[#666666]">{message}</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <ScoreRing percent={score.scorePercent} />

            <div className="flex gap-6 text-center">
              <div>
                <div className="font-mono font-bold text-2xl text-[#1A3A52]">
                  {score.correct}/{score.total}
                </div>
                <div className="text-xs text-[#666666]">correct</div>
              </div>
              <div className="w-px bg-[#E8ECF0]" />
              <div>
                <div className="font-mono font-bold text-2xl text-[#FFB81C]">
                  +{score.xpAwarded}
                </div>
                <div className="text-xs text-[#666666]">XP earned</div>
              </div>
              {gamification && (
                <>
                  <div className="w-px bg-[#E8ECF0]" />
                  <div>
                    <div className="font-mono font-bold text-2xl text-[#00A8A8]">
                      Lv.{gamification.level}
                    </div>
                    <div className="text-xs text-[#666666]">{gamification.xp_total} total XP</div>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <Button
            variant="primary"
            onClick={() => router.push('/study-plan')}
            className="flex-1"
          >
            📅 View My Study Plan
          </Button>
          <Button
            variant="secondary"
            onClick={() => router.push('/quizzes')}
            className="flex-1"
          >
            ← More Quizzes
          </Button>
        </div>

        {/* Answer review */}
        <Card variant="default" padding="md">
          <div
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setShowAnswers((v) => !v)}
          >
            <CardTitle className="mb-0">Review Answers</CardTitle>
            <span className="text-[#666666] text-sm">{showAnswers ? '▲ Hide' : '▼ Show'}</span>
          </div>

          {showAnswers && (
            <CardBody className="mt-4">
              <div className="flex flex-col gap-5">
                {answers.map((answer, i) => (
                  <div
                    key={answer.questionId}
                    className={clsx(
                      'p-4 rounded-xl border-l-4',
                      answer.isCorrect
                        ? 'bg-[#7FD856]/8 border-[#7FD856]'
                        : 'bg-[#E85D4A]/8 border-[#E85D4A]'
                    )}
                  >
                    <div className="flex items-start gap-2 mb-2">
                      <span className="text-lg flex-shrink-0">
                        {answer.isCorrect ? '✅' : '❌'}
                      </span>
                      <span className="text-xs font-semibold text-[#666666] uppercase tracking-wide mt-1">
                        Question {i + 1}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-sm pl-7">
                      <div>
                        <span className="text-[#666666]">Your answer: </span>
                        <span className={clsx(
                          'font-medium',
                          answer.isCorrect ? 'text-[#5AA830]' : 'text-[#C44A38]'
                        )}>
                          {answer.studentAnswer || '(no answer)'}
                        </span>
                      </div>
                      {!answer.isCorrect && (
                        <div>
                          <span className="text-[#666666]">Correct answer: </span>
                          <span className="font-medium text-[#5AA830]">{answer.correctAnswer}</span>
                        </div>
                      )}
                      <div className="pt-1.5 mt-1.5 border-t border-[#E8ECF0]">
                        <p className="text-[#555555] leading-relaxed">
                          💡 {answer.explanation}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardBody>
          )}
        </Card>

        {/* Study plan nudge */}
        {score.scorePercent < 70 && (
          <Card variant="outlined" padding="md" className="mt-4 border-[#FFB81C]/50 bg-[#FFB81C]/5">
            <CardBody>
              <p className="text-sm text-[#1A3A52]">
                <strong>📚 Want to improve?</strong> We'll use these results to focus your study plan
                on the areas where you need the most practice.
              </p>
              <Button
                variant="primary"
                size="sm"
                className="mt-3"
                onClick={() => router.push('/study-plan')}
              >
                Generate My Study Plan
              </Button>
            </CardBody>
          </Card>
        )}
      </main>
    </div>
  );
}
