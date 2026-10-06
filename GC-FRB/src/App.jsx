import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './components/AdminLayout'

// Each page is its own chunk, so the browser only downloads the page being opened (SPA code-splitting)
const LandingPage = lazy(() => import('./pages/LandingPage'))
const Login = lazy(() => import('./pages/Login'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const Bookings = lazy(() => import('./pages/Bookings'))
const BookingDetails = lazy(() => import('./pages/BookingDetails'))
const NewBooking = lazy(() => import('./pages/NewBooking'))
const Facilities = lazy(() => import('./pages/Facilities'))
const FacilityDetails = lazy(() => import('./pages/FacilityDetails'))
const Reports = lazy(() => import('./pages/Reports'))

const PageLoader = () => (
  <div className="grid min-h-screen place-items-center bg-white" role="status" aria-label="Loading">
    <div className="size-8 animate-spin rounded-full border-4 border-gc-100 border-t-gc-600" />
  </div>
)

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route element={<AdminLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/bookings" element={<Bookings />} />
          <Route path="/bookings/new" element={<NewBooking />} />
          <Route path="/bookings/:id" element={<BookingDetails />} />
          <Route path="/facilities" element={<Facilities />} />
          <Route path="/facilities/:id" element={<FacilityDetails />} />
          <Route path="/reports" element={<Reports />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
