import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'
import { getMockDb, saveMockDb } from './mockDb'
import { getElementConfigsByWorkflow } from '../../src/features/workflows/storage'

function clone<T>(value: T): T { return structuredClone(value) }

function parseBody(data: unknown): Record<string, unknown> {
  if (!data) return {}
  if (typeof data === 'object') return data as Record<string, unknown>
  if (typeof data === 'string') { try { return JSON.parse(data) as Record<string, unknown> } catch { return {} } }
  return {}
}

function generateId(prefix = 'mock') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function makeResponse(data: unknown, status = 200): AxiosResponse {
  return { data, status, statusText: 'OK', headers: {}, config: {} as InternalAxiosRequestConfig }
}

type DashboardScope = 'account' | 'process'

function resolveDashboardScope(params: Record<string, unknown>): DashboardScope {
  if (params.processId) return 'process'
  return 'account'
}

function findBestDashboard(dashboards: ReturnType<typeof getMockDb>['dashboards'], params: Record<string, unknown>) {
  const accountId  = String(params.accountId ?? params.tenantId ?? '')
  const processId  = String(params.processId ?? '')
  const scopeLevel = (params.scopeLevel as DashboardScope | undefined) ?? resolveDashboardScope(params)

  const candidates = dashboards.filter((item) => {
    if (accountId && String(item.accountId ?? '') !== accountId) return false
    if (scopeLevel === 'process') return item.scopeLevel === 'process' && String(item.processId ?? '') === processId
    return item.scopeLevel === 'account'
  })

  return candidates[0] ?? dashboards[0] ?? null
}

type MockDb = ReturnType<typeof getMockDb>

// ─── Codificação de documentos ───────────────────────────────────────────────

function generateDocumentCode(db: MockDb, accountId: string): string {
  const config = db.environmentConfigurations.find(
    (c) => (c.accountId === accountId || c.tenantId === accountId) && c.isDefault !== false,
  )

  const now         = new Date()
  const year        = String(now.getFullYear())
  const month       = String(now.getMonth() + 1).padStart(2, '0')
  const digits      = config?.sequentialDigits ?? 4
  const resetPeriod = config?.sequentialResetPeriod ?? 'yearly'
  const periodKey   = resetPeriod === 'never' ? 'all' : resetPeriod === 'monthly' ? `${year}-${month}` : year

  let currentValue = config?.sequentialCurrentValue ?? 0
  if (config && config.sequentialLastPeriod !== periodKey) currentValue = 0
  const sequential = currentValue + 1

  if (config) {
    const idx = db.environmentConfigurations.findIndex((c) => c.id === config.id)
    if (idx >= 0) {
      db.environmentConfigurations[idx] = {
        ...config, sequentialCurrentValue: sequential, sequentialLastPeriod: periodKey, updatedAt: new Date().toISOString(),
      }
    }
  } else {
    db.environmentConfigurations.push({
      id: generateId('env'), accountId, tenantId: accountId,
      name: 'Configuração padrão', isDefault: true, isActive: true,
      codingRuleJson: null, sequentialDigits: digits, sequentialResetPeriod: 'yearly',
      sequentialCurrentValue: sequential, sequentialLastPeriod: periodKey,
      totalProcessDays: 15, createdAt: new Date().toISOString(),
    })
  }

  const parts: Array<{ type: string; fixedValue?: string; separatorAfter?: string }> =
    config?.codingRuleJson?.parts?.length
      ? config.codingRuleJson.parts
      : [
          { type: 'fixed', fixedValue: 'DOC', separatorAfter: '-' },
          { type: 'year', separatorAfter: '-' },
          { type: 'sequential', separatorAfter: '' },
        ]

  return parts.map((p) => {
    let value = ''
    switch (p.type) {
      case 'fixed':      value = p.fixedValue ?? ''; break
      case 'year':       value = year; break
      case 'sequential': value = String(sequential).padStart(digits, '0'); break
      default:           value = ''; break
    }
    return value + (p.separatorAfter ?? '')
  }).join('')
}

// ─── Geração de revisão ──────────────────────────────────────────────────────
// Gera o próximo valor de revisão com base na configuração do processo
// Suporta: numérico (00, 01...), alfabético (A, B...), alfanumérico (A0, A1...)

function getRevisionConfig(db: MockDb): { pattern: string; initialValue: string } {
  const cfg = db.environmentConfigurations.find((c) => c.isDefault !== false) ?? db.environmentConfigurations[0] ?? null
  return {
    pattern:      String((cfg as any)?.revisionPattern      ?? 'numeric'),
    initialValue: String((cfg as any)?.revisionInitialValue ?? '00'),
  }
}

function generateNextRevision(
  db: MockDb,
  processId: string,
  currentRevision: string | null | undefined,
): string {
  const { pattern, initialValue } = getRevisionConfig(db)
  if (!currentRevision) return initialValue

  if (pattern === 'numeric') {
    const digits = initialValue.length || 2
    const num = parseInt(currentRevision, 10)
    if (isNaN(num)) return initialValue
    return String(num + 1).padStart(digits, '0')
  }

  if (pattern === 'alphabetic') {
    const upper = currentRevision.toUpperCase()
    if (upper === 'Z') return 'AA'
    if (upper.length === 1) return String.fromCharCode(upper.charCodeAt(0) + 1)
    // AA → AB, AZ → BA etc.
    const chars = upper.split('')
    let i = chars.length - 1
    while (i >= 0) {
      if (chars[i] !== 'Z') { chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1); break }
      chars[i] = 'A'
      i--
    }
    if (i < 0) chars.unshift('A')
    return chars.join('')
  }

  if (pattern === 'alphanumeric') {
    // Ex: A0 → A1, A9 → B0
    const match = currentRevision.match(/^([A-Z]+)(\d+)$/)
    if (!match) return initialValue
    const letter = match[1]
    const num = parseInt(match[2], 10) + 1
    const digits = match[2].length
    if (num < Math.pow(10, digits)) return letter + String(num).padStart(digits, '0')
    // Overflow: próxima letra
    const nextLetter = generateNextRevision(db, processId, letter)
    return nextLetter + '0'.repeat(digits)
  }

  return initialValue
}

// ─── Audit log ───────────────────────────────────────────────────────────────

function addAuditLog(
  db: MockDb,
  documentInstanceId: string,
  action: string,
  options?: { stepName?: string | null; userName?: string | null; comment?: string | null },
) {
  db.auditLogs.push({
    id: generateId('log'), documentInstanceId, action,
    stepName: options?.stepName ?? null,
    userName: options?.userName ?? null,
    comment:  options?.comment  ?? null,
    createdAt: new Date().toISOString(),
  })
}

// ─── Prazo ───────────────────────────────────────────────────────────────────

function calculateDueDate(deadlineMode?: string, deadlineValue?: number | string): string | null {
  if (!deadlineMode || deadlineValue === undefined || deadlineValue === null || deadlineValue === '') return null
  const value = Number(deadlineValue)
  if (isNaN(value) || value <= 0) return null
  const d = new Date()
  if (deadlineMode === 'hours') { d.setHours(d.getHours() + value); return d.toISOString() }
  if (deadlineMode === 'days')  { d.setDate(d.getDate()  + value); return d.toISOString() }
  return null
}

