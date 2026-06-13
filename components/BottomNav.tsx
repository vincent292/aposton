import Image from 'next/image';
import Link from 'next/link';
import { Home, LayoutGrid, Trophy, UserRound } from 'lucide-react';
const navItems = [
  { href: '/inicio', label: 'Inicio', icon: Home },
  { href: '/en-vivo', label: 'Partidos', icon: LayoutGrid },
  { href: '/ranking', label: 'Ranking', icon: Trophy },
  { href: '/perfil', label: 'Perfil', icon: UserRound },
] as const;

export function BottomNav() {
  return (
    <nav className="inicio-bottom-nav" aria-label="Navegacion principal">
      {navItems.slice(0, 2).map((item) => {
        const Icon = item.icon;

        return (
          <Link className="inicio-bottom-nav__item" href={item.href} key={item.label}>
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}

      <Link
        className="inicio-bottom-nav__ball"
        href="/inicio#proximo-partido"
        aria-label="Ir al proximo partido"
      >
        <span className="inicio-bottom-nav__ball-ring" aria-hidden="true" />
        <Image src="/assets/ball.png" alt="" width={34} height={34} />
      </Link>

      {navItems.slice(2).map((item) => {
        const Icon = item.icon;

        return (
          <Link className="inicio-bottom-nav__item" href={item.href} key={item.label}>
            <Icon size={18} aria-hidden="true" />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
