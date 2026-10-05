import type { ReactNode } from 'react';

export default function Card({ title, action, children }: { title?: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card__head"><h2>{title}</h2>{action}</header>
      )}
      {children}
    </section>
  );
}
