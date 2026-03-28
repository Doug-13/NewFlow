import type {
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { getMockDb, saveMockDb } from './mockDb'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function parseBody(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'object') return data as Record<string, unknown>
  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  return {}
}

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeResponse(data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

type RouteResolution =
  | { collection: keyof ReturnType<typeof getMockDb>; id?: string; action?: string }
  | null

function resolveRoute(rawUrl: string): RouteResolution {
  const url = rawUrl.split('?')[0]

  if (url === '/dashboard/summary') {
    return { collection: 'dashboard' }
  }

  const routes: Array<[RegExp, keyof ReturnType<typeof getMockDb>]> = [
    [/^\/platformAdmins(?:\/(.+))?$/, 'platformAdmins'],
    [/^\/users(?:\/(.+))?$/, 'users'],
    [/^\/tenantModules(?:\/(.+))?$/, 'tenantModules'],
    [/^\/organizationUnits(?:\/(.+))?$/, 'organizationUnits'],
    [/^\/organizationAreas(?:\/(.+))?$/, 'organizationAreas'],
    [/^\/organizationDisciplines(?:\/(.+))?$/, 'organizationDisciplines'],
    [/^\/organizationRoles(?:\/(.+))?$/, 'organizationRoles'],
    [/^\/documentInstances(?:\/(.+))?$/, 'documentInstances'],
    [/^\/tasks(?:\/(.+))?$/, 'tasks'],
    [/^\/workflows(?:\/(.+))?$/, 'workflows'],
    [/^\/documentTypes(?:\/(.+))?$/, 'documentTypes'],
    [/^\/metadataSets(?:\/(.+))?$/, 'metadataSets'],
    [/^\/metadataDefinitions(?:\/(.+))?$/, 'metadataDefinitions'],
    [/^\/metadataValues(?:\/(.+))?$/, 'metadataValues'],
    [/^\/notificationTemplates(?:\/(.+))?$/, 'notificationTemplates'],
    [/^\/dashboard(?:\/(.+))?$/, 'dashboard'],

    [/^\/organizationGroups(?:\/(.+))?$/, 'organizationGroups'],

    // aliases legados
    [/^\/organization\/units(?:\/(.+))?$/, 'organizationUnits'],
    [/^\/organization\/areas(?:\/(.+))?$/, 'organizationAreas'],
    [/^\/organization\/disciplines(?:\/(.+))?$/, 'organizationDisciplines'],
    [/^\/organization\/roles(?:\/(.+))?$/, 'organizationRoles'],
    [/^\/organization\/groups(?:\/(.+))?$/, 'organizationGroups'],
    [/^\/document-instances(?:\/(.+))?$/, 'documentInstances'],
    [/^\/document-types(?:\/(.+))?$/, 'documentTypes'],
    [/^\/metadata\/sets(?:\/(.+))?$/, 'metadataSets'],
    [/^\/metadata\/definitions(?:\/(.+))?$/, 'metadataDefinitions'],
    [/^\/metadata\/values(?:\/(.+))?$/, 'metadataValues'],
    [/^\/notification-templates(?:\/(.+))?$/, 'notificationTemplates'],
    [/^\/tenant-modules(?:\/(.+))?$/, 'tenantModules'],
    [/^\/platform-admins(?:\/(.+))?$/, 'platformAdmins'],
  ]

  if (/^\/tasks\/[^/]+\/execute$/.test(url)) {
    const taskId = url.split('/')[2]
    return { collection: 'tasks', id: taskId, action: 'execute' }
  }

  if (/^\/document-instances\/[^/]+\/cancel$/.test(url) || /^\/documentInstances\/[^/]+\/cancel$/.test(url)) {
    const documentId = url.split('/')[2]
    return { collection: 'documentInstances', id: documentId, action: 'cancel' }
  }

  if (/^\/metadata\/values\/[^/]+$/.test(url) || /^\/metadataValues\/[^/]+$/.test(url)) {
    const documentInstanceId = url.split('/')[3] ?? url.split('/')[2]
    return { collection: 'metadataValues', id: documentInstanceId, action: 'byDocument' }
  }

  for (const [pattern, collection] of routes) {
    const match = url.match(pattern)
    if (match) {
      return {
        collection,
        id: match[1],
      }
    }
  }

  return null
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.interceptors.request.use((config): never => {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    const params = config.params ?? {}
    const resolved = resolveRoute(url)

    if (!resolved) {
      throw { isMockResponse: true, response: makeResponse([]) }
    }

    const db = getMockDb()

    if (url.includes('dashboard/summary')) {
      throw { isMockResponse: true, response: makeResponse(db.dashboard[0] ?? null) }
    }

    const { collection, id, action } = resolved
    const items = clone(db[collection]) as Array<Record<string, unknown>>

    if (method === 'get') {
      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const filtered = items.filter((item) => item.documentInstanceId === id)
        throw { isMockResponse: true, response: makeResponse(filtered) }
      }

      if (id) {
        const item = items.find((entry) => String(entry.id) === id)
        if (!item) {
          throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
        }
        throw { isMockResponse: true, response: makeResponse(item) }
      }

      let result = [...items]
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        result = result.filter((entry) => String(entry[key]) === String(value))
      })

      throw { isMockResponse: true, response: makeResponse(result) }
    }

    if (method === 'post') {
      if (collection === 'tasks' && action === 'execute' && id) {
        const body = parseBody(config.data)
        const taskIndex = db.tasks.findIndex((task) => task.id === id)

        if (taskIndex < 0) {
          throw { isMockResponse: true, response: makeResponse({ message: 'Tarefa não encontrada' }, 404) }
        }

        const now = new Date().toISOString()
        const actionName = String(body.action ?? '')
        db.tasks[taskIndex] = {
          ...db.tasks[taskIndex],
          status: 'completed',
          completedAt: now,
          comment: body.comment ? String(body.comment) : null,
          allowedActions: [],
        }

        const documentIndex = db.documentInstances.findIndex(
          (document) => document.id === db.tasks[taskIndex].documentInstanceId
        )

        if (documentIndex >= 0) {
          const nextStatus =
            actionName === 'reject'
              ? 'rejected'
              : actionName === 'cancel'
                ? 'cancelled'
                : actionName === 'publish'
                  ? 'published'
                  : 'in_progress'

          db.documentInstances[documentIndex] = {
            ...db.documentInstances[documentIndex],
            status: nextStatus,
            updatedAt: now,
          }
        }

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex((document) => document.id === id)

        if (documentIndex < 0) {
          throw { isMockResponse: true, response: makeResponse({ message: 'Documento não encontrado' }, 404) }
        }

        db.documentInstances[documentIndex] = {
          ...db.documentInstances[documentIndex],
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        }

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const body = parseBody(config.data)
        const values = Array.isArray(body.values) ? body.values : []

        values.forEach((incomingValue) => {
          const payload = incomingValue as Record<string, unknown>
          const metadataDefinitionId = String(payload.metadataDefinitionId ?? '')
          const currentIndex = db.metadataValues.findIndex(
            (item) =>
              item.documentInstanceId === id &&
              item.metadataDefinitionId === metadataDefinitionId
          )

          if (currentIndex >= 0) {
            db.metadataValues[currentIndex] = {
              ...db.metadataValues[currentIndex],
              ...payload,
              documentInstanceId: id,
            }
          } else {
            db.metadataValues.push({
              id: generateId('mval'),
              documentInstanceId: id,
              metadataDefinitionId,
              name: String(payload.name ?? ''),
              label: String(payload.label ?? ''),
              fieldType: String(payload.fieldType ?? 'text'),
              isRequired: Boolean(payload.isRequired),
              value: payload.value,
            })
          }
        })

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      const body = parseBody(config.data)
      const newItem = {
        id: generateId(String(collection).slice(0, 4)),
        createdAt: new Date().toISOString(),
        isActive: true,
        ...body,
      }

      const nextDb = {
        ...db,
        [collection]: [...db[collection], newItem],
      }
      saveMockDb(nextDb)
      throw { isMockResponse: true, response: makeResponse(newItem, 201) }
    }

    if (method === 'put' || method === 'patch') {
      if (!id) {
        throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      }

      const body = parseBody(config.data)
      const currentIndex = items.findIndex((entry) => String(entry.id) === id)

      if (currentIndex < 0) {
        throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
      }

      const updated = {
        ...items[currentIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      }

      const nextItems = [...items]
      nextItems[currentIndex] = updated
      saveMockDb({
        ...db,
        [collection]: nextItems,
      })

      throw { isMockResponse: true, response: makeResponse(updated) }
    }

    if (method === 'delete') {
      if (!id) {
        throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      }

      const nextItems = items.filter((entry) => String(entry.id) !== id)
      saveMockDb({
        ...db,
        [collection]: nextItems,
      })

      throw { isMockResponse: true, response: makeResponse({}, 204) }
    }

    throw { isMockResponse: true, response: makeResponse([]) }
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.isMockResponse) {
        return Promise.resolve(error.response)
      }
      return Promise.reject(error)
    }
  )
}
