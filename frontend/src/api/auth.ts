import { apiClient } from './client'
import type { CurrentUser, LoginResponse } from '../types/auth'

export async function login(username: string, password: string): Promise<LoginResponse> {
  const formData = new URLSearchParams()
  formData.append('username', username)
  formData.append('password', password)

  const response = await apiClient.post<LoginResponse>('/auth/login', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  })
  return response.data
}

export async function getCurrentUser(): Promise<CurrentUser> {
  const response = await apiClient.get<CurrentUser>('/auth/me')
  return response.data
}
