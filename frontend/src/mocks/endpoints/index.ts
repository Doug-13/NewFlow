import type { RouteConfig } from './types'
import { dashboardRoutes } from './dashboard'
import { userRoutes } from './users'
import { metadataRoutes } from './metadata'
import { documentTypeRoutes } from './documentTypes'
import { workflowRoutes } from './workflows'
import { documentRoutes } from './documents'

/**
 * Aqui consolidamos todas as rotas mockadas do sistema.
 * O mockApi vai consumir este array final.
 */
export const routes: RouteConfig[] = [
  ...dashboardRoutes,
  ...userRoutes,
  ...metadataRoutes,
  ...documentTypeRoutes,
  ...workflowRoutes,
  ...documentRoutes,
]