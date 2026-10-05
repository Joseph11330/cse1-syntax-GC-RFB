import { useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { bookingsApi, facilitiesApi } from '../services/facilityApi';
import { fmtDate, fmtTime } from '../utils/format';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import DataTable, { type Column } from '../components/ui/DataTable';
import BookingForm from '../components/features/BookingForm';
import type { Booking, BookingStatus } from '../types';

const STATUSES: BookingStatus[] = ['Pending', 'Approved', 'Rejected', 'Cancelled'];

export default function BookingsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const bookings = useAsync(bookingsApi.list);
  const facilities = useAsync(facilitiesApi.list);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [facility, setFacility] = useState('');
  const [creating, setCreating] = useState(false);
  const [cancelling, setCancelling] = useState<Booking | null>(null);

  const rows = useMemo(() => (bookings.data ?? []).filter((b) =>
    (!status || b.status === status) && (!facility || b.facilityId === facility) &&
    (!q || `${b.requester} ${b.purpose} ${b.facilityName}`.toLowerCase().includes(q.toLowerCase()))), [bookings.data, q, status, facility]);

  const act = async (b: Booking, s: BookingStatus) => { await bookingsApi.setStatus(b.id, s); bookings.reload(); };

  const columns: Column<Booking>[] = [
    { key: 'when', header: 'When', render: (r) => <>{fmtDate(r.date)}<br /><small className="muted">{fmtTime(r.start)} – {fmtTime(r.end)}</small></> },
    { key: 'fac', header: 'Facility', render: (r) => r.facilityName },
    { key: 'who', header: 'Booked by', render: (r) => r.requester },
    { key: 'why', header: 'Purpose', render: (r) => r.purpose },
    { key: 'st', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    { key: 'act', header: '', render: (r) => (
      <span className="row-actions">
        {isAdmin && r.status === 'Pending' && <>
          <Button onClick={() => act(r, 'Approved')}>Approve</Button>
          <Button variant="ghost" onClick={() => act(r, 'Rejected')}>Reject</Button>
        </>}
        {(r.status === 'Pending' || r.status === 'Approved') && <Button variant="ghost" onClick={() => setCancelling(r)}>Cancel</Button>}
      </span>) },
  ];

  return (
    <>
      <PageHeader description="Review requests, approve or reject them, and book a facility for someone."
        action={<Button onClick={() => setCreating(true)}>New booking</Button>} />
      <Card>
        <div className="filters">
          <Input label="Search" placeholder="Name, purpose, or facility" value={q} onChange={(e) => setQ(e.target.value)} />
          <Select label="Status" value={status} onChange={(e) => setStatus(e.target.value)} placeholder="All statuses" options={STATUSES.map((s) => ({ value: s, label: s }))} />
          <Select label="Facility" value={facility} onChange={(e) => setFacility(e.target.value)} placeholder="All facilities"
            options={(facilities.data ?? []).map((f) => ({ value: f.id, label: f.name }))} />
        </div>
        {bookings.loading ? <Spinner /> : bookings.error ? <p className="alert">{bookings.error}</p> :
          <DataTable columns={columns} rows={rows} rowKey={(r) => r.id} empty="No bookings match these filters. Clear a filter or create a new booking." />}
      </Card>
      {creating && <BookingForm facilities={facilities.data ?? []} requester={user?.name ?? ''} onClose={() => setCreating(false)} onSaved={bookings.reload} />}
      {cancelling && <ConfirmModal title="Cancel booking" confirmLabel="Cancel booking"
        message={`Cancel ${cancelling.facilityName} for ${cancelling.requester} on ${fmtDate(cancelling.date)}? The slot opens up for others.`}
        onConfirm={() => act(cancelling, 'Cancelled')} onClose={() => setCancelling(null)} />}
    </>
  );
}
