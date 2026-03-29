/**
 * mockApi.ts — hierarquia: Conta → Processo (ambiente removido)
 */

import {
  getMockDb,
  initializeMockDb,
  insertItem,
  removeItem,
  saveMockDb,
  updateItem,
  type CollectionName,
} from './mockDb'
import type { MockDatabase } from './mockData'

type QueryParams = Record<string, string>

let _dbCache: MockDatabase | null = null

function clone<T>(value: T): T { return structuredClone(value) }

function refreshCache(): MockDatabase { _dbCache = getMockDb(); return clone(_dbCache) }
function getFreshDb(): MockDatabase { return refreshCache() }
function getDbSnapshot(): MockDatabase { if (!_dbCache) return initializeMockDb(); return clone(_dbCache) }
function invalidateCache() { _dbCache = null }

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizePath(path: string) {
  const withoutQuery = path.split('?')[0]
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
}

function parseQueryParams(path: string): QueryParams {
  const queryString = path.includes('?') ? path.split('?')[1] ?? '' : ''
  return Array.from(new URLSearchParams(queryString).entries()).reduce<QueryParams>((acc, [k, v]) => { acc[k] = v; return acc }, {})
}

// ---------------------------------------------------------------------------
// URL → CollectionName
// ---------------------------------------------------------------------------

function toCollectionName(path: string): CollectionName | null {
  const n = normalizePath(path)

  if (n === '/platformAdmins'  || n.startsWith('/platformAdmins/')  || n === '/platform-admins' || n.startsWith('/platform-admins/'))  return 'platformAdmins'
  if (n === '/accounts'        || n.startsWith('/accounts/'))                                                                          return 'accounts'
  if (n === '/accountModules'  || n.startsWith('/accountModules/')  || n === '/account-modules' || n.startsWith('/account-modules/')  || n === '/tenantModules' || n.startsWith('/tenantModules/') || n === '/tenant-modules' || n.startsWith('/tenant-modules/')) return 'accountModules'
  if (n === '/processes'       || n.startsWith('/processes/'))                                                                         return 'processes'
  if (n === '/users'           || n.startsWith('/users/'))                                                                             return 'users'

  if (n === '/userAccountMemberships'  || n.startsWith('/userAccountMemberships/')  || n === '/user-account-memberships'  || n.startsWith('/user-account-memberships/'))  return 'userAccountMemberships'
  if (n === '/userProcessMemberships'  || n.startsWith('/userProcessMemberships/')  || n === '/user-process-memberships'  || n.startsWith('/user-process-memberships/'))  return 'userProcessMemberships'

  // aliases legados de ambiente → agora sem-op, retorna null (rota não existe mais)
  // /environments, /organizationUnits — não mapeamos para nada

  if (n === '/organizationAreas'       || n.startsWith('/organizationAreas/')       || n === '/organization/areas'       || n.startsWith('/organization/areas/'))        return 'organizationAreas'
  if (n === '/organizationDisciplines' || n.startsWith('/organizationDisciplines/') || n === '/organization/disciplines' || n.startsWith('/organization/disciplines/'))  return 'organizationDisciplines'
  if (n === '/organizationRoles'       || n.startsWith('/organizationRoles/')       || n === '/organization/roles'       || n.startsWith('/organization/roles/'))        return 'organizationRoles'
  if (n === '/organizationGroups'      || n.startsWith('/organizationGroups/')      || n === '/organization/groups'      || n.startsWith('/organization/groups/'))       return 'organizationGroups'

  if (n === '/documentInstances'  || n.startsWith('/documentInstances/')  || n === '/document-instances'  || n.startsWith('/document-instances/'))  return 'documentInstances'
  if (n === '/tasks'              || n.startsWith('/tasks/'))                                                                                         return 'tasks'
  if (n === '/workflows'          || n.startsWith('/workflows/'))                                                                                     return 'workflows'
  if (n === '/metadataSets'       || n.startsWith('/metadataSets/')       || n === '/metadata/sets'        || n.startsWith('/metadata/sets/'))        return 'metadataSets'
  if (n === '/metadataDefinitions'|| n.startsWith('/metadataDefinitions/')|| n === '/metadata/definitions' || n.startsWith('/metadata/definitions/')) return 'metadataDefinitions'
  if (n === '/metadataValues'     || n.startsWith('/metadataValues/')     || n === '/metadata/values'      || n.startsWith('/metadata/values/'))      return 'metadataValues'
  if (n === '/notificationTemplates'|| n.startsWith('/notificationTemplates/')|| n === '/notification-templates'|| n.startsWith('/notification-templates/')) return 'notificationTemplates'
  if (n === '/dashboards'         || n.startsWith('/dashboards/')         || n === '/dashboard'            || n.startsWith('/dashboard/'))            return 'dashboards'

  return null
}

function extractId(path: string): string | null {
  const parts = normalizePath(path).split('/').filter(Boolean)
  return parts.length < 2 ? null : parts[1] ?? null
}

function normalizeFilterKey(key: string): string {
  if (key === 'tenantId') return 'accountId'
  if (key === 'dashboardId') return 'id'
  return key
}

