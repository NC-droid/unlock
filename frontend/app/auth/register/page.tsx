import type { Metadata } from 'next';
import RegisterForm from '@/components/auth/RegisterForm';

export const metadata: Metadata = {
  title: 'Create Account',
};

export default function RegisterPage() {
  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="text-[#1A3A52] font-heading text-3xl font-bold">
          Let&apos;s get you started!
        </h1>
        <p className="text-[#666666] text-base leading-relaxed">
          Join NSW students already using UNLOCK to study smarter.
          It&apos;s free to get started — no credit card needed.
        </p>
      </div>

      <RegisterForm />
    </div>
  );
}
