import Image from 'next/image';
import Link from 'next/link';
import { Bell, Home, LogOut, Menu, Radio, ShieldCheck, Trophy, UserRound } from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';
import type {
  DashboardMatch,
  RankingItem,
  UserDashboardSummary,
  Viewer,
} from '@/lib/quiniela/types';
import { BottomNav } from './BottomNav';
import { FamilyRanking } from './FamilyRanking';
import { MatchCard } from './MatchCard';
import { UserSummary } from './UserSummary';
import { UserPanelCard } from './UserPanelCard';

const desktopNavItems = [
  { href: '/inicio', label: 'Inicio', icon: Home, active: true },
  { href: '/en-vivo', label: 'Partidos', icon: Radio, active: false },
  { href: '/ranking', label: 'Ranking', icon: Trophy, active: false },
  { href: '/perfil', label: 'Perfil', icon: UserRound, active: false },
];

function getGreetingName(viewer: Viewer | null) {
  const fullName = viewer?.fullName?.trim();

  if (fullName) {
    return fullName.split(/\s+/)[0];
  }

  const email = viewer?.email?.trim();

  if (email) {
    return email.split('@')[0];
  }

  return 'Invitado';
}

export function HomeDashboard({
  viewer,
  matches,
  summary,
  rankings,
}: {
  viewer: Viewer | null;
  matches: DashboardMatch[];
  summary: UserDashboardSummary;
  rankings: RankingItem[];
}) {
  const openMatches = matches.filter((match) => match.predictionOpen);
  const featuredMatch =
    openMatches[0] ??
    matches.find((match) => match.status === 'scheduled') ??
    matches[0] ??
    null;
  const listMatches = (openMatches.length ? openMatches : matches).filter(
    (match) => match.id !== featuredMatch?.id
  );
  const greetingName = getGreetingName(viewer);
  const userMatchesCount = summary.predictionsCount;

  return (
    <main className="inicio-dashboard" id="inicio-top">
      <div className="inicio-dashboard__lights" aria-hidden="true">
        <span className="one" />
        <span className="two" />
        <span className="three" />
      </div>

      <div className="inicio-dashboard__shell">
        <aside className="inicio-desktop-sidebar">
          <Link href="/inicio" className="inicio-desktop-brand">
            <span>
              <Image src="/assets/fifalogo.png" alt="Aposton" width={48} height={48} priority />
            </span>
            <div>
              <strong>
                Aposton
                <br />
                Mundial 2026
              </strong>
              <small>Aposton</small>
            </div>
          </Link>

          <nav className="inicio-desktop-nav" aria-label="Navegacion principal">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;

              return (
                <Link
                  className={item.active ? 'active' : ''}
                  href={item.href}
                  key={item.href}
                >
                  <Icon size={19} strokeWidth={2.4} aria-hidden="true" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          <div className="inicio-desktop-rule">
            <Image src="/assets/ball.png" alt="Balon" width={112} height={112} />
            <b>Regla de apuesta</b>
            <p>
              Puedes jugar ganador y marcador exacto del mismo partido. Cada apuesta permite
              un solo cambio.
            </p>
          </div>
        </aside>

        <section className="inicio-desktop-content">
          <header className="inicio-header">
            <div className="inicio-header__topline">
              <Link className="inicio-icon-btn" href="#partidos-disponibles" aria-label="Ir a partidos">
                <Menu size={18} aria-hidden="true" />
              </Link>
              <Link className="inicio-brand-pill" href="/inicio">
                <span className="inicio-brand-pill__mark image">
                  <Image src="/assets/fifalogo.png" alt="Aposton" width={28} height={28} />
                </span>
                <div>
                  <strong>Aposton</strong>
                  <small>Mundial 2026</small>
                </div>
              </Link>
              <Link className="inicio-icon-btn" href="/ranking" aria-label="Ir a ranking">
                <Bell size={18} aria-hidden="true" />
              </Link>
            </div>

            <div className="inicio-header__content">
              <div className="inicio-header__copy">
                <p className="inicio-card-kicker">Aposton premium</p>
                <h1>
                  Hola, {greetingName}! <span aria-hidden="true">👋</span>
                </h1>
                <p>Bienvenido a Aposton Mundial 2026.</p>
              </div>

              <div className="inicio-header__actions">
                {viewer ? (
                  <>
                    <span className="inicio-session-pill">
                      <ShieldCheck size={14} aria-hidden="true" />
                      Sesion activa
                    </span>
                    <form action={logoutAction}>
                      <button className="inicio-ghost-btn" type="submit">
                        <LogOut size={15} aria-hidden="true" />
                        Salir
                      </button>
                    </form>
                  </>
                ) : (
                  <>
                    <Link className="inicio-ghost-btn" href="/login">
                      Iniciar sesion
                    </Link>
                    <Link className="inicio-primary-btn is-small" href="/registro">
                      Crear cuenta
                    </Link>
                  </>
                )}
              </div>
            </div>

            <nav className="inicio-quick-nav" aria-label="Secciones del dashboard">
              <Link href="#inicio-top">Inicio</Link>
              <Link href="/en-vivo">Partidos</Link>
              <Link href="/ranking">Ranking</Link>
              <Link href="/perfil">Perfil</Link>
            </nav>
          </header>

          <div className="inicio-layout">
            <section className="inicio-main">
              {featuredMatch ? (
                <div className="inicio-featured" id="proximo-partido">
                  <MatchCard match={featuredMatch} locked={!viewer} featured />
                </div>
              ) : null}

              <div className="inicio-mobile-stack">
                <UserSummary summary={summary} />
                <FamilyRanking rankings={rankings} compact sectionId="ranking-familiar-mobile" />
                <UserPanelCard
                  viewer={viewer}
                  userMatchesCount={userMatchesCount}
                  sectionId="user-panel-mobile"
                />
              </div>

              <section className="inicio-panel-card inicio-matches-panel" id="partidos-disponibles">
                <div className="inicio-card-heading">
                  <div>
                    <p className="inicio-card-kicker">Partidos disponibles</p>
                    <h2>Hoy y proximos</h2>
                  </div>
                  <span className="inicio-heading-pill">
                    {openMatches.length || matches.length} encuentros
                  </span>
                </div>

                {listMatches.length ? (
                  <div className="inicio-match-grid">
                    {listMatches.map((match) => (
                      <MatchCard key={match.id} match={match} locked={!viewer} />
                    ))}
                  </div>
                ) : featuredMatch ? (
                  <div className="inicio-empty-card">
                    El proximo partido ya ocupa el foco principal. Cuando haya mas encuentros
                    disponibles del Mundial 2026 apareceran aqui.
                  </div>
                ) : (
                  <div className="inicio-empty-card">
                    Aun no hay partidos confirmados del Mundial 2026 listos para apostar.
                  </div>
                )}
              </section>
            </section>

            <aside className="inicio-sidebar">
              <UserSummary summary={summary} />
              <FamilyRanking rankings={rankings} sectionId="ranking-familiar-desktop" />
              <UserPanelCard
                viewer={viewer}
                userMatchesCount={userMatchesCount}
                sectionId="user-panel-desktop"
              />
            </aside>
          </div>
        </section>
      </div>

      <BottomNav />
    </main>
  );
}
