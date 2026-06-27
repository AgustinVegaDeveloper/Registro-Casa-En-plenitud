import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Divider, Grid, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from '@mui/material'
import { useParams } from 'react-router-dom'

import { createCellRoleAssignment, getCellMembers, getCellRoleAssignments, getCellRoles, getCellSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { CellMemberRow, CellSummary } from '../types/domain'

const defaultSummary: CellSummary = {
  cell_id: 0,
  cell_code: '',
  cell_name: null,
  total_members: 0,
  presents: 0,
  lates: 0,
  excused: 0,
  absents: 0,
  total_attendance_records: 0,
  latest_meeting_date: null,
}

export function CellDetailPage() {
  const { user } = useAuth()
  const { cellId } = useParams()
  const numericCellId = Number(cellId)
  const [summary, setSummary] = useState<CellSummary>(defaultSummary)
  const [members, setMembers] = useState<CellMemberRow[]>([])
  const [roles, setRoles] = useState<Array<{ member_name: string; role_name: string; start_date: string; end_date: string | null }>>([])
  const [assignments, setAssignments] = useState<Array<{ id: number; membership_id: number; role_code: string; role_name: string; start_date: string; end_date: string | null }>>([])
  const [selectedMembershipId, setSelectedMembershipId] = useState<number | ''>('')
  const [selectedRoleCode, setSelectedRoleCode] = useState('main_leader')
  const [assignmentDate, setAssignmentDate] = useState(new Date().toISOString().slice(0, 10))
  const [isSavingRole, setIsSavingRole] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roleMessage, setRoleMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!numericCellId) return
    setIsLoading(true)
    setError(null)
    Promise.all([getCellSummary(numericCellId), getCellMembers(numericCellId), getCellRoles(numericCellId), getCellRoleAssignments(numericCellId)])
      .then(([summaryData, membersData, rolesData, assignmentsData]) => {
        setSummary(summaryData)
        setMembers(membersData)
        setRoles(rolesData)
        setAssignments(assignmentsData)
      })
      .catch(() => setError('No fue posible cargar el detalle de la célula.'))
      .finally(() => setIsLoading(false))
  }, [numericCellId])

  const attendanceRate = useMemo(() => {
    const denominator = summary.total_members || 1
    return Math.round(((summary.presents + summary.lates + summary.excused) / denominator) * 100)
  }, [summary])

  const canManageRoles = useMemo(() => user?.roles.includes('leader') || user?.roles.includes('admin'), [user])

  const assignRole = async () => {
    if (!numericCellId || !selectedMembershipId) return
    setIsSavingRole(true)
    setRoleMessage(null)
    try {
      await createCellRoleAssignment(numericCellId, {
        membership_id: selectedMembershipId,
        role_code: selectedRoleCode,
        start_date: assignmentDate,
      })
      const refreshed = await getCellRoleAssignments(numericCellId)
      setAssignments(refreshed)
      setRoleMessage('Rol asignado correctamente.')
    } catch (error) {
      const detail =
        typeof error === 'object' && error !== null && 'response' in error
          ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null)
          : null
      setRoleMessage(detail ?? 'No fue posible asignar el rol.')
    } finally {
      setIsSavingRole(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Detalle de célula
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Resumen visual y miembros activos de la célula seleccionada.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={2}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                {summary.cell_code}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {summary.cell_name ?? 'Sin nombre'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Última reunión: {summary.latest_meeting_date ?? 'Sin datos'}
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Grid container spacing={2}>
                {[
                  { label: 'Total integrantes', value: summary.total_members },
                  { label: 'Presentes', value: summary.presents },
                  { label: 'Retardos', value: summary.lates },
                  { label: 'Excusados', value: summary.excused },
                  { label: 'Ausentes', value: summary.absents },
                  { label: 'Asistencia estimada', value: `${attendanceRate}%` },
                ].map((item) => (
                  <Grid key={item.label} item xs={12} sm={6} md={4}>
                    <Card variant="outlined" sx={{ borderRadius: 3, p: 2 }}>
                      <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                        {item.label}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 800 }}>
                        {item.value}
                      </Typography>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Roles activos
              </Typography>
              <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ mb: 2 }}>
                {roles.map((role) => (
                  <Chip key={`${role.member_name}-${role.role_name}`} label={`${role.member_name}: ${role.role_name}`} />
                ))}
                {roles.length === 0 ? <Typography variant="body2">Sin roles activos</Typography> : null}
              </Stack>
              <Divider sx={{ mb: 2 }} />
              {canManageRoles ? (
                <>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
                    <Select value={selectedMembershipId} onChange={(event) => setSelectedMembershipId(Number(event.target.value))} displayEmpty fullWidth>
                      <MenuItem value="">
                        <em>Selecciona integrante</em>
                      </MenuItem>
                      {members.map((member) => (
                        <MenuItem key={member.membership_id} value={member.membership_id}>
                          {`${member.first_name} ${member.last_name}`}
                        </MenuItem>
                      ))}
                    </Select>
                    <Select value={selectedRoleCode} onChange={(event) => setSelectedRoleCode(event.target.value)} fullWidth>
                      <MenuItem value="main_leader">Líder principal</MenuItem>
                      <MenuItem value="evangelist_partner">Par evangelista</MenuItem>
                      <MenuItem value="host">Anfitrión</MenuItem>
                      <MenuItem value="assistant_leader">Asistente de líder</MenuItem>
                      <MenuItem value="emerging_leader">Líder emergente</MenuItem>
                      <MenuItem value="member">Integrante</MenuItem>
                    </Select>
                    <TextField type="date" label="Desde" value={assignmentDate} onChange={(event) => setAssignmentDate(event.target.value)} InputLabelProps={{ shrink: true }} fullWidth />
                    <Button variant="contained" onClick={assignRole} disabled={!selectedMembershipId || isSavingRole}>
                      {isSavingRole ? 'Guardando...' : 'Asignar rol'}
                    </Button>
                  </Stack>
                  {roleMessage ? (
                    <Alert severity={roleMessage === 'Rol asignado correctamente.' ? 'success' : 'error'} sx={{ mb: 2 }}>
                      {roleMessage}
                    </Alert>
                  ) : null}
                </>
              ) : null}
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Miembros activos
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Documento</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Barrio</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {members.map((member) => (
                      <TableRow key={member.membership_id}>
                        <TableCell>{member.document}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{`${member.first_name} ${member.last_name}`}</TableCell>
                        <TableCell>{member.phone ?? 'Sin dato'}</TableCell>
                        <TableCell>{member.neighborhood ?? 'Sin dato'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Asignaciones registradas
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Rol</TableCell>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Fin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {assignments.map((assignment) => (
                      <TableRow key={assignment.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{assignment.role_name}</TableCell>
                        <TableCell>{assignment.start_date}</TableCell>
                        <TableCell>{assignment.end_date ?? 'Activo'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      )}
    </Stack>
  )
}
