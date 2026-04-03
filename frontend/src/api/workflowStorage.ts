/**
 * workflowStorage.ts
 * Utilitário compartilhado para leitura dos workflows armazenados no localStorage.
 * Os workflows são gerenciados pelo WorkflowsPage e pelo studio (features/workflows).
 * Reconstrói `steps` a partir do BPMN XML + element configs para uso pelo sistema de documentos.
 */

const WORKFLOWS_KEY = 'gestao-docs:workflows'
const ELEMENT_CONFIGS_KEY = 'gestao-docs:workflow-element-configs'
const LEGACY_ELEMENT_CONFIGS_KEY = 'workflow-element-configs'
const LEGACY_ACTIVITY_CONFIGS_KEY = 'gestao-docs:workflow-activity-configs'

export type StoredWorkflowStep = {
  id: string
  name: string
  orderIndex: number
  isInitial?: boolean
  isFinal?: boolean
  allowedActions?: string[]
  actions?: Array<{ id: string; label: string; color: string; outcome: string; requiresComment: boolean }>
  responsibles?: Array<{ type: string; id?: string; name: string }>
  transitions?: Array<{ triggerAction: string; toStepOrderIndex: number }>
  deadlineMode?: string
  deadlineValue?: number | string
  metadataFields?: Array<{
    metadataDefinitionId: string
    name?: string
    label?: string
    fieldType?: string
    isRequired: boolean
    isReadOnly?: boolean
  }>
}

export type StoredWorkflow = {
  id: string
  name: string
  description?: string
  processId?: string
  processName?: string
  version?: string
  status: 'draft' | 'active' | 'inactive' | 'archived'
  stepsCount?: number
  updatedAt: string
  createdAt?: string
  permissions?: {
    visualization?: { userIds?: string[]; groupIds?: string[]; processIds?: string[]; areaIds?: string[]; disciplineIds?: string[]; roleIds?: string[] }
    creation?:      { userIds?: string[]; groupIds?: string[]; processIds?: string[]; areaIds?: string[]; disciplineIds?: string[]; roleIds?: string[] }
  }
  steps?: StoredWorkflowStep[]
}

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback
  try { return JSON.parse(value) as T } catch { return fallback }
}

function readArray(key: string): any[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(key), [])
  return Array.isArray(raw) ? raw : []
}

// ─── Reconstrução de steps a partir do BPMN XML ───────────────────────────────

type BpmnEdge = { id: string; sourceRef: string; targetRef: string; name?: string }
type BpmnNode = { id: string; type: string; name?: string }

function parseBpmnGraph(xml: string): { nodes: BpmnNode[]; edges: BpmnEdge[] } {
  const nodes: BpmnNode[] = []
  const edges: BpmnEdge[] = []
  if (!xml?.trim()) return { nodes, edges }
  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    const process = doc.querySelector('process') ?? doc.querySelector('[localName="process"]')
    if (!process) return { nodes, edges }
    for (const el of Array.from(process.children)) {
      const id = el.getAttribute('id')
      if (!id) continue
      const name = el.getAttribute('name') ?? undefined
      if (el.localName === 'sequenceFlow') {
        const sourceRef = el.getAttribute('sourceRef')
        const targetRef = el.getAttribute('targetRef')
        if (sourceRef && targetRef) edges.push({ id, sourceRef, targetRef, name })
      } else {
        nodes.push({ id, type: el.localName, name })
      }
    }
  } catch { /* ignore */ }
  return { nodes, edges }
}

function isActivityNode(type: string): boolean {
  return ['task', 'userTask', 'manualTask', 'serviceTask', 'scriptTask',
          'receiveTask', 'sendTask', 'businessRuleTask', 'callActivity'].includes(type)
}
function isStartNode(type: string): boolean { return type === 'startEvent' }
function isEndNode(type: string): boolean   { return type === 'endEvent' }

/**
 * A partir de um nó (pode ser gateway/evento), percorre transitivamente os arcos de saída
 * até encontrar atividades ou eventos finais, atravessando gateways.
 * Retorna { activityIds, leadsToEnd }.
 * O parâmetro `seen` evita loops infinitos em ciclos do diagrama.
 */
function resolveTargets(
  nodeId: string,
  nodeMap: Map<string, BpmnNode>,
  outEdges: Map<string, BpmnEdge[]>,
  seen = new Set<string>(),
): { activityIds: string[]; leadsToEnd: boolean } {
  if (seen.has(nodeId)) return { activityIds: [], leadsToEnd: false }
  seen.add(nodeId)

  const activityIds: string[] = []
  let leadsToEnd = false

  for (const edge of outEdges.get(nodeId) ?? []) {
    const target = nodeMap.get(edge.targetRef)
    if (!target) continue

    if (isActivityNode(target.type)) {
      activityIds.push(edge.targetRef)
    } else if (isEndNode(target.type)) {
      leadsToEnd = true
    } else {
      // Gateway, evento intermediário, etc. — atravessa recursivamente
      const inner = resolveTargets(edge.targetRef, nodeMap, outEdges, new Set(seen))
      activityIds.push(...inner.activityIds)
      if (inner.leadsToEnd) leadsToEnd = true
    }
  }

  return { activityIds, leadsToEnd }
}

