import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'
import { useParams } from 'react-router-dom'

import { closeMembership, createMembership, getCellMembers, getCells, getMemberHistory, getMembers, transferMembership } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { CellRow, MemberRow, MembershipRow } from '../types/domain'

type MembershipCreateState = {
  cell_id: string
  start_date: string
}

type MembershipTransferState = {
  target_cell_id: string
  transfer_date: string
}

type MembershipCloseState = {
  end_date: string
}

const todayIso = new Date().toISOString().slice(0, 10)

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

const emptyCreateState: MembershipCreateState = {
  cell_id: '',
  start_date: todayIso,
}

const emptyTransferState: MembershipTransferState = {
  target_cell_id: '',
  transfer_date: todayIso,
}

const emptyCloseState: MembershipCloseState = {
  end_date: todayIso,
}

export function MemberDetailPage() {
  const { user } = useAuth()
  const { memberId } = useParams()
  const numericMemberId = Number(memberId)
  const [member, setMember] = useState<MemberRow | null>(null)
  const [history, setHistory] = useState<MembershipRow[]>([])
  const [cells, setCells] = useState<CellRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [transferDialogOpen, setTransferDialogOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [createState, setCreateState] = useState<MembershipCreateState>(emptyCreateState)
  const [transferState, setTransferState] = useState<MembershipTransferState>(emptyTransferState)
  const [closeState, setCloseState] = useState<MembershipCloseState>(emptyCloseState)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!numericMemberId) return
    loadData()
  }, [numericMemberId])

  const canManageMemberships = useMemo(() => user?.roles.includes('collaborator') || user?.roles.includes('leader') || user?.roles.includes('admin'), [user])
  const canCloseOrTransfer = useMemo(() => user?.roles.includes('leader') || user?.roles.includes('admin'), [user])

  const loadData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [members, memberships, cellRows] = await Promise.all([getMembers(), getMemberHistory(numericMemberId), getCells()])
      setMember(members.find((item) => item.id === numericMemberId) ?? null)
      setHistory(memberships)
      setCells(cellRows)
    } catch {
      setError('No fue posible cargar el detalle del integrante.')
    } finally {
      setIsLoading(false)
    }
  }

  const activeMembership = useMemo(() => history.find((item) => item.end_date === null) ?? null, [history])

  const getCellLabel = (cellId: number) => cells.find((cell) => cell.id === cellId)?.code ?? `Célula ${cellId}`

  const refreshAfterMutation = async () => {
    const [members, memberships, cellRows] = await Promise.all([getMembers(), getMemberHistory(numericMemberId), getCells()])
    setMember(members.find((item) => item.id === numericMemberId) ?? null)
    setHistory(memberships)
    setCells(cellRows)
  }

  const openCreateDialog = () => {
    setCreateState(emptyCreateState)
    setMessage(null)
    setCreateDialogOpen(true)
  }

  const openTransferDialog = () => {
    if (!activeMembership) return
    setTransferState({
      target_cell_id: '',
      transfer_date: todayIso,
    })
    setMessage(null)
    setTransferDialogOpen(true)
  }

  const openCloseDialog = () => {
    if (!activeMembership) return
    setCloseState({ end_date: todayIso })
    setMessage(null)
    setCloseDialogOpen(true)
  }

  const submitCreateMembership = async () => {
    const cellId = Number(createState.cell_id)
    if (!Number.isInteger(cellId) || cellId < 1) {
      setMessage('Selecciona una célula válida.')
      return
    }

    setIsSaving(true)
    setMessage(null)
    try {
      await createMembership({
        member_id: numericMemberId,
        cell_id: cellId,
        start_date: createState.start_date,
        end_date: null,
      })
      await refreshAfterMutation()
      setMessage('Membresía creada correctamente.')
      setCreateDialogOpen(false)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible crear la membresía.')
    } finally {
      setIsSaving(false)
    }
  }

  const submitTransferMembership = async () => {
    if (!activeMembership) return
    const targetCellId = Number(transferState.target_cell_id)
    if (!Number.isInteger(targetCellId) || targetCellId < 1) {
      setMessage('Selecciona una célula destino válida.')
      return
    }

    setIsSaving(true)
    setMessage(null)
    try {
      await transferMembership(activeMembership.id, {
        target_cell_id: targetCellId,
        transfer_date: transferState.transfer_date,
      })
      await refreshAfterMutation()
      setMessage('Membresía transferida correctamente.')
      setTransferDialogOpen(false)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible transferir la membresía.')
    } finally {
      setIsSaving(false)
    }
  }

  const submitCloseMembership = async () => {
    if (!activeMembership) return

    setIsSaving(true)
    setMessage(null)
    try {
      await closeMembership(activeMembership.id, { end_date: closeState.end_date })
      await refreshAfterMutation()
      setMessage('Membresía cerrada correctamente.')
      setCloseDialogOpen(false)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible cerrar la membresía.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Detalle de integrante
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          Ficha con historial de células y seguimiento básico.
        </Typography>
      </Box>

      {error ? <Alert severity="error">{error}</Alert> : null}
      {message ? <Alert severity={message.toLowerCase().includes('correctamente') ? 'success' : 'error'}>{message}</Alert> : null}

      {isLoading ? (
        <CircularProgress />
      ) : member ? (
        <Stack spacing={2}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="overline" sx={{ color: 'text.secondary', letterSpacing: 2 }}>
                {member.document}
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800 }}>
                {`${member.first_name} ${member.last_name}`}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                Teléfono: {member.phone ?? 'Sin dato'} · Barrio: {member.neighborhood ?? 'Sin dato'}
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Dirección: {member.address ?? 'Sin dato'}
              </Typography>
              {member.photo_path ? (
                <Box sx={{ mt: 2, maxWidth: 200, borderRadius: 2, overflow: 'hidden' }}>
                  <img
                    src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://127.0.0.1:8000'}/uploads/${member.photo_path}`}
                    alt="Foto del integrante"
                    style={{ width: '100%', display: 'block' }}
                  />
                </Box>
              ) : null}
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2">
                Célula actual: {activeMembership ? getCellLabel(activeMembership.cell_id) : 'Sin célula activa'}
              </Typography>
              {canManageMemberships ? (
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} sx={{ mt: 2 }}>
                  {!activeMembership ? (
                    <Button variant="contained" onClick={openCreateDialog}>
                      Crear membresía
                    </Button>
                  ) : null}
                  {activeMembership && canCloseOrTransfer ? (
                    <>
                      <Button variant="outlined" onClick={openTransferDialog}>
                        Transferir membresía
                      </Button>
                      <Button variant="outlined" color="warning" onClick={openCloseDialog}>
                        Cerrar membresía
                      </Button>
                    </>
                  ) : null}
                </Stack>
              ) : null}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Historial de células
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Célula</TableCell>
                      <TableCell>Inicio</TableCell>
                      <TableCell>Fin</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {history.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell sx={{ fontWeight: 700 }}>{getCellLabel(item.cell_id)}</TableCell>
                        <TableCell>{item.start_date}</TableCell>
                        <TableCell>{item.end_date ?? 'Activa'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </CardContent>
          </Card>
        </Stack>
      ) : (
        <Alert severity="warning">No se encontró el integrante.</Alert>
      )}

      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Nueva membresía</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="membership-cell-label">Célula</InputLabel>
            <Select
              labelId="membership-cell-label"
              label="Célula"
              value={createState.cell_id}
              onChange={(event) => setCreateState((current) => ({ ...current, cell_id: event.target.value }))}
            >
              <MenuItem value="">
                <em>Selecciona una célula</em>
              </MenuItem>
              {cells.map((cell) => (
                <MenuItem key={cell.id} value={cell.id}>
                  {`${cell.code}${cell.name ? ` - ${cell.name}` : ''}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            label="Fecha inicio"
            value={createState.start_date}
            onChange={(event) => setCreateState((current) => ({ ...current, start_date: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCreateDialogOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitCreateMembership} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={transferDialogOpen} onClose={() => setTransferDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Transferir membresía</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <FormControl fullWidth>
            <InputLabel id="transfer-cell-label">Célula destino</InputLabel>
            <Select
              labelId="transfer-cell-label"
              label="Célula destino"
              value={transferState.target_cell_id}
              onChange={(event) => setTransferState((current) => ({ ...current, target_cell_id: event.target.value }))}
            >
              <MenuItem value="">
                <em>Selecciona una célula</em>
              </MenuItem>
              {cells
                .filter((cell) => !activeMembership || cell.id !== activeMembership.cell_id)
                .map((cell) => (
                  <MenuItem key={cell.id} value={cell.id}>
                    {`${cell.code}${cell.name ? ` - ${cell.name}` : ''}`}
                  </MenuItem>
                ))}
            </Select>
          </FormControl>
          <TextField
            type="date"
            label="Fecha traslado"
            value={transferState.transfer_date}
            onChange={(event) => setTransferState((current) => ({ ...current, transfer_date: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setTransferDialogOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitTransferMembership} disabled={isSaving}>
            {isSaving ? 'Trasladando...' : 'Transferir'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={closeDialogOpen} onClose={() => setCloseDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Cerrar membresía</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField
            type="date"
            label="Fecha cierre"
            value={closeState.end_date}
            onChange={(event) => setCloseState((current) => ({ ...current, end_date: event.target.value }))}
            InputLabelProps={{ shrink: true }}
            fullWidth
          />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setCloseDialogOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" color="warning" onClick={submitCloseMembership} disabled={isSaving}>
            {isSaving ? 'Cerrando...' : 'Cerrar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}

