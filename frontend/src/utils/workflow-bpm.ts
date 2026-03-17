import type { Workflow, WorkflowStep, WorkflowTransition } from '../types'

export type BpmNodeType = 'start' | 'activity' | 'gateway' | 'end'

export type BpmNode = {
  id: string
  type: BpmNodeType
  label: string
  x: number
  y: number
  stepId?: string
  meta?: Record<string, unknown>
}

export type BpmEdge = {
  id: string
  source: string
  target: string
  label?: string
}

type WorkflowStepLike = WorkflowStep & {
  id?: string
  orderIndex: number
  name: string
  isInitial?: boolean
  isFinal?: boolean
  transitions?: WorkflowTransition[]
}

type WorkflowTransitionLike = WorkflowTransition & {
  toStepId?: string
  toStepOrderIndex?: number
  toStepName?: string
  triggerAction?: string
}

export function normalizeWorkflowSteps(workflow?: Workflow): WorkflowStepLike[] {
  return (workflow?.steps ?? [])
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
}

export function getInitialStep(steps: WorkflowStepLike[]) {
  return (
    steps.find((step) => step.isInitial) ??
    steps.slice().sort((a, b) => a.orderIndex - b.orderIndex)[0]
  )
}

export function getFinalSteps(steps: WorkflowStepLike[]) {
  return steps.filter((step) => step.isFinal)
}

export function resolveTransitionTarget(
  transition: WorkflowTransitionLike,
  steps: WorkflowStepLike[]
): WorkflowStepLike | undefined {
  if (transition.toStepId) {
    const byId = steps.find((step) => step.id === transition.toStepId)
    if (byId) return byId
  }

  if (typeof transition.toStepOrderIndex === 'number') {
    const byOrder = steps.find(
      (step) => step.orderIndex === transition.toStepOrderIndex
    )
    if (byOrder) return byOrder
  }

  if (transition.toStepName) {
    const byName = steps.find((step) => step.name === transition.toStepName)
    if (byName) return byName
  }

  return undefined
}

export function buildBpmGraph(workflow: Workflow): {
  nodes: BpmNode[]
  edges: BpmEdge[]
} {
  const steps = normalizeWorkflowSteps(workflow)

  if (!steps.length) {
    return { nodes: [], edges: [] }
  }

  const nodes: BpmNode[] = []
  const edges: BpmEdge[] = []

  const startNodeId = 'bpm-start'
  const endNodeId = 'bpm-end'

  const startX = 80
  const activityX = 240
  const gatewayX = 480
  const targetX = 760
  const rowGap = 150
  const topBase = 80

  const initialStep = getInitialStep(steps)

  nodes.push({
    id: startNodeId,
    type: 'start',
    label: 'Início',
    x: startX,
    y: topBase,
  })

  const stepNodeIdMap = new Map<string, string>()
  const stepYMap = new Map<string, number>()

  steps.forEach((step, index) => {
    const nodeId = `step-${step.id ?? step.orderIndex}`
    const y = topBase + index * rowGap

    stepNodeIdMap.set(step.id ?? String(step.orderIndex), nodeId)
    stepYMap.set(step.id ?? String(step.orderIndex), y)

    nodes.push({
      id: nodeId,
      type: 'activity',
      label: step.name,
      x: activityX,
      y,
      stepId: step.id,
      meta: {
        orderIndex: step.orderIndex,
        isInitial: step.isInitial,
        isFinal: step.isFinal,
      },
    })
  })

  const finalSteps = getFinalSteps(steps)

  const endY =
    finalSteps.length > 0
      ? Math.max(
          ...finalSteps.map(
            (step) => stepYMap.get(step.id ?? String(step.orderIndex)) ?? topBase
          )
        )
      : topBase + steps.length * rowGap

  nodes.push({
    id: endNodeId,
    type: 'end',
    label: 'Fim',
    x: targetX + 220,
    y: endY,
  })

  if (initialStep) {
    const initialNodeId =
      stepNodeIdMap.get(initialStep.id ?? String(initialStep.orderIndex)) ?? ''
    if (initialNodeId) {
      edges.push({
        id: `edge-start-${initialNodeId}`,
        source: startNodeId,
        target: initialNodeId,
      })
    }
  }

  steps.forEach((step) => {
    const stepKey = step.id ?? String(step.orderIndex)
    const sourceStepNodeId = stepNodeIdMap.get(stepKey)
    const transitions = (step.transitions ?? []) as WorkflowTransitionLike[]
    const stepY = stepYMap.get(stepKey) ?? topBase

    if (!sourceStepNodeId) return

    if (step.isFinal || transitions.length === 0) {
      edges.push({
        id: `edge-${sourceStepNodeId}-end`,
        source: sourceStepNodeId,
        target: endNodeId,
      })
      return
    }

    if (transitions.length === 1) {
      const transition = transitions[0]
      const targetStep = resolveTransitionTarget(transition, steps)

      if (targetStep) {
        const targetId =
          stepNodeIdMap.get(targetStep.id ?? String(targetStep.orderIndex)) ?? ''
        if (targetId) {
          edges.push({
            id: `edge-${sourceStepNodeId}-${targetId}-${transition.triggerAction ?? 'flow'}`,
            source: sourceStepNodeId,
            target: targetId,
            label: transition.triggerAction,
          })
        }
      }

      return
    }

    const gatewayId = `gateway-${step.id ?? step.orderIndex}`

    nodes.push({
      id: gatewayId,
      type: 'gateway',
      label: 'Desvio',
      x: gatewayX,
      y: stepY,
      stepId: step.id,
    })

    edges.push({
      id: `edge-${sourceStepNodeId}-${gatewayId}`,
      source: sourceStepNodeId,
      target: gatewayId,
    })

    transitions.forEach((transition, index) => {
      const targetStep = resolveTransitionTarget(transition, steps)

      if (!targetStep) return

      const targetId =
        stepNodeIdMap.get(targetStep.id ?? String(targetStep.orderIndex)) ?? ''

      if (!targetId) return

      edges.push({
        id: `edge-${gatewayId}-${targetId}-${index}`,
        source: gatewayId,
        target: targetId,
        label: transition.triggerAction,
      })
    })
  })

  return { nodes, edges }
}