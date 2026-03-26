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
  userIds: [], groupIds: [], unitIds: [], areaIds: [], disciplineIds: [], roleIds: [],
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


export type WorkflowVersionSnapshot = {
  id: string
  workflowId: string
  versionLabel: string
  note?: string
  workflow: WorkflowDefinition
  activityConfigs: WorkflowActivityConfig[]
  createdAt: string
}

export type WorkflowValidationIssue = {
  id: string
  workflowId: string
  elementId?: string
  severity: 'error' | 'warning'
  code: string
  message: string
}
export type StartEventConfig = {
  initialMetadataDefinitionIds: string[]
  requiredAttachmentTypes: string[]
  notificationTemplateIds: string[]
  allowedStarterRoleIds: string[]
  instructions?: string
  formTitle?: string
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

/**
 * NotificationEventConfig
 *
 * Configuração exclusiva de elementos de NOTIFICAÇÃO DO FLUXO:
 *   bpmn:SendTask, bpmn:IntermediateThrowEvent, bpmn:IntermediateCatchEvent
 *
 * Diferença fundamental em relação a ActivityConfig:
 *   - NÃO tem executor humano  → sem assignmentMode / responsáveis
 *   - NÃO tem prazo de tarefa  → sem deadlineMode / deadlineValue
 *   - NÃO tem ações de decisão → sem allowApprove / actions
 *   É um disparo AUTOMÁTICO do fluxo: apenas template, canal e destinatários.
 */
export type NotificationEventConfig = {
  /** ID / slug do template de notificação */
  notificationTemplateId?: string
  /** Canal de envio */
  channel: 'email' | 'in-app' | 'whatsapp' | 'sms' | 'all'
  /** Destinatários por cargo / perfil */
  recipientRoleIds: string[]
  /** Destinatários por usuário específico */
  recipientUserIds: string[]
  /** Destinatários por área */
  recipientAreaIds: string[]
  /** Envia também para o iniciador do workflow */
  notifyInitiator: boolean
  /** Envia para todos os responsáveis da etapa anterior */
  notifyPreviousAssignees: boolean
  /** Assunto personalizado (sobrescreve o template) */
  customSubject?: string
  /** Corpo personalizado (sobrescreve o template) */
  customBody?: string
  /** Variáveis de contexto disponíveis para interpolação no template */
  contextVariables: string[]
}

/**
 * SystemTaskConfig
 *
 * Configuração da instância de uma tarefa de sistema (bpmn:ServiceTask) no fluxo.
 *
 * INTENCIONALMENTE SIMPLES: o "como" executar (campo de revisão, formato,
 * prefixo, regras de incremento) é definido na configuração do processo /
 * tipo documental, não aqui. Esta config apenas declara "o que" acontece
 * neste ponto do fluxo e permite personalizar notificações e observações
 * para fins de auditoria.
 *
 * Tipos de ação suportados pelo motor:
 *   increment-revision → incrementa a revisão conforme regra do processo
 *   set-metadata       → atribui valor a um metadado (regra no processo)
 *   copy-metadata      → copia valor entre metadados (regra no processo)
 *   http-request       → chama endpoint externo (URL configurada no processo)
 *   custom-script      → executa script definido no processo
 */
export type SystemTaskActionType =
  | 'increment-revision'
  | 'set-metadata'
  | 'copy-metadata'
  | 'http-request'
  | 'custom-script'

export type SystemTaskConfig = {
  /**
   * Tipo da ação — declara o que este ponto do fluxo faz.
   * Os parâmetros de execução (campo, formato, URL, script) ficam
   * na configuração do processo / tipo documental.
   */
  actionType: SystemTaskActionType

  /**
   * Observação de auditoria — aparece no histórico da instância e
   * no painel de validação. Descreve o efeito esperado neste ponto
   * do fluxo em linguagem de negócio.
   * Ex.: "Avança revisão do documento após aprovação gerencial."
   */
  auditNote?: string

  /** Notificações disparadas imediatamente após a execução */
  notificationTemplateIds: string[]
}

export type WorkflowElementConfig = {
  id: string
  workflowId: string
  elementId: string
  elementType: string
  elementName?: string
  kind: 'start' | 'activity' | 'gateway' | 'flow' | 'end' | 'notification' | 'system-task'
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

const WORKFLOWS_KEY = 'gestao-docs:workflows'
const ACTIVITY_CONFIGS_KEY = 'gestao-docs:workflow-activity-configs'
const SNAPSHOTS_KEY = 'gestao-docs:workflow-snapshots'

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
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
    permissions:
      item?.permissions && typeof item.permissions === 'object'
        ? item.permissions
        : undefined,
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

function normalizeActivityConfig(item: any): WorkflowActivityConfig {
  return {
    id: String(item?.id ?? crypto.randomUUID()),
    workflowId: String(item?.workflowId ?? ''),
    elementId: String(item?.elementId ?? ''),
    elementType: String(item?.elementType ?? ''),
    elementName:
      typeof item?.elementName === 'string' ? item.elementName : undefined,

    assignmentMode:
      item?.assignmentMode === 'user' ||
      item?.assignmentMode === 'role' ||
      item?.assignmentMode === 'area' ||
      item?.assignmentMode === 'function'
        ? item.assignmentMode
        : 'role',

    responsibleUserIds: Array.isArray(item?.responsibleUserIds)
      ? item.responsibleUserIds.filter((value: unknown) => typeof value === 'string')
      : [],
    responsibleRoleIds: Array.isArray(item?.responsibleRoleIds)
      ? item.responsibleRoleIds.filter((value: unknown) => typeof value === 'string')
      : [],
    responsibleAreaIds: Array.isArray(item?.responsibleAreaIds)
      ? item.responsibleAreaIds.filter((value: unknown) => typeof value === 'string')
      : [],
    responsibleFunctionIds: Array.isArray(item?.responsibleFunctionIds)
      ? item.responsibleFunctionIds.filter((value: unknown) => typeof value === 'string')
      : [],

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

    metadataDefinitionIds: Array.isArray(item?.metadataDefinitionIds)
      ? item.metadataDefinitionIds.filter((value: unknown) => typeof value === 'string')
      : [],
    notificationTemplateIds: Array.isArray(item?.notificationTemplateIds)
      ? item.notificationTemplateIds.filter((value: unknown) => typeof value === 'string')
      : [],

    allowApprove: Boolean(item?.allowApprove ?? true),
    allowReject: Boolean(item?.allowReject ?? true),
    allowRequestChanges: Boolean(item?.allowRequestChanges ?? true),
    allowForward: Boolean(item?.allowForward ?? false),

    instructions:
      typeof item?.instructions === 'string' ? item.instructions : undefined,
    helpText: typeof item?.helpText === 'string' ? item.helpText : undefined,

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

function normalizeSnapshot(item: any): WorkflowVersionSnapshot {
  return {
    id: String(item?.id ?? crypto.randomUUID()),
    workflowId: String(item?.workflowId ?? ''),
    versionLabel:
      typeof item?.versionLabel === 'string' && item.versionLabel.trim()
        ? item.versionLabel
        : 'Snapshot',
    note: typeof item?.note === 'string' ? item.note : undefined,
    workflow: normalizeWorkflow(item?.workflow ?? {}),
    activityConfigs: Array.isArray(item?.activityConfigs)
      ? item.activityConfigs.map(normalizeActivityConfig)
      : [],
    createdAt:
      typeof item?.createdAt === 'string'
        ? item.createdAt
        : new Date().toISOString(),
  }
}

export function loadWorkflows(): WorkflowDefinition[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(WORKFLOWS_KEY), [])
  return Array.isArray(raw) ? raw.map(normalizeWorkflow) : []
}

export function saveWorkflows(items: WorkflowDefinition[]) {
  localStorage.setItem(WORKFLOWS_KEY, JSON.stringify(items))
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

export function loadWorkflowActivityConfigs(): WorkflowActivityConfig[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(ACTIVITY_CONFIGS_KEY), [])
  return Array.isArray(raw) ? raw.map(normalizeActivityConfig) : []
}

export function saveWorkflowActivityConfigs(items: WorkflowActivityConfig[]) {
  localStorage.setItem(ACTIVITY_CONFIGS_KEY, JSON.stringify(items))
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
  const items = loadWorkflowActivityConfigs()
  const index = items.findIndex(
    (item) => item.workflowId === input.workflowId && item.elementId === input.elementId,
  )
  const now = new Date().toISOString()

  if (index >= 0) {
    items[index] = normalizeActivityConfig({
      ...items[index],
      ...input,
      updatedAt: now,
    })
  } else {
    items.unshift(
      normalizeActivityConfig({
        id: crypto.randomUUID(),
        ...input,
        createdAt: now,
        updatedAt: now,
      }),
    )
  }

  saveWorkflowActivityConfigs(items)
}

export function removeMissingActivityConfigs(workflowId: string, validElementIds: string[]) {
  const items = loadWorkflowActivityConfigs()
  const nextItems = items.filter((item) => {
    if (item.workflowId !== workflowId) return true
    return validElementIds.includes(item.elementId)
  })

  saveWorkflowActivityConfigs(nextItems)
}

export function loadWorkflowSnapshots(): WorkflowVersionSnapshot[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(SNAPSHOTS_KEY), [])
  return Array.isArray(raw) ? raw.map(normalizeSnapshot) : []
}

export function saveWorkflowSnapshots(items: WorkflowVersionSnapshot[]) {
  localStorage.setItem(SNAPSHOTS_KEY, JSON.stringify(items))
}

export function listWorkflowSnapshots(workflowId: string) {
  return loadWorkflowSnapshots()
    .filter((item) => item.workflowId === workflowId)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt))
}

