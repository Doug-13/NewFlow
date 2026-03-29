import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getMockDb, saveMockDb } from './mockDb'

function clone<T>(value: T): T { return structuredClone(value) }

function parseBody(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'object') return data as Record<string, unknown>
  if (typeof data === 'string') { try { return JSON.parse(data) as Record<string, unknown> } catch { return {} } }
  return {}
}

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeResponse(data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config: {} as InternalAxiosRequestConfig }
}

type DashboardScope = 'account' | 'process'

function resolveDashboardScope(params: Record<string, unknown>): DashboardScope {
  if (params.processId) return 'process'
  return 'account'
}

function findBestDashboard(dashboards: ReturnType<typeof getMockDb>['dashboards'], params: Record<string, unknown>) {
  const accountId  = String(params.accountId ?? params.tenantId ?? '')
  const processId  = String(params.processId ?? '')
  const scopeLevel = (params.scopeLevel as DashboardScope | undefined) ?? resolveDashboardScope(params)

  const candidates = dashboards.filter((item) => {
    if (accountId && String(item.accountId ?? '') !== accountId) return false
    if (scopeLevel === 'process') return item.scopeLevel === 'process' && String(item.processId ?? '') === processId
    return item.scopeLevel === 'account'
  })

  return candidates[0] ?? dashboards[0] ?? null
}

type RouteResolution = { collection: keyof ReturnType<typeof getMockDb>; id?: string; action?: string } | null

