import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios'
import {
  getMockDb,
  saveMockDb,
  initializeMockDb,
  resetMockDb,
} from './mockDb'
import { getElementConfigsByWorkflow } from '../../src/features/workflows/storage'

function clone<T>(value: T): T {
  return structuredClone(value)
}

function parseBody(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'object') return data as Record<string, unknown>

  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as Record<string, unknown>
    } catch {
      return {}
    }
  }

  return {}
}

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeResponse(data: unknown, status = 200): AxiosResponse {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  }
}

type DashboardScope = 'account' | 'process'
type MockDb = ReturnType<typeof getMockDb>

type RuntimeMetadataField = {
  metadataDefinitionId: string
  name: string
  label: string
  fieldType: string
  maskType?: string | null
  isRequired: boolean
  isReadOnly?: boolean
  metadataSetId?: string
  metadataSetName?: string
  options?: Array<{ value: string; label: string; sigla?: string }>
  tableColumns?: Array<{
    id: string
    metadataDefinitionId: string
    internalName: string
    externalName: string
    fieldType: string
    orderIndex: number
  }>
}

type RuntimeMetadataDefinition = {
  id: string
  name?: string
  label?: string
  fieldType?: string
  maskType?: string | null
  isRequired?: boolean
  metadataSetId?: string
  metadataSetName?: string
  options?: Array<{ value: string; label: string; sigla?: string }>
  tableColumns?: Array<{
    id: string
    metadataDefinitionId: string
    internalName: string
    externalName: string
    fieldType: string
    orderIndex: number
  }>
}

type RuntimeTaskAction = {
  id: string
  label: string
  color: string
  outcome: string
  requiresComment: boolean
}

type RuntimeStep = Record<string, unknown> & {
  id?: string
  name?: string
  orderIndex?: number
  isInitial?: boolean
  isFinal?: boolean
  kind?: string
  metadataFields?: RuntimeMetadataField[]
  allowedActions?: string[]
  actions?: RuntimeTaskAction[]
  responsibles?: Array<{ type: string; id?: string }>
  deadlineMode?: string
  deadlineValue?: number | string
  transitions?: Array<Record<string, unknown>>
}

function resolveDashboardScope(
  params: Record<string, unknown>,
): DashboardScope {
  if (params.processId) return 'process'
  return 'account'
}

function findBestDashboard(
  dashboards: ReturnType<typeof getMockDb>['dashboards'],
  params: Record<string, unknown>,
) {
  const accountId = String(params.accountId ?? params.tenantId ?? '')
  const processId = String(params.processId ?? '')
  const scopeLevel =
    (params.scopeLevel as DashboardScope | undefined) ??
    resolveDashboardScope(params)

  const candidates = dashboards.filter((item) => {
    if (accountId && String(item.accountId ?? '') !== accountId) return false

    if (scopeLevel === 'process') {
      return (
        item.scopeLevel === 'process' &&
        String(item.processId ?? '') === processId
      )
    }

    return item.scopeLevel === 'account'
  })

  return candidates[0] ?? dashboards[0] ?? null
}

function normalizeOutcome(value: unknown): string {
  const outcome = String(value ?? '').trim()

  if (!outcome) return ''
  if (outcome === 'return') return 'request-changes'

  return outcome
}

function normalizeMetadataDefinition(
  value: unknown,
): RuntimeMetadataDefinition | null {
  if (!value || typeof value !== 'object') return null

  const record = value as Record<string, unknown>

  return {
    id: String(record.id ?? ''),
    name: typeof record.name === 'string' ? record.name : undefined,
    label: typeof record.label === 'string' ? record.label : undefined,
    fieldType:
      typeof record.fieldType === 'string' ? record.fieldType : undefined,
    maskType:
      record.maskType === null
        ? null
        : typeof record.maskType === 'string'
          ? record.maskType
          : undefined,
    isRequired:
      typeof record.isRequired === 'boolean'
        ? record.isRequired
        : undefined,
    metadataSetId:
      typeof record.metadataSetId === 'string'
        ? record.metadataSetId
        : undefined,
    metadataSetName:
      typeof record.metadataSetName === 'string'
        ? record.metadataSetName
        : undefined,
    options: Array.isArray(record.options)
      ? (record.options as Array<{ value: string; label: string; sigla?: string }>)
      : [],
    tableColumns: Array.isArray(record.tableColumns)
      ? (record.tableColumns as Array<{
        id: string
        metadataDefinitionId: string
        internalName: string
        externalName: string
        fieldType: string
        orderIndex: number
      }>)
      : [],
  }
}

function normalizeActionList(
  allowedActions?: unknown[],
  actions?: unknown[],
): { allowedActions: string[]; taskActions: RuntimeTaskAction[] } {
  const configuredActions: RuntimeTaskAction[] = Array.isArray(actions)
    ? actions.map((item) => {
      const current = item as Record<string, unknown>

      return {
        id: String(current.id ?? generateId('action')),
        label: String(current.label ?? 'Ação'),
        color: String(current.color ?? 'default'),
        outcome: normalizeOutcome(current.outcome),
        requiresComment: Boolean(current.requiresComment),
      }
    })
    : []

  if (configuredActions.length > 0) {
    return {
      allowedActions: configuredActions.map((item) => item.outcome),
      taskActions: configuredActions,
    }
  }

  const normalizedAllowedActions = Array.isArray(allowedActions)
    ? allowedActions.map((item) => normalizeOutcome(item)).filter(Boolean)
    : []

  return {
    allowedActions: normalizedAllowedActions,
    taskActions: normalizedAllowedActions.map((action) => ({
      id: action,
      label:
        action === 'approve'
          ? 'Aprovar'
          : action === 'reject'
            ? 'Reprovar'
            : action === 'request-changes'
              ? 'Solicitar ajustes'
              : action === 'forward'
                ? 'Encaminhar'
                : action === 'publish'
                  ? 'Publicar'
                  : action,
      color:
        action === 'approve' || action === 'publish'
          ? 'green'
          : action === 'reject'
            ? 'red'
            : action === 'request-changes'
              ? 'orange'
              : action === 'forward'
                ? 'blue'
                : 'default',
      outcome: action,
      requiresComment:
        action === 'reject' || action === 'request-changes',
    })),
  }
}

function mergeMetadataFields(
  baseFields: RuntimeMetadataField[],
  extraFields: RuntimeMetadataField[],
): RuntimeMetadataField[] {
  const map = new Map<string, RuntimeMetadataField>()

    ;[...baseFields, ...extraFields].forEach((field) => {
      if (!field.metadataDefinitionId) return

      const previous = map.get(field.metadataDefinitionId)

      map.set(field.metadataDefinitionId, {
        metadataDefinitionId: field.metadataDefinitionId,
        name: field.name ?? previous?.name ?? field.metadataDefinitionId,
        label: field.label ?? previous?.label ?? field.metadataDefinitionId,
        fieldType: field.fieldType ?? previous?.fieldType ?? 'text',
        maskType: field.maskType ?? previous?.maskType ?? null,
        isRequired: Boolean(field.isRequired || previous?.isRequired),
        isReadOnly: Boolean(field.isReadOnly || previous?.isReadOnly),
        metadataSetId: field.metadataSetId ?? previous?.metadataSetId,
        metadataSetName: field.metadataSetName ?? previous?.metadataSetName,
        options: field.options ?? previous?.options,
        tableColumns: field.tableColumns ?? previous?.tableColumns,
      })
    })

  return Array.from(map.values())
}

