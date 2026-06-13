import { notFound, redirect } from 'next/navigation';
import { AppShell } from '@/components/AppShell';
import { PredictionClient } from '@/components/PredictionClient';
import {
  getMatchBySlug,
  getPredictionsForViewer,
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
    redirect(`/registro?next=${encodeURIComponent(`/prediccion/${slug}`)}`);
  }

  const existingPredictions = await getPredictionsForViewer(match.recordId, viewer.id);
  const errorMessage =
    typeof query.error === 'string' ? decodeURIComponent(query.error) : null;

  return (
    <AppShell
      title="Realizar prediccion"
      subtitle="Guarda ganador y marcador exacto del partido. Cada una tiene un solo cambio."
      userLabel={viewer.fullName ?? viewer.email}
    >
      <PredictionClient
        match={match}
        existingPredictions={existingPredictions}
        isSupabaseConfigured={isSupabaseConfigured()}
        errorMessage={errorMessage}
      />
    </AppShell>
  );
}
