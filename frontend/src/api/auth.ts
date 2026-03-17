import { api } from './client'
import type { User, PlatformAdmin } from '../types'

export interface LoginResult {
  accessToken: string
  tokenType: string
  user?: User
  platformAdmin?: PlatformAdmin
  enabledModules: string[]
}

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const res = await api.post('/auth/login', { email, password })
  return res.data
}

export const logout = async () => {
  await api.post('/auth/logout')
}

export const getMe = async (): Promise<LoginResult> => {
  const res = await api.get('/auth/me')
  return res.data
}
