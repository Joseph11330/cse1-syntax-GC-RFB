import { useState } from 'react';
import Modal from './Modal';
import Button from './Button';

interface Props { title: string; message: string; confirmLabel: string; onConfirm: () => Promise<void>; onClose: () => void; }
export default function ConfirmModal({ title, message, confirmLabel, onConfirm, onClose }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  async function go() {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch (e: any) { setErr(e.message); setBusy(false); }
  }
  return (
    <Modal title={title} onClose={onClose}>
      <p>{message}</p>
      {err && <p className="alert" role="alert">{err}</p>}
      <div className="modal__actions">
        <Button variant="ghost" onClick={onClose}>Keep it</Button>
        <Button loading={busy} onClick={go}>{confirmLabel}</Button>
      </div>
    </Modal>
  );
}
