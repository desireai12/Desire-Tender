import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { FileText, Workflow, Award, ShieldCheck, Database, Compass, Layers } from 'lucide-react';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Desire Tender Intelligence | Water Infrastructure Procurement Platform',
  description: 'AI-powered tender eligibility evaluation, competitor intelligence, and costing estimation engine for water infrastructure procurement.',
  keywords: 'tender eligibility, water infrastructure, RAG AI, costing estimator, competitive intelligence, procurement',
  openGraph: {
    title: 'Desire Tender Intelligence',
    description: 'Instant Eligibility. Intelligent Costing. AI-powered water infrastructure procurement platform.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} bg-[#f4f6f8] text-slate-900 min-h-screen flex flex-col antialiased relative bg-blueprint-grid overflow-x-hidden`}>
        {/* Dynamic Moving Tender & Infrastructure Floating Background Icons */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <FileText className="absolute top-[12%] left-[8%] w-12 h-12 text-teal-600/15 animate-floating-icon-1" />
          <Workflow className="absolute top-[25%] right-[10%] w-14 h-14 text-sky-600/15 animate-floating-icon-2" />
          <Award className="absolute bottom-[20%] left-[12%] w-16 h-16 text-teal-700/15 animate-floating-icon-1" />
          <Compass className="absolute top-[55%] right-[15%] w-14 h-14 text-indigo-600/15 animate-floating-icon-2" />
          <Layers className="absolute bottom-[10%] right-[8%] w-12 h-12 text-emerald-600/15 animate-floating-icon-1" />
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
