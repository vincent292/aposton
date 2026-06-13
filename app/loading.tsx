import Image from 'next/image';

export default function Loading() {
  return (
    <main className="app-loading-screen" aria-label="Cargando">
      <div className="app-loading-lights" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <section className="app-loading-card">
        <div className="app-loading-ball">
          <Image src="/assets/ball.png" alt="" width={128} height={128} priority />
        </div>
        <p>Preparando Aposton</p>
        <div className="app-loading-track" aria-hidden="true">
          <span />
        </div>
      </section>
    </main>
  );
}
