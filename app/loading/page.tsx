import { AppShell } from '@/components/AppShell';

export default function LoadingMockPage() {
  return (
    <AppShell title="Loading" subtitle="Animación del balón rodando para transiciones.">
      <section className="loading-card glass-card">
        <div className="speed-trail" />
        <h2>Cargando...</h2>
        <img src="/assets/ball.png" alt="Balón" />
        <p>Esto es solo el comienzo...</p>
      </section>
    </AppShell>
  );
}
