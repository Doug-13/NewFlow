// ─── Tipos base ───────────────────────────────────────────────────────────────

export type ScopeLevel = 'account' | 'process'
export type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived'

export type WorkflowPermissionEntry = {
  userIds: string[]
  groupIds: string[]
  processIds: string[]
  areaIds: string[]
  disciplineIds: string[]
  roleIds: string[]
}

export type WorkflowPermissions = {
  visualization: WorkflowPermissionEntry
  creation: WorkflowPermissionEntry
}

export type PlatformAdmin = {
  id: string
  name: string
  email: string
  password: string
  isActive: boolean
}

export type Account = {
  id: string
  code: string
  name: string
  legalName?: string
  documentNumber?: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export type AccountModule = {
  id: string
  accountId: string
  code: string
  name: string
  isEnabled: boolean
  createdAt?: string
  updatedAt?: string
}

export type Process = {
  id: string
  accountId: string
  name: string
  code: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export type User = {
  id: string
  accountId: string
  accountName?: string
  name: string
  email: string
  password: string
  role: string
  cpf: string
  phone: string
  department: string
  jobTitle: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  notes: string
  status: string
  substituteId?: string | null
  substituteName?: string | null
  defaultProcessId?: string | null
}

export type UserAccountMembership = {
  id: string
  accountId: string
  userId: string
  role: string
  isDefault: boolean
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

export type UserProcessMembership = {
  id: string
  accountId: string
  userId: string
  processId: string
  processName: string
  role: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
}

// ─── Organização ──────────────────────────────────────────────────────────────

export type OrganizationArea = {
  id: string
  accountId: string
  processId: string
  processName: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  code?: string
}

export type OrganizationDiscipline = {
  id: string
  accountId: string
  processId: string
  processName: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  code?: string
}

export type OrganizationRole = {
  id: string
  accountId: string
  processId: string
  processName: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  code?: string
}

export type OrganizationGroup = {
  id: string
  accountId: string
  processId: string
  processName: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  updatedAt?: string
  code?: string
  memberIds?: string[]
}

// ─── Workflow ─────────────────────────────────────────────────────────────────

export type WorkflowResponsible = {
  type: 'user' | 'role' | 'group' | 'dynamic'
  id?: string
  name: string
}

export type WorkflowMetadataField = {
  name: string
  label: string
  type: string
  required: boolean
  readOnly?: boolean
  options?: Array<string | { value: string; label: string }>
}

export type WorkflowTransition = {
  toStepOrderIndex: number
  triggerAction: string
}

export type WorkflowStep = {
  id: string
  name: string
  description?: string
  orderIndex: number
  isInitial: boolean
  isFinal: boolean
  slaHours: number | null
  allowedActions: string[]
  receivesNotification?: boolean
  requiredNotification?: boolean
  notificationTemplateIds?: string[]
  notificationTemplateNames?: string[]
  responsibles: WorkflowResponsible[]
  metadata: WorkflowMetadataField[]
  transitions: WorkflowTransition[]
}

export type Workflow = {
  id: string
  accountId: string
  processId?: string | null
  processName?: string | null
  scopeLevel: ScopeLevel
  name: string
  description: string
  version?: string
  status?: WorkflowStatus
  bpmnXml?: string
  stepsCount?: number
  permissions?: WorkflowPermissions
  isActive: boolean
  createdAt: string
  updatedAt?: string
  publishedAt?: string
  steps: WorkflowStep[]
}

// ─── Metadados ────────────────────────────────────────────────────────────────

export type MetadataSet = {
  id: string
  accountId: string
  processId?: string | null
  processName?: string | null
  scopeLevel: ScopeLevel
  name: string
  code: string
  description: string
  isActive: boolean
  orderIndex: number
  createdAt?: string
  updatedAt?: string
}

export type MetadataDefinition = {
  id: string
  accountId: string
  processId?: string | null
  processName?: string | null
  scopeLevel: ScopeLevel
  metadataSetId: string
  metadataSetName: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  isReadOnly?: boolean
  isActive: boolean
  orderIndex: number
  multipleSelection?: boolean
  options: Array<{ value: string; label: string }>
  createdAt?: string
  updatedAt?: string
}

export type MetadataValue = {
  id: string
  accountId: string
  processId: string
  documentInstanceId: string
  metadataDefinitionId: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  value: unknown
  createdAt?: string
  updatedAt?: string
}

// ─── Notificações ─────────────────────────────────────────────────────────────

export type NotificationTemplateRecord = {
  id: string
  accountId: string
  processId?: string | null
  processName?: string | null
  scopeLevel: ScopeLevel
  name: string
  code: string
  description: string
  channel: string
  subject: string
  body: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

// ─── Documentos ───────────────────────────────────────────────────────────────

export type DocumentInstance = {
  id: string
  accountId: string
  processId: string
  processName: string
  title: string
  code: string
  status: string
  workflowId: string
  workflowName?: string
  currentStepName: string | null
  currentStepOrderIndex: number | null
  responsibleId: string
  responsibleName: string
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
  dueDate: string | null
  /** Revisão do documento (ex: "00", "01", "A", "B") — gerada automaticamente */
  revision?: string | null
  /** ID do documento raiz desta revisão (null = é o documento original) */
  parentDocumentId?: string | null
  /** Steps salvos do localStorage para enriquecimento */
  _steps?: Array<Record<string, unknown>>
}

export type TaskAction = {
  id: string
  label: string
  color: string
  outcome: string
  requiresComment: boolean
}

export type Task = {
  id: string
  accountId: string
  processId: string
  processName: string
  documentInstanceId: string
  documentTitle: string
  documentCode: string
  stepName: string
  stepOrderIndex: number
  assignedUserId: string
  assignedUserName: string
  assignedUserNames?: string[]
  status: string
  allowedActions: string[]
  taskActions?: TaskAction[]
  deadlineMode?: string
  deadlineValue?: number | string
  dueDate: string | null
  createdAt: string
  updatedAt?: string
  completedAt: string | null
  comment: string | null
  actionTaken?: string | null
}

export type AuditLog = {
  id: string
  documentInstanceId: string
  action: string
  stepName?: string | null
  userName?: string | null
  comment?: string | null
  createdAt: string
}

export type EnvironmentConfiguration = {
  id: string
  accountId: string
  tenantId: string
  name: string
  isDefault: boolean
  isActive: boolean
  codingRuleJson: { parts: Array<{ type: string; fixedValue?: string; separatorAfter?: string }> } | null
  sequentialDigits: number
  sequentialResetPeriod: 'never' | 'yearly' | 'monthly'
  sequentialCurrentValue: number
  sequentialLastPeriod: string
  totalProcessDays: number
  createdAt: string
  updatedAt?: string
}

export type DashboardSummary = {
  id: string
  accountId: string
  processId?: string | null
  processName?: string | null
  scopeLevel: ScopeLevel
  totalDocuments: number
  byStatus: Record<string, number>
  pendingTasks: number
  overdueTasks: number
  slaCompliance: number
  createdAt?: string
  updatedAt?: string
}

// ─── MockDatabase ─────────────────────────────────────────────────────────────

export type MockDatabase = {
  platformAdmins: PlatformAdmin[]
  accounts: Account[]
  accountModules: AccountModule[]
  processes: Process[]
  users: User[]
  userAccountMemberships: UserAccountMembership[]
  userProcessMemberships: UserProcessMembership[]
  organizationAreas: OrganizationArea[]
  organizationDisciplines: OrganizationDiscipline[]
  organizationRoles: OrganizationRole[]
  organizationGroups: OrganizationGroup[]
  documentInstances: DocumentInstance[]
  tasks: Task[]
  workflows: Workflow[]
  metadataSets: MetadataSet[]
  metadataDefinitions: MetadataDefinition[]
  metadataValues: MetadataValue[]
  notificationTemplates: NotificationTemplateRecord[]
  dashboards: DashboardSummary[]
  auditLogs: AuditLog[]
  environmentConfigurations: EnvironmentConfiguration[]
  visualizacoes: VisualizacaoRecord[]
  processoVisualizacoes: ProcessoVisualizacaoConfig[]
}

export type VisualizacaoRecord = {
  id: string
  nome: string
  apenasResponsavel: boolean
  exibirPendenciasAmbientes: boolean
  exibirRevisoesAnteriores: boolean
  mostrarPendenciasTreinamento: boolean
  mostrarPendenciasDistribuicao: boolean
  mostrarDocumentosCompartilhados: boolean
  mostrarItensSeguidos: boolean
  exibirAgrupamentosVazios: boolean
  exibirProgressoDatabook: boolean
  permiteRolagemHorizontal: boolean
  processosVinculados: string[]
  colunas: { metadataId: string; label: string; metadataSetName: string }[]
}

export type ProcessoVisualizacaoConfig = {
  id: string
  processId: string
  visualizacaoIdsAtivas: string[]
}

// ─── Helpers de escopo ────────────────────────────────────────────────────────

export type ScopeContext = {
  accountId: string
  processId?: string | null
}

type ScopedEntity = {
  accountId: string
  scopeLevel: ScopeLevel
  processId?: string | null
  isActive?: boolean
}

function getScopeWeight(scopeLevel: ScopeLevel): number {
  return scopeLevel === 'process' ? 2 : 1
}

export function matchesScope(entity: ScopedEntity, context: ScopeContext): boolean {
  if (entity.accountId !== context.accountId) return false
  if (entity.scopeLevel === 'account') return true
  return entity.processId === context.processId
}

export function resolveScopedRecords<T extends ScopedEntity>(records: T[], context: ScopeContext): T[] {
  return records
    .filter((r) => r.isActive !== false)
    .filter((r) => matchesScope(r, context))
    .sort((a, b) => getScopeWeight(b.scopeLevel) - getScopeWeight(a.scopeLevel))
}

export function resolveScopedRecord<T extends ScopedEntity>(records: T[], context: ScopeContext): T | null {
  return resolveScopedRecords(records, context)[0] ?? null
}

export function getUserProcessIds(memberships: UserProcessMembership[], userId: string): string[] {
  return memberships.filter((m) => m.userId === userId && m.isActive).map((m) => m.processId)
}

export function getUsersByProcess(users: User[], memberships: UserProcessMembership[], processId: string): User[] {
  const ids = new Set(memberships.filter((m) => m.processId === processId && m.isActive).map((m) => m.userId))
  return users.filter((u) => ids.has(u.id))
}

// ─── Dados mock ───────────────────────────────────────────────────────────────

export const MOCK_PLATFORM_ADMINS: PlatformAdmin[] = [
  { id: 'padmin-1', name: 'Admin Plataforma', email: 'admin@plataforma.local', password: 'Admin@123', isActive: true },
]

export const MOCK_ACCOUNTS: Account[] = [
  { id: 'account-1', code: 'acme-demo', name: 'Acme Demo', legalName: 'Acme Demo LTDA', documentNumber: '12.345.678/0001-90', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
]

export const MOCK_ACCOUNT_MODULES: AccountModule[] = [
  { id: 'am-1', accountId: 'account-1', code: 'workflows',              name: 'Workflows',    isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'am-2', accountId: 'account-1', code: 'tasks',                  name: 'Tarefas',      isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'am-3', accountId: 'account-1', code: 'organization',           name: 'Organização',  isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'am-4', accountId: 'account-1', code: 'metadata',               name: 'Metadados',    isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'am-5', accountId: 'account-1', code: 'users',                  name: 'Usuários',     isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'am-6', accountId: 'account-1', code: 'notification_templates', name: 'Notificações', isEnabled: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
]

export const MOCK_PROCESSES: Process[] = [
  { id: 'proc-1', accountId: 'account-1', name: 'Contratos Corporativos', code: 'CTR-CORP', description: 'Elaboração, revisão e aprovação de contratos',   isActive: true, createdAt: '2024-01-12T08:00:00Z', updatedAt: '2024-01-12T08:00:00Z' },
  { id: 'proc-2', accountId: 'account-1', name: 'Compras Estratégicas',   code: 'COM-EST',  description: 'Requisição, aprovação e contratação de compras', isActive: true, createdAt: '2024-01-12T08:00:00Z', updatedAt: '2024-01-12T08:00:00Z' },
  { id: 'proc-3', accountId: 'account-1', name: 'RH Corporativo',         code: 'RH-CORP',  description: 'Processos internos do RH corporativo',           isActive: true, createdAt: '2024-01-12T08:00:00Z', updatedAt: '2024-01-12T08:00:00Z' },
  { id: 'proc-4', accountId: 'account-1', name: 'Operação Comercial',     code: 'OCR',      description: 'Fluxos operacionais e comerciais',               isActive: true, createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'proc-5', accountId: 'account-1', name: 'Engenharia',             code: 'ENG',      description: 'Processos de engenharia e documentação técnica', isActive: true, createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
]

export const MOCK_USERS: User[] = [
  { id: 'user-admin',  accountId: 'account-1', accountName: 'Acme Demo', name: 'Admin Demo',        email: 'admin@demo.local',  password: 'Admin@123', role: 'Admin',    cpf: '',               phone: '',               department: 'TI',        jobTitle: 'Administrador do Sistema', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', notes: '', status: 'active',   substituteId: null, substituteName: null,                defaultProcessId: 'proc-1' },
  { id: 'user-gestor', accountId: 'account-1', accountName: 'Acme Demo', name: 'Gestor Demo',       email: 'gestor@demo.local', password: 'Admin@123', role: 'Gestor',   cpf: '',               phone: '',               department: 'Operações', jobTitle: 'Gestor Operacional',      isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', notes: '', status: 'active',   substituteId: null, substituteName: null,                defaultProcessId: 'proc-1' },
  { id: 'user-1',      accountId: 'account-1', accountName: 'Acme Demo', name: 'Carlos Mendes',     email: 'carlos@acme.com',   password: 'Admin@123', role: 'Operador', cpf: '123.456.789-00', phone: '(11) 99999-0001', department: 'Jurídico',  jobTitle: 'Advogado Sênior',         isActive: true, createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z', notes: '', status: 'active',   substituteId: 'user-2', substituteName: 'Fernanda Oliveira', defaultProcessId: 'proc-1' },
  { id: 'user-2',      accountId: 'account-1', accountName: 'Acme Demo', name: 'Fernanda Oliveira', email: 'fernanda@acme.com', password: 'Admin@123', role: 'Operador', cpf: '234.567.890-00', phone: '(11) 99999-0002', department: 'Compras',   jobTitle: 'Analista de Compras',     isActive: true, createdAt: '2024-01-20T08:00:00Z', updatedAt: '2024-01-20T08:00:00Z', notes: '', status: 'absent',   substituteId: 'user-3', substituteName: 'Ricardo Alves',     defaultProcessId: 'proc-2' },
  { id: 'user-3',      accountId: 'account-1', accountName: 'Acme Demo', name: 'Ricardo Alves',     email: 'ricardo@acme.com',  password: 'Admin@123', role: 'Gestor',   cpf: '345.678.901-00', phone: '(11) 99999-0003', department: 'Compras',   jobTitle: 'Gerente de Compras',      isActive: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2024-02-01T08:00:00Z', notes: '', status: 'active',   substituteId: null, substituteName: null,                defaultProcessId: 'proc-2' },
  { id: 'user-4',      accountId: 'account-1', accountName: 'Acme Demo', name: 'Ana Paula Lima',    email: 'ana@acme.com',      password: 'Admin@123', role: 'Operador', cpf: '456.789.012-00', phone: '(11) 99999-0004', department: 'Financeiro',jobTitle: 'Controller',              isActive: true, createdAt: '2024-02-10T08:00:00Z', updatedAt: '2024-02-10T08:00:00Z', notes: '', status: 'active',   substituteId: null, substituteName: null,                defaultProcessId: 'proc-2' },
  { id: 'user-5',      accountId: 'account-1', accountName: 'Acme Demo', name: 'Marcos Souza',      email: 'marcos@acme.com',   password: 'Admin@123', role: 'Operador', cpf: '567.890.123-00', phone: '(11) 99999-0005', department: 'RH',        jobTitle: 'HRBP',                    isActive: true, createdAt: '2024-03-01T08:00:00Z', updatedAt: '2024-03-01T08:00:00Z', notes: '', status: 'inactive', substituteId: null, substituteName: null,                defaultProcessId: 'proc-3' },
]

export const MOCK_USER_ACCOUNT_MEMBERSHIPS: UserAccountMembership[] = [
  { id: 'uam-1', accountId: 'account-1', userId: 'user-admin',  role: 'Admin',    isDefault: true, isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'uam-2', accountId: 'account-1', userId: 'user-gestor', role: 'Gestor',   isDefault: true, isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'uam-3', accountId: 'account-1', userId: 'user-1',      role: 'Operador', isDefault: true, isActive: true, createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'uam-4', accountId: 'account-1', userId: 'user-2',      role: 'Operador', isDefault: true, isActive: true, createdAt: '2024-01-20T08:00:00Z', updatedAt: '2024-01-20T08:00:00Z' },
  { id: 'uam-5', accountId: 'account-1', userId: 'user-3',      role: 'Gestor',   isDefault: true, isActive: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2024-02-01T08:00:00Z' },
  { id: 'uam-6', accountId: 'account-1', userId: 'user-4',      role: 'Operador', isDefault: true, isActive: true, createdAt: '2024-02-10T08:00:00Z', updatedAt: '2024-02-10T08:00:00Z' },
  { id: 'uam-7', accountId: 'account-1', userId: 'user-5',      role: 'Operador', isDefault: true, isActive: true, createdAt: '2024-03-01T08:00:00Z', updatedAt: '2024-03-01T08:00:00Z' },
]

export const MOCK_USER_PROCESS_MEMBERSHIPS: UserProcessMembership[] = [
  { id: 'upm-1', accountId: 'account-1', userId: 'user-admin',  processId: 'proc-1', processName: 'Contratos Corporativos', role: 'Admin',            isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'upm-2', accountId: 'account-1', userId: 'user-admin',  processId: 'proc-2', processName: 'Compras Estratégicas',   role: 'Admin',            isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'upm-3', accountId: 'account-1', userId: 'user-admin',  processId: 'proc-3', processName: 'RH Corporativo',         role: 'Admin',            isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'upm-4', accountId: 'account-1', userId: 'user-gestor', processId: 'proc-1', processName: 'Contratos Corporativos', role: 'Gestor',           isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z' },
  { id: 'upm-5', accountId: 'account-1', userId: 'user-1',      processId: 'proc-1', processName: 'Contratos Corporativos', role: 'Revisor Jurídico', isActive: true, createdAt: '2024-01-15T08:00:00Z', updatedAt: '2024-01-15T08:00:00Z' },
  { id: 'upm-6', accountId: 'account-1', userId: 'user-2',      processId: 'proc-2', processName: 'Compras Estratégicas',   role: 'Analista',         isActive: true, createdAt: '2024-01-20T08:00:00Z', updatedAt: '2024-01-20T08:00:00Z' },
  { id: 'upm-7', accountId: 'account-1', userId: 'user-3',      processId: 'proc-2', processName: 'Compras Estratégicas',   role: 'Aprovador',        isActive: true, createdAt: '2024-02-01T08:00:00Z', updatedAt: '2024-02-01T08:00:00Z' },
  { id: 'upm-8', accountId: 'account-1', userId: 'user-4',      processId: 'proc-2', processName: 'Compras Estratégicas',   role: 'Financeiro',       isActive: true, createdAt: '2024-02-10T08:00:00Z', updatedAt: '2024-02-10T08:00:00Z' },
  { id: 'upm-9', accountId: 'account-1', userId: 'user-5',      processId: 'proc-3', processName: 'RH Corporativo',         role: 'RH',               isActive: true, createdAt: '2024-03-01T08:00:00Z', updatedAt: '2024-03-01T08:00:00Z' },
]

export const MOCK_ORGANIZATION_AREAS: OrganizationArea[] = [
  { id: 'area-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', name: 'Jurídico',   description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'JUR' },
  { id: 'area-2', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Compras',    description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'COM' },
  { id: 'area-3', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Financeiro', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'FIN' },
  { id: 'area-4', accountId: 'account-1', processId: 'proc-3', processName: 'RH Corporativo',         name: 'RH',         description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'RH'  },
  { id: 'area-5', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',             name: 'Tecnologia', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'TI'  },
]

export const MOCK_ORGANIZATION_DISCIPLINES: OrganizationDiscipline[] = [
  { id: 'disc-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', name: 'Direito Contratual',    description: 'Contratos e acordos',            isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'DIR-CON' },
  { id: 'disc-2', accountId: 'account-1', processId: 'proc-3', processName: 'RH Corporativo',         name: 'Direito Trabalhista',    description: 'Relações de trabalho',           isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'DIR-TRB' },
  { id: 'disc-3', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Suprimentos',            description: 'Aquisição de bens e serviços',   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'SUP'     },
  { id: 'disc-4', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Controle Financeiro',    description: 'Orçamento e controlling',        isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'CTL'     },
  { id: 'disc-5', accountId: 'account-1', processId: 'proc-3', processName: 'RH Corporativo',         name: 'Gestão de Pessoas',      description: 'Recrutamento e desenvolvimento', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'GP'      },
  { id: 'disc-6', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',             name: 'Engenharia de Software', description: 'Desenvolvimento de sistemas',    isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'ENG-SW'  },
]

export const MOCK_ORGANIZATION_GROUPS: OrganizationGroup[] = [
  { id: 'group-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', name: 'Diretoria',   description: 'Grupo da diretoria executiva',   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'DIR',  memberIds: ['user-admin', 'user-gestor'] },
  { id: 'group-2', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Gestores',    description: 'Grupo de gestores operacionais', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'GEST', memberIds: ['user-3', 'user-gestor'] },
  { id: 'group-3', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Operacional', description: 'Grupo operacional geral',         isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'OPER', memberIds: ['user-2', 'user-4'] },
  { id: 'group-4', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',             name: 'Engenharia',  description: 'Equipe técnica',                  isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'ENG',  memberIds: ['user-admin'] },
]

export const MOCK_ORGANIZATION_ROLES: OrganizationRole[] = [
  { id: 'role-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', name: 'Advogado Sênior',      description: 'Responsável por revisões jurídicas', isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'ADV-SR'  },
  { id: 'role-2', accountId: 'account-1', processId: 'proc-3', processName: 'RH Corporativo',         name: 'Advogado Trabalhista',  description: 'Especialista em CLT e acordos',      isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'ADV-TRB' },
  { id: 'role-3', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Analista de Compras',   description: '',                                   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'ANA-COM' },
  { id: 'role-4', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Gerente de Compras',    description: '',                                   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'GER-COM' },
  { id: 'role-5', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas',   name: 'Controller',            description: '',                                   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'CTL'     },
  { id: 'role-6', accountId: 'account-1', processId: 'proc-3', processName: 'RH Corporativo',         name: 'HRBP',                  description: '',                                   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'HRBP'    },
  { id: 'role-7', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',             name: 'Desenvolvedor Sênior',  description: '',                                   isActive: true, createdAt: '2024-01-10T08:00:00Z', updatedAt: '2024-01-10T08:00:00Z', code: 'DEV-SR'  },
]

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', scopeLevel: 'process',
    name: 'Aprovação de Contratos', description: 'Fluxo padrão de análise, revisão jurídica e aprovação',
    version: '1.0', status: 'active', bpmnXml: '', stepsCount: 5, isActive: true,
    createdAt: '2024-01-20T08:00:00Z', updatedAt: '2024-01-20T08:00:00Z', publishedAt: '2024-01-20T08:00:00Z',
    permissions: {
      visualization: { userIds: [], groupIds: [], processIds: ['proc-1'], areaIds: [], disciplineIds: [], roleIds: [] },
      creation:      { userIds: [], groupIds: [], processIds: ['proc-1'], areaIds: [], disciplineIds: [], roleIds: [] },
    },
    steps: [
      { id: 'step-1', name: 'Solicitação',         orderIndex: 0, isInitial: true,  isFinal: false, slaHours: 8,    allowedActions: ['submit'],                      receivesNotification: true,  requiredNotification: false, notificationTemplateIds: ['ntf-1'], notificationTemplateNames: ['Documento aguardando aprovação'], responsibles: [{ type: 'dynamic', name: 'Solicitante' }], metadata: [{ name: 'supplier', label: 'Fornecedor', type: 'text', required: true }, { name: 'estimated_value', label: 'Valor Estimado', type: 'currency', required: true }, { name: 'contract_type', label: 'Tipo de Contrato', type: 'select', required: true, options: ['Prestação de Serviços', 'Fornecimento', 'Locação', 'NDA'] }], transitions: [{ toStepOrderIndex: 1, triggerAction: 'submit' }] },
      { id: 'step-2', name: 'Análise Inicial',     orderIndex: 1, isInitial: false, isFinal: false, slaHours: 16,   allowedActions: ['approve', 'return'],           receivesNotification: true,  requiredNotification: true,  notificationTemplateIds: ['ntf-1', 'ntf-2'], notificationTemplateNames: ['Documento aguardando aprovação', 'Documento devolvido para ajustes'], responsibles: [{ type: 'role', id: 'role-3', name: 'Analista de Compras' }], metadata: [], transitions: [{ toStepOrderIndex: 2, triggerAction: 'approve' }, { toStepOrderIndex: 0, triggerAction: 'return' }] },
      { id: 'step-3', name: 'Revisão Jurídica',    orderIndex: 2, isInitial: false, isFinal: false, slaHours: 16,   allowedActions: ['approve', 'reject', 'return'],  receivesNotification: true,  requiredNotification: true,  notificationTemplateIds: ['ntf-1', 'ntf-2'], notificationTemplateNames: ['Documento aguardando aprovação', 'Documento devolvido para ajustes'], responsibles: [{ type: 'role', id: 'role-1', name: 'Advogado Sênior' }], metadata: [{ name: 'legal_risk', label: 'Risco Jurídico', type: 'select', required: true, options: ['Baixo', 'Médio', 'Alto', 'Crítico'] }], transitions: [{ toStepOrderIndex: 3, triggerAction: 'approve' }, { toStepOrderIndex: 0, triggerAction: 'return' }] },
      { id: 'step-4', name: 'Aprovação Gerencial', orderIndex: 3, isInitial: false, isFinal: false, slaHours: 8,    allowedActions: ['approve', 'cancel'],           receivesNotification: true,  requiredNotification: true,  notificationTemplateIds: ['ntf-1'], notificationTemplateNames: ['Documento aguardando aprovação'], responsibles: [{ type: 'role', id: 'role-4', name: 'Gerente de Compras' }], metadata: [], transitions: [{ toStepOrderIndex: 4, triggerAction: 'approve' }] },
      { id: 'step-5', name: 'Publicação',           orderIndex: 4, isInitial: false, isFinal: true,  slaHours: null, allowedActions: ['publish'],                     receivesNotification: true,  requiredNotification: false, notificationTemplateIds: ['ntf-3'], notificationTemplateNames: ['Documento publicado'], responsibles: [], metadata: [], transitions: [] },
    ],
  },
  {
    id: 'wf-2', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas', scopeLevel: 'process',
    name: 'Pedido de Compra Estratégica', description: 'Fluxo do processo de compras estratégicas',
    version: '1.0', status: 'active', bpmnXml: '', stepsCount: 3, isActive: true,
    createdAt: '2024-01-25T08:00:00Z', updatedAt: '2024-01-25T08:00:00Z', publishedAt: '2024-01-25T08:00:00Z',
    permissions: {
      visualization: { userIds: [], groupIds: [], processIds: ['proc-2'], areaIds: [], disciplineIds: [], roleIds: [] },
      creation:      { userIds: [], groupIds: [], processIds: ['proc-2'], areaIds: [], disciplineIds: [], roleIds: [] },
    },
    steps: [
      { id: 'pc-step-1', name: 'Solicitação',       orderIndex: 0, isInitial: true,  isFinal: false, slaHours: 8,  allowedActions: ['submit'],           responsibles: [{ type: 'dynamic', name: 'Solicitante' }],                     metadata: [], transitions: [{ toStepOrderIndex: 1, triggerAction: 'submit' }] },
      { id: 'pc-step-2', name: 'Validação Compras', orderIndex: 1, isInitial: false, isFinal: false, slaHours: 24, allowedActions: ['approve', 'return'], responsibles: [{ type: 'role', id: 'role-3', name: 'Analista de Compras' }], metadata: [], transitions: [{ toStepOrderIndex: 2, triggerAction: 'approve' }, { toStepOrderIndex: 0, triggerAction: 'return' }] },
      { id: 'pc-step-3', name: 'Aprovação Final',   orderIndex: 2, isInitial: false, isFinal: true,  slaHours: 8,  allowedActions: ['approve', 'reject'], responsibles: [{ type: 'role', id: 'role-4', name: 'Gerente de Compras' }], metadata: [], transitions: [] },
    ],
  },
]

export const MOCK_METADATA_SETS: MetadataSet[] = [
  { id: 'mset-1', accountId: 'account-1', scopeLevel: 'account', name: 'Dados do Contrato', code: 'contract_data', description: 'Campos padrão de contratos', isActive: true, orderIndex: 1 },
  { id: 'mset-2', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas', scopeLevel: 'process', name: 'Dados de Compra',  code: 'purchase_data',  description: 'Campos do processo de compras',  isActive: true, orderIndex: 2 },
  { id: 'mset-3', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',           scopeLevel: 'process', name: 'Dados Técnicos',   code: 'technical_data', description: 'Campos de documentação técnica', isActive: true, orderIndex: 3 },
]

export const MOCK_METADATA_DEFINITIONS: MetadataDefinition[] = [
  { id: 'mdef-1', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'supplier',             label: 'Fornecedor / Contraparte', fieldType: 'text',     isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 1, options: [] },
  { id: 'mdef-2', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'estimated_value',      label: 'Valor Estimado',           fieldType: 'currency', isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 2, options: [] },
  { id: 'mdef-3', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'contract_type',        label: 'Tipo de Contrato',         fieldType: 'select',   isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 3, options: [{ value: 'service', label: 'Prestação de Serviços' }, { value: 'supply', label: 'Fornecimento' }, { value: 'rental', label: 'Locação' }, { value: 'nda', label: 'NDA' }] },
  { id: 'mdef-4', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'validity_start',       label: 'Início da Vigência',       fieldType: 'date',     isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 4, options: [] },
  { id: 'mdef-5', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'validity_end',         label: 'Fim da Vigência',          fieldType: 'date',     isRequired: false, isReadOnly: false, isActive: true, orderIndex: 5, options: [] },
  { id: 'mdef-6', accountId: 'account-1', scopeLevel: 'account', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'legal_risk',           label: 'Risco Jurídico',           fieldType: 'select',   isRequired: false, isReadOnly: false, isActive: true, orderIndex: 6, options: [{ value: 'low', label: 'Baixo' }, { value: 'medium', label: 'Médio' }, { value: 'high', label: 'Alto' }, { value: 'critical', label: 'Crítico' }] },
  { id: 'mdef-7', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas', scopeLevel: 'process', metadataSetId: 'mset-2', metadataSetName: 'Dados de Compra', name: 'item_description',    label: 'Descrição do Item',     fieldType: 'text',   isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 1, options: [] },
  { id: 'mdef-8', accountId: 'account-1', processId: 'proc-2', processName: 'Compras Estratégicas', scopeLevel: 'process', metadataSetId: 'mset-2', metadataSetName: 'Dados de Compra', name: 'quantity',            label: 'Quantidade',            fieldType: 'number', isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 2, options: [] },
  { id: 'mdef-9', accountId: 'account-1', processId: 'proc-5', processName: 'Engenharia',           scopeLevel: 'process', metadataSetId: 'mset-3', metadataSetName: 'Dados Técnicos',  name: 'engineering_revision', label: 'Revisão de Engenharia', fieldType: 'text',   isRequired: true,  isReadOnly: false, isActive: true, orderIndex: 1, options: [] },
]

export const MOCK_METADATA_VALUES: MetadataValue[] = [
  { id: 'mval-1', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1',      metadataDefinitionId: 'mdef-1', name: 'supplier',        label: 'Fornecedor / Contraparte', fieldType: 'text',     isRequired: true, value: 'Infra Corp Tecnologia LTDA' },
  { id: 'mval-2', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1',      metadataDefinitionId: 'mdef-2', name: 'estimated_value', label: 'Valor Estimado',           fieldType: 'currency', isRequired: true, value: 48000 },
  { id: 'mval-3', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1',      metadataDefinitionId: 'mdef-3', name: 'contract_type',   label: 'Tipo de Contrato',         fieldType: 'select',   isRequired: true, value: 'service' },
  { id: 'mval-4', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-2',      metadataDefinitionId: 'mdef-1', name: 'supplier',        label: 'Fornecedor / Contraparte', fieldType: 'text',     isRequired: true, value: 'Deloitte Consultores Ltda' },
  { id: 'mval-5', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-2',      metadataDefinitionId: 'mdef-2', name: 'estimated_value', label: 'Valor Estimado',           fieldType: 'currency', isRequired: true, value: 120000 },
  // Metadados da revisão 01 do doc-1 (herdados do original)
  { id: 'mval-6', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1-rev1', metadataDefinitionId: 'mdef-1', name: 'supplier',        label: 'Fornecedor / Contraparte', fieldType: 'text',     isRequired: true, value: 'Infra Corp Tecnologia LTDA' },
  { id: 'mval-7', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1-rev1', metadataDefinitionId: 'mdef-2', name: 'estimated_value', label: 'Valor Estimado',           fieldType: 'currency', isRequired: true, value: 52000 },
  { id: 'mval-8', accountId: 'account-1', processId: 'proc-1', documentInstanceId: 'doc-1-rev1', metadataDefinitionId: 'mdef-3', name: 'contract_type',   label: 'Tipo de Contrato',         fieldType: 'select',   isRequired: true, value: 'service' },
]

export const MOCK_NOTIFICATION_TEMPLATES: NotificationTemplateRecord[] = [
  { id: 'ntf-1', accountId: 'account-1', scopeLevel: 'account',  name: 'Documento aguardando aprovação',   code: 'DOCUMENTO_AGUARDANDO_APROVACAO',  description: 'Enviado quando o documento entra em etapa de aprovação.',     channel: 'email',    subject: 'Documento {{documento}} aguardando sua aprovação', body: 'Olá {{usuario}}, o documento {{documento}} aguarda ação na etapa {{etapa}}.', isActive: true, createdAt: '2024-11-01T09:00:00Z', updatedAt: '2024-11-01T09:00:00Z' },
  { id: 'ntf-2', accountId: 'account-1', scopeLevel: 'account',  name: 'Documento devolvido para ajustes', code: 'DOCUMENTO_DEVOLVIDO_PARA_AJUSTES', description: 'Utilizado quando o documento retorna para a etapa inicial.', channel: 'system',   subject: '', body: 'O documento {{documento}} foi devolvido para ajustes na etapa {{etapa}}.', isActive: true, createdAt: '2024-11-02T10:30:00Z', updatedAt: '2024-11-02T10:30:00Z' },
  { id: 'ntf-3', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', scopeLevel: 'process', name: 'Documento publicado', code: 'DOCUMENTO_PUBLICADO', description: 'Comunica a publicação ao responsável.', channel: 'whatsapp', subject: '', body: 'Olá {{usuario}}, o documento {{documento}} foi publicado.', isActive: true, createdAt: '2024-11-03T14:00:00Z', updatedAt: '2024-11-03T14:00:00Z' },
]

// ─── Documentos com revisão ───────────────────────────────────────────────────
// doc-1 = Revisão 00 (publicada/original)
// doc-1-rev1 = Revisão 01 (em andamento, é revisão do doc-1)
// Os demais não possuem revisões adicionais

export const MOCK_DOCUMENT_INSTANCES: DocumentInstance[] = [
  {
    id: 'doc-1',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'Contrato de Manutenção de TI - Infra Corp',
    code: 'CTR-2024-0001',
    revision: '00',
    parentDocumentId: null,
    status: 'published',
    workflowId: 'wf-1',
    currentStepName: null, currentStepOrderIndex: null,
    responsibleId: 'user-1', responsibleName: 'Carlos Mendes',
    createdById: 'user-2', createdByName: 'Fernanda Oliveira',
    createdAt: '2024-11-01T09:00:00Z', updatedAt: '2024-11-05T14:30:00Z', dueDate: '2024-11-15T23:59:00Z',
  },
  {
    id: 'doc-1-rev1',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'Contrato de Manutenção de TI - Infra Corp',
    code: 'CTR-2024-0006',
    revision: '01',
    parentDocumentId: 'doc-1',
    status: 'in_progress',
    workflowId: 'wf-1',
    currentStepName: 'Revisão Jurídica', currentStepOrderIndex: 2,
    responsibleId: 'user-1', responsibleName: 'Carlos Mendes',
    createdById: 'user-2', createdByName: 'Fernanda Oliveira',
    createdAt: '2024-12-01T09:00:00Z', updatedAt: '2024-12-05T14:30:00Z', dueDate: null,
  },
  {
    id: 'doc-2',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'Contrato de Consultoria Financeira - Deloitte',
    code: 'CTR-2024-0002',
    revision: '00',
    parentDocumentId: null,
    status: 'in_progress',
    workflowId: 'wf-1',
    currentStepName: 'Aprovação Gerencial', currentStepOrderIndex: 3,
    responsibleId: 'user-3', responsibleName: 'Ricardo Alves',
    createdById: 'user-4', createdByName: 'Ana Paula Lima',
    createdAt: '2024-10-20T10:00:00Z', updatedAt: '2024-11-06T11:00:00Z', dueDate: '2024-11-10T23:59:00Z',
  },
  {
    id: 'doc-3',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'NDA com Startup XYZ',
    code: 'CTR-2024-0003',
    revision: null,
    parentDocumentId: null,
    status: 'draft',
    workflowId: 'wf-1',
    currentStepName: 'Solicitação', currentStepOrderIndex: 0,
    responsibleId: 'user-1', responsibleName: 'Carlos Mendes',
    createdById: 'user-1', createdByName: 'Carlos Mendes',
    createdAt: '2024-11-07T08:00:00Z', updatedAt: '2024-11-07T08:00:00Z', dueDate: null,
  },
  {
    id: 'doc-4',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'Contrato de Locação de Equipamentos',
    code: 'CTR-2024-0004',
    revision: '00',
    parentDocumentId: null,
    status: 'published',
    workflowId: 'wf-1',
    currentStepName: null, currentStepOrderIndex: null,
    responsibleId: 'user-2', responsibleName: 'Fernanda Oliveira',
    createdById: 'user-2', createdByName: 'Fernanda Oliveira',
    createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-10-15T16:00:00Z', dueDate: '2024-10-20T23:59:00Z',
  },
  {
    id: 'doc-5',
    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos',
    title: 'Contrato Parceria Comercial - Global Trade',
    code: 'CTR-2024-0005',
    revision: '00',
    parentDocumentId: null,
    status: 'rejected',
    workflowId: 'wf-1',
    currentStepName: null, currentStepOrderIndex: null,
    responsibleId: 'user-1', responsibleName: 'Carlos Mendes',
    createdById: 'user-4', createdByName: 'Ana Paula Lima',
    createdAt: '2024-10-05T08:00:00Z', updatedAt: '2024-10-28T09:00:00Z', dueDate: '2024-10-30T23:59:00Z',
  },
]

export const MOCK_TASKS: Task[] = [
  { id: 'task-1', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', documentInstanceId: 'doc-1-rev1', documentTitle: 'Contrato de Manutenção de TI - Infra Corp',     documentCode: 'CTR-2024-0006', stepName: 'Revisão Jurídica',   stepOrderIndex: 2, assignedUserId: 'user-1', assignedUserName: 'Carlos Mendes',     status: 'pending',   allowedActions: ['approve', 'reject', 'return'], dueDate: '2024-12-08T23:59:00Z', createdAt: '2024-12-05T14:30:00Z', completedAt: null,                   comment: null },
  { id: 'task-2', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', documentInstanceId: 'doc-2',      documentTitle: 'Contrato de Consultoria Financeira - Deloitte', documentCode: 'CTR-2024-0002', stepName: 'Aprovação Gerencial', stepOrderIndex: 3, assignedUserId: 'user-3', assignedUserName: 'Ricardo Alves',    status: 'pending',   allowedActions: ['approve', 'cancel'],           dueDate: '2024-11-07T23:59:00Z', createdAt: '2024-11-05T10:00:00Z', completedAt: null,                   comment: null },
  { id: 'task-3', accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', documentInstanceId: 'doc-4',      documentTitle: 'Contrato de Locação de Equipamentos',           documentCode: 'CTR-2024-0004', stepName: 'Publicação',         stepOrderIndex: 5, assignedUserId: 'user-2', assignedUserName: 'Fernanda Oliveira', status: 'completed', allowedActions: [],                              dueDate: '2024-10-20T23:59:00Z', createdAt: '2024-10-14T09:00:00Z', completedAt: '2024-10-15T16:00:00Z', comment: 'Publicado com sucesso.' },
]

export const MOCK_DASHBOARDS: DashboardSummary[] = [
  { id: 'dashboard-account-1', accountId: 'account-1', scopeLevel: 'account',  totalDocuments: 6, byStatus: { draft: 1, in_progress: 2, published: 2, rejected: 1, cancelled: 0 }, pendingTasks: 2, overdueTasks: 1, slaCompliance: 78 },
  { id: 'dashboard-proc-1',    accountId: 'account-1', processId: 'proc-1', processName: 'Contratos Corporativos', scopeLevel: 'process', totalDocuments: 6, byStatus: { draft: 1, in_progress: 2, published: 2, rejected: 1, cancelled: 0 }, pendingTasks: 2, overdueTasks: 1, slaCompliance: 78 },
]

export const INITIAL_MOCK_DB: MockDatabase = {
  platformAdmins:            structuredClone(MOCK_PLATFORM_ADMINS),
  accounts:                  structuredClone(MOCK_ACCOUNTS),
  accountModules:            structuredClone(MOCK_ACCOUNT_MODULES),
  processes:                 structuredClone(MOCK_PROCESSES),
  users:                     structuredClone(MOCK_USERS),
  userAccountMemberships:    structuredClone(MOCK_USER_ACCOUNT_MEMBERSHIPS),
  userProcessMemberships:    structuredClone(MOCK_USER_PROCESS_MEMBERSHIPS),
  organizationAreas:         structuredClone(MOCK_ORGANIZATION_AREAS),
  organizationDisciplines:   structuredClone(MOCK_ORGANIZATION_DISCIPLINES),
  organizationRoles:         structuredClone(MOCK_ORGANIZATION_ROLES),
  organizationGroups:        structuredClone(MOCK_ORGANIZATION_GROUPS),
  documentInstances:         structuredClone(MOCK_DOCUMENT_INSTANCES),
  tasks:                     structuredClone(MOCK_TASKS),
  workflows:                 structuredClone(MOCK_WORKFLOWS),
  metadataSets:              structuredClone(MOCK_METADATA_SETS),
  metadataDefinitions:       structuredClone(MOCK_METADATA_DEFINITIONS),
  metadataValues:            structuredClone(MOCK_METADATA_VALUES),
  notificationTemplates:     structuredClone(MOCK_NOTIFICATION_TEMPLATES),
  dashboards:                structuredClone(MOCK_DASHBOARDS),
  auditLogs:                 [],
  environmentConfigurations: [],
  visualizacoes:             [],
  processoVisualizacoes:     [],
}