function filterItems<T extends Record<string, unknown>>(items: T[], filters?: Record<string, unknown>): T[] {
  if (!filters) return items
  return items.filter((item) =>
    Object.entries(filters).every(([rawKey, value]) => {
      if (value === undefined || value === null || value === '') return true
      const key = normalizeFilterKey(rawKey)
      const itemValue = item[key]
      if (Array.isArray(itemValue)) return itemValue.map(String).includes(String(value))
      return String(itemValue) === String(value)
    }),
  )
}

// ---------------------------------------------------------------------------
// Dashboard com scope Conta → Processo
// ---------------------------------------------------------------------------

function resolveScopeLevelFromQuery(params: QueryParams): 'account' | 'process' {
  if (params.processId) return 'process'
  return 'account'
}

function findBestDashboard(db: MockDatabase, params: QueryParams) {
  const accountId  = params.accountId ?? params.tenantId ?? ''
  const processId  = params.processId ?? ''
  const scopeLevel = (params.scopeLevel as 'account' | 'process' | undefined) ?? resolveScopeLevelFromQuery(params)

  const candidates = db.dashboards.filter((item) => {
    if (accountId && String(item.accountId ?? '') !== accountId) return false
    if (scopeLevel === 'process') return item.scopeLevel === 'process' && String(item.processId ?? '') === processId
    return item.scopeLevel === 'account'
  })

  return candidates[0] ?? db.dashboards[0] ?? null
}

function resolveDocumentScope(db: MockDatabase, documentInstanceId: string) {
  const doc = db.documentInstances.find((item) => item.id === documentInstanceId)
  if (!doc) return {}
  return { accountId: String(doc.accountId ?? ''), processId: String(doc.processId ?? '') }
}

function getScopedCollection<T extends Record<string, unknown>>(items: T[], params: QueryParams): T[] {
  const filters: Record<string, unknown> = { ...params }
  delete filters.scopeLevel
  return filterItems(items, filters)
}

