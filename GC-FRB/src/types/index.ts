export type Role = 'admin' | 'staff';
export interface User { id: string; name: string; email: string; role: Role; }
export interface LoginPayload { email: string; password: string; }
export interface LoginResponse { token: string; user: User; }
export interface Stat { label: string; value: string; hint?: string; tone?: 'default' | 'good' | 'warn'; }
export interface Activity { id: string; title: string; by: string; date: string; status: 'Done' | 'Pending' | 'Flagged'; }

export type FacilityType = 'Court' | 'Hall' | 'Room' | 'Field';
export type FacilityStatus = 'Available' | 'Maintenance';
export interface Facility { id: string; name: string; type: FacilityType; capacity: number; location: string; status: FacilityStatus; }
export type FacilityInput = Omit<Facility, 'id'>;

export type BookingStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
export interface Booking { id: string; facilityId: string; facilityName: string; requester: string; purpose: string; date: string; start: string; end: string; status: BookingStatus; }
export type BookingInput = Pick<Booking, 'facilityId' | 'requester' | 'purpose' | 'date' | 'start' | 'end'>;

export interface Analytics {
  total: number; approvalRate: number; hours: number; topFacility: string;
  byFacility: { label: string; value: number; hours: number }[];
  byStatus: { label: string; value: number }[];
  byWeekday: { label: string; value: number }[];
}
