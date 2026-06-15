'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Target, X } from 'lucide-react';
import { savePredictionAction } from '@/app/prediccion/actions';
import { formatPredictedWinner } from '@/lib/quiniela/format';
import { getPredictionClosedMessage, isPredictionOpen } from '@/lib/quiniela/rules';
import type {
  Match,
  MatchPredictionSet,
  PredictedWinner,
} from '@/lib/quiniela/types';
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
  const [betModalOpen, setBetModalOpen] = useState(false);

  const total = useMemo(
    () => match.winnerStake + match.exactScoreStake,
    [match.exactScoreStake, match.winnerStake]
  );

  const predictionOpen = isPredictionOpen(match);
  const canSubmit = Boolean(match.recordId && isSupabaseConfigured && predictionOpen);
  const helperMessage = predictionOpen
    ? 'Abre el modal para registrar ganador y marcador exacto. Cada apuesta permite un solo cambio.'
    : getPredictionClosedMessage(match);
  const winnerLocked = Boolean(
    existingPredictions.winner && !existingPredictions.winner.canEdit
  );
  const exactLocked = Boolean(
    existingPredictions.exactScore && !existingPredictions.exactScore.canEdit
  );
  const hasPredictions = Boolean(
    existingPredictions.winner || existingPredictions.exactScore
  );

  useEffect(() => {
    if (!betModalOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setBetModalOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [betModalOpen]);

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
          {match.date} - {match.time}
          <br />
          {match.stadium}
          {!match.live ? <small>Hora local de la sede</small> : null}
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

        <div className="prediction-summary glass-card">
          <div className="prediction-summary__head">
            <div>
              <p className="eyebrow">Tu jugada</p>
              <h2>{hasPredictions ? 'Revisa lo guardado' : 'Aun no apostaste este partido'}</h2>
            </div>
            <strong>{total} Bs</strong>
          </div>

          <div className="prediction-preview-grid">
            <PredictionPreviewItem
              label="Ganador o empate"
              value={
                existingPredictions.winner
                  ? formatPredictedWinner(existingPredictions.winner.predictedWinner, {
                      home: match.home,
                      away: match.away,
                    })
                  : 'Lo eliges dentro del modal'
              }
              price={`Bs ${match.winnerStake}`}
            />
            <PredictionPreviewItem
              label="Marcador exacto"
              value={
                existingPredictions.exactScore
                  ? `${match.home} ${existingPredictions.exactScore.homeScore ?? 0} - ${existingPredictions.exactScore.awayScore ?? 0} ${match.away}`
                  : 'Lo defines dentro del modal'
              }
              price={`Bs ${match.exactScoreStake}`}
            />
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

          <button
            className={`primary-btn prediction-summary__cta${canSubmit ? '' : ' disabled'}`}
            type="button"
            disabled={!canSubmit}
            onClick={() => setBetModalOpen(true)}
          >
            {hasPredictions ? 'Editar apuesta' : 'Apostar'}
          </button>
        </div>
      </section>

      {betModalOpen ? (
        <div
          className="prediction-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="prediction-modal-title"
          onClick={() => setBetModalOpen(false)}
        >
          <div
            className="prediction-modal__card glass-card"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="prediction-modal__head">
              <div>
                <p className="eyebrow">Apuesta</p>
                <h2 id="prediction-modal-title">Completa tu jugada</h2>
              </div>
              <button
                type="button"
                className="prediction-modal__close"
                aria-label="Cerrar modal"
                onClick={() => setBetModalOpen(false)}
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <form
              action={savePredictionAction}
              className="form-stack compact bet-panel bet-panel--modal"
            >
              <input type="hidden" name="slug" value={match.id} />
              <input type="hidden" name="matchId" value={match.recordId ?? ''} />
              <input type="hidden" name="winnerPredictedWinner" value={predictedWinner} />
              <input type="hidden" name="exactHomeScore" value={homeScore} />
              <input type="hidden" name="exactAwayScore" value={awayScore} />

              <p className="prediction-modal__meta">
                {match.home} vs {match.away} - {match.time}
              </p>

              <div className="prediction-section-card prediction-section-card--modal">
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

              <div className="prediction-section-card prediction-section-card--modal">
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
                  <ScoreControl
                    value={homeScore}
                    disabled={exactLocked}
                    onChange={setHomeScore}
                  />
                  <span>-</span>
                  <ScoreControl
                    value={awayScore}
                    disabled={exactLocked}
                    onChange={setAwayScore}
                  />
                </div>
              </div>

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

              <SubmitButton
                className={`primary-btn${canSubmit ? '' : ' disabled'}`}
                label="Guardar apuestas"
                pendingLabel="Guardando..."
                disabled={!canSubmit}
              />
            </form>
          </div>
        </div>
      ) : null}
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

function PredictionPreviewItem({
  label,
  value,
  price,
}: {
  label: string;
  value: string;
  price: string;
}) {
  return (
    <div className="prediction-preview-item">
      <small>{label}</small>
      <b>{value}</b>
      <span>{price}</span>
    </div>
  );
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