// ─── Responsável da etapa ────────────────────────────────────────────────────

function resolveStepResponsible(
  db: MockDb,
  workflow: Record<string, unknown>,
  step: Record<string, unknown>,
  creatorId?: string,
): { id: string; name: string } | null {
  const responsibles = (step.responsibles as Array<Record<string, unknown>>) ?? []
  if (responsibles.length === 0) {
    const creator = db.users.find((u) => u.id === creatorId)
    return creator ? { id: creator.id, name: creator.name } : null
  }

  const first     = responsibles[0]
  const processId = String(workflow.processId ?? '')

  if (first.type === 'dynamic') {
    const creator = db.users.find((u) => u.id === creatorId)
    return creator ? { id: creator.id, name: creator.name } : null
  }

  if (first.type === 'user' && first.id) {
    const user = db.users.find((u) => u.id === String(first.id))
    return user ? { id: user.id, name: user.name } : null
  }

  if (first.type === 'role' && first.id) {
    const targetRole = db.organizationRoles.find((r) => r.id === String(first.id))
    if (targetRole) {
      const firstWord  = targetRole.name.toLowerCase().split(' ')[0] ?? ''
      const membership = db.userProcessMemberships.find(
        (m) => m.processId === processId && m.isActive !== false && m.role.toLowerCase().includes(firstWord),
      )
      if (membership) {
        const user = db.users.find((u) => u.id === membership.userId)
        if (user) return { id: user.id, name: user.name }
      }
    }
    const fallback = db.userProcessMemberships.find((m) => m.processId === processId && m.isActive !== false)
    if (fallback) {
      const user = db.users.find((u) => u.id === fallback.userId)
      if (user) return { id: user.id, name: user.name }
    }
    return null
  }

  if (first.type === 'group' && first.id) {
    const group     = (db.organizationGroups as Array<Record<string, unknown>>).find((g) => g.id === String(first.id))
    const memberIds = (group?.memberIds as string[] | undefined) ?? []
    if (memberIds.length > 0) {
      const user = db.users.find((u) => u.id === memberIds[0])
      if (user) return { id: user.id, name: user.name }
    }
  }

  const creator = db.users.find((u) => u.id === creatorId)
  return creator ? { id: creator.id, name: creator.name } : { id: creatorId ?? 'unknown', name: 'Responsável' }
}

// ─── Executar system-task automaticamente ───────────────────────────────────
// Se a próxima etapa for uma system-task (kind: 'system-task' no elementConfig),
// executa a ação automaticamente e avança o fluxo sem criar tarefa para o usuário.
// Retorna true se executou (e já avançou), false se não era system-task.

function executeSystemTaskIfNeeded(
  db: MockDb,
  docIndex: number,
  step: Record<string, unknown>,
  steps: Array<Record<string, unknown>>,
  workflow: Record<string, unknown>,
  executorName: string,
): boolean {
  const workflowId = String((db.documentInstances[docIndex] as any).workflowId ?? '')
  const elementId  = String(step.id ?? step.elementId ?? '')

  let systemTaskConfig: Record<string, unknown> | null = null
  try {
    const elementConfigs = getElementConfigsByWorkflow(workflowId) as Array<Record<string, unknown>>
    const cfg = elementConfigs.find(
      (c) => String(c.elementId ?? '') === elementId && c.kind === 'system-task'
    )
    if (cfg) systemTaskConfig = (cfg.config as Record<string, unknown>) ?? {}
  } catch { /* não é system-task configurada */ }

  // Também detecta pelo campo kind do próprio step (para steps do mock)
  const stepKind = String(step.kind ?? '')
  if (!systemTaskConfig && stepKind !== 'system-task') return false

  const doc        = db.documentInstances[docIndex]
  const actionType = String(systemTaskConfig?.actionType ?? '')
  const now        = new Date().toISOString()
  const stepLabel  = String(step.name ?? '')

  // ── Executa a ação da system-task ─────────────────────────────────────────
  if (actionType === 'increment-revision') {
    const currentRev = String((doc as any).revision ?? '') || null
    const nextRev    = generateNextRevision(db, String(doc.processId ?? ''), currentRev)
    const rootId     = String((doc as any).parentDocumentId ?? doc.id)
    const newRevCode = generateDocumentCode(db, String(doc.accountId ?? ''))
    const newDocId   = generateId('doc')

    const existingMetadata = db.metadataValues.filter(
      (v) => v.documentInstanceId === String(doc.id)
    )

    const enrichedSteps = enrichStepsWithElementConfigs(workflowId, steps)
    const firstStep     = enrichedSteps[0] ?? steps[0]

    const newRevDoc = {
      id:                    newDocId,
      accountId:             String(doc.accountId ?? ''),
      processId:             String(doc.processId ?? ''),
      processName:           String(doc.processName ?? ''),
      title:                 String(doc.title ?? ''),
      code:                  newRevCode,
      revision:              nextRev,
      parentDocumentId:      rootId,
      status:                'in_progress',
      workflowId:            String(doc.workflowId ?? ''),
      workflowName:          String((doc as any).workflowName ?? ''),
      currentStepName:       firstStep ? String(firstStep.name ?? '') : null,
      currentStepOrderIndex: firstStep ? (firstStep.orderIndex as number) : null,
      responsibleId:         String(doc.createdById ?? ''),
      responsibleName:       String(doc.createdByName ?? ''),
      createdById:           String(doc.createdById ?? ''),
      createdByName:         String(doc.createdByName ?? ''),
      createdAt:             now,
      updatedAt:             now,
      dueDate:               null,
      _steps:                steps.length > 0 ? steps : undefined,
    }

    db.documentInstances.push(newRevDoc)

    existingMetadata.forEach((mv) => {
      db.metadataValues.push({
        ...mv,
        id:                 generateId('mval'),
        documentInstanceId: newDocId,
        createdAt:          now,
        updatedAt:          now,
      })
    })

    if (firstStep) {
      createTaskForStep(
        db,
        newRevDoc as Record<string, unknown>,
        { ...workflow, steps: enrichedSteps },
        firstStep,
        String(doc.createdById ?? ''),
      )
    }

    addAuditLog(db, newDocId, 'RevisionCreated', {
      stepName: stepLabel,
      userName: executorName,
      comment: `Revisão ${nextRev} criada automaticamente (Rev ${currentRev ?? '—'} → ${nextRev})`,
    })
    addAuditLog(db, String(doc.id), 'SystemTaskExecuted', {
      stepName: stepLabel,
      userName: executorName,
      comment: `Tarefa de sistema executada: incrementar revisão → ${newRevCode} Rev ${nextRev}`,
    })
  } else {
    // Outras system-tasks: apenas registra auditoria
    addAuditLog(db, String(doc.id), 'SystemTaskExecuted', {
      stepName: stepLabel,
      userName: executorName,
      comment: `Tarefa de sistema executada: ${actionType || 'ação desconhecida'}`,
    })
  }

  // ── Avança o documento para a próxima etapa após a system-task ─────────────
  // Busca a transição padrão (primeira) ou próxima sequencial
  const transitions = (step.transitions as Array<Record<string, unknown>>) ?? []
  const nextTransition = transitions[0]
  const nextStep = nextTransition
    ? steps.find((s) => s.orderIndex === nextTransition.toStepOrderIndex)
    : steps.find((s) => (s.orderIndex as number) === (step.orderIndex as number) + 1)

  if (nextStep) {
    if (Boolean(nextStep.isFinal)) {
      db.documentInstances[docIndex] = {
        ...db.documentInstances[docIndex],
        status: 'published', currentStepName: null, currentStepOrderIndex: null, updatedAt: now,
      }
      addAuditLog(db, String(doc.id), 'DocumentoPublished', { stepName: stepLabel, userName: executorName })
    } else {
      db.documentInstances[docIndex] = {
        ...db.documentInstances[docIndex],
        currentStepName:       String(nextStep.name ?? ''),
        currentStepOrderIndex: nextStep.orderIndex as number,
        updatedAt:             now,
      }
      // Verifica recursivamente se a próxima etapa também é automática
      const isNextAutomatic =
        executeIntermediateEventIfNeeded(db, docIndex, nextStep, steps, workflow, executorName) ||
        executeSystemTaskIfNeeded(db, docIndex, nextStep, steps, workflow, executorName)
      if (!isNextAutomatic) {
        createTaskForStep(
          db,
          db.documentInstances[docIndex] as unknown as Record<string, unknown>,
          workflow,
          nextStep,
          String(doc.createdById ?? ''),
        )
      }
    }
  }

  return true
}

