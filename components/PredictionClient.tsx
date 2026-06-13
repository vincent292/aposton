'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Target } from 'lucide-react';
import { savePredictionAction } from '@/app/prediccion/actions';
import type {
  Match,
  MatchPredictionSet,
  PredictedWinner,
} from '@/lib/quiniela/types';
import { getPredictionClosedMessage, isPredictionOpen } from '@/lib/quiniela/rules';
import { Team } from './MatchCard';
import { SubmitButton } from './SubmitButton';

export function PredictionClient({
  match,
  existingPredictions,
  isSupabaseConfigured,
  errorMessage,
}: {
  match: Match;
  existingPredictions: MatchPredictionSet;
  isSupabaseConfigured: boolean;
  errorMessage?: string | null;
}) {
  const [homeScore, setHomeScore] = useState(existingPredictions.exactScore?.homeScore ?? 1);
  const [awayScore, setAwayScore] = useState(existingPredictions.exactScore?.awayScore ?? 0);
  const [predictedWinner, setPredictedWinner] = useState<PredictedWinner>(
    existingPredictions.winner?.predictedWinner ?? 'home'
  );

  const total = useMemo(
    () => match.winnerStake + match.exactScoreStake,
    [match.exactScoreStake, match.winnerStake]
  );

  const predictionOpen = isPredictionOpen(match);
  const canSubmit = Boolean(match.recordId && isSupabaseConfigured && predictionOpen);
  const helperMessage = predictionOpen
    ? 'Ahora puedes guardar las dos apuestas del mismo partido: ganador y marcador exacto. Cada una permite un solo cambio.'
    : getPredictionClosedMessage(match);
  const winnerLocked = Boolean(
    existingPredictions.winner && !existingPredictions.winner.canEdit
  );
  const exactLocked = Boolean(
    existingPredictions.exactScore && !existingPredictions.exactScore.canEdit
  );

  return (
    <div className="prediction-grid">
      <section className="prediction-main glass-card">
        <Link className="back-link" href="/inicio">
          Volver a partidos
        </Link>
        <p className="eyebrow">Aposton 2026</p>
        <div className="prediction-teams">
          <Team flag={match.homeFlag} name={match.home} />
          <div className="versus">VS</div>
          <Team flag={match.awayFlag} name={match.away} />
        </div>
        <p className="center-meta">
          {match.date} · {match.time}
          <br />
          {match.stadium}
        </p>

        <div className="info-banner">
          <strong>Regla activa</strong>
          <span>{helperMessage}</span>
        </div>

        {errorMessage ? <div className="error-banner">{errorMessage}</div> : null}

        {!isSupabaseConfigured ? (
          <div className="warning-banner">
            El guardado de apuestas aun no esta disponible.
          </div>
        ) : null}

        {!match.recordId ? (
          <div className="warning-banner">
            Este partido todavia se esta sincronizando para Aposton.
          </div>
        ) : null}

        {match.recordId && !predictionOpen ? (
          <div className="warning-banner">{getPredictionClosedMessage(match)}</div>
        ) : null}

        <div className="prediction-section-card">
          <div className="prediction-section-card__head">
            <div>
              <small>Ganador o empate</small>
              <strong>Bs {match.winnerStake}</strong>
            </div>
            <PredictionStateChip
              label={
                existingPredictions.winner
                  ? winnerLocked
                    ? 'Cambio usado'
                    : 'Guardado'
                  : 'Nuevo'
              }
              tone={existingPredictions.winner ? 'filled' : 'idle'}
            />
          </div>

          <div className="winner-choices">
            <ChoiceCard
              label={match.home}
              value="home"
              active={predictedWinner === 'home'}
              disabled={winnerLocked}
              onSelect={setPredictedWinner}
            />
            <ChoiceCard
              label="Empate"
              value="draw"
              active={predictedWinner === 'draw'}
              disabled={winnerLocked}
              onSelect={setPredictedWinner}
            />
            <ChoiceCard
              label={match.away}
              value="away"
              active={predictedWinner === 'away'}
              disabled={winnerLocked}
              onSelect={setPredictedWinner}
            />
          </div>
        </div>

        <div className="prediction-section-card">
          <div className="prediction-section-card__head">
            <div>
              <small>Marcador exacto</small>
              <strong>Bs {match.exactScoreStake}</strong>
            </div>
            <PredictionStateChip
              label={
                existingPredictions.exactScore
                  ? exactLocked
                    ? 'Cambio usado'
                    : 'Guardado'
                  : 'Nuevo'
              }
              tone={existingPredictions.exactScore ? 'filled' : 'idle'}
            />
          </div>

          <div className="score-area">
            <ScoreControl value={homeScore} disabled={exactLocked} onChange={setHomeScore} />
            <span>-</span>
            <ScoreControl value={awayScore} disabled={exactLocked} onChange={setAwayScore} />
          </div>
        </div>
      </section>

      <aside className="bet-panel glass-card">
        <form action={savePredictionAction} className="form-stack compact">
          <input type="hidden" name="slug" value={match.id} />
          <input type="hidden" name="matchId" value={match.recordId ?? ''} />
          <input type="hidden" name="winnerPredictedWinner" value={predictedWinner} />
          <input type="hidden" name="exactHomeScore" value={homeScore} />
          <input type="hidden" name="exactAwayScore" value={awayScore} />

          <h2>Tu apuesta doble</h2>
          <div className="bet-mode-list">
            <ModeSummaryCard
              title="Ganador"
              description={`Eliges ${predictedWinner === 'draw' ? 'empate' : predictedWinner === 'home' ? match.home : match.away}`}
              price={`Bs ${match.winnerStake}`}
              mascot="/assets/mascot.png"
            />
            <ModeSummaryCard
              title="Marcador exacto"
              description={`${match.home} ${homeScore} - ${awayScore} ${match.away}`}
              price={`Bs ${match.exactScoreStake}`}
              mascot="/assets/mascot.png"
            />
          </div>
          <div className="total-row">
            <span>Total a pagar</span>
            <strong>{total} Bs</strong>
          </div>
          <div className="estimate-box">
            <div>
              <small>Ganador</small>
              <b>Bs {match.winnerStake}</b>
            </div>
            <div>
              <small>Exacto</small>
              <b>Bs {match.exactScoreStake}</b>
            </div>
          </div>

          {(winnerLocked || exactLocked) && predictionOpen ? (
            <div className="warning-banner">
              {winnerLocked && exactLocked
                ? 'Ya usaste el cambio de ambas apuestas. Solo podras revisar lo guardado.'
                : winnerLocked
                  ? 'La apuesta de ganador ya uso su cambio. El marcador exacto aun puede actualizarse si no lo cambiaste antes.'
                  : 'El marcador exacto ya uso su cambio. La apuesta de ganador aun puede actualizarse si no la cambiaste antes.'}
            </div>
          ) : null}

          <SubmitButton
            className={`primary-btn${canSubmit ? '' : ' disabled'}`}
            label="Guardar apuestas"
            pendingLabel="Guardando..."
            disabled={!canSubmit}
          />
        </form>
      </aside>
    </div>
  );
}

