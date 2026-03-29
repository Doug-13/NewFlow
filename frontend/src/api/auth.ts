import type { User, PlatformAdmin } from '../types'
import { MOCK_PLATFORM_ADMINS, MOCK_USERS, MOCK_ACCOUNT_MODULES } from './mockData'

export interface LoginResult {
  accessToken: string
  tokenType: string
  user?: User
  platformAdmin?: PlatformAdmin
  enabledModules: string[]
}

type MockAccountModule = {
  id: string
  accountId: string
  code: string
  name?: string
  isEnabled: boolean
}

type MockUserRecord = User & {
  id: string
  accountId?: string
  email: string
  password?: string
  isActive?: boolean
  status?: string
  role?: string
  [key: string]: unknown
}

type MockPlatformAdminRecord = PlatformAdmin & {
  id: string
  email: string
  password?: string
  isActive?: boolean
  [key: string]: unknown
}

const API_URL = import.meta.env.VITE_API_URL ?? ''
const IS_LOCAL = !!API_URL && !API_URL.includes('localhost')
const AUTH_STORAGE_KEY = 'gestaodoc.mock.auth'

async function getPlatformAdmins(): Promise<MockPlatformAdminRecord[]> {
  if (IS_LOCAL) {
    try { const res = await fetch(`${API_URL}/platformAdmins`); if (res.ok) return res.json() } catch { /* fallback */ }
  }
  return MOCK_PLATFORM_ADMINS as unknown as MockPlatformAdminRecord[]
}

async function getUsers(): Promise<MockUserRecord[]> {
  if (IS_LOCAL) {
    try { const res = await fetch(`${API_URL}/users`); if (res.ok) return res.json() } catch { /* fallback */ }
  }
  return MOCK_USERS as unknown as MockUserRecord[]
}

async function getAccountModules(): Promise<MockAccountModule[]> {
  if (IS_LOCAL) {
    try { const res = await fetch(`${API_URL}/accountModules`); if (res.ok) return res.json() } catch { /* fallback */ }
  }
  return MOCK_ACCOUNT_MODULES as unknown as MockAccountModule[]
}

function normalizeEmail(email: string) { return email.trim().toLowerCase() }

function generateAccessToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `mock-token-${crypto.randomUUID()}`
  return `mock-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isUserActive(user: MockUserRecord) {
  if (user.isActive === false) return false
  const status = String(user.status ?? 'active').toLowerCase()
  return status !== 'inactive' && status !== 'blocked'
}

function isPlatformAdminActive(admin: MockPlatformAdminRecord) { return admin.isActive !== false }

function resolveAccountId(user: MockUserRecord): string {
  return (user.accountId as string | undefined) ?? (user.tenantId as string | undefined) ?? ''
}

function saveSession(result: LoginResult) { localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result)) }

function readSession(): LoginResult | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)
  if (!raw) return null
  try { return JSON.parse(raw) as LoginResult } catch { localStorage.removeItem(AUTH_STORAGE_KEY); return null }
}

function clearSession() { localStorage.removeItem(AUTH_STORAGE_KEY) }

export const login = async (email: string, password: string): Promise<LoginResult> => {
  const normalizedEmail = normalizeEmail(email)

  const platformAdmins = await getPlatformAdmins()
  const platformAdmin  = platformAdmins.find((item) => normalizeEmail(item.email) === normalizedEmail && item.password === password && isPlatformAdminActive(item))

  if (platformAdmin) {
    const result: LoginResult = { accessToken: generateAccessToken(), tokenType: 'Bearer', platformAdmin: platformAdmin as PlatformAdmin, enabledModules: ['platform'] }
    saveSession(result)
    return result
  }

  const users = await getUsers()
  const user  = users.find((item) => normalizeEmail(item.email) === normalizedEmail && item.password === password && isUserActive(item))
  if (!user) throw new Error('Email ou senha inválidos.')

  const accountId      = resolveAccountId(user)
  const accountModules = await getAccountModules()
  const enabledModules = accountModules
    .filter((m) => {
      const moduleAccountId = m.accountId ?? (m as unknown as Record<string, unknown>).tenantId ?? ''
      return moduleAccountId === accountId && m.isEnabled
    })
    .map((m) => m.code)

  const result: LoginResult = { accessToken: generateAccessToken(), tokenType: 'Bearer', user: user as User, enabledModules }
  saveSession(result)
  return result
}

export const logout = async () => { clearSession() }

export const getMe = async (): Promise<LoginResult> => {
  const session = readSession()
  if (!session) throw new Error('Usuário não autenticado.')

  if (session.platformAdmin?.id) {
    const admins       = await getPlatformAdmins()
    const currentAdmin = admins.find((item) => item.id === session.platformAdmin?.id && isPlatformAdminActive(item))
    if (!currentAdmin) { clearSession(); throw new Error('Sessão inválida.') }
    const result: LoginResult = { accessToken: session.accessToken, tokenType: session.tokenType || 'Bearer', platformAdmin: currentAdmin as PlatformAdmin, enabledModules: ['platform'] }
    saveSession(result)
    return result
  }

  if (session.user?.id) {
    const users       = await getUsers()
    const currentUser = users.find((item) => item.id === session.user?.id && isUserActive(item))
    if (!currentUser) { clearSession(); throw new Error('Sessão inválida.') }

    const accountId      = resolveAccountId(currentUser)
    const accountModules = await getAccountModules()
    const enabledModules = accountModules
      .filter((m) => {
        const moduleAccountId = m.accountId ?? (m as unknown as Record<string, unknown>).tenantId ?? ''
        return moduleAccountId === accountId && m.isEnabled
      })
      .map((m) => m.code)

    const result: LoginResult = { accessToken: session.accessToken, tokenType: session.tokenType || 'Bearer', user: currentUser as User, enabledModules }
    saveSession(result)
    return result
  }

  clearSession()
  throw new Error('Sessão inválida.')
}