export function createWorkflowSnapshot(input: {
  workflow: WorkflowDefinition
  activityConfigs: WorkflowActivityConfig[]
  versionLabel: string
  note?: string
}) {
  const items = loadWorkflowSnapshots()

  const snapshot = normalizeSnapshot({
    id: crypto.randomUUID(),
    workflowId: input.workflow.id,
    versionLabel: input.versionLabel,
    note: input.note,
    workflow: input.workflow,
    activityConfigs: input.activityConfigs,
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

  const allConfigs = loadWorkflowActivityConfigs().filter(
    (item) => item.workflowId !== snapshot.workflowId,
  )

  const restoredConfigs = snapshot.activityConfigs.map((item) =>
    normalizeActivityConfig({
      ...item,
      updatedAt: new Date().toISOString(),
    }),
  )

  saveWorkflowActivityConfigs([...allConfigs, ...restoredConfigs])

  return snapshot
}

/**
 * storage.patch.ts
 *
 * INSTRUÇÕES: aplique APENAS estas adições no seu storage.ts existente.
 * Não remova nenhum campo — os booleans allowApprove etc. são mantidos
 * para compatibilidade com snapshots e configs já salvas.
 *
 * ─────────────────────────────────────────────────────────────────────
 * PASSO 1 — Adicione estes dois tipos ANTES de ActivityConfig:
 * ─────────────────────────────────────────────────────────────────────
 */

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

/**
 * ─────────────────────────────────────────────────────────────────────
 * PASSO 2 — Em ActivityConfig, acrescente o campo opcional `actions?`
 *           ao final (antes do fechamento da chave).
 *           Todos os campos existentes ficam intactos.
 * ─────────────────────────────────────────────────────────────────────
 *
 * export type ActivityConfig = {
 *   assignmentMode: ...
 *   ...
 *   allowApprove: boolean        ← mantido
 *   allowReject: boolean         ← mantido
 *   allowRequestChanges: boolean ← mantido
 *   allowForward: boolean        ← mantido
 *   instructions?: string
 *   helpText?: string
 *   actions?: ActivityAction[]   ← ADICIONAR esta linha
 * }
 */

/**
 * ─────────────────────────────────────────────────────────────────────
 * PASSO 3 — Em WorkflowActivityConfig, acrescente o campo opcional
 *           `actions?` e `linkedWorkflowId?` ao final.
 * ─────────────────────────────────────────────────────────────────────
 *
 * export type WorkflowActivityConfig = {
 *   ...
 *   allowApprove: boolean        ← mantido
 *   allowReject: boolean         ← mantido
 *   allowRequestChanges: boolean ← mantido
 *   allowForward: boolean        ← mantido
 *   instructions?: string
 *   helpText?: string
 *   actions?: ActivityAction[]         ← ADICIONAR
 *   linkedWorkflowId?: string          ← ADICIONAR (para SubProcess)
 *   sendTask?: SendTaskConfig          ← ADICIONAR (para SendTask)
 *   createdAt: string
 *   updatedAt: string
 * }
 */

/**
 * ─────────────────────────────────────────────────────────────────────
 * PASSO 4 — Adicione o tipo SendTaskConfig (novo, para SendTaskConfigPanel):
 * ─────────────────────────────────────────────────────────────────────
 */

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

export type ActivityConfig = {
  assignmentMode: 'user' | 'role' | 'area' | 'function'
  responsibleUserIds: string[]
  responsibleRoleIds: string[]
  responsibleAreaIds: string[]
  responsibleFunctionIds: string[]
  deadlineMode: 'hours' | 'days' | 'fixed-date'
  deadlineValue?: number | string
  metadataDefinitionIds: string[]
  notificationTemplateIds: string[]
  allowApprove: boolean
  allowReject: boolean
  allowRequestChanges: boolean
  allowForward: boolean
  instructions?: string
  helpText?: string
  actions?: ActivityAction[]        
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
  metadataDefinitionIds: string[]
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