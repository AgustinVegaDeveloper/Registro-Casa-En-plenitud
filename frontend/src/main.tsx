import React from 'react'
import ReactDOM from 'react-dom/client'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { BrowserRouter } from 'react-router-dom'

import { App } from './App'
import { AuthProvider } from './context/AuthContext'
import { ThemeModeProvider, useThemeMode } from './context/ThemeContext'
import { darkTheme, lightTheme } from './theme'

function ThemedApp() {
  const { mode } = useThemeMode()
  return (
    <ThemeProvider theme={mode === 'dark' ? darkTheme : lightTheme}>
      <CssBaseline />
      <AuthProvider>
        <App />
      </AuthProvider>
    </ThemeProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeModeProvider>
        <ThemedApp />
      </ThemeModeProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
