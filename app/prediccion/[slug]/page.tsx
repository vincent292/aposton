import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PredictionClient } from '@/components/PredictionClient';
import {
  getMatchBySlug,
  getPredictionForViewer,
  getViewer,
} from '@/lib/quiniela/data';
import { isSupabaseConfigured } from '@/lib/supabase/config';

type PredictionDetailPageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ error?: string }>;
};

export default async function PredictionDetailPage({
  params,
  searchParams,
}: PredictionDetailPageProps) {
  const [{ slug }, viewer, query] = await Promise.all([params, getViewer(), searchParams]);
  const match = await getMatchBySlug(slug);

  if (!match) {
    notFound();
  }

  if (!viewer) {
    redirect(`/login?next=${encodeURIComponent(`/prediccion/${slug}`)}`);
  }

  const existingPrediction = await getPredictionForViewer(match.recordId, viewer.id);
  const errorMessage =
    typeof query.error === 'string' ? decodeURIComponent(query.error) : null;

  return (
    <AppShell
      title="Realizar prediccion"
      subtitle="Guarda tu apuesta ahora. Despues solo tendras un cambio disponible."
      userLabel={viewer.fullName ?? viewer.email}
    >
      <PredictionClient
        match={match}
        existingPrediction={existingPrediction}
        isSupabaseConfigured={isSupabaseConfigured()}
        errorMessage={errorMessage}
      />
    </AppShell>
  );
}
