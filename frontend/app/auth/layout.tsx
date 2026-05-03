import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex">
      {/* Left: Hero panel (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A3A52] flex-col justify-between p-12">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00A8A8] rounded-xl flex items-center justify-center">
            <span className="text-white text-xl font-bold">🔓</span>
          </div>
          <span className="text-white font-heading font-bold text-2xl tracking-tight">
            UNLOCK
          </span>
        </div>

        {/* Main hero text */}
        <div className="flex flex-col gap-6">
          <h1 className="text-white font-heading text-4xl font-bold leading-tight">
            Unlock Your
            <br />
            <span className="text-[#00A8A8]">Next Level</span>
          </h1>
          <p className="text-white/70 text-lg leading-relaxed">
            AI-powered study plans. Real progress.
            <br />
            Actual fun.
          </p>

          {/* Stats */}
          <div className="flex gap-8 mt-2">
            {[
              { value: '100%', label: 'NSW aligned' },
              { value: '7–10', label: 'Year groups' },
              { value: 'Free', label: 'To join' },
            ].map(({ value, label }) => (
              <div key={label} className="flex flex-col gap-1">
                <span className="text-[#FFB81C] font-mono font-bold text-2xl">{value}</span>
                <span className="text-white/60 text-sm">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom quote */}
        <blockquote className="border-l-4 border-[#00A8A8] pl-4">
          <p className="text-white/80 text-base italic leading-relaxed">
            &ldquo;UNLOCK helped me go from a C to a B+ in Maths in just 4 weeks.&rdquo;
          </p>
          <footer className="text-white/50 text-sm mt-2">— Year 9 student, NSW</footer>
        </blockquote>
      </div>

      {/* Right: Auth form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-9 h-9 bg-[#00A8A8] rounded-xl flex items-center justify-center">
              <span className="text-white text-lg">🔓</span>
            </div>
            <span className="text-[#1A3A52] font-heading font-bold text-xl">UNLOCK</span>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