function buildMetadataFieldsFromIds(
  db: MockDb,
  metadataDefinitionIds: string[],
): RuntimeMetadataField[] {
  return metadataDefinitionIds
    .map((metadataDefinitionId) => {
      const found = db.metadataDefinitions.find(
        (item) => item.id === metadataDefinitionId,
      )

      return normalizeMetadataDefinition(found)
    })
    .filter(
      (definition): definition is RuntimeMetadataDefinition =>
        definition !== null && Boolean(definition.id),
    )
    .map((definition) => ({
      metadataDefinitionId: definition.id,
      name: String(definition.name ?? definition.label ?? definition.id),
      label: String(definition.label ?? definition.name ?? definition.id),
      fieldType: String(definition.fieldType ?? 'text'),
      maskType:
        definition.maskType === undefined ? null : definition.maskType,
      isRequired: Boolean(definition.isRequired),
      isReadOnly: false,
      metadataSetId: String(definition.metadataSetId ?? ''),
      metadataSetName: String(definition.metadataSetName ?? ''),
      options: Array.isArray(definition.options) ? definition.options : [],
      tableColumns: Array.isArray(definition.tableColumns)
        ? definition.tableColumns
        : [],
    }))
}

function buildMetadataFieldsFromConfig(
  db: MockDb,
  config: Record<string, unknown> | undefined,
  kind: string,
): RuntimeMetadataField[] {
  if (!config) return []

  const explicitFields: RuntimeMetadataField[] = Array.isArray(config.metadataFields)
    ? (config.metadataFields as Array<Record<string, unknown>>).map((field) => {
      const metadataDefinitionId = String(field.metadataDefinitionId ?? '')
      const definition = normalizeMetadataDefinition(
        db.metadataDefinitions.find((item) => item.id === metadataDefinitionId),
      )

      return {
        metadataDefinitionId,
        name: String(
          field.name ??
          definition?.name ??
          field.label ??
          definition?.label ??
          metadataDefinitionId,
        ),
        label: String(
          field.label ??
          definition?.label ??
          field.name ??
          definition?.name ??
          metadataDefinitionId,
        ),
        fieldType: String(field.fieldType ?? definition?.fieldType ?? 'text'),
        maskType:
          field.maskType !== undefined
            ? String(field.maskType)
            : definition?.maskType ?? null,
        isRequired: Boolean(field.isRequired),
        isReadOnly: Boolean(field.isReadOnly),
        metadataSetId: String(
          field.metadataSetId ?? definition?.metadataSetId ?? '',
        ),
        metadataSetName: String(
          field.metadataSetName ?? definition?.metadataSetName ?? '',
        ),
        options: Array.isArray(definition?.options) ? definition.options : [],
        tableColumns: Array.isArray(definition?.tableColumns)
          ? definition.tableColumns
          : [],
      }
    })
    : []

  let metadataDefinitionIds: string[] = []

  if (kind === 'start') {
    metadataDefinitionIds = Array.isArray(config.initialMetadataDefinitionIds)
      ? (config.initialMetadataDefinitionIds as string[])
      : []
  } else if (kind === 'end') {
    metadataDefinitionIds = Array.isArray(config.finalMetadataDefinitionIds)
      ? (config.finalMetadataDefinitionIds as string[])
      : []
  } else {
    metadataDefinitionIds = Array.isArray(config.metadataDefinitionIds)
      ? (config.metadataDefinitionIds as string[])
      : []
  }

  const fromIds = buildMetadataFieldsFromIds(db, metadataDefinitionIds)

  return mergeMetadataFields(fromIds, explicitFields)
}

function buildResponsiblesFromActivityConfig(
  config: Record<string, unknown> | undefined,
): Array<{ type: string; id?: string }> {
  if (!config) return []

  const responsibles: Array<{ type: string; id?: string }> = []

  const userIds = Array.isArray(config.responsibleUserIds)
    ? (config.responsibleUserIds as string[])
    : []
  const roleIds = Array.isArray(config.responsibleRoleIds)
    ? (config.responsibleRoleIds as string[])
    : []
  const groupIds = Array.isArray(config.responsibleGroupIds)
    ? (config.responsibleGroupIds as string[])
    : []

  userIds.forEach((id) => responsibles.push({ type: 'user', id }))
  roleIds.forEach((id) => responsibles.push({ type: 'role', id }))
  groupIds.forEach((id) => responsibles.push({ type: 'group', id }))

  return responsibles
}

function buildActionsFromActivityConfig(
  config: Record<string, unknown> | undefined,
): { allowedActions: string[]; taskActions: RuntimeTaskAction[] } {
  if (!config) {
    return { allowedActions: [], taskActions: [] }
  }

  if (Array.isArray(config.actions) && config.actions.length > 0) {
    return normalizeActionList([], config.actions as unknown[])
  }

  const fallbackActions: string[] = []

  if (Boolean(config.allowApprove ?? true)) {
    fallbackActions.push('approve')
  }

  if (Boolean(config.allowReject ?? true)) {
    fallbackActions.push('reject')
  }

  if (Boolean(config.allowRequestChanges ?? true)) {
    fallbackActions.push('request-changes')
  }

  if (Boolean(config.allowForward ?? false)) {
    fallbackActions.push('forward')
  }

  return normalizeActionList(fallbackActions, [])
}

function buildTransitions(
  rawTransitions: unknown[],
  allSteps: RuntimeStep[],
): Array<Record<string, unknown>> {
  if (!Array.isArray(rawTransitions)) return []

  return rawTransitions
    .map((transition) => {
      const current = transition as Record<string, unknown>

      const normalizedTriggerAction = normalizeOutcome(
        current.triggerAction ?? current.outcome,
      )

      let toStepOrderIndex =
        typeof current.toStepOrderIndex === 'number'
          ? current.toStepOrderIndex
          : null

      if (
        toStepOrderIndex === null &&
        typeof current.targetStepId === 'string' &&
        current.targetStepId
      ) {
        const target = allSteps.find(
          (step) =>
            String(step.id ?? '') === String(current.targetStepId) ||
            String(step.elementId ?? '') === String(current.targetStepId),
        )

        if (typeof target?.orderIndex === 'number') {
          toStepOrderIndex = target.orderIndex
        }
      }

      return {
        ...current,
        triggerAction: normalizedTriggerAction,
        toStepOrderIndex,
      }
    })
    .filter((item) => typeof item.toStepOrderIndex === 'number')
}

