import { Baby, ShieldCheck } from 'lucide-react';
import { registerDependentAction } from '@/app/perfil/actions';
import type { FamilyDependent, Viewer } from '@/lib/quiniela/types';
import { SubmitButton } from './SubmitButton';

export function FamilyDependentsCard({
  viewer,
  dependents,
}: {
  viewer: Viewer | null;
  dependents: FamilyDependent[];
}) {
  return (
    <section className="inicio-panel-card family-dependents-card">
      <div className="inicio-card-heading">
        <div>
          <p className="inicio-card-kicker">Familia</p>
          <h2>Hijos registrados</h2>
        </div>
        <span className="inicio-heading-pill">{dependents.length} vinculados</span>
      </div>

      <div className="family-dependent-list">
        {dependents.length ? (
          dependents.map((dependent) => (
            <article className="family-dependent-row" key={dependent.id}>
              <span className="family-dependent-row__icon">
                <Baby size={16} aria-hidden="true" />
              </span>
              <div>
                <strong>{dependent.fullName}</strong>
                <small>CI {dependent.documentNumber}</small>
              </div>
              <b>Hijo/a</b>
            </article>
          ))
        ) : (
          <div className="inicio-empty-card">
            No hay hijos registrados todavia en esta cuenta de Aposton.
          </div>
        )}
      </div>

      {viewer ? (
        <form action={registerDependentAction} className="form-stack family-dependent-form">
          <input type="hidden" name="relationship" value="child" />
          <label>
            <span>Nombre del hijo o hija</span>
            <input name="fullName" placeholder="Valentina Perez" required />
          </label>
          <label>
            <span>Carnet / CI</span>
            <input name="documentNumber" placeholder="1234567 LP" required />
          </label>
          <div className="info-banner family-dependent-info">
            <strong>Control familiar</strong>
            <span>
              Solo el padre o madre autenticado puede registrar perfiles marcados como hijo o
              hija.
            </span>
          </div>
          <SubmitButton
            className="inicio-primary-btn wide"
            label="Registrar hijo"
            pendingLabel="Guardando..."
          />
        </form>
      ) : (
        <div className="warning-banner">
          Inicia sesion para registrar a tu hijo o hija en Aposton.
        </div>
      )}

      <div className="family-dependent-trust">
        <ShieldCheck size={15} aria-hidden="true" />
        El vinculo queda atado a la cuenta que lo registra.
      </div>
    </section>
  );
}
