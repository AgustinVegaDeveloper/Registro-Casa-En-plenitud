import { useEffect, useMemo, useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { getAttendanceByCell, getAttendanceByNetwork, getDashboardSummary, getMonthlyAttendance, getReportSummary } from '../api/dashboard'
import type { AttendanceByCellItem, AttendanceByNetworkItem, DashboardSummary, MonthlyAttendanceItem, ReportSummary } from '../types/domain'

const MONTH_LABELS: Record<number, string> = {
  1: 'Ene', 2: 'Feb', 3: 'Mar', 4: 'Abr', 5: 'May', 6: 'Jun',
  7: 'Jul', 8: 'Ago', 9: 'Sep', 10: 'Oct', 11: 'Nov', 12: 'Dic',
}

const PIE_COLORS = ['#2e7d32', '#ed6c02', '#0288d1', '#d32f2f']
const PIE_LABELS: Record<string, string> = {
  presents: 'Presentes', lates: 'Retardos', excused: 'Excusados', absents: 'Ausentes',
}

const defaultSummary: DashboardSummary = {
  totalNetworks: 0, totalCells: 0, totalMembers: 0, monthlyAttendance: 0,
  lastWeekendDate: null, lastWeekendPresents: 0, lastWeekendLates: 0, lastWeekendTotal: 0,
}

export function DashboardPage() {
  const [summary, setSummary] = useState(defaultSummary)
  const [monthly, setMonthly] = useState<MonthlyAttendanceItem[]>([])
  const [byNetwork, setByNetwork] = useState<AttendanceByNetworkItem[]>([])
  const [byCell, setByCell] = useState<AttendanceByCellItem[]>([])
  const [distReport, setDistReport] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getDashboardSummary(),
      getMonthlyAttendance(),
      getAttendanceByNetwork(),
      getAttendanceByCell(),
      getReportSummary({ period: 'month' }),
    ])
      .then(([sum, mon, net, cel, rep]) => {
        setSummary(sum)
        setMonthly(mon)
        setByNetwork(net)
        setByCell(cel)
        setDistReport(rep)
      })
      .finally(() => setLoading(false))
  }, [])

  const monthData = useMemo(() =>
    monthly.map((m) => ({
      name: MONTH_LABELS[m.month] ?? String(m.month),
      Presentes: m.presents,
      Retardos: m.lates,
      Excusados: m.excused,
      Ausentes: m.absents,
    })),
    [monthly],
  )

  const pieData = useMemo(() => {
    if (!distReport || distReport.total_records === 0) return []
    return [
      { name: 'Presentes', value: distReport.presents },
      { name: 'Retardos', value: distReport.lates },
      { name: 'Excusados', value: distReport.excused },
      { name: 'Ausentes', value: distReport.absents },
    ]
  }, [distReport])

  const networkData = useMemo(() =>
    byNetwork.map((n) => ({
      name: n.network_name,
      'Asistencia %': n.attendance_rate,
    })),
    [byNetwork],
  )

  const cellData = useMemo(() =>
    byCell
      .slice()
      .sort((a, b) => b.attendance_rate - a.attendance_rate)
      .slice(0, 10)
      .map((c) => ({
        name: c.cell_code,
        'Asistencia %': c.attendance_rate,
      })),
    [byCell],
  )

  const cards = [
    { label: 'Total redes', value: summary.totalNetworks },
    { label: 'Total células', value: summary.totalCells },
    { label: 'Total integrantes', value: summary.totalMembers },
    { label: 'Asistencia mensual', value: summary.monthlyAttendance },
  ]

  const weekendPresent = summary.lastWeekendPresents + summary.lastWeekendLates

  return (
    <Stack spacing={3}>
      <Box
        sx={{
          p: { xs: 3, md: 4 },
          borderRadius: 4,
          background: 'linear-gradient(135deg, #0f2d24 0%, #1f4638 55%, #f4eadc 100%)',
          color: 'white',
        }}
      >
        <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.85 }}>
          Panel general
        </Typography>
        <Typography variant="h4" sx={{ fontWeight: 800, mt: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body1" sx={{ maxWidth: 760, opacity: 0.92 }}>
          Estado general de la iglesia y seguimiento operativo.
        </Typography>
      </Box>

      <Grid container spacing={2}>
        {cards.map((item) => (
          <Grid key={item.label} item xs={12} sm={6} md={3}>
            <Card sx={{ borderRadius: 4 }}>
              <CardContent>
                <Typography variant="overline" sx={{ color: 'secondary.main' }}>
                  {item.label}
                </Typography>
                <Typography variant="h3" sx={{ fontWeight: 800 }}>
                  {item.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {summary.lastWeekendTotal > 0 ? (
        <Card sx={{ borderRadius: 4, bgcolor: 'primary.main', color: 'primary.contrastText' }}>
          <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 3, flexWrap: 'wrap' }}>
            <Box>
              <Typography variant="overline" sx={{ letterSpacing: 2, opacity: 0.8 }}>
                Último fin de semana
              </Typography>
              <Typography variant="h3" sx={{ fontWeight: 900 }}>
                {weekendPresent}
              </Typography>
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                de {summary.lastWeekendTotal} registros · {summary.lastWeekendDate ? new Date(summary.lastWeekendDate).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : ''}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, ml: 'auto' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{summary.lastWeekendPresents}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Presentes</Typography>
              </Box>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="h5" sx={{ fontWeight: 800 }}>{summary.lastWeekendLates}</Typography>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Retardos</Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} md={7}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Asistencia mensual
                  </Typography>
                  {monthData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Sin datos de asistencia este año.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={monthData} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis fontSize={12} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Presentes" stackId="a" fill="#2e7d32" />
                        <Bar dataKey="Retardos" stackId="a" fill="#ed6c02" />
                        <Bar dataKey="Excusados" stackId="a" fill="#0288d1" />
                        <Bar dataKey="Ausentes" stackId="a" fill="#d32f2f" />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={5}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Distribución mensual
                  </Typography>
                  {pieData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Sin datos para el mes actual.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((_, index) => (
                            <Cell key={index} fill={PIE_COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Asistencia por red
                  </Typography>
                  {networkData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Sin datos para el mes actual.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={networkData} layout="vertical" barSize={20}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} fontSize={12} />
                        <YAxis type="category" dataKey="name" width={140} fontSize={12} />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Bar dataKey="Asistencia %" fill="#0f2d24" radius={[0, 4, 4, 0]} />
                    </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: 4 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>
                    Asistencia por célula (top 10)
                  </Typography>
                  {cellData.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">Sin datos para el mes actual.</Typography>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={cellData} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 100]} fontSize={12} />
                        <YAxis type="category" dataKey="name" width={60} fontSize={12} />
                      <Tooltip formatter={(value: any) => `${value}%`} />
                      <Bar dataKey="Asistencia %" fill="#8b6b3f" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </>
      )}
    </Stack>
  )
}
