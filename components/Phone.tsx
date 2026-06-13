import Link from 'next/link';

type PhoneProps = {
  children: React.ReactNode;
  className?: string;
  screenClassName?: string;
  glow?: boolean;
};

export function Phone({ children, className = '', screenClassName = '', glow = true }: PhoneProps) {
  return (
    <article className={`phone ${className}`.trim()}>
      <div className={`screen ${screenClassName}`.trim()}>
        {glow && <div className="glow-line" />}
        <StatusBar />
        {children}
      </div>
    </article>
  );
}

export function StatusBar() {
  return (
    <div className="status">
      <span>9:41</span>
      <span className="icons">●●●</span>
    </div>
  );
}

export function BottomNav() {
  return (
    <nav className="bottom-nav">
      <Link href="/inicio"><div>⌂<span>Inicio</span></div></Link>
      <Link href="/en-vivo"><div>⚽<span>Partidos</span></div></Link>
      <Link href="/prediccion"><div className="nav-ball"><img src="/assets/ball.png" alt="Balón" /></div></Link>
      <Link href="/ranking"><div>▥<span>Ranking</span></div></Link>
      <Link href="/login"><div>♙<span>Perfil</span></div></Link>
    </nav>
  );
}

export function RouteActions({ back = '/inicio' }: { back?: string }) {
  return (
    <div className="route-actions">
      <Link className="btn secondary" href={back}>Volver</Link>
      <Link className="btn" href="/">Ver tablero</Link>
    </div>
  );
}
