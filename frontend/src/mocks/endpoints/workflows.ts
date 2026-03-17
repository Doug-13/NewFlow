import type { RouteConfig } from './types'

/**
 * Rotas de workflow
 * Lista de fluxos configurados.
 */
export const workflowRoutes: RouteConfig[] = [
  {
    id: 'listWorkflows',
    method: 'GET',
    path: '/api/v1/workflows',
    resource: 'workflows',
    responseType: 'list',
  },
]