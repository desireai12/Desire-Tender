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
        {/* Dynamic Sleek Medium-Sized Floating Water Infrastructure & Tender Bidding SVG Icons */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <Droplets className="absolute top-[7%] right-[12%] w-12 h-12 text-[#064e3b] opacity-65 animate-floating-icon-1 stroke-[2]" />
          <FileText className="absolute top-[28%] left-[2%] w-11 h-11 text-[#047857] opacity-65 animate-floating-icon-2 stroke-[2]" />
          <Sun className="absolute bottom-[16%] right-[8%] w-12 h-12 text-[#065f46] opacity-65 animate-floating-icon-1 stroke-[2]" />
          <Workflow className="absolute bottom-[30%] left-[1.5%] w-11 h-11 text-[#0d9488] opacity-65 animate-floating-icon-2 stroke-[2]" />
          <Award className="absolute top-[45%] right-[14%] w-11 h-11 text-[#047857] opacity-65 animate-floating-icon-1 stroke-[2]" />
          <Activity className="absolute top-[18%] left-[8%] w-10 h-10 text-[#064e3b] opacity-60 animate-floating-icon-2 stroke-[2]" />
        </div>

        {/* Foreground Workspace Container */}
        <div className="relative z-10 min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  );
}
