import Link from 'next/link';
import { AppShell } from '@/components/AppShell';

export default function GoalPage() {
  return (
    <AppShell title="Celebración" subtitle="Vista de gol con confeti y mascota.">
      <section className="goal-card glass-card">
        <div className="confetti"><i /><i /><i /><i /><i /><i /><i /></div>
        <h2>¡GOL!</h2>
        <img src="/assets/mascot.png" alt="Mascota" />
        <p>Tu pasión hace grande este juego familiar.</p>
        <Link href="/inicio" className="primary-btn">Volver a partidos</Link>
      </section>
    </AppShell>
  );
}
