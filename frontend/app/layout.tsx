// rebuilt 2026-05-07
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/design-system.css';
import '@/styles/globals.css';
import { ToastProvider } from '@/components/ui/Toast';

export const metadata: Metadata = {
  title: {
    template: '%s | UNLOCK',
    default:  'UNLOCK — Unlock Your Learning',
  },
  description:
    'AI-powered study plans for NSW Year 7–10 students. Personalised to your NESA outcomes. Built to make studying actually work.',
  keywords: ['NSW students', 'NESA', 'study plan', 'Year 7', 'Year 8', 'Year 9', 'Year 10', 'AI tutor'],
  openGraph: {
    title:       'UNLOCK — Unlock Your Learning',
    description: 'AI-powered study plans for NSW Year 7–10 students.',
    type:        'website',
    locale:      'en_AU',
  },
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-AU">
      <body className="min-h-screen bg-[#FFFFFF] font-body antialiased">
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
