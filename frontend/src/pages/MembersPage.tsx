import { useEffect, useMemo, useRef, useState } from 'react'
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

import { createMember, deleteMember, getMembers, updateMember, uploadMemberPhoto } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { MemberRow } from '../types/domain'

type MemberFormState = {
  document: string
  first_name: string
  last_name: string
  birth_date: string
  phone: string
  address: string
  neighborhood: string
  notes: string
  church_join_date: string
  first_cell_join_date: string
}

const emptyFormState: MemberFormState = {
  document: '',
  first_name: '',
  last_name: '',
  birth_date: '',
  phone: '',
  address: '',
  neighborhood: '',
  notes: '',
  church_join_date: '',
  first_cell_join_date: '',
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

export function MembersPage() {
  const { user } = useAuth()
  const [items, setItems] = useState<MemberRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [neighborhood, setNeighborhood] = useState('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<MemberRow | null>(null)
  const [formState, setFormState] = useState<MemberFormState>(emptyFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  useEffect(() => {
    getMembers()
      .then(setItems)
      .catch(() => setMessage('No fue posible cargar los integrantes.'))
      .finally(() => setIsLoading(false))
  }, [])

  const canManageMembers = useMemo(() => user?.roles.includes('collaborator') || user?.roles.includes('admin'), [user])

  const neighborhoods = useMemo(
    () => Array.from(new Set(items.map((item) => item.neighborhood).filter(Boolean))) as string[],
    [items],
  )

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return items.filter((item) => {
      const matchesQuery =
        !normalizedQuery ||
        [item.document, item.first_name, item.last_name, item.phone, item.neighborhood]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(normalizedQuery))
      const matchesNeighborhood = neighborhood === 'all' || item.neighborhood === neighborhood
      return matchesQuery && matchesNeighborhood
    })
  }, [items, query, neighborhood])

  const openCreateDialog = () => {
    setEditingMember(null)
    setFormState(emptyFormState)
    setSelectedFile(null)
    setPreviewUrl(null)
    setMessage(null)
    setDialogOpen(true)
  }

  const openEditDialog = (member: MemberRow) => {
    setEditingMember(member)
    setFormState({
      document: member.document,
      first_name: member.first_name,
      last_name: member.last_name,
      birth_date: member.birth_date ?? '',
      phone: member.phone ?? '',
      address: member.address ?? '',
      neighborhood: member.neighborhood ?? '',
      notes: member.notes ?? '',
      church_join_date: member.church_join_date ?? '',
      first_cell_join_date: member.first_cell_join_date ?? '',
    })
    setSelectedFile(null)
    setPreviewUrl(null)
    setMessage(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setIsSaving(false)
  }

  const refreshMembers = async () => {
    const updated = await getMembers()
    setItems(updated)
  }

  const normalizeDate = (value: string) => (value.trim() ? value : null)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setSelectedFile(file)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    if (file) {
      setPreviewUrl(URL.createObjectURL(file))
    }
  }

  const submitMember = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      let savedMember: MemberRow
      if (editingMember) {
        savedMember = await updateMember(editingMember.id, {
          first_name: formState.first_name.trim(),
          last_name: formState.last_name.trim(),
          birth_date: normalizeDate(formState.birth_date),
          phone: normalizeDate(formState.phone),
          address: normalizeDate(formState.address),
          neighborhood: normalizeDate(formState.neighborhood),
          notes: normalizeDate(formState.notes),
          church_join_date: normalizeDate(formState.church_join_date),
          first_cell_join_date: normalizeDate(formState.first_cell_join_date),
        })
        setMessage('Integrante actualizado correctamente.')
      } else {
        savedMember = await createMember({
          document: formState.document.trim(),
          first_name: formState.first_name.trim(),
          last_name: formState.last_name.trim(),
          birth_date: normalizeDate(formState.birth_date),
          phone: normalizeDate(formState.phone),
          address: normalizeDate(formState.address),
          neighborhood: normalizeDate(formState.neighborhood),
          notes: normalizeDate(formState.notes),
          church_join_date: normalizeDate(formState.church_join_date),
          first_cell_join_date: normalizeDate(formState.first_cell_join_date),
        })
        setMessage('Integrante creado correctamente.')
      }

      if (selectedFile) {
        try {
          await uploadMemberPhoto(savedMember.id, selectedFile)
        } catch {
          setMessage((prev) => (prev ?? '') + ' (La foto no pudo subirse)')
        }
      }

      await refreshMembers()
      closeDialog()
      setEditingMember(null)
      setFormState(emptyFormState)
      setSelectedFile(null)
      setPreviewUrl(null)
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible guardar el integrante.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (member: MemberRow) => {
    const confirmed = window.confirm(`¿Eliminar al integrante ${member.first_name} ${member.last_name}?`)
    if (!confirmed) return

    setMessage(null)
    try {
      await deleteMember(member.id)
      await refreshMembers()
      setMessage('Integrante eliminado correctamente.')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible eliminar el integrante.')
    }
  }

  return (
    <Stack spacing={2}>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Integrantes
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Consulta la base principal de miembros y sus datos de contacto.
            </Typography>
          </Box>
          {canManageMembers ? (
            <Button variant="contained" onClick={openCreateDialog}>
              Crear integrante
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
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField label="Buscar" value={query} onChange={(event) => setQuery(event.target.value)} fullWidth />
                <Select value={neighborhood} onChange={(event) => setNeighborhood(event.target.value)} displayEmpty fullWidth>
                  <MenuItem value="all">Todos los barrios</MenuItem>
                  {neighborhoods.map((item) => (
                    <MenuItem key={item} value={item}>
                      {item}
                    </MenuItem>
                  ))}
                </Select>
              </Stack>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Mostrando {filteredItems.length} de {items.length} integrantes.
              </Typography>
              <Box sx={{ overflowX: 'auto' }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Documento</TableCell>
                      <TableCell>Nombre</TableCell>
                      <TableCell>Teléfono</TableCell>
                      <TableCell>Barrio</TableCell>
                      {canManageMembers ? <TableCell align="right">Acciones</TableCell> : null}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/members/${item.id}`)}>
                        <TableCell>{item.document}</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{`${item.first_name} ${item.last_name}`}</TableCell>
                        <TableCell>{item.phone ?? 'Sin dato'}</TableCell>
                        <TableCell>{item.neighborhood ?? 'Sin dato'}</TableCell>
                        {canManageMembers ? (
                          <TableCell align="right" onClick={(event) => event.stopPropagation()}>
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

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="md">
        <DialogTitle>{editingMember ? 'Editar integrante' : 'Crear integrante'}</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          {!editingMember ? (
            <TextField
              label="Documento"
              value={formState.document}
              onChange={(event) => setFormState((current) => ({ ...current, document: event.target.value }))}
              fullWidth
            />
          ) : null}
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Nombres"
              value={formState.first_name}
              onChange={(event) => setFormState((current) => ({ ...current, first_name: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Apellidos"
              value={formState.last_name}
              onChange={(event) => setFormState((current) => ({ ...current, last_name: event.target.value }))}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Fecha de nacimiento"
              type="date"
              value={formState.birth_date}
              onChange={(event) => setFormState((current) => ({ ...current, birth_date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Teléfono"
              value={formState.phone}
              onChange={(event) => setFormState((current) => ({ ...current, phone: event.target.value }))}
              fullWidth
            />
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Dirección"
              value={formState.address}
              onChange={(event) => setFormState((current) => ({ ...current, address: event.target.value }))}
              fullWidth
            />
            <TextField
              label="Barrio"
              value={formState.neighborhood}
              onChange={(event) => setFormState((current) => ({ ...current, neighborhood: event.target.value }))}
              fullWidth
            />
          </Stack>
          <TextField
            label="Observaciones"
            value={formState.notes}
            onChange={(event) => setFormState((current) => ({ ...current, notes: event.target.value }))}
            fullWidth
            multiline
            minRows={2}
          />
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" onClick={() => fileInputRef.current?.click()}>
                {selectedFile ? 'Cambiar foto' : 'Seleccionar foto'}
              </Button>
              <Typography variant="body2" color="text.secondary">
                {selectedFile ? selectedFile.name : 'Tomar o cargar desde galería'}
              </Typography>
            </Stack>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              style={{ display: 'none' }}
              onChange={handleFileChange}
            />
            {previewUrl ? (
              <Box sx={{ maxWidth: 200, borderRadius: 2, overflow: 'hidden' }}>
                <img src={previewUrl} alt="Vista previa" style={{ width: '100%', display: 'block' }} />
              </Box>
            ) : editingMember?.photo_path ? (
              <Box sx={{ maxWidth: 200, borderRadius: 2, overflow: 'hidden' }}>
                <img
                  src={`${import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') ?? 'http://127.0.0.1:8000'}/uploads/${editingMember.photo_path}`}
                  alt="Foto actual"
                  style={{ width: '100%', display: 'block' }}
                />
              </Box>
            ) : null}
          </Stack>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Fecha ingreso iglesia"
              type="date"
              value={formState.church_join_date}
              onChange={(event) => setFormState((current) => ({ ...current, church_join_date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
            <TextField
              label="Fecha ingreso célula"
              type="date"
              value={formState.first_cell_join_date}
              onChange={(event) => setFormState((current) => ({ ...current, first_cell_join_date: event.target.value }))}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog} disabled={isSaving}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={submitMember} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  )
}
