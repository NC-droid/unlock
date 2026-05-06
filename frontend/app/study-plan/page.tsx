'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card, { CardTitle, CardBody } from '@/components/ui/Card';
import { isAuthenticated, apiFetch } from '@/lib/auth';
import { clsx } from 'clsx';

// =============================================================================
// Study Plan Page — Weekly AI-generated plan with task completion
// =============================================================================

interface StudyTask {
  subject:            string;
  topic:              string;
  activity:           string;
  estimated_minutes:  number;
  priority:           'high' | 'medium' | 'low';
}

interface DayPlan {
  day:   string;
  tasks: StudyTask[];
}

interface StudyPlan {
  planId:      string;
  weekNumber:  number;
  generatedBy: string;
  createdAt:   string;
  tasks:       DayPlan[];
  completions: string[];   // "Monday:0", "Tuesday:2", etc.
}

const DAYS_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const SUBJECT_COLOURS: Record<string, { bg: string; text: string; border: string }> = {
  English:   { bg: '#00A8A8/10', text: '#00A8A8', border: '#00A8A8' },
  Maths:     { bg: '#1A3A52/10', text: '#1A3A52', border: '#1A3A52' },
  Science:   { bg: '#7FD856/10', text: '#3E8A2A', border: '#7FD856' },
  History:   { bg: '#FFB81C/10', text: '#A07000', border: '#FFB81C' },
  Geography: { bg: '#E85D4A/10', text: '#C03020', border: '#E85D4A' },
};

const PRIORITY_LABELS: Record<string, { label: string; colour: string }> = {
  high:   { label: 'High',   colour: '#E85D4A' },
  medium: { label: 'Medium', colour: '#FFB81C' },
  low:    { label: 'Low',    colour: '#7FD856' },
};

const SUBJECT_ICONS: Record<string, string> = {
  English:   '📖',
  Maths:     '🔢',
  Science:   '🔬',
  History:   '🏛',
  Geography: '🌏',
};

function getDayStatus(day: string): 'today' | 'past' | 'future' {
  const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const today    = dayNames[new Date().getDay()];
  const todayIdx = DAYS_ORDER.indexOf(today);
  const dayIdx   = DAYS_ORDER.indexOf(day);
  if (dayIdx === todayIdx) return 'today';
  if (dayIdx < todayIdx)  return 'past';
  return 'future';
}

