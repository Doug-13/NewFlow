import type { NotificationTemplate } from '../types/notificationTemplates'

export type PlatformAdmin = {
  id: string
  name: string
  email: string
  password: string
  isActive: boolean
}

export type User = {
  id: string
  tenantId: string
  tenantName?: string
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
  notes: string
  status: string
  substituteId?: string | null
  substituteName?: string | null
  environments: string[]
}

export type TenantModule = {
  id: string
  tenantId: string
  code: string
  name: string
  isEnabled: boolean
}

export type OrganizationUnit = {
  id: string
  tenantId: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  code?: string
}

export type OrganizationArea = {
  id: string
  tenantId: string
  name: string
  description: string
  unitId: string
  unitName: string
  isActive: boolean
  createdAt: string
  code?: string
}

export type OrganizationDiscipline = {
  id: string
  tenantId: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  code?: string
}

export type OrganizationRole = {
  id: string
  tenantId: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  code?: string
}

export type DocumentInstance = {
  id: string
  tenantId: string
  title: string
  code: string
  status: string
  documentTypeId: string
  documentTypeName: string
  workflowId: string
  currentStepName: string | null
  currentStepOrderIndex: number | null
  responsibleId: string
  responsibleName: string
  createdById: string
  createdByName: string
  createdAt: string
  updatedAt: string
  dueDate: string | null
}

export type Task = {
  id: string
  tenantId: string
  documentInstanceId: string
  documentTitle: string
  documentCode: string
  stepName: string
  stepOrderIndex: number
  assignedUserId: string
  assignedUserName: string
  status: string
  allowedActions: string[]
  dueDate: string | null
  createdAt: string
  completedAt: string | null
  comment: string | null
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
  responsibles: Array<{ name: string }>
  metadata: Array<{
    name: string
    label: string
    type: string
    required: boolean
    options?: Array<string | { value: string; label: string }>
  }>
  transitions: Array<{
    toStepOrderIndex: number
    triggerAction: string
  }>
}

export type Workflow = {
  id: string
  tenantId: string
  name: string
  description: string
  isActive: boolean
  createdAt: string
  steps: WorkflowStep[]
}

export type DocumentType = {
  id: string
  tenantId: string
  name: string
  code: string
  description: string
  isActive: boolean
  createdAt: string
}

export type MetadataSet = {
  id: string
  tenantId: string
  name: string
  code: string
  description: string
  isActive: boolean
  orderIndex: number
}

export type MetadataDefinition = {
  id: string
  tenantId: string
  metadataSetId: string
  metadataSetName: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  isActive: boolean
  orderIndex: number
  options: Array<{ value: string; label: string }>
}

export type MetadataValue = {
  id: string
  documentInstanceId: string
  metadataDefinitionId: string
  name: string
  label: string
  fieldType: string
  isRequired: boolean
  value: unknown
}

export type DashboardSummary = {
  id: string
  tenantId: string
  totalDocuments: number
  byStatus: Record<string, number>
  pendingTasks: number
  overdueTasks: number
  slaCompliance: number
}

export type MockDatabase = {
  platformAdmins: PlatformAdmin[]
  users: User[]
  tenantModules: TenantModule[]
  organizationUnits: OrganizationUnit[]
  organizationAreas: OrganizationArea[]
  organizationDisciplines: OrganizationDiscipline[]
  organizationRoles: OrganizationRole[]
  documentInstances: DocumentInstance[]
  tasks: Task[]
  workflows: Workflow[]
  documentTypes: DocumentType[]
  metadataSets: MetadataSet[]
  metadataDefinitions: MetadataDefinition[]
  metadataValues: MetadataValue[]
  notificationTemplates: NotificationTemplate[]
  dashboard: DashboardSummary[]
}

export const MOCK_PLATFORM_ADMINS: PlatformAdmin[] = [
  {
    id: 'padmin-1',
    name: 'Admin Plataforma',
    email: 'admin@plataforma.local',
    password: 'Admin@123',
    isActive: true,
  },
]

