// Shared in-memory facility data (replace with API calls later)
export const AMENITY_OPTIONS = ['Projector', 'Air conditioning', 'Whiteboard', 'Sound system', 'Wi-Fi', 'Microphone', 'Podium', 'Computers']

let facilities = [
  { id: 1, name: 'Conference Room A', code: 'CR - 101', floor: '3rd floor', building: 'Main Building', type: 'Meeting Room', capacity: 20, rate: 0, status: 'Under Maintenance', amenities: ['Projector', 'Air conditioning'], overview: 'A bright meeting room built for cross-team planning sessions and client-facing calls.' },
  { id: 2, name: 'Conference Room B', code: 'CR - 102', floor: '3rd floor', building: 'Main Building', type: 'Meeting Room', capacity: 20, rate: 0, status: 'Available', amenities: ['Whiteboard'], overview: '' },
  { id: 3, name: 'Function Hall', code: 'FH - 102', floor: '2nd floor', building: 'Annex Building', type: 'Hall', capacity: 300, rate: 0, status: 'Available', amenities: ['Sound system', 'Microphone'], overview: '' },
  { id: 4, name: 'PE Hall', code: 'PE - 103', floor: 'Ground floor', building: 'Gymnasium', type: 'Gymnasium', capacity: 800, rate: 0, status: 'Available', amenities: [], overview: '' },
  { id: 5, name: 'Computer Lab 2', code: 'CL - 202', floor: '2nd floor', building: 'Tech Building', type: 'Laboratory', capacity: 40, rate: 0, status: 'Occupied', amenities: ['Computers', 'Air conditioning'], overview: '' },
  { id: 6, name: 'Lecture Hall 102', code: 'LH - 102', floor: '1st floor', building: 'Main Building', type: 'Lecture Room', capacity: 80, rate: 0, status: 'Available', amenities: [], overview: '' },
  { id: 7, name: 'AVR Room 1', code: 'AVR - 101', floor: '4th floor', building: 'Main Building', type: 'Auditorium', capacity: 70, rate: 0, status: 'Available', amenities: ['Projector'], overview: '' },
  { id: 8, name: 'AVR Room 2', code: 'AVR - 102', floor: '4th floor', building: 'Main Building', type: 'Auditorium', capacity: 70, rate: 0, status: 'Occupied', amenities: ['Projector'], overview: '' },
  { id: 9, name: 'AVR Room 3', code: 'AVR - 103', floor: '4th floor', building: 'Main Building', type: 'Auditorium', capacity: 70, rate: 0, status: 'Available', amenities: ['Projector'], overview: '' },
]

export const FACILITY_TYPES = ['Meeting Room', 'Hall', 'Gymnasium', 'Laboratory', 'Lecture Room', 'Auditorium']
export const getFacilities = () => facilities
export const getFacility = (id) => facilities.find((f) => f.id === Number(id))
export const updateFacility = (id, patch) => {
  facilities = facilities.map((f) => (f.id === Number(id) ? { ...f, ...patch } : f))
}
export const removeFacility = (id) => {
  facilities = facilities.filter((f) => f.id !== Number(id))
}
export const addFacility = (f) => {
  const id = facilities.reduce((m, x) => Math.max(m, x.id), 0) + 1
  facilities = [...facilities, { id, status: 'Available', overview: '', ...f }]
  return id
}