function ScoreControl({
  value,
  disabled = false,
  onChange,
}: {
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}) {
  return (
    <div className="score-control">
      <button type="button" disabled={disabled} onClick={() => onChange(Math.min(20, value + 1))}>
        +
      </button>
      <strong>{value}</strong>
      <button type="button" disabled={disabled} onClick={() => onChange(Math.max(0, value - 1))}>
        -
      </button>
    </div>
  );
}

function PredictionStateChip({
  label,
  tone,
}: {
  label: string;
  tone: 'filled' | 'idle';
}) {
  return <span className={`prediction-state-chip is-${tone}`}>{label}</span>;
}

function ModeSummaryCard({
  title,
  description,
  price,
  mascot,
}: {
  title: string;
  description: string;
  price: string;
  mascot: string;
}) {
  return (
    <div className="bet-toggle active is-summary">
      <div className="bet-toggle__copy">
        <span>{title}</span>
        <small>{description}</small>
      </div>
      <b>{price}</b>
      <div className="bet-toggle__mascot">
        <img src={mascot} alt="" />
      </div>
    </div>
  );
}

function ChoiceCard({
  label,
  value,
  active,
  disabled = false,
  onSelect,
}: {
  label: string;
  value: PredictedWinner;
  active: boolean;
  disabled?: boolean;
  onSelect: (value: PredictedWinner) => void;
}) {
  return (
    <button
      type="button"
      className={`choice-card ${active ? 'active' : ''}`}
      disabled={disabled}
      onClick={() => onSelect(value)}
    >
      <Target size={15} aria-hidden="true" />
      {label}
    </button>
  );
}
