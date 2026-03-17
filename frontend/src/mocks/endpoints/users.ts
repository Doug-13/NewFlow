import type { RouteConfig } from './types'

/**
 * Rotas de usuários
 * CRUD básico de usuários.
 */
export const userRoutes: RouteConfig[] = [
  {
    id: 'listUsers',
    method: 'GET',
    path: '/api/v1/users',
    resource: 'users',
    responseType: 'list',
  },
  {
    id: 'getUserById',
    method: 'GET',
    path: '/api/v1/users/:id',
    resource: 'users',
    responseType: 'item',
  },
  {
    id: 'createUser',
    method: 'POST',
    path: '/api/v1/users',
    resource: 'users',
    responseType: 'created',
  },
  {
    id: 'updateUser',
    method: 'PUT',
    path: '/api/v1/users/:id',
    resource: 'users',
    responseType: 'updated',
  },
  {
    id: 'deleteUser',
    method: 'DELETE',
    path: '/api/v1/users/:id',
    resource: 'users',
    responseType: 'deleted',
  },
]