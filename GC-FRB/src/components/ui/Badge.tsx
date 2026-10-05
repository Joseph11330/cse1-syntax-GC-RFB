const tones: Record<string, string> = {
  Done: 'good', Approved: 'good', Available: 'good',
  Pending: 'warn', Maintenance: 'warn',
  Flagged: 'bad', Rejected: 'bad', Cancelled: 'muted',
};
export default function Badge({ children }: { children: string }) {
  return <span className={`badge badge--${tones[children] ?? 'good'}`}>{children}</span>;
}
