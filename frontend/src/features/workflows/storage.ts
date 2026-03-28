import { getStudioElementKind } from './studioElementKinds'

export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived'

export type WorkflowPermissionEntry = {
  userIds: string[]
  groupIds: string[]
  unitIds: string[]
  areaIds: string[]
  disciplineIds: string[]
  roleIds: string[]
}

export type WorkflowPermissions = {
  visualization: WorkflowPermissionEntry
  creation: WorkflowPermissionEntry
}

export const EMPTY_PERMISSION_ENTRY: WorkflowPermissionEntry = {
  userIds: [],
  groupIds: [],
  unitIds: [],
  areaIds: [],
  disciplineIds: [],
  roleIds: [],
}

export const EMPTY_WORKFLOW_PERMISSIONS: WorkflowPermissions = {
  visualization: { ...EMPTY_PERMISSION_ENTRY },
  creation: { ...EMPTY_PERMISSION_ENTRY },
}

export type WorkflowDefinition = {
  id: string
  name: string
  description?: string
  version: string
  status: WorkflowStatus
  documentTypeId?: string
  documentTypeName?: string
  bpmnXml: string
  stepsCount: number
  permissions?: WorkflowPermissions
  createdAt: string
  updatedAt: string
  publishedAt?: string
}

export type WorkflowValidationIssue = {
  id: string
  workflowId: string
  elementId?: string
  severity: 'error' | 'warning'
  code: string
  message: string
}

export type ActivityActionOutcome =
  | 'approve'
  | 'reject'
  | 'request-changes'
  | 'forward'
  | 'custom'

export type ActivityAction = {
  id: string
  label: string
  color: 'green' | 'red' | 'orange' | 'blue' | 'purple' | 'gold' | 'default'
  outcome: ActivityActionOutcome
  confirmText?: string
  requiresComment: boolean
}

export type ActivityMetadataFieldRule = {
  metadataDefinitionId: string
  name?: string
  label?: string
  fieldType?: string
  metadataSetId?: string
  metadataSetName?: string
  isRequired: boolean
  isReadOnly: boolean
}

export type SendTaskConfig = {
  notificationTemplateId?: string
  channel: 'email' | 'in-app' | 'whatsapp' | 'sms' | 'all'
  recipientRoleIds: string[]
  recipientUserIds: string[]
  recipientAreaIds: string[]
  notifyInitiator: boolean
  notifyPreviousAssignees: boolean
  customSubject?: string
  customBody?: string
  contextVariables: string[]
}

export type StartEventConfig = {
  initialMetadataDefinitionIds: string[]
  requiredAttachmentTypes: string[]
  notificationTemplateIds: string[]
  allowedStarterRoleIds: string[]
  instructions?: string
  formTitle?: string
}

export type ActivityConfig = {
  assignmentMode: 'user' | 'role' | 'area' | 'function'
  responsibleUserIds: string[]
  responsibleRoleIds: string[]
  responsibleAreaIds: string[]
  responsibleFunctionIds: string[]
  deadlineMode: 'hours' | 'days' | 'fixed-date'
  deadlineValue?: number | string

  metadataSetIds: string[]
  metadataDefinitionIds: string[]
  metadataFields?: ActivityMetadataFieldRule[]

  notificationTemplateIds: string[]
  allowApprove: boolean
  allowReject: boolean
  allowRequestChanges: boolean
  allowForward: boolean
  instructions?: string
  helpText?: string
  actions?: ActivityAction[]
  linkedWorkflowId?: string
  sendTask?: SendTaskConfig
}

export type GatewayConfig = {
  decisionMode: 'manual' | 'metadata-rule' | 'expression'
  decisionDescription?: string
  decisionFieldId?: string
  notificationTemplateIds: string[]
  instructions?: string
}

export type FlowConfig = {
  label?: string
  conditionType: 'always' | 'expression' | 'metadata-value'
  expression?: string
  metadataFieldId?: string
  expectedValue?: string
  isDefault?: boolean
  notificationTemplateIds: string[]
  description?: string
}

export type EndEventConfig = {
  finalMetadataDefinitionIds: string[]
  summarySections: string[]
  notificationTemplateIds: string[]
  finalAction: 'complete' | 'archive' | 'publish' | 'open-linked-workflow'
  linkedWorkflowId?: string
  instructions?: string
}

