import { AppShell } from '@/components/AppShell';
import { getRankings, getViewer } from '@/lib/quiniela/data';
import { formatCurrency } from '@/lib/quiniela/format';

export default async function RankingPage() {
  const [viewer, rankings] = await Promise.all([getViewer(), getRankings()]);
  const podium = rankings.slice(0, 3);

  return (
    <AppShell
      title="Ranking familiar"
      subtitle="Mientras cerramos resultados, el ranking se ordena por total apostado."
      userLabel={viewer?.fullName ?? viewer?.email ?? null}
    >
      <section className="ranking-layout">
        {podium[1] ? (
          <div className="podium-card glass-card second">
            <span>2</span>
            <b>{podium[1].position}</b>
            <p>{podium[1].name}</p>
            <strong>{formatCurrency(podium[1].totalStaked)}</strong>
          </div>
        ) : null}
        {podium[0] ? (
          <div className="podium-card glass-card first">
            <span>1</span>
            <b>{podium[0].position}</b>
            <p>{podium[0].name}</p>
            <strong>{formatCurrency(podium[0].totalStaked)}</strong>
          </div>
        ) : null}
        {podium[2] ? (
          <div className="podium-card glass-card third">
            <span>3</span>
            <b>{podium[2].position}</b>
            <p>{podium[2].name}</p>
            <strong>{formatCurrency(podium[2].totalStaked)}</strong>
          </div>
        ) : null}
      </section>

      <section className="glass-card ranking-table">
        {rankings.map((item) => (
          <div className="rank-row" key={item.position}>
            <span>{item.position}</span>
            <i>{item.medal}</i>
            <b>{item.name}</b>
            <strong>{formatCurrency(item.totalStaked)}</strong>
            <small>{item.predictionsCount} apuestas</small>
          </div>
        ))}
      </section>
    </AppShell>
  );
}
