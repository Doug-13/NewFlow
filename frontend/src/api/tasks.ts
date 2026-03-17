import { api } from './client'
import type { ApprovalTask } from '../types'

export const getTasks = async (status?: string) => {
  const res = await api.get('/tasks', { params: status ? { status } : {} })
  return res.data as ApprovalTask[]
}

export const executeTask = async (id: string, action: string, comment?: string) => {
  const res = await api.post(`/tasks/${id}/execute`, { action, comment })
  return res.data
}
