import { api } from './client'
import type { EnvironmentSettings } from '../types/environmentSettings'

type EnvironmentConfigurationApi = {
  id: string
  tenantId: string
  name: string
  description?: string | null
  isDefault: boolean
  isActive: boolean

  revisionPattern: 'numeric' | 'alphabetic' | 'alphanumeric'
  revisionInitialValue: string
  revisionAutoIncrementOnApproval: boolean
  revisionAllowManualEdition: boolean

  creationMode: 'manual' | 'batch' | 'both'
  requireTemplateInBatch: boolean

  codingRuleJson?: {
    parts: Array<{
      type: 'fixed' | 'metadata' | 'year' | 'unit' | 'area' | 'process' | 'sequential'
      fixedValue?: string
      metadataDefinitionId?: string
      metadataLabel?: string
      separatorAfter?: '' | '-' | '/' | '.'
    }>
  } | null

  sequentialStartAt: number
  sequentialDigits: number
  sequentialResetPeriod: 'never' | 'yearly' | 'monthly'

  totalProcessDays: number
}

const DEFAULT_VALUES: EnvironmentSettings = {
  revision: {
    pattern: 'numeric',
    initialValue: '00',
    autoIncrementOnApproval: true,
    allowManualEdition: false,
  },
  creationMode: {
    mode: 'both',
    requireTemplateInBatch: true,
  },
  codingRule: {
    parts: [
      { type: 'fixed', fixedValue: 'DOC', separatorAfter: '-' },
      { type: 'year', separatorAfter: '-' },
      { type: 'sequential', separatorAfter: '' },
    ],
  },
  sequential: {
    startAt: 1,
    digits: 4,
    resetPeriod: 'yearly',
  },
  deadlines: {
    totalProcessDays: 15,
  },
}

function toEnvironmentSettings(
  item?: EnvironmentConfigurationApi | null,
): EnvironmentSettings {
  if (!item) return DEFAULT_VALUES

  return {
    revision: {
      pattern: item.revisionPattern,
      initialValue: item.revisionInitialValue,
      autoIncrementOnApproval: item.revisionAutoIncrementOnApproval,
      allowManualEdition: item.revisionAllowManualEdition,
    },
    creationMode: {
      mode: item.creationMode,
      requireTemplateInBatch: item.requireTemplateInBatch,
    },
    codingRule: {
      parts:
        item.codingRuleJson?.parts?.length
          ? item.codingRuleJson.parts.map(part => ({
              type: part.type,
              fixedValue: part.fixedValue,
              metadataDefinitionId: part.metadataDefinitionId,
              metadataLabel: part.metadataLabel,
              separatorAfter: part.separatorAfter ?? '',
            }))
          : DEFAULT_VALUES.codingRule.parts,
    },
    sequential: {
      startAt: item.sequentialStartAt,
      digits: item.sequentialDigits,
      resetPeriod: item.sequentialResetPeriod,
    },
    deadlines: {
      totalProcessDays: item.totalProcessDays,
    },
  }
}

function toApiPayload(values: EnvironmentSettings) {
  return {
    name: 'Configuração padrão',
    description: 'Configuração padrão do ambiente',
    isDefault: true,
    isActive: true,

    revisionPattern: values.revision.pattern,
    revisionInitialValue: values.revision.initialValue,
    revisionAutoIncrementOnApproval: values.revision.autoIncrementOnApproval,
    revisionAllowManualEdition: values.revision.allowManualEdition,

    creationMode: values.creationMode.mode,
    requireTemplateInBatch: values.creationMode.requireTemplateInBatch,

    codingRuleJson: {
      parts: values.codingRule.parts.map(part => ({
        type: part.type,
        fixedValue: part.fixedValue,
        metadataDefinitionId: part.metadataDefinitionId,
        metadataLabel: part.metadataLabel,
        separatorAfter: part.separatorAfter ?? '',
      })),
    },

    sequentialStartAt: values.sequential.startAt,
    sequentialDigits: values.sequential.digits,
    sequentialResetPeriod: values.sequential.resetPeriod,

    totalProcessDays: values.deadlines.totalProcessDays,
  }
}

export async function getEnvironmentSettings(
  tenantId: string,
): Promise<EnvironmentSettings> {
  const { data } = await api.get<EnvironmentConfigurationApi[]>(
    `/tenants/${tenantId}/environment-configurations`,
  )

  const selected = data.find(item => item.isDefault) ?? data[0] ?? null

  return toEnvironmentSettings(selected)
}

export async function saveEnvironmentSettings(
  tenantId: string,
  values: EnvironmentSettings,
): Promise<EnvironmentSettings> {
  const { data: existing } = await api.get<EnvironmentConfigurationApi[]>(
    `/tenants/${tenantId}/environment-configurations`,
  )

  const selected = existing.find(item => item.isDefault) ?? existing[0] ?? null
  const payload = toApiPayload(values)

  if (selected) {
    const { data } = await api.put<EnvironmentConfigurationApi>(
      `/tenants/${tenantId}/environment-configurations/${selected.id}`,
      payload,
    )
    return toEnvironmentSettings(data)
  }

  const { data } = await api.post<EnvironmentConfigurationApi>(
    `/tenants/${tenantId}/environment-configurations`,
    payload,
  )

  return toEnvironmentSettings(data)
}