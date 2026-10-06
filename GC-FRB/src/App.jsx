import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/admin/AdminLayout'

// Each page is its own chunk, so the browser only downloads the page being opened (SPA code-splitting)

// BOOKER (public side)
const LandingPage = lazy(() => import('./pages/booker/LandingPage'))
const Book = lazy(() => import('./pages/booker/Book'))

// AUTH
const Login = lazy(() => import('./pages/auth/Login'))

// ADMIN
const Dashboard = lazy(() => import('./pages/admin/Dashboard'))
const Bookings = lazy(() => import('./pages/admin/Bookings'))
const BookingDetails = lazy(() => import('./pages/admin/BookingDetails'))
const NewBooking = lazy(() => import('./pages/admin/NewBooking'))
const Facilities = lazy(() => import('./pages/admin/Facilities'))
const FacilityDetails = lazy(() => import('./pages/admin/FacilityDetails'))
const Reports = lazy(() => import('./pages/admin/Reports'))

const PageLoader = () => (
  <div className="grid min-h-screen place-items-center bg-white" role="status" aria-label="Loading">
    <div className="size-8 animate-spin rounded-full border-4 border-gc-100 border-t-gc-600" />
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* BOOKER */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/book" element={<Book />} />

        {/* ADMIN */}
        <Route path="/admin/login" element={<Login />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="bookings" element={<Bookings />} />
          <Route path="bookings/new" element={<NewBooking />} />
          <Route path="bookings/:id" element={<BookingDetails />} />
          <Route path="facilities" element={<Facilities />} />
          <Route path="facilities/:id" element={<FacilityDetails />} />
          <Route path="reports" element={<Reports />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
