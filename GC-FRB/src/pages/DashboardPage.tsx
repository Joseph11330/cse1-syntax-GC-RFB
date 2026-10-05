import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { dashboardApi } from '../services/api';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import DataTable, { type Column } from '../components/ui/DataTable';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import type { Activity } from '../types';

const columns: Column<Activity>[] = [
  { key: 'id', header: 'Ref', render: (r) => r.id },
  { key: 'title', header: 'Activity', render: (r) => r.title },
  { key: 'by', header: 'By', render: (r) => r.by },
  { key: 'date', header: 'Date', render: (r) => r.date },
  { key: 'status', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const stats = useAsync(dashboardApi.stats);
  const activity = useAsync(dashboardApi.activity);

  return (
    <>
      <p className="greeting">Welcome back, {user?.name.split(' ')[0]}.</p>

      {stats.loading ? <Spinner /> : stats.error ? <p className="alert">{stats.error}</p> : (
        <div className="stat-grid">{stats.data?.map((s) => <StatCard key={s.label} {...s} />)}</div>
      )}

      <Card title="Recent activity">
        {activity.loading ? <Spinner /> : activity.error ? <p className="alert">{activity.error}</p> : (
          <DataTable columns={columns} rows={activity.data ?? []} rowKey={(r) => r.id} empty="No activity yet. New entries will show up here." />
        )}
      </Card>
    </>
  );
}