export type NotificationEventConfig = {
  notificationTemplateId?: string
  channel: 'email' | 'in-app' | 'whatsapp' | 'sms' | 'all'
  recipientRoleIds: string[]
  recipientUserIds: string[]
  recipientAreaIds: string[]
  notifyInitiator: boolean
  notifyPreviousAssignees: boolean
  customSubject?: string
  customBody?: string
  contextVariables: string[]
}

export type SystemTaskActionType =
  | 'increment-revision'
  | 'set-metadata'
  | 'copy-metadata'
  | 'http-request'
  | 'custom-script'

export type SystemTaskConfig = {
  actionType: SystemTaskActionType
  auditNote?: string
  notificationTemplateIds: string[]
}

export type WorkflowElementKind =
  | 'start'
  | 'activity'
  | 'gateway'
  | 'flow'
  | 'end'
  | 'notification'
  | 'system-task'

export type WorkflowElementConfig = {
  id: string
  workflowId: string
  elementId: string
  elementType: string
  elementName?: string
  kind: WorkflowElementKind
  config:
  | StartEventConfig
  | ActivityConfig
  | GatewayConfig
  | FlowConfig
  | EndEventConfig
  | NotificationEventConfig
  | SystemTaskConfig
  createdAt: string
  updatedAt: string
}

export type WorkflowActivityConfig = {
  id: string
  workflowId: string
  elementId: string
  elementType: string
  elementName?: string
  assignmentMode: 'user' | 'role' | 'area' | 'function'
  responsibleUserIds: string[]
  responsibleRoleIds: string[]
  responsibleAreaIds: string[]
  responsibleFunctionIds: string[]
  deadlineMode: 'hours' | 'days' | 'fixed-date'
  deadlineValue?: number | string

  metadataSetIds: string[]
  metadataDefinitionIds: string[]
  metadataFields?: ActivityMetadataFieldRule[]

  notificationTemplateIds: string[]
  allowApprove: boolean
  allowReject: boolean
  allowRequestChanges: boolean
  allowForward: boolean
  instructions?: string
  helpText?: string
  actions?: ActivityAction[]
  linkedWorkflowId?: string
  sendTask?: SendTaskConfig
  createdAt: string
  updatedAt: string
}

export type WorkflowVersionSnapshot = {
  id: string
  workflowId: string
  versionLabel: string
  note?: string
  workflow: WorkflowDefinition
  elementConfigs: WorkflowElementConfig[]
  createdAt: string
}

const WORKFLOWS_KEY = 'gestao-docs:workflows'
const ELEMENT_CONFIGS_KEY = 'gestao-docs:workflow-element-configs'
const SNAPSHOTS_KEY = 'gestao-docs:workflow-snapshots'

const LEGACY_ELEMENT_CONFIGS_KEY = 'workflow-element-configs'
const LEGACY_ACTIVITY_CONFIGS_KEY = 'gestao-docs:workflow-activity-configs'

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function readStorage(key: string) {
  if (!canUseLocalStorage()) return null
  return window.localStorage.getItem(key)
}

function writeStorage(key: string, value: string) {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(key, value)
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}

function normalizePermissionEntry(value: unknown): WorkflowPermissionEntry {
  const raw = value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

  return {
    userIds: toStringArray(raw.userIds),
    groupIds: toStringArray(raw.groupIds),
    unitIds: toStringArray(raw.unitIds),
    areaIds: toStringArray(raw.areaIds),
    disciplineIds: toStringArray(raw.disciplineIds),
    roleIds: toStringArray(raw.roleIds),
  }
}

function normalizePermissions(value: unknown): WorkflowPermissions | undefined {
  if (!value || typeof value !== 'object') return undefined

  const raw = value as Record<string, unknown>

  return {
    visualization: normalizePermissionEntry(raw.visualization),
    creation: normalizePermissionEntry(raw.creation),
  }
}

