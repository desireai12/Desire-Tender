import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

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
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${inter.variable} bg-slate-50 text-slate-800 min-h-screen flex flex-col antialiased`}>
        {children}
      </body>
    </html>
  );
}
