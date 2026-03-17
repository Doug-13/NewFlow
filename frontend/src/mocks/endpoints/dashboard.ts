import type { RouteConfig } from './types'

/**
 * Rotas do dashboard
 * Aqui ficam os endpoints de resumo geral da aplicação.
 */
export const dashboardRoutes: RouteConfig[] = [
  {
    id: 'getDashboard',
    method: 'GET',
    path: '/api/v1/dashboard',
    resource: 'dashboard',
    responseType: 'raw',
  },
]