function normalizeWorkflow(item: any): WorkflowDefinition {
  return {
    id: String(item?.id ?? crypto.randomUUID()),
    name: String(item?.name ?? 'Workflow sem nome'),
    description:
      typeof item?.description === 'string' ? item.description : undefined,
    version:
      typeof item?.version === 'string' && item.version.trim()
        ? item.version
        : '1.0',
    status:
      item?.status === 'draft' ||
        item?.status === 'active' ||
        item?.status === 'inactive' ||
        item?.status === 'archived'
        ? item.status
        : 'draft',
    documentTypeId:
      typeof item?.documentTypeId === 'string' ? item.documentTypeId : undefined,
    documentTypeName:
      typeof item?.documentTypeName === 'string'
        ? item.documentTypeName
        : undefined,
    bpmnXml: typeof item?.bpmnXml === 'string' ? item.bpmnXml : '',
    stepsCount:
      typeof item?.stepsCount === 'number'
        ? item.stepsCount
        : Array.isArray(item?.steps)
          ? item.steps.length
          : 0,
    permissions: normalizePermissions(item?.permissions),
    createdAt:
      typeof item?.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof item?.updatedAt === 'string'
        ? item.updatedAt
        : new Date().toISOString(),
    publishedAt:
      typeof item?.publishedAt === 'string' ? item.publishedAt : undefined,
  }
}

function normalizeActivityAction(item: any): ActivityAction {
  return {
    id: String(item?.id ?? crypto.randomUUID()),
    label: typeof item?.label === 'string' ? item.label : 'Ação',
    color:
      item?.color === 'green' ||
        item?.color === 'red' ||
        item?.color === 'orange' ||
        item?.color === 'blue' ||
        item?.color === 'purple' ||
        item?.color === 'gold' ||
        item?.color === 'default'
        ? item.color
        : 'default',
    outcome:
      item?.outcome === 'approve' ||
        item?.outcome === 'reject' ||
        item?.outcome === 'request-changes' ||
        item?.outcome === 'forward' ||
        item?.outcome === 'custom'
        ? item.outcome
        : 'custom',
    confirmText:
      typeof item?.confirmText === 'string' ? item.confirmText : undefined,
    requiresComment: Boolean(item?.requiresComment),
  }
}

function normalizeSendTaskConfig(item: any): SendTaskConfig | undefined {
  if (!item || typeof item !== 'object') return undefined

  return {
    notificationTemplateId:
      typeof item.notificationTemplateId === 'string'
        ? item.notificationTemplateId
        : undefined,
    channel:
      item.channel === 'email' ||
        item.channel === 'in-app' ||
        item.channel === 'whatsapp' ||
        item.channel === 'sms' ||
        item.channel === 'all'
        ? item.channel
        : 'email',
    recipientRoleIds: toStringArray(item.recipientRoleIds),
    recipientUserIds: toStringArray(item.recipientUserIds),
    recipientAreaIds: toStringArray(item.recipientAreaIds),
    notifyInitiator: Boolean(item.notifyInitiator),
    notifyPreviousAssignees: Boolean(item.notifyPreviousAssignees),
    customSubject:
      typeof item.customSubject === 'string' ? item.customSubject : undefined,
    customBody:
      typeof item.customBody === 'string' ? item.customBody : undefined,
    contextVariables: toStringArray(item.contextVariables),
  }
}

