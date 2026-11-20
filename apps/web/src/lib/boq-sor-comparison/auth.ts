// Authentication & Session Guard for BOQ SOR Comparison API
// Enforces the identical session token verification as the primary API route (...[path]/route.ts)
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export interface SessionTokenPayload {
  employee_id: string;
  role: string;
  full_name?: string;
  exp: number;
}

function getSessionSecret(): string {
  const raw = (process.env.SESSION_SECRET || process.env.SECRET_KEY || '').trim();
  if (!raw || raw.length < 32) {
    // Fallback secret for staging/dev if not set in local env
    return 'desire-tender-secret-key-32-chars-minimum-guard-2026';
  }
  return raw;
}

export function verifySessionToken(token: string): SessionTokenPayload | null {
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadBase64, signature] = token.split('.');
  if (!payloadBase64 || !signature) return null;

  try {
    const secret = getSessionSecret();
    const expectedSignature = crypto.createHmac('sha256', secret).update(payloadBase64).digest('base64url');
    if (signature !== expectedSignature) return null;

    const payload: SessionTokenPayload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export async function getSessionFromRequest(req: Request): Promise<SessionTokenPayload | null> {
  let rawToken = '';
  const authHeader = req.headers.get('authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.substring(7).trim();
  } else if (req.headers.get('x-session-token')) {
    rawToken = req.headers.get('x-session-token')!.trim();
  } else {
    const cookiesStr = req.headers.get('cookie') || '';
    cookiesStr.split(';').forEach((c) => {
      const [k, v] = c.split('=');
      if (k && k.trim() === 'desire_session_token' && v) {
        rawToken = decodeURIComponent(v.trim());
      }
    });
  }

  if (!rawToken) {
    // In local development mode, allow session bypass if initiated from same origin browser dev
    if (process.env.NODE_ENV === 'development') {
      return {
        employee_id: 'DEV_USER',
        role: 'Administrator',
        full_name: 'Development Engineer',
        exp: Math.floor(Date.now() / 1000) + 86400,
      };
    }
    return null;
  }

  return verifySessionToken(rawToken);
}

export async function enforceApiAuth(req: Request): Promise<{ session: SessionTokenPayload | null; errorResponse: Response | null }> {
  const session = await getSessionFromRequest(req);
  if (!session) {
    return {
      session: null,
      errorResponse: NextResponse.json(
        {
          status: 'error',
          error_type: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in with valid credentials.',
        },
        { status: 401 },
      ),
    };
  }
  return { session, errorResponse: null };
}

