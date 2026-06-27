import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Stack, TextField, Typography } from '@mui/material'

import { changeMyPassword } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'

export function ProfilePage() {
  const { user } = useAuth()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      setMessage('Las contraseñas no coinciden.')
      return
    }
    if (newPassword.length < 6) {
      setMessage('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setIsSaving(true)
    setMessage(null)
    try {
      await changeMyPassword(currentPassword, newPassword)
      setMessage('Contraseña actualizada correctamente.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (error) {
      const detail = typeof error === 'object' && error !== null && 'response' in error
        ? ((error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? null)
        : null
      setMessage(detail ?? 'No fue posible cambiar la contraseña.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Mi perfil
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          {user?.username} — {user?.email ?? 'Sin email'}
        </Typography>
      </Box>

      {message ? (
        <Alert severity={message.includes('correctamente') ? 'success' : 'error'}>{message}</Alert>
      ) : null}

      <Card sx={{ borderRadius: 4, maxWidth: 480 }}>
        <CardContent sx={{ display: 'grid', gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            Cambiar contraseña
          </Typography>
          <TextField
            label="Contraseña actual"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Nueva contraseña"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
          />
          <TextField
            label="Confirmar contraseña"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
          />
          <Button variant="contained" onClick={handleChangePassword} disabled={isSaving}>
            {isSaving ? 'Actualizando...' : 'Actualizar contraseña'}
          </Button>
        </CardContent>
      </Card>
    </Stack>
  )
}
