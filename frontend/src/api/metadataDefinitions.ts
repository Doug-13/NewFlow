import { api } from './client'

export interface MetadataOptionDto {
  value: string
  label: string
}

export interface MetadataDefinitionDto {
  id: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  isActive: boolean
  orderIndex: number
  documentTypeId?: string
  options?: MetadataOptionDto[]
}

export interface MetadataValueDto {
  metadataDefinitionId: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  value: any
}

// tipo enxuto para usar na tela de EnvironmentSettings
export interface MetadataDefinitionListItem {
  id: string
  name: string
  label: string
}

export const getMetadataDefinitions = async (
  documentTypeId?: string,
): Promise<MetadataDefinitionListItem[]> => {
  const data = (
    await api.get('/metadata/definitions', {
      params: documentTypeId ? { documentTypeId } : {},
    })
  ).data as MetadataDefinitionDto[]

  return data.map(item => ({
    id: item.id,
    name: item.name,
    label: item.label,
  }))
}

export const createMetadataDefinition = async (
  data: Partial<MetadataDefinitionDto>,
): Promise<MetadataDefinitionDto> =>
  (await api.post('/metadata/definitions', data)).data as MetadataDefinitionDto

export const updateMetadataDefinition = async (
  id: string,
  data: Partial<MetadataDefinitionDto>,
): Promise<MetadataDefinitionDto> =>
  (await api.put(`/metadata/definitions/${id}`, data)).data as MetadataDefinitionDto

export const deleteMetadataDefinition = async (id: string) =>
  api.delete(`/metadata/definitions/${id}`)

export const getMetadataValues = async (
  documentInstanceId: string,
): Promise<MetadataValueDto[]> =>
  (await api.get(`/metadata/values/${documentInstanceId}`)).data as MetadataValueDto[]

export const saveMetadataValues = async (
  documentInstanceId: string,
  values: { metadataDefinitionId: string; value: any }[],
) => api.post(`/metadata/values/${documentInstanceId}`, { values })