import { handleSorComparisonRoute } from '@/lib/boq-sor-comparison/api/route';

export async function GET(req: Request) {
  return handleSorComparisonRoute(req, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  });
}

export async function POST(req: Request) {
  return handleSorComparisonRoute(req, {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  });
}
