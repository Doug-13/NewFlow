import type { RouteConfig } from './types'

/**
 * Rotas de metadados
 * Inclui:
 * - conjuntos de metadados
 * - definições de metadados
 * - conjuntos de opções
 * - opções
 */
export const metadataRoutes: RouteConfig[] = [
  /**
   * Conjuntos de metadados
   */
  {
    id: 'listMetadataSets',
    method: 'GET',
    path: '/api/v1/metadata/sets',
    resource: 'metadataSets',
    responseType: 'list',
  },

  /**
   * Definições de metadados
   */
  {
    id: 'listMetadataDefinitions',
    method: 'GET',
    path: '/api/v1/metadata/definitions',
    resource: 'metadataDefinitions',
    responseType: 'list',
  },
  {
    id: 'getMetadataDefinitionById',
    method: 'GET',
    path: '/api/v1/metadata/definitions/:id',
    resource: 'metadataDefinitions',
    responseType: 'item',
  },

  /**
   * Conjuntos de opções para listas
   */
  {
    id: 'listMetadataOptionSets',
    method: 'GET',
    path: '/api/v1/metadata/option-sets',
    resource: 'metadataOptionSets',
    responseType: 'list',
  },

  /**
   * Opções das listas
   */
  {
    id: 'listMetadataOptions',
    method: 'GET',
    path: '/api/v1/metadata/options',
    resource: 'metadataOptions',
    responseType: 'list',
  },
]