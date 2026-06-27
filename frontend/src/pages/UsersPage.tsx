import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

import { ErrorBoundary } from '../components/ErrorBoundary'

import {
  assignUserAdvisor,
  assignUserCellAccess,
  assignUserRole,
  createUser,
  deleteUser,
  getCells,
  getNetworks,
  getUserAdvisors,
  getUserCellAccesses,
  getUsers,
  removeUserAdvisor,
  removeUserCellAccess,
  removeUserRole,
  setUserPassword,
  updateUser,
} from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { CellAccessRow, CellRow, NetworkAdvisorRow, NetworkRow, UserRow } from '../types/domain'

type UserFormState = {
  username: string
  email: string
  password: string
}

const emptyFormState: UserFormState = { username: '', email: '', password: '' }

const ROLE_OPTIONS = [
  { code: 'admin', name: 'Administrador' },
  { code: 'advisor', name: 'Asesor' },
  { code: 'leader', name: 'Líder' },
  { code: 'collaborator', name: 'Colaborador' },
]

function readErrorDetail(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) return null
  const response = 'response' in error ? (error as { response?: { data?: { detail?: unknown } } }).response : null
  if (!response?.data?.detail) return null
  const detail = response.data.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return detail.map((d: unknown) => typeof d === 'object' && d !== null && 'msg' in d ? String((d as { msg: string }).msg) : String(d)).join('; ')
  return String(detail)
}

export function UsersPage() {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [networks, setNetworks] = useState<NetworkRow[]>([])
  const [cells, setCells] = useState<CellRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [formState, setFormState] = useState<UserFormState>(emptyFormState)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [detailUser, setDetailUser] = useState<UserRow | null>(null)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [userAdvisors, setUserAdvisors] = useState<NetworkAdvisorRow[]>([])
  const [userCellAccesses, setUserCellAccesses] = useState<CellAccessRow[]>([])
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailMessage, setDetailMessage] = useState<string | null>(null)

  const [newRoleCode, setNewRoleCode] = useState('advisor')
  const [newNetworkId, setNewNetworkId] = useState<number | ''>('')
  const [newCellId, setNewCellId] = useState<number | ''>('')
  const [newCellRoleCode, setNewCellRoleCode] = useState('leader')
  const [passwordValue, setPasswordValue] = useState('')
  const [detailTab, setDetailTab] = useState<'roles' | 'networks' | 'cells'>('roles')

  const isAdmin = useMemo(() => currentUser?.roles.includes('admin') ?? false, [currentUser])

  useEffect(() => {
    setIsLoading(true)
    Promise.all([getUsers(), getNetworks(), getCells()])
      .then(([u, n, c]) => { setUsers(u); setNetworks(n); setCells(c) })
      .catch(() => setMessage('No fue posible cargar usuarios.'))
      .finally(() => setIsLoading(false))
  }, [])

  const openCreateDialog = () => {
    setFormState(emptyFormState)
    setMessage(null)
    setDialogOpen(true)
  }

  const closeDialog = () => {
    setDialogOpen(false)
    setIsSaving(false)
  }

  const submitUser = async () => {
    setIsSaving(true)
    setMessage(null)
    try {
      await createUser({
        username: formState.username.trim(),
        email: formState.email.trim() || null,
        password: formState.password,
        is_active: true,
      })
      const updated = await getUsers()
      setUsers(updated)
      setMessage('Usuario creado correctamente.')
      closeDialog()
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible crear el usuario.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteUser = async (target: UserRow) => {
    if (target.id === currentUser?.id) {
      setMessage('No puedes eliminarte a ti mismo.')
      return
    }
    const confirmed = window.confirm(`¿Eliminar al usuario ${target.username}?`)
    if (!confirmed) return
    setMessage(null)
    try {
      await deleteUser(target.id)
      setUsers(await getUsers())
      setMessage('Usuario eliminado correctamente.')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? 'No fue posible eliminar el usuario.')
    }
  }

  const openDetail = async (target: UserRow) => {
    setDetailUser(target)
    setUserRoles(target.role_codes)
    setDetailLoading(true)
    setDetailMessage(null)
    try {
      const [advisors, accesses] = await Promise.all([getUserAdvisors(target.id), getUserCellAccesses(target.id)])
      setUserAdvisors(advisors)
      setUserCellAccesses(accesses)
    } catch {
      setDetailMessage('No fue posible cargar detalles.')
    } finally {
      setDetailLoading(false)
    }
  }

  const handleAssignRole = async () => {
    if (!detailUser) return
    try {
      const result = await assignUserRole(detailUser.id, newRoleCode)
      setUserRoles(result.role_codes)
      setDetailMessage(`Rol ${newRoleCode} asignado.`)
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al asignar rol.')
    }
  }

  const handleRemoveRole = async (roleCode: string) => {
    if (!detailUser) return
    try {
      const result = await removeUserRole(detailUser.id, roleCode)
      setUserRoles(result.role_codes)
      setDetailMessage(`Rol ${roleCode} removido.`)
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al remover rol.')
    }
  }

  const handleAssignAdvisor = async () => {
    if (!detailUser || newNetworkId === '') return
    try {
      await assignUserAdvisor(detailUser.id, Number(newNetworkId))
      setUserAdvisors(await getUserAdvisors(detailUser.id))
      setDetailMessage('Asesor asignado.')
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al asignar asesor.')
    }
  }

  const handleRemoveAdvisor = async (networkId: number) => {
    if (!detailUser) return
    try {
      await removeUserAdvisor(detailUser.id, networkId)
      setUserAdvisors(await getUserAdvisors(detailUser.id))
      setDetailMessage('Asesor removido.')
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al remover asesor.')
    }
  }

  const handleAssignCellAccess = async () => {
    if (!detailUser || newCellId === '') return
    try {
      await assignUserCellAccess(detailUser.id, Number(newCellId), newCellRoleCode)
      setUserCellAccesses(await getUserCellAccesses(detailUser.id))
      setDetailMessage('Acceso a célula asignado.')
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al asignar acceso.')
    }
  }

  const handleRemoveCellAccess = async (accessId: number) => {
    if (!detailUser) return
    try {
      await removeUserCellAccess(detailUser.id, accessId)
      setUserCellAccesses(await getUserCellAccesses(detailUser.id))
      setDetailMessage('Acceso removido.')
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al remover acceso.')
    }
  }

  const handleSetPassword = async () => {
    if (!detailUser || !passwordValue.trim()) return
    try {
      await setUserPassword(detailUser.id, passwordValue)
      setDetailMessage('Contraseña actualizada.')
      setPasswordValue('')
    } catch (error) {
      setDetailMessage(readErrorDetail(error) ?? 'Error al actualizar contraseña.')
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} justifyContent="space-between" alignItems={{ md: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800 }}>
              Usuarios
            </Typography>
            <Typography variant="body1" sx={{ color: 'text.secondary' }}>
              Administración de cuentas, roles y permisos.
            </Typography>
          </Box>
          {isAdmin ? (
            <Button variant="contained" onClick={openCreateDialog}>
              Crear usuario
            </Button>
          ) : null}
        </Stack>
      </Box>

      {message ? (
        <Alert severity={message.toLowerCase().includes('correctamente') ? 'success' : 'error'}>{message}</Alert>
      ) : null}

      <Card sx={{ borderRadius: 4 }}>
        <CardContent>
          {isLoading ? (
            <CircularProgress />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Roles</TableCell>
                  <TableCell>Activo</TableCell>
                  {isAdmin ? <TableCell align="right">Acciones</TableCell> : null}
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} hover sx={{ cursor: 'pointer' }} onClick={() => { if (isAdmin) openDetail(u) }}>
                    <TableCell sx={{ fontWeight: 700 }}>{u.username}</TableCell>
                    <TableCell>{u.email ?? '—'}</TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5} useFlexGap flexWrap="wrap">
                        {u.role_codes.map((rc) => (
                          <Chip key={rc} label={rc} size="small" color="primary" variant="outlined" />
                        ))}
                        {u.role_codes.length === 0 ? <Typography variant="caption">Sin roles</Typography> : null}
                      </Stack>
                    </TableCell>
                    <TableCell>{u.is_active ? 'Sí' : 'No'}</TableCell>
                    {isAdmin ? (
                      <TableCell align="right" onClick={(e) => e.stopPropagation()}>
                        <Button size="small" variant="outlined" color="error" onClick={() => handleDeleteUser(u)}>
                          Eliminar
                        </Button>
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </Box>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onClose={closeDialog} fullWidth maxWidth="sm">
        <DialogTitle>Crear usuario</DialogTitle>
        <DialogContent sx={{ display: 'grid', gap: 2, pt: 1 }}>
          <TextField label="Usuario" value={formState.username} onChange={(e) => setFormState((s) => ({ ...s, username: e.target.value }))} fullWidth />
          <TextField label="Email" value={formState.email} onChange={(e) => setFormState((s) => ({ ...s, email: e.target.value }))} fullWidth />
          <TextField label="Contraseña" type="password" value={formState.password} onChange={(e) => setFormState((s) => ({ ...s, password: e.target.value }))} fullWidth />
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={closeDialog} disabled={isSaving}>Cancelar</Button>
          <Button variant="contained" onClick={submitUser} disabled={isSaving}>
            {isSaving ? 'Guardando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!detailUser} onClose={() => setDetailUser(null)} fullWidth maxWidth="md">
        {detailUser ? (
          <ErrorBoundary>
            <>
              <DialogTitle>
              {detailUser.username}
              <Typography variant="body2" color="text.secondary">{detailUser.email ?? 'Sin email'}</Typography>
            </DialogTitle>
            <DialogContent>
              {detailMessage ? (
                <Alert severity={detailMessage.includes('correctamente') || detailMessage.includes('asignado') || detailMessage.includes('actualizada') ? 'success' : 'error'} sx={{ mb: 2 }}>
                  {detailMessage}
                </Alert>
              ) : null}

              <Stack direction="row" spacing={1} sx={{ mb: 3 }} useFlexGap flexWrap="wrap">
                <Chip label="Roles" color={detailTab === 'roles' ? 'primary' : 'default'} onClick={() => setDetailTab('roles')} />
                <Chip label="Redes (asesor)" color={detailTab === 'networks' ? 'primary' : 'default'} onClick={() => setDetailTab('networks')} />
                <Chip label="Células" color={detailTab === 'cells' ? 'primary' : 'default'} onClick={() => setDetailTab('cells')} />
              </Stack>

              {detailLoading ? <CircularProgress /> : (
                <>
                  {detailTab === 'roles' && (
                    <Stack spacing={2}>
                      <Typography variant="subtitle2">Roles actuales</Typography>
                      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                        {userRoles.map((rc) => (
                          <Chip key={rc} label={ROLE_OPTIONS.find((o) => o.code === rc)?.name ?? rc} onDelete={() => handleRemoveRole(rc)} color="primary" />
                        ))}
                        {userRoles.length === 0 ? <Typography variant="body2">Sin roles asignados</Typography> : null}
                      </Stack>
                      <Divider />
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Select value={newRoleCode} onChange={(e) => setNewRoleCode(e.target.value)} sx={{ minWidth: 200 }}>
                          {ROLE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.code} value={opt.code}>{opt.name}</MenuItem>
                          ))}
                        </Select>
                        <Button variant="contained" onClick={handleAssignRole}>Asignar rol</Button>
                      </Stack>
                      <Divider />
                      <Typography variant="subtitle2">Cambiar contraseña</Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <TextField type="password" label="Nueva contraseña" value={passwordValue} onChange={(e) => setPasswordValue(e.target.value)} size="small" />
                        <Button variant="outlined" onClick={handleSetPassword} disabled={!passwordValue.trim()}>Actualizar</Button>
                      </Stack>
                    </Stack>
                  )}

                  {detailTab === 'networks' && (
                    <Stack spacing={2}>
                      <Typography variant="subtitle2">Redes asignadas como asesor</Typography>
                      <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Red</TableCell>
                            <TableCell>Slot</TableCell>
                            <TableCell align="right">Acción</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userAdvisors.map((adv) => (
                            <TableRow key={adv.id}>
                              <TableCell sx={{ fontWeight: 700 }}>{adv.network_name}</TableCell>
                              <TableCell>Asesor {adv.advisor_slot}</TableCell>
                              <TableCell align="right">
                                <Button size="small" color="error" onClick={() => handleRemoveAdvisor(adv.network_id)}>Quitar</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {userAdvisors.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3}><Typography variant="body2">Sin redes asignadas</Typography></TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                      </Box>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Select value={newNetworkId} onChange={(e) => setNewNetworkId(e.target.value as number | '')} displayEmpty sx={{ minWidth: 200 }}>
                          <MenuItem value=""><em>Selecciona red</em></MenuItem>
                          {networks.filter((n) => !userAdvisors.some((a) => a.network_id === n.id)).map((n) => (
                            <MenuItem key={n.id} value={n.id}>{n.network_number} — {n.name}</MenuItem>
                          ))}
                        </Select>
                        <Button variant="contained" onClick={handleAssignAdvisor} disabled={newNetworkId === ''}>Asignar</Button>
                      </Stack>
                    </Stack>
                  )}

                  {detailTab === 'cells' && (
                    <Stack spacing={2}>
                      <Typography variant="subtitle2">Acceso directo a células</Typography>
                      <Box sx={{ overflowX: 'auto' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Célula</TableCell>
                            <TableCell>Rol</TableCell>
                            <TableCell align="right">Acción</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {userCellAccesses.map((acc) => (
                            <TableRow key={acc.id}>
                              <TableCell sx={{ fontWeight: 700 }}>{acc.cell_code}</TableCell>
                              <TableCell>{acc.role_name}</TableCell>
                              <TableCell align="right">
                                <Button size="small" color="error" onClick={() => handleRemoveCellAccess(acc.id)}>Quitar</Button>
                              </TableCell>
                            </TableRow>
                          ))}
                          {userCellAccesses.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={3}><Typography variant="body2">Sin accesos directos</Typography></TableCell>
                            </TableRow>
                          ) : null}
                        </TableBody>
                      </Table>
                      </Box>
                      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                        <Select value={newCellId} onChange={(e) => setNewCellId(e.target.value as number | '')} displayEmpty sx={{ minWidth: 200 }}>
                          <MenuItem value=""><em>Selecciona célula</em></MenuItem>
                          {cells
                            .filter((c) => !userCellAccesses.some((a) => a.cell_id === c.id))
                            .map((c) => (
                              <MenuItem key={c.id} value={c.id}>{c.code}{c.name ? ` — ${c.name}` : ''}</MenuItem>
                            ))}
                        </Select>
                        <Select value={newCellRoleCode} onChange={(e) => setNewCellRoleCode(e.target.value)} sx={{ minWidth: 160 }}>
                          {ROLE_OPTIONS.map((opt) => (
                            <MenuItem key={opt.code} value={opt.code}>{opt.name}</MenuItem>
                          ))}
                        </Select>
                        <Button variant="contained" onClick={handleAssignCellAccess} disabled={newCellId === ''}>Asignar</Button>
                      </Stack>
                    </Stack>
                  )}
                </>
              )}
            </DialogContent>
            <DialogActions sx={{ p: 3 }}>
              <Button onClick={() => setDetailUser(null)}>Cerrar</Button>
            </DialogActions>
          </>
          </ErrorBoundary>
        ) : null}
      </Dialog>
    </Stack>
  )
}
