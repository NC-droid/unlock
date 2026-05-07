'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card, { CardTitle, CardBody } from '@/components/ui/Card';
import { isAuthenticated, apiFetch } from '@/lib/auth';
import { clsx } from 'clsx';

// =============================================================================
// Quiz Listing Page
// Shows available diagnostic quizzes for the student's year group and subjects
// =============================================================================

interface Quiz {
  quizId:        string;
  title:         string;
  subject:       string;
  topic:         string;
  quizType:      string;
  yearGroup:     number;
  questionCount: number;
  attempts:      number;
  bestScore:     number | null;
}

const SUBJECT_COLOURS: Record<string, string> = {
  English:   '#00A8A8',
  Maths:     '#1A3A52',
  Science:   '#7FD856',
  History:   '#FFB81C',
  Geography: '#E85D4A',
};

const SUBJECT_ICONS: Record<string, string> = {
  English:   '📖',
  Maths:     '🔢',
  Science:   '🔬',
  History:   '🏛',
  Geography: '🌏',
};

function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) return null;
  const colour =
    score >= 80 ? '#7FD856' :
    score >= 60 ? '#FFB81C' :
    '#E85D4A';
  return (
    <span
      className="text-xs font-mono font-bold px-2 py-0.5 rounded-full"
      style={{ backgroundColor: `${colour}20`, color: colour }}
    >
      Best: {score}%
    </span>
  );
}

export default function QuizzesPage() {
  const router = useRouter();
  const [quizzes, setQuizzes]   = useState<Quiz[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const auth = await isAuthenticated();
      if (!auth) { router.replace('/auth/login'); return; }

      const { data, error: err, status } = await apiFetch<{ quizzes: Quiz[] }>('/api/quizzes');
      if (err || !data) {
        setError(`Error ${status}: ${err ?? 'No data returned'}`);
      } else {
        setQuizzes(data.quizzes);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  // Group quizzes by subject
  const bySubject = quizzes.reduce<Record<string, Quiz[]>>((acc, q) => {
    if (!acc[q.subject]) acc[q.subject] = [];
    acc[q.subject].push(q);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      {/* Header */}
      <nav className="bg-[#1A3A52] h-16 flex items-center px-6 gap-4 sticky top-0 z-30">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-white/70 hover:text-white text-sm flex items-center gap-2 transition-colors"
        >
          ← Dashboard
        </button>
        <div className="flex items-center gap-2 ml-2">
          <span className="text-white text-xl" aria-hidden="true">🔓</span>
          <span className="text-white font-bold text-lg tracking-tight hidden sm:block">UNLOCK</span>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="font-bold text-3xl text-[#1A3A52] mb-2">Diagnostic Quizzes</h1>
          <p className="text-[#666666]">
            Take a diagnostic quiz to help us understand your strengths and build your personalised study plan.
          </p>
        </div>

        {loading && (
          <div className="flex flex-col gap-4">
            {[1,2,3].map((i) => (
              <div key={i} className="animate-pulse bg-white rounded-2xl h-32 shadow-sm" />
            ))}
          </div>
        )}

        {error && (
          <Card variant="outlined" padding="lg" className="border-[#E85D4A]/40">
            <p className="text-[#E85D4A] font-medium">{error}</p>
          </Card>
        )}

        {!loading && !error && quizzes.length === 0 && (
          <Card variant="outlined" padding="lg">
            <CardBody>
              <p className="text-[#666666] text-center">
                No quizzes available for your year group yet. Check back soon!
              </p>
            </CardBody>
          </Card>
        )}

        {!loading && !error && Object.entries(bySubject).map(([subject, subjectQuizzes]) => (
          <div key={subject} className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl" aria-hidden="true">{SUBJECT_ICONS[subject] ?? '📚'}</span>
              <h2
                className="font-bold text-lg"
                style={{ color: SUBJECT_COLOURS[subject] ?? '#1A3A52' }}
              >
                {subject}
              </h2>
            </div>

            <div className="flex flex-col gap-3">
              {subjectQuizzes.map((quiz) => (
                <Card
                  key={quiz.quizId}
                  variant="default"
                  padding="md"
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => router.push(`/quizzes/take?id=${quiz.quizId}`)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span
                          className="text-xs font-semibold px-2 py-0.5 rounded-full"
                          style={{
                            backgroundColor: `${SUBJECT_COLOURS[subject] ?? '#1A3A52'}15`,
                            color: SUBJECT_COLOURS[subject] ?? '#1A3A52',
                          }}
                        >
                          {quiz.quizType === 'diagnostic' ? '🎯 Diagnostic' : '📝 Practice'}
                        </span>
                        <span className="text-xs text-[#999999]">Year {quiz.yearGroup}</span>
                        {quiz.attempts > 0 && (
                          <span className="text-xs text-[#999999]">
                            {quiz.attempts} attempt{quiz.attempts !== 1 ? 's' : ''}
                          </span>
                        )}
                        <ScoreBadge score={quiz.bestScore} />
                      </div>
                      <h3 className="font-semibold text-[#1A3A52] text-base leading-snug">
                        {quiz.title}
                      </h3>
                      <p className="text-sm text-[#666666] mt-0.5">{quiz.topic}</p>
                    </div>

                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <span className="text-xs text-[#999999]">{quiz.questionCount} questions</span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/quizzes/take?id=${quiz.quizId}`);
                        }}
                        className="whitespace-nowrap"
                      >
                        {quiz.attempts > 0 ? 'Retry' : 'Start'} →
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </main>
    </div>
  );
}
