import { Landmark, Trophy, WalletCards } from 'lucide-react';
import { formatCurrency } from '@/lib/quiniela/format';
import type { UserDashboardSummary } from '@/lib/quiniela/types';

export function UserSummary({ summary }: { summary: UserDashboardSummary }) {
  const items = [
    {
      label: 'Apostado',
      value: formatCurrency(summary.totalStaked),
      icon: Landmark,
      tone: 'stake',
    },
    {
      label: 'Ganado',
      value: formatCurrency(summary.totalWon),
      icon: Trophy,
      tone: 'won',
    },
    {
      label: 'Saldo',
      value: formatCurrency(summary.balance),
      icon: WalletCards,
      tone: summary.balance >= 0 ? 'won' : 'loss',
    },
  ] as const;

  return (
    <section className="inicio-panel-card inicio-summary-card">
      <div className="inicio-card-heading">
        <div>
          <p className="inicio-card-kicker">Mis resumen</p>
          <h2>Tu tablero rapido</h2>
        </div>
      </div>

      <div className="inicio-summary-grid">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <article className={`inicio-summary-item ${item.tone}`} key={item.label}>
              <span className="inicio-summary-item__icon">
                <Icon size={16} aria-hidden="true" />
              </span>
              <small>{item.label}</small>
              <strong>{item.value}</strong>
            </article>
          );
        })}
      </div>
    </section>
  );
}
