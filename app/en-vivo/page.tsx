import Link from 'next/link';
import { AppShell } from '@/components/AppShell';
import { LiveAutoRefresh } from '@/components/LiveAutoRefresh';
import { Team } from '@/components/MatchCard';
import { formatMatchCalendarDate } from '@/lib/quiniela/format';
import { getViewer } from '@/lib/quiniela/data';
import type { Match, MatchFeedView } from '@/lib/quiniela/types';
import { getWorldCupMatches, worldCupGameToMatch } from '@/lib/worldcup/worldcup26';

export const dynamic = 'force-dynamic';

type PageSearchParams = Promise<{
  view?: string;
  date?: string;
  match?: string;
}>;

const viewLabels: Record<MatchFeedView, string> = {
  live: 'En vivo',
  today: 'Hoy',
  all: 'Dia completo',
};

function getValidView(value?: string): MatchFeedView {
  if (value === 'live' || value === 'all') {
    return value;
  }

  return 'today';
}

function getBoliviaDate(value = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(value);
}

function getMatchDate(match: Match) {
  if (!match.kickoffAt) {
    return '';
  }

  return formatMatchCalendarDate(match.kickoffAt, match.venueTimeZone);
}

function getMatchStatusLabel(match: Match) {
  if (match.live) {
    return 'EN VIVO';
  }

  if (match.status === 'finished') {
    return 'FINALIZADO';
  }

  return 'PROGRAMADO';
}

function getMatchStatusMark(match: Match) {
  if (match.live) {
    return 'LIVE';
  }

  if (match.status === 'finished') {
    return 'OK';
  }

  return 'PROX';
}

function buildFilterHref(view: MatchFeedView, date: string) {
  const params = new URLSearchParams({ view });

  if (view === 'today') {
    params.set('date', date);
  }

  return `/en-vivo?${params.toString()}`;
}

async function getWorldCupFeed(view: MatchFeedView, date: string) {
  const matches = await getWorldCupMatches()
    .then((games) => games.map(worldCupGameToMatch))
    .catch(() => []);
  const todayMatches = matches
    .filter((match) => getMatchDate(match) === date)
    .sort((a, b) => {
      const aTime = a.kickoffAt ? new Date(a.kickoffAt).getTime() : 0;
      const bTime = b.kickoffAt ? new Date(b.kickoffAt).getTime() : 0;

      return aTime - bTime;
    });

  if (view === 'live') {
    return todayMatches.filter((match) => match.live);
  }

  return todayMatches;
}

