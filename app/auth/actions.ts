'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getSiteUrl, isSupabaseConfigured } from '@/lib/supabase/config';

function encodeMessage(message: string) {
  return encodeURIComponent(message);
}

function normalizeNextPath(value: FormDataEntryValue | null) {
  const nextPath = typeof value === 'string' ? value.trim() : '';

  if (!nextPath.startsWith('/')) {
    return '/inicio';
  }

  return nextPath;
}

function buildPath(pathname: string, params: Record<string, string | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const nextPath = normalizeNextPath(formData.get('next'));

  if (!email || !password) {
    redirect(
      buildPath('/login', {
        error: encodeMessage('Completa correo y contrasena.'),
        next: nextPath,
      })
    );
  }

  if (!isSupabaseConfigured()) {
    redirect(
      buildPath('/login', {
        error: encodeMessage('El inicio de sesion aun no esta disponible.'),
        next: nextPath,
      })
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect(
      buildPath('/login', {
        error: encodeMessage('No se pudo iniciar sesion en este momento.'),
        next: nextPath,
      })
    );
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(
      buildPath('/login', {
        error: encodeMessage(error.message),
        next: nextPath,
      })
    );
  }

  redirect(nextPath);
}

export async function registerAction(formData: FormData) {
  const fullName = String(formData.get('fullName') ?? '').trim();
  const documentNumber = String(formData.get('documentNumber') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const password = String(formData.get('password') ?? '');
  const confirmPassword = String(formData.get('confirmPassword') ?? '');
  const acceptedTerms = formData.get('acceptedTerms') === 'on';
  const nextPath = normalizeNextPath(formData.get('next'));

  if (!fullName || !documentNumber || !email || !password) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('Completa todos los campos obligatorios.'),
        next: nextPath,
      })
    );
  }

  if (password.length < 6) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('La contrasena debe tener al menos 6 caracteres.'),
        next: nextPath,
      })
    );
  }

  if (password !== confirmPassword) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('Las contrasenas no coinciden.'),
        next: nextPath,
      })
    );
  }

  if (!acceptedTerms) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('Debes aceptar los terminos y condiciones.'),
        next: nextPath,
      })
    );
  }

  if (!isSupabaseConfigured()) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('El registro aun no esta disponible.'),
        next: nextPath,
      })
    );
  }

  const supabase = await createServerSupabaseClient();

  if (!supabase) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage('No se pudo crear la cuenta en este momento.'),
        next: nextPath,
      })
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
      data: {
        full_name: fullName,
        document_number: documentNumber,
      },
    },
  });

  if (error) {
    redirect(
      buildPath('/registro', {
        error: encodeMessage(error.message),
        next: nextPath,
      })
    );
  }

  if (!data.session) {
    redirect(
      buildPath('/login', {
        message: encodeMessage(
          'Te enviamos un correo para confirmar tu cuenta antes de apostar.'
        ),
        next: nextPath,
      })
    );
  }

  redirect(nextPath);
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient();

  if (supabase) {
    await supabase.auth.signOut();
  }

  redirect('/');
}