function normalizeActivityConfigValue(item: any): ActivityConfig {
  const metadataDefinitionIds: string[] = Array.isArray(item?.metadataDefinitionIds)
    ? item.metadataDefinitionIds.filter(
      (value: unknown): value is string => typeof value === 'string',
    )
    : []

  const metadataFields: ActivityMetadataFieldRule[] = Array.isArray(item?.metadataFields)
    ? item.metadataFields
      .filter(
        (value: unknown): value is Record<string, unknown> =>
          Boolean(value) && typeof value === 'object',
      )
      .map((field: Record<string, unknown>): ActivityMetadataFieldRule => ({
        metadataDefinitionId: String(field.metadataDefinitionId ?? ''),
        name: typeof field.name === 'string' ? field.name : undefined,
        label: typeof field.label === 'string' ? field.label : undefined,
        fieldType: typeof field.fieldType === 'string' ? field.fieldType : undefined,
        metadataSetId:
          typeof field.metadataSetId === 'string' ? field.metadataSetId : undefined,
        metadataSetName:
          typeof field.metadataSetName === 'string'
            ? field.metadataSetName
            : undefined,
        isRequired: Boolean(field.isRequired),
        isReadOnly: Boolean(field.isReadOnly),
      }))
      .filter(
        (field: ActivityMetadataFieldRule) => Boolean(field.metadataDefinitionId),
      )
    : metadataDefinitionIds.map(
      (id: string): ActivityMetadataFieldRule => ({
        metadataDefinitionId: id,
        isRequired: false,
        isReadOnly: false,
      }),
    )

  const resolvedMetadataDefinitionIds: string[] =
    metadataFields.length > 0
      ? metadataFields.map(
        (field: ActivityMetadataFieldRule) => field.metadataDefinitionId,
      )
      : metadataDefinitionIds

  return {
    assignmentMode:
      item?.assignmentMode === 'user' ||
        item?.assignmentMode === 'role' ||
        item?.assignmentMode === 'area' ||
        item?.assignmentMode === 'function'
        ? item.assignmentMode
        : 'role',

    responsibleUserIds: toStringArray(item?.responsibleUserIds),
    responsibleRoleIds: toStringArray(item?.responsibleRoleIds),
    responsibleAreaIds: toStringArray(item?.responsibleAreaIds),
    responsibleFunctionIds: toStringArray(item?.responsibleFunctionIds),

    deadlineMode:
      item?.deadlineMode === 'hours' ||
        item?.deadlineMode === 'days' ||
        item?.deadlineMode === 'fixed-date'
        ? item.deadlineMode
        : 'days',

    deadlineValue:
      typeof item?.deadlineValue === 'number' ||
        typeof item?.deadlineValue === 'string'
        ? item.deadlineValue
        : undefined,

    metadataSetIds: toStringArray(item?.metadataSetIds),
    metadataDefinitionIds: resolvedMetadataDefinitionIds,
    metadataFields,

    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),

    allowApprove: Boolean(item?.allowApprove ?? true),
    allowReject: Boolean(item?.allowReject ?? true),
    allowRequestChanges: Boolean(item?.allowRequestChanges ?? true),
    allowForward: Boolean(item?.allowForward ?? false),

    instructions:
      typeof item?.instructions === 'string' ? item.instructions : undefined,
    helpText: typeof item?.helpText === 'string' ? item.helpText : undefined,

    actions: Array.isArray(item?.actions)
      ? item.actions.map(normalizeActivityAction)
      : undefined,

    linkedWorkflowId:
      typeof item?.linkedWorkflowId === 'string'
        ? item.linkedWorkflowId
        : undefined,

    sendTask: normalizeSendTaskConfig(item?.sendTask),
  }
}

function buildActivityElementConfigPayload(
  item: Pick<
    WorkflowActivityConfig,
    | 'assignmentMode'
    | 'responsibleUserIds'
    | 'responsibleRoleIds'
    | 'responsibleAreaIds'
    | 'responsibleFunctionIds'
    | 'deadlineMode'
    | 'deadlineValue'
    | 'metadataSetIds'
    | 'metadataDefinitionIds'
    | 'metadataFields'
    | 'notificationTemplateIds'
    | 'allowApprove'
    | 'allowReject'
    | 'allowRequestChanges'
    | 'allowForward'
    | 'instructions'
    | 'helpText'
    | 'actions'
    | 'linkedWorkflowId'
    | 'sendTask'
  >,
): ActivityConfig {
  return {
    assignmentMode: item.assignmentMode,
    responsibleUserIds: item.responsibleUserIds,
    responsibleRoleIds: item.responsibleRoleIds,
    responsibleAreaIds: item.responsibleAreaIds,
    responsibleFunctionIds: item.responsibleFunctionIds,
    deadlineMode: item.deadlineMode,
    deadlineValue: item.deadlineValue,

    metadataSetIds: item.metadataSetIds,
    metadataDefinitionIds: item.metadataDefinitionIds,
    metadataFields: item.metadataFields,

    notificationTemplateIds: item.notificationTemplateIds,
    allowApprove: item.allowApprove,
    allowReject: item.allowReject,
    allowRequestChanges: item.allowRequestChanges,
    allowForward: item.allowForward,
    instructions: item.instructions,
    helpText: item.helpText,
    actions: item.actions,
    linkedWorkflowId: item.linkedWorkflowId,
    sendTask: item.sendTask,
  }
}

function normalizeStartEventConfig(item: any): StartEventConfig {
  return {
    initialMetadataDefinitionIds: toStringArray(item?.initialMetadataDefinitionIds),
    requiredAttachmentTypes: toStringArray(item?.requiredAttachmentTypes),
    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),
    allowedStarterRoleIds: toStringArray(item?.allowedStarterRoleIds),
    instructions:
      typeof item?.instructions === 'string' ? item.instructions : undefined,
    formTitle: typeof item?.formTitle === 'string' ? item.formTitle : undefined,
  }
}