function mergeStepWithWorkflowConfig(
  db: MockDb,
  workflowId: string,
  rawStep: RuntimeStep,
  allSteps: RuntimeStep[],
): RuntimeStep {
  const configs = getElementConfigsByWorkflow(workflowId)
  const elementId = String(rawStep.id ?? rawStep.elementId ?? '')
  const configEntry =
    configs.find((item) => item.elementId === elementId) ?? null

  if (!configEntry) {
    const normalizedActions = normalizeActionList(
      Array.isArray(rawStep.allowedActions) ? rawStep.allowedActions : [],
      Array.isArray(rawStep.actions) ? rawStep.actions : [],
    )

    return {
      ...rawStep,
      kind: String(rawStep.kind ?? ''),
      metadataFields: Array.isArray(rawStep.metadataFields)
        ? (rawStep.metadataFields as RuntimeMetadataField[])
        : [],
      allowedActions: normalizedActions.allowedActions,
      actions: normalizedActions.taskActions,
      transitions: buildTransitions(
        Array.isArray(rawStep.transitions) ? rawStep.transitions : [],
        allSteps,
      ),
      responsibles: Array.isArray(rawStep.responsibles)
        ? rawStep.responsibles
        : [],
    }
  }

  const config = configEntry.config as Record<string, unknown>
  const kind = String(configEntry.kind ?? rawStep.kind ?? '')

  if (kind === 'start') {
    return {
      ...rawStep,
      kind,
      metadataFields: buildMetadataFieldsFromConfig(db, config, 'start'),
      transitions: buildTransitions(
        Array.isArray(rawStep.transitions) ? rawStep.transitions : [],
        allSteps,
      ),
    }
  }

  if (kind === 'activity') {
    const actions = buildActionsFromActivityConfig(config)

    return {
      ...rawStep,
      kind,
      metadataFields: buildMetadataFieldsFromConfig(db, config, 'activity'),
      allowedActions: actions.allowedActions,
      actions: actions.taskActions,
      responsibles: buildResponsiblesFromActivityConfig(config),
      deadlineMode:
        typeof config.deadlineMode === 'string'
          ? config.deadlineMode
          : rawStep.deadlineMode,
      deadlineValue:
        typeof config.deadlineValue === 'number' ||
          typeof config.deadlineValue === 'string'
          ? config.deadlineValue
          : rawStep.deadlineValue,
      transitions: buildTransitions(
        Array.isArray(rawStep.transitions) ? rawStep.transitions : [],
        allSteps,
      ),
    }
  }

  if (kind === 'end') {
    return {
      ...rawStep,
      kind,
      metadataFields: buildMetadataFieldsFromConfig(db, config, 'end'),
      transitions: buildTransitions(
        Array.isArray(rawStep.transitions) ? rawStep.transitions : [],
        allSteps,
      ),
      isFinal: true,
    }
  }

  return {
    ...rawStep,
    kind,
    transitions: buildTransitions(
      Array.isArray(rawStep.transitions) ? rawStep.transitions : [],
      allSteps,
    ),
  }
}

function getEffectiveWorkflowSteps(
  db: MockDb,
  workflowId: string,
  rawSteps: RuntimeStep[],
): RuntimeStep[] {
  const baseSteps = clone(rawSteps)

  return baseSteps.map((step) =>
    mergeStepWithWorkflowConfig(db, workflowId, step, baseSteps),
  )
}

function getWorkflowStepsForDocument(
  db: MockDb,
  document: Record<string, unknown>,
): RuntimeStep[] {
  const workflow = db.workflows.find((item) => item.id === document.workflowId) as
    | Record<string, unknown>
    | undefined

  const storedSteps = Array.isArray(document._steps)
    ? (document._steps as RuntimeStep[])
    : []

  const workflowSteps = Array.isArray(workflow?.steps)
    ? (workflow?.steps as RuntimeStep[])
    : []

  const rawSteps = workflowSteps.length > 0 ? workflowSteps : storedSteps

  if (!rawSteps.length) return []

  return getEffectiveWorkflowSteps(
    db,
    String(document.workflowId ?? ''),
    rawSteps,
  )
}

function getStepByOrderIndex(
  steps: RuntimeStep[],
  orderIndex: number | null | undefined,
): RuntimeStep | null {
  if (typeof orderIndex !== 'number' || Number.isNaN(orderIndex)) {
    return null
  }

  return steps.find((step) => step.orderIndex === orderIndex) ?? null
}

function getNextSequentialStep(
  steps: RuntimeStep[],
  currentStep: RuntimeStep | null,
): RuntimeStep | null {
  if (!currentStep || typeof currentStep.orderIndex !== 'number') {
    return null
  }

  return (
    steps.find((step) => step.orderIndex === currentStep.orderIndex! + 1) ?? null
  )
}

function getInitialCreationMetadataFields(
  db: MockDb,
  workflowId: string,
  steps: RuntimeStep[],
): RuntimeMetadataField[] {
  const initialStep = steps.find((item) => item.isInitial) ?? steps[0] ?? null
  if (!initialStep) return []

  if (initialStep.kind === 'start') {
    return Array.isArray(initialStep.metadataFields)
      ? initialStep.metadataFields
      : []
  }

  const configs = getElementConfigsByWorkflow(workflowId)
  const initialConfig =
    configs.find(
      (item) =>
        item.elementId === String(initialStep.id ?? initialStep.elementId ?? '') &&
        item.kind === 'start',
    ) ?? null

  if (!initialConfig) return []

  return buildMetadataFieldsFromConfig(
    db,
    initialConfig.config as Record<string, unknown>,
    'start',
  )
}

function calculateDueDate(
  deadlineMode?: string,
  deadlineValue?: number | string,
): string | null {
  if (
    !deadlineMode ||
    deadlineValue === undefined ||
    deadlineValue === null ||
    deadlineValue === ''
  ) {
    return null
  }

  const value = Number(deadlineValue)
  if (Number.isNaN(value) || value <= 0) return null

  const date = new Date()

  if (deadlineMode === 'hours') {
    date.setHours(date.getHours() + value)
    return date.toISOString()
  }

  if (deadlineMode === 'days') {
    date.setDate(date.getDate() + value)
    return date.toISOString()
  }

  return null
}

function generateDocumentCode(db: MockDb, accountId: string): string {
  const config = db.environmentConfigurations.find(
    (item) =>
      (item.accountId === accountId || item.tenantId === accountId) &&
      item.isDefault !== false,
  )

  const now = new Date()
  const year = String(now.getFullYear())
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const digits = config?.sequentialDigits ?? 4
  const resetPeriod = config?.sequentialResetPeriod ?? 'yearly'

  const periodKey =
    resetPeriod === 'never'
      ? 'all'
      : resetPeriod === 'monthly'
        ? `${year}-${month}`
        : year

  let currentValue = config?.sequentialCurrentValue ?? 0

  if (config && config.sequentialLastPeriod !== periodKey) {
    currentValue = 0
  }

  const sequential = currentValue + 1

  if (config) {
    const index = db.environmentConfigurations.findIndex(
      (item) => item.id === config.id,
    )

    if (index >= 0) {
      db.environmentConfigurations[index] = {
        ...config,
        sequentialCurrentValue: sequential,
        sequentialLastPeriod: periodKey,
        updatedAt: new Date().toISOString(),
      }
    }
  } else {
    db.environmentConfigurations.push({
      id: generateId('env'),
      accountId,
      tenantId: accountId,
      name: 'Configuração padrão',
      isDefault: true,
      isActive: true,
      codingRuleJson: null,
      sequentialDigits: digits,
      sequentialResetPeriod: 'yearly',
      sequentialCurrentValue: sequential,
      sequentialLastPeriod: periodKey,
      totalProcessDays: 15,
      createdAt: new Date().toISOString(),
    } as never)
  }

  const parts: Array<{
    type: string
    fixedValue?: string
    separatorAfter?: string
  }> =
    config?.codingRuleJson?.parts?.length
      ? config.codingRuleJson.parts
      : [
        { type: 'fixed', fixedValue: 'DOC', separatorAfter: '-' },
        { type: 'year', separatorAfter: '-' },
        { type: 'sequential', separatorAfter: '' },
      ]

  return parts
    .map((part) => {
      let value = ''

      switch (part.type) {
        case 'fixed':
          value = part.fixedValue ?? ''
          break
        case 'year':
          value = year
          break
        case 'sequential':
          value = String(sequential).padStart(digits, '0')
          break
        default:
          value = ''
          break
      }

      return value + (part.separatorAfter ?? '')
    })
    .join('')
}

