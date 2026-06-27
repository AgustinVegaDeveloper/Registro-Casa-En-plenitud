import { useState } from 'react'
import { Alert, Box, Button, Card, CardContent, TextField, Typography, useTheme } from '@mui/material'
import { useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('Admin1234!')
  const [error, setError] = useState<string | null>(null)

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        background: isDark
          ? 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #121212 100%)'
          : 'linear-gradient(135deg, #0f2d24 0%, #274c3c 50%, #f5efe6 100%)',
      }}
    >
      <Card sx={{ width: '100%', maxWidth: 420, borderRadius: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: 2 }}>
            Bienvenido
          </Typography>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
            CasaEnPlenitudApp
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            Ingresa para administrar redes, células, integrantes y asistencia.
          </Typography>
          {error ? <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert> : null}
          <Box sx={{ display: 'grid', gap: 2 }}>
            <TextField label="Usuario" value={username} onChange={(event) => setUsername(event.target.value)} />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Button
              variant="contained"
              size="large"
              onClick={async () => {
                try {
                  setError(null)
                  await login(username, password)
                  navigate('/')
                } catch {
                  setError('No fue posible iniciar sesión. Revisa tus credenciales.')
                }
              }}
            >
              Entrar
            </Button>
          </Box>
        </CardContent>
      </Card>
    </Box>
  )
}
