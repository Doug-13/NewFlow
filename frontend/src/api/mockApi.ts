/**
 * mockApi.ts
 *
 * Camada front-only com persistência local em localStorage.
 *
 * Regras desta versão:
 * - a fonte oficial dos dados são as coleções camelCase do front
 * - não depende de json-server
 * - mantém compatibilidade com auth.ts via getDbSnapshot()
 * - toda leitura e gravação passa pela mesma base local
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

let _dbCache: MockDatabase | null = null

function clone<T>(value: T): T {
  return structuredClone(value)
}

function refreshCache(): MockDatabase {
  _dbCache = getMockDb()
  return clone(_dbCache)
}

function getFreshDb(): MockDatabase {
  return refreshCache()
}

function getDbSnapshot(): MockDatabase {
  if (!_dbCache) {
    return initializeMockDb()
  }
  return clone(_dbCache)
}

function invalidateCache() {
  _dbCache = null
}

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function normalizePath(path: string) {
  const withoutQuery = path.split('?')[0]
  return withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
}

function toCollectionName(path: string): CollectionName | null {
  const normalized = normalizePath(path)

  if (normalized === '/platformAdmins' || normalized.startsWith('/platformAdmins/') || normalized === '/platform-admins' || normalized.startsWith('/platform-admins/')) return 'platformAdmins'
  if (normalized === '/users' || normalized.startsWith('/users/')) return 'users'
  if (normalized === '/tenantModules' || normalized.startsWith('/tenantModules/') || normalized === '/tenant-modules' || normalized.startsWith('/tenant-modules/')) return 'tenantModules'
  if (normalized === '/organizationUnits' || normalized.startsWith('/organizationUnits/') || normalized === '/organization/units' || normalized.startsWith('/organization/units/')) return 'organizationUnits'
  if (normalized === '/organizationAreas' || normalized.startsWith('/organizationAreas/') || normalized === '/organization/areas' || normalized.startsWith('/organization/areas/')) return 'organizationAreas'
  if (normalized === '/organizationDisciplines' || normalized.startsWith('/organizationDisciplines/') || normalized === '/organization/disciplines' || normalized.startsWith('/organization/disciplines/')) return 'organizationDisciplines'
  if (normalized === '/organizationRoles' || normalized.startsWith('/organizationRoles/') || normalized === '/organization/roles' || normalized.startsWith('/organization/roles/')) return 'organizationRoles'
  if (normalized === '/documentInstances' || normalized.startsWith('/documentInstances/') || normalized === '/document-instances' || normalized.startsWith('/document-instances/')) return 'documentInstances'
  if (normalized === '/tasks' || normalized.startsWith('/tasks/')) return 'tasks'
  if (normalized === '/workflows' || normalized.startsWith('/workflows/')) return 'workflows'
  if (normalized === '/documentTypes' || normalized.startsWith('/documentTypes/') || normalized === '/document-types' || normalized.startsWith('/document-types/')) return 'documentTypes'
  if (normalized === '/metadataSets' || normalized.startsWith('/metadataSets/') || normalized === '/metadata/sets' || normalized.startsWith('/metadata/sets/')) return 'metadataSets'
  if (normalized === '/metadataDefinitions' || normalized.startsWith('/metadataDefinitions/') || normalized === '/metadata/definitions' || normalized.startsWith('/metadata/definitions/')) return 'metadataDefinitions'
  if (normalized === '/metadataValues' || normalized.startsWith('/metadataValues/') || normalized === '/metadata/values' || normalized.startsWith('/metadata/values/')) return 'metadataValues'
  if (normalized === '/notificationTemplates' || normalized.startsWith('/notificationTemplates/') || normalized === '/notification-templates' || normalized.startsWith('/notification-templates/')) return 'notificationTemplates'
  if (normalized === '/dashboard' || normalized.startsWith('/dashboard/')) return 'dashboard'

  return null
}

function extractId(path: string): string | null {
  const normalized = normalizePath(path)
  const parts = normalized.split('/').filter(Boolean)
  if (parts.length < 2) return null
  return parts[1] ?? null
}

function filterItems<T extends Record<string, unknown>>(
  items: T[],
  filters?: Record<string, unknown>
): T[] {
  if (!filters) return items

  return items.filter((item) =>
    Object.entries(filters).every(([key, value]) => {
      if (value === undefined || value === null || value === '') return true
      return String(item[key]) === String(value)
    })
  )
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const method = (options.method ?? 'GET').toUpperCase()
  const normalizedPath = normalizePath(path)
  const collectionName = toCollectionName(normalizedPath)
  const body = options.body ? JSON.parse(String(options.body)) : undefined

  if (normalizedPath === '/dashboard/summary') {
    const db = getFreshDb()
    return clone((db.dashboard[0] ?? null) as T)
  }

  if (normalizedPath.startsWith('/metadataValues/by-document/')) {
    const documentInstanceId = normalizedPath.split('/').pop() ?? ''
    const db = getFreshDb()
    const result = db.metadataValues.filter((item) => item.documentInstanceId === documentInstanceId)
    return clone(result as T)
  }

  if (normalizedPath.match(/^\/tasks\/[^/]+\/execute$/) && method === 'POST') {
    const taskId = normalizedPath.split('/')[2]
    const db = getFreshDb()
    const task = db.tasks.find((item) => item.id === taskId)

    if (!task) {
      throw new Error('Tarefa não encontrada')
    }

    const now = new Date().toISOString()
    const action = String(body?.action ?? '')
    const comment = body?.comment ? String(body.comment) : null

    const updatedTask = updateItem('tasks', taskId, {
      status: 'completed',
      completedAt: now,
      comment,
      allowedActions: [],
    })

    const relatedDocument = db.documentInstances.find((item) => item.id === task.documentInstanceId)

    if (relatedDocument) {
      const nextStatus =
        action === 'reject'
          ? 'rejected'
          : action === 'cancel'
            ? 'cancelled'
            : action === 'publish'
              ? 'published'
              : 'in_progress'

      updateItem('documentInstances', relatedDocument.id, {
        status: nextStatus,
        updatedAt: now,
      })
    }

    return clone({ success: Boolean(updatedTask) } as T)
  }

  if (normalizedPath.match(/^\/documentInstances\/[^/]+\/cancel$/) && method === 'POST') {
    const documentId = normalizedPath.split('/')[2]
    const updated = updateItem('documentInstances', documentId, {
      status: 'cancelled',
      updatedAt: new Date().toISOString(),
    })

    if (!updated) {
      throw new Error('Documento não encontrado')
    }

    return clone({ success: true } as T)
  }

  if (normalizedPath.match(/^\/metadataValues\/[^/]+$/) && method === 'POST') {
    const documentInstanceId = normalizedPath.split('/')[2]
    const db = getFreshDb()
    const values = Array.isArray(body?.values) ? body.values : []

    const nextMetadataValues = clone(db.metadataValues)

    values.forEach((incomingValue: Record<string, unknown>) => {
      const metadataDefinitionId = String(incomingValue.metadataDefinitionId ?? '')
      const currentIndex = nextMetadataValues.findIndex(
        (item) =>
          item.documentInstanceId === documentInstanceId &&
          item.metadataDefinitionId === metadataDefinitionId
      )

      if (currentIndex >= 0) {
        nextMetadataValues[currentIndex] = {
          ...nextMetadataValues[currentIndex],
          ...incomingValue,
          documentInstanceId,
        }
      } else {
        nextMetadataValues.push({
          id: generateId('mval'),
          documentInstanceId,
          metadataDefinitionId,
          name: String(incomingValue.name ?? ''),
          label: String(incomingValue.label ?? ''),
          fieldType: String(incomingValue.fieldType ?? 'text'),
          isRequired: Boolean(incomingValue.isRequired),
          value: incomingValue.value,
        })
      }
    })

    saveMockDb({
      ...db,
      metadataValues: nextMetadataValues,
    })

    invalidateCache()
    refreshCache()
    return clone({ success: true } as T)
  }

  if (!collectionName) {
    throw new Error(`Rota mock não mapeada: ${normalizedPath}`)
  }

  const db = getFreshDb()
  const collection = clone(db[collectionName]) as Array<Record<string, unknown>>
  const id = extractId(normalizedPath)

  if (method === 'GET') {
    if (id) {
      const item = collection.find((entry) => String(entry.id) === id)
      if (!item) throw new Error('Registro não encontrado')
      return clone(item as T)
    }

    const result = filterItems(
      collection,
      options.headers && typeof options.headers === 'object'
        ? undefined
        : undefined
    )

    return clone(result as T)
  }

  if (method === 'POST') {
    const newItem = {
      id: generateId(String(collectionName).slice(0, 4)),
      createdAt: new Date().toISOString(),
      isActive: true,
      ...body,
    }

    insertItem(collectionName, newItem as never)
    invalidateCache()
    refreshCache()
    return clone(newItem as T)
  }

  if (method === 'PUT' || method === 'PATCH') {
    if (!id) throw new Error('ID obrigatório para atualização')

    const updated = updateItem(collectionName, id, {
      ...(body ?? {}),
      updatedAt: new Date().toISOString(),
    } as never)

    if (!updated) {
      throw new Error('Registro não encontrado para atualização')
    }

    invalidateCache()
    refreshCache()
    return clone(updated as T)
  }

  if (method === 'DELETE') {
    if (!id) throw new Error('ID obrigatório para exclusão')

    const removed = removeItem(collectionName, id)
    if (!removed) {
      throw new Error('Registro não encontrado para exclusão')
    }

    invalidateCache()
    refreshCache()
    return undefined as T
  }

  throw new Error(`Método não suportado: ${method}`)
}

export const mockApi = {
  preload: async () => {
    _dbCache = initializeMockDb()
    return clone(_dbCache)
  },

  getDbSnapshot,

  reset: async () => {
    _dbCache = initializeMockDb()
    return clone(_dbCache)
  },

  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  patch: <T>(path: string, body: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (path: string) =>
    request<void>(path, {
      method: 'DELETE',
    }),
}
