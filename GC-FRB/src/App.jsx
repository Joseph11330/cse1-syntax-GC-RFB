import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import AdminLayout from './components/AdminLayout'
import Dashboard from './pages/Dashboard'
import Bookings from './pages/Bookings'
import BookingDetails from './pages/BookingDetails'
import NewBooking from './pages/NewBooking'
import Facilities from './pages/Facilities'
import FacilityDetails from './pages/FacilityDetails'
import Reports from './pages/Reports'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AdminLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/bookings" element={<Bookings />} />
        <Route path="/bookings/new" element={<NewBooking />} />
        <Route path="/bookings/:id" element={<BookingDetails />} />
        <Route path="/facilities" element={<Facilities />} />
        <Route path="/facilities/:id" element={<FacilityDetails />} />
        <Route path="/reports" element={<Reports />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