function resolveRoute(rawUrl: string): RouteResolution {
  const url = rawUrl.split('?')[0]

  if (/^\/tasks\/[^/]+\/execute$/.test(url))
    return { collection: 'tasks', id: url.split('/')[2], action: 'execute' }

  if (/^\/document-instances\/[^/]+\/cancel$/.test(url) || /^\/documentInstances\/[^/]+\/cancel$/.test(url))
    return { collection: 'documentInstances', id: url.split('/')[2], action: 'cancel' }

  if (/^\/metadataValues\/by-document\/[^/]+$/.test(url))
    return { collection: 'metadataValues', id: url.split('/').pop() ?? '', action: 'byDocument' }

  if (/^\/metadata\/values\/[^/]+$/.test(url))
    return { collection: 'metadataValues', id: url.split('/')[3] ?? '', action: 'byDocument' }

  if (url === '/dashboard/summary' || url === '/dashboards/summary')
    return { collection: 'dashboards', action: 'summary' }

  const routes: Array<[RegExp, keyof ReturnType<typeof getMockDb>]> = [
    [/^\/platformAdmins(?:\/(.+))?$/,                'platformAdmins'],
    [/^\/platform-admins(?:\/(.+))?$/,               'platformAdmins'],
    [/^\/accounts(?:\/(.+))?$/,                      'accounts'],
    [/^\/accountModules(?:\/(.+))?$/,                'accountModules'],
    [/^\/account-modules(?:\/(.+))?$/,               'accountModules'],
    [/^\/tenantModules(?:\/(.+))?$/,                 'accountModules'],
    [/^\/tenant-modules(?:\/(.+))?$/,                'accountModules'],
    [/^\/processes(?:\/(.+))?$/,                     'processes'],
    [/^\/users(?:\/(.+))?$/,                         'users'],
    [/^\/userAccountMemberships(?:\/(.+))?$/,        'userAccountMemberships'],
    [/^\/user-account-memberships(?:\/(.+))?$/,      'userAccountMemberships'],
    [/^\/userProcessMemberships(?:\/(.+))?$/,        'userProcessMemberships'],
    [/^\/user-process-memberships(?:\/(.+))?$/,      'userProcessMemberships'],
    // /environments e /organizationUnits removidos (conceito de ambiente não existe mais)
    [/^\/organizationAreas(?:\/(.+))?$/,             'organizationAreas'],
    [/^\/organization\/areas(?:\/(.+))?$/,           'organizationAreas'],
    [/^\/organizationDisciplines(?:\/(.+))?$/,       'organizationDisciplines'],
    [/^\/organization\/disciplines(?:\/(.+))?$/,     'organizationDisciplines'],
    [/^\/organizationRoles(?:\/(.+))?$/,             'organizationRoles'],
    [/^\/organization\/roles(?:\/(.+))?$/,           'organizationRoles'],
    [/^\/organizationGroups(?:\/(.+))?$/,            'organizationGroups'],
    [/^\/organization\/groups(?:\/(.+))?$/,          'organizationGroups'],
    [/^\/documentInstances(?:\/(.+))?$/,             'documentInstances'],
    [/^\/document-instances(?:\/(.+))?$/,            'documentInstances'],
    [/^\/tasks(?:\/(.+))?$/,                         'tasks'],
    [/^\/workflows(?:\/(.+))?$/,                     'workflows'],
    [/^\/metadataSets(?:\/(.+))?$/,                  'metadataSets'],
    [/^\/metadata\/sets(?:\/(.+))?$/,                'metadataSets'],
    [/^\/metadataDefinitions(?:\/(.+))?$/,           'metadataDefinitions'],
    [/^\/metadata\/definitions(?:\/(.+))?$/,         'metadataDefinitions'],
    [/^\/metadataValues(?:\/(.+))?$/,                'metadataValues'],
    [/^\/metadata\/values(?:\/(.+))?$/,              'metadataValues'],
    [/^\/notificationTemplates(?:\/(.+))?$/,         'notificationTemplates'],
    [/^\/notification-templates(?:\/(.+))?$/,        'notificationTemplates'],
    [/^\/dashboards(?:\/(.+))?$/,                    'dashboards'],
    [/^\/dashboard(?:\/(.+))?$/,                     'dashboards'],
  ]

  for (const [pattern, collection] of routes) {
    const match = url.match(pattern)
    if (match) return { collection, id: match[1] }
  }

  return null
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.interceptors.request.use((config): never => {
    const url      = config.url ?? ''
    const method   = (config.method ?? 'get').toLowerCase()
    const params   = (config.params ?? {}) as Record<string, unknown>
    const resolved = resolveRoute(url)

    if (!resolved) throw { isMockResponse: true, response: makeResponse([]) }

    const db = getMockDb()
    const { collection, id, action } = resolved

    if (collection === 'dashboards' && action === 'summary')
      throw { isMockResponse: true, response: makeResponse(findBestDashboard(db.dashboards, params)) }

    const items = clone(db[collection]) as Array<Record<string, unknown>>

    // GET
    if (method === 'get') {
      if (collection === 'metadataValues' && action === 'byDocument' && id)
        throw { isMockResponse: true, response: makeResponse(items.filter((item) => item.documentInstanceId === id)) }

      if (id && action !== 'byDocument') {
        const item = items.find((entry) => String(entry.id) === id)
        if (!item) throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
        throw { isMockResponse: true, response: makeResponse(item) }
      }

      let result = [...items]
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        const normalizedKey = key === 'tenantId' ? 'accountId' : key
        result = result.filter((entry) => String(entry[normalizedKey]) === String(value))
      })
      throw { isMockResponse: true, response: makeResponse(result) }
    }

    // POST
    if (method === 'post') {
      if (collection === 'tasks' && action === 'execute' && id) {
        const body       = parseBody(config.data)
        const taskIndex  = db.tasks.findIndex((task) => task.id === id)
        if (taskIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Tarefa não encontrada' }, 404) }

        const now        = new Date().toISOString()
        const actionName = String(body.action ?? '')
        db.tasks[taskIndex] = { ...db.tasks[taskIndex], status: 'completed', completedAt: now, comment: body.comment ? String(body.comment) : null, allowedActions: [] }

        const documentIndex = db.documentInstances.findIndex((doc) => doc.id === db.tasks[taskIndex].documentInstanceId)
        if (documentIndex >= 0) {
          const nextStatus = actionName === 'reject' ? 'rejected' : actionName === 'cancel' ? 'cancelled' : actionName === 'publish' ? 'published' : 'in_progress'
          db.documentInstances[documentIndex] = { ...db.documentInstances[documentIndex], status: nextStatus, updatedAt: now }
        }
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex((doc) => doc.id === id)
        if (documentIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Documento não encontrado' }, 404) }
        db.documentInstances[documentIndex] = { ...db.documentInstances[documentIndex], status: 'cancelled', updatedAt: new Date().toISOString() }
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const body   = parseBody(config.data)
        const values = Array.isArray(body.values) ? body.values : []
        const doc    = db.documentInstances.find((d) => d.id === id)
        const scope  = doc ? { accountId: String(doc.accountId ?? ''), processId: String(doc.processId ?? '') } : {}

        values.forEach((incoming) => {
          const payload              = incoming as Record<string, unknown>
          const metadataDefinitionId = String(payload.metadataDefinitionId ?? '')
          const currentIndex = db.metadataValues.findIndex((item) => item.documentInstanceId === id && item.metadataDefinitionId === metadataDefinitionId)

          if (currentIndex >= 0) {
            db.metadataValues[currentIndex] = { ...db.metadataValues[currentIndex], ...payload, documentInstanceId: id, updatedAt: new Date().toISOString() }
          } else {
            db.metadataValues.push({
              id:                    generateId('mval'),
              documentInstanceId:    id,
              metadataDefinitionId,
              accountId:  String(payload.accountId  ?? scope.accountId  ?? ''),
              processId:  String(payload.processId  ?? scope.processId  ?? ''),
              name:       String(payload.name       ?? ''),
              label:      String(payload.label      ?? ''),
              fieldType:  String(payload.fieldType  ?? 'text'),
              isRequired: Boolean(payload.isRequired),
              value:      payload.value,
              createdAt:  new Date().toISOString(),
              updatedAt:  new Date().toISOString(),
            })
          }
        })
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      const body    = parseBody(config.data)
      const newItem = { id: generateId(String(collection).slice(0, 4)), createdAt: new Date().toISOString(), isActive: true, ...body }
      saveMockDb({ ...db, [collection]: [...(db[collection] as unknown[]), newItem] } as typeof db)
      throw { isMockResponse: true, response: makeResponse(newItem, 201) }
    }

    // PUT / PATCH
    if (method === 'put' || method === 'patch') {
      if (!id) throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      const body         = parseBody(config.data)
      const currentIndex = items.findIndex((entry) => String(entry.id) === id)
      if (currentIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
      const updated   = { ...items[currentIndex], ...body, updatedAt: new Date().toISOString() }
      const nextItems = [...items]
      nextItems[currentIndex] = updated
      saveMockDb({ ...db, [collection]: nextItems } as typeof db)
      throw { isMockResponse: true, response: makeResponse(updated) }
    }

    // DELETE
    if (method === 'delete') {
      if (!id) throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      saveMockDb({ ...db, [collection]: items.filter((entry) => String(entry.id) !== id) } as typeof db)
      throw { isMockResponse: true, response: makeResponse({}, 204) }
    }

    throw { isMockResponse: true, response: makeResponse([]) }
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => { if (error?.isMockResponse) return Promise.resolve(error.response); return Promise.reject(error) },
  )
}