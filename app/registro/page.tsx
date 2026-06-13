import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/AppShell';
import { GoogleSignInButton } from '@/components/GoogleSignInButton';
import { SubmitButton } from '@/components/SubmitButton';
import { registerAction } from '@/app/auth/actions';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { getViewer } from '@/lib/quiniela/data';

type RegisterPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
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

  return (
    <AuthShell mode="registro">
      <h2>Crear cuenta</h2>
      <p className="muted">Crea tu cuenta una vez y empieza a guardar tus predicciones.</p>

      {!isSupabaseConfigured() ? (
        <div className="warning-banner">
          El registro aun no esta disponible. Revisa la configuracion del proyecto.
        </div>
      ) : null}

      {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

      {isSupabaseConfigured() ? (
        <>
          <GoogleSignInButton nextPath={nextPath} label="Registrarme con Google" />
          <div className="auth-divider">
            <span>o crea tu cuenta con correo</span>
          </div>
        </>
      ) : null}

      <form action={registerAction} className="form-stack">
        <input type="hidden" name="next" value={nextPath} />
        <label>
          <span>Nombre completo</span>
          <input name="fullName" placeholder="Juan Perez Garcia" required />
        </label>
        <label>
          <span>Carnet / CI</span>
          <input name="documentNumber" placeholder="1234567 LP" required />
        </label>
        <label>
          <span>Correo electronico</span>
          <input type="email" name="email" placeholder="juan@gmail.com" required />
        </label>
        <label>
          <span>Contrasena</span>
          <input type="password" name="password" placeholder="Minimo 6 caracteres" required />
        </label>
        <label>
          <span>Confirmar contrasena</span>
          <input type="password" name="confirmPassword" placeholder="Repite la contrasena" required />
        </label>
        <label className="check-line">
          <input type="checkbox" name="acceptedTerms" defaultChecked />
          Acepto terminos y condiciones
        </label>
        <SubmitButton
          className="primary-btn"
          label="Registrarme"
          pendingLabel="Creando cuenta..."
        />
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="small-link">
          Ya tienes cuenta? Iniciar sesion
        </Link>
      </form>
    </AuthShell>
  );
}
