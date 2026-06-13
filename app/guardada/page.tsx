import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { getViewer } from '@/lib/quiniela/data';

type SuccessPageProps = {
  searchParams: Promise<{
    updated?: string;
    mode?: string;
  }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const [viewer, params] = await Promise.all([getViewer(), searchParams]);
  const updated = params.updated === '1';
  const betMode = params.mode === 'exact_score' ? 'marcador exacto' : 'ganador';

  return (
    <AppShell
      title="Prediccion guardada"
      subtitle="Confirmacion final del flujo de apuesta."
      userLabel={viewer?.fullName ?? viewer?.email ?? null}
    >
      <section className="success-card glass-card">
        <div className="check-big">OK</div>
        <h2>{updated ? 'Tu cambio fue guardado' : 'Tu apuesta fue guardada'}</h2>
        <p>
          Se registro tu apuesta por {betMode}. {updated
            ? 'Ya no podras volver a modificar este partido.'
            : 'Si cambias de idea, solo tendras una modificacion disponible.'}
        </p>
        <div className="hero-actions centered">
          <Link className="primary-btn" href="/inicio">
            Ver partidos
          </Link>
          <Link className="ghost-btn" href="/ranking">
            Ver ranking
          </Link>
        </div>
      </section>
    </AppShell>
  );
}
