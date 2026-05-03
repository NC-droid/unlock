import type { Metadata } from 'next';
import LoginForm from '@/components/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[#1A3A52] font-heading text-3xl font-bold">
          Welcome back 👋
        </h1>
        <p className="text-[#666666] text-base leading-relaxed">
          Ready to keep the streak going? Sign in to see your study plan.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
