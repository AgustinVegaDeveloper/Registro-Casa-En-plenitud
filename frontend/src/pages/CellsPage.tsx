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
  Grid,
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
import { useNavigate } from 'react-router-dom'

import { createCell, deleteCell, getCells, getNetworks, updateCell } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { CellRow, NetworkRow } from '../types/domain'

type CellFormState = {
  network_id: string
  name: string
  is_active: 'true' | 'false'
}

const emptyFormState: CellFormState = {
  network_id: '',
  name: '',
  is_active: 'true',
}

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

export function CellsPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<CellRow[]>([])
  const [networks, setNetworks] = useState<NetworkRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingCell, setEditingCell] = useState<CellRow | null>(null)
  const [formState, setFormState] = useState<CellFormState>(emptyFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    Promise.all([getCells(), getNetworks()])
      .then(([cellRows, networkRows]) => {
        setItems(cellRows)
        setNetworks(networkRows)
      })
      .catch(() => setMessage('No fue posible cargar las células.'))
      .finally(() => setIsLoading(false))
  }, [])

  const isAdmin = useMemo(() => user?.roles.includes('admin') ?? false, [user])
  const canCreateOrDelete = useMemo(() => user?.roles.includes('advisor') || user?.roles.includes('admin'), [user])
  const canEdit = useMemo(() => user?.roles.includes('leader') || user?.roles.includes('admin'), [user])

  const networkLabelById = useMemo(() => new Map(networks.map((network) => [network.id, `${network.network_number} - ${network.name}`])), [networks])

  const openCreateDialog = () => {
    setEditingCell(null)
    setFormState(emptyFormState)
    setMessage(null)
    setDialogOpen(true)
  }

  const openEditDialog = (cell: CellRow) => {
    setEditingCell(cell)
    setFormState({
      network_id: String(cell.network_id),
      name: cell.name ?? '',
      is_active: cell.is_active ? 'true' : 'false',
    })
    setMessage(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setIsSaving(false)
  }

  const refreshCells = async () => {
    const updated = await getCells()
    setItems(updated)
  }

  const submitCell = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      if (editingCell) {
        await updateCell(editingCell.id, {
          name: formState.name.trim() || null,
          is_active: formState.is_active === 'true',
        })
        setMessage('Célula actualizada correctamente.')
      } else {
        const networkId = Number(formState.network_id)
        if (!Number.isInteger(networkId) || networkId < 1) {
          setMessage('Debes seleccionar una red válida.')
          return
        }

        await createCell({
          network_id: networkId,
          name: formState.name.trim() || null,
          is_active: formState.is_active === 'true',
        })
        setMessage('Célula creada correctamente.')
      }

      await refreshCells()
      closeDialog()
      setEditingCell(null)
      setFormState(emptyFormState)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible guardar la célula.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (cell: CellRow) => {
    const confirmed = window.confirm(`¿Eliminar la célula ${cell.code}?`)
    if (!confirmed) return

    setMessage(null)
    try {
      await deleteCell(cell.id)
      await refreshCells()
      setMessage('Célula eliminada correctamente.')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible eliminar la célula.')
    }
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Células
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Revisa las células activas y su código automático dentro de cada red.
            </Typography>
          </Box>
          {canCreateOrDelete ? (
            <Button variant="contained" onClick={openCreateDialog}>
              Crear célula
            </Button>
          ) : null}
        </Stack>
      </Box>
      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          {message ? (
            <Alert severity={message.toLowerCase().includes('correctamente') ? 'success' : 'error'} sx={{ mb: 2 }}>
              {message}
            </Alert>
          ) : null}
          {isLoading ? (
            <CircularProgress />
          ) : (
            <Stack spacing={2}>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Total
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.length}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Activas
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.filter((cell) => cell.is_active).length}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
              <Divider />
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Código</TableCell>
                      <TableCell>Red</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Activa</TableCell>
                      {(canEdit || canCreateOrDelete) ? <TableCell align="right">Acciones</TableCell> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cells/${item.id}`)}>
                        <TableCell sx={{ fontWeight: 700 }}>{item.code}</TableCell>
                        <TableCell>{networkLabelById.get(item.network_id) ?? `Red ${item.network_id}`}</TableCell>
                        <TableCell>{item.name ?? 'Sin nombre'}</TableCell>
                        <TableCell>{item.is_active ? 'Sí' : 'No'}</TableCell>
                        {(canEdit || canCreateOrDelete) ? (
                          <TableCell align="right" onClick={(event) => event.stopPropagation()}>
                            <Stack direction="row" spacing={1} justifyContent="flex-end">
                              {canEdit ? (
                                <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>
                                  Editar
                                </Button>
                              ) : null}
                              {canCreateOrDelete ? (
                                <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(item)}>
                                  Eliminar
                                </Button>
                              ) : null}
                            </Stack>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>{editingCell ? 'Editar célula' : 'Crear célula'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {!editingCell ? (
            <TextField
              select
              label="Red"
              value={formState.network_id}
              onChange={(event) => setFormState((current) => ({ ...current, network_id: event.target.value }))}
              fullWidth
            >
              <MenuItem value="">
                <em>Selecciona una red</em>
              </MenuItem>
              {networks.map((network) => (
                <MenuItem key={network.id} value={network.id}>
                  {`${network.network_number} - ${network.name}`}
                </MenuItem>
              ))}
            </TextField>
          ) : null}
          <TextField
            label="Nombre"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Activa"
            value={formState.is_active}
            onChange={(event) => setFormState((current) => ({ ...current, is_active: event.target.value as CellFormState['is_active'] }))}
            fullWidth
          >
            <MenuItem value="true">Sí</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitCell} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
