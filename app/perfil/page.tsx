import { AppShell } from '@/components/AppShell';
import { FamilyDependentsCard } from '@/components/FamilyDependentsCard';
import { FamilyRanking } from '@/components/FamilyRanking';
import { PredictionHistory } from '@/components/PredictionHistory';
import { UserPanelCard } from '@/components/UserPanelCard';
import { UserSummary } from '@/components/UserSummary';
import {
  getRankings,
  getUserDashboardSummary,
  getViewerDependents,
  getViewerPredictionHistory,
  getViewer,
} from '@/lib/quiniela/data';

type ProfilePageProps = {
  searchParams: Promise<{
    error?: string;
    message?: string;
  }>;
};

export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  const viewer = await getViewer();
  const [summary, rankings, predictionHistory, dependents, params] = await Promise.all([
    getUserDashboardSummary(viewer?.id),
    getRankings(),
    getViewerPredictionHistory(viewer?.id),
    getViewerDependents(viewer?.id),
    searchParams,
  ]);
  const errorMessage =
    typeof params.error === 'string' ? decodeURIComponent(params.error) : null;
  const successMessage =
    typeof params.message === 'string' ? decodeURIComponent(params.message) : null;

  return (
    <AppShell
      title="Perfil"
      subtitle="Tu cuenta, tus jugadas guardadas y la familia vinculada a Aposton."
      userLabel={viewer?.fullName ?? viewer?.email ?? null}
    >
      <section className="profile-dashboard">
        <div className="profile-main-stack">
          {successMessage ? <div className="info-banner">{successMessage}</div> : null}
          {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}
          <PredictionHistory items={predictionHistory} />
          <FamilyDependentsCard viewer={viewer} dependents={dependents} />
        </div>

        <div className="profile-side-stack">
          <UserPanelCard viewer={viewer} userMatchesCount={summary.predictionsCount} />
          <UserSummary summary={summary} />
          <FamilyRanking rankings={rankings} compact />
        </div>
      </section>
    </AppShell>
  );
}
