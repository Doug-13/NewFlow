export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type ResponseType =
  | 'raw'
  | 'list'
  | 'item'
  | 'created'
  | 'updated'
  | 'deleted'

export type RouteConfig = {
  id: string
  method: HttpMethod
  path: string
  resource: string
  responseType: ResponseType
}