import { api } from './client'
import type { ApprovalTask } from '../types'

export type ExecuteTaskPayload = {
  action: string
  comment?: string
}

export const getTasks = async (status?: string) => {
  const res = await api.get('/tasks', {
    params: status ? { status } : {},
  })

  return res.data as ApprovalTask[]
}

export const executeTask = async (
  id: string,
  action: string,
  comment?: string,
) => {
  const payload: ExecuteTaskPayload = {
    action,
    ...(comment ? { comment } : {}),
  }

  const res = await api.post(`/tasks/${id}/execute`, payload)
  return res.data
}