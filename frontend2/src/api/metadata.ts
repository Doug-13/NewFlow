import { api } from './client'

export interface MetadataOptionDto {
  value: string
  label: string
  sigla?: string
}

export interface MetadataTableColumnDto {
  id: string
  metadataDefinitionId: string
  internalName: string
  externalName: string
  fieldType: string
  orderIndex: number
}

export interface MetadataDefinitionDto {
  id: string
  name: string
  label: string
  fieldType: string
  maskType?: string | null
  isRequired: boolean
  isActive: boolean
  orderIndex: number
  metadataSetId: string
  metadataSetName: string
  options?: MetadataOptionDto[]
  tableColumns?: MetadataTableColumnDto[]
}

export interface MetadataValueDto {
  metadataDefinitionId: string
  name: string
  label: string
  fieldType: string
  maskType?: string | null
  isRequired: boolean
  value: any
  options?: MetadataOptionDto[]
  tableColumns?: MetadataTableColumnDto[]
}

export const getMetadataDefinitions = async (params?: { metadataSetId?: string }) =>
  (
    await api.get('/metadata/definitions', {
      params: {
        ...(params?.metadataSetId ? { metadataSetId: params.metadataSetId } : {}),
      },
    })
  ).data as MetadataDefinitionDto[]

export const createMetadataDefinition = async (data: Partial<MetadataDefinitionDto>) =>
  (await api.post('/metadata/definitions', data)).data as MetadataDefinitionDto

export const updateMetadataDefinition = async (id: string, data: Partial<MetadataDefinitionDto>) =>
  (await api.put(`/metadata/definitions/${id}`, data)).data as MetadataDefinitionDto

export const deleteMetadataDefinition = async (id: string) =>
  api.delete(`/metadata/definitions/${id}`)

export const getMetadataValues = async (documentInstanceId: string) =>
  (await api.get(`/metadata/values/${documentInstanceId}`)).data as MetadataValueDto[]

export const saveMetadataValues = async (
  documentInstanceId: string,
  values: { metadataDefinitionId: string; value: any }[],
) => api.post(`/metadata/values/${documentInstanceId}`, { values })
