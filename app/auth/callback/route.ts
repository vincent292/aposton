import { NextResponse, type NextRequest } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function getSafeNextPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/inicio';
  }

  return value;
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const nextPath = getSafeNextPath(requestUrl.searchParams.get('next'));

  if (!code) {
    return NextResponse.redirect(new URL('/login?error=No%20se%20recibio%20codigo%20de%20acceso.', requestUrl.origin));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = supabase
    ? await supabase.auth.exchangeCodeForSession(code)
    : { error: new Error('No se pudo iniciar sesion.') };

  if (error) {
    const loginUrl = new URL('/login', requestUrl.origin);
    loginUrl.searchParams.set('error', error.message);
    loginUrl.searchParams.set('next', nextPath);

    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.redirect(new URL(nextPath, requestUrl.origin));
}
