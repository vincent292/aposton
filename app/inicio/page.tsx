import { HomeDashboard } from '@/components/HomeDashboard';
import {
  getDashboardMatches,
  getRankings,
  getUserDashboardSummary,
  getViewer,
} from '@/lib/quiniela/data';

export default async function HomePage() {
  const viewer = await getViewer();
  const [matches, summary, rankings] = await Promise.all([
    getDashboardMatches(viewer?.id),
    getUserDashboardSummary(viewer?.id),
    getRankings(),
  ]);

  return (
    <HomeDashboard
      viewer={viewer}
      matches={matches}
      summary={summary}
      rankings={rankings}
    />
  );
}
