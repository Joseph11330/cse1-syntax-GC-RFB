import type { ReactNode } from 'react';

export default function PageHeader({ description, action }: { description: string; action?: ReactNode }) {
  return <div className="page-head"><p className="muted">{description}</p>{action}</div>;
}
