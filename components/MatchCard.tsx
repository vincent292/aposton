import Link from 'next/link';
import { Clock3, MapPin, Sparkles } from 'lucide-react';
import { formatPredictedWinner } from '@/lib/quiniela/format';
import type { DashboardMatch, Match } from '@/lib/quiniela/types';

export function MatchCard({
  match,
  locked = true,
  featured = false,
}: {
  match: Match | DashboardMatch;
  locked?: boolean;
  featured?: boolean;
}) {
  const viewerPredictions =
    'viewerPredictions' in match
      ? match.viewerPredictions
      : { winner: null, exactScore: null };
  const predictionOpen = 'predictionOpen' in match ? match.predictionOpen : true;
  const href = locked
    ? `/registro?next=${encodeURIComponent(`/prediccion/${match.id}`)}`
    : `/prediccion/${match.id}`;

  const statusLabel = match.live ? 'EN VIVO' : predictionOpen ? 'DISPONIBLE' : 'CERRADO';
  const hasPredictions = Boolean(viewerPredictions.winner || viewerPredictions.exactScore);

  return (
    <article
      className={`inicio-match-card${featured ? ' is-featured' : ''}${match.live ? ' is-live' : ''}`}
    >
      <div className="inicio-match-card__glow" aria-hidden="true" />
      <div className="inicio-match-card__head">
        <div>
          <p className="inicio-card-kicker">{featured ? 'Proximo partido' : 'Partido disponible'}</p>
          <span className="inicio-match-card__group">{match.group}</span>
        </div>
        <span className={`inicio-match-card__badge${predictionOpen ? ' is-open' : ' is-closed'}`}>
          {statusLabel}
        </span>
      </div>

      <div className="inicio-match-card__teams">
        <Team flag={match.homeFlag} name={match.home} />
        <div className="inicio-match-card__versus">{match.score ?? 'VS'}</div>
        <Team flag={match.awayFlag} name={match.away} />
      </div>

      <div className="inicio-match-card__meta">
        <span>
          <Clock3 size={14} aria-hidden="true" />
          {match.date} - {match.time}
        </span>
        <span>
          <MapPin size={14} aria-hidden="true" />
          {match.stadium}
        </span>
      </div>

      <div className="inicio-match-card__stakes">
        <div>
          <small>Solo ganador</small>
          <strong>Bs {match.winnerStake}</strong>
        </div>
        <div>
          <small>Marcador exacto</small>
          <strong>Bs {match.exactScoreStake}</strong>
        </div>
      </div>

      <div className={`inicio-match-card__prediction${hasPredictions ? ' has-value' : ''}`}>
        <span>
          <Sparkles size={14} aria-hidden="true" />
          {hasPredictions ? 'Tus apuestas' : 'Estado'}
        </span>
        {viewerPredictions.winner ? (
          <strong>
            Ganador: {formatPredictedWinner(viewerPredictions.winner.predictedWinner, {
              home: match.home,
              away: match.away,
            })}
          </strong>
        ) : null}
        {viewerPredictions.exactScore ? (
          <strong>
            Exacto: {match.home} {viewerPredictions.exactScore.homeScore ?? 0} -{' '}
            {viewerPredictions.exactScore.awayScore ?? 0} {match.away}
          </strong>
        ) : null}
        {!hasPredictions ? <strong>Aun no registraste tus apuestas.</strong> : null}
      </div>

      <Link className="inicio-primary-btn" href={href}>
        Realizar prediccion
      </Link>
    </article>
  );
}

export function Team({ flag, name }: { flag: string; name: string }) {
  const looksLikeUrl = /^https?:\/\//i.test(flag);

  return (
    <div className="team">
      <div className="flag">
        {looksLikeUrl ? <img src={flag} alt={`Bandera de ${name}`} /> : flag}
      </div>
      <b>{name}</b>
    </div>
  );
}
