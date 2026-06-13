import { AppShell } from '@/components/AppShell';
import { MatchCard } from '@/components/MatchCard';
import { getMatches, getUserDashboardSummary, getViewer } from '@/lib/quiniela/data';
import { formatCurrency } from '@/lib/quiniela/format';

export default async function HomePage() {
  const [viewer, matches] = await Promise.all([getViewer(), getMatches()]);
  const summary = await getUserDashboardSummary(viewer?.id);
  const userLabel = viewer?.fullName ?? viewer?.email ?? null;

  return (
    <AppShell
      title="Partidos disponibles"
      subtitle="Selecciona un partido y guarda tu apuesta. Solo tendras una modificacion por encuentro."
      userLabel={userLabel}
    >
      <section className="dashboard-grid">
        <div className="summary-card glass-card">
          <span>Total apostado</span>
          <strong>{formatCurrency(summary.totalStaked)}</strong>
        </div>
        <div className="summary-card glass-card gain">
          <span>Predicciones</span>
          <strong>{summary.predictionsCount}</strong>
        </div>
        <div className="summary-card glass-card loss">
          <span>Cambios usados</span>
          <strong>{summary.editedPredictions}</strong>
        </div>
      </section>

      <section className="section-head">
        <div>
          <p className="eyebrow">Calendario</p>
          <h2>Todos los partidos</h2>
        </div>
        <div className="chips">
          <span>Ganador: 1 Bs</span>
          <span>Exacto: 2 Bs</span>
          <span>1 cambio maximo</span>
        </div>
      </section>

      <div className="matches-grid">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} locked={!viewer} />
        ))}
      </div>
    </AppShell>
  );
}
