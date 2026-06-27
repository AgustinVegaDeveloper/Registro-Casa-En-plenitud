import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Grid, MenuItem, Select, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material'
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { downloadAttendanceReport, getReportScope, getReportSummary } from '../api/dashboard'
import { useAuth } from '../context/AuthContext'
import type { ReportSummary } from '../types/domain'

const PIE_COLORS = ['#2e7d32', '#ed6c02', '#0288d1', '#d32f2f']

const periodOptions = ['Hoy', 'Esta semana', 'Este mes', 'Trimestre', 'Semestre', 'Año', 'Personalizado'] as const

const periodMap = {
  Hoy: 'today',
  'Esta semana': 'week',
  'Este mes': 'month',
  Trimestre: 'quarter',
  Semestre: 'semester',
  Año: 'year',
  Personalizado: 'custom',
} as const

export function ReportsPage() {
  const { user } = useAuth()
  const canExport = useMemo(() => user?.roles.includes('advisor') || user?.roles.includes('admin'), [user])
  const [selectedPeriod, setSelectedPeriod] = useState<(typeof periodOptions)[number]>('Este mes')
  const [summary, setSummary] = useState<ReportSummary | null>(null)
  const [scope, setScope] = useState<'member' | 'cell' | 'network'>('member')
  const [rows, setRows] = useState<Array<{
    entity_id: number
    entity_name: string
    total_meetings: number
    total_records: number
    presents: number
    lates: number
    excused: number
    absents: number
    attendance_rate: number
  }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isExportingPdf, setIsExportingPdf] = useState(false)
  const [isExportingXlsx, setIsExportingXlsx] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error' | 'info'>('info')

  const exportPeriod = periodMap[selectedPeriod]

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

  useEffect(() => {
    setIsLoading(true)
    setMessage(null)
    Promise.all([
      getReportSummary({ period: exportPeriod }),
      getReportScope({ scope, period: exportPeriod }),
    ])
      .then(([summaryData, scopeRows]) => {
        setSummary(summaryData)
        setRows(scopeRows)
      })
      .catch((error) => {
        setMessage(readErrorDetail(error) ?? 'No fue posible cargar los reportes.')
        setMessageSeverity('error')
      })
      .finally(() => setIsLoading(false))
  }, [selectedPeriod, scope])

  const triggerDownload = async (format: 'pdf' | 'xlsx') => {
    try {
      if (format === 'pdf') setIsExportingPdf(true)
      if (format === 'xlsx') setIsExportingXlsx(true)
      setMessage(null)

      const blob = await downloadAttendanceReport({
        scope,
        period: exportPeriod,
        format,
      })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `reporte_asistencia_${scope}_${exportPeriod}.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setMessage(`Reporte ${format.toUpperCase()} descargado correctamente.`)
      setMessageSeverity('success')
    } catch (error) {
      setMessage(readErrorDetail(error) ?? `No fue posible exportar el reporte en ${format.toUpperCase()}.`)
      setMessageSeverity('error')
    } finally {
      setIsExportingPdf(false)
      setIsExportingXlsx(false)
    }
  }

  const reportCards = useMemo(
    () => [
      { label: 'Reuniones', value: summary?.total_meetings ?? 0, hint: 'Total de reuniones dentro del período.' },
      { label: 'Registros', value: summary?.total_records ?? 0, hint: 'Total de marcas de asistencia procesadas.' },
      { label: 'Asistencia', value: `${summary?.attendance_rate ?? 0}%`, hint: 'Porcentaje de asistencia consolidado.' },
      { label: 'Ausentes', value: summary?.absents ?? 0, hint: 'Integrantes marcados como no asistieron.' },
    ],
    [summary],
  )

  const pieData = useMemo(() => {
    if (!summary || summary.total_records === 0) return []
    return [
      { name: 'Presentes', value: summary.presents },
      { name: 'Retardos', value: summary.lates },
      { name: 'Excusados', value: summary.excused },
      { name: 'Ausentes', value: summary.absents },
    ]
  }, [summary])

  const barData = useMemo(() =>
    rows
      .slice()
      .sort((a, b) => b.attendance_rate - a.attendance_rate)
      .slice(0, 10)
      .map((r) => ({ name: r.entity_name, 'Asistencia %': r.attendance_rate })),
    [rows],
  )

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #1f4638 0%, #0f2d24 55%, #f4eadc 100%)',
          color: 'white',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.85 }}>
          Reportes
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
          Seguimiento y exportación
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.92 }}>
          Esta sección queda lista para consolidar los indicadores operativos de integrantes, células y redes.
        </Typography>
      </Box>

      {message ? <Alert severity={messageSeverity}>{message}</Alert> : null}

      <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
        {periodOptions.map((option) => (
          <Chip
            key={option}
            label={option}
            color={selectedPeriod === option ? 'success' : 'default'}
            variant={selectedPeriod === option ? 'filled' : 'outlined'}
            onClick={() => setSelectedPeriod(option)}
          />
        ))}
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
        <Select value={scope} onChange={(event) => setScope(event.target.value as 'member' | 'cell' | 'network')} sx={{ maxWidth: 260 }}>
          <MenuItem value="member">Por integrante</MenuItem>
          <MenuItem value="cell">Por célula</MenuItem>
          <MenuItem value="network">Por red</MenuItem>
        </Select>
        {canExport ? (
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Button variant="outlined" onClick={() => triggerDownload('pdf')} disabled={isExportingPdf || isLoading}>
              {isExportingPdf ? 'Descargando PDF...' : 'Exportar PDF'}
            </Button>
            <Button variant="outlined" onClick={() => triggerDownload('xlsx')} disabled={isExportingXlsx || isLoading}>
              {isExportingXlsx ? 'Descargando Excel...' : 'Exportar Excel'}
            </Button>
          </Stack>
        ) : null}
      </Stack>

      <Grid container spacing={2}>
        {reportCards.map((card) => (
          <Grid key={card.label} item xs={12} sm={6}>
            <Card sx={{ borderRadius: 4, minHeight: 160 }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                  {selectedPeriod}
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 900, mt: 2 }}>
                  {card.value}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
                  {card.hint}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {isLoading ? (
        <CircularProgress />
      ) : (
        <Stack spacing={2}>
          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Desglose de asistencia
              </Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Período: {summary?.period_start ?? '-'} a {summary?.period_end ?? '-'}
              </Typography>
              <Stack direction="row" spacing={2} useFlexGap flexWrap="wrap">
                <Chip label={`Presentes: ${summary?.presents ?? 0}`} color="success" />
                <Chip label={`Retardos: ${summary?.lates ?? 0}`} color="warning" />
                <Chip label={`Excusados: ${summary?.excused ?? 0}`} color="info" />
                <Chip label={`Ausentes: ${summary?.absents ?? 0}`} color="error" />
              </Stack>

              {pieData.length > 0 && (
                <Box sx={{ mt: 3 }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={80} paddingAngle={3} dataKey="value">
                        {pieData.map((_, idx) => (
                          <Cell key={idx} fill={PIE_COLORS[idx]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ borderRadius: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                Ranking {scope === 'member' ? 'por integrante' : scope === 'cell' ? 'por célula' : 'por red'}
              </Typography>

              {barData.length > 0 && (
                <Box sx={{ mb: 3 }}>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={barData} layout="vertical" barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" domain={[0, 100]} fontSize={12} />
                      <YAxis type="category" dataKey="name" width={180} fontSize={12} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Bar dataKey="Asistencia %" fill="#0f2d24" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              )}

              <Box sx={{ overflowX: 'auto' }}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Nombre</TableCell>
                    <TableCell>Reuniones</TableCell>
                    <TableCell>Registros</TableCell>
                    <TableCell>Asistencia</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.entity_id}>
                      <TableCell sx={{ fontWeight: 700 }}>{row.entity_name}</TableCell>
                      <TableCell>{row.total_meetings}</TableCell>
                      <TableCell>{row.total_records}</TableCell>
                      <TableCell>{row.attendance_rate}%</TableCell>
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
