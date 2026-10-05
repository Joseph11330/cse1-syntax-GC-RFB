interface Props { data: { label: string; value: number }[]; unit?: string; tone?: 'pine' | 'amber'; }

// Dependency-free horizontal bar chart. Reuse for any label/value series.
export default function BarChart({ data, unit = '', tone = 'pine' }: Props) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <ul className="bars">
      {data.map((d) => (
        <li key={d.label}>
          <span className="bars__label">{d.label}</span>
          <span className="bars__track"><span className={`bars__fill bars__fill--${tone}`} style={{ width: `${(d.value / max) * 100}%` }} /></span>
          <span className="bars__value">{d.value}{unit}</span>
        </li>
      ))}
    </ul>
  );
}
