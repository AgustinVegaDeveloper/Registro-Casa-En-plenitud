import { apiClient } from './client'
import type {
  AttendanceByCellItem,
  AttendanceByNetworkItem,
  AttendanceItemPayload,
  AttendanceRosterItem,
  CellAccessRow,
  CellSummary,
  CellMemberRow,
  CellRow,
  DashboardSummary,
  MemberRow,
  MeetingRow,
  MembershipRow,
  MonthlyAttendanceItem,
  NetworkAdvisorRow,
  NetworkRow,
  ReportSummary,
  UserRow,
} from '../types/domain'

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const response = await apiClient.get<{
    total_networks: number
    total_cells: number
    total_members: number
    monthly_attendance: number
    last_weekend_date: string | null
    last_weekend_presents: number
    last_weekend_lates: number
    last_weekend_total: number
  }>('/dashboard/summary')

  return {
    totalNetworks: response.data.total_networks,
    totalCells: response.data.total_cells,
    totalMembers: response.data.total_members,
    monthlyAttendance: response.data.monthly_attendance,
    lastWeekendDate: response.data.last_weekend_date,
    lastWeekendPresents: response.data.last_weekend_presents,
    lastWeekendLates: response.data.last_weekend_lates,
    lastWeekendTotal: response.data.last_weekend_total,
  }
}

export async function getCellSummary(cellId: number): Promise<CellSummary> {
  const response = await apiClient.get<CellSummary>(`/cells/${cellId}/summary`)
  return response.data
}

export async function getNetworks(): Promise<NetworkRow[]> {
  const response = await apiClient.get<NetworkRow[]>('/networks')
  return response.data
}

export async function createNetwork(payload: {
  network_number: number
  name: string
  network_type: NetworkRow['network_type']
}): Promise<NetworkRow> {
  const response = await apiClient.post<NetworkRow>('/networks', payload)
  return response.data
}

export async function updateNetwork(
  networkId: number,
  payload: {
    name?: string
    network_type?: NetworkRow['network_type']
  },
): Promise<NetworkRow> {
  const response = await apiClient.put<NetworkRow>(`/networks/${networkId}`, payload)
  return response.data
}

export async function deleteNetwork(networkId: number): Promise<void> {
  await apiClient.delete(`/networks/${networkId}`)
}

export async function getCells(): Promise<CellRow[]> {
  const response = await apiClient.get<CellRow[]>('/cells')
  return response.data
}

export async function createCell(payload: {
  network_id: number
  name: string | null
  is_active: boolean
}): Promise<CellRow> {
  const response = await apiClient.post<CellRow>('/cells', payload)
  return response.data
}

export async function updateCell(
  cellId: number,
  payload: {
    name?: string | null
    is_active?: boolean
  },
): Promise<CellRow> {
  const response = await apiClient.put<CellRow>(`/cells/${cellId}`, payload)
  return response.data
}

export async function deleteCell(cellId: number): Promise<void> {
  await apiClient.delete(`/cells/${cellId}`)
}

export async function getCellMembers(cellId: number): Promise<CellMemberRow[]> {
  const response = await apiClient.get<CellMemberRow[]>(`/cells/${cellId}/members`)
  return response.data
}

export async function getCellRoles(cellId: number): Promise<Array<{
  membership_id: number
  member_id: number
  member_name: string
  role_code: string
  role_name: string
  start_date: string
  end_date: string | null
}>> {
  const response = await apiClient.get(`/cells/${cellId}/roles`)
  return response.data
}

export async function getCellRoleAssignments(cellId: number): Promise<Array<{
  id: number
  membership_id: number
  role_id: number
  role_code: string
  role_name: string
  start_date: string
  end_date: string | null
}>> {
  const response = await apiClient.get(`/cells/${cellId}/role-assignments`)
  return response.data
}

