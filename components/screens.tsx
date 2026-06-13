'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BottomNav, Phone } from './Phone';

export function WelcomeScreen() {
  return (
    <Phone glow={false}>
      <div className="ribbons"><span /><span /><span /></div>
      <div className="content center">
        <img className="mascot" src="/assets/mascot.png" alt="Mascota" />
        <h2>Bienvenido<br />a la quiniela familiar</h2>
        <p className="muted">Vive la emoción del fútbol 2026 junto a tu familia y amigos.</p>
        <div className="btn-row">
          <Link className="btn" href="/login">Iniciar sesión</Link>
          <Link className="btn secondary" href="/registro">Crear cuenta</Link>
        </div>
      </div>
      <div className="legal">© Quiniela Familiar 2026</div>
    </Phone>
  );
}

export function LoginScreen() {
  return (
    <Phone>
      <div className="content center">
        <img className="ball-img ball-sm" src="/assets/ball.png" alt="Balón" />
        <h3>Iniciar sesión</h3>
        <img className="ball-img" src="/assets/ball.png" alt="Balón" />
        <form className="form">
          <label><div className="label">Correo electrónico</div><input className="input" type="email" placeholder="correo@ejemplo.com" /></label>
          <label><div className="label">Contraseña</div><input className="input" type="password" placeholder="••••••••" /></label>
          <span className="small-link">¿Olvidaste tu contraseña?</span>
          <Link className="btn" href="/inicio">Iniciar sesión</Link>
          <Link className="small-link" href="/registro">¿No tienes cuenta? REGÍSTRATE</Link>
        </form>
      </div>
    </Phone>
  );
}

export function RegisterScreen() {
  return (
    <Phone>
      <div className="content center">
        <img className="ball-img ball-sm" src="/assets/ball.png" alt="Balón" />
        <h3>Crear cuenta</h3>
        <form className="form">
          <label><div className="label">Nombre completo</div><input className="input" defaultValue="Juan Pérez García" /></label>
          <label><div className="label">Carnet / CI</div><input className="input" defaultValue="1234567 LP" /></label>
          <label><div className="label">Correo electrónico</div><input className="input" type="email" defaultValue="juan@gmail.com" /></label>
          <label><div className="label">Contraseña</div><input className="input" type="password" defaultValue="12345678" /></label>
          <label><div className="label">Confirmar contraseña</div><input className="input" type="password" defaultValue="12345678" /></label>
          <label className="checkbox"><input type="checkbox" defaultChecked /> Acepto los términos y condiciones</label>
          <Link className="btn" href="/inicio">Registrarme</Link>
          <Link className="small-link" href="/login">¿Ya tienes cuenta? INICIAR SESIÓN</Link>
        </form>
      </div>
    </Phone>
  );
}

export function HomeScreen() {
  return (
    <Phone>
      <div className="content top">
        <div className="menu-row"><div className="icon-btn">☰</div><div className="icon-btn">♢</div></div>
        <h2 style={{ fontSize: 24, textTransform: 'none' }}>¡Hola, Juan! 👋</h2>
        <p className="muted" style={{ marginTop: 0 }}>Bienvenido a tu quiniela familiar</p>
        <div className="hero-card">
          <b>PRÓXIMO PARTIDO</b>
          <div className="match" style={{ marginTop: 14 }}>
            <div><div className="flag">🇦🇷</div><b>Argentina</b></div>
            <div className="vs">VS</div>
            <div><div className="flag">🇲🇽</div><b>México</b></div>
          </div>
          <div className="date">15 JUN 2026 · 18:00 · Estadio Azteca</div>
          <Link className="btn" style={{ marginTop: 14 }} href="/prediccion">Realizar predicción</Link>
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
          <b>MI RESUMEN</b>
          <div className="summary">
            <div><small>Apostado</small><b>Bs 45</b></div>
            <div><small>Ganado</small><b className="gain">Bs 32</b></div>
            <div><small>Saldo</small><b className="loss">Bs -13</b></div>
          </div>
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
          <b>RANKING FAMILIAR</b>
          <div className="rank" style={{ marginTop: 12 }}>
            <div className="rank-row"><div><span>1</span>🏆 Carlos Ramírez</div><b>Bs 56</b></div>
            <div className="rank-row"><div><span>2</span>🥈 María López</div><b>Bs 32</b></div>
            <div className="rank-row"><div><span>3</span>🥉 Juan Pérez</div><b>Bs -13</b></div>
          </div>
          <Link className="btn secondary" style={{ marginTop: 14 }} href="/ranking">Ver ranking completo</Link>
        </div>
      </div>
      <BottomNav />
    </Phone>
  );
}

