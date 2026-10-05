import type { Stat } from '../../types';

export default function StatCard({ label, value, hint, tone = 'default' }: Stat) {
  return (
    <div className={`stat stat--${tone}`}>
      <p className="stat__label">{label}</p>
      <p className="stat__value">{value}</p>
      {hint && <p className="stat__hint">{hint}</p>}
    </div>
  );
}
