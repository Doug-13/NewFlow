import type { AxiosInstance, InternalAxiosRequestConfig, AxiosResponse } from 'axios'
import {
  MOCK_DOCUMENT_INSTANCES,
  MOCK_TASKS,
  MOCK_WORKFLOWS,
  MOCK_DOCUMENT_TYPES,
  MOCK_METADATA_SETS,
  MOCK_METADATA_DEFINITIONS,
  MOCK_METADATA_VALUES,
  MOCK_ORGANIZATION_UNITS,
  MOCK_ORGANIZATION_AREAS,
  MOCK_ORGANIZATION_ROLES,
  MOCK_USERS,
  MOCK_DASHBOARD,
} from './mockData'

// Estado em memória — permite criar/editar/deletar durante a sessão
const db = {
  'document-instances': structuredClone(MOCK_DOCUMENT_INSTANCES) as any[],
  tasks:                structuredClone(MOCK_TASKS) as any[],
  workflows:            structuredClone(MOCK_WORKFLOWS) as any[],
  'document-types':     structuredClone(MOCK_DOCUMENT_TYPES) as any[],
  'metadata/sets':      structuredClone(MOCK_METADATA_SETS) as any[],
  'metadata/definitions': structuredClone(MOCK_METADATA_DEFINITIONS) as any[],
  'metadata/values':    structuredClone(MOCK_METADATA_VALUES) as any[],
  'organization/units': structuredClone(MOCK_ORGANIZATION_UNITS) as any[],
  'organization/areas': structuredClone(MOCK_ORGANIZATION_AREAS) as any[],
  'organization/roles': structuredClone(MOCK_ORGANIZATION_ROLES) as any[],
  users:                structuredClone(MOCK_USERS) as any[],
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

function resolveCollection(url: string): { key: keyof typeof db; id?: string } | null {
  // /metadata/values/:id
  const metaValMatch = url.match(/^\/metadata\/values\/(.+)$/)
  if (metaValMatch) return { key: 'metadata/values', id: metaValMatch[1] }

  // /metadata/definitions/:id
  const metaDefMatch = url.match(/^\/metadata\/definitions(?:\/(.+))?$/)
  if (metaDefMatch) return { key: 'metadata/definitions', id: metaDefMatch[1] }

  // /metadata/sets/:id
  const metaSetMatch = url.match(/^\/metadata\/sets(?:\/(.+))?$/)
  if (metaSetMatch) return { key: 'metadata/sets', id: metaSetMatch[1] }

  // /organization/units|areas|roles/:id
  const orgMatch = url.match(/^\/(organization\/(?:units|areas|roles))(?:\/(.+))?$/)
  if (orgMatch) return { key: orgMatch[1] as keyof typeof db, id: orgMatch[2] }

  // /document-instances/:id/...  (ignora sub-rotas como /files, /cancel)
  const docMatch = url.match(/^\/document-instances(?:\/([^/]+))?(?:\/.*)?$/)
  if (docMatch) return { key: 'document-instances', id: docMatch[1] }

  // /tasks/:id/execute  (ignora sub-rota)
  const taskMatch = url.match(/^\/tasks(?:\/([^/]+))?(?:\/.*)?$/)
  if (taskMatch) return { key: 'tasks', id: taskMatch[1] }

  // /workflows/:id
  const wfMatch = url.match(/^\/workflows(?:\/(.+))?$/)
  if (wfMatch) return { key: 'workflows', id: wfMatch[1] }

  // /document-types/:id
  const dtMatch = url.match(/^\/document-types(?:\/(.+))?$/)
  if (dtMatch) return { key: 'document-types', id: dtMatch[1] }

  // /users/:id
  const userMatch = url.match(/^\/users(?:\/(.+))?$/)
  if (userMatch) return { key: 'users', id: userMatch[1] }

  return null
}

function generateId() {
  return `mock-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.interceptors.request.use((config): never => {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    const params = config.params ?? {}

    // ── Dashboard ──────────────────────────────────────────────────────────
    if (url.includes('dashboard/summary')) {
      throw { isMockResponse: true, response: makeResponse(MOCK_DASHBOARD) }
    }

    const resolved = resolveCollection(url)
    if (!resolved) {
      // Rota não mapeada — retorna vazio em vez de falhar
      throw { isMockResponse: true, response: makeResponse([]) }
    }

    const { key, id } = resolved
    const collection = db[key]

    // ── GET ────────────────────────────────────────────────────────────────
    if (method === 'get') {
      // /metadata/values/:documentInstanceId — filtra por documentInstanceId
      if (key === 'metadata/values' && id) {
        const filtered = collection.filter((i: any) => i.documentInstanceId === id)
        throw { isMockResponse: true, response: makeResponse(filtered) }
      }

      if (id) {
        const item = collection.find((i: any) => i.id === id)
        if (!item) throw { isMockResponse: true, response: makeResponse(null, 404) }
        throw { isMockResponse: true, response: makeResponse(item) }
      }

      // Filtra por query params (status, documentTypeId, metadataSetId, etc.)
      let result = [...collection]
      Object.entries(params).forEach(([k, v]) => {
        if (v !== undefined && v !== null && v !== '') {
          result = result.filter((i: any) => String(i[k]) === String(v))
        }
      })
      throw { isMockResponse: true, response: makeResponse(result) }
    }

    // ── POST ───────────────────────────────────────────────────────────────
    if (method === 'post') {
      // /tasks/:id/execute — simula execução de ação
      if (url.includes('/execute')) {
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // /document-instances/:id/cancel
      if (url.includes('/cancel') && id) {
        const idx = collection.findIndex((i: any) => i.id === id)
        if (idx !== -1) collection[idx] = { ...collection[idx], status: 'cancelled' }
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // /metadata/values/:documentInstanceId — salva valores
      if (key === 'metadata/values' && id) {
        const body = JSON.parse(config.data ?? '{}')
        const values = body.values ?? []
        values.forEach((v: any) => {
          const idx = collection.findIndex(
            (i: any) => i.documentInstanceId === id && i.metadataDefinitionId === v.metadataDefinitionId
          )
          if (idx !== -1) {
            collection[idx] = { ...collection[idx], value: v.value }
          } else {
            collection.push({ id: generateId(), documentInstanceId: id, ...v })
          }
        })
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // POST genérico — cria item
      const body = JSON.parse(config.data ?? '{}')
      const newItem = { id: generateId(), createdAt: new Date().toISOString(), ...body }
      collection.push(newItem)
      throw { isMockResponse: true, response: makeResponse(newItem, 201) }
    }

    // ── PUT ────────────────────────────────────────────────────────────────
    if (method === 'put' && id) {
      const body = JSON.parse(config.data ?? '{}')
      const idx = collection.findIndex((i: any) => i.id === id)
      if (idx !== -1) {
        collection[idx] = { ...collection[idx], ...body }
        throw { isMockResponse: true, response: makeResponse(collection[idx]) }
      }
      throw { isMockResponse: true, response: makeResponse(null, 404) }
    }

    // ── PATCH ──────────────────────────────────────────────────────────────
    if (method === 'patch' && id) {
      const body = JSON.parse(config.data ?? '{}')
      const idx = collection.findIndex((i: any) => i.id === id)
      if (idx !== -1) {
        collection[idx] = { ...collection[idx], ...body }
        throw { isMockResponse: true, response: makeResponse(collection[idx]) }
      }
      throw { isMockResponse: true, response: makeResponse(null, 404) }
    }

    // ── DELETE ─────────────────────────────────────────────────────────────
    if (method === 'delete' && id) {
      const idx = collection.findIndex((i: any) => i.id === id)
      if (idx !== -1) collection.splice(idx, 1)
      throw { isMockResponse: true, response: makeResponse({}, 204) }
    }

    throw { isMockResponse: true, response: makeResponse([]) }
  })

  // Intercepta o "erro" lançado acima e converte em resposta normal
  instance.interceptors.response.use(
    (res) => res,
    (err) => {
      if (err?.isMockResponse) return Promise.resolve(err.response)
      return Promise.reject(err)
    }
  )
}