function buildStepFromConfig(
  elementId: string,
  elementName: string,
  orderIndex: number,
  isInitial: boolean,
  isFinal: boolean,
  transitions: Array<{ triggerAction: string; toStepOrderIndex: number }>,
  cfg: any | null,
): StoredWorkflowStep {
  let allowedActions: string[] = []
  let responsibles: Array<{ type: string; id?: string; name: string }> = []
  const configuredActions: Array<{ id: string; label: string; color: string; outcome: string; requiresComment: boolean }> = []
  let metadataFields: StoredWorkflowStep['metadataFields']

  if (cfg) {
    const c = cfg.config ?? cfg

    // ── Ações configuradas ────────────────────────────────────────────────────
    if (Array.isArray(c.actions) && c.actions.length > 0) {
      for (const a of c.actions) {
        const outcome = String(a.outcome ?? a.label ?? '')
        if (outcome && !allowedActions.includes(outcome)) allowedActions.push(outcome)
        configuredActions.push({
          id:              String(a.id ?? a.outcome ?? a.label ?? ''),
          label:           String(a.label ?? outcome),
          color:           String(a.color ?? 'default'),
          outcome,
          requiresComment: Boolean(a.requiresComment),
        })
      }
    } else {
      if (c.allowApprove)        { allowedActions.push('approve');  configuredActions.push({ id: 'approve',  label: 'Aprovar',    color: 'green',  outcome: 'approve',  requiresComment: false }) }
      if (c.allowReject)         { allowedActions.push('reject');   configuredActions.push({ id: 'reject',   label: 'Reprovar',   color: 'red',    outcome: 'reject',   requiresComment: true  }) }
      if (c.allowRequestChanges) { allowedActions.push('return');   configuredActions.push({ id: 'return',   label: 'Devolver',   color: 'orange', outcome: 'return',   requiresComment: true  }) }
      if (c.allowForward)        { allowedActions.push('forward');  configuredActions.push({ id: 'forward',  label: 'Encaminhar', color: 'blue',   outcome: 'forward',  requiresComment: false }) }
    }

    // ── Responsáveis ──────────────────────────────────────────────────────────
    const mode = String(c.assignmentMode ?? 'dynamic')
    if (mode === 'user' && Array.isArray(c.responsibleUserIds) && c.responsibleUserIds.length > 0)
      responsibles = [{ type: 'user', id: String(c.responsibleUserIds[0]), name: '' }]
    else if (mode === 'role' && Array.isArray(c.responsibleRoleIds) && c.responsibleRoleIds.length > 0)
      responsibles = [{ type: 'role', id: String(c.responsibleRoleIds[0]), name: '' }]
    else if (mode === 'group' && Array.isArray(c.responsibleGroupIds) && c.responsibleGroupIds.length > 0)
      responsibles = [{ type: 'group', id: String(c.responsibleGroupIds[0]), name: '' }]
    else if (mode === 'mixed') {
      if (Array.isArray(c.responsibleUserIds) && c.responsibleUserIds.length > 0)
        responsibles = [{ type: 'user', id: String(c.responsibleUserIds[0]), name: '' }]
      else if (Array.isArray(c.responsibleRoleIds) && c.responsibleRoleIds.length > 0)
        responsibles = [{ type: 'role', id: String(c.responsibleRoleIds[0]), name: '' }]
      else if (Array.isArray(c.responsibleGroupIds) && c.responsibleGroupIds.length > 0)
        responsibles = [{ type: 'group', id: String(c.responsibleGroupIds[0]), name: '' }]
      else responsibles = [{ type: 'dynamic', name: 'Criador' }]
    } else {
      responsibles = [{ type: 'dynamic', name: 'Criador' }]
    }

    // ── Metadados configurados para este step ──────────────────────────────────
    if (Array.isArray(c.metadataFields) && c.metadataFields.length > 0) {
      metadataFields = c.metadataFields.map((f: any) => ({
        metadataDefinitionId: String(f.metadataDefinitionId ?? ''),
        name:       typeof f.name      === 'string' ? f.name      : undefined,
        label:      typeof f.label     === 'string' ? f.label     : undefined,
        fieldType:  typeof f.fieldType === 'string' ? f.fieldType : 'text',
        isRequired: Boolean(f.isRequired),
        isReadOnly: Boolean(f.isReadOnly),
      }))
    }
  } else {
    allowedActions = isFinal ? ['publish'] : isInitial ? ['submit'] : ['approve', 'reject']
    responsibles   = [{ type: 'dynamic', name: 'Criador' }]
  }

  // Fallbacks de ações
  if (allowedActions.length === 0) {
    allowedActions = isFinal ? ['publish'] : isInitial ? ['submit'] : ['approve']
  }
  if (configuredActions.length === 0) {
    if (isFinal)        configuredActions.push({ id: 'publish', label: 'Publicar', color: 'green', outcome: 'publish', requiresComment: false })
    else if (isInitial) configuredActions.push({ id: 'submit',  label: 'Submeter', color: 'blue',  outcome: 'submit',  requiresComment: false })
    else                configuredActions.push({ id: 'approve', label: 'Aprovar',  color: 'green', outcome: 'approve', requiresComment: false })
  }

  const deadlineMode  = cfg ? String((cfg.config ?? cfg)?.deadlineMode  ?? '') || undefined : undefined
  const deadlineValue = cfg ? (cfg.config ?? cfg)?.deadlineValue : undefined

  return {
    id: elementId, name: elementName, orderIndex, isInitial, isFinal,
    allowedActions, actions: configuredActions, responsibles, transitions,
    deadlineMode, deadlineValue,
    ...(metadataFields && metadataFields.length > 0 ? { metadataFields } : {}),
  }
}

