import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'

// Two fully separate single-page apps, each loaded as its own chunk:
//   /admin/*  →  admin/AdminDashboard.jsx   (login, dashboard, bookings, facilities, reports)
//   /*        →  booker/BookerApp.jsx        (public landing + booking flow)
// A visitor of one side never downloads the other side's code.
const AdminDashboard = lazy(() => import('./admin/AdminDashboard'))
const BookerApp = lazy(() => import('./booker/BookerApp'))

const PageLoader = () => (
  <div className="grid min-h-dvh place-items-center bg-white" role="status" aria-label="Loading">
    <div className="size-8 animate-spin rounded-full border-4 border-gc-100 border-t-gc-600" />
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/admin/*" element={<AdminDashboard />} />
        <Route path="/*" element={<BookerApp />} />
      </Routes>
    </Suspense>
  )
}
