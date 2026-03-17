import { api } from './client'
import type { Workflow } from '../types'

export type WorkflowTransitionPayload = {
  toStepOrderIndex: number
  triggerAction: string
}

export type WorkflowResponsiblePayload = {
  name: string
}

export type WorkflowMetadataPayload = {
  name: string
  label: string
  type: string
  required: boolean
  multiple: boolean
  options: string[]
}

export type WorkflowStepPayload = {
  name: string
  description?: string
  orderIndex: number
  isInitial: boolean
  isFinal: boolean
  slaHours?: number
  allowedActions: string[]
  receivesNotification: boolean
  requiredNotification: boolean
  responsibles: WorkflowResponsiblePayload[]
  metadata: WorkflowMetadataPayload[]
  transitions: WorkflowTransitionPayload[]
}

export type WorkflowPayload = {
  name: string
  description?: string
  steps: WorkflowStepPayload[]
}

export async function getWorkflows(): Promise<Workflow[]> {
  const { data } = await api.get('/workflows')
  return data
}

export async function getWorkflow(id: string): Promise<Workflow> {
  const { data } = await api.get(`/workflows/${id}`)
  return data
}

export async function createWorkflow(payload: WorkflowPayload): Promise<Workflow> {
  const { data } = await api.post('/workflows', payload)
  return data
}

export async function updateWorkflow(id: string, payload: WorkflowPayload): Promise<Workflow> {
  const { data } = await api.put(`/workflows/${id}`, payload)
  return data
}

export async function deactivateWorkflow(id: string): Promise<void> {
  await api.delete(`/workflows/${id}`)
}