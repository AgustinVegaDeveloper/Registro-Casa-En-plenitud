export interface DashboardSummary {
  totalNetworks: number
  totalCells: number
  totalMembers: number
  monthlyAttendance: number
  lastWeekendDate: string | null
  lastWeekendPresents: number
  lastWeekendLates: number
  lastWeekendTotal: number
}

export interface CellSummary {
  cell_id: number
  cell_code: string
  cell_name: string | null
  total_members: number
  presents: number
  lates: number
  excused: number
  absents: number
  total_attendance_records: number
  latest_meeting_date: string | null
}

export interface NetworkRow {
  id: number
  network_number: number
  name: string
  network_type: 'growth' | 'consolidation' | 'transition'
}

export interface CellRow {
  id: number
  network_id: number
  cell_number: number
  code: string
  name: string | null
  is_active: boolean
}

export interface CellMemberRow {
  member_id: number
  membership_id: number
  document: string
  first_name: string
  last_name: string
  phone: string | null
  neighborhood: string | null
  is_active_membership: boolean
}

export interface MemberRow {
  id: number
  document: string
  first_name: string
  last_name: string
  birth_date?: string | null
  phone: string | null
  neighborhood: string | null
  address?: string | null
  notes?: string | null
  photo_path?: string | null
  church_join_date?: string | null
  first_cell_join_date?: string | null
}

export interface ReportSummary {
  period_start: string
  period_end: string
  total_meetings: number
  total_records: number
  presents: number
  lates: number
  excused: number
  absents: number
  attendance_rate: number
}

export interface MeetingRow {
  id: number
  cell_id: number
  meeting_type: 'cell_meeting' | 'weekend_service'
  meeting_date: string
  notes: string | null
}

export interface AttendanceRosterItem {
  membership_id: number
  member_id: number
  document: string
  full_name: string
  status: 'P' | 'R' | 'N' | 'E' | null
  excuse_reason: 'illness' | 'travel' | 'work' | 'study' | 'other' | null
  excuse_text: string | null
}

export interface AttendanceItemPayload {
  membership_id: number
  status: 'P' | 'R' | 'N' | 'E'
  excuse_reason: 'illness' | 'travel' | 'work' | 'study' | 'other' | null
  excuse_text: string | null
}

export interface MembershipRow {
  id: number
  member_id: number
  cell_id: number
  start_date: string
  end_date: string | null
}

export interface UserRow {
  id: number
  username: string
  email: string | null
  is_active: boolean
  created_at: string | null
  role_codes: string[]
}

export interface NetworkAdvisorRow {
  id: number
  network_id: number
  network_name: string
  advisor_slot: number
}

export interface CellAccessRow {
  id: number
  cell_id: number
  cell_code: string
  role_code: string
  role_name: string
}

export interface MonthlyAttendanceItem {
  year: number
  month: number
  total_records: number
  presents: number
  lates: number
  excused: number
  absents: number
}

export interface AttendanceByNetworkItem {
  network_id: number
  network_name: string
  total_records: number
  presents: number
  lates: number
  excused: number
  absents: number
  attendance_rate: number
}

export interface AttendanceByCellItem {
  cell_id: number
  cell_code: string
  cell_name: string
  total_records: number
  presents: number
  lates: number
  excused: number
  absents: number
  attendance_rate: number
}
