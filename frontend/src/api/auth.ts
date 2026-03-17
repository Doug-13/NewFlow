// import { api } from './client'
// import type { User, PlatformAdmin } from '../types'

// export interface LoginResult {
//   accessToken: string
//   tokenType: string
//   user?: User
//   platformAdmin?: PlatformAdmin
//   enabledModules: string[]
// }

// export const login = async (email: string, password: string): Promise<LoginResult> => {
//   const res = await api.post('/auth/login', { email, password })
//   return res.data
// }

// export const logout = async () => {
//   await api.post('/auth/logout')
// }

// export const getMe = async (): Promise<LoginResult> => {
//   const res = await api.get('/auth/me')
//   return res.data
// }
import { mockApi } from './mockApi'
import type { User, PlatformAdmin } from '../types'

export interface LoginResult {
  accessToken: string
  tokenType: string
  user?: User
  platformAdmin?: PlatformAdmin
  enabledModules: string[]
}

type MockTenantModule = {
  id: string
  tenantId: string
  code: string
  name?: string
  isEnabled: boolean
}

type MockUserRecord = User & {
  id: string
  tenantId?: string
  email: string
  password?: string
  isActive?: boolean
  status?: string
  role?: string
  [key: string]: unknown
}

type MockPlatformAdminRecord = PlatformAdmin & {
  id: string
  name?: string
  email: string
  password?: string
  isActive?: boolean
  [key: string]: unknown
}

type MockDb = {
  users?: MockUserRecord[]
  platformAdmins?: MockPlatformAdminRecord[]
  tenantModules?: MockTenantModule[]
}

const AUTH_STORAGE_KEY = 'gestaodoc.mock.auth'

function getDb(): MockDb {
  return mockApi.getDbSnapshot() as MockDb
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function generateAccessToken() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `mock-token-${crypto.randomUUID()}`
  }

  return `mock-token-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function isUserActive(user: MockUserRecord) {
  if (user.isActive === false) return false

  const status = String(user.status ?? 'active').toLowerCase()

  if (status === 'inactive' || status === 'blocked') {
    return false
  }

  return true
}

function isPlatformAdminActive(admin: MockPlatformAdminRecord) {
  return admin.isActive !== false
}

function getEnabledModulesByTenantId(tenantId?: string) {
  if (!tenantId) return []

  const db = getDb()
  const modules = db.tenantModules ?? []

  return modules
    .filter((module) => module.tenantId === tenantId && module.isEnabled)
    .map((module) => module.code)
}

function saveSession(result: LoginResult) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(result))
}

function readSession(): LoginResult | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY)

  if (!raw) return null

  try {
    return JSON.parse(raw) as LoginResult
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY)
    return null
  }
}

function clearSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}

export const login = async (
  email: string,
  password: string
): Promise<LoginResult> => {
  const db = getDb()
  const normalizedEmail = normalizeEmail(email)

  const platformAdmin = (db.platformAdmins ?? []).find(
    (item) =>
      normalizeEmail(item.email) === normalizedEmail &&
      item.password === password &&
      isPlatformAdminActive(item)
  )

  if (platformAdmin) {
    const result: LoginResult = {
      accessToken: generateAccessToken(),
      tokenType: 'Bearer',
      platformAdmin: platformAdmin as PlatformAdmin,
      enabledModules: ['platform'],
    }

    saveSession(result)
    return result
  }

  const user = (db.users ?? []).find(
    (item) =>
      normalizeEmail(item.email) === normalizedEmail &&
      item.password === password &&
      isUserActive(item)
  )

  if (!user) {
    throw new Error('Email ou senha inválidos.')
  }

  const result: LoginResult = {
    accessToken: generateAccessToken(),
    tokenType: 'Bearer',
    user: user as User,
    enabledModules: getEnabledModulesByTenantId(user.tenantId),
  }

  saveSession(result)
  return result
}

export const logout = async () => {
  clearSession()
}

export const getMe = async (): Promise<LoginResult> => {
  const session = readSession()

  if (!session) {
    throw new Error('Usuário não autenticado.')
  }

  const db = getDb()

  if (session.platformAdmin?.id) {
    const currentAdmin = (db.platformAdmins ?? []).find(
      (item) =>
        item.id === session.platformAdmin?.id &&
        isPlatformAdminActive(item)
    )

    if (!currentAdmin) {
      clearSession()
      throw new Error('Sessão inválida.')
    }

    const result: LoginResult = {
      accessToken: session.accessToken,
      tokenType: session.tokenType || 'Bearer',
      platformAdmin: currentAdmin as PlatformAdmin,
      enabledModules: ['platform'],
    }

    saveSession(result)
    return result
  }

  if (session.user?.id) {
    const currentUser = (db.users ?? []).find(
      (item) => item.id === session.user?.id && isUserActive(item)
    )

    if (!currentUser) {
      clearSession()
      throw new Error('Sessão inválida.')
    }

    const result: LoginResult = {
      accessToken: session.accessToken,
      tokenType: session.tokenType || 'Bearer',
      user: currentUser as User,
      enabledModules: getEnabledModulesByTenantId(currentUser.tenantId),
    }

    saveSession(result)
    return result
  }

  clearSession()
  throw new Error('Sessão inválida.')
}