import { Box, Button, Card, CardContent, Stack, Typography } from '@mui/material'
import CallIcon from '@mui/icons-material/Call'
import WhatsAppIcon from '@mui/icons-material/WhatsApp'
import SupportAgentIcon from '@mui/icons-material/SupportAgent'

const PHONE = '3153647477'
const PHONE_DISPLAY = '315 364 7477'

export function SupportPage() {
  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0f2d24 0%, #1f4638 55%, #2a5c48 100%)',
          color: 'white',
        }}
      >
        <SupportAgentIcon sx={{ fontSize: 48, mb: 1, opacity: 0.9 }} />
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
          Centro de soporte
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 600, opacity: 0.92, mt: 1 }}>
          ¿Tienes dudas, encontraste un error o necesitas ayuda con la aplicación?
          Estoy aquí para ayudarte.
        </Typography>
      </Box>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Stack spacing={3}>
            <Box>
              <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: 2 }}>
                Contacto directo
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                Agustín Vega
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                Ingeniero de Sistemas — Desarrollador de CasaEnPlenitudApp
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'action.hover',
              }}
            >
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: 'primary.main',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CallIcon sx={{ color: 'white' }} />
              </Box>
              <Box>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  Teléfono
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {PHONE_DISPLAY}
                </Typography>
              </Box>
            </Box>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <Button
                variant="contained"
                size="large"
                startIcon={<CallIcon />}
                href={`tel:+57${PHONE}`}
                fullWidth
                sx={{ py: 1.5 }}
              >
                Llamar ahora
              </Button>
              <Button
                variant="outlined"
                size="large"
                startIcon={<WhatsAppIcon />}
                href={`https://wa.me/57${PHONE}`}
                target="_blank"
                rel="noopener"
                fullWidth
                sx={{ py: 1.5 }}
              >
                Escribir por WhatsApp
              </Button>
            </Stack>

            <Box
              sx={{
                p: 2.5,
                borderRadius: 3,
                bgcolor: 'info.main',
                color: 'info.contrastText',
              }}
            >
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                💡 ¿Sabías que...?
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.9 }}>
                Puedes reportar errores, sugerir nuevas funciones o pedir
                capacitación para tu célula. No dudes en escribir.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ borderRadius: 4 }}>
        <CardContent sx={{ p: { xs: 3, md: 4 } }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
            Preguntas frecuentes
          </Typography>
          <Stack spacing={2}>
            {[
              {
                q: '¿Cómo registro la asistencia de mi célula?',
                a: 'Ve al módulo de Asistencia, selecciona la célula, marca los estados P/R/N/E y haz clic en "Crear reunión y guardar".',
              },
              {
                q: '¿Puedo editar los datos de un integrante?',
                a: 'Sí, desde el módulo de Integrantes haz clic en "Editar" sobre cualquier miembro de la lista.',
              },
              {
                q: '¿Olvidé mi contraseña?',
                a: 'Escribe al desarrollador por WhatsApp o llamada para restablecer tu acceso.',
              },
            ].map((faq) => (
              <Box key={faq.q}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  {faq.q}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {faq.a}
                </Typography>
              </Box>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  )
}
