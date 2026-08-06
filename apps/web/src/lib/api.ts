// If NEXT_PUBLIC_API_URL is provided, use it.
// Otherwise, on Vercel (same-domain deployment), use relative path "" so /api/v1 calls Vercel Serverless.
// On local dev without NEXT_PUBLIC_API_URL, fallback to http://localhost:8000.

export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL !== undefined
    ? process.env.NEXT_PUBLIC_API_URL
    : (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:8000');
