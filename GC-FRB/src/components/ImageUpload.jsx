import { useRef } from 'react'
import { ImagePlus, Trash2 } from 'lucide-react'

const MAX_EDGE = 1280

// Shrinks a photo in the browser so we never send a 10 MB phone picture to the API.
const shrink = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    URL.revokeObjectURL(url)
    resolve(c.toDataURL('image/jpeg', 0.82))
  }
  img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('That file is not a readable image.')) }
  img.src = url
})

// Photo picker with preview. `value` is an image URL or data URL; `onChange(newValue | '')`.
export default function ImageUpload({ value, onChange, onError, className = '' }) {
  const input = useRef(null)
  const pick = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!file.type.startsWith('image/')) return onError?.('Please choose an image file (JPG, PNG or WebP).')
    if (file.size > 12 * 1024 * 1024) return onError?.('That photo is larger than 12 MB. Choose a smaller one.')
    try { onChange(await shrink(file)) } catch (err) { onError?.(err.message) }
  }
  return (
    <div className={className}>
      <input ref={input} type="file" accept="image/*" onChange={pick} className="hidden" />
      {value ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-xl ring-1 ring-slate-200">
          <img src={value} alt="Facility preview" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex justify-end gap-2 bg-gradient-to-t from-black/60 to-transparent p-2">
            <button type="button" onClick={() => input.current?.click()} className="rounded-lg bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-white">Replace</button>
            <button type="button" aria-label="Remove photo" onClick={() => onChange('')} className="grid place-items-center rounded-lg bg-white/90 px-2 text-rose-600 hover:bg-white"><Trash2 size={13} /></button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => input.current?.click()}
          className="flex w-full max-w-xs flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 px-4 py-6 text-center text-[11px] text-slate-500 transition hover:border-gc-500 hover:bg-gc-50/60">
          <ImagePlus size={22} className="text-gc-600" />
          <span className="font-semibold text-slate-700">Upload a photo of the real room</span>
          <span>JPG, PNG or WebP</span>
        </button>
      )}
    </div>
  )
}
