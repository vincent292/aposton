'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { savePredictionAction } from '@/app/prediccion/actions';
import type {
  ExistingPrediction,
  Match,
  PredictedWinner,
} from '@/lib/quiniela/types';
import { getPredictionClosedMessage, isPredictionOpen } from '@/lib/quiniela/rules';
import { Team } from './MatchCard';
import { SubmitButton } from './SubmitButton';

export function PredictionClient({
  match,
  existingPrediction,
  isSupabaseConfigured,
  errorMessage,
}: {
  match: Match;
  existingPrediction: ExistingPrediction | null;
  isSupabaseConfigured: boolean;
  errorMessage?: string | null;
}) {
  const [betMode, setBetMode] = useState<'winner' | 'exact_score'>(
    existingPrediction?.betMode ?? 'winner'
  );
  const [homeScore, setHomeScore] = useState(existingPrediction?.homeScore ?? 1);
  const [awayScore, setAwayScore] = useState(existingPrediction?.awayScore ?? 0);
  const [predictedWinner, setPredictedWinner] = useState<PredictedWinner>(
    existingPrediction?.predictedWinner ?? 'home'
  );

  const total = useMemo(
    () => (betMode === 'exact_score' ? match.exactScoreStake : match.winnerStake),
    [betMode, match.exactScoreStake, match.winnerStake]
  );

  const canEdit = !existingPrediction || existingPrediction.canEdit;
  const predictionOpen = isPredictionOpen(match);
  const canSubmit = Boolean(match.recordId && isSupabaseConfigured && canEdit && predictionOpen);
  const helperMessage = existingPrediction
    ? existingPrediction.canEdit
      ? 'Tu apuesta ya esta guardada. Todavia tienes un solo cambio antes del partido.'
      : 'Tu apuesta ya uso el unico cambio permitido para este partido.'
    : predictionOpen
      ? 'Tu primera apuesta se guarda normal. Despues solo podras modificarla una vez.'
      : getPredictionClosedMessage(match);

  return (
    <div className="prediction-grid">
      <section className="prediction-main glass-card">
        <Link className="back-link" href="/inicio">
          Volver a partidos
        </Link>
        <p className="eyebrow">Realizar prediccion</p>
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
            Este partido aun no existe en la tabla <code>matches</code>.
          </div>
        ) : null}

        {match.recordId && !predictionOpen ? (
          <div className="warning-banner">{getPredictionClosedMessage(match)}</div>
        ) : null}

        {betMode === 'exact_score' ? (
          <div className="score-area">
            <ScoreControl value={homeScore} onChange={setHomeScore} />
            <span>-</span>
            <ScoreControl value={awayScore} onChange={setAwayScore} />
          </div>
        ) : (
          <div className="winner-choices">
            <ChoiceCard
              label={match.home}
              value="home"
              active={predictedWinner === 'home'}
              onSelect={setPredictedWinner}
            />
            <ChoiceCard
              label="Empate"
              value="draw"
              active={predictedWinner === 'draw'}
              onSelect={setPredictedWinner}
            />
            <ChoiceCard
              label={match.away}
              value="away"
              active={predictedWinner === 'away'}
              onSelect={setPredictedWinner}
            />
          </div>
        )}
      </section>

      <aside className="bet-panel glass-card">
        <form action={savePredictionAction} className="form-stack compact">
          <input type="hidden" name="slug" value={match.id} />
          <input type="hidden" name="matchId" value={match.recordId ?? ''} />
          <input type="hidden" name="betMode" value={betMode} />
          <input type="hidden" name="predictedWinner" value={predictedWinner} />
          <input type="hidden" name="homeScore" value={homeScore} />
          <input type="hidden" name="awayScore" value={awayScore} />

          <h2>Tu apuesta</h2>
          <ModeCard
            title="Solo ganador o empate"
            price="Bs 1"
            active={betMode === 'winner'}
            onSelect={() => setBetMode('winner')}
          />
          <ModeCard
            title="Marcador exacto"
            price="Bs 2"
            active={betMode === 'exact_score'}
            onSelect={() => setBetMode('exact_score')}
          />
          <div className="total-row">
            <span>Total a pagar</span>
            <strong>{total} Bs</strong>
          </div>
          <div className="estimate-box">
            <div>
              <small>Simple</small>
              <b>Bs {match.winnerStake}</b>
            </div>
            <div>
              <small>Exacto</small>
              <b>Bs {match.exactScoreStake}</b>
            </div>
          </div>
          <SubmitButton
            className={`primary-btn${canSubmit ? '' : ' disabled'}`}
            label={existingPrediction ? 'Guardar unico cambio' : 'Guardar prediccion'}
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
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="score-control">
      <button type="button" onClick={() => onChange(Math.min(20, value + 1))}>
        +
      </button>
      <strong>{value}</strong>
      <button type="button" onClick={() => onChange(Math.max(0, value - 1))}>
        -
      </button>
    </div>
  );
}

function ModeCard({
  title,
  price,
  active,
  onSelect,
}: {
  title: string;
  price: string;
  active: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className={`bet-toggle ${active ? 'active' : ''}`}
      onClick={onSelect}
    >
      <span>{title}</span>
      <b>{price}</b>
      <i>{active ? 'OK' : '+'}</i>
    </button>
  );
}

function ChoiceCard({
  label,
  value,
  active,
  onSelect,
}: {
  label: string;
  value: PredictedWinner;
  active: boolean;
  onSelect: (value: PredictedWinner) => void;
}) {
  return (
    <button
      type="button"
      className={`choice-card ${active ? 'active' : ''}`}
      onClick={() => onSelect(value)}
    >
      {label}
    </button>
  );
}
