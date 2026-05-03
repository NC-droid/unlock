'use client';

// Root page — redirect to login or dashboard based on auth state
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    isAuthenticated().then((auth) => {
      if (auth) {
        router.replace('/dashboard');
      } else {
        router.replace('/auth/login');
      }
    });
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-[#00A8A8] flex items-center justify-center animate-pulse">
          <span className="text-white text-2xl">🔓</span>
        </div>
        <p className="text-[#666666] text-sm">Loading UNLOCK…</p>
      </div>
    </div>
  );
}
