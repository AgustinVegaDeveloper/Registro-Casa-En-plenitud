import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

import { getCurrentUser, login as loginRequest } from '../api/auth'
import type { CurrentUser } from '../types/auth'

interface AuthContextValue {
  user: CurrentUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = window.localStorage.getItem('access_token')
    if (!token) {
      setIsLoading(false)
      return
    }

    getCurrentUser()
      .then(setUser)
      .catch(() => {
        window.localStorage.removeItem('access_token')
        setUser(null)
      })
      .finally(() => setIsLoading(false))
  }, [])

  async function login(username: string, password: string) {
    const response = await loginRequest(username, password)
    window.localStorage.setItem('access_token', response.access_token)
    const currentUser = await getCurrentUser()
    setUser(currentUser)
  }

  function logout() {
    window.localStorage.removeItem('access_token')
    setUser(null)
  }

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      logout,
    }),
    [user, isLoading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}