// ---------------------------------------------------------------------------
// Handler central
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method         = (options.method ?? 'GET').toUpperCase()
  const normalizedPath = normalizePath(path)
  const queryParams    = parseQueryParams(path)
  const collectionName = toCollectionName(normalizedPath)
  const body           = options.body ? JSON.parse(String(options.body)) : undefined

  if (normalizedPath === '/dashboard/summary' || normalizedPath === '/dashboards/summary') {
    return clone(findBestDashboard(getFreshDb(), queryParams) as T)
  }

  if (normalizedPath === '/workflows/resolve' && method === 'GET') {
    const db          = getFreshDb()
    const accountId   = queryParams.accountId ?? queryParams.tenantId ?? ''
    const processId   = queryParams.processId ?? ''
    const workflowId  = queryParams.workflowId ?? ''

    const items = db.workflows
      .filter((item) => String(item.accountId ?? '') === accountId)
      .filter((item) => !workflowId || String(item.id) === workflowId)
      .filter((item) => {
        if (item.scopeLevel === 'process') return String(item.processId ?? '') === processId
        return true
      })
      .sort((a, b) => {
        const w = (s: string) => s === 'process' ? 2 : 1
        const diff = w(b.scopeLevel ?? 'account') - w(a.scopeLevel ?? 'account')
        if (diff !== 0) return diff
        return +new Date(String(b.updatedAt ?? '')) - +new Date(String(a.updatedAt ?? ''))
      })

    return clone((items[0] ?? null) as T)
  }

  if (normalizedPath.startsWith('/metadataValues/by-document/')) {
    const documentInstanceId = normalizedPath.split('/').pop() ?? ''
    const db = getFreshDb()
    return clone(db.metadataValues.filter((item) => item.documentInstanceId === documentInstanceId) as T)
  }

  if (normalizedPath.match(/^\/tasks\/[^/]+\/execute$/) && method === 'POST') {
    const taskId = normalizedPath.split('/')[2]
    const db     = getFreshDb()
    const task   = db.tasks.find((item) => item.id === taskId)
    if (!task) throw new Error('Tarefa não encontrada')

    const now     = new Date().toISOString()
    const action  = String(body?.action ?? '')
    const comment = body?.comment ? String(body.comment) : null
    const updatedTask = updateItem('tasks', taskId, { status: 'completed', completedAt: now, comment, allowedActions: [], updatedAt: now } as never)

    const relatedDocument = db.documentInstances.find((item) => item.id === task.documentInstanceId)
    if (relatedDocument) {
      const nextStatus = action === 'reject' ? 'rejected' : action === 'cancel' ? 'cancelled' : action === 'publish' ? 'published' : 'in_progress'
      updateItem('documentInstances', relatedDocument.id, { status: nextStatus, updatedAt: now } as never)
    }

    invalidateCache(); refreshCache()
    return clone({ success: Boolean(updatedTask) } as T)
  }

  if (normalizedPath.match(/^\/documentInstances\/[^/]+\/cancel$/) && method === 'POST') {
    const documentId = normalizedPath.split('/')[2]
    const updated    = updateItem('documentInstances', documentId, { status: 'cancelled', updatedAt: new Date().toISOString() } as never)
    if (!updated) throw new Error('Documento não encontrado')
    invalidateCache(); refreshCache()
    return clone({ success: true } as T)
  }

  if (normalizedPath.match(/^\/metadataValues\/[^/]+$/) && method === 'POST') {
    const documentInstanceId = normalizedPath.split('/')[2]
    const db                 = getFreshDb()
    const values             = Array.isArray(body?.values) ? body.values : []
    const documentScope      = resolveDocumentScope(db, documentInstanceId)
    const nextMetadataValues = clone(db.metadataValues)

    values.forEach((incomingValue: Record<string, unknown>) => {
      const metadataDefinitionId = String(incomingValue.metadataDefinitionId ?? '')
      const currentIndex = nextMetadataValues.findIndex(
        (item) => item.documentInstanceId === documentInstanceId && item.metadataDefinitionId === metadataDefinitionId,
      )

      if (currentIndex >= 0) {
        nextMetadataValues[currentIndex] = {
          ...nextMetadataValues[currentIndex],
          ...incomingValue,
          documentInstanceId,
          accountId:  typeof incomingValue.accountId  === 'string' ? incomingValue.accountId  : (nextMetadataValues[currentIndex].accountId  ?? documentScope.accountId  ?? ''),
          processId:  typeof incomingValue.processId  === 'string' ? incomingValue.processId  : (nextMetadataValues[currentIndex].processId  ?? documentScope.processId  ?? ''),
          updatedAt: new Date().toISOString(),
        }
      } else {
        nextMetadataValues.push({
          id:                    generateId('mval'),
          accountId:             typeof incomingValue.accountId  === 'string' ? incomingValue.accountId  : (documentScope.accountId  ?? ''),
          processId:             typeof incomingValue.processId  === 'string' ? incomingValue.processId  : (documentScope.processId  ?? ''),
          documentInstanceId,
          metadataDefinitionId,
          name:      String(incomingValue.name      ?? ''),
          label:     String(incomingValue.label     ?? ''),
          fieldType: String(incomingValue.fieldType ?? 'text'),
          isRequired: Boolean(incomingValue.isRequired),
          value:     incomingValue.value,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as never)
      }
    })

    saveMockDb({ ...db, metadataValues: nextMetadataValues })
    invalidateCache(); refreshCache()
    return clone({ success: true } as T)
  }

  // CRUD genérico
  if (!collectionName) throw new Error(`Rota mock não mapeada: ${normalizedPath}`)

  const db         = getFreshDb()
  const collection = clone(db[collectionName]) as Array<Record<string, unknown>>
  const id         = extractId(normalizedPath)

  if (method === 'GET') {
    if (id) {
      const item = collection.find((entry) => String(entry.id) === id)
      if (!item) throw new Error('Registro não encontrado')
      return clone(item as T)
    }
    return clone(getScopedCollection(collection, queryParams) as T)
  }

  if (method === 'POST') {
    const now = new Date().toISOString()
    const defaultPayload =
      collectionName === 'accounts'          ? { isActive: true,    createdAt: now, updatedAt: now } :
      collectionName === 'documentInstances' ? { status: 'draft',   createdAt: now, updatedAt: now } :
      collectionName === 'tasks'             ? { status: 'pending', createdAt: now, updatedAt: now, completedAt: null, comment: null } :
      collectionName === 'metadataValues'    ? { createdAt: now, updatedAt: now } :
      collectionName === 'dashboards'        ? { createdAt: now, updatedAt: now } :
      { isActive: true, createdAt: now, updatedAt: now }

    const newItem = { id: generateId(String(collectionName).slice(0, 4)), ...defaultPayload, ...body }
    insertItem(collectionName, newItem as never)
    invalidateCache(); refreshCache()
    return clone(newItem as T)
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (!id) throw new Error('ID obrigatório para atualização')
    const updated = updateItem(collectionName, id, { ...(body ?? {}), updatedAt: new Date().toISOString() } as never)
    if (!updated) throw new Error('Registro não encontrado para atualização')
    invalidateCache(); refreshCache()
    return clone(updated as T)
  }

  if (method === 'DELETE') {
    if (!id) throw new Error('ID obrigatório para exclusão')
    const removed = removeItem(collectionName, id)
    if (!removed) throw new Error('Registro não encontrado para exclusão')
    invalidateCache(); refreshCache()
    return undefined as T
  }

  throw new Error(`Método não suportado: ${method}`)
}

export const mockApi = {
  preload: async () => { _dbCache = initializeMockDb(); return clone(_dbCache) },
  getDbSnapshot,
  reset:   async () => { _dbCache = initializeMockDb(); return clone(_dbCache) },
  get:    <T>(path: string)                => request<T>(path),
  post:   <T>(path: string, body: unknown) => request<T>(path, { method: 'POST',  body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => request<T>(path, { method: 'PUT',   body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete:     (path: string)               => request<void>(path, { method: 'DELETE' }),
}