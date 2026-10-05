import { createContext, useContext, useState } from 'react'
import { seedBookings } from '../data/bookings'

const Ctx = createContext(null)

export function BookingsProvider({ children }) {
  const [bookings, setBookings] = useState(seedBookings)
  const setStatus = (id, status) => setBookings((b) => b.map((x) => (x.id === id ? { ...x, status } : x)))
  return <Ctx.Provider value={{ bookings, setStatus }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useBookings = () => useContext(Ctx)
