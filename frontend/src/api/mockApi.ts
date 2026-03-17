import { routes } from '../mocks/endpoints'
import seedDataJson from '../mocks/data.json'
import type { HttpMethod, RouteConfig } from '../mocks/endpoints/types'

type ResponseType =
  | 'raw'
  | 'list'
  | 'item'
  | 'created'
  | 'updated'
  | 'deleted'

type Database = Record<string, any>

let db: Database = deepClone(seedDataJson as Database)

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizePath(url: string) {
  const path = url.split('?')[0].replace(/\/+$/, '')
  return path || '/'
}

function getQueryParams(url: string) {
  const queryString = url.includes('?') ? url.substring(url.indexOf('?')) : ''
  return new URLSearchParams(queryString)
}

function matchPath(template: string, actualUrl: string) {
  const templateParts = normalizePath(template).split('/').filter(Boolean)
  const actualParts = normalizePath(actualUrl).split('/').filter(Boolean)

  if (templateParts.length !== actualParts.length) {
    return null
  }

  const params: Record<string, string> = {}

  for (let i = 0; i < templateParts.length; i++) {
    const templatePart = templateParts[i]
    const actualPart = actualParts[i]

    if (templatePart.startsWith(':')) {
      params[templatePart.slice(1)] = actualPart
      continue
    }

    if (templatePart !== actualPart) {
      return null
    }
  }

  return params
}

function findRoute(method: HttpMethod, url: string) {
  for (const route of routes) {
    if (route.method !== method) continue

    const params = matchPath(route.path, url)
    if (params) {
      return { route, params }
    }
  }

  return null
}

function ensureArrayResource(resource: string) {
  const value = db[resource]

  if (!Array.isArray(value)) {
    throw new Error(`O recurso "${resource}" não é uma coleção.`)
  }

  return value
}

function applyFilters(items: any[], query: URLSearchParams) {
  let result = [...items]

  const search = query.get('search')?.trim().toLowerCase()

  if (search) {
    result = result.filter((item) =>
      Object.values(item).some(
        (value) =>
          typeof value === 'string' &&
          value.toLowerCase().includes(search)
      )
    )
  }

  for (const [key, value] of query.entries()) {
    if (['page', 'pageSize', 'search'].includes(key)) continue

    result = result.filter((item) => String(item[key]) === value)
  }

  return result
}

function paginate(items: any[], query: URLSearchParams) {
  const page = Number(query.get('page') || 1)
  const pageSize = Number(query.get('pageSize') || 20)

  const safePage = Number.isNaN(page) || page < 1 ? 1 : page
  const safePageSize = Number.isNaN(pageSize) || pageSize < 1 ? 20 : pageSize

  const start = (safePage - 1) * safePageSize
  const end = start + safePageSize

  return {
    items: items.slice(start, end),
    totalCount: items.length,
    page: safePage,
    pageSize: safePageSize,
  }
}

function generateId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
  }

  return `${prefix}_${Date.now()}`
}

function getPrefixByResource(resource: string) {
  const map: Record<string, string> = {
    users: 'usr',
    metadataSets: 'set',
    metadataDefinitions: 'meta',
    metadataOptionSets: 'optset',
    metadataOptions: 'opt',
    documentTypes: 'doctype',
    workflows: 'wf',
    documents: 'doc',
  }

  return map[resource] ?? 'id'
}

async function request<T = any>(
  method: HttpMethod,
  url: string,
  body?: any
): Promise<T> {
  await sleep(250)

  const found = findRoute(method, url)

  if (!found) {
    throw new Error(`Mock route não encontrada para ${method} ${url}`)
  }

  const { route, params } = found
  const query = getQueryParams(url)

  if (route.responseType === 'raw') {
    return deepClone(db[route.resource]) as T
  }

  if (method === 'GET' && route.responseType === 'list') {
    const collection = ensureArrayResource(route.resource)
    const filtered = applyFilters(collection, query)
    return paginate(filtered, query) as T
  }

  if (method === 'GET' && route.responseType === 'item') {
    const collection = ensureArrayResource(route.resource)
    const item = collection.find((x) => String(x.id) === params.id)

    if (!item) {
      throw new Error(`Registro não encontrado em ${route.resource} para id=${params.id}`)
    }

    return deepClone(item) as T
  }

  if (method === 'POST' && route.responseType === 'created') {
    const collection = ensureArrayResource(route.resource)
    const prefix = getPrefixByResource(route.resource)

    const newItem = {
      id: body?.id ?? generateId(prefix),
      ...body,
    }

    collection.push(newItem)
    return deepClone(newItem) as T
  }

  if (method === 'PUT' && route.responseType === 'updated') {
    const collection = ensureArrayResource(route.resource)
    const index = collection.findIndex((x) => String(x.id) === params.id)

    if (index === -1) {
      throw new Error(`Registro não encontrado em ${route.resource} para id=${params.id}`)
    }

    collection[index] = {
      ...collection[index],
      ...body,
      id: collection[index].id,
    }

    return deepClone(collection[index]) as T
  }

  if (method === 'DELETE' && route.responseType === 'deleted') {
    const collection = ensureArrayResource(route.resource)
    const index = collection.findIndex((x) => String(x.id) === params.id)

    if (index === -1) {
      throw new Error(`Registro não encontrado em ${route.resource} para id=${params.id}`)
    }

    const removed = collection[index]
    collection.splice(index, 1)

    return deepClone(removed) as T
  }

  throw new Error(`Operação mock não suportada: ${method} ${url}`)
}

export const mockApi = {
  get<T = any>(url: string) {
    return request<T>('GET', url)
  },

  post<T = any>(url: string, body?: any) {
    return request<T>('POST', url, body)
  },

  put<T = any>(url: string, body?: any) {
    return request<T>('PUT', url, body)
  },

  delete<T = any>(url: string) {
    return request<T>('DELETE', url)
  },

  reset() {
    db = deepClone(seedDataJson as Database)
  },

  getDbSnapshot() {
    return deepClone(db)
  },
}