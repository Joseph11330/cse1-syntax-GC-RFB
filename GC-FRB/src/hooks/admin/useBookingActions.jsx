import { useState } from 'react'
import { AlertTriangle, XCircle } from 'lucide-react'
import { ConfirmModal } from '../../components/ui/index'
import { acceptBooking, rejectBooking, whenLabel } from '../../data/admin/bookings'
function useBookingActions(onChange) {
  const [dialog, setDialog] = useState(null)
  const accept = (b) => {
    const res = acceptBooking(b.id)
    if (res.ok) onChange?.()
    else setDialog({ type: 'conflict', b, conflict: res.conflict })
  }
  const reject = (b) => setDialog({ type: 'reject', b })
  const close = () => setDialog(null)
  const modals =
    dialog &&
    (dialog.type === 'reject' ? (
      <ConfirmModal
        icon={XCircle}
        tone="red"
        title="Reject this request?"
        message={`${dialog.b.who}'s request for ${dialog.b.room} (${whenLabel(dialog.b)}) will be marked as cancelled.`}
        confirmLabel="Yes, reject"
        onCancel={close}
        onConfirm={() => {
          rejectBooking(dialog.b.id)
          close()
          onChange?.()
        }}
      />
    ) : (
      <ConfirmModal
        icon={AlertTriangle}
        tone="amber"
        title="Schedule conflict"
        hideCancel
        confirmLabel="Got it"
        onCancel={close}
        onConfirm={close}
        message={`${dialog.b.room} is already confirmed for ${dialog.conflict.who} (${whenLabel(dialog.conflict)}). Reject this request or ask the requester to pick another time.`}
      />
    ))
  return { accept, reject, modals }
}
export { useBookingActions }
