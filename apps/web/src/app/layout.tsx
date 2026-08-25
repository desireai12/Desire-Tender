import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Droplets, Sun, FileText, Workflow, Award, Activity, Compass, ShieldCheck } from 'lucide-react';

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
      <body className={`${inter.variable} bg-[#f4f7f6] text-slate-900 min-h-screen flex flex-col antialiased relative bg-water-infra-flow overflow-x-hidden`}>
        {/* Dynamic High-Visibility Floating Water Infrastructure & Tender Bidding Icons */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <Droplets className="absolute top-[6%] left-[4%] w-20 h-20 text-emerald-800/40 animate-floating-icon-1" />
          <FileText className="absolute top-[18%] right-[5%] w-18 h-18 text-teal-800/40 animate-floating-icon-2" />
          <Sun className="absolute bottom-[20%] left-[6%] w-20 h-20 text-emerald-800/40 animate-floating-icon-1" />
          <Workflow className="absolute top-[45%] right-[8%] w-20 h-20 text-teal-800/40 animate-floating-icon-2" />
          <Award className="absolute bottom-[8%] right-[4%] w-18 h-18 text-emerald-800/40 animate-floating-icon-1" />
          <Activity className="absolute bottom-[38%] left-[2%] w-16 h-16 text-emerald-700/35 animate-floating-icon-2" />
          <Compass className="absolute top-[38%] left-[8%] w-16 h-16 text-teal-800/35 animate-floating-icon-1" />
        </div>

        {/* Foreground Workspace Container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
