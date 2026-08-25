import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import { Droplets, Sun, FileText, Workflow, Award, Activity, Zap, Gauge } from 'lucide-react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
  title: 'Desire Energy — Tender Intelligence System',
  description: 'Water Infrastructure Lifecycle, Qualification & Costing Engine',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable} light`}>
      <body className="font-sans antialiased text-slate-900 bg-[#f4f7f6] dark:bg-[#060b14] min-h-screen relative overflow-x-hidden transition-colors duration-300">
        {/* Dynamic Floating Water Infrastructure Background Canvas */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          {/* Drifting Floating Icons */}
          <div className="absolute top-[8%] left-[4%] animate-floating-icon-1 text-[#064e3b] dark:text-[#34d399]">
            <Droplets className="w-11 h-11 stroke-[1.5]" />
          </div>

          <div className="absolute top-[18%] right-[6%] animate-floating-icon-2 text-[#047857] dark:text-[#2dd4bf]">
            <Sun className="w-12 h-12 stroke-[1.5]" />
          </div>

          <div className="absolute top-[42%] left-[2%] animate-floating-icon-2 text-[#065f46] dark:text-[#34d399]">
            <FileText className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div className="absolute top-[58%] right-[4%] animate-floating-icon-1 text-[#0d9488] dark:text-[#2dd4bf]">
            <Workflow className="w-12 h-12 stroke-[1.5]" />
          </div>

          <div className="absolute bottom-[22%] left-[5%] animate-floating-icon-1 text-[#047857] dark:text-[#34d399]">
            <Award className="w-11 h-11 stroke-[1.5]" />
          </div>

          <div className="absolute bottom-[10%] right-[7%] animate-floating-icon-2 text-[#064e3b] dark:text-[#2dd4bf]">
            <Activity className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div className="absolute top-[75%] left-[22%] animate-floating-icon-2 text-[#065f46] dark:text-[#34d399]">
            <Zap className="w-10 h-10 stroke-[1.5]" />
          </div>

          <div className="absolute top-[28%] left-[45%] animate-floating-icon-1 text-[#0d9488] dark:text-[#2dd4bf]">
            <Gauge className="w-11 h-11 stroke-[1.5]" />
          </div>
        </div>

        {/* Main Application Interface Container */}
        <div className="relative z-10">
          {children}
        </div>
      </body>
    </html>
  );
}
