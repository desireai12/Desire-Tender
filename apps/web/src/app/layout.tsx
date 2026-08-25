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
      <body className={`${inter.variable} bg-[#f4f7f6] text-slate-900 min-h-screen flex flex-col antialiased relative bg-blueprint-grid overflow-x-hidden`}>
        {/* Dynamic Floating Water Infrastructure & Tender Bidding Status Badges */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <div className="absolute top-[12%] right-[8%] bg-[#064e3b] text-white px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/40 flex items-center space-x-2 text-xs font-bold animate-floating-icon-1">
            <Droplets className="w-4 h-4 text-emerald-300" />
            <span>JJM Water Pipeline Network • Active</span>
          </div>

          <div className="absolute top-[32%] left-[3%] bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg border border-teal-500/40 flex items-center space-x-2 text-xs font-bold animate-floating-icon-2">
            <FileText className="w-4 h-4 text-teal-300" />
            <span>Tender Bid Specs Verified</span>
          </div>

          <div className="absolute bottom-[16%] right-[6%] bg-[#064e3b] text-white px-3 py-1.5 rounded-xl shadow-lg border border-emerald-400/40 flex items-center space-x-2 text-xs font-bold animate-floating-icon-1">
            <Sun className="w-4 h-4 text-amber-300" />
            <span>Solar PV Pump Scheme (KUSUM)</span>
          </div>

          <div className="absolute bottom-[32%] left-[2%] bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg border border-teal-500/40 flex items-center space-x-2 text-xs font-bold animate-floating-icon-2">
            <Award className="w-4 h-4 text-emerald-300" />
            <span>Class-A License Compliant</span>
          </div>
        </div>

        {/* Foreground Workspace Container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
