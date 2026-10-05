import { useState, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { facilitiesApi } from '../../services/facilityApi';
import type { Facility, FacilityInput } from '../../types';

const blank: FacilityInput = { name: '', type: 'Room', capacity: 10, location: '', status: 'Available' };

export default function FacilityForm({ facility, onClose, onSaved }: { facility?: Facility; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<FacilityInput>(facility ? { ...facility } : blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: keyof FacilityInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF({ ...f, [k]: k === 'capacity' ? Number(e.target.value) : e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.name.trim()) er.name = 'Enter the facility name.';
    if (!f.location.trim()) er.location = 'Enter where it is.';
    if (!(f.capacity > 0)) er.capacity = 'Capacity must be at least 1.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await facilitiesApi.save({ ...f, name: f.name.trim(), location: f.location.trim() }, facility?.id); onSaved(); onClose(); }
    catch (err: any) { setErrors({ form: err.message }); setBusy(false); }
  }

  return (
    <Modal title={facility ? 'Edit facility' : 'Add facility'} onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {errors.form && <p className="alert" role="alert">{errors.form}</p>}
        <Input label="Name" value={f.name} onChange={up('name')} error={errors.name} />
        <div className="grid-2">
          <Select label="Type" value={f.type} onChange={up('type')} options={['Court', 'Hall', 'Room', 'Field'].map((v) => ({ value: v, label: v }))} />
          <Input label="Capacity (people)" type="number" min={1} value={f.capacity} onChange={up('capacity')} error={errors.capacity} />
        </div>
        <Input label="Location" value={f.location} onChange={up('location')} error={errors.location} />
        <Select label="Status" value={f.status} onChange={up('status')} options={[{ value: 'Available', label: 'Available for booking' }, { value: 'Maintenance', label: 'Under maintenance' }]} />
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Save facility</Button>
        </div>
      </form>
    </Modal>
  );
}
