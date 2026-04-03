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
  isReadOnly?: boolean
  value: unknown
  options?: MetadataOptionDto[]
  tableColumns?: MetadataTableColumnDto[]
}

export interface SaveMetadataValueDto {
  metadataDefinitionId: string
  value: unknown
}

export const getMetadataDefinitions = async (params?: {
  metadataSetId?: string
}) => {
  const res = await api.get('/metadata/definitions', {
    params: {
      ...(params?.metadataSetId
        ? { metadataSetId: params.metadataSetId }
        : {}),
    },
  })

  return res.data as MetadataDefinitionDto[]
}

export const createMetadataDefinition = async (
  data: Partial<MetadataDefinitionDto>,
) => {
  const res = await api.post('/metadata/definitions', data)
  return res.data as MetadataDefinitionDto
}

export const updateMetadataDefinition = async (
  id: string,
  data: Partial<MetadataDefinitionDto>,
) => {
  const res = await api.put(`/metadata/definitions/${id}`, data)
  return res.data as MetadataDefinitionDto
}

export const deleteMetadataDefinition = async (id: string) => {
  return api.delete(`/metadata/definitions/${id}`)
}

export const getMetadataValues = async (documentInstanceId: string) => {
  const res = await api.get(`/metadata/values/${documentInstanceId}`)
  return res.data as MetadataValueDto[]
}

export const saveMetadataValues = async (
  documentInstanceId: string,
  values: SaveMetadataValueDto[],
) => {
  const res = await api.post(`/metadata/values/${documentInstanceId}`, {
    values,
  })

  return res.data
}