// ─── Avançar fluxo após evento automático ────────────────────────────────────

function advanceAfterAutoEvent(
  db: MockDb,
  docIndex: number,
  step: Record<string, unknown>,
  steps: Array<Record<string, unknown>>,
  workflow: Record<string, unknown>,
  executorName: string,
  stepLabel: string,
): boolean {
  const doc         = db.documentInstances[docIndex]
  const now         = new Date().toISOString()
  const transitions = (step.transitions as Array<Record<string, unknown>>) ?? []
  const nextT       = transitions[0]
  const nextStep    = nextT
    ? steps.find((s) => s.orderIndex === nextT.toStepOrderIndex)
    : steps.find((s) => (s.orderIndex as number) === (step.orderIndex as number) + 1)

  if (!nextStep) return true

  if (Boolean(nextStep.isFinal)) {
    db.documentInstances[docIndex] = {
      ...db.documentInstances[docIndex],
      status: 'published', currentStepName: null, currentStepOrderIndex: null, updatedAt: now,
    }
    addAuditLog(db, String(doc.id), 'DocumentoPublished', { stepName: stepLabel, userName: executorName })
  } else {
    db.documentInstances[docIndex] = {
      ...db.documentInstances[docIndex],
      currentStepName:       String(nextStep.name ?? ''),
      currentStepOrderIndex: nextStep.orderIndex as number,
      updatedAt:             now,
    }
    // Verifica recursivamente se a próxima etapa também é automática
    const isAutoNext =
      executeIntermediateEventIfNeeded(db, docIndex, nextStep, steps, workflow, executorName) ||
      executeSystemTaskIfNeeded(db, docIndex, nextStep, steps, workflow, executorName)

    if (!isAutoNext) {
      createTaskForStep(
        db,
        db.documentInstances[docIndex] as unknown as Record<string, unknown>,
        workflow,
        nextStep,
        String(doc.createdById ?? ''),
      )
    }
  }
  return true
}

// ─── Executar evento intermediário automático ─────────────────────────────────
// Detecta e executa message / timer / signal / conditional events automaticamente.

function executeIntermediateEventIfNeeded(
  db: MockDb,
  docIndex: number,
  step: Record<string, unknown>,
  steps: Array<Record<string, unknown>>,
  workflow: Record<string, unknown>,
  executorName: string,
): boolean {
  const workflowId = String((db.documentInstances[docIndex] as any).workflowId ?? '')
  const elementId  = String(step.id ?? step.elementId ?? '')

  let eventConfig: Record<string, unknown> | null = null
  let eventKind = ''

  try {
    const elementConfigs = getElementConfigsByWorkflow(workflowId) as Array<Record<string, unknown>>
    const cfg = elementConfigs.find((c) => String(c.elementId ?? '') === elementId)
    if (cfg) {
      eventKind   = String(cfg.kind ?? '')
      eventConfig = (cfg.config as Record<string, unknown>) ?? {}
    }
  } catch { return false }

  // Só trata os eventos intermediários (message, timer, signal, conditional)
  if (!['message', 'timer', 'signal', 'conditional'].includes(eventKind)) return false

  const doc       = db.documentInstances[docIndex]
  const stepLabel = String(step.name ?? '')

  // ── MESSAGE: dispara notificações ─────────────────────────────────────────
  if (eventKind === 'message') {
    const templateIds = (eventConfig?.notificationTemplateIds as string[]) ?? []
    addAuditLog(db, String(doc.id), 'NotificationDispatched', {
      stepName: stepLabel,
      userName: executorName,
      comment:  `Notificação disparada — templates: [${templateIds.join(', ')}]`,
    })
    return advanceAfterAutoEvent(db, docIndex, step, steps, workflow, executorName, stepLabel)
  }

  // ── TIMER: avança automaticamente (mock não aguarda tempo real) ───────────
  if (eventKind === 'timer') {
    const timerType  = String(eventConfig?.timerType  ?? 'fixed-delay')
    const delayValue = eventConfig?.delayValue ? `${eventConfig.delayValue} ${eventConfig.delayUnit ?? ''}` : ''
    addAuditLog(db, String(doc.id), 'TimerFired', {
      stepName: stepLabel,
      userName: executorName,
      comment:  `Timer disparado: ${timerType} ${delayValue}`.trim(),
    })
    return advanceAfterAutoEvent(db, docIndex, step, steps, workflow, executorName, stepLabel)
  }

  // ── SIGNAL: dispara ação em documento relacionado ─────────────────────────
  if (eventKind === 'signal') {
    const targetProcessId = String(eventConfig?.targetProcessId ?? '')
    const targetAction    = String(eventConfig?.targetAction    ?? '')
    const direction       = String(eventConfig?.relationDirection ?? 'parent-to-child')
    const rootId          = String((doc as any).parentDocumentId ?? doc.id)

    const related = db.documentInstances.find((d: any) => {
      if (d.id === String(doc.id)) return false
      if (d.processId !== targetProcessId) return false
      if (direction === 'parent-to-child') return d.parentDocumentId === rootId || d.id === rootId
      if (direction === 'child-to-parent') return String((doc as any).parentDocumentId ?? '') === d.id
      return false
    })

    if (related) {
      const relTaskIdx = db.tasks.findIndex(
        (t) => t.documentInstanceId === related.id && t.status === 'pending'
      )
      if (relTaskIdx >= 0) {
        db.tasks[relTaskIdx] = {
          ...db.tasks[relTaskIdx],
          status: 'completed', completedAt: new Date().toISOString(),
          actionTaken: targetAction, updatedAt: new Date().toISOString(),
        }
        addAuditLog(db, related.id, 'SignalReceived', {
          stepName: db.tasks[relTaskIdx].stepName,
          userName: executorName,
          comment:  `Sinal recebido de ${String(doc.code ?? '')} — ação: ${targetAction}`,
        })
      }
      addAuditLog(db, String(doc.id), 'SignalDispatched', {
        stepName: stepLabel,
        userName: executorName,
        comment:  `Sinal enviado para ${String((related as any).code ?? '')} (${targetAction})`,
      })
    } else {
      addAuditLog(db, String(doc.id), 'SignalDispatched', {
        stepName: stepLabel,
        userName: executorName,
        comment:  `Sinal enviado — nenhum documento relacionado encontrado no processo ${targetProcessId}`,
      })
    }
    return advanceAfterAutoEvent(db, docIndex, step, steps, workflow, executorName, stepLabel)
  }

  // ── CONDITIONAL: incrementar revisão ──────────────────────────────────────
  if (eventKind === 'conditional') {
    const actionType = String(eventConfig?.actionType ?? '')
    if (actionType === 'increment-revision') {
      // Delega para executeSystemTaskIfNeeded que já tem a lógica completa
      return executeSystemTaskIfNeeded(db, docIndex, step, steps, workflow, executorName)
    }
    return advanceAfterAutoEvent(db, docIndex, step, steps, workflow, executorName, stepLabel)
  }

  return false
}

