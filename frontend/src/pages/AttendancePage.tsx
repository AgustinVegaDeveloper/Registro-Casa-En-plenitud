import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material'

import { createMeeting, getCellMembers, getCells, getMeetingRoster, getMeetings, saveAttendanceBatch } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { AttendanceItemPayload, AttendanceRosterItem, CellMemberRow, CellRow, MeetingRow } from '../types/domain'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'

const excuseOptions = [
  { value: 'illness', label: 'Enfermedad' },
  { value: 'travel', label: 'Viaje' },
  { value: 'work', label: 'Trabajo' },
  { value: 'study', label: 'Estudio' },
  { value: 'other', label: 'Otro' },
] as const

type AttendanceStatus = 'P' | 'R' | 'N' | 'E'

function readErrorDetail(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null
  }

  const response = 'response' in error ? (error as { response?: { data?: { detail?: unknown } } }).response : null
  if (!response?.data?.detail) return null
  const detail = response.data.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d: unknown) => {
    if (typeof d === 'object' && d !== null && 'msg' in d) return String((d as { msg: string }).msg)
    return String(d)
  }).join('; ')
  return String(detail)
}

export function AttendancePage() {
  const { user } = useAuth()
  const todayIso = new Date().toISOString().slice(0, 10)
  const [meetings, setMeetings] = useState<MeetingRow[]>([])
  const [cells, setCells] = useState<CellRow[]>([])
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | ''>('')
  const [selectedCellId, setSelectedCellId] = useState<number | ''>('')
  const [meetingDate, setMeetingDate] = useState(todayIso)
  const [meetingType, setMeetingType] = useState<MeetingRow['meeting_type']>('cell_meeting')
  const [meetingNotes, setMeetingNotes] = useState('')
  const [roster, setRoster] = useState<AttendanceRosterItem[]>([])
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(true)
  const [isLoadingCells, setIsLoadingCells] = useState(true)
  const [isLoadingRoster, setIsLoadingRoster] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isCreatingMeeting, setIsCreatingMeeting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'info' | 'error'>('info')

  const canManageAttendance = user?.roles.includes('collaborator') || user?.roles.includes('leader') || user?.roles.includes('admin')
  const canCreateMeetings = user?.roles.includes('leader') || user?.roles.includes('admin')

  useEffect(() => {
    getMeetings()
      .then(setMeetings)
      .finally(() => setIsLoadingMeetings(false))
  }, [])

  useEffect(() => {
    getCells()
      .then(setCells)
      .finally(() => setIsLoadingCells(false))
  }, [])

  useEffect(() => {
    if (!selectedMeetingId) return
    setIsLoadingRoster(true)
    setMessage(null)
    getMeetingRoster(selectedMeetingId)
      .then(setRoster)
      .catch((error) => {
        setRoster([])
        setMessage(readErrorDetail(error) ?? 'No fue posible cargar el roster de la reunión.')
        setMessageSeverity('error')
      })
      .finally(() => setIsLoadingRoster(false))
  }, [selectedMeetingId])

  useEffect(() => {
    if (!selectedCellId || selectedMeetingId) return
    setIsLoadingRoster(true)
    setRoster([])
    setMessage(null)
    getCellMembers(selectedCellId)
      .then((members) => {
        const items: AttendanceRosterItem[] = members.map((m) => ({
          membership_id: m.membership_id,
          member_id: m.member_id,
          document: m.document,
          full_name: `${m.first_name} ${m.last_name}`,
          status: null,
          excuse_reason: null,
          excuse_text: null,
        }))
        setRoster(items)
      })
      .catch((error) => {
        setMessage(readErrorDetail(error) ?? 'No fue posible cargar los integrantes.')
        setMessageSeverity('error')
      })
      .finally(() => setIsLoadingRoster(false))
  }, [selectedCellId])

  const currentMeeting = useMemo(
    () => meetings.find((meeting) => meeting.id === selectedMeetingId) ?? null,
    [meetings, selectedMeetingId],
  )

  const selectedCell = useMemo(
    () =>
      cells.find((cell) => cell.id === selectedCellId) ??
      (currentMeeting ? cells.find((cell) => cell.id === currentMeeting.cell_id) ?? null : null),
    [cells, selectedCellId, currentMeeting],
  )

  const summary = useMemo(
    () => ({
      presents: roster.filter((item) => item.status === 'P').length,
      lates: roster.filter((item) => item.status === 'R').length,
      absent: roster.filter((item) => item.status === 'N').length,
      excused: roster.filter((item) => item.status === 'E').length,
      total: roster.length,
    }),
    [roster],
  )

  const updateItem = (membershipId: number, patch: Partial<AttendanceRosterItem>) => {
    setRoster((current) =>
      current.map((item) => (item.membership_id === membershipId ? { ...item, ...patch } : item)),
    )
  }

  const markAllPresent = () => {
    setRoster((current) =>
      current.map((item) => ({
        ...item,
        status: 'P',
        excuse_reason: null,
        excuse_text: null,
      })),
    )
  }

  const createMeetingFromForm = async () => {
    if (!selectedCellId) {
      setMessage('Selecciona una célula para crear la reunión.')
      setMessageSeverity('error')
      return
    }

    setIsCreatingMeeting(true)
    setMessage(null)
    try {
      const createdMeeting = await createMeeting({
        cell_id: selectedCellId,
        meeting_type: meetingType,
        meeting_date: meetingDate,
        notes: meetingNotes.trim() || null,
      })

      const payload: AttendanceItemPayload[] = roster.map((item) => ({
        membership_id: item.membership_id,
        status: (item.status ?? 'P') as AttendanceStatus,
        excuse_reason: item.status === 'E' ? item.excuse_reason : null,
        excuse_text: item.status === 'E' ? item.excuse_text : null,
      }))
      await saveAttendanceBatch(createdMeeting.id, payload)

      setMeetings((current) => [createdMeeting, ...current])
      setSelectedMeetingId(createdMeeting.id)
      setMessage('Reunión y asistencia guardadas correctamente.')
      setMessageSeverity('success')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible crear la reunión.')
      setMessageSeverity('error')
    } finally {
      setIsCreatingMeeting(false)
    }
  }

  const saveBatch = async () => {
    if (!selectedMeetingId) return
    setIsSaving(true)
    setMessage(null)
    try {
      const payload: AttendanceItemPayload[] = roster.map((item) => ({
        membership_id: item.membership_id,
        status: (item.status ?? 'P') as AttendanceStatus,
        excuse_reason: item.status === 'E' ? item.excuse_reason : null,
        excuse_text: item.status === 'E' ? item.excuse_text : null,
      }))
      await saveAttendanceBatch(selectedMeetingId, payload)
      setRoster((current) =>
        current.map((item) => ({
          ...item,
          status: null,
          excuse_reason: null,
          excuse_text: null,
        })),
      )
      setMessage('Asistencia guardada correctamente.')
      setMessageSeverity('success')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible guardar la asistencia.')
      setMessageSeverity('error')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Asistencia masiva
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Selecciona una reunión y marca cada integrante con P, R, N o E.
        </Typography>
      </Box>

      {message ? <Alert severity={messageSeverity}>{message}</Alert> : null}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          <Stack spacing={2}>
            <Stack spacing={1}>
              <Typography variant="overline" sx={{ letterSpacing: 2, color: 'text.secondary' }}>
                {currentMeeting ? 'REUNIÓN ACTIVA' : 'CREAR REUNIÓN'}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {selectedCell ? `Célula ${selectedCell.code}${selectedCell.name ? ` - ${selectedCell.name}` : ''}` : 'Selecciona una célula'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                {currentMeeting
                  ? `${currentMeeting.meeting_date} · ${currentMeeting.meeting_type === 'cell_meeting' ? 'Reunión de Célula' : 'Servicio Fin de Semana'}`
                  : 'Si todavía no existe una reunión para esta célula, puedes crearla aquí mismo.'}
              </Typography>
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="cell-select-label">Célula</InputLabel>
                <Select
                  labelId="cell-select-label"
                  label="Célula"
                  value={selectedCellId}
                  onChange={(event) => {
                    setSelectedCellId(Number(event.target.value))
                    setSelectedMeetingId('')
                  }}
                >
                  {isLoadingCells ? (
                    <MenuItem value="">
                      <em>Cargando...</em>
                    </MenuItem>
                  ) : (
                    cells.map((cell) => (
                      <MenuItem key={cell.id} value={cell.id}>
                        {`${cell.code}${cell.name ? ` - ${cell.name}` : ''}`}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <TextField
                label="Fecha"
                type="date"
                value={meetingDate}
                onChange={(event) => setMeetingDate(event.target.value)}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />

              <FormControl fullWidth>
                <InputLabel id="meeting-type-label">Tipo</InputLabel>
                <Select
                  labelId="meeting-type-label"
                  label="Tipo"
                  value={meetingType}
                  onChange={(event) => setMeetingType(event.target.value as MeetingRow['meeting_type'])}
                >
                  <MenuItem value="cell_meeting">Reunión de Célula</MenuItem>
                  <MenuItem value="weekend_service">Servicio Fin de Semana</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Notas"
              value={meetingNotes}
              onChange={(event) => setMeetingNotes(event.target.value)}
              fullWidth
              multiline
              minRows={2}
            />

            <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
              <Chip label={`Integrantes: ${summary.total}`} color="default" />
              <Chip label={`Presentes: ${summary.presents}`} color="success" />
              <Chip label={`Retardos: ${summary.lates}`} color="warning" />
              <Chip label={`Excusados: ${summary.excused}`} color="info" />
              <Chip label={`Ausentes: ${summary.absent}`} color="error" />
            </Stack>

            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
              {!selectedMeetingId && canCreateMeetings ? (
                <Button
                  variant="contained"
                  onClick={createMeetingFromForm}
                  disabled={isCreatingMeeting || isLoadingCells || !selectedCellId || roster.length === 0}
                  sx={{ bgcolor: '#79ED91', color: '#0f2d24', fontWeight: 700, '&:hover': { bgcolor: '#5cdb75' } }}
                >
                  {isCreatingMeeting ? 'Creando...' : 'Crear reunión y guardar'}
                </Button>
              ) : null}
              {canManageAttendance ? (
                <>
                  <Button variant="outlined" onClick={markAllPresent} disabled={roster.length === 0 || isSaving}>
                    <CheckCircleIcon sx={{ color: '#2e7d32', mr: 0.5 }} fontSize="small" />
                    Marcar todos como presentes
                  </Button>
                  {selectedMeetingId ? (
                    <Button variant="contained" onClick={saveBatch} disabled={isSaving}
                      sx={{
                        boxShadow: '0 0 12px rgba(46, 125, 50, 0.5)',
                        '&:hover': {
                          boxShadow: '0 0 20px rgba(46, 125, 50, 0.7)',
                        },
                      }}
                    >
                      {isSaving ? 'Guardando...' : 'Guardar asistencia'}
                    </Button>
                  ) : null}
                </>
              ) : null}
            </Stack>

            <FormControl fullWidth>
              <InputLabel id="meeting-select-label">Reuniones que ya se registraron en el pasado</InputLabel>
              <Select
                labelId="meeting-select-label"
                label="Reuniones que ya se registraron en el pasado"
                value={selectedMeetingId}
                onChange={(event) => setSelectedMeetingId(Number(event.target.value))}
              >
                {isLoadingMeetings ? (
                  <MenuItem value="">
                    <em>Cargando...</em>
                  </MenuItem>
                ) : (
                  [
                    <MenuItem key="" value="">
                      <em>Selecciona una reunión pasada</em>
                    </MenuItem>,
                    ...meetings.map((meeting) => (
                      <MenuItem key={meeting.id} value={meeting.id}>
                        {`${meeting.meeting_date} - ${meeting.meeting_type === 'cell_meeting' ? 'Reunión de Célula' : 'Servicio Fin de Semana'} - Célula ${meeting.cell_id}`}
                      </MenuItem>
                    )),
                  ]
                )}
              </Select>
            </FormControl>

            {isLoadingRoster ? (
              <CircularProgress />
            ) : roster.length > 0 ? (
              <Stack spacing={2}>
                {roster.map((item) => (
                  <Card key={item.membership_id} variant="outlined" sx={{ borderRadius: 3 }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                            {item.full_name}
                          </Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {item.document}
                          </Typography>
                        </Box>

                        <ToggleButtonGroup
                          exclusive
                          value={item.status ?? ''}
                          onChange={(_, value: AttendanceStatus | null) => {
                            if (!value) return
                            updateItem(item.membership_id, {
                              status: value,
                              excuse_reason: value === 'E' ? item.excuse_reason : null,
                              excuse_text: value === 'E' ? item.excuse_text : null,
                            })
                          }}
                        >
                          {(['P', 'R', 'N', 'E'] as AttendanceStatus[]).map((status) => (
                            <ToggleButton key={status} value={status}>
                              {status}
                            </ToggleButton>
                          ))}
                        </ToggleButtonGroup>

                        {item.status === 'E' ? (
                          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                            <TextField
                              select
                              label="Motivo"
                              value={item.excuse_reason ?? ''}
                              onChange={(event) =>
                                updateItem(item.membership_id, {
                                  excuse_reason: event.target.value as AttendanceRosterItem['excuse_reason'],
                                })
                              }
                              fullWidth
                            >
                              {excuseOptions.map((option) => (
                                <MenuItem key={option.value} value={option.value}>
                                  {option.label}
                                </MenuItem>
                              ))}
                            </TextField>
                            <TextField
                              label="Detalle"
                              value={item.excuse_text ?? ''}
                              onChange={(event) =>
                                updateItem(item.membership_id, { excuse_text: event.target.value })
                              }
                              fullWidth
                            />
                          </Stack>
                        ) : null}
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            ) : selectedCellId ? (
              <Alert severity="info">No hay integrantes activos en esta célula.</Alert>
            ) : (
              <Alert severity="warning">Selecciona una célula para comenzar.</Alert>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