function addAuditLog(
  db: MockDb,
  documentInstanceId: string,
  action: string,
  options?: {
    stepName?: string | null
    userName?: string | null
    comment?: string | null
  },
) {
  db.auditLogs.push({
    id: generateId('log'),
    documentInstanceId,
    action,
    stepName: options?.stepName ?? null,
    userName: options?.userName ?? null,
    comment: options?.comment ?? null,
    createdAt: new Date().toISOString(),
  } as never)
}

function resolveStepResponsible(
  db: MockDb,
  workflow: Record<string, unknown>,
  step: RuntimeStep,
  creatorId?: string,
): { id: string; name: string } | null {
  const responsibles = Array.isArray(step.responsibles)
    ? step.responsibles
    : []

  if (responsibles.length === 0) {
    const creator = db.users.find((item) => item.id === creatorId)

    return creator ? { id: creator.id, name: creator.name } : null
  }

  const first = responsibles[0]
  const processId = String(workflow.processId ?? '')

  if (first.type === 'dynamic') {
    const creator = db.users.find((item) => item.id === creatorId)
    return creator ? { id: creator.id, name: creator.name } : null
  }

  if (first.type === 'user' && first.id) {
    const user = db.users.find((item) => item.id === String(first.id))
    return user ? { id: user.id, name: user.name } : null
  }

  if (first.type === 'role' && first.id) {
    const targetRole = db.organizationRoles.find(
      (item) => item.id === String(first.id),
    )

    if (targetRole) {
      const firstWord = targetRole.name.toLowerCase().split(' ')[0] ?? ''

      const membership = db.userProcessMemberships.find(
        (item) =>
          item.processId === processId &&
          item.isActive !== false &&
          item.role.toLowerCase().includes(firstWord),
      )

      if (membership) {
        const user = db.users.find((item) => item.id === membership.userId)
        if (user) return { id: user.id, name: user.name }
      }
    }

    const fallback = db.userProcessMemberships.find(
      (item) => item.processId === processId && item.isActive !== false,
    )

    if (fallback) {
      const user = db.users.find((item) => item.id === fallback.userId)
      if (user) return { id: user.id, name: user.name }
    }

    return null
  }

  if (first.type === 'group' && first.id) {
    const group = db.organizationGroups.find(
      (item) => item.id === String(first.id),
    ) as Record<string, unknown> | undefined

    const memberIds = Array.isArray(group?.memberIds)
      ? (group?.memberIds as string[])
      : []

    if (memberIds.length > 0) {
      const user = db.users.find((item) => item.id === memberIds[0])
      if (user) return { id: user.id, name: user.name }
    }
  }

  const creator = db.users.find((item) => item.id === creatorId)

  return creator
    ? { id: creator.id, name: creator.name }
    : { id: creatorId ?? 'unknown', name: 'Responsável' }
}

function createTaskForStep(
  db: MockDb,
  document: Record<string, unknown>,
  workflow: Record<string, unknown>,
  step: RuntimeStep,
  creatorId?: string,
) {
  const responsible = resolveStepResponsible(db, workflow, step, creatorId)

  if (!responsible) return

  const now = new Date().toISOString()
  const dueDate = calculateDueDate(step.deadlineMode, step.deadlineValue)

  const normalizedActions = normalizeActionList(
    Array.isArray(step.allowedActions) ? step.allowedActions : [],
    Array.isArray(step.actions) ? step.actions : [],
  )

  db.tasks.push({
    id: generateId('task'),
    accountId: String(document.accountId ?? ''),
    processId: String(document.processId ?? ''),
    processName: String(document.processName ?? ''),
    documentInstanceId: String(document.id ?? ''),
    documentTitle: String(document.title ?? ''),
    documentCode: String(document.code ?? ''),
    stepName: String(step.name ?? ''),
    stepOrderIndex: Number(step.orderIndex ?? 0),
    assignedUserId: responsible.id,
    assignedUserName: responsible.name,
    status: 'pending',
    allowedActions: normalizedActions.allowedActions,
    taskActions: normalizedActions.taskActions,
    deadlineMode: step.deadlineMode ?? null,
    deadlineValue: step.deadlineValue ?? null,
    dueDate,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    comment: null,
  } as never)
}

function enrichDocument(
  db: MockDb,
  document: Record<string, unknown>,
): Record<string, unknown> {
  const workflow = db.workflows.find(
    (item) => item.id === document.workflowId,
  ) as Record<string, unknown> | undefined

  const steps = getWorkflowStepsForDocument(db, document)
  const currentStep = getStepByOrderIndex(
    steps,
    typeof document.currentStepOrderIndex === 'number'
      ? document.currentStepOrderIndex
      : document.currentStepOrderIndex != null
        ? Number(document.currentStepOrderIndex)
        : null,
  )

  const documentTasks = db.tasks.filter(
    (item) => item.documentInstanceId === String(document.id ?? ''),
  )

  const documentAuditLogs = db.auditLogs.filter(
    (item) => item.documentInstanceId === String(document.id ?? ''),
  )

  const currentStepMetadataFields: RuntimeMetadataField[] =
    currentStep && Array.isArray(currentStep.metadataFields)
      ? currentStep.metadataFields
      : []

  const workflowSteps = steps.map((step) => {
    const transitions = Array.isArray(step.transitions)
      ? step.transitions.map((transition) => {
        const transitionRecord = transition as Record<string, unknown>
        const targetOrderIndex =
          typeof transitionRecord.toStepOrderIndex === 'number'
            ? transitionRecord.toStepOrderIndex
            : transitionRecord.toStepOrderIndex != null
              ? Number(transitionRecord.toStepOrderIndex)
              : null

        const targetStep =
          targetOrderIndex !== null
            ? steps.find((item) => item.orderIndex === targetOrderIndex) ?? null
            : null

        return {
          triggerAction: normalizeOutcome(transitionRecord.triggerAction),
          toStepOrderIndex: targetOrderIndex,
          toStepId: targetStep ? String(targetStep.id ?? '') : null,
          toStepName: targetStep ? String(targetStep.name ?? '') : null,
        }
      })
      : []

    return {
      id: String(step.id ?? ''),
      name: String(step.name ?? ''),
      orderIndex:
        typeof step.orderIndex === 'number' ? step.orderIndex : null,
      isInitial: Boolean(step.isInitial),
      isFinal: Boolean(step.isFinal),
      kind: String(step.kind ?? ''),
      allowedActions: Array.isArray(step.allowedActions)
        ? step.allowedActions.map((action) => normalizeOutcome(action))
        : [],
      actions: Array.isArray(step.actions) ? step.actions : [],
      deadlineMode:
        typeof step.deadlineMode === 'string' ? step.deadlineMode : null,
      deadlineValue:
        typeof step.deadlineValue === 'number' ||
          typeof step.deadlineValue === 'string'
          ? step.deadlineValue
          : null,
      responsibles: Array.isArray(step.responsibles) ? step.responsibles : [],
      transitions,
    }
  })

  return {
    ...document,
    workflowName: workflow
      ? String(workflow.name ?? '')
      : String(document.workflowName ?? ''),
    currentStepId: currentStep ? String(currentStep.id ?? '') : null,
    documentTypeId: document.documentTypeId ?? '',
    documentTypeName: document.documentTypeName ?? '',
    createdByUserName:
      document.createdByName ?? document.createdByUserName ?? '',
    availableActions:
      currentStep && Array.isArray(currentStep.allowedActions)
        ? currentStep.allowedActions.map((action) => normalizeOutcome(action))
        : [],
    stepMetadataFields: currentStepMetadataFields,
    files: Array.isArray(document.files) ? document.files : [],
    tasks: documentTasks.map((task) => ({
      id: task.id,
      workflowStepId: String(task.stepOrderIndex ?? ''),
      stepName: task.stepName,
      assignedToUserId: task.assignedUserId,
      assignedToUserName: task.assignedUserName,
      status: task.status,
      actionTaken: (task as Record<string, unknown>).actionTaken ?? null,
      comment: task.comment,
      dueAt: task.dueDate,
      completedAt: task.completedAt,
      createdAt: task.createdAt,
      allowedActions: task.allowedActions ?? [],
      taskActions: task.taskActions ?? [],
    })),
    auditLogs: documentAuditLogs.map((item) => ({
      id: item.id,
      action: item.action,
      stepName: item.stepName,
      userName: item.userName,
      comment: item.comment,
      createdAt: item.createdAt,
    })),
    workflowSteps,
  }
}