// ─── Criar tarefa para etapa ─────────────────────────────────────────────────

function createTaskForStep(
  db: MockDb,
  doc: Record<string, unknown>,
  workflow: Record<string, unknown>,
  step: Record<string, unknown>,
  creatorId?: string,
) {
  const responsible = resolveStepResponsible(db, workflow, step, creatorId)
  if (!responsible) return

  const now           = new Date().toISOString()
  const deadlineMode  = step.deadlineMode  as string | undefined
  const deadlineValue = step.deadlineValue as number | string | undefined
  const dueDate       = calculateDueDate(deadlineMode, deadlineValue)

  const taskActions = Array.isArray(step.actions)
    ? (step.actions as Array<Record<string, unknown>>).map((a) => ({
        id:              String(a.id      ?? ''),
        label:           String(a.label   ?? ''),
        color:           String(a.color   ?? 'default'),
        outcome:         String(a.outcome ?? ''),
        requiresComment: Boolean(a.requiresComment),
      }))
    : undefined

  db.tasks.push({
    id:                 generateId('task'),
    accountId:          String(doc.accountId ?? ''),
    processId:          String(doc.processId ?? ''),
    processName:        String(doc.processName ?? ''),
    documentInstanceId: String(doc.id ?? ''),
    documentTitle:      String(doc.title ?? ''),
    documentCode:       String(doc.code ?? ''),
    stepName:           String(step.name ?? ''),
    stepOrderIndex:     step.orderIndex as number,
    assignedUserId:     responsible.id,
    assignedUserName:   responsible.name,
    status:             'pending',
    allowedActions:     (step.allowedActions as string[]) ?? [],
    taskActions,
    deadlineMode,
    deadlineValue,
    dueDate,
    createdAt:          now,
    updatedAt:          now,
    completedAt:        null,
    comment:            null,
  })
}

// ─── Persistir metadados iniciais ────────────────────────────────────────────
// CORREÇÃO: salva os valores preenchidos na criação do documento

function persistInitialMetadataValues(
  db: MockDb,
  documentId: string,
  accountId: string,
  processId: string,
  initialMetadataValues: Record<string, unknown>,
  steps: Array<Record<string, unknown>>,
) {
  if (!initialMetadataValues || Object.keys(initialMetadataValues).length === 0) return

  // Coleta todos os metadataFields de todos os steps para resolver label/fieldType
  const allFields = steps.flatMap((s) =>
    Array.isArray(s.metadataFields)
      ? (s.metadataFields as Array<Record<string, unknown>>)
      : [],
  )

  // Também tenta resolver pelo db.metadataDefinitions como fallback
  Object.entries(initialMetadataValues).forEach(([metadataDefinitionId, value]) => {
    if (value === null || value === undefined) return

    // Tenta achar a definição nos campos dos steps
    const fieldDef = allFields.find(
      (f) => String(f.metadataDefinitionId ?? '') === metadataDefinitionId,
    )

    // Fallback: busca no db.metadataDefinitions
    const dbDef = db.metadataDefinitions.find((d) => d.id === metadataDefinitionId)

    const name      = String(fieldDef?.name  ?? dbDef?.name  ?? dbDef?.label ?? metadataDefinitionId)
    const label     = String(fieldDef?.label ?? dbDef?.label ?? dbDef?.name  ?? metadataDefinitionId)
    const fieldType = String(fieldDef?.fieldType ?? dbDef?.fieldType ?? 'text')
    const isRequired = Boolean(fieldDef?.isRequired ?? dbDef?.isRequired ?? false)

    const existingIndex = db.metadataValues.findIndex(
      (v) => v.documentInstanceId === documentId && v.metadataDefinitionId === metadataDefinitionId,
    )

    const record = {
      id:                    existingIndex >= 0 ? db.metadataValues[existingIndex].id : generateId('mval'),
      documentInstanceId:    documentId,
      metadataDefinitionId,
      accountId,
      processId,
      name,
      label,
      fieldType,
      isRequired,
      value,
      createdAt:             existingIndex >= 0 ? db.metadataValues[existingIndex].createdAt : new Date().toISOString(),
      updatedAt:             new Date().toISOString(),
    }

    if (existingIndex >= 0) {
      db.metadataValues[existingIndex] = { ...db.metadataValues[existingIndex], ...record }
    } else {
      db.metadataValues.push(record)
    }
  })
}

// ─── Enriquecer steps com configs do localStorage ────────────────────────────
// As instruções/helpText/responsáveis são salvas no localStorage via Workflow Studio
// mas os steps do db.workflows não têm esses campos — precisamos mesclar aqui

function enrichStepsWithElementConfigs(
  workflowId: string,
  steps: Array<Record<string, unknown>>,
): Array<Record<string, unknown>> {
  if (!workflowId || !steps.length) return steps

  let elementConfigs: Array<Record<string, unknown>> = []
  try {
    elementConfigs = getElementConfigsByWorkflow(workflowId) as Array<Record<string, unknown>>
  } catch {
    return steps
  }

  if (!elementConfigs.length) return steps

  return steps.map((step) => {
    const elementId = String(step.id ?? step.elementId ?? '')
    const cfg = elementConfigs.find((c) => String(c.elementId ?? '') === elementId)
    if (!cfg) return step

    const config = (cfg.config ?? {}) as Record<string, unknown>

    return {
      ...step,
      instructions: config.instructions ?? step.instructions ?? null,
      helpText:     config.helpText     ?? step.helpText     ?? null,
      // Também garante que actions/responsibles do config prevalecem sobre os do step
      actions:      Array.isArray(config.actions)      && (config.actions as unknown[]).length      ? config.actions      : step.actions,
      responsibles: Array.isArray(config.responsibles) && (config.responsibles as unknown[]).length ? config.responsibles : step.responsibles,
      deadlineMode:  config.deadlineMode  ?? step.deadlineMode,
      deadlineValue: config.deadlineValue ?? step.deadlineValue,
    }
  })
}