export default async function LivePage({
  searchParams,
}: {
  searchParams: PageSearchParams;
}) {
  const params = await searchParams;
  const view = getValidView(params.view);
  const date = params.date || getBoliviaDate();
  const [viewer, matches] = await Promise.all([getViewer(), getWorldCupFeed(view, date)]);
  const selectedMatch =
    matches.find((match) => match.id === params.match) ??
    matches.find((match) => match.live) ??
    matches[0] ??
    null;

  return (
    <AppShell
      title="Partidos del Mundial"
      subtitle="Partidos de hoy, marcadores en vivo y calendario del dia."
      userLabel={viewer?.fullName ?? viewer?.email ?? null}
    >
      <LiveAutoRefresh />
      <section className="live-board">
        <div className="live-toolbar">
          <nav className="live-filter-tabs" aria-label="Filtros de partidos">
            {(Object.keys(viewLabels) as MatchFeedView[]).map((item) => (
              <Link
                className={item === view ? 'active' : ''}
                href={buildFilterHref(item, date)}
                key={item}
              >
                {viewLabels[item]}
              </Link>
            ))}
          </nav>
          <form className="date-filter" action="/en-vivo">
            <input type="hidden" name="view" value="today" />
            <input type="date" name="date" defaultValue={date} />
            <button type="submit">Filtrar fecha</button>
          </form>
        </div>

        <div className="live-layout">
          <section className="matches-feed">
            <div className="feed-head">
              <h2>{viewLabels[view]}</h2>
              <span>{matches.length} partidos</span>
            </div>

            {matches.length ? (
              <div className="live-match-list">
                {matches.map((match) => {
                  const query = new URLSearchParams({
                    view,
                    date,
                    match: match.id,
                  });
                  const selected = selectedMatch?.id === match.id;

                  return (
                    <article
                      className={`live-match-row ${selected ? 'active' : ''}`}
                      key={match.id}
                    >
                      <Link
                        className="live-match-row__main"
                        href={`/en-vivo?${query.toString()}`}
                      >
                        <div className="live-match-status">
                          <span>
                            <i aria-hidden="true">{getMatchStatusMark(match)}</i>
                            {getMatchStatusLabel(match)}
                          </span>
                          <small>{match.live ? match.time : match.date}</small>
                        </div>
                        <div className="live-match-teams">
                          <Team flag={match.homeFlag} name={match.home} />
                          <strong>{match.score ?? 'VS'}</strong>
                          <Team flag={match.awayFlag} name={match.away} />
                        </div>
                        <p>{match.stadium}</p>
                      </Link>
                      <Link className="inicio-primary-btn is-small wide" href={`/prediccion/${match.id}`}>
                        Apostar
                      </Link>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="empty-live-block">
                {view === 'live'
                  ? 'No hay partidos jugandose ahora mismo.'
                  : 'No hay partidos programados para este dia.'}
              </div>
            )}
          </section>

          <section className="live-detail">
            {selectedMatch ? (
              <>
                <div className="glass-card live-hero">
                  <div className="prediction-teams">
                    <Team flag={selectedMatch.homeFlag} name={selectedMatch.home} />
                    <div>
                      <strong className="big-score">{selectedMatch.score ?? 'VS'}</strong>
                      <small>{selectedMatch.live ? selectedMatch.time : selectedMatch.date}</small>
                      <b className="live-pill">{getMatchStatusLabel(selectedMatch)}</b>
                    </div>
                    <Team flag={selectedMatch.awayFlag} name={selectedMatch.away} />
                  </div>
                  <div className="match-meta">
                    <span>{selectedMatch.group}</span>
                    <span>{selectedMatch.stadium}</span>
                    <span>{selectedMatch.time} - hora local</span>
                  </div>
                  <Link className="inicio-primary-btn wide live-bet-cta" href={`/prediccion/${selectedMatch.id}`}>
                    Apostar este partido
                  </Link>
                </div>

                <div className="live-data-grid">
                  <article className="live-section glass-card">
                    <div className="live-section-head">
                      <h3>Fuente</h3>
                      <small>Calendario</small>
                    </div>
                    <div className="empty-live-block">
                      Esta vista muestra solo los partidos de la fecha seleccionada. Al cambiar
                      el dia, el filtro se actualiza automaticamente con ese calendario.
                    </div>
                  </article>

                  <article className="live-section glass-card">
                    <div className="live-section-head">
                      <h3>Resumen</h3>
                      <small>{getMatchStatusLabel(selectedMatch)}</small>
                    </div>
                    <div className="events-list">
                      <div className="event-row">
                        <span>{selectedMatch.time} - local</span>
                        <div>
                          <strong>{selectedMatch.home} vs {selectedMatch.away}</strong>
                          <p>{selectedMatch.group}</p>
                        </div>
                        <small>{selectedMatch.score ?? 'VS'}</small>
                      </div>
                    </div>
                  </article>
                </div>

                <article className="live-section glass-card lineups-section">
                  <div className="live-section-head">
                    <h3>Alineaciones y estadisticas</h3>
                    <small>Complemento visual</small>
                  </div>
                  <div className="empty-live-block">
                    WorldCup26 no entrega alineaciones ni estadisticas avanzadas. Para eso podemos
                    usar ScoreBat/API-Football solo como visual, sin calcular ranking desde ahi.
                  </div>
                </article>
              </>
            ) : (
              <div className="empty-live-block">
                Selecciona otro filtro para cargar partidos del Mundial.
              </div>
            )}
          </section>
        </div>
      </section>
    </AppShell>
  );
}
