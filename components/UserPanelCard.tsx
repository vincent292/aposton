import Link from 'next/link';
import { LogOut, ShieldCheck, Sparkles } from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';
import type { Viewer } from '@/lib/quiniela/types';

export function UserPanelCard({
  viewer,
  userMatchesCount,
  sectionId,
}: {
  viewer: Viewer | null;
  userMatchesCount: number;
  sectionId?: string;
}) {
  return (
    <section className="inicio-panel-card inicio-user-card" id={sectionId}>
      <div className="inicio-card-heading">
        <div>
          <p className="inicio-card-kicker">Perfil</p>
          <h2>{viewer?.fullName ?? 'Jugador invitado'}</h2>
        </div>
      </div>

      <p className="inicio-user-card__copy">
        {viewer
          ? 'Tu panel esta listo para seguir apuestas, revisar tu estado y entrar rapido al proximo partido.'
          : 'Registrate para guardar tus predicciones y entrar directo a cada partido.'}
      </p>

      <div className="inicio-user-card__chips">
        <span>
          <Sparkles size={14} aria-hidden="true" />
          {userMatchesCount} apuestas
        </span>
        <span>
          <ShieldCheck size={14} aria-hidden="true" />
          {viewer ? 'Cuenta activa' : 'Modo visitante'}
        </span>
      </div>

      {viewer ? (
        <form action={logoutAction}>
          <button className="inicio-ghost-btn wide" type="submit">
            <LogOut size={15} aria-hidden="true" />
            Cerrar sesion
          </button>
        </form>
      ) : (
        <div className="inicio-user-card__actions">
          <Link className="inicio-primary-btn" href="/registro">
            Crear cuenta
          </Link>
          <Link className="inicio-ghost-btn wide" href="/login">
            Iniciar sesion
          </Link>
        </div>
      )}
    </section>
  );
}