// ─── Enriquecer documento ────────────────────────────────────────────────────

function enrichDocument(db: MockDb, doc: Record<string, unknown>): Record<string, unknown> {
  const workflow    = db.workflows.find((w) => w.id === doc.workflowId) as Record<string, unknown> | undefined
  const docSteps    = Array.isArray(doc._steps) ? (doc._steps as Array<Record<string, unknown>>) : []
  const rawSteps    = ((workflow?.steps as Array<Record<string, unknown>>) ?? []).length > 0
    ? (workflow?.steps as Array<Record<string, unknown>>)
    : docSteps
  // Enriquece com instruções/helpText/actions salvos no localStorage pelo Workflow Studio
  const steps       = enrichStepsWithElementConfigs(String(doc.workflowId ?? ''), rawSteps)
  const currentStep = steps.find((s) => s.orderIndex === doc.currentStepOrderIndex)
  const docTasks    = db.tasks.filter((t) => t.documentInstanceId === String(doc.id ?? ''))
  const docAuditLogs = (db.auditLogs ?? []).filter((l) => l.documentInstanceId === String(doc.id ?? ''))

  const stepMetadataFields = currentStep
    ? ((currentStep.metadataFields as Array<Record<string, unknown>>) ?? [])
    : []

  return {
    ...doc,
    revision:          (doc as any).revision ?? null,
    parentDocumentId:  (doc as any).parentDocumentId ?? null,
    workflowName:      workflow ? String(workflow.name ?? '') : (doc.workflowName ?? ''),
    currentStepId:     currentStep ? String(currentStep.id ?? '') : null,
    documentTypeId:    doc.documentTypeId  ?? '',
    documentTypeName:  doc.documentTypeName ?? '',
    createdByUserName: doc.createdByName ?? doc.createdByUserName ?? '',
    availableActions:  currentStep ? ((currentStep.allowedActions as string[]) ?? []) : [],
    stepMetadataFields,
    files:             (doc.files as unknown[]) ?? [],
    tasks:             docTasks.map((t) => ({
      id:                 t.id,
      workflowStepId:     String(t.stepOrderIndex ?? ''),
      stepName:           t.stepName,
      assignedToUserId:   t.assignedUserId,
      assignedToUserName: t.assignedUserName,
      status:             t.status,
      actionTaken:        t.actionTaken ?? null,
      comment:            t.comment,
      dueAt:              t.dueDate,
      completedAt:        t.completedAt,
      createdAt:          t.createdAt,
      allowedActions:     t.allowedActions ?? [],
      taskActions:        t.taskActions    ?? [],
    })),
    auditLogs: docAuditLogs.map((l) => ({
      id: l.id, action: l.action, stepName: l.stepName,
      userName: l.userName, comment: l.comment, createdAt: l.createdAt,
    })),
    workflowSteps: steps.map((s) => ({
      id:             s.id,
      name:           s.name,
      orderIndex:     s.orderIndex,
      isInitial:      s.isInitial,
      isFinal:        s.isFinal,
      allowedActions: s.allowedActions,
      actions:        s.actions,
      deadlineMode:   s.deadlineMode,
      deadlineValue:  s.deadlineValue,
      responsibles:   s.responsibles,
      transitions:    s.transitions,
      instructions:   s.instructions,
      helpText:       s.helpText,
    })),
  }
}

// ─── GET metadados: merged com valores salvos ────────────────────────────────
// CORREÇÃO: retorna value correto para campos da etapa atual

function getMetadataValuesForDocument(db: MockDb, documentId: string): Array<Record<string, unknown>> {
  const doc = db.documentInstances.find((d) => d.id === documentId)

  // Todos os valores persistidos para este documento
  const savedValues = clone(db.metadataValues).filter(
    (v: Record<string, unknown>) => String(v.documentInstanceId) === documentId,
  ) as Array<Record<string, unknown>>

  if (!doc) return savedValues

  const docSteps   = Array.isArray(doc._steps) ? (doc._steps as Array<Record<string, unknown>>) : []
  const wf         = db.workflows.find((w) => w.id === doc.workflowId) as Record<string, unknown> | undefined
  const rawStepsM  = ((wf?.steps as Array<Record<string, unknown>>) ?? []).length > 0
    ? (wf?.steps as Array<Record<string, unknown>>)
    : docSteps
  const steps      = enrichStepsWithElementConfigs(String(doc.workflowId ?? ''), rawStepsM)
  const currStep   = steps.find((s) => s.orderIndex === doc.currentStepOrderIndex)
  const stepFields = Array.isArray(currStep?.metadataFields)
    ? (currStep!.metadataFields as Array<Record<string, unknown>>)
    : []

  // Mapa de valores salvos por metadataDefinitionId para lookup O(1)
  const savedMap = new Map<string, Record<string, unknown>>()
  savedValues.forEach((sv) => savedMap.set(String(sv.metadataDefinitionId ?? ''), sv))

  // 1. Campos da etapa atual — com valor salvo injetado
  const merged: Array<Record<string, unknown>> = stepFields.map((field) => {
    const defId = String(field.metadataDefinitionId ?? '')
    const saved = savedMap.get(defId)

    return {
      metadataDefinitionId: defId,
      name:        String(field.name  ?? field.label ?? defId),
      label:       String(field.label ?? field.name  ?? defId),
      fieldType:   String(field.fieldType ?? 'text'),
      maskType:    field.maskType ?? null,
      isRequired:  Boolean(field.isRequired),
      isReadOnly:  Boolean(field.isReadOnly),
      options:     Array.isArray(field.options)      ? field.options      : [],
      tableColumns: Array.isArray(field.tableColumns) ? field.tableColumns : [],
      // CORREÇÃO: usa valor salvo se existir, senão null
      value: saved !== undefined ? (saved.value ?? null) : null,
    }
  })

  // 2. Valores salvos de etapas ANTERIORES (não presentes na etapa atual)
  //    Exibidos como read-only — são histórico de etapas já concluídas
  const mergedIds = new Set(stepFields.map((f) => String(f.metadataDefinitionId ?? '')))

  savedValues.forEach((sv) => {
    const defId = String(sv.metadataDefinitionId ?? '')
    if (mergedIds.has(defId)) return // já incluído acima

    merged.push({
      metadataDefinitionId: defId,
      name:       String(sv.name  ?? sv.label ?? defId),
      label:      String(sv.label ?? sv.name  ?? defId),
      fieldType:  String(sv.fieldType ?? 'text'),
      maskType:   sv.maskType ?? null,
      isRequired: Boolean(sv.isRequired),
      isReadOnly: true, // campos de etapas passadas são sempre read-only
      options:    Array.isArray(sv.options)      ? sv.options      : [],
      tableColumns: Array.isArray(sv.tableColumns) ? sv.tableColumns : [],
      value:      sv.value ?? null,
    })
  })

  return merged
}

// ─── Resolução de rotas ──────────────────────────────────────────────────────

type RouteResolution = { collection: keyof ReturnType<typeof getMockDb>; id?: string; action?: string } | null

