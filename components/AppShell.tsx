import Link from 'next/link';
import Image from 'next/image';
import type { ReactNode } from 'react';
import { Home, Trophy, Radio, UserRound } from 'lucide-react';
import { logoutAction } from '@/app/auth/actions';

const navItems = [
  { href: '/inicio', icon: Home, label: 'Inicio' },
  { href: '/en-vivo', icon: Radio, label: 'Partidos' },
  { href: '/ranking', icon: Trophy, label: 'Ranking' },
  { href: '/login', icon: UserRound, label: 'Perfil' },
];

export function AppShell({
  children,
  title = 'Quiniela Familiar 2026',
  subtitle = 'Apuesta entre familia y amigos',
  userLabel,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  userLabel?: string | null;
}) {
  return (
    <main className="app-layout">
      <aside className="desktop-sidebar">
        <Link href="/" className="brand-block">
          <div className="brand-icon">
            <Image src="/assets/fifalogo.png" alt="Aposton" width={52} height={52} priority />
          </div>
          <div>
            <strong>
              Quiniela
              <br />
              Familiar 2026
            </strong>
            <span>Aposton Mundial</span>
          </div>
        </Link>
        <nav className="side-nav">
          {navItems.map((item) => {
            const Icon = item.icon;

            return (
              <Link href={item.href} key={item.href}>
                <Icon size={19} strokeWidth={2.4} aria-hidden="true" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="side-card">
          <img src="/assets/ball.png" alt="Balon" />
          <b>Regla de apuesta</b>
          <p>Solo ganador: 1 Bs. Marcador exacto: 2 Bs. Cada partido permite un solo cambio.</p>
        </div>
      </aside>

      <section className="app-panel">
        <header className="topbar">
          <div>
            <p className="eyebrow">Family pool 2026</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="top-actions">
            {userLabel ? (
              <>
                <span className="session-pill">{userLabel}</span>
                <form action={logoutAction}>
                  <button type="submit" className="ghost-btn">
                    Salir
                  </button>
                </form>
              </>
            ) : (
              <>
                <Link href="/login" className="ghost-btn">
                  Login
                </Link>
                <Link href="/registro" className="primary-btn small">
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </header>
        {children}
      </section>

      <nav className="mobile-bottom-nav">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link href={item.href} key={item.href}>
              <Icon size={20} strokeWidth={2.4} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </main>
  );
}

export function AuthShell({
  children,
  mode,
}: {
  children: ReactNode;
  mode: 'login' | 'registro';
}) {
  return (
    <main className="auth-page">
      <Link href="/" className="brand-mini">
        <Image src="/assets/fifalogo.png" alt="Aposton" width={42} height={42} />
        Aposton
      </Link>
      <section className="auth-grid">
        <div className="auth-visual">
          <div className="ribbons">
            <i />
            <i />
            <i />
          </div>
          <Image
            className="auth-ball"
            src="/assets/mascot.png"
            alt="Mascotas Aposton"
            width={300}
            height={300}
            priority
          />
          <h1>{mode === 'login' ? 'Bienvenido de vuelta' : 'Crea tu cuenta familiar'}</h1>
          <p>
            Entra a tu quiniela, guarda tus predicciones y vive cada partido con tu
            familia y amigos.
          </p>
        </div>
        <div className="auth-card">{children}</div>
      </section>
    </main>
  );
}
