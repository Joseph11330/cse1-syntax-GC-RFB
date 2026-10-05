import { useState } from 'react';
import { useAsync } from '../hooks/useAsync';
import { analyticsApi } from '../services/facilityApi';
import Card from '../components/ui/Card';
import StatCard from '../components/ui/StatCard';
import BarChart from '../components/ui/BarChart';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';
import DataTable, { type Column } from '../components/ui/DataTable';

type Row = { label: string; value: number; hours: number };

export default function AnalyticsPage() {
  const [days, setDays] = useState('30');
  const { data: a, loading, error } = useAsync(() => analyticsApi.summary(Number(days)), [days]);

  const columns: Column<Row>[] = [
    { key: 'f', header: 'Facility', render: (r) => r.label },
    { key: 'b', header: 'Approved bookings', render: (r) => r.value },
    { key: 'h', header: 'Hours booked', render: (r) => r.hours },
  ];

  return (
    <>
      <PageHeader description="See which facilities get used, when, and how many requests get approved."
        action={<div className="range"><Select label="Period" value={days} onChange={(e) => setDays(e.target.value)}
          options={[{ value: '30', label: 'Last 30 days' }, { value: '60', label: 'Last 60 days' }, { value: '90', label: 'Last 90 days' }]} /></div>} />

      {loading && !a ? <Spinner /> : error ? <p className="alert">{error}</p> : a && (
        <>
          <div className="stat-grid">
            <StatCard label="Booking requests" value={String(a.total)} />
            <StatCard label="Approval rate" value={`${a.approvalRate}%`} hint="Approved out of decided requests" tone="good" />
            <StatCard label="Hours booked" value={String(a.hours)} hint="Approved bookings only" />
            <StatCard label="Most used facility" value={a.topFacility} />
          </div>
          <div className="grid-chart">
            <Card title="Approved bookings per facility"><BarChart data={a.byFacility} /></Card>
            <Card title="Requests by status"><BarChart data={a.byStatus} tone="amber" /></Card>
            <Card title="Busiest days of the week"><BarChart data={a.byWeekday} /></Card>
          </div>
          <Card title="Facility usage"><DataTable columns={columns} rows={a.byFacility} rowKey={(r) => r.label} /></Card>
        </>
      )}
    </>
  );
}
