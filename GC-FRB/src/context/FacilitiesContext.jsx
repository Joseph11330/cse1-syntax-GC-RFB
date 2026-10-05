import { createContext, useContext, useState } from 'react'
import { seedFacilities } from '../data/facilities'

const Ctx = createContext(null)

export function FacilitiesProvider({ children }) {
  const [facilities, setFacilities] = useState(seedFacilities)
  const addFacility = (f) => setFacilities((l) => [...l, { ...f, id: Math.max(0, ...l.map((x) => x.id)) + 1 }])
  const updateFacility = (id, patch) => setFacilities((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const removeFacility = (id) => setFacilities((l) => l.filter((x) => x.id !== id))
  return <Ctx.Provider value={{ facilities, addFacility, updateFacility, removeFacility }}>{children}</Ctx.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useFacilities = () => useContext(Ctx)
