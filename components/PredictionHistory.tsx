import Link from 'next/link';
import { CheckCircle2, Clock3, PencilLine, Target, XCircle } from 'lucide-react';
import { formatCurrency, formatPredictedWinner } from '@/lib/quiniela/format';
import type { PredictionHistoryItem } from '@/lib/quiniela/types';

function getPredictionLabel(item: PredictionHistoryItem) {
  if (item.betMode === 'exact_score') {
    return `${item.homeScore ?? 0} - ${item.awayScore ?? 0}`;
  }

  const [home, away] = item.matchLabel.split(' vs ');

  return formatPredictedWinner(item.predictedWinner, {
    home: home ?? 'Local',
    away: away ?? 'Visitante',
  });
}

export function PredictionHistory({ items }: { items: PredictionHistoryItem[] }) {
  return (
    <section className="inicio-panel-card profile-history-card">
      <div className="inicio-card-heading">
        <div>
          <p className="inicio-card-kicker">Mis predicciones</p>
          <h2>Tus jugadas guardadas</h2>
        </div>
        <span className="inicio-heading-pill">{items.length} registradas</span>
      </div>

      {!items.length ? (
        <div className="inicio-empty-card">
          Aun no tienes predicciones guardadas. Entra a un partido disponible y registra tu
          primera jugada.
        </div>
      ) : (
        <div className="profile-history-list">
          {items.map((item) => {
            const isPending = item.status === 'scheduled';
            const isLive = item.status === 'live';

            return (
              <article className="profile-history-row" key={item.id}>
                <div className="profile-history-row__top">
                  <div>
                    <strong>{item.matchLabel}</strong>
                    <p>
                      <Clock3 size={14} aria-hidden="true" />
                      {item.date} - {item.time} - local
                    </p>
                  </div>
                  <span
                    className={`profile-history-badge${
                      isPending ? ' is-pending' : isLive ? ' is-live' : item.isHit ? ' is-hit' : ' is-miss'
                    }`}
                  >
                    {isPending ? 'Abierta' : isLive ? 'En vivo' : item.isHit ? 'Ganaste' : 'Sin premio'}
                  </span>
                </div>

                <div className="profile-history-grid">
                  <div>
                    <small>Tu prediccion</small>
                    <b>{getPredictionLabel(item)}</b>
                  </div>
                  <div>
                    <small>Modalidad</small>
                    <b>{item.betMode === 'exact_score' ? 'Marcador exacto' : 'Solo ganador'}</b>
                  </div>
                  <div>
                    <small>Apostado</small>
                    <b>{formatCurrency(item.stakeAmount)}</b>
                  </div>
                  <div>
                    <small>Premio</small>
                    <b className={item.wonAmount > 0 ? 'gain' : ''}>{formatCurrency(item.wonAmount)}</b>
                  </div>
                </div>

                <div className="profile-history-row__footer">
                  <span>{item.stadium}</span>

                  <div className="profile-history-row__actions">
                    {item.canEdit ? (
                      <Link className="inicio-ghost-btn" href={`/prediccion/${item.matchSlug}`}>
                        <PencilLine size={15} aria-hidden="true" />
                        Editar
                      </Link>
                    ) : null}

                    {isPending ? (
                      <span className="profile-history-note">
                        <Target size={14} aria-hidden="true" />
                        Se cierra 10 min antes
                      </span>
                    ) : item.isHit ? (
                      <span className="profile-history-note gain">
                        <CheckCircle2 size={14} aria-hidden="true" />
                        Premio acreditado
                      </span>
                    ) : (
                      <span className="profile-history-note">
                        <XCircle size={14} aria-hidden="true" />
                        Resultado cerrado
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
