import { useState, type FormEvent } from 'react';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import { bookingsApi } from '../../services/facilityApi';
import { isoDate, toMin } from '../../utils/format';
import type { BookingInput, Facility } from '../../types';

export default function BookingForm({ facilities, requester, onClose, onSaved }: { facilities: Facility[]; requester: string; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState<BookingInput>({ facilityId: '', requester, purpose: '', date: isoDate(new Date()), start: '09:00', end: '10:00' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const up = (k: keyof BookingInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  const open = facilities.filter((x) => x.status === 'Available');

  async function submit(e: FormEvent) {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.facilityId) er.facilityId = 'Choose a facility.';
    if (!f.requester.trim()) er.requester = 'Enter who is booking.';
    if (!f.purpose.trim()) er.purpose = 'Enter what it is for.';
    if (f.date < isoDate(new Date())) er.date = 'Pick today or a later date.';
    if (toMin(f.end) <= toMin(f.start)) er.end = 'End time must be after the start time.';
    setErrors(er);
    if (Object.keys(er).length) return;
    setBusy(true);
    try { await bookingsApi.create(f); onSaved(); onClose(); }
    catch (err: any) { setErrors({ form: err.message }); setBusy(false); }
  }

  return (
    <Modal title="New booking" onClose={onClose}>
      <form onSubmit={submit} noValidate>
        {errors.form && <p className="alert" role="alert">{errors.form}</p>}
        <Select label="Facility" value={f.facilityId} onChange={up('facilityId')} placeholder="Choose a facility" error={errors.facilityId}
          options={open.map((x) => ({ value: x.id, label: `${x.name} (up to ${x.capacity})` }))} />
        <Input label="Date" type="date" value={f.date} min={isoDate(new Date())} onChange={up('date')} error={errors.date} />
        <div className="grid-2">
          <Input label="Start" type="time" value={f.start} onChange={up('start')} />
          <Input label="End" type="time" value={f.end} onChange={up('end')} error={errors.end} />
        </div>
        <Input label="Booked by" value={f.requester} onChange={up('requester')} error={errors.requester} />
        <Input label="Purpose" value={f.purpose} onChange={up('purpose')} error={errors.purpose} />
        <div className="modal__actions">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy}>Submit booking</Button>
        </div>
      </form>
    </Modal>
  );
}
