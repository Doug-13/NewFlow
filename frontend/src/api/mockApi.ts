/**
 * mockApi.ts
 *
 * Substituto do mockApi removido anteriormente.
 * Usado por: auth.ts (getDbSnapshot) e users.ts (get/post/put)
 *
 * Lê e persiste dados no db.json via json-server rodando em localhost:3001.
 * O auth.ts usa getDbSnapshot() de forma síncrona — mantemos um cache
 * em memória que é carregado na primeira chamada assíncrona.
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1'

// ─── Cache em memória para getDbSnapshot (usado pelo auth.ts) ────────────────

let _dbCache: Record<string, unknown> | null = null

async function loadDbCache(): Promise<Record<string, unknown>> {
  if (_dbCache) return _dbCache

  // Carrega as coleções que auth.ts precisa em paralelo
  const [users, platformAdmins, tenantModules] = await Promise.all([
    fetch(`${BASE_URL}/users`).then((r) => r.json()).catch(() => []),
    fetch(`${BASE_URL}/platformAdmins`).then((r) => r.json()).catch(() => []),
    fetch(`${BASE_URL}/tenantModules`).then((r) => r.json()).catch(() => []),
  ])

  _dbCache = { users, platformAdmins, tenantModules }
  return _dbCache
}

/**
 * Retorna snapshot síncrono do banco — funciona após preload().
 * auth.ts chama isso dentro de funções assíncronas, então o cache
 * já estará populado quando getDbSnapshot() for invocado.
 */
function getDbSnapshot(): Record<string, unknown> {
  if (!_dbCache) {
    // Fallback seguro caso preload não tenha sido chamado ainda
    return { users: [], platformAdmins: [], tenantModules: [] }
  }
  return _dbCache
}

/**
 * Invalida o cache — chame após POST/PUT para forçar reload.
 */
function invalidateCache() {
  _dbCache = null
}

// ─── Cliente HTTP genérico ────────────────────────────────────────────────────

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(err.message ?? 'Erro na requisição')
  }

  // DELETE retorna 200 sem body no json-server
  const text = await res.text()
  return (text ? JSON.parse(text) : {}) as T
}

// ─── Interface pública ────────────────────────────────────────────────────────

export const mockApi = {
  /**
   * Carrega o cache inicial — chame uma vez no bootstrap da aplicação (main.tsx).
   * Exemplo:
   *   import { mockApi } from './api/mockApi'
   *   await mockApi.preload()
   *   ReactDOM.createRoot(...).render(...)
   */
  preload: loadDbCache,

  /** Retorna snapshot síncrono (para auth.ts) */
  getDbSnapshot,

  get: <T>(path: string) => request<T>(path),

  post: async <T>(path: string, body: unknown): Promise<T> => {
    const result = await request<T>(path, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    invalidateCache()
    return result
  },

  put: async <T>(path: string, body: unknown): Promise<T> => {
    const result = await request<T>(path, {
      method: 'PUT',
      body: JSON.stringify(body),
    })
    invalidateCache()
    return result
  },

  patch: async <T>(path: string, body: unknown): Promise<T> => {
    const result = await request<T>(path, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
    invalidateCache()
    return result
  },

  delete: async (path: string): Promise<void> => {
    await request(path, { method: 'DELETE' })
    invalidateCache()
  },
}
