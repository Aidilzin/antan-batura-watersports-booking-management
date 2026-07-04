export type UserRole = 'customer' | 'staff' | 'admin'

export interface User {
  id: number
  name: string
  email: string
  phone: string | null
  role: UserRole
  created_at: string
}

export type EquipmentType =
  | 'cruise_boat'
  | 'kayak_single'
  | 'kayak_double'
  | 'canoe'
  | 'paddle_boat'
  | 'paddle_boat_family'

export type EquipmentStatus = 'available' | 'booked' | 'maintenance'

export interface Equipment {
  id: number
  name: string
  type: EquipmentType
  type_label: string
  status: EquipmentStatus
  hourly_rate: string
  notes: string | null
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'in_use'
  | 'completed'
  | 'cancelled'

export type PaymentMethod = 'qr' | 'bank_transfer' | 'cash'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed'
export type PaymentPurpose = 'booking' | 'overtime' | 'damage'

export interface Payment {
  id: number
  booking_id: number
  amount: string
  method: PaymentMethod
  status: PaymentStatus
  purpose: PaymentPurpose
  mock_transaction_id: string | null
  recorded_by?: string | null
  recorded_at: string | null
  created_at: string
}

export interface UsageLog {
  id: number
  booking_id: number
  actual_start_time: string | null
  actual_end_time: string | null
  exceeded_minutes: number
  extra_charge_amount: string
  condition_on_return: 'good' | 'damaged' | null
}

export interface DamageReport {
  id: number
  booking_id: number
  description: string
  deposit_charged: string
  recorded_by?: string | null
  recorded_at: string | null
}

export interface Booking {
  id: number
  booking_reference: string
  status: BookingStatus
  channel: 'online' | 'walk_in'
  waitlisted: boolean
  booking_date: string
  start_time: string
  end_time: string
  safety_briefing_given: boolean | null
  safety_gear_issued: boolean | null
  checked_in_at: string | null
  handed_over_at: string | null
  completed_at: string | null
  notes: string | null
  customer?: User
  equipment?: Equipment
  payments?: Payment[]
  usage_log?: UsageLog
  damage_reports?: DamageReport[]
  created_at: string
}

export interface GatewayInstruction {
  method: PaymentMethod
  amount: string
  reference: string
  qr_payload: string | null
  bank_account: { bank_name: string; account_name: string; account_number: string } | null
  instructions: string
  requires_simulation: boolean
}

export interface Paginated<T> {
  data: T[]
  meta?: { current_page: number; last_page: number; total: number }
}

export interface ApiError {
  message: string
  errors?: Record<string, string[]>
}
