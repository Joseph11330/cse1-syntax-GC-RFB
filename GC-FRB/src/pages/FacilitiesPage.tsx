import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { facilitiesApi } from '../services/facilityApi';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Spinner from '../components/ui/Spinner';
import PageHeader from '../components/ui/PageHeader';
import ConfirmModal from '../components/ui/ConfirmModal';
import DataTable, { type Column } from '../components/ui/DataTable';
import FacilityForm from '../components/features/FacilityForm';
import type { Facility } from '../types';

export default function FacilitiesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data, loading, error, reload } = useAsync(facilitiesApi.list);
  const [editing, setEditing] = useState<Facility | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Facility | null>(null);

  const columns: Column<Facility>[] = [
    { key: 'name', header: 'Facility', render: (r) => <strong>{r.name}</strong> },
    { key: 'type', header: 'Type', render: (r) => r.type },
    { key: 'cap', header: 'Capacity', render: (r) => r.capacity },
    { key: 'loc', header: 'Location', render: (r) => r.location },
    { key: 'st', header: 'Status', render: (r) => <Badge>{r.status}</Badge> },
    ...(isAdmin ? [{ key: 'act', header: '', render: (r: Facility) => (
      <span className="row-actions">
        <Button variant="ghost" onClick={() => setEditing(r)}>Edit</Button>
        <Button variant="ghost" onClick={() => setDeleting(r)}>Delete</Button>
      </span>) }] : []),
  ];

  return (
    <>
      <PageHeader description="Spaces people can book. Facilities under maintenance can't be booked."
        action={isAdmin ? <Button onClick={() => setEditing('new')}>Add facility</Button> : undefined} />
      <Card>
        {loading ? <Spinner /> : error ? <p className="alert">{error}</p> :
          <DataTable columns={columns} rows={data ?? []} rowKey={(r) => r.id} empty="No facilities yet. Add the first one to start taking bookings." />}
      </Card>
      {editing && <FacilityForm facility={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} onSaved={reload} />}
      {deleting && <ConfirmModal title="Delete facility" confirmLabel="Delete facility" message={`Delete ${deleting.name}? Existing bookings keep their history.`}
        onConfirm={async () => { await facilitiesApi.remove(deleting.id); reload(); }} onClose={() => setDeleting(null)} />}
    </>
  );
}
