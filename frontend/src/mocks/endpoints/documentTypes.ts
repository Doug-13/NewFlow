import type { RouteConfig } from './types'

/**
 * Rotas de tipos documentais
 * Cadastro e consulta dos tipos de documento.
 */
export const documentTypeRoutes: RouteConfig[] = [
  {
    id: 'listDocumentTypes',
    method: 'GET',
    path: '/api/v1/document-types',
    resource: 'documentTypes',
    responseType: 'list',
  },
  {
    id: 'getDocumentTypeById',
    method: 'GET',
    path: '/api/v1/document-types/:id',
    resource: 'documentTypes',
    responseType: 'item',
  },
]
