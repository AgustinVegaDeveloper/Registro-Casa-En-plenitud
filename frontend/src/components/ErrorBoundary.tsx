import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Alert, Box, Button } from '@mui/material'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 3 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {this.state.error.message}
          </Alert>
          <Button variant="outlined" onClick={() => this.setState({ error: null })}>
            Reintentar
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
