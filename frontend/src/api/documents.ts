import { api } from './client'
import type {
  DocumentInstance,
  DocumentInstanceDetail,
  DashboardSummary,
} from '../types'

export type WorkflowRuntimeTransition = {
  id?: string
  targetStepId: string
  outcome?: string
  isDefault?: boolean
  conditionType?: 'always' | 'expression' | 'metadata-value'
  metadataFieldId?: string
  expectedValue?: string
  expression?: string
}

export type WorkflowRuntimeStep = {
  id: string
  name: string
  elementId?: string
  elementType?: string
  isInitial?: boolean
  orderIndex?: number
  transitions?: WorkflowRuntimeTransition[]
}

export type CreateDocumentPayload = {
  title: string
  description?: string
  workflowId: string
  workflowName?: string
  accountId: string
  processId?: string
  processName?: string
  createdById: string
  createdByName: string
  steps: WorkflowRuntimeStep[]
  initialMetadataValues?: Record<string, unknown>
}

// export const getDocuments = async (params?: {
//   status?: string
//   documentTypeId?: string
//   processId?: string
// }) => {
//   const res = await api.get('/document-instances', { params })
//   return res.data as DocumentInstance[]
// }

export const getDocument = async (id: string) => {
  const res = await api.get(`/document-instances/${id}`)
  return res.data as DocumentInstanceDetail
}

export const getDocuments = async (params?: {
  processId?: string
  accountId?: string
  status?: string
}): Promise<any[]> => {
  const response = await api.get('/document-instances', { params })
  return response.data ?? []
}


export const createDocument = async (data: CreateDocumentPayload) => {
  const res = await api.post('/document-instances', data)
  return res.data as DocumentInstanceDetail
}

export const uploadFile = async (id: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)

  const res = await api.post(`/document-instances/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })

  return res.data
}

export const downloadFile = (id: string, fileId: string) => {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5109/api/v1'
    }/document-instances/${id}/files/${fileId}/download`
}

export const cancelDocument = async (id: string) => {
  const res = await api.patch(`/document-instances/${id}/cancel`)
  return res.data
}

export const getDashboard = async () => {
  const res = await api.get('/dashboard/summary')
  return res.data as DashboardSummary
}