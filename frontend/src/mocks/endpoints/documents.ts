import type { RouteConfig } from './types'

/**
 * Rotas de documentos
 * CRUD e consulta de documentos.
 */
export const documentRoutes: RouteConfig[] = [
  {
    id: 'listDocuments',
    method: 'GET',
    path: '/api/v1/documents',
    resource: 'documents',
    responseType: 'list',
  },
  {
    id: 'getDocumentById',
    method: 'GET',
    path: '/api/v1/documents/:id',
    resource: 'documents',
    responseType: 'item',
  },
  {
    id: 'createDocument',
    method: 'POST',
    path: '/api/v1/documents',
    resource: 'documents',
    responseType: 'created',
  },
  {
    id: 'updateDocument',
    method: 'PUT',
    path: '/api/v1/documents/:id',
    resource: 'documents',
    responseType: 'updated',
  },
]