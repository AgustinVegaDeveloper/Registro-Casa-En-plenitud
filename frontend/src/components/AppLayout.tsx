import { useState } from 'react'
import { AppBar, Box, Button, Container, Divider, Drawer, Fade, IconButton, List, ListItemButton, ListItemText, Toolbar, Typography, useMediaQuery, useTheme } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import HubIcon from '@mui/icons-material/Hub'
import GroupWorkIcon from '@mui/icons-material/GroupWork'
import PeopleIcon from '@mui/icons-material/People'
import HowToRegIcon from '@mui/icons-material/HowToReg'
import BarChartIcon from '@mui/icons-material/BarChart'
import BuildIcon from '@mui/icons-material/Build'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'
import MenuIcon from '@mui/icons-material/Menu'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'

import { useAuth } from '../context/AuthContext'
import { useThemeMode } from '../context/ThemeContext'

const DRAWER_WIDTH = 280

export function AppLayout() {
  const { user, logout } = useAuth()
  const { mode, toggle: toggleTheme } = useThemeMode()
  const navigate = useNavigate()
  const location = useLocation()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [mobileOpen, setMobileOpen] = useState(false)

  const isAdmin = user?.roles.includes('admin') ?? false
  const isAdvisor = user?.roles.includes('advisor') ?? false
  const isLeader = user?.roles.includes('leader') ?? false
  const isCollab = user?.roles.includes('collaborator') ?? false

  const navItems: Array<{ label: string; path: string; icon?: typeof BuildIcon }> = [
    ...((isAdmin || isAdvisor || isLeader) ? [{ label: 'Dashboard', path: '/', icon: DashboardIcon }] : []),
    ...((isAdmin || isAdvisor) ? [{ label: 'Redes', path: '/networks', icon: HubIcon }] : []),
    ...((isAdmin || isAdvisor || isLeader) ? [{ label: 'Células', path: '/cells', icon: GroupWorkIcon }] : []),
    ...((isAdmin || isAdvisor || isLeader || isCollab) ? [{ label: 'Integrantes', path: '/members', icon: PeopleIcon }] : []),
    ...((isAdmin || isAdvisor || isLeader || isCollab) ? [{ label: 'Asistencia', path: '/attendance', icon: HowToRegIcon }] : []),
    ...((isAdmin || isAdvisor) ? [{ label: 'Reportes', path: '/reports', icon: BarChartIcon }] : []),
    { label: 'Soporte', path: '/support', icon: BuildIcon },
    ...(isAdmin ? [{ label: 'Usuarios', path: '/users', icon: AdminPanelSettingsIcon }] : []),
  ]

  const drawerContent = (
    <>
      <Box sx={{ p: 3 }}>
        <Typography variant="overline" sx={{ color: 'secondary.main', letterSpacing: 2 }}>
          Iglesia
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 800, mt: 1 }}>
          Gestión pastoral
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <ListItemButton
              key={item.path}
              selected={location.pathname === item.path}
              onClick={() => {
                navigate(item.path)
                if (isMobile) setMobileOpen(false)
              }}
            >
              <ListItemText primary={item.label} />
              {Icon ? <Icon fontSize="small" sx={{ opacity: 0.6, ml: 'auto' }} /> : null}
            </ListItemButton>
          )
        })}
      </List>
    </>
  )

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0} color="primary">
        <Toolbar sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {isMobile ? (
              <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(!mobileOpen)}>
                <MenuIcon />
              </IconButton>
            ) : null}
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              CasaEnPlenitudApp
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton color="inherit" size="small" onClick={toggleTheme} sx={{ opacity: 0.85 }}>
              {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
            </IconButton>
            <Typography
              variant="body2"
              sx={{ opacity: 0.85, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
              onClick={() => navigate('/profile')}
            >
              {user?.username}
            </Typography>
            <Button
              variant="contained"
              color="inherit"
              onClick={() => {
                logout()
                navigate('/login')
              }}
            >
              Salir
            </Button>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: `${DRAWER_WIDTH}px 1fr` } }}>
        {isMobile ? (
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'background.paper' } }}
          >
            {drawerContent}
          </Drawer>
        ) : (
          <Drawer
            variant="permanent"
            sx={{ '& .MuiDrawer-paper': { position: 'relative', width: DRAWER_WIDTH, bgcolor: 'background.paper' } }}
            open
          >
            {drawerContent}
          </Drawer>
        )}
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 }, px: { xs: 1.5, md: 3 } }}>
          <Fade in={true} key={location.pathname} timeout={{ enter: 280, exit: 0 }}>
            <Box>
              <Outlet />
            </Box>
          </Fade>
        </Container>
      </Box>
    </Box>
  )
}
