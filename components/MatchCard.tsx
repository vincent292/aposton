import Link from 'next/link';
import type { Match } from '@/lib/quiniela/types';

export function MatchCard({
  match,
  locked = true,
}: {
  match: Match;
  locked?: boolean;
}) {
  const href = locked
    ? `/registro?next=${encodeURIComponent(`/prediccion/${match.id}`)}`
    : `/prediccion/${match.id}`;

  return (
    <article className={`match-card ${match.live ? 'is-live' : ''}`}>
      <div className="match-card-head">
        <span>{match.group}</span>
        {match.live ? <b>EN VIVO</b> : null}
      </div>
      <div className="teams-row">
        <Team flag={match.homeFlag} name={match.home} />
        <div className="versus">{match.score ?? 'VS'}</div>
        <Team flag={match.awayFlag} name={match.away} />
      </div>
      <div className="match-meta">
        <span>{match.date}</span>
        <span>{match.time}</span>
        <span>{match.stadium}</span>
      </div>
      <div className="match-prizes">
        <div>
          <small>Solo ganador</small>
          <strong>Bs {match.winnerStake}</strong>
        </div>
        <div>
          <small>Marcador exacto</small>
          <strong>Bs {match.exactScoreStake}</strong>
        </div>
      </div>
      <Link className="primary-btn" href={href}>
        {locked ? 'Entrar para apostar' : 'Realizar prediccion'}
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
