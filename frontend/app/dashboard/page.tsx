'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@/components/ui/Button';
import Card, { CardTitle, CardBody, ProgressBar } from '@/components/ui/Card';
import { getCurrentAccount, isAuthenticated, logout, apiFetch } from '@/lib/auth';
import { clsx } from 'clsx';

// =============================================================================
// Dashboard (Week 1 Stub)
// Shows welcome, XP/streak summary, and links to upcoming features
// Full dashboard built in Week 4
// =============================================================================

interface UserProfile {
  user_id:            string;
  name:               string;
  email:              string;
  year_group:         number | null;
  enrolled_subjects:  string[];
  onboarding_complete: boolean;
  xp_total:           number;
  current_streak:     number;
  level:              number;
  badges:             string[];
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={clsx('animate-pulse bg-[#F0F2F5] rounded-xl', className)} />
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    async function init() {
      const auth = await isAuthenticated();
      if (!auth) {
        router.replace('/auth/login');
        return;
      }

      const { data } = await apiFetch<UserProfile>('/api/users/me');
      if (data) {
        setProfile(data);
        // If onboarding not complete, redirect back
        if (!data.onboarding_complete) {
          router.replace('/onboarding');
          return;
        }
      }

      setLoading(false);
    }

    init();
  }, [router]);

  async function handleLogout() {
    setLoggingOut(true);
    await logout();
  }

  // ---- Loading skeleton ----
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
        <TopNav loading />
        <main className="flex-1 content-container">
          <div className="flex flex-col gap-6">
            <SkeletonBlock className="h-32" />
            <div className="grid grid-cols-3 gap-4">
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
              <SkeletonBlock className="h-24" />
            </div>
            <SkeletonBlock className="h-48" />
          </div>
        </main>
      </div>
    );
  }

  const displayName = profile?.name?.split(' ')[0] || 'there';
  const xp          = profile?.xp_total    || 0;
  const streak      = profile?.current_streak || 0;
  const level       = profile?.level       || 1;
  const xpToNext    = level * 100;  // Simple: 100 XP per level

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col">
      {/* Top nav */}
      <TopNav
        name={profile?.name}
        xp={xp}
        level={level}
        onLogout={handleLogout}
        logoutLoading={loggingOut}
      />

      <main className="flex-1 content-container flex flex-col gap-6">
        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-[#1A3A52] to-[#1A3A52]/80 rounded-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-white/60 text-sm mb-1">Welcome back,</p>
              <h1 className="font-heading text-3xl font-bold">{displayName} 👋</h1>
              {profile?.year_group && (
                <p className="text-white/70 text-sm mt-1">Year {profile.year_group} · NSW</p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[#FFB81C] font-mono font-bold text-xl">
                Level {level}
              </span>
              {streak > 0 && (
                <span className="text-[#7FD856] text-sm font-semibold">
                  🔥 {streak} day streak
                </span>
              )}
            </div>
          </div>

          {/* XP progress to next level */}
          <div className="mt-5">
            <div className="flex justify-between text-xs text-white/60 mb-1.5">
              <span>{xp} XP</span>
              <span>{xpToNext} XP to Level {level + 1}</span>
            </div>
            <div className="h-2 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#FFB81C] rounded-full transition-all duration-700"
                style={{ width: `${Math.min(100, (xp / xpToNext) * 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick stats row */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { icon: '🔥', label: 'Day Streak',  value: streak || '0',  color: '#7FD856' },
            { icon: '⭐', label: 'Total XP',    value: xp,             color: '#FFB81C' },
            { icon: '🎖', label: 'Badges',      value: profile?.badges?.length || 0, color: '#00A8A8' },
          ].map(({ icon, label, value, color }) => (
            <Card key={label} variant="default" padding="md" className="text-center">
              <div className="text-2xl mb-1" aria-hidden="true">{icon}</div>
              <div className="font-mono font-bold text-xl" style={{ color }}>{value}</div>
              <div className="text-xs text-[#666666] mt-0.5">{label}</div>
            </Card>
          ))}
        </div>

        {/* Subjects enrolled */}
        {profile?.enrolled_subjects && profile.enrolled_subjects.length > 0 && (
          <Card variant="default" padding="md">
            <CardTitle className="mb-4">Your Subjects</CardTitle>
            <CardBody>
              <div className="flex flex-col gap-3">
                {profile.enrolled_subjects.map((subject) => (
                  <div key={subject} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-[#1A3A52] w-24 flex-shrink-0">
                      {subject}
                    </span>
                    <ProgressBar
                      value={0}
                      max={100}
                      variant="primary"
                      label={`${subject} mastery`}
                      className="flex-1"
                    />
                    <span className="text-xs text-[#999999] w-8 text-right">0%</span>
                  </div>
                ))}
              </div>
            </CardBody>
          </Card>
        )}

        {/* What's coming next */}
        <Card variant="outlined" padding="md">
          <CardTitle className="text-[#00A8A8] mb-1">📚 Your Study Plan is Coming!</CardTitle>
          <CardBody>
            <p className="mb-4">
              We&apos;re getting your personalised study plan ready.
              Diagnostic quizzes and your AI study plan will be available in Week 2.
            </p>
            <Button variant="primary" disabled className="opacity-50 cursor-not-allowed">
              Take Diagnostic Quiz → (Coming Week 2)
            </Button>
          </CardBody>
        </Card>

        {/* Coming soon features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🗓', title: 'Study Plan',    desc: 'AI-generated weekly plan. Coming Week 2.' },
            { icon: '📝', title: 'Practice Quizzes', desc: 'Test your knowledge. Coming Week 2.' },
            { icon: '📄', title: 'Upload Results', desc: 'Analyse your exam papers. Coming Week 3.' },
            { icon: '📊', title: 'Full Dashboard', desc: 'Track all progress. Coming Week 4.' },
          ].map(({ icon, title, desc }) => (
            <Card key={title} variant="ghost" padding="md" className="opacity-70">
              <div className="flex gap-3">
                <span className="text-2xl flex-shrink-0" aria-hidden="true">{icon}</span>
                <div>
                  <h4 className="font-heading font-semibold text-[#1A3A52] text-sm">{title}</h4>
                  <p className="text-xs text-[#999999] mt-0.5">{desc}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}

// ---- Top Navigation Bar ----
interface TopNavProps {
  name?:          string;
  xp?:            number;
  level?:         number;
  onLogout?:      () => void;
  logoutLoading?: boolean;
  loading?:       boolean;
}

function TopNav({ name, xp, level, onLogout, logoutLoading, loading }: TopNavProps) {
  return (
    <nav className="bg-[#1A3A52] h-16 flex items-center px-6 gap-4 sticky top-0 z-30">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="text-white text-xl" aria-hidden="true">🔓</span>
        <span className="text-white font-heading font-bold text-lg tracking-tight hidden sm:block">
          UNLOCK
        </span>
      </div>

      <div className="flex-1" />

      {/* Right side: XP + name + logout */}
      {!loading && (
        <div className="flex items-center gap-4">
          {xp !== undefined && level !== undefined && (
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[#FFB81C] font-mono text-sm font-bold">
                Lv.{level}
              </span>
              <span className="text-white/60 text-xs">·</span>
              <span className="text-white/80 font-mono text-sm">
                {xp} XP
              </span>
            </div>
          )}
          {name && (
            <span className="text-white/80 text-sm truncate max-w-[120px]">{name}</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            loading={logoutLoading}
            className="text-white/70 hover:text-white hover:bg-white/10 border border-white/20"
          >
            Sign Out
          </Button>
        </div>
      )}
    </nav>
  );
}