export const MOCK_USERS: User[] = [
  { id: 'user-admin', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Admin Demo', email: 'admin@demo.local', password: 'Admin@123', role: 'Admin', cpf: '', phone: '', department: 'TI', jobTitle: 'Administrador do Sistema', isActive: true, createdAt: '2024-01-10T08:00:00Z', notes: '', status: 'active', substituteId: null, substituteName: null, environments: ['Web', 'Desktop'] },
  { id: 'user-gestor', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Gestor Demo', email: 'gestor@demo.local', password: 'Admin@123', role: 'Gestor', cpf: '', phone: '', department: 'Operações', jobTitle: 'Gestor Operacional', isActive: true, createdAt: '2024-01-10T08:00:00Z', notes: '', status: 'active', substituteId: null, substituteName: null, environments: ['Web'] },
  { id: 'user-1', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Carlos Mendes', email: 'carlos@acme.com', password: 'Admin@123', role: 'Operador', cpf: '123.456.789-00', phone: '(11) 99999-0001', department: 'Jurídico', jobTitle: 'Advogado Sênior', isActive: true, createdAt: '2024-01-15T08:00:00Z', notes: '', status: 'active', substituteId: 'user-2', substituteName: 'Fernanda Oliveira', environments: ['Web', 'Mobile'] },
  { id: 'user-2', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Fernanda Oliveira', email: 'fernanda@acme.com', password: 'Admin@123', role: 'Operador', cpf: '234.567.890-00', phone: '(11) 99999-0002', department: 'Compras', jobTitle: 'Analista de Compras', isActive: true, createdAt: '2024-01-20T08:00:00Z', notes: '', status: 'absent', substituteId: 'user-3', substituteName: 'Ricardo Alves', environments: ['Web'] },
  { id: 'user-3', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Ricardo Alves', email: 'ricardo@acme.com', password: 'Admin@123', role: 'Gestor', cpf: '345.678.901-00', phone: '(11) 99999-0003', department: 'Compras', jobTitle: 'Gerente de Compras', isActive: true, createdAt: '2024-02-01T08:00:00Z', notes: '', status: 'active', substituteId: null, substituteName: null, environments: ['Web', 'Desktop'] },
  { id: 'user-4', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Ana Paula Lima', email: 'ana@acme.com', password: 'Admin@123', role: 'Operador', cpf: '456.789.012-00', phone: '(11) 99999-0004', department: 'Financeiro', jobTitle: 'Controller', isActive: true, createdAt: '2024-02-10T08:00:00Z', notes: '', status: 'active', substituteId: null, substituteName: null, environments: ['Web'] },
  { id: 'user-5', tenantId: 'tenant-1', tenantName: 'Acme Demo', name: 'Marcos Souza', email: 'marcos@acme.com', password: 'Admin@123', role: 'Operador', cpf: '567.890.123-00', phone: '(11) 99999-0005', department: 'RH', jobTitle: 'HRBP', isActive: true, createdAt: '2024-03-01T08:00:00Z', notes: '', status: 'inactive', substituteId: null, substituteName: null, environments: ['Web'] },
]

export const MOCK_TENANT_MODULES: TenantModule[] = [
  { id: 'tm-1', tenantId: 'tenant-1', code: 'document_types', name: 'Tipos de Documento', isEnabled: true },
  { id: 'tm-2', tenantId: 'tenant-1', code: 'workflows', name: 'Workflows', isEnabled: true },
  { id: 'tm-3', tenantId: 'tenant-1', code: 'tasks', name: 'Tarefas', isEnabled: true },
  { id: 'tm-4', tenantId: 'tenant-1', code: 'organization', name: 'Organização', isEnabled: true },
  { id: 'tm-5', tenantId: 'tenant-1', code: 'metadata', name: 'Metadados', isEnabled: true },
  { id: 'tm-6', tenantId: 'tenant-1', code: 'users', name: 'Usuários', isEnabled: true },
  { id: 'tm-7', tenantId: 'tenant-1', code: 'notification_templates', name: 'Notificações', isEnabled: true },
]

export const MOCK_ORGANIZATION_UNITS: OrganizationUnit[] = [
  { id: 'unit-1', tenantId: 'tenant-1', name: 'Matriz São Paulo', description: 'Sede principal', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'MSP' },
  { id: 'unit-2', tenantId: 'tenant-1', name: 'Filial Rio de Janeiro', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'FRJ' },
  { id: 'unit-3', tenantId: 'tenant-1', name: 'Filial Curitiba', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'FCW' },
]

export const MOCK_ORGANIZATION_AREAS: OrganizationArea[] = [
  { id: 'area-1', tenantId: 'tenant-1', name: 'Jurídico', description: '', unitId: 'unit-1', unitName: 'Matriz São Paulo', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'JUR' },
  { id: 'area-2', tenantId: 'tenant-1', name: 'Compras', description: '', unitId: 'unit-1', unitName: 'Matriz São Paulo', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'COM' },
  { id: 'area-3', tenantId: 'tenant-1', name: 'Financeiro', description: '', unitId: 'unit-1', unitName: 'Matriz São Paulo', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'FIN' },
  { id: 'area-4', tenantId: 'tenant-1', name: 'RH', description: '', unitId: 'unit-1', unitName: 'Matriz São Paulo', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'RH' },
  { id: 'area-5', tenantId: 'tenant-1', name: 'Tecnologia', description: '', unitId: 'unit-1', unitName: 'Matriz São Paulo', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'TI' },
]

export const MOCK_ORGANIZATION_DISCIPLINES: OrganizationDiscipline[] = [
  { id: 'disc-1', tenantId: 'tenant-1', name: 'Direito Contratual', description: 'Contratos e acordos', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'DIR-CON' },
  { id: 'disc-2', tenantId: 'tenant-1', name: 'Direito Trabalhista', description: 'Relações de trabalho', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'DIR-TRB' },
  { id: 'disc-3', tenantId: 'tenant-1', name: 'Suprimentos', description: 'Aquisição de bens e serviços', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'SUP' },
  { id: 'disc-4', tenantId: 'tenant-1', name: 'Controle Financeiro', description: 'Orçamento e controlling', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'CTL' },
  { id: 'disc-5', tenantId: 'tenant-1', name: 'Gestão de Pessoas', description: 'Recrutamento e desenvolvimento', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'GP' },
  { id: 'disc-6', tenantId: 'tenant-1', name: 'Engenharia de Software', description: 'Desenvolvimento de sistemas', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'ENG-SW' },
]

export const MOCK_ORGANIZATION_ROLES: OrganizationRole[] = [
  { id: 'role-1', tenantId: 'tenant-1', name: 'Advogado Sênior', description: 'Responsável por revisões jurídicas', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'ADV-SR' },
  { id: 'role-2', tenantId: 'tenant-1', name: 'Advogado Trabalhista', description: 'Especialista em CLT e acordos', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'ADV-TRB' },
  { id: 'role-3', tenantId: 'tenant-1', name: 'Analista de Compras', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'ANA-COM' },
  { id: 'role-4', tenantId: 'tenant-1', name: 'Gerente de Compras', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'GER-COM' },
  { id: 'role-5', tenantId: 'tenant-1', name: 'Controller', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'CTL' },
  { id: 'role-6', tenantId: 'tenant-1', name: 'HRBP', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'HRBP' },
  { id: 'role-7', tenantId: 'tenant-1', name: 'Desenvolvedor Sênior', description: '', isActive: true, createdAt: '2024-01-10T08:00:00Z', code: 'DEV-SR' },
]

export const MOCK_DOCUMENT_INSTANCES: DocumentInstance[] = [
  { id: 'doc-1', tenantId: 'tenant-1', title: 'Contrato de Manutenção de TI - Infra Corp', code: 'CTR-2024-0001', status: 'in_progress', documentTypeId: 'doctype-1', documentTypeName: 'Contrato', workflowId: 'wf-1', currentStepName: 'Revisão Jurídica', currentStepOrderIndex: 2, responsibleId: 'user-1', responsibleName: 'Carlos Mendes', createdById: 'user-2', createdByName: 'Fernanda Oliveira', createdAt: '2024-11-01T09:00:00Z', updatedAt: '2024-11-05T14:30:00Z', dueDate: '2024-11-15T23:59:00Z' },
  { id: 'doc-2', tenantId: 'tenant-1', title: 'Contrato de Consultoria Financeira - Deloitte', code: 'CTR-2024-0002', status: 'in_progress', documentTypeId: 'doctype-1', documentTypeName: 'Contrato', workflowId: 'wf-1', currentStepName: 'Aprovação Gerencial', currentStepOrderIndex: 3, responsibleId: 'user-3', responsibleName: 'Ricardo Alves', createdById: 'user-4', createdByName: 'Ana Paula Lima', createdAt: '2024-10-20T10:00:00Z', updatedAt: '2024-11-06T11:00:00Z', dueDate: '2024-11-10T23:59:00Z' },
  { id: 'doc-3', tenantId: 'tenant-1', title: 'NDA com Startup XYZ', code: 'CTR-2024-0003', status: 'draft', documentTypeId: 'doctype-1', documentTypeName: 'Contrato', workflowId: 'wf-1', currentStepName: 'Solicitação', currentStepOrderIndex: 0, responsibleId: 'user-1', responsibleName: 'Carlos Mendes', createdById: 'user-1', createdByName: 'Carlos Mendes', createdAt: '2024-11-07T08:00:00Z', updatedAt: '2024-11-07T08:00:00Z', dueDate: null },
  { id: 'doc-4', tenantId: 'tenant-1', title: 'Contrato de Locação de Equipamentos', code: 'CTR-2024-0004', status: 'published', documentTypeId: 'doctype-1', documentTypeName: 'Contrato', workflowId: 'wf-1', currentStepName: null, currentStepOrderIndex: null, responsibleId: 'user-2', responsibleName: 'Fernanda Oliveira', createdById: 'user-2', createdByName: 'Fernanda Oliveira', createdAt: '2024-09-01T08:00:00Z', updatedAt: '2024-10-15T16:00:00Z', dueDate: '2024-10-20T23:59:00Z' },
  { id: 'doc-5', tenantId: 'tenant-1', title: 'Contrato Parceria Comercial - Global Trade', code: 'CTR-2024-0005', status: 'rejected', documentTypeId: 'doctype-1', documentTypeName: 'Contrato', workflowId: 'wf-1', currentStepName: null, currentStepOrderIndex: null, responsibleId: 'user-1', responsibleName: 'Carlos Mendes', createdById: 'user-4', createdByName: 'Ana Paula Lima', createdAt: '2024-10-05T08:00:00Z', updatedAt: '2024-10-28T09:00:00Z', dueDate: '2024-10-30T23:59:00Z' },
]

export const MOCK_TASKS: Task[] = [
  { id: 'task-1', tenantId: 'tenant-1', documentInstanceId: 'doc-1', documentTitle: 'Contrato de Manutenção de TI - Infra Corp', documentCode: 'CTR-2024-0001', stepName: 'Revisão Jurídica', stepOrderIndex: 2, assignedUserId: 'user-1', assignedUserName: 'Carlos Mendes', status: 'pending', allowedActions: ['approve', 'reject', 'return'], dueDate: '2024-11-08T23:59:00Z', createdAt: '2024-11-05T14:30:00Z', completedAt: null, comment: null },
  { id: 'task-2', tenantId: 'tenant-1', documentInstanceId: 'doc-2', documentTitle: 'Contrato de Consultoria Financeira - Deloitte', documentCode: 'CTR-2024-0002', stepName: 'Aprovação Gerencial', stepOrderIndex: 3, assignedUserId: 'user-3', assignedUserName: 'Ricardo Alves', status: 'pending', allowedActions: ['approve', 'cancel'], dueDate: '2024-11-07T23:59:00Z', createdAt: '2024-11-05T10:00:00Z', completedAt: null, comment: null },
  { id: 'task-3', tenantId: 'tenant-1', documentInstanceId: 'doc-4', documentTitle: 'Contrato de Locação de Equipamentos', documentCode: 'CTR-2024-0004', stepName: 'Publicação', stepOrderIndex: 5, assignedUserId: 'user-2', assignedUserName: 'Fernanda Oliveira', status: 'completed', allowedActions: [], dueDate: '2024-10-20T23:59:00Z', createdAt: '2024-10-14T09:00:00Z', completedAt: '2024-10-15T16:00:00Z', comment: 'Publicado com sucesso.' },
]

export const MOCK_WORKFLOWS: Workflow[] = [
  {
    id: 'wf-1',
    tenantId: 'tenant-1',
    name: 'Aprovação de Contratos',
    description: 'Fluxo padrão de análise, revisão jurídica e aprovação de contratos',
    isActive: true,
    createdAt: '2024-01-20T08:00:00Z',
    steps: [
      { id: 'step-1', name: 'Solicitação', description: 'Abertura e preenchimento inicial', orderIndex: 0, isInitial: true, isFinal: false, slaHours: 8, allowedActions: ['submit'], receivesNotification: true, requiredNotification: false, notificationTemplateIds: ['ntf-1'], notificationTemplateNames: ['Documento aguardando aprovação'], responsibles: [{ name: 'Solicitante' }], metadata: [{ name: 'supplier', label: 'Fornecedor', type: 'text', required: true }, { name: 'estimated_value', label: 'Valor Estimado', type: 'currency', required: true }, { name: 'contract_type', label: 'Tipo de Contrato', type: 'select', required: true, options: ['Prestação de Serviços', 'Fornecimento', 'Locação', 'NDA'] }], transitions: [{ toStepOrderIndex: 1, triggerAction: 'submit' }] },
      { id: 'step-2', name: 'Análise Inicial', description: 'Validação dos dados', orderIndex: 1, isInitial: false, isFinal: false, slaHours: 16, allowedActions: ['approve', 'return'], receivesNotification: true, requiredNotification: true, notificationTemplateIds: ['ntf-1', 'ntf-2'], notificationTemplateNames: ['Documento aguardando aprovação', 'Documento devolvido para ajustes'], responsibles: [{ name: 'Analista de Compras' }], metadata: [], transitions: [{ toStepOrderIndex: 2, triggerAction: 'approve' }, { toStepOrderIndex: 0, triggerAction: 'return' }] },
      { id: 'step-3', name: 'Revisão Jurídica', description: 'Revisão de cláusulas', orderIndex: 2, isInitial: false, isFinal: false, slaHours: 16, allowedActions: ['approve', 'reject', 'return'], receivesNotification: true, requiredNotification: true, notificationTemplateIds: ['ntf-1', 'ntf-2'], notificationTemplateNames: ['Documento aguardando aprovação', 'Documento devolvido para ajustes'], responsibles: [{ name: 'Advogado Sênior' }], metadata: [{ name: 'legal_risk', label: 'Risco Jurídico', type: 'select', required: true, options: ['Baixo', 'Médio', 'Alto', 'Crítico'] }], transitions: [{ toStepOrderIndex: 3, triggerAction: 'approve' }, { toStepOrderIndex: 0, triggerAction: 'return' }] },
      { id: 'step-4', name: 'Aprovação Gerencial', description: 'Aprovação final', orderIndex: 3, isInitial: false, isFinal: false, slaHours: 8, allowedActions: ['approve', 'cancel'], receivesNotification: true, requiredNotification: true, notificationTemplateIds: ['ntf-1'], notificationTemplateNames: ['Documento aguardando aprovação'], responsibles: [{ name: 'Gerente de Compras' }], metadata: [], transitions: [{ toStepOrderIndex: 4, triggerAction: 'approve' }] },
      { id: 'step-5', name: 'Publicação', description: 'Publicação e arquivamento', orderIndex: 4, isInitial: false, isFinal: true, slaHours: null, allowedActions: ['publish'], receivesNotification: true, requiredNotification: false, notificationTemplateIds: ['ntf-3'], notificationTemplateNames: ['Documento publicado'], responsibles: [], metadata: [], transitions: [] },
    ],
  },
]

export const MOCK_DOCUMENT_TYPES: DocumentType[] = [
  { id: 'doctype-1', tenantId: 'tenant-1', name: 'Contrato', code: 'CTR', description: 'Contratos com fornecedores e parceiros', isActive: true, createdAt: '2024-01-12T08:00:00Z' },
  { id: 'doctype-2', tenantId: 'tenant-1', name: 'Pedido de Compra', code: 'PC', description: 'Solicitações e ordens de compra', isActive: true, createdAt: '2024-01-12T08:00:00Z' },
  { id: 'doctype-3', tenantId: 'tenant-1', name: 'Documento de RH', code: 'RH', description: 'Admissões, demissões, férias e outros', isActive: true, createdAt: '2024-01-12T08:00:00Z' },
  { id: 'doctype-4', tenantId: 'tenant-1', name: 'Relatório Técnico', code: 'RT', description: 'Relatórios e laudos técnicos', isActive: false, createdAt: '2024-02-01T08:00:00Z' },
]

export const MOCK_METADATA_SETS: MetadataSet[] = [
  { id: 'mset-1', tenantId: 'tenant-1', name: 'Dados do Contrato', code: 'contract_data', description: 'Campos para contratos', isActive: true, orderIndex: 1 },
  { id: 'mset-2', tenantId: 'tenant-1', name: 'Dados de Compra', code: 'purchase_data', description: 'Campos para pedidos de compra', isActive: true, orderIndex: 2 },
]

export const MOCK_METADATA_DEFINITIONS: MetadataDefinition[] = [
  { id: 'mdef-1', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'supplier', label: 'Fornecedor / Contraparte', fieldType: 'text', isRequired: true, isActive: true, orderIndex: 1, options: [] },
  { id: 'mdef-2', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'estimated_value', label: 'Valor Estimado', fieldType: 'currency', isRequired: true, isActive: true, orderIndex: 2, options: [] },
  { id: 'mdef-3', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'contract_type', label: 'Tipo de Contrato', fieldType: 'select', isRequired: true, isActive: true, orderIndex: 3, options: [{ value: 'service', label: 'Prestação de Serviços' }, { value: 'supply', label: 'Fornecimento de Produtos' }, { value: 'rental', label: 'Locação' }, { value: 'nda', label: 'NDA / Confidencialidade' }] },
  { id: 'mdef-4', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'validity_start', label: 'Início da Vigência', fieldType: 'date', isRequired: true, isActive: true, orderIndex: 4, options: [] },
  { id: 'mdef-5', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'validity_end', label: 'Fim da Vigência', fieldType: 'date', isRequired: false, isActive: true, orderIndex: 5, options: [] },
  { id: 'mdef-6', tenantId: 'tenant-1', metadataSetId: 'mset-1', metadataSetName: 'Dados do Contrato', name: 'legal_risk', label: 'Risco Jurídico', fieldType: 'select', isRequired: false, isActive: true, orderIndex: 6, options: [{ value: 'low', label: 'Baixo' }, { value: 'medium', label: 'Médio' }, { value: 'high', label: 'Alto' }, { value: 'critical', label: 'Crítico' }] },
  { id: 'mdef-7', tenantId: 'tenant-1', metadataSetId: 'mset-2', metadataSetName: 'Dados de Compra', name: 'item_description', label: 'Descrição do Item', fieldType: 'text', isRequired: true, isActive: true, orderIndex: 1, options: [] },
  { id: 'mdef-8', tenantId: 'tenant-1', metadataSetId: 'mset-2', metadataSetName: 'Dados de Compra', name: 'quantity', label: 'Quantidade', fieldType: 'number', isRequired: true, isActive: true, orderIndex: 2, options: [] },
]

export const MOCK_METADATA_VALUES: MetadataValue[] = [
  { id: 'mval-1', documentInstanceId: 'doc-1', metadataDefinitionId: 'mdef-1', name: 'supplier', label: 'Fornecedor / Contraparte', fieldType: 'text', isRequired: true, value: 'Infra Corp Tecnologia LTDA' },
  { id: 'mval-2', documentInstanceId: 'doc-1', metadataDefinitionId: 'mdef-2', name: 'estimated_value', label: 'Valor Estimado', fieldType: 'currency', isRequired: true, value: 48000 },
  { id: 'mval-3', documentInstanceId: 'doc-1', metadataDefinitionId: 'mdef-3', name: 'contract_type', label: 'Tipo de Contrato', fieldType: 'select', isRequired: true, value: 'service' },
  { id: 'mval-4', documentInstanceId: 'doc-2', metadataDefinitionId: 'mdef-1', name: 'supplier', label: 'Fornecedor / Contraparte', fieldType: 'text', isRequired: true, value: 'Deloitte Consultores Ltda' },
  { id: 'mval-5', documentInstanceId: 'doc-2', metadataDefinitionId: 'mdef-2', name: 'estimated_value', label: 'Valor Estimado', fieldType: 'currency', isRequired: true, value: 120000 },
]

export const MOCK_NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: 'ntf-1',
    tenantId: 'tenant-1',
    name: 'Documento aguardando aprovação',
    code: 'DOCUMENTO_AGUARDANDO_APROVACAO',
    description: 'Enviado quando o documento entra em uma etapa de aprovação.',
    channel: 'email',
    subject: 'Documento {{documento}} aguardando sua aprovação',
    body: 'Olá {{usuario}}, o documento {{documento}} está aguardando sua ação na etapa {{etapa}} do workflow {{workflow}}.',
    isActive: true,
    createdAt: '2024-11-01T09:00:00Z',
    updatedAt: '2024-11-01T09:00:00Z',
  },
  {
    id: 'ntf-2',
    tenantId: 'tenant-1',
    name: 'Documento devolvido para ajustes',
    code: 'DOCUMENTO_DEVOLVIDO_PARA_AJUSTES',
    description: 'Utilizado quando o documento retorna para a etapa inicial.',
    channel: 'system',
    subject: '',
    body: 'O documento {{documento}} foi devolvido para ajustes na etapa {{etapa}}.',
    isActive: true,
    createdAt: '2024-11-02T10:30:00Z',
    updatedAt: '2024-11-02T10:30:00Z',
  },
  {
    id: 'ntf-3',
    tenantId: 'tenant-1',
    name: 'Documento publicado',
    code: 'DOCUMENTO_PUBLICADO',
    description: 'Comunica a publicação do documento ao responsável.',
    channel: 'whatsapp',
    subject: '',
    body: 'Olá {{usuario}}, o documento {{documento}} foi publicado com sucesso.',
    isActive: false,
    createdAt: '2024-11-03T14:00:00Z',
    updatedAt: '2024-11-03T14:00:00Z',
  },
]

export const MOCK_DASHBOARD: DashboardSummary[] = [
  {
    id: 'summary',
    tenantId: 'tenant-1',
    totalDocuments: 5,
    byStatus: { draft: 1, in_progress: 2, published: 1, rejected: 1, cancelled: 0 },
    pendingTasks: 2,
    overdueTasks: 1,
    slaCompliance: 78,
  },
]

export const INITIAL_MOCK_DB: MockDatabase = {
  platformAdmins: structuredClone(MOCK_PLATFORM_ADMINS),
  users: structuredClone(MOCK_USERS),
  tenantModules: structuredClone(MOCK_TENANT_MODULES),
  organizationUnits: structuredClone(MOCK_ORGANIZATION_UNITS),
  organizationAreas: structuredClone(MOCK_ORGANIZATION_AREAS),
  organizationDisciplines: structuredClone(MOCK_ORGANIZATION_DISCIPLINES),
  organizationRoles: structuredClone(MOCK_ORGANIZATION_ROLES),
  documentInstances: structuredClone(MOCK_DOCUMENT_INSTANCES),
  tasks: structuredClone(MOCK_TASKS),
  workflows: structuredClone(MOCK_WORKFLOWS),
  documentTypes: structuredClone(MOCK_DOCUMENT_TYPES),
  metadataSets: structuredClone(MOCK_METADATA_SETS),
  metadataDefinitions: structuredClone(MOCK_METADATA_DEFINITIONS),
  metadataValues: structuredClone(MOCK_METADATA_VALUES),
  notificationTemplates: structuredClone(MOCK_NOTIFICATION_TEMPLATES),
  dashboard: structuredClone(MOCK_DASHBOARD),
}
