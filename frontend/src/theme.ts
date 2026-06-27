import { createTheme } from '@mui/material/styles'

const commonComponents = {
  MuiButton: {
    styleOverrides: {
      root: {
        textTransform: 'none',
        transition: 'all 0.15s ease',
        '&:hover': {
          transform: 'scale(1.02)',
        },
      },
    },
  },
  MuiCard: {
    styleOverrides: {
      root: {
        transition: 'box-shadow 0.25s ease, transform 0.25s ease',
        '&:hover': {
          boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
        },
      },
    },
  },
  MuiListItemButton: {
    styleOverrides: {
      root: {
        transition: 'all 0.15s ease',
        '&:hover': {
          transform: 'translateX(4px)',
        },
      },
    },
  },
}

export const lightTheme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0f2d24' },
    secondary: { main: '#8b6b3f' },
    background: {
      default: '#f5efe6',
      paper: '#fffaf3',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  shape: { borderRadius: 16 },
  components: commonComponents,
})

export const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#4caf7d' },
    secondary: { main: '#c49a6c' },
    background: {
      default: '#121212',
      paper: '#1e1e1e',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif',
  },
  shape: { borderRadius: 16 },
  components: commonComponents,
})
