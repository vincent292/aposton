'use client';

import { useState } from 'react';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type GoogleSignInButtonProps = {
  nextPath: string;
  label?: string;
};

export function GoogleSignInButton({
  nextPath,
  label = 'Continuar con Google',
}: GoogleSignInButtonProps) {
  const [pending, setPending] = useState(false);

  async function handleGoogleSignIn() {
    const supabase = createBrowserSupabaseClient();

    if (!supabase) {
      window.alert('El inicio con Google aun no esta disponible.');
      return;
    }

    setPending(true);

    const callbackUrl = new URL('/auth/callback', window.location.origin);
    callbackUrl.searchParams.set('next', nextPath);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl.toString(),
      },
    });

    if (error) {
      setPending(false);
      window.alert(error.message);
    }
  }

  return (
    <button
      type="button"
      className="oauth-btn"
      onClick={handleGoogleSignIn}
      disabled={pending}
    >
      <span className="oauth-google-mark" aria-hidden="true">
        G
      </span>
      <span>{pending ? 'Redirigiendo a Google...' : label}</span>
    </button>
  );
}