/**
 * Reconstrói a lista de steps a partir do BPMN XML e das element configs.
 * Atravessa gateways ao calcular transições (fix para desvios no fluxo).
 */
function buildStepsFromBpmn(bpmnXml: string, workflowId: string, allElementConfigs: any[]): StoredWorkflowStep[] {
  const { nodes, edges } = parseBpmnGraph(bpmnXml)
  if (nodes.length === 0) return []

  const nodeMap = new Map<string, BpmnNode>(nodes.map((n) => [n.id, n]))
  const outEdges = new Map<string, BpmnEdge[]>()
  for (const edge of edges) {
    const list = outEdges.get(edge.sourceRef) ?? []
    list.push(edge)
    outEdges.set(edge.sourceRef, list)
  }

  const wfConfigs = allElementConfigs.filter((c: any) => c.workflowId === workflowId)
  const configByElement = new Map<string, any>(wfConfigs.map((c: any) => [String(c.elementId), c]))

  // BFS para determinar a ordem das atividades (ignora gateways/eventos)
  const startNode = nodes.find((n) => isStartNode(n.type))
  if (!startNode) return []

  const bfsVisited = new Set<string>()
  const bfsQueue: string[] = [startNode.id]
  const activityOrder: string[] = []

  while (bfsQueue.length > 0) {
    const current = bfsQueue.shift()!
    if (bfsVisited.has(current)) continue
    bfsVisited.add(current)
    const node = nodeMap.get(current)
    if (node && isActivityNode(node.type)) activityOrder.push(current)
    for (const edge of outEdges.get(current) ?? []) {
      if (!bfsVisited.has(edge.targetRef)) bfsQueue.push(edge.targetRef)
    }
  }

  if (activityOrder.length === 0) return []

  const steps: StoredWorkflowStep[] = []

  activityOrder.forEach((actId, idx) => {
    const node        = nodeMap.get(actId)!
    const elementName = node.name ?? `Etapa ${idx + 1}`
    const elementCfg  = configByElement.get(actId) ?? null
    const cfg         = elementCfg?.config ?? elementCfg

    // Resolve os alvos atravessando gateways
    const { activityIds: nextActivityIds, leadsToEnd } = resolveTargets(actId, nodeMap, outEdges)
    const isFinal   = leadsToEnd && nextActivityIds.length === 0
    const isInitial = idx === 0

    // Pré-calcula as ações para montar transições
    const previewActions: string[] = []
    if (Array.isArray(cfg?.actions) && cfg.actions.length > 0) {
      for (const a of cfg.actions) {
        const o = String(a.outcome ?? a.label ?? '')
        if (o) previewActions.push(o)
      }
    } else {
      if (cfg?.allowApprove)        previewActions.push('approve')
      if (cfg?.allowReject)         previewActions.push('reject')
      if (cfg?.allowRequestChanges) previewActions.push('return')
      if (cfg?.allowForward)        previewActions.push('forward')
    }
    if (previewActions.length === 0) {
      previewActions.push(...(isFinal ? ['publish'] : isInitial ? ['submit'] : ['approve', 'reject']))
    }

    // Ações "de avanço" (não rejeitam nem cancelam — seguem o fluxo principal)
    const forwardOutcomes = new Set(['approve', 'submit', 'publish', 'forward', 'complete'])
    const rejectionOutcomes = new Set(['reject', 'return', 'request-changes'])

    const transitions: Array<{ triggerAction: string; toStepOrderIndex: number }> = []

    if (nextActivityIds.length === 1) {
      // Fluxo linear (sem gateway de desvio)
      const nextIdx = activityOrder.indexOf(nextActivityIds[0])
      if (nextIdx >= 0) {
        const forwardActions = previewActions.filter((a) => !rejectionOutcomes.has(a) && a !== 'cancel')
        for (const action of forwardActions) {
          transitions.push({ triggerAction: action, toStepOrderIndex: nextIdx })
        }
      }
    } else if (nextActivityIds.length >= 2) {
      // Gateway de desvio: separa ações de avanço das de rejeição/retorno
      // Caminho 1 (índice mais baixo no BFS = caminho "principal")
      // Caminho 2+ (índice mais alto = desvio/correção)
      const sortedTargets = nextActivityIds
        .map((id) => ({ id, idx: activityOrder.indexOf(id) }))
        .filter((t) => t.idx >= 0)
        .sort((a, b) => a.idx - b.idx)

      const mainPath       = sortedTargets[0]
      const correctionPath = sortedTargets[1] // desvio (ex: ajuste/correção)

      // Ações de avanço → caminho principal
      const fwdActions = previewActions.filter((a) => forwardOutcomes.has(a) || (!rejectionOutcomes.has(a) && a !== 'cancel'))
      // Ações de rejeição → desvio (se configurado)
      const rejActions = previewActions.filter((a) => rejectionOutcomes.has(a))

      if (mainPath) {
        for (const action of fwdActions) {
          // Evita duplicatas
          if (!transitions.some((t) => t.triggerAction === action)) {
            transitions.push({ triggerAction: action, toStepOrderIndex: mainPath.idx })
          }
        }
      }
      if (correctionPath) {
        for (const action of rejActions) {
          if (!transitions.some((t) => t.triggerAction === action)) {
            transitions.push({ triggerAction: action, toStepOrderIndex: correctionPath.idx })
          }
        }
      }
    }

    steps.push(buildStepFromConfig(actId, elementName, idx, isInitial, isFinal, transitions, elementCfg))
  })

  return steps
}

