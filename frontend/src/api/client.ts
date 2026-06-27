import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000/api/v1'

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
})

apiClient.interceptors.request.use((config) => {
  const token = window.localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})