export async function createCellRoleAssignment(cellId: number, payload: {
  membership_id: number
  role_code: string
  start_date: string
}) {
  const response = await apiClient.post(`/cells/${cellId}/role-assignments`, payload)
  return response.data
}

export async function getMembers(): Promise<MemberRow[]> {
  const response = await apiClient.get<MemberRow[]>('/members')
  return response.data
}

export async function createMember(payload: {
  document: string
  first_name: string
  last_name: string
  birth_date: string | null
  phone: string | null
  address: string | null
  neighborhood: string | null
  notes: string | null
  church_join_date: string | null
  first_cell_join_date: string | null
}): Promise<MemberRow> {
  const response = await apiClient.post<MemberRow>('/members', payload)
  return response.data
}

export async function updateMember(
  memberId: number,
  payload: {
    first_name?: string
    last_name?: string
    birth_date?: string | null
    phone?: string | null
    address?: string | null
    neighborhood?: string | null
    notes?: string | null
    church_join_date?: string | null
    first_cell_join_date?: string | null
  },
): Promise<MemberRow> {
  const response = await apiClient.put<MemberRow>(`/members/${memberId}`, payload)
  return response.data
}

export async function deleteMember(memberId: number): Promise<void> {
  await apiClient.delete(`/members/${memberId}`)
}

export async function getMemberHistory(memberId: number): Promise<MembershipRow[]> {
  const response = await apiClient.get<MembershipRow[]>(`/memberships/member/${memberId}`)
  return response.data
}

export async function createMembership(payload: {
  member_id: number
  cell_id: number
  start_date: string
  end_date: string | null
}): Promise<MembershipRow> {
  const response = await apiClient.post<MembershipRow>('/memberships', payload)
  return response.data
}

export async function closeMembership(membershipId: number, payload: { end_date: string }): Promise<MembershipRow> {
  const response = await apiClient.post<MembershipRow>(`/memberships/${membershipId}/close`, payload)
  return response.data
}

export async function transferMembership(
  membershipId: number,
  payload: { target_cell_id: number; transfer_date: string },
): Promise<MembershipRow> {
  const response = await apiClient.post<MembershipRow>(`/memberships/${membershipId}/transfer`, payload)
  return response.data
}