function persistInitialMetadataValues(
  db: MockDb,
  documentId: string,
  accountId: string,
  processId: string,
  fields: RuntimeMetadataField[],
  values: Record<string, unknown>,
) {
  fields.forEach((field) => {
    const hasValue = Object.prototype.hasOwnProperty.call(
      values,
      field.metadataDefinitionId,
    )

    if (!hasValue) return

    const existingIndex = db.metadataValues.findIndex(
      (item) =>
        item.documentInstanceId === documentId &&
        item.metadataDefinitionId === field.metadataDefinitionId,
    )

    const payload = {
      id:
        existingIndex >= 0
          ? db.metadataValues[existingIndex].id
          : generateId('mval'),
      documentInstanceId: documentId,
      metadataDefinitionId: field.metadataDefinitionId,
      accountId,
      processId,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      isRequired: field.isRequired,
      value: values[field.metadataDefinitionId] ?? null,
      createdAt:
        existingIndex >= 0
          ? db.metadataValues[existingIndex].createdAt
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      db.metadataValues[existingIndex] = {
        ...db.metadataValues[existingIndex],
        ...payload,
      } as never
    } else {
      db.metadataValues.push(payload as never)
    }
  })
}

function getMergedMetadataValuesForDocument(
  db: MockDb,
  documentId: string,
): Array<Record<string, unknown>> {
  const document = db.documentInstances.find((item) => item.id === documentId)

  const savedValues = db.metadataValues.filter(
    (item) => String(item.documentInstanceId) === documentId,
  )

  if (!document) {
    return clone(savedValues) as Array<Record<string, unknown>>
  }

  const steps = getWorkflowStepsForDocument(
    db,
    document as unknown as Record<string, unknown>,
  )

  const currentStep = getStepByOrderIndex(
    steps,
    typeof document.currentStepOrderIndex === 'number'
      ? document.currentStepOrderIndex
      : document.currentStepOrderIndex != null
        ? Number(document.currentStepOrderIndex)
        : null,
  )

  const currentStepFields: RuntimeMetadataField[] =
    currentStep && Array.isArray(currentStep.metadataFields)
      ? currentStep.metadataFields
      : []

  const merged: Array<Record<string, unknown>> = currentStepFields.map((field) => {
    const saved = savedValues.find(
      (item) =>
        String(item.metadataDefinitionId) === String(field.metadataDefinitionId),
    )

    return {
      metadataDefinitionId: field.metadataDefinitionId,
      name: field.name,
      label: field.label,
      fieldType: field.fieldType,
      maskType: field.maskType ?? null,
      isRequired: field.isRequired,
      isReadOnly: Boolean(field.isReadOnly),
      value: saved?.value ?? null,
      options: field.options ?? [],
      tableColumns: field.tableColumns ?? [],
    }
  })

  savedValues.forEach((saved) => {
    const exists = merged.some(
      (item) =>
        String(item.metadataDefinitionId) ===
        String(saved.metadataDefinitionId),
    )

    if (!exists) {
      const savedRecord = saved as Record<string, unknown>

      merged.push({
        metadataDefinitionId: saved.metadataDefinitionId,
        name: saved.name ?? saved.label ?? saved.metadataDefinitionId,
        label: saved.label ?? saved.name ?? saved.metadataDefinitionId,
        fieldType: saved.fieldType ?? 'text',
        maskType:
          typeof savedRecord.maskType === 'string' || savedRecord.maskType === null
            ? savedRecord.maskType
            : null,
        isRequired: Boolean(saved.isRequired),
        isReadOnly: false,
        value: saved.value ?? null,
        options: Array.isArray(savedRecord.options) ? savedRecord.options : [],
        tableColumns: Array.isArray(savedRecord.tableColumns)
          ? savedRecord.tableColumns
          : [],
      })
    }
  })

  return merged
}

function hasMissingRequiredMetadata(
  db: MockDb,
  documentId: string,
): string[] {
  const merged = getMergedMetadataValuesForDocument(db, documentId)

  return merged
    .filter((field) => {
      if (!field.isRequired) return false

      const value = field.value

      if (value === null || value === undefined) return true
      if (typeof value === 'string' && !value.trim()) return true
      if (Array.isArray(value) && value.length === 0) return true

      return false
    })
    .map((field) => String(field.label ?? field.name ?? field.metadataDefinitionId))
}

type RouteResolution =
  | {
    collection: keyof ReturnType<typeof getMockDb>
    id?: string
    action?: string
  }
  | null

