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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material'

import { createNetwork, deleteNetwork, getNetworks, updateNetwork } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { NetworkRow } from '../types/domain'

type NetworkFormState = {
  network_number: string
  name: string
  network_type: NetworkRow['network_type']
}

const emptyFormState: NetworkFormState = {
  network_number: '',
  name: '',
  network_type: 'growth',
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

export function NetworksPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<NetworkRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingNetwork, setEditingNetwork] = useState<NetworkRow | null>(null)
  const [formState, setFormState] = useState<NetworkFormState>(emptyFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    getNetworks()
      .then(setItems)
      .catch(() => setMessage('No fue posible cargar las redes.'))
      .finally(() => setIsLoading(false))
  }, [])

  const isAdmin = useMemo(() => user?.roles.includes('admin') ?? false, [user])

  const networkTypeLabel = (value: NetworkRow['network_type']) =>
    value === 'growth' ? 'Red de Crecimiento' : value === 'consolidation' ? 'Red de Consolidación' : 'Red de Transición'

  const openCreateDialog = () => {
    setEditingNetwork(null)
    setFormState(emptyFormState)
    setMessage(null)
    setDialogOpen(true)
  }

  const openEditDialog = (network: NetworkRow) => {
    setEditingNetwork(network)
    setFormState({
      network_number: String(network.network_number),
      name: network.name,
      network_type: network.network_type,
    })
    setMessage(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setIsSaving(false)
  }

  const refreshNetworks = async () => {
    const updated = await getNetworks()
    setItems(updated)
  }

  const submitNetwork = async () => {
    const networkNumber = Number(formState.network_number)
    if (!Number.isInteger(networkNumber) || networkNumber < 1) {
      setMessage('El número de red debe ser un entero mayor o igual a 1.')
      return
    }

    setIsSaving(true)
    setMessage(null)
    try {
      if (editingNetwork) {
        await updateNetwork(editingNetwork.id, {
          name: formState.name.trim(),
          network_type: formState.network_type,
        })
        setMessage('Red actualizada correctamente.')
      } else {
        await createNetwork({
          network_number: networkNumber,
          name: formState.name.trim(),
          network_type: formState.network_type,
        })
        setMessage('Red creada correctamente.')
      }
      await refreshNetworks()
      closeDialog()
      setFormState(emptyFormState)
      setEditingNetwork(null)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible guardar la red.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (network: NetworkRow) => {
    const confirmed = window.confirm(`¿Eliminar la red ${network.network_number} - ${network.name}?`)
    if (!confirmed) return

    setMessage(null)
    try {
      await deleteNetwork(network.id)
      await refreshNetworks()
      setMessage('Red eliminada correctamente.')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible eliminar la red.')
    }
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Redes
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Administran la estructura principal y agrupan múltiples células bajo un mismo seguimiento.
            </Typography>
          </Box>
          {isAdmin ? (
            <Button variant="contained" onClick={openCreateDialog}>
              Crear red
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
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Total redes
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.length}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Red de crecimiento
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.filter((item) => item.network_type === 'growth').length}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Consolidación
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.filter((item) => item.network_type === 'consolidation').length}
                    </Typography>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
                    <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                      Transición
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 800 }}>
                      {items.filter((item) => item.network_type === 'transition').length}
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
              <Divider />
              <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Tipo</TableCell>
                    {isAdmin ? <TableCell align="right">Acciones</TableCell> : null}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell sx={{ fontWeight: 700 }}>{item.network_number}</TableCell>
                      <TableCell>{item.name}</TableCell>
                      <TableCell>{networkTypeLabel(item.network_type)}</TableCell>
                      {isAdmin ? (
                        <TableCell align="right">
                          <Stack direction="row" spacing={1} justifyContent="flex-end">
                            <Button size="small" variant="outlined" onClick={() => openEditDialog(item)}>
                              Editar
                            </Button>
                            <Button size="small" variant="outlined" color="error" onClick={() => handleDelete(item)}>
                              Eliminar
                            </Button>
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
        <DialogTitle>{editingNetwork ? 'Editar red' : 'Crear red'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {!editingNetwork ? (
            <TextField
              label="Número"
              type="number"
              value={formState.network_number}
              onChange={(event) => setFormState((current) => ({ ...current, network_number: event.target.value }))}
              fullWidth
            />
          ) : null}
          <TextField
            label="Nombre"
            value={formState.name}
            onChange={(event) => setFormState((current) => ({ ...current, name: event.target.value }))}
            fullWidth
          />
          <TextField
            select
            label="Tipo"
            value={formState.network_type}
            onChange={(event) => setFormState((current) => ({ ...current, network_type: event.target.value as NetworkRow['network_type'] }))}
            fullWidth
          >
            <MenuItem value="growth">Red de Crecimiento</MenuItem>
            <MenuItem value="consolidation">Red de Consolidación</MenuItem>
            <MenuItem value="transition">Red de Transición</MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitNetwork} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
