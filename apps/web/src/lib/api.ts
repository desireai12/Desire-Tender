// Desire Tender Intelligence System — API Base URL Configuration

export const API_BASE_URL = 
  process.env.NEXT_PUBLIC_API_URL || 
  (typeof window !== 'undefined' ? window.location.origin : '');

/**
 * Safe JSON fetch wrapper that guarantees valid JSON parsing
 * and prevents "Unexpected token '<', '<!DOCTYPE '... is not valid JSON" errors on Vercel.
 */
export async function safeFetchJson(url: string, options?: RequestInit): Promise<any> {
  try {
    const res = await fetch(url, options);
    const contentType = res.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      const text = await res.text();
      // Handle HTML 404 or non-JSON fallback gracefully
      throw new Error(`Server returned non-JSON response (${res.status}). Please check API URL or login credentials.`);
    }

    return await res.json();
  } catch (err: any) {
    throw err;
  }
}