export async function getReportSummary(params: {
  period: 'today' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'
  startDate?: string
  endDate?: string
}): Promise<ReportSummary> {
  const response = await apiClient.get<ReportSummary>('/reports/attendance/summary', {
    params: {
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  })
  return response.data
}

export async function getReportScope(params: {
  scope: 'member' | 'cell' | 'network'
  period: 'today' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'
  startDate?: string
  endDate?: string
}): Promise<Array<{
  entity_id: number
  entity_name: string
  total_meetings: number
  total_records: number
  presents: number
  lates: number
  excused: number
  absents: number
  attendance_rate: number
}>> {
  const response = await apiClient.get('/reports/attendance/by-member'.replace('by-member', `by-${params.scope}`), {
    params: {
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate,
    },
  })
  return response.data
}

export async function downloadAttendanceReport(params: {
  scope: 'member' | 'cell' | 'network'
  period: 'today' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'custom'
  startDate?: string
  endDate?: string
  format: 'pdf' | 'xlsx'
}): Promise<Blob> {
  const response = await apiClient.get('/reports/attendance/export', {
    params: {
      scope: params.scope,
      period: params.period,
      start_date: params.startDate,
      end_date: params.endDate,
      format: params.format,
    },
    responseType: 'blob',
  })
  return response.data
}

export async function getMeetings(): Promise<MeetingRow[]> {
  const response = await apiClient.get<MeetingRow[]>('/attendance/meetings')
  return response.data
}

export async function createMeeting(payload: {
  cell_id: number
  meeting_type: MeetingRow['meeting_type']
  meeting_date: string
  notes: string | null
}): Promise<MeetingRow> {
  const response = await apiClient.post<MeetingRow>('/attendance/meetings', payload)
  return response.data
}

export async function getMeetingRoster(meetingId: number): Promise<AttendanceRosterItem[]> {
  const response = await apiClient.get<AttendanceRosterItem[]>(`/attendance/meetings/${meetingId}/roster`)
  return response.data
}

export async function saveAttendanceBatch(meetingId: number, items: AttendanceItemPayload[]) {
  const response = await apiClient.post(`/attendance/meetings/batch`, {
    meeting_id: meetingId,
    items,
  })
  return response.data
}

export async function getMonthlyAttendance(year?: number): Promise<MonthlyAttendanceItem[]> {
  const response = await apiClient.get<MonthlyAttendanceItem[]>('/dashboard/monthly-attendance', {
    params: year !== undefined ? { year } : {},
  })
  return response.data
}

export async function getAttendanceByNetwork(): Promise<AttendanceByNetworkItem[]> {
  const response = await apiClient.get<AttendanceByNetworkItem[]>('/dashboard/by-network')
  return response.data
}

export async function getAttendanceByCell(): Promise<AttendanceByCellItem[]> {
  const response = await apiClient.get<AttendanceByCellItem[]>('/dashboard/by-cell')
  return response.data
}

export async function uploadMemberPhoto(memberId: number, file: File): Promise<MemberRow> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await apiClient.post<MemberRow>(`/members/${memberId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return response.data
}

export async function getUsers(): Promise<UserRow[]> {
  const response = await apiClient.get<UserRow[]>('/users')
  return response.data
}

export async function createUser(payload: {
  username: string
  email: string | null
  password: string
  is_active: boolean
}): Promise<UserRow> {
  const response = await apiClient.post<UserRow>('/users', payload)
  return response.data
}

export async function updateUser(userId: number, payload: { email?: string | null; is_active?: boolean }): Promise<UserRow> {
  const response = await apiClient.put<UserRow>(`/users/${userId}`, payload)
  return response.data
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}`)
}

export async function assignUserRole(userId: number, roleCode: string): Promise<{ role_codes: string[] }> {
  const response = await apiClient.post(`/users/${userId}/roles`, { role_code: roleCode })
  return response.data
}

export async function removeUserRole(userId: number, roleCode: string): Promise<{ role_codes: string[] }> {
  const response = await apiClient.delete(`/users/${userId}/roles/${roleCode}`)
  return response.data
}

export async function setUserPassword(userId: number, newPassword: string): Promise<void> {
  await apiClient.post(`/users/${userId}/password`, { new_password: newPassword })
}

export async function changeMyPassword(currentPassword: string, newPassword: string): Promise<void> {
  await apiClient.post('/users/me/password', { current_password: currentPassword, new_password: newPassword })
}

export async function getUserAdvisors(userId: number): Promise<NetworkAdvisorRow[]> {
  const response = await apiClient.get<NetworkAdvisorRow[]>(`/users/${userId}/advisors`)
  return response.data
}

export async function assignUserAdvisor(userId: number, networkId: number): Promise<NetworkAdvisorRow> {
  const response = await apiClient.post(`/users/${userId}/advisors`, { network_id: networkId })
  return response.data
}

export async function removeUserAdvisor(userId: number, networkId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}/advisors/${networkId}`)
}

export async function getUserCellAccesses(userId: number): Promise<CellAccessRow[]> {
  const response = await apiClient.get<CellAccessRow[]>(`/users/${userId}/cell-access`)
  return response.data
}

export async function assignUserCellAccess(userId: number, cellId: number, roleCode: string): Promise<CellAccessRow> {
  const response = await apiClient.post(`/users/${userId}/cell-access`, { cell_id: cellId, role_code: roleCode })
  return response.data
}

export async function removeUserCellAccess(userId: number, accessId: number): Promise<void> {
  await apiClient.delete(`/users/${userId}/cell-access/${accessId}`)
}