function resolveRoute(rawUrl: string): RouteResolution {
  const url = rawUrl.split('?')[0]

  if (/^\/tasks\/[^/]+\/execute$/.test(url)) {
    return { collection: 'tasks', id: url.split('/')[2], action: 'execute' }
  }

  if (
    /^\/document-instances\/[^/]+\/cancel$/.test(url) ||
    /^\/documentInstances\/[^/]+\/cancel$/.test(url)
  ) {
    return {
      collection: 'documentInstances',
      id: url.split('/')[2],
      action: 'cancel',
    }
  }

  if (/^\/metadataValues\/by-document\/[^/]+$/.test(url)) {
    return {
      collection: 'metadataValues',
      id: url.split('/').pop() ?? '',
      action: 'byDocument',
    }
  }

  if (/^\/metadata\/values\/[^/]+$/.test(url)) {
    return {
      collection: 'metadataValues',
      id: url.split('/')[3] ?? '',
      action: 'byDocument',
    }
  }

  if (url === '/dashboard/summary' || url === '/dashboards/summary') {
    return { collection: 'dashboards', action: 'summary' }
  }

  const routes: Array<[RegExp, keyof ReturnType<typeof getMockDb>]> = [
    [/^\/platformAdmins(?:\/(.+))?$/, 'platformAdmins'],
    [/^\/platform-admins(?:\/(.+))?$/, 'platformAdmins'],
    [/^\/accounts(?:\/(.+))?$/, 'accounts'],
    [/^\/accountModules(?:\/(.+))?$/, 'accountModules'],
    [/^\/account-modules(?:\/(.+))?$/, 'accountModules'],
    [/^\/tenantModules(?:\/(.+))?$/, 'accountModules'],
    [/^\/tenant-modules(?:\/(.+))?$/, 'accountModules'],
    [/^\/processes(?:\/(.+))?$/, 'processes'],
    [/^\/users(?:\/(.+))?$/, 'users'],
    [/^\/userAccountMemberships(?:\/(.+))?$/, 'userAccountMemberships'],
    [/^\/user-account-memberships(?:\/(.+))?$/, 'userAccountMemberships'],
    [/^\/userProcessMemberships(?:\/(.+))?$/, 'userProcessMemberships'],
    [/^\/user-process-memberships(?:\/(.+))?$/, 'userProcessMemberships'],
    [/^\/organizationAreas(?:\/(.+))?$/, 'organizationAreas'],
    [/^\/organization\/areas(?:\/(.+))?$/, 'organizationAreas'],
    [/^\/organizationDisciplines(?:\/(.+))?$/, 'organizationDisciplines'],
    [/^\/organization\/disciplines(?:\/(.+))?$/, 'organizationDisciplines'],
    [/^\/organizationRoles(?:\/(.+))?$/, 'organizationRoles'],
    [/^\/organization\/roles(?:\/(.+))?$/, 'organizationRoles'],
    [/^\/organizationGroups(?:\/(.+))?$/, 'organizationGroups'],
    [/^\/organization\/groups(?:\/(.+))?$/, 'organizationGroups'],
    [/^\/documentInstances(?:\/(.+))?$/, 'documentInstances'],
    [/^\/document-instances(?:\/(.+))?$/, 'documentInstances'],
    [/^\/tasks(?:\/(.+))?$/, 'tasks'],
    [/^\/workflows(?:\/(.+))?$/, 'workflows'],
    [/^\/metadataSets(?:\/(.+))?$/, 'metadataSets'],
    [/^\/metadata\/sets(?:\/(.+))?$/, 'metadataSets'],
    [/^\/metadataDefinitions(?:\/(.+))?$/, 'metadataDefinitions'],
    [/^\/metadata\/definitions(?:\/(.+))?$/, 'metadataDefinitions'],
    [/^\/metadataValues(?:\/(.+))?$/, 'metadataValues'],
    [/^\/metadata\/values(?:\/(.+))?$/, 'metadataValues'],
    [/^\/notificationTemplates(?:\/(.+))?$/, 'notificationTemplates'],
    [/^\/notification-templates(?:\/(.+))?$/, 'notificationTemplates'],
    [/^\/dashboards(?:\/(.+))?$/, 'dashboards'],
    [/^\/dashboard(?:\/(.+))?$/, 'dashboards'],
    [/^\/auditLogs(?:\/(.+))?$/, 'auditLogs'],
    [/^\/audit-logs(?:\/(.+))?$/, 'auditLogs'],
    [
      /^\/tenants\/[^/]+\/environment-configurations(?:\/(.+))?$/,
      'environmentConfigurations',
    ],
  ]

  for (const [pattern, collection] of routes) {
    const match = url.match(pattern)
    if (match) {
      return { collection, id: match[1] }
    }
  }

  return null
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.interceptors.request.use((config): never => {
    const url = config.url ?? ''
    const method = (config.method ?? 'get').toLowerCase()
    const params = (config.params ?? {}) as Record<string, unknown>
    const resolved = resolveRoute(url)

    if (!resolved) {
      throw { isMockResponse: true, response: makeResponse([]) }
    }

    const db = getMockDb()
    const { collection, id, action } = resolved

    if (collection === 'dashboards' && action === 'summary') {
      throw {
        isMockResponse: true,
        response: makeResponse(findBestDashboard(db.dashboards, params)),
      }
    }

    if (collection === 'environmentConfigurations') {
      const tenantId = url.split('/')[2] ?? ''

      if (method === 'get') {
        const configs = clone(db.environmentConfigurations).filter(
          (item: Record<string, unknown>) =>
            item.tenantId === tenantId || item.accountId === tenantId,
        )

        throw {
          isMockResponse: true,
          response: makeResponse(configs),
        }
      }

      if (method === 'post') {
        const body = parseBody(config.data)

        const newConfig = {
          id: generateId('env'),
          tenantId,
          accountId: tenantId,
          sequentialCurrentValue: 0,
          sequentialLastPeriod: '',
          createdAt: new Date().toISOString(),
          ...body,
        }

        db.environmentConfigurations.push(newConfig as never)
        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse(newConfig, 201),
        }
      }

      if ((method === 'put' || method === 'patch') && id) {
        const index = db.environmentConfigurations.findIndex(
          (item) => item.id === id,
        )

        if (index >= 0) {
          const body = parseBody(config.data)

          db.environmentConfigurations[index] = {
            ...db.environmentConfigurations[index],
            ...body,
            updatedAt: new Date().toISOString(),
          } as never

          saveMockDb(db)

          throw {
            isMockResponse: true,
            response: makeResponse(db.environmentConfigurations[index]),
          }
        }
      }

      throw {
        isMockResponse: true,
        response: makeResponse([]),
      }
    }

    const items = clone(db[collection]) as Array<Record<string, unknown>>

    if (method === 'get') {
      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const merged = getMergedMetadataValuesForDocument(db, id)

        throw {
          isMockResponse: true,
          response: makeResponse(merged),
        }
      }

      if (id) {
        const item = items.find((entry) => String(entry.id) === id)

        if (!item) {
          throw {
            isMockResponse: true,
            response: makeResponse({ message: 'Registro não encontrado' }, 404),
          }
        }

        if (collection === 'documentInstances') {
          throw {
            isMockResponse: true,
            response: makeResponse(enrichDocument(db, item)),
          }
        }

        throw {
          isMockResponse: true,
          response: makeResponse(item),
        }
      }

      let result = [...items]

      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return

        const normalizedKey = key === 'tenantId' ? 'accountId' : key

        result = result.filter(
          (entry) => String(entry[normalizedKey]) === String(value),
        )
      })

      if (collection === 'documentInstances') {
        result = result.map((document) => {
          const workflow = db.workflows.find(
            (item) => item.id === document.workflowId,
          ) as Record<string, unknown> | undefined

          return {
            ...document,
            workflowName: workflow
              ? String(workflow.name ?? '')
              : String(document.workflowName ?? ''),
            createdByUserName:
              document.createdByName ?? document.createdByUserName ?? '',
          }
        })
      }

      throw {
        isMockResponse: true,
        response: makeResponse(result),
      }
    }

    if (method === 'post') {
      if (collection === 'tasks' && action === 'execute' && id) {
        const body = parseBody(config.data)
        const taskIndex = db.tasks.findIndex((task) => task.id === id)

        if (taskIndex < 0) {
          throw {
            isMockResponse: true,
            response: makeResponse({ message: 'Tarefa não encontrada' }, 404),
          }
        }

        const task = db.tasks[taskIndex]
        const now = new Date().toISOString()
        const actionName = normalizeOutcome(body.action)
        const comment = body.comment ? String(body.comment) : null

        const documentIndex = db.documentInstances.findIndex(
          (item) => item.id === task.documentInstanceId,
        )

        if (documentIndex < 0) {
          throw {
            isMockResponse: true,
            response: makeResponse({ message: 'Documento não encontrado' }, 404),
          }
        }

        const missingRequiredMetadata =
          actionName === 'cancel'
            ? []
            : hasMissingRequiredMetadata(db, String(task.documentInstanceId))

        if (missingRequiredMetadata.length > 0) {
          throw {
            isMockResponse: true,
            response: makeResponse(
              {
                error: `Preencha os metadados obrigatórios antes de continuar: ${missingRequiredMetadata.join(', ')}`,
              },
              400,
            ),
          }
        }

        db.tasks[taskIndex] = {
          ...db.tasks[taskIndex],
          status: 'completed',
          completedAt: now,
          comment,
          actionTaken: actionName,
          allowedActions: [],
          taskActions: [],
          updatedAt: now,
        } as never

        const document = db.documentInstances[documentIndex]
        const steps = getWorkflowStepsForDocument(
          db,
          document as unknown as Record<string, unknown>,
        )
        const currentStep = getStepByOrderIndex(
          steps,
          Number(document.currentStepOrderIndex ?? null),
        )

        const workflow =
          db.workflows.find((item) => item.id === document.workflowId) ??
          ({
            id: String(document.workflowId ?? ''),
            processId: String(document.processId ?? ''),
            processName: String(document.processName ?? ''),
            steps,
          } as never)

        const transitions = Array.isArray(currentStep?.transitions)
          ? currentStep!.transitions!
          : []

        const matchedTransition =
          transitions.find(
            (transition) =>
              normalizeOutcome(
                (transition as Record<string, unknown>).triggerAction,
              ) === actionName,
          ) ?? null

        let nextStatus = String(document.status ?? 'in_progress')
        let nextStepName: string | null = String(document.currentStepName ?? '')
        let nextStepOrderIndex: number | null = Number(
          document.currentStepOrderIndex ?? null,
        )

        let nextStep: RuntimeStep | null = null

        if (actionName === 'cancel') {
          nextStatus = 'cancelled'
          nextStepName = null
          nextStepOrderIndex = null
        } else if (matchedTransition) {
          nextStep =
            steps.find(
              (step) =>
                step.orderIndex ===
                Number(
                  (matchedTransition as Record<string, unknown>)
                    .toStepOrderIndex ?? null,
                ),
            ) ?? null
        } else if (actionName === 'request-changes' && currentStep) {
          nextStep =
            steps.find(
              (step) =>
                step.orderIndex === Number(currentStep.orderIndex ?? 0) - 1,
            ) ?? null
        } else if (actionName === 'reject') {
          nextStatus = 'rejected'
          nextStepName = null
          nextStepOrderIndex = null
        } else if (currentStep?.isFinal || actionName === 'publish') {
          nextStatus = 'published'
          nextStepName = null
          nextStepOrderIndex = null
        } else {
          nextStep = getNextSequentialStep(steps, currentStep ?? null)
        }

        if (nextStep) {
          nextStatus = 'in_progress'
          nextStepName = String(nextStep.name ?? '')
          nextStepOrderIndex = Number(nextStep.orderIndex ?? 0)

          createTaskForStep(
            db,
            document as unknown as Record<string, unknown>,
            workflow as unknown as Record<string, unknown>,
            nextStep,
            String(document.createdById ?? ''),
          )
        } else if (
          nextStatus !== 'rejected' &&
          nextStatus !== 'cancelled' &&
          nextStatus !== 'published'
        ) {
          nextStatus = currentStep?.isFinal ? 'published' : 'completed'
          nextStepName = null
          nextStepOrderIndex = null
        }

        db.documentInstances[documentIndex] = {
          ...document,
          status: nextStatus,
          currentStepName: nextStepName,
          currentStepOrderIndex: nextStepOrderIndex,
          responsibleId:
            nextStep && db.tasks.length > 0
              ? db.tasks[db.tasks.length - 1]?.assignedUserId ?? null
              : null,
          responsibleName:
            nextStep && db.tasks.length > 0
              ? db.tasks[db.tasks.length - 1]?.assignedUserName ?? null
              : null,
          updatedAt: now,
        } as never

        const executorName =
          task.assignedUserName ?? String(document.createdByName ?? '')
        const stepLabel = currentStep ? String(currentStep.name ?? '') : ''

        if (nextStatus === 'rejected') {
          addAuditLog(db, String(document.id), 'DocumentoRejected', {
            stepName: stepLabel,
            userName: executorName,
            comment,
          })
        } else if (nextStatus === 'cancelled') {
          addAuditLog(db, String(document.id), 'DocumentoCancelled', {
            stepName: stepLabel,
            userName: executorName,
            comment,
          })
        } else if (nextStatus === 'published') {
          addAuditLog(db, String(document.id), 'DocumentoPublished', {
            stepName: stepLabel,
            userName: executorName,
            comment,
          })
        } else {
          addAuditLog(db, String(document.id), 'TaskExecuted', {
            stepName: stepLabel,
            userName: executorName,
            comment,
          })
        }

        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse({ success: true }),
        }
      }

      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex(
          (document) => document.id === id,
        )

        if (documentIndex < 0) {
          throw {
            isMockResponse: true,
            response: makeResponse({ message: 'Documento não encontrado' }, 404),
          }
        }

        const currentDocument = db.documentInstances[documentIndex]

        db.documentInstances[documentIndex] = {
          ...currentDocument,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        } as never

        addAuditLog(db, id, 'DocumentoCancelled', {
          userName: String((currentDocument as any).createdByName ?? ''),
        })

        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse({ success: true }),
        }
      }

      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const body = parseBody(config.data)
        const values = Array.isArray(body.values) ? body.values : []
        const document = db.documentInstances.find((item) => item.id === id)

        const scope = document
          ? {
            accountId: String(document.accountId ?? ''),
            processId: String(document.processId ?? ''),
          }
          : { accountId: '', processId: '' }

        values.forEach((incoming) => {
          const payload = incoming as Record<string, unknown>
          const metadataDefinitionId = String(
            payload.metadataDefinitionId ?? '',
          )

          const definition = normalizeMetadataDefinition(
            db.metadataDefinitions.find((item) => item.id === metadataDefinitionId),
          )

          const currentIndex = db.metadataValues.findIndex(
            (item) =>
              item.documentInstanceId === id &&
              item.metadataDefinitionId === metadataDefinitionId,
          )

          const nextValue = {
            id:
              currentIndex >= 0
                ? db.metadataValues[currentIndex].id
                : generateId('mval'),
            documentInstanceId: id,
            metadataDefinitionId,
            accountId: String(payload.accountId ?? scope.accountId ?? ''),
            processId: String(payload.processId ?? scope.processId ?? ''),
            name: String(
              payload.name ?? definition?.name ?? definition?.label ?? '',
            ),
            label: String(
              payload.label ?? definition?.label ?? definition?.name ?? '',
            ),
            fieldType: String(
              payload.fieldType ?? definition?.fieldType ?? 'text',
            ),
            isRequired: Boolean(
              payload.isRequired ?? definition?.isRequired ?? false,
            ),
            value: payload.value,
            createdAt:
              currentIndex >= 0
                ? db.metadataValues[currentIndex].createdAt
                : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          if (currentIndex >= 0) {
            db.metadataValues[currentIndex] = {
              ...db.metadataValues[currentIndex],
              ...nextValue,
            } as never
          } else {
            db.metadataValues.push(nextValue as never)
          }
        })

        if (document) {
          addAuditLog(db, id, 'MetadataSaved', {
            stepName: String(document.currentStepName ?? ''),
            userName: String(document.createdByName ?? ''),
          })
        }

        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse({ success: true }),
        }
      }

      if (collection === 'documentInstances' && !action) {
        const body = parseBody(config.data)
        const now = new Date().toISOString()
        const workflowId = String(body.workflowId ?? '')
        const workflow = db.workflows.find(
          (item) => item.id === workflowId,
        ) as Record<string, unknown> | undefined

        const rawSteps = Array.isArray(workflow?.steps) && workflow!.steps.length > 0
          ? (workflow!.steps as RuntimeStep[])
          : Array.isArray(body.steps)
            ? (body.steps as RuntimeStep[])
            : []

        const effectiveSteps = getEffectiveWorkflowSteps(
          db,
          workflowId,
          rawSteps,
        )

        const initialStep =
          effectiveSteps.find((item) => item.isInitial) ??
          effectiveSteps[0] ??
          null

        const creationMetadataFields = getInitialCreationMetadataFields(
          db,
          workflowId,
          effectiveSteps,
        )

        let executionStep = initialStep

        if (
          executionStep &&
          String(executionStep.kind ?? '') === 'start'
        ) {
          executionStep = getNextSequentialStep(effectiveSteps, executionStep) ?? executionStep
        }

        const newDocument = {
          id: generateId('doc'),
          accountId: String(body.accountId ?? workflow?.accountId ?? ''),
          processId: String(body.processId ?? workflow?.processId ?? ''),
          processName: String(body.processName ?? workflow?.processName ?? ''),
          title: String(body.title ?? ''),
          description: String(body.description ?? ''),
          code: generateDocumentCode(
            db,
            String(body.accountId ?? workflow?.accountId ?? ''),
          ),
          status: executionStep ? 'in_progress' : 'draft',
          workflowId,
          workflowName: String(body.workflowName ?? workflow?.name ?? ''),
          currentStepName: executionStep
            ? String(executionStep.name ?? '')
            : null,
          currentStepOrderIndex: executionStep
            ? Number(executionStep.orderIndex ?? 0)
            : null,
          responsibleId: String(body.createdById ?? ''),
          responsibleName: String(body.createdByName ?? ''),
          createdById: String(body.createdById ?? ''),
          createdByName: String(body.createdByName ?? ''),
          createdAt: now,
          updatedAt: now,
          dueDate: null,
          files: [],
          _steps: effectiveSteps,
        }

        db.documentInstances.push(newDocument as never)

        persistInitialMetadataValues(
          db,
          newDocument.id,
          String(newDocument.accountId),
          String(newDocument.processId),
          creationMetadataFields,
          (body.initialMetadataValues as Record<string, unknown>) ?? {},
        )

        if (executionStep) {
          const workflowForTask =
            workflow ??
            ({
              id: workflowId,
              name: String(body.workflowName ?? ''),
              processId: String(body.processId ?? ''),
              processName: String(body.processName ?? ''),
              steps: effectiveSteps,
            } as Record<string, unknown>)

          createTaskForStep(
            db,
            newDocument as unknown as Record<string, unknown>,
            workflowForTask,
            executionStep,
            String(newDocument.createdById ?? ''),
          )
        }

        addAuditLog(db, newDocument.id, 'DocumentoCreated', {
          stepName: executionStep ? String(executionStep.name ?? '') : null,
          userName: String(body.createdByName ?? ''),
        })

        if (
          body.initialMetadataValues &&
          Object.keys(body.initialMetadataValues as Record<string, unknown>).length > 0
        ) {
          addAuditLog(db, newDocument.id, 'MetadataSaved', {
            stepName: initialStep ? String(initialStep.name ?? '') : null,
            userName: String(body.createdByName ?? ''),
          })
        }

        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse(newDocument, 201),
        }
      }

      const body = parseBody(config.data)
      const newItem = {
        id: generateId(String(collection).slice(0, 4)),
        createdAt: new Date().toISOString(),
        isActive: true,
        ...body,
      }

      saveMockDb({
        ...db,
        [collection]: [...(db[collection] as unknown[]), newItem],
      } as typeof db)

      throw {
        isMockResponse: true,
        response: makeResponse(newItem, 201),
      }
    }

    if (method === 'put' || method === 'patch') {
      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex(
          (document) => document.id === id,
        )

        if (documentIndex < 0) {
          throw {
            isMockResponse: true,
            response: makeResponse({ message: 'Documento não encontrado' }, 404),
          }
        }

        const currentDocument = db.documentInstances[documentIndex]

        db.documentInstances[documentIndex] = {
          ...currentDocument,
          status: 'cancelled',
          updatedAt: new Date().toISOString(),
        } as never

        addAuditLog(db, id, 'DocumentoCancelled', {
          userName: String((currentDocument as any).createdByName ?? ''),
        })

        saveMockDb(db)

        throw {
          isMockResponse: true,
          response: makeResponse({ success: true }),
        }
      }

      if (!id) {
        throw {
          isMockResponse: true,
          response: makeResponse({ message: 'ID obrigatório' }, 400),
        }
      }

      const body = parseBody(config.data)
      const currentIndex = items.findIndex((entry) => String(entry.id) === id)

      if (currentIndex < 0) {
        throw {
          isMockResponse: true,
          response: makeResponse({ message: 'Registro não encontrado' }, 404),
        }
      }

      const updated = {
        ...items[currentIndex],
        ...body,
        updatedAt: new Date().toISOString(),
      }

      const nextItems = [...items]
      nextItems[currentIndex] = updated

      saveMockDb({
        ...db,
        [collection]: nextItems,
      } as typeof db)

      throw {
        isMockResponse: true,
        response: makeResponse(updated),
      }
    }

    if (method === 'delete') {
      if (!id) {
        throw {
          isMockResponse: true,
          response: makeResponse({ message: 'ID obrigatório' }, 400),
        }
      }

      saveMockDb({
        ...db,
        [collection]: items.filter((entry) => String(entry.id) !== id),
      } as typeof db)

      throw {
        isMockResponse: true,
        response: makeResponse({}, 204),
      }
    }

    throw {
      isMockResponse: true,
      response: makeResponse([]),
    }
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error?.isMockResponse) {
        return Promise.resolve(error.response)
      }

      return Promise.reject(error)
    },
  )
}

