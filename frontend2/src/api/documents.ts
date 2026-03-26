import { api } from './client'
import type { DocumentInstance, DocumentInstanceDetail, DashboardSummary } from '../types'

export const getDocuments = async (params?: { status?: string; documentTypeId?: string }) => {
  const res = await api.get('/document-instances', { params })
  return res.data as DocumentInstance[]
}

export const getDocument = async (id: string) => {
  const res = await api.get(`/document-instances/${id}`)
  return res.data as DocumentInstanceDetail
}

export const createDocument = async (data: any) => {
  const res = await api.post('/document-instances', data)
  return res.data
}

export const uploadFile = async (id: string, file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  const res = await api.post(`/document-instances/${id}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data
}

export const downloadFile = (id: string, fileId: string) => {
  return `${import.meta.env.VITE_API_URL || 'http://localhost:5109/api/v1'}/document-instances/${id}/files/${fileId}/download`
}

export const cancelDocument = async (id: string) => {
  await api.patch(`/document-instances/${id}/cancel`)
}

export const getDashboard = async () => {
  const res = await api.get('/dashboard/summary')
  return res.data as DashboardSummary
}
