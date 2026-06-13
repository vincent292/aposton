import Link from 'next/link';
import Image from 'next/image';
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
  const betMode =
    params.mode === 'combo'
      ? 'ganador y marcador exacto'
      : params.mode === 'exact_score'
        ? 'marcador exacto'
        : 'ganador';

  return (
    <AppShell
      title="Apuesta guardada"
      subtitle="Confirmacion final de tus jugadas en Aposton."
      userLabel={viewer?.fullName ?? viewer?.email ?? null}
    >
      <section className="success-card glass-card">
        <Image src="/assets/mascot.png" alt="Mascota Aposton" width={176} height={176} />
        <h2>{updated ? 'Tus cambios fueron guardados' : 'Tus apuestas fueron guardadas'}</h2>
        <p>
          Se registro tu apuesta por {betMode}. {updated
            ? 'Las apuestas que cambiaste ya no podran volver a editarse.'
            : 'Si cambias de idea, cada apuesta tendra una sola modificacion disponible.'}
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