export function PredictionScreen() {
  const [left, setLeft] = useState(2);
  const [right, setRight] = useState(1);
  useEffect(() => {
    const id = setInterval(() => {
      setLeft((n) => (n === 2 ? 3 : 2));
      setRight((n) => (n === 1 ? 0 : 1));
    }, 2400);
    return () => clearInterval(id);
  }, []);
  return (
    <Phone>
      <div className="content top">
        <div className="menu-row"><Link className="back" href="/inicio">‹</Link><h3 style={{ margin: 0 }}>Realizar predicción</h3><span /></div>
        <div className="match">
          <div><div className="flag" style={{ fontSize: 30, width: 70, height: 48 }}>🇧🇷</div><b>Brasil</b></div>
          <div className="vs">VS</div>
          <div><div className="flag" style={{ fontSize: 30, width: 70, height: 48 }}>🇫🇷</div><b>Francia</b></div>
        </div>
        <div className="date">20 JUN 2026 · 16:00<br />Estadio Lusail</div>
        <div className="panel" style={{ marginTop: 18 }}>
          <b>TU PREDICCIÓN</b>
          <p className="muted" style={{ fontSize: 12 }}>Marcador exacto</p>
          <div className="score-picker"><div className="num">{left}</div><div style={{ fontSize: 22, fontWeight: 900 }}>-</div><div className="num">{right}</div></div>
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
          <b>¿EN QUÉ DESEAS PARTICIPAR?</b>
          <div className="bet">Ganador / Empate <span>1 Bs</span><span className="check">✓</span></div>
          <div className="bet">Marcador Exacto <span>2 Bs</span><span className="check">✓</span></div>
          <div className="total"><span>TOTAL A PAGAR</span><strong>3 Bs</strong></div>
        </div>
        <div className="panel" style={{ marginTop: 12 }}>
          <b>PREMIO ESTIMADO</b>
          <div className="prize"><div>Por Ganador<b>Bs 12.50</b></div><div>Por Marcador Exacto<b>Bs 25.80</b></div></div>
        </div>
        <Link className="btn" style={{ marginTop: 'auto' }} href="/guardada">Guardar predicción</Link>
      </div>
      <BottomNav />
    </Phone>
  );
}

export function LoadingScreen() {
  return (
    <Phone glow={false}>
      <div className="trail" />
      <div className="content center"><h3>CARGANDO...</h3><img className="ball-img ball-lg" src="/assets/ball.png" alt="Balón cargando" /><p className="muted">Esto es solo el comienzo...</p></div>
    </Phone>
  );
}

export function GoalScreen() {
  return (
    <Phone glow={false}>
      <div className="confetti"><i /><i /><i /><i /><i /><i /></div>
      <div className="content center"><div className="goal-text">¡GOL!</div><img className="mascot" src="/assets/mascot.png" alt="Mascota celebrando" /><p className="muted" style={{ fontSize: 18, color: '#fff' }}>Tu pasión hace grande este juego familiar.</p></div>
    </Phone>
  );
}

export function LiveScreen() {
  return (
    <Phone>
      <div className="content top">
        <div className="menu-row"><Link className="back" href="/inicio">‹</Link><h3 style={{ margin: 0 }}>Partido en vivo</h3><span /></div>
        <div className="live-score">
          <div><div className="flag">🇵🇹</div><b>Portugal</b></div>
          <div><div className="score">1 - 1</div><small>65:23</small><br /><b className="gain">EN VIVO</b></div>
          <div><div className="flag">🇩🇪</div><b>Alemania</b></div>
        </div>
        <div className="tabs"><div>RESUMEN</div><div>ESTADÍSTICAS</div><div>ALINEACIONES</div></div>
        <div className="panel">
          <b>GENERAL</b>
          {[
            ['48%', 'Posesión', '52%', '48%'],
            ['8', 'Tiros', '10', '44%'],
            ['4', 'Tiros a puerta', '6', '40%'],
            ['6', 'Faltas', '7', '46%'],
          ].map(([a, label, b, width]) => (
            <div className="stat" key={label}><b>{a}</b><div><small>{label}</small><div className="bar"><span style={{ width }} /></div></div><b>{b}</b></div>
          ))}
        </div>
      </div>
    </Phone>
  );
}

export function RankingScreen() {
  return (
    <Phone glow={false}>
      <div className="content top">
        <div className="menu-row"><div className="icon-btn">☰</div><h3 style={{ margin: 0 }}>Ranking familiar</h3><span /></div>
        <div className="tabs"><div>TOTAL</div><div>APOSTADO</div><div>GANADO</div></div>
        <div className="podium">
          <div className="podium-card"><div className="medal">🥈</div><b>2</b><small>María López</small><b className="gain">Bs 52</b></div>
          <div className="podium-card first"><div className="medal">🏆</div><b>1</b><small>Carlos Ramírez</small><b className="gain">Bs 56</b></div>
          <div className="podium-card"><div className="medal">🥉</div><b>3</b><small>Juan Pérez</small><b className="loss">Bs -13</b></div>
        </div>
        <div className="panel rank">
          <div className="rank-row"><div><span>4</span>Pedro Sánchez</div><b>Bs -20 ›</b></div>
          <div className="rank-row"><div><span>5</span>Ana Torres</div><b>Bs -34 ›</b></div>
          <div className="rank-row"><div><span>6</span>Rodrigo Vargas</div><b>Bs -39 ›</b></div>
        </div>
      </div>
      <BottomNav />
    </Phone>
  );
}

export function SuccessScreen() {
  return (
    <Phone>
      <div className="content center">
        <div className="check-big">✓</div>
        <h2 style={{ fontSize: 25, textTransform: 'none' }}>¡Predicción guardada!</h2>
        <p className="muted">Tu predicción ha sido registrada correctamente.</p>
        <Link className="btn" style={{ marginTop: 28 }} href="/inicio">Ver mis predicciones</Link>
      </div>
      <BottomNav />
    </Phone>
  );
}
