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
        {/* Dynamic Pure Visual Floating Water Infrastructure & Tender Bidding SVG Icons */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <Droplets className="absolute top-[8%] right-[8%] w-24 h-24 text-[#064e3b] opacity-40 animate-floating-icon-1 stroke-[1.8]" />
          <FileText className="absolute top-[30%] left-[3%] w-20 h-20 text-[#047857] opacity-45 animate-floating-icon-2 stroke-[1.8]" />
          <Sun className="absolute bottom-[18%] right-[6%] w-24 h-24 text-[#065f46] opacity-40 animate-floating-icon-1 stroke-[1.8]" />
          <Workflow className="absolute bottom-[35%] left-[2%] w-20 h-20 text-[#0d9488] opacity-40 animate-floating-icon-2 stroke-[1.8]" />
          <Award className="absolute top-[48%] right-[12%] w-20 h-20 text-[#047857] opacity-45 animate-floating-icon-1 stroke-[1.8]" />
          <Activity className="absolute top-[20%] left-[10%] w-16 h-16 text-[#064e3b] opacity-35 animate-floating-icon-2 stroke-[1.8]" />
        </div>

        {/* Foreground Workspace Container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
