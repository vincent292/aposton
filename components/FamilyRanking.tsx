import Link from 'next/link';
import { ChevronRight, Crown, Medal, Trophy } from 'lucide-react';
import { formatCurrency } from '@/lib/quiniela/format';
import type { RankingItem } from '@/lib/quiniela/types';

const medals = [Crown, Medal, Trophy];

export function FamilyRanking({
  rankings,
  compact = false,
  sectionId,
}: {
  rankings: RankingItem[];
  compact?: boolean;
  sectionId?: string;
}) {
  const topThree = rankings.slice(0, 3);

  return (
    <section
      className={`inicio-panel-card inicio-ranking-card${compact ? ' is-compact' : ''}`}
      id={sectionId}
    >
      <div className="inicio-card-heading">
        <div>
          <p className="inicio-card-kicker">Ranking familiar</p>
          <h2>Top 3 real</h2>
        </div>
        <span className="inicio-heading-pill">{rankings.length} jugadores</span>
      </div>

      {topThree.length ? (
        <div className="inicio-ranking-list">
          {topThree.map((item, index) => {
            const Icon = medals[index] ?? Trophy;

            return (
              <article className="inicio-ranking-row" key={`${item.position}-${item.name}`}>
                <span className="inicio-ranking-row__place">{item.position}</span>
                <span className={`inicio-ranking-row__medal is-${index + 1}`}>
                  <Icon size={15} aria-hidden="true" />
                </span>
                <div className="inicio-ranking-row__content">
                  <strong>{item.name}</strong>
                  <small>
                    {item.predictionsCount} apuestas · {item.winnerHits + item.exactHits} aciertos
                  </small>
                </div>
                <b>{formatCurrency(item.totalWon)}</b>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="inicio-empty-card">
          Todavia no hay suficientes apuestas reales registradas para mostrar el top 3.
        </div>
      )}

      <Link className="inicio-secondary-btn" href="/ranking">
        Ver ranking completo
        <ChevronRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
