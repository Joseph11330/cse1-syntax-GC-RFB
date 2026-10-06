import { Link } from 'react-router-dom'

// Placeholder: the Booker booking flow gets built here.
// The landing page's "Book now" buttons already point to /book.
function Book() {
  return (
    <div className="grid min-h-screen place-items-center bg-gc-50 px-5 text-center">
      <div>
        <h1 className="text-3xl font-semibold text-gc-950">Booking form coming soon</h1>
        <p className="mt-2 text-slate-600">The Booker flow will live on this page.</p>
        <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gc-700 hover:underline">
          ← Back to home
        </Link>
      </div>
    </div>
  )
}
export { Book as default }