/** Carrega todos os element configs do localStorage (primary + legacy). */
function loadAllElementConfigs(): any[] {
  return [...readArray(ELEMENT_CONFIGS_KEY), ...readArray(LEGACY_ELEMENT_CONFIGS_KEY), ...readArray(LEGACY_ACTIVITY_CONFIGS_KEY)]
}

/** Carrega todos os workflows do localStorage, com steps reconstruídos do BPMN. */
export function loadStoredWorkflows(): StoredWorkflow[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(WORKFLOWS_KEY), [])
  if (!Array.isArray(raw)) return []

  const allElementConfigs = loadAllElementConfigs()

  return raw.map((item: any) => {
    const bpmnXml    = typeof item?.bpmnXml === 'string' ? item.bpmnXml : ''
    const savedSteps = Array.isArray(item?.steps) ? item.steps : undefined
    const steps      = savedSteps ?? (bpmnXml ? buildStepsFromBpmn(bpmnXml, String(item?.id ?? ''), allElementConfigs) : [])

    return {
      id:          String(item?.id ?? ''),
      name:        String(item?.name ?? item?.title ?? 'Workflow sem nome'),
      description: typeof item?.description === 'string' ? item.description : undefined,
      processId:   typeof item?.processId === 'string' && item.processId ? item.processId : undefined,
      processName: typeof item?.processName === 'string' ? item.processName : undefined,
      version:     typeof item?.version === 'string' ? item.version : '1.0',
      status:      (['draft','active','inactive','archived'] as const).includes(item?.status) ? item.status : 'draft',
      stepsCount:  typeof item?.stepsCount === 'number' ? item.stepsCount : steps?.length ?? 0,
      updatedAt:   typeof item?.updatedAt === 'string' ? item.updatedAt : new Date().toISOString(),
      createdAt:   typeof item?.createdAt === 'string' ? item.createdAt : undefined,
      permissions: item?.permissions ?? undefined,
      steps:       steps.length > 0 ? steps : undefined,
    }
  })
}

/** Encontra o workflow vinculado a um processo (cada processo tem no máximo 1). */
export function findWorkflowByProcess(processId: string): StoredWorkflow | null {
  return loadStoredWorkflows().find((w) => w.processId === processId) ?? null
}

/** Encontra um workflow pelo seu ID. */
export function findWorkflowById(id: string): StoredWorkflow | null {
  return loadStoredWorkflows().find((w) => w.id === id) ?? null
}
