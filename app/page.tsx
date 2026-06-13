import Image from 'next/image';
import Link from 'next/link';

const featureCards = ['Predicciones dobles', 'Ranking real', 'Premios por partido'];

function MobileWelcomeCard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'home-phone-screen compact' : 'home-phone-screen'}>
      <div className="home-light-rays" aria-hidden="true" />
      <div className="home-logo-wrap">
        <Image
          src="/assets/fifalogo.png"
          alt="Aposton"
          width={150}
          height={90}
          priority={!compact}
          className="home-logo"
        />
      </div>
      <div className="home-mascot-wrap">
        <Image
          src="/assets/mascot.png"
          alt="Mascotas del Mundial 2026"
          width={360}
          height={360}
          priority={!compact}
          className="home-mascot"
        />
      </div>
      <div className="home-card-copy">
        <p className="home-title-line">BIENVENIDO</p>
        <p className="home-subtitle-line">A APOSTON</p>
        <p className="home-description">
          Vive la emocion del Mundial 2026
          <br />
          junto a tu familia y amigos.
        </p>
      </div>
      <div className="home-card-actions">
        <Link href="/login" className="home-primary-action">
          INICIAR SESION
        </Link>
        <Link href="/registro" className="home-secondary-action">
          CREAR CUENTA
        </Link>
      </div>
      <p className="home-footer">© Aposton 2026</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <main className="home-page">
      <div className="home-stadium-bg" aria-hidden="true">
        <span className="home-stadium-light one" />
        <span className="home-stadium-light two" />
        <span className="home-stadium-light three" />
      </div>

      <section className="home-mobile-only" aria-label="Bienvenida Aposton">
        <MobileWelcomeCard />
      </section>

      <section className="home-desktop-shell" aria-label="Inicio Aposton">
        <div className="home-copy-panel">
          <Image
            src="/assets/fifalogo.png"
            alt="Aposton"
            width={164}
            height={98}
            priority
            className="home-desktop-logo"
          />
          <p className="home-kicker">Mundial 2026 · Aposton premium</p>
          <h1>BIENVENIDO A APOSTON</h1>
          <p className="home-lead">
            La app familiar mas emocionante para vivir el Mundial 2026.
          </p>
          <p className="home-support">
            Predice resultados, participa en pozos familiares y compite por el ranking.
          </p>
          <div className="home-actions-row">
            <Link href="/login" className="home-primary-action">
              INICIAR SESION
            </Link>
            <Link href="/registro" className="home-secondary-action">
              CREAR CUENTA
            </Link>
          </div>
          <div className="home-feature-grid">
            {featureCards.map((feature) => (
              <div className="home-feature-card" key={feature}>
                <span />
                <strong>{feature}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="home-preview-panel">
          <div className="home-floating-mascot" aria-hidden="true">
            <Image
              src="/assets/mascot.png"
              alt=""
              width={360}
              height={360}
              className="home-floating-mascot-img"
            />
          </div>
          <div className="home-phone-frame">
            <MobileWelcomeCard compact />
          </div>
        </div>
      </section>
    </main>
  );
}