function resolveRoute(rawUrl: string): RouteResolution {
  const url = rawUrl.split('?')[0]

  if (/^\/tasks\/[^/]+\/execute$/.test(url))
    return { collection: 'tasks', id: url.split('/')[2], action: 'execute' }

  if (/^\/document-instances\/[^/]+\/cancel$/.test(url) || /^\/documentInstances\/[^/]+\/cancel$/.test(url))
    return { collection: 'documentInstances', id: url.split('/')[2], action: 'cancel' }

  if (/^\/metadataValues\/by-document\/[^/]+$/.test(url))
    return { collection: 'metadataValues', id: url.split('/').pop() ?? '', action: 'byDocument' }

  if (/^\/metadata\/values\/[^/]+$/.test(url))
    return { collection: 'metadataValues', id: url.split('/')[3] ?? '', action: 'byDocument' }

  if (url === '/dashboard/summary' || url === '/dashboards/summary')
    return { collection: 'dashboards', action: 'summary' }

  const routes: Array<[RegExp, keyof ReturnType<typeof getMockDb>]> = [
    [/^\/platformAdmins(?:\/(.+))?$/,                'platformAdmins'],
    [/^\/platform-admins(?:\/(.+))?$/,               'platformAdmins'],
    [/^\/accounts(?:\/(.+))?$/,                      'accounts'],
    [/^\/accountModules(?:\/(.+))?$/,                'accountModules'],
    [/^\/account-modules(?:\/(.+))?$/,               'accountModules'],
    [/^\/tenantModules(?:\/(.+))?$/,                 'accountModules'],
    [/^\/tenant-modules(?:\/(.+))?$/,                'accountModules'],
    [/^\/processes(?:\/(.+))?$/,                     'processes'],
    [/^\/users(?:\/(.+))?$/,                         'users'],
    [/^\/userAccountMemberships(?:\/(.+))?$/,        'userAccountMemberships'],
    [/^\/user-account-memberships(?:\/(.+))?$/,      'userAccountMemberships'],
    [/^\/userProcessMemberships(?:\/(.+))?$/,        'userProcessMemberships'],
    [/^\/user-process-memberships(?:\/(.+))?$/,      'userProcessMemberships'],
    [/^\/organizationAreas(?:\/(.+))?$/,             'organizationAreas'],
    [/^\/organization\/areas(?:\/(.+))?$/,           'organizationAreas'],
    [/^\/organizationDisciplines(?:\/(.+))?$/,       'organizationDisciplines'],
    [/^\/organization\/disciplines(?:\/(.+))?$/,     'organizationDisciplines'],
    [/^\/organizationRoles(?:\/(.+))?$/,             'organizationRoles'],
    [/^\/organization\/roles(?:\/(.+))?$/,           'organizationRoles'],
    [/^\/organizationGroups(?:\/(.+))?$/,            'organizationGroups'],
    [/^\/organization\/groups(?:\/(.+))?$/,          'organizationGroups'],
    [/^\/documentInstances(?:\/(.+))?$/,             'documentInstances'],
    [/^\/document-instances(?:\/(.+))?$/,            'documentInstances'],
    [/^\/tasks(?:\/(.+))?$/,                         'tasks'],
    [/^\/workflows(?:\/(.+))?$/,                     'workflows'],
    [/^\/metadataSets(?:\/(.+))?$/,                  'metadataSets'],
    [/^\/metadata\/sets(?:\/(.+))?$/,                'metadataSets'],
    [/^\/metadataDefinitions(?:\/(.+))?$/,           'metadataDefinitions'],
    [/^\/metadata\/definitions(?:\/(.+))?$/,         'metadataDefinitions'],
    [/^\/metadataValues(?:\/(.+))?$/,                'metadataValues'],
    [/^\/metadata\/values(?:\/(.+))?$/,              'metadataValues'],
    [/^\/notificationTemplates(?:\/(.+))?$/,         'notificationTemplates'],
    [/^\/notification-templates(?:\/(.+))?$/,        'notificationTemplates'],
    [/^\/dashboards(?:\/(.+))?$/,                    'dashboards'],
    [/^\/dashboard(?:\/(.+))?$/,                     'dashboards'],
    [/^\/auditLogs(?:\/(.+))?$/,                     'auditLogs'],
    [/^\/audit-logs(?:\/(.+))?$/,                    'auditLogs'],
    [/^\/tenants\/[^/]+\/environment-configurations(?:\/(.+))?$/, 'environmentConfigurations'],
  ]

  for (const [pattern, collection] of routes) {
    const match = url.match(pattern)
    if (match) return { collection, id: match[1] }
  }

  return null
}