function normalizeGatewayConfig(item: any): GatewayConfig {
  return {
    decisionMode:
      item?.decisionMode === 'manual' ||
        item?.decisionMode === 'metadata-rule' ||
        item?.decisionMode === 'expression'
        ? item.decisionMode
        : 'manual',
    decisionDescription:
      typeof item?.decisionDescription === 'string'
        ? item.decisionDescription
        : undefined,
    decisionFieldId:
      typeof item?.decisionFieldId === 'string'
        ? item.decisionFieldId
        : undefined,
    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),
    instructions:
      typeof item?.instructions === 'string' ? item.instructions : undefined,
  }
}

function normalizeFlowConfig(item: any): FlowConfig {
  return {
    label: typeof item?.label === 'string' ? item.label : undefined,
    conditionType:
      item?.conditionType === 'always' ||
        item?.conditionType === 'expression' ||
        item?.conditionType === 'metadata-value'
        ? item.conditionType
        : 'always',
    expression:
      typeof item?.expression === 'string' ? item.expression : undefined,
    metadataFieldId:
      typeof item?.metadataFieldId === 'string'
        ? item.metadataFieldId
        : undefined,
    expectedValue:
      typeof item?.expectedValue === 'string' ? item.expectedValue : undefined,
    isDefault: Boolean(item?.isDefault),
    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),
    description:
      typeof item?.description === 'string' ? item.description : undefined,
  }
}

function normalizeEndEventConfig(item: any): EndEventConfig {
  return {
    finalMetadataDefinitionIds: toStringArray(item?.finalMetadataDefinitionIds),
    summarySections: toStringArray(item?.summarySections),
    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),
    finalAction:
      item?.finalAction === 'complete' ||
        item?.finalAction === 'archive' ||
        item?.finalAction === 'publish' ||
        item?.finalAction === 'open-linked-workflow'
        ? item.finalAction
        : 'complete',
    linkedWorkflowId:
      typeof item?.linkedWorkflowId === 'string'
        ? item.linkedWorkflowId
        : undefined,
    instructions:
      typeof item?.instructions === 'string' ? item.instructions : undefined,
  }
}

function normalizeNotificationEventConfig(item: any): NotificationEventConfig {
  return {
    notificationTemplateId:
      typeof item?.notificationTemplateId === 'string'
        ? item.notificationTemplateId
        : undefined,
    channel:
      item?.channel === 'email' ||
        item?.channel === 'in-app' ||
        item?.channel === 'whatsapp' ||
        item?.channel === 'sms' ||
        item?.channel === 'all'
        ? item.channel
        : 'email',
    recipientRoleIds: toStringArray(item?.recipientRoleIds),
    recipientUserIds: toStringArray(item?.recipientUserIds),
    recipientAreaIds: toStringArray(item?.recipientAreaIds),
    notifyInitiator: Boolean(item?.notifyInitiator),
    notifyPreviousAssignees: Boolean(item?.notifyPreviousAssignees),
    customSubject:
      typeof item?.customSubject === 'string' ? item.customSubject : undefined,
    customBody:
      typeof item?.customBody === 'string' ? item.customBody : undefined,
    contextVariables: toStringArray(item?.contextVariables),
  }
}

function normalizeSystemTaskConfig(item: any): SystemTaskConfig {
  return {
    actionType:
      item?.actionType === 'increment-revision' ||
        item?.actionType === 'set-metadata' ||
        item?.actionType === 'copy-metadata' ||
        item?.actionType === 'http-request' ||
        item?.actionType === 'custom-script'
        ? item.actionType
        : 'increment-revision',
    auditNote:
      typeof item?.auditNote === 'string' ? item.auditNote : undefined,
    notificationTemplateIds: toStringArray(item?.notificationTemplateIds),
  }
}

function normalizeElementKind(kind: unknown, elementType?: string): WorkflowElementKind {
  if (
    kind === 'start' ||
    kind === 'activity' ||
    kind === 'gateway' ||
    kind === 'flow' ||
    kind === 'end' ||
    kind === 'notification' ||
    kind === 'system-task'
  ) {
    return kind
  }

  const derived = getStudioElementKind(elementType)
  if (derived !== 'unsupported') {
    return derived
  }

  return 'activity'
}

function normalizeWorkflowElementConfig(item: any): WorkflowElementConfig {
  const kind = normalizeElementKind(item?.kind, item?.elementType)
  const rawConfig = item?.config ?? {}

  let config: WorkflowElementConfig['config']

  switch (kind) {
    case 'start':
      config = normalizeStartEventConfig(rawConfig)
      break
    case 'gateway':
      config = normalizeGatewayConfig(rawConfig)
      break
    case 'flow':
      config = normalizeFlowConfig(rawConfig)
      break
    case 'end':
      config = normalizeEndEventConfig(rawConfig)
      break
    case 'notification':
      config = normalizeNotificationEventConfig(rawConfig)
      break
    case 'system-task':
      config = normalizeSystemTaskConfig(rawConfig)
      break
    case 'activity':
    default:
      config = normalizeActivityConfigValue(rawConfig)
      break
  }

  return {
    id: String(item?.id ?? crypto.randomUUID()),
    workflowId: String(item?.workflowId ?? ''),
    elementId: String(item?.elementId ?? ''),
    elementType: String(item?.elementType ?? ''),
    elementName:
      typeof item?.elementName === 'string' ? item.elementName : undefined,
    kind,
    config,
    createdAt:
      typeof item?.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof item?.updatedAt === 'string'
        ? item.updatedAt
        : new Date().toISOString(),
  }
}

function normalizeWorkflowActivityConfig(item: any): WorkflowActivityConfig {
  const normalizedConfig = normalizeActivityConfigValue(item)

  return {
    id: String(item?.id ?? crypto.randomUUID()),
    workflowId: String(item?.workflowId ?? ''),
    elementId: String(item?.elementId ?? ''),
    elementType: String(item?.elementType ?? ''),
    elementName:
      typeof item?.elementName === 'string' ? item.elementName : undefined,
    ...normalizedConfig,
    createdAt:
      typeof item?.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
    updatedAt:
      typeof item?.updatedAt === 'string'
        ? item.updatedAt
        : new Date().toISOString(),
  }
}

function elementConfigToActivityConfig(
  item: WorkflowElementConfig,
): WorkflowActivityConfig | null {
  if (item.kind !== 'activity') return null

  const config = normalizeActivityConfigValue(item.config)

  return {
    id: item.id,
    workflowId: item.workflowId,
    elementId: item.elementId,
    elementType: item.elementType,
    elementName: item.elementName,
    ...config,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  }
}

function activityConfigToElementConfig(
  item: WorkflowActivityConfig,
): WorkflowElementConfig {
  const normalizedActivity = normalizeWorkflowActivityConfig(item)

  return {
    id: normalizedActivity.id,
    workflowId: normalizedActivity.workflowId,
    elementId: normalizedActivity.elementId,
    elementType: normalizedActivity.elementType,
    elementName: normalizedActivity.elementName,
    kind: 'activity',
    config: buildActivityElementConfigPayload(normalizedActivity),
    createdAt: normalizedActivity.createdAt,
    updatedAt: normalizedActivity.updatedAt,
  }
}

function dedupeElementConfigs(
  items: WorkflowElementConfig[],
): WorkflowElementConfig[] {
  const map = new Map<string, WorkflowElementConfig>()

  items.forEach((item) => {
    const normalized = normalizeWorkflowElementConfig(item)
    const key = `${normalized.workflowId}::${normalized.elementId}`
    map.set(key, normalized)
  })

  return Array.from(map.values()).sort(
    (a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt),
  )
}

function normalizeSnapshot(item: any): WorkflowVersionSnapshot {
  const workflow = normalizeWorkflow(item?.workflow ?? {})
  const elementConfigs = Array.isArray(item?.elementConfigs)
    ? item.elementConfigs.map(normalizeWorkflowElementConfig)
    : Array.isArray(item?.activityConfigs)
      ? item.activityConfigs
        .map(normalizeWorkflowActivityConfig)
        .map(activityConfigToElementConfig)
      : []

  return {
    id: String(item?.id ?? crypto.randomUUID()),
    workflowId: String(item?.workflowId ?? workflow.id ?? ''),
    versionLabel:
      typeof item?.versionLabel === 'string' && item.versionLabel.trim()
        ? item.versionLabel
        : 'Snapshot',
    note: typeof item?.note === 'string' ? item.note : undefined,
    workflow,
    elementConfigs: dedupeElementConfigs(elementConfigs),
    createdAt:
      typeof item?.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
  }
}

function readArrayFromStorage(key: string): any[] {
  return safeParseJson<any[]>(readStorage(key), [])
}

export function loadWorkflows(): WorkflowDefinition[] {
  const raw = readArrayFromStorage(WORKFLOWS_KEY)
  return Array.isArray(raw) ? raw.map(normalizeWorkflow) : []
}

export function saveWorkflows(items: WorkflowDefinition[]) {
  writeStorage(WORKFLOWS_KEY, JSON.stringify(items.map(normalizeWorkflow)))
}

export function getWorkflowById(id: string) {
  return loadWorkflows().find((item) => item.id === id) ?? null
}

export function upsertWorkflow(workflow: WorkflowDefinition) {
  const current = loadWorkflows()
  const index = current.findIndex((item) => item.id === workflow.id)
  const nextWorkflow = normalizeWorkflow({
    ...workflow,
    updatedAt: new Date().toISOString(),
  })

  if (index >= 0) {
    current[index] = nextWorkflow
  } else {
    current.unshift(nextWorkflow)
  }

  saveWorkflows(current)
}

export function createWorkflowDraft(input: {
  name: string
  description?: string
  version?: string
  status?: WorkflowStatus
  documentTypeId?: string
  documentTypeName?: string
}) {
  const now = new Date().toISOString()

  return normalizeWorkflow({
    id: crypto.randomUUID(),
    name: input.name,
    description: input.description,
    version: input.version || '1.0',
    status: input.status || 'draft',
    documentTypeId: input.documentTypeId,
    documentTypeName: input.documentTypeName,
    bpmnXml: '',
    stepsCount: 0,
    createdAt: now,
    updatedAt: now,
  })
}

export function loadWorkflowElementConfigs(): WorkflowElementConfig[] {
  const primary = readArrayFromStorage(ELEMENT_CONFIGS_KEY)
    .map(normalizeWorkflowElementConfig)

  const legacyElementConfigs = readArrayFromStorage(LEGACY_ELEMENT_CONFIGS_KEY)
    .map(normalizeWorkflowElementConfig)

  const legacyActivityConfigs = readArrayFromStorage(LEGACY_ACTIVITY_CONFIGS_KEY)
    .map(normalizeWorkflowActivityConfig)
    .map(activityConfigToElementConfig)

  const merged = dedupeElementConfigs([
    ...legacyActivityConfigs,
    ...legacyElementConfigs,
    ...primary,
  ])

  if (JSON.stringify(primary) !== JSON.stringify(merged)) {
    saveWorkflowElementConfigs(merged)
  }

  return merged
}

export function saveWorkflowElementConfigs(items: WorkflowElementConfig[]) {
  const normalized = dedupeElementConfigs(items)
  writeStorage(ELEMENT_CONFIGS_KEY, JSON.stringify(normalized))
}

export function getElementConfigsByWorkflow(workflowId: string) {
  return loadWorkflowElementConfigs().filter((item) => item.workflowId === workflowId)
}

export function getWorkflowElementConfig(workflowId: string, elementId: string) {
  return (
    loadWorkflowElementConfigs().find(
      (item) => item.workflowId === workflowId && item.elementId === elementId,
    ) ?? null
  )
}

export function getElementConfig(workflowId: string, elementId: string) {
  return getWorkflowElementConfig(workflowId, elementId)
}

export function upsertElementConfig(
  values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const current = loadWorkflowElementConfigs()
  const index = current.findIndex(
    (item) =>
      item.workflowId === values.workflowId &&
      item.elementId === values.elementId,
  )

  const now = new Date().toISOString()

  const nextItem: WorkflowElementConfig = normalizeWorkflowElementConfig(
    index >= 0
      ? {
        ...current[index],
        ...values,
        updatedAt: now,
      }
      : {
        ...values,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
      },
  )

  const nextConfigs = [...current]

  if (index >= 0) {
    nextConfigs[index] = nextItem
  } else {
    nextConfigs.unshift(nextItem)
  }

  saveWorkflowElementConfigs(nextConfigs)
  return nextItem
}

export function removeMissingElementConfigs(
  workflowId: string,
  validElementIds: string[],
) {
  const validIdsSet = new Set(validElementIds)
  const nextConfigs = loadWorkflowElementConfigs().filter((item) => {
    if (item.workflowId !== workflowId) return true
    return validIdsSet.has(item.elementId)
  })

  saveWorkflowElementConfigs(nextConfigs)
}

export function loadWorkflowActivityConfigs(): WorkflowActivityConfig[] {
  return loadWorkflowElementConfigs()
    .map(elementConfigToActivityConfig)
    .filter((item): item is WorkflowActivityConfig => item !== null)
}

export function saveWorkflowActivityConfigs(items: WorkflowActivityConfig[]) {
  const currentNonActivities = loadWorkflowElementConfigs().filter(
    (item) => item.kind !== 'activity',
  )

  const nextActivities = items
    .map(normalizeWorkflowActivityConfig)
    .map(activityConfigToElementConfig)

  saveWorkflowElementConfigs([...currentNonActivities, ...nextActivities])
}

export function getActivityConfigsByWorkflow(workflowId: string) {
  return loadWorkflowActivityConfigs().filter((item) => item.workflowId === workflowId)
}

export function getActivityConfig(workflowId: string, elementId: string) {
  return (
    loadWorkflowActivityConfigs().find(
      (item) => item.workflowId === workflowId && item.elementId === elementId,
    ) ?? null
  )
}

export function upsertActivityConfig(
  input: Omit<WorkflowActivityConfig, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const normalized = normalizeWorkflowActivityConfig({
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })

  return upsertElementConfig({
    workflowId: normalized.workflowId,
    elementId: normalized.elementId,
    elementType: normalized.elementType,
    elementName: normalized.elementName,
    kind: 'activity',
    config: buildActivityElementConfigPayload(normalized),
  })
}

export function removeMissingActivityConfigs(
  workflowId: string,
  validElementIds: string[],
) {
  const validIdsSet = new Set(validElementIds)

  const nextConfigs = loadWorkflowElementConfigs().filter((item) => {
    if (item.workflowId !== workflowId) return true
    if (item.kind !== 'activity') return true
    return validIdsSet.has(item.elementId)
  })

  saveWorkflowElementConfigs(nextConfigs)
}

export function loadWorkflowSnapshots(): WorkflowVersionSnapshot[] {
  const raw = readArrayFromStorage(SNAPSHOTS_KEY)
  return Array.isArray(raw) ? raw.map(normalizeSnapshot) : []
}

export function saveWorkflowSnapshots(items: WorkflowVersionSnapshot[]) {
  writeStorage(
    SNAPSHOTS_KEY,
    JSON.stringify(items.map(normalizeSnapshot)),
  )
}

export function listWorkflowSnapshots(workflowId: string) {
  return loadWorkflowSnapshots()
    .filter((item) => item.workflowId === workflowId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export function createWorkflowSnapshot(input: {
  workflow: WorkflowDefinition
  versionLabel: string
  note?: string
  elementConfigs?: WorkflowElementConfig[]
  activityConfigs?: WorkflowActivityConfig[]
}) {
  const items = loadWorkflowSnapshots()

  const normalizedElementConfigs = input.elementConfigs
    ? input.elementConfigs.map(normalizeWorkflowElementConfig)
    : (input.activityConfigs ?? [])
      .map(normalizeWorkflowActivityConfig)
      .map(activityConfigToElementConfig)

  const snapshot = normalizeSnapshot({
    id: crypto.randomUUID(),
    workflowId: input.workflow.id,
    versionLabel: input.versionLabel,
    note: input.note,
    workflow: input.workflow,
    elementConfigs: normalizedElementConfigs,
    createdAt: new Date().toISOString(),
  })

  items.unshift(snapshot)
  saveWorkflowSnapshots(items)

  return snapshot
}

export function restoreWorkflowSnapshot(snapshotId: string) {
  const snapshot = loadWorkflowSnapshots().find((item) => item.id === snapshotId)
  if (!snapshot) return null

  upsertWorkflow({
    ...snapshot.workflow,
    updatedAt: new Date().toISOString(),
  })

  const allConfigs = loadWorkflowElementConfigs().filter(
    (item) => item.workflowId !== snapshot.workflowId,
  )

  const restoredConfigs = snapshot.elementConfigs.map((item) =>
    normalizeWorkflowElementConfig({
      ...item,
      updatedAt: new Date().toISOString(),
    }),
  )

  saveWorkflowElementConfigs([...allConfigs, ...restoredConfigs])

  return snapshot
}