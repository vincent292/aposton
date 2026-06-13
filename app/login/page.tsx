import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AppShell';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SubmitButton } from '@/components/SubmitButton';
import { loginAction } from '@/app/auth/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getViewer } from '@/lib/quiniela/data';

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
    message?: string;
  }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const nextPath =
    typeof params.next === 'string' && params.next.startsWith('/')
      ? params.next
      : '/inicio';

  if (viewer) {
    redirect(nextPath);
  }

  const errorMessage =
    typeof params.error === 'string' ? decodeURIComponent(params.error) : null;
  const infoMessage =
    typeof params.message === 'string' ? decodeURIComponent(params.message) : null;

  return (
    <AuthShell mode="login">
      <h2>Iniciar sesion</h2>
      <p className="muted">Ingresa para guardar tus apuestas y editar una sola vez cada partido.</p>

      {!isSupabaseConfigured() ? (
        <div className="warning-banner">
          El inicio de sesion aun no esta disponible. Revisa la configuracion del proyecto.
        </div>
      ) : null}

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
      {infoMessage ? <div className="info-banner">{infoMessage}</div> : null}

      {isSupabaseConfigured() ? (
        <>
          <GoogleSignInButton nextPath={nextPath} />
          <div className="auth-divider">
            <span>o entra con correo</span>
          </div>
        </>
      ) : null}

      <form action={loginAction} className="form-stack">
        <input type="hidden" name="next" value={nextPath} />
        <label>
          <span>Correo electronico</span>
          <input type="email" name="email" placeholder="correo@ejemplo.com" required />
        </label>
        <label>
          <span>Contrasena</span>
          <input type="password" name="password" placeholder="******" required />
        </label>
        <SubmitButton
          className="primary-btn"
          label="Iniciar sesion"
          pendingLabel="Entrando..."
        />
        <Link href={`/registro?next=${encodeURIComponent(nextPath)}`} className="small-link">
          No tienes cuenta? Registrate
        </Link>
      </form>
    </AuthShell>
  );
}