export default function StudyPlanPage() {
  const router = useRouter();
  const [plan, setPlan]         = useState<StudyPlan | null>(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGen]    = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [noPlan, setNoPlan]     = useState(false);
  const [completing, setCompleting] = useState<Set<string>>(new Set());

  const loadPlan = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await apiFetch<StudyPlan>('/api/study-plans/current');
    if (err) {
      // 404 means no plan yet
      setNoPlan(true);
    } else if (data) {
      setPlan(data);
      setNoPlan(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    async function init() {
      const auth = await isAuthenticated();
      if (!auth) { router.replace('/auth/login'); return; }
      await loadPlan();
    }
    init();
  }, [router, loadPlan]);

  async function handleGenerate() {
    setGen(true);
    setError(null);
    const { data, error: err } = await apiFetch<StudyPlan>('/api/study-plans/generate', {
      method: 'POST',
    });
    if (err || !data) {
      setError('Could not generate study plan. Please try again.');
    } else {
      setPlan(data);
      setNoPlan(false);
    }
    setGen(false);
  }

  async function toggleTask(day: string, taskIndex: number) {
    if (!plan) return;
    const key       = `${day}:${taskIndex}`;
    const wasComplete = plan.completions.includes(key);

    // Optimistic update
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        completions: wasComplete
          ? prev.completions.filter((c) => c !== key)
          : [...prev.completions, key],
      };
    });

    setCompleting((prev) => new Set(prev).add(key));

    const { error: err } = await apiFetch(`/api/study-plans/tasks/${day}/${taskIndex}`, {
      method: 'PATCH',
      body: JSON.stringify({ completed: !wasComplete }),
    });

    if (err) {
      // Revert on error
      setPlan((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          completions: wasComplete
            ? [...prev.completions, key]
            : prev.completions.filter((c) => c !== key),
        };
      });
    }

    setCompleting((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  const totalTasks = plan?.tasks.reduce((sum, d) => sum + d.tasks.length, 0) ?? 0;
  const doneTasks  = plan?.completions.length ?? 0;
  const pctDone    = totalTasks > 0 ? Math.round((doneTasks / totalTasks) * 100) : 0;

  // ---- Loading ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <PageHeader router={router} />
        <div className="max-w-3xl mx-auto px-4 py-8">
          {[1,2,3].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-2xl h-40 mb-4 shadow-sm" />
          ))}
        </div>
      </div>
    );
  }

  // ---- No plan yet ----
  if (noPlan) {
    return (
      <div className="min-h-screen bg-[#F8F9FA]">
        <PageHeader router={router} />
        <main className="max-w-xl mx-auto px-4 py-16 text-center">
          <div className="text-5xl mb-4">🗓</div>
          <h1 className="font-bold text-2xl text-[#1A3A52] mb-3">No Study Plan Yet</h1>
          <p className="text-[#666666] mb-8">
            Let Claude generate a personalised weekly study plan for you based on your
            subjects, confidence levels, and quiz results.
          </p>
          {error && <p className="text-[#E85D4A] text-sm mb-4">{error}</p>}
          <Button
            variant="primary"
            onClick={handleGenerate}
            loading={generating}
            className="px-8 py-3 text-base"
          >
            ✨ Generate My Study Plan
          </Button>
          <p className="text-xs text-[#999999] mt-3">
            Takes about 5 seconds · Powered by Claude AI
          </p>
        </main>
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <PageHeader router={router} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Week header + progress */}
        <div className="bg-gradient-to-r from-[#1A3A52] to-[#1A3A52]/80 rounded-2xl p-6 text-white mb-6">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-white/60 text-sm">Week {plan.weekNumber}</p>
              <h1 className="font-bold text-2xl">Your Study Plan</h1>
              <p className="text-white/60 text-xs mt-1">
                Generated by AI · {new Date(plan.createdAt).toLocaleDateString('en-AU', {
                  day: 'numeric', month: 'long'
                })}
              </p>
            </div>
            <div className="text-right">
              <div className="font-mono font-bold text-3xl text-[#7FD856]">{pctDone}%</div>
              <div className="text-white/60 text-xs">done</div>
            </div>
          </div>
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#7FD856] rounded-full transition-all duration-700"
              style={{ width: `${pctDone}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-white/50">
            <span>{doneTasks} of {totalTasks} tasks done</span>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="hover:text-white transition-colors disabled:opacity-50"
            >
              {generating ? '⏳ Generating…' : '🔄 Regenerate'}
            </button>
          </div>
        </div>

        {/* Day-by-day plan */}
        {DAYS_ORDER.map((dayName) => {
          const dayPlan   = plan.tasks.find((d) => d.day === dayName);
          const dayStatus = getDayStatus(dayName);
          if (!dayPlan || dayPlan.tasks.length === 0) return null;

          const dayDone  = dayPlan.tasks.filter((_, i) => plan.completions.includes(`${dayName}:${i}`)).length;
          const allDone  = dayDone === dayPlan.tasks.length;

          return (
            <div key={dayName} className="mb-5">
              {/* Day header */}
              <div className="flex items-center gap-3 mb-3">
                <div className={clsx(
                  'w-2 h-2 rounded-full',
                  dayStatus === 'today'  ? 'bg-[#7FD856] animate-pulse' :
                  dayStatus === 'past'   ? 'bg-[#C0C8D0]' :
                  'bg-[#E8ECF0]'
                )} />
                <h2 className={clsx(
                  'font-bold text-base',
                  dayStatus === 'today' ? 'text-[#1A3A52]' : 'text-[#666666]'
                )}>
                  {dayName}
                  {dayStatus === 'today' && (
                    <span className="ml-2 text-xs bg-[#7FD856]/20 text-[#3E8A2A] px-2 py-0.5 rounded-full font-normal">
                      Today
                    </span>
                  )}
                </h2>
                <span className="text-xs text-[#999999] ml-auto">
                  {dayDone}/{dayPlan.tasks.length} done
                </span>
              </div>

              <div className="flex flex-col gap-3">
                {dayPlan.tasks.map((task, taskIdx) => {
                  const key       = `${dayName}:${taskIdx}`;
                  const isDone    = plan.completions.includes(key);
                  const isBusy    = completing.has(key);
                  const colours   = SUBJECT_COLOURS[task.subject] ?? { bg: '#F0F2F5', text: '#666666', border: '#C0C8D0' };
                  const priority  = PRIORITY_LABELS[task.priority] ?? PRIORITY_LABELS.medium;

                  return (
                    <div
                      key={taskIdx}
                      className={clsx(
                        'bg-white rounded-xl border shadow-sm transition-all duration-200 p-4',
                        isDone ? 'opacity-60 border-[#E8ECF0]' : 'border-[#E8ECF0] hover:shadow-md',
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <button
                          onClick={() => toggleTask(dayName, taskIdx)}
                          disabled={isBusy}
                          aria-label={isDone ? 'Mark incomplete' : 'Mark complete'}
                          className={clsx(
                            'w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all',
                            isDone
                              ? 'bg-[#7FD856] border-[#7FD856]'
                              : 'border-[#C0C8D0] hover:border-[#7FD856]',
                            isBusy && 'opacity-50 cursor-wait'
                          )}
                        >
                          {isDone && <span className="text-white text-xs font-bold">✓</span>}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-xs font-semibold" style={{ color: colours.text }}>
                              {SUBJECT_ICONS[task.subject] ?? '📚'} {task.subject}
                            </span>
                            <span
                              className="text-xs px-1.5 py-0.5 rounded"
                              style={{ color: priority.colour, backgroundColor: `${priority.colour}15` }}
                            >
                              {priority.label} priority
                            </span>
                            <span className="text-xs text-[#999999] ml-auto">
                              ⏱ {task.estimated_minutes} min
                            </span>
                          </div>

                          <p className={clsx(
                            'text-sm font-semibold text-[#1A3A52] mb-0.5',
                            isDone && 'line-through text-[#999999]'
                          )}>
                            {task.topic}
                          </p>
                          <p className={clsx(
                            'text-xs text-[#666666] leading-relaxed',
                            isDone && 'line-through'
                          )}>
                            {task.activity}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* All done banner */}
        {pctDone === 100 && totalTasks > 0 && (
          <Card variant="default" padding="md" className="mt-4 bg-gradient-to-r from-[#7FD856]/20 to-[#00A8A8]/20 border-[#7FD856]/30 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="font-bold text-[#1A3A52] text-lg">All tasks done!</h3>
            <p className="text-[#666666] text-sm mt-1">Amazing work this week. Keep it up!</p>
          </Card>
        )}

        {/* Quick actions */}
        <div className="flex gap-3 mt-6">
          <Button variant="secondary" onClick={() => router.push('/quizzes')} className="flex-1">
            Take a Quiz
          </Button>
          <Button variant="primary" onClick={() => router.push('/dashboard')} className="flex-1">
            Dashboard →
          </Button>
        </div>
      </main>
    </div>
  );
}

function PageHeader({ router }: { router: ReturnType<typeof useRouter> }) {
  return (
    <nav className="bg-[#1A3A52] h-16 flex items-center px-6 gap-4 sticky top-0 z-30">
      <button
        onClick={() => router.push('/dashboard')}
        className="text-white/70 hover:text-white text-sm flex items-center gap-2 transition-colors"
      >
        ← Dashboard
      </button>
      <div className="flex items-center gap-2 ml-2">
        <span className="text-white text-xl">🔓</span>
        <span className="text-white font-bold text-lg tracking-tight hidden sm:block">UNLOCK</span>
      </div>
    </nav>
  );
}