type MockRequestOptions = {
  params?: Record<string, unknown>
}

const standaloneMockClient = axios.create()

installMockAdapter(standaloneMockClient)

export const mockApi = {
  preload: async () => {
    return clone(initializeMockDb())
  },

  getDbSnapshot: () => {
    return clone(getMockDb())
  },

  reset: async () => {
    return clone(resetMockDb())
  },

  get: async <T>(path: string, options?: MockRequestOptions) => {
    const response = await standaloneMockClient.get(path, {
      params: options?.params,
    })
    return response.data as T
  },

  post: async <T>(
    path: string,
    body?: unknown,
    options?: MockRequestOptions,
  ) => {
    const response = await standaloneMockClient.post(path, body, {
      params: options?.params,
    })
    return response.data as T
  },

  put: async <T>(
    path: string,
    body?: unknown,
    options?: MockRequestOptions,
  ) => {
    const response = await standaloneMockClient.put(path, body, {
      params: options?.params,
    })
    return response.data as T
  },

  patch: async <T>(
    path: string,
    body?: unknown,
    options?: MockRequestOptions,
  ) => {
    const response = await standaloneMockClient.patch(path, body, {
      params: options?.params,
    })
    return response.data as T
  },

  delete: async <T = void>(
    path: string,
    options?: MockRequestOptions,
  ) => {
    const response = await standaloneMockClient.delete(path, {
      params: options?.params,
    })
    return response.data as T
  },
}