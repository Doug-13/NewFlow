import { mockApi } from './mockApi'

export type UserItem = {
  id: string
  name: string
  email: string
  role: string
  cpf?: string
  phone?: string
  photoUrl?: string
  department?: string
  jobTitle?: string
  position?: string
  isActive: boolean
  notes?: string
  createdAt?: string // ← adicione esta linha

}

export type UpdateUserPayload = {
  id: string
  name: string
  email: string
  password?: string
  role: string
  cpf?: string
  phone?: string
  photoUrl?: string
  department?: string
  jobTitle?: string
  position?: string
  isActive: boolean
  notes?: string
  createdAt?: string // ← adicione esta linha

}

export type CreateUserPayload = Omit<UpdateUserPayload, 'id'>

type UsersListResponse =
  | UserItem[]
  | {
    items: UserItem[]
    totalCount?: number
    page?: number
    pageSize?: number
  }

function normalizeUsersResponse(data: UsersListResponse): UserItem[] {
  if (Array.isArray(data)) {
    return data
  }

  if (data && Array.isArray(data.items)) {
    return data.items
  }

  return []
}

export async function getUsers(): Promise<UserItem[]> {
  const data = await mockApi.get<UsersListResponse>('/users')
  return normalizeUsersResponse(data)
}

export async function createUser(payload: CreateUserPayload): Promise<UserItem> {
  const data = await mockApi.post<UserItem>('/users', payload)
  return data
}

export async function updateUser(payload: UpdateUserPayload): Promise<UserItem> {
  const { id, ...body } = payload
  const data = await mockApi.put<UserItem>(`/users/${id}`, body)
  return data
}