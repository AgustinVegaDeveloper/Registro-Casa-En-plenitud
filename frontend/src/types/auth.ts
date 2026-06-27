export type UserRole = 'admin' | 'advisor' | 'leader' | 'collaborator'

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
}

export interface CurrentUser {
  id: number
  username: string
  email: string | null
  is_active: boolean
  roles: UserRole[]
}