export function installMockAdapter(instance: AxiosInstance) {
  instance.interceptors.request.use((config): never => {
    const url      = config.url ?? ''
    const method   = (config.method ?? 'get').toLowerCase()
    const params   = (config.params ?? {}) as Record<string, unknown>
    const resolved = resolveRoute(url)

    if (!resolved) throw { isMockResponse: true, response: makeResponse([]) }

    const db = getMockDb()
    const { collection, id, action } = resolved

    if (collection === 'dashboards' && action === 'summary')
      throw { isMockResponse: true, response: makeResponse(findBestDashboard(db.dashboards, params)) }

    if (collection === 'environmentConfigurations') {
      const tenantId = url.split('/')[2] ?? ''
      if (method === 'get') {
        const cfgs = clone(db.environmentConfigurations).filter(
          (c: Record<string, unknown>) => c.tenantId === tenantId || c.accountId === tenantId,
        )
        throw { isMockResponse: true, response: makeResponse(cfgs) }
      }
      if (method === 'post') {
        const body   = parseBody(config.data)
        const newCfg = { id: generateId('env'), tenantId, accountId: tenantId, sequentialCurrentValue: 0, sequentialLastPeriod: '', createdAt: new Date().toISOString(), ...body }
        db.environmentConfigurations.push(newCfg as any)
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse(newCfg, 201) }
      }
      if ((method === 'put' || method === 'patch') && id) {
        const idx = db.environmentConfigurations.findIndex((c) => c.id === id)
        if (idx >= 0) {
          const body = parseBody(config.data)
          db.environmentConfigurations[idx] = { ...db.environmentConfigurations[idx], ...body, updatedAt: new Date().toISOString() } as any
          saveMockDb(db)
          throw { isMockResponse: true, response: makeResponse(db.environmentConfigurations[idx]) }
        }
      }
      throw { isMockResponse: true, response: makeResponse([]) }
    }

    const items = clone(db[collection]) as Array<Record<string, unknown>>

    // ── GET ──────────────────────────────────────────────────────────────────
    if (method === 'get') {

      // GET /metadata/values/:documentId
      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        throw { isMockResponse: true, response: makeResponse(getMetadataValuesForDocument(db, id)) }
      }

      if (id) {
        const item = items.find((entry) => String(entry.id) === id)
        if (!item) throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
        if (collection === 'documentInstances')
          throw { isMockResponse: true, response: makeResponse(enrichDocument(db, item)) }
        throw { isMockResponse: true, response: makeResponse(item) }
      }

      let result = [...items]
      Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') return
        const normalizedKey = key === 'tenantId' ? 'accountId' : key
        result = result.filter((entry) => String(entry[normalizedKey]) === String(value))
      })

      if (collection === 'documentInstances') {
        result = result.map((doc) => {
          const wf = db.workflows.find((w) => w.id === doc.workflowId) as Record<string, unknown> | undefined
          return {
            ...doc,
            workflowName:      wf ? String(wf.name ?? '') : (doc.workflowName ?? ''),
            createdByUserName: doc.createdByName ?? doc.createdByUserName ?? '',
            revision:          (doc as any).revision ?? null,
            parentDocumentId:  (doc as any).parentDocumentId ?? null,
          }
        })
      }

      throw { isMockResponse: true, response: makeResponse(result) }
    }

    // ── POST ─────────────────────────────────────────────────────────────────
    if (method === 'post') {

      // Execução de tarefa
      if (collection === 'tasks' && action === 'execute' && id) {
        const body      = parseBody(config.data)
        const taskIndex = db.tasks.findIndex((task) => task.id === id)
        if (taskIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Tarefa não encontrada' }, 404) }

        const now        = new Date().toISOString()
        const actionName = String(body.action ?? '')
        const comment    = body.comment ? String(body.comment) : null

        db.tasks[taskIndex] = {
          ...db.tasks[taskIndex],
          status: 'completed', completedAt: now, comment,
          actionTaken: actionName, allowedActions: [], updatedAt: now,
        }

        const docIndex = db.documentInstances.findIndex((d) => d.id === db.tasks[taskIndex].documentInstanceId)
        if (docIndex >= 0) {
          const doc      = db.documentInstances[docIndex]
          const workflow = db.workflows.find((w) => w.id === doc.workflowId) as Record<string, unknown> | undefined
          const docSteps = Array.isArray(doc._steps) ? (doc._steps as Array<Record<string, unknown>>) : []
          const steps    = ((workflow?.steps as Array<Record<string, unknown>>) ?? []).length > 0
            ? (workflow?.steps as Array<Record<string, unknown>>)
            : docSteps
          const currStep = steps.find((s) => s.orderIndex === doc.currentStepOrderIndex)
          const transition = (currStep?.transitions as Array<Record<string, unknown>> | undefined)
            ?.find((t) => t.triggerAction === actionName)

          let nextStatus         = doc.status
          let nextStepName       = doc.currentStepName
          let nextStepOrderIndex = doc.currentStepOrderIndex

          const wfForTask = workflow ?? {
            id: String(doc.workflowId ?? ''), processId: String(doc.processId ?? ''),
            processName: String(doc.processName ?? ''), steps,
          }

          // pendingNextStep: etapa seguinte resolvida — será processada após update do doc
          let pendingNextStep: Record<string, unknown> | null = null

          if (actionName === 'reject') {
            const rejectTransition = (currStep?.transitions as Array<Record<string, unknown>> | undefined)
              ?.find((t) => t.triggerAction === 'reject' || t.triggerAction === 'return' || t.triggerAction === 'request-changes')
            if (rejectTransition) {
              const rejectStep = steps.find((s) => s.orderIndex === rejectTransition.toStepOrderIndex)
              if (rejectStep) {
                nextStepName = String(rejectStep.name ?? ''); nextStepOrderIndex = rejectStep.orderIndex as number; nextStatus = 'in_progress'
                pendingNextStep = rejectStep
              } else { nextStatus = 'rejected'; nextStepName = null; nextStepOrderIndex = null }
            } else { nextStatus = 'rejected'; nextStepName = null; nextStepOrderIndex = null }
          } else if (actionName === 'cancel') {
            nextStatus = 'cancelled'; nextStepName = null; nextStepOrderIndex = null
          } else if (transition !== undefined) {
            const nextStep = steps.find((s) => s.orderIndex === transition.toStepOrderIndex)
            if (nextStep) {
              nextStepName = String(nextStep.name ?? ''); nextStepOrderIndex = nextStep.orderIndex as number; nextStatus = 'in_progress'
              pendingNextStep = nextStep
            }
          } else if (actionName === 'publish' || currStep?.isFinal) {
            nextStatus = 'published'; nextStepName = null; nextStepOrderIndex = null
          } else if (transition === undefined && currStep) {
            const nextSeqStep = steps.find((s) => (s.orderIndex as number) === (currStep.orderIndex as number) + 1)
            if (nextSeqStep) {
              nextStepName = String(nextSeqStep.name ?? ''); nextStepOrderIndex = nextSeqStep.orderIndex as number; nextStatus = 'in_progress'
              pendingNextStep = nextSeqStep
            }
          }

          db.documentInstances[docIndex] = {
            ...doc, status: nextStatus, currentStepName: nextStepName,
            currentStepOrderIndex: nextStepOrderIndex, updatedAt: now,
          }

          const executorUser = db.users.find((u) => u.id === String((doc as any).responsibleId ?? ''))
          const executorName = executorUser?.name ?? String((doc as any).createdByName ?? '')
          const stepLabel    = currStep ? String(currStep.name ?? '') : ''
          if (nextStatus === 'rejected')   addAuditLog(db, String(doc.id), 'DocumentoRejected',   { stepName: stepLabel, userName: executorName, comment })
          else if (nextStatus === 'cancelled') addAuditLog(db, String(doc.id), 'DocumentoCancelled', { stepName: stepLabel, userName: executorName, comment })
          else if (nextStatus === 'published') addAuditLog(db, String(doc.id), 'DocumentoPublished', { stepName: stepLabel, userName: executorName, comment })
          else addAuditLog(db, String(doc.id), 'TaskExecuted', { stepName: stepLabel, userName: executorName, comment })

          // ── Processa a próxima etapa: evento automático ou tarefa humana ─────
          if (pendingNextStep && nextStatus === 'in_progress') {
            const wasAutoEvent =
              executeIntermediateEventIfNeeded(
                db, docIndex, pendingNextStep, steps, wfForTask as Record<string, unknown>, executorName
              ) ||
              executeSystemTaskIfNeeded(
                db, docIndex, pendingNextStep, steps, wfForTask as Record<string, unknown>, executorName
              )
            if (!wasAutoEvent) {
              createTaskForStep(
                db,
                db.documentInstances[docIndex] as unknown as Record<string, unknown>,
                wfForTask as Record<string, unknown>,
                pendingNextStep,
                String(doc.createdById ?? ''),
              )
            }
          }

          // ── system-task: executada automaticamente via executeSystemTaskIfNeeded ──
        }

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // Cancelamento de documento
      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex((doc) => doc.id === id)
        if (documentIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Documento não encontrado' }, 404) }
        const cancelledDoc = db.documentInstances[documentIndex]
        db.documentInstances[documentIndex] = { ...cancelledDoc, status: 'cancelled', updatedAt: new Date().toISOString() }
        addAuditLog(db, id, 'DocumentoCancelled', { userName: String((cancelledDoc as any).createdByName ?? '') })
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // Salvar metadados por documento
      if (collection === 'metadataValues' && action === 'byDocument' && id) {
        const body   = parseBody(config.data)
        const values = Array.isArray(body.values) ? body.values : []
        const doc    = db.documentInstances.find((d) => d.id === id)
        const scope  = doc ? { accountId: String(doc.accountId ?? ''), processId: String(doc.processId ?? '') } : {}

        values.forEach((incoming) => {
          const payload              = incoming as Record<string, unknown>
          const metadataDefinitionId = String(payload.metadataDefinitionId ?? '')
          const currentIndex = db.metadataValues.findIndex(
            (item) => item.documentInstanceId === id && item.metadataDefinitionId === metadataDefinitionId,
          )

          if (currentIndex >= 0) {
            db.metadataValues[currentIndex] = {
              ...db.metadataValues[currentIndex], ...payload,
              documentInstanceId: id, updatedAt: new Date().toISOString(),
            }
          } else {
            db.metadataValues.push({
              id:                    generateId('mval'),
              documentInstanceId:    id,
              metadataDefinitionId,
              accountId:  String(payload.accountId  ?? scope.accountId  ?? ''),
              processId:  String(payload.processId  ?? scope.processId  ?? ''),
              name:       String(payload.name       ?? ''),
              label:      String(payload.label      ?? ''),
              fieldType:  String(payload.fieldType  ?? 'text'),
              isRequired: Boolean(payload.isRequired),
              value:      payload.value,
              createdAt:  new Date().toISOString(),
              updatedAt:  new Date().toISOString(),
            })
          }
        })

        if (doc) {
          addAuditLog(db, id, 'MetadataSaved', {
            stepName: String(doc.currentStepName ?? ''),
            userName: String((doc as any).createdByName ?? ''),
          })
        }

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      // ── CRIAÇÃO DE DOCUMENTO ─────────────────────────────────────────────
      if (collection === 'documentInstances' && !action) {
        const body      = parseBody(config.data)
        const now       = new Date().toISOString()
        const accountId = String(body.accountId ?? '')

        const workflow  = db.workflows.find((w) => w.id === String(body.workflowId ?? '')) as Record<string, unknown> | undefined
        const bodySteps = Array.isArray(body.steps) ? (body.steps as Array<Record<string, unknown>>) : []
        const steps     = ((workflow?.steps as Array<Record<string, unknown>>) ?? []).length > 0
          ? (workflow?.steps as Array<Record<string, unknown>>)
          : bodySteps
        const initStep  = steps.find((s) => s.isInitial === true) ?? steps[0]
        const docCode   = generateDocumentCode(db, accountId)

        const newDoc = {
          id:                    generateId('doc'),
          accountId,
          processId:             String(body.processId   ?? workflow?.processId  ?? ''),
          processName:           String(body.processName ?? workflow?.processName ?? ''),
          title:                 String(body.title       ?? ''),
          code:                  docCode,
          revision:              getRevisionConfig(db).initialValue,
          parentDocumentId:      null,
          status:                'in_progress',
          workflowId:            String(body.workflowId  ?? ''),
          workflowName:          String(body.workflowName ?? workflow?.name ?? ''),
          currentStepName:       initStep ? String(initStep.name ?? '') : null,
          currentStepOrderIndex: initStep ? (initStep.orderIndex as number) : null,
          responsibleId:         String(body.createdById  ?? ''),
          responsibleName:       String(body.createdByName ?? ''),
          createdById:           String(body.createdById  ?? ''),
          createdByName:         String(body.createdByName ?? ''),
          createdAt:             now,
          updatedAt:             now,
          dueDate:               null,
          _steps:                steps.length > 0 ? steps : undefined,
        }

        db.documentInstances.push(newDoc)

        // ── CORREÇÃO: persiste os metadados iniciais preenchidos na criação ──
        const initialMetadataValues = (body.initialMetadataValues ?? {}) as Record<string, unknown>
        if (Object.keys(initialMetadataValues).length > 0) {
          persistInitialMetadataValues(
            db,
            newDoc.id,
            accountId,
            String(newDoc.processId),
            initialMetadataValues,
            steps,
          )

          addAuditLog(db, newDoc.id, 'MetadataSaved', {
            stepName: initStep ? String(initStep.name ?? '') : null,
            userName: String(body.createdByName ?? ''),
          })
        }
        // ────────────────────────────────────────────────────────────────────

        if (initStep) {
          const wfForTask = workflow ?? {
            id: String(body.workflowId ?? ''), name: String(body.workflowName ?? ''),
            processId: String(body.processId ?? ''), processName: String(body.processName ?? ''), steps,
          }
          createTaskForStep(db, newDoc as Record<string, unknown>, wfForTask as Record<string, unknown>, initStep, newDoc.createdById)
        }

        addAuditLog(db, newDoc.id, 'DocumentoCreated', {
          stepName: initStep ? String(initStep.name ?? '') : null,
          userName: String(body.createdByName ?? ''),
        })

        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse(newDoc, 201) }
      }

      // POST genérico
      const body    = parseBody(config.data)
      const newItem = { id: generateId(String(collection).slice(0, 4)), createdAt: new Date().toISOString(), isActive: true, ...body }
      saveMockDb({ ...db, [collection]: [...(db[collection] as unknown[]), newItem] } as typeof db)
      throw { isMockResponse: true, response: makeResponse(newItem, 201) }
    }

    // ── PUT / PATCH ───────────────────────────────────────────────────────────
    if (method === 'put' || method === 'patch') {
      if (collection === 'documentInstances' && action === 'cancel' && id) {
        const documentIndex = db.documentInstances.findIndex((doc) => doc.id === id)
        if (documentIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Documento não encontrado' }, 404) }
        const patchDoc = db.documentInstances[documentIndex]
        db.documentInstances[documentIndex] = { ...patchDoc, status: 'cancelled', updatedAt: new Date().toISOString() }
        addAuditLog(db, id, 'DocumentoCancelled', { userName: String((patchDoc as any).createdByName ?? '') })
        saveMockDb(db)
        throw { isMockResponse: true, response: makeResponse({ success: true }) }
      }

      if (!id) throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      const body         = parseBody(config.data)
      const currentIndex = items.findIndex((entry) => String(entry.id) === id)
      if (currentIndex < 0) throw { isMockResponse: true, response: makeResponse({ message: 'Registro não encontrado' }, 404) }
      const updated   = { ...items[currentIndex], ...body, updatedAt: new Date().toISOString() }
      const nextItems = [...items]
      nextItems[currentIndex] = updated
      saveMockDb({ ...db, [collection]: nextItems } as typeof db)
      throw { isMockResponse: true, response: makeResponse(updated) }
    }

    // ── DELETE ────────────────────────────────────────────────────────────────
    if (method === 'delete') {
      if (!id) throw { isMockResponse: true, response: makeResponse({ message: 'ID obrigatório' }, 400) }
      saveMockDb({ ...db, [collection]: items.filter((entry) => String(entry.id) !== id) } as typeof db)
      throw { isMockResponse: true, response: makeResponse({}, 204) }
    }

    throw { isMockResponse: true, response: makeResponse([]) }
  })

  instance.interceptors.response.use(
    (response) => response,
    (error) => { if (error?.isMockResponse) return Promise.resolve(error.response); return Promise.reject(error) },
  )
}