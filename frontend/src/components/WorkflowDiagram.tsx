import {
  useMemo,
  useState,
  useEffect,
  useRef,
  useCallback,
  type MouseEvent as ReactMouseEvent,
} from 'react'
import { Card, Empty, Typography, Space, Button } from 'antd'
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  ExpandOutlined,
  DragOutlined,
} from '@ant-design/icons'
import type {
  Workflow,
  WorkflowStep,
  WorkflowTransition,
  WorkflowEventDefinition,
  WorkflowNodePosition,
} from '../types'

const { Text } = Typography

type DiagramNodeType = 'start' | 'activity' | 'gateway' | 'end'

type DiagramNode = {
  id: string
  type: DiagramNodeType
  label: string
  x: number
  y: number
  stepId?: string
  orderIndex?: number
  step?: WorkflowStep
  subtitle?: string
  events?: WorkflowEventDefinition[]
}

type DiagramEdge = {
  id: string
  source: string
  target: string
  label?: string
  color?: string
  kind?: 'normal' | 'gateway' | 'return' | 'to-end'
  lane?: number
  transition?: WorkflowTransition
  events?: WorkflowEventDefinition[]
}

type EventClickPayload = {
  scope: 'start' | 'step' | 'transition'
  workflow: Workflow
  events: WorkflowEventDefinition[]
  step?: WorkflowStep
  transition?: WorkflowTransition
}

type Props = {
  workflow: Workflow
  height?: number
  editable?: boolean
  onStepClick?: (step: WorkflowStep) => void
  onStartClick?: (workflow: Workflow) => void
  onEventClick?: (payload: EventClickPayload) => void
  onLayoutChange?: (nodePositions: Record<string, WorkflowNodePosition>) => void
}

const NODE_WIDTH = 170
const NODE_HALF_WIDTH = NODE_WIDTH / 2
const START_RADIUS = 30
const END_RADIUS = 24
const GATEWAY_HALF = 22

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function truncate(text?: string, max = 18) {
  if (!text) return ''
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function getNodeHalf(nodeType: DiagramNodeType) {
  if (nodeType === 'activity') return NODE_HALF_WIDTH
  if (nodeType === 'gateway') return GATEWAY_HALF
  if (nodeType === 'start') return START_RADIUS
  return END_RADIUS
}

function getOrderedSteps(workflow: Workflow): WorkflowStep[] {
  return [...(workflow.steps ?? [])].sort(
    (a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0)
  )
}

function resolveTargetStep(
  transition: WorkflowTransition,
  steps: WorkflowStep[]
): WorkflowStep | undefined {
  if (transition.toStepId) {
    const byId = steps.find((step) => step.id === transition.toStepId)
    if (byId) return byId
  }

  const targetOrderIndex = transition.toStepOrderIndex
  if (targetOrderIndex !== undefined) {
    const byOrder = steps.find((step) => step.orderIndex === targetOrderIndex)
    if (byOrder) return byOrder
  }

  if (transition.toStepName) {
    const byName = steps.find((step) => step.name === transition.toStepName)
    if (byName) return byName
  }

  return undefined
}

function getEdgeColor(action?: string) {
  const map: Record<string, string> = {
    aprovar: '#52c41a',
    reprovar: '#ff4d4f',
    devolver: '#fa8c16',
    enviar: '#1677ff',
    concluir: '#13c2c2',
    publicar: '#722ed1',
    arquivar: '#64748b',
    cancelar: '#8c8c8c',
    solicitar: '#eb2f96',
    revisar: '#13c2c2',
  }

  return map[(action || '').toLowerCase()] || '#64748b'
}

function getResponsibleLabel(step: WorkflowStep): string | null {
  const s = step as WorkflowStep & {
    responsibles?: Array<
      | string
      | {
          id?: string
          name?: string
          fullName?: string
          roleName?: string
          positionName?: string
        }
    >
    assignees?: Array<
      | string
      | {
          id?: string
          name?: string
          fullName?: string
          roleName?: string
        }
    >
    users?: Array<
      | string
      | {
          id?: string
          name?: string
          fullName?: string
        }
    >
  }

  const list = s.responsibles ?? s.assignees ?? s.users ?? []
  if (!list.length) return null

  const first = list[0]
  if (typeof first === 'string') return first

  return (
    first.name ||
    first.fullName ||
    (first as { roleName?: string }).roleName ||
    (first as { positionName?: string }).positionName ||
    null
  )
}

function getActiveEvents(events?: WorkflowEventDefinition[]) {
  return (events ?? []).filter((event) => event.active !== false)
}

function getEventColor(type?: WorkflowEventDefinition['type']) {
  switch (type) {
    case 'notification':
      return '#1677ff'
    case 'flow-change':
      return '#722ed1'
    case 'extra-check':
      return '#fa8c16'
    case 'webhook':
      return '#13c2c2'
    case 'integration':
      return '#52c41a'
    case 'task':
      return '#eb2f96'
    default:
      return '#64748b'
  }
}

function getEventShortLabel(type?: WorkflowEventDefinition['type']) {
  switch (type) {
    case 'notification':
      return 'NOT'
    case 'flow-change':
      return 'FLX'
    case 'extra-check':
      return 'CHK'
    case 'webhook':
      return 'WEB'
    case 'integration':
      return 'INT'
    case 'task':
      return 'TSK'
    default:
      return 'EV'
  }
}

function getEventSummary(events?: WorkflowEventDefinition[]) {
  const list = getActiveEvents(events)
  if (!list.length) return null

  const distinctTypes = Array.from(
    new Set(list.map((item) => getEventShortLabel(item.type)))
  )

  const typesPreview = distinctTypes.slice(0, 3).join(' • ')
  return `${list.length} evento${list.length > 1 ? 's' : ''}${
    typesPreview ? ` · ${typesPreview}` : ''
  }`
}

function buildDiagram(workflow: Workflow) {
  const steps = getOrderedSteps(workflow)

  if (!steps.length) {
    return {
      nodes: [] as DiagramNode[],
      edges: [] as DiagramEdge[],
      width: 1200,
      height: 700,
      topReturnY: 110,
    }
  }

  const nodes: DiagramNode[] = []
  const edges: DiagramEdge[] = []

  const START_X = 110
  const STEP_X_1 = 250
  const STEP_X_2 = 470
  const GATEWAY_X = 650
  const BRANCH_X = 930
  const END_X = 1220

  const BASE_Y = 320
  const TOP_RETURN_Y = 120
  const BRANCH_GAP_Y = 170

  const startNodeId = 'start-node'
  const endNodeId = 'end-node'

  const stepNodeMap = new Map<string, DiagramNode>()

  const startConfig = workflow.startConfig
  const startEvents = getActiveEvents(startConfig?.events)

  const initialStep =
    steps.find((step) => step.id === startConfig?.initialStepId) ??
    steps.find((step) => step.isInitial) ??
    steps[0]

  const gatewaySourceStep = steps.find(
    (step) => (step.transitions?.length ?? 0) > 1
  )

  const gatewayResolvedTargets = gatewaySourceStep
    ? (gatewaySourceStep.transitions ?? [])
        .map((transition) => resolveTargetStep(transition, steps))
        .filter(Boolean) as WorkflowStep[]
    : []

  const gatewayForwardTargets = gatewaySourceStep
    ? gatewayResolvedTargets.filter(
        (target) =>
          (target.orderIndex ?? 0) >= (gatewaySourceStep.orderIndex ?? 0)
      )
    : []

  const gatewayForwardTargetKeys = new Set(
    gatewayForwardTargets.map((step) => step.id || String(step.orderIndex))
  )

  const normalMainSteps = steps.filter((step) => {
    const key = step.id || String(step.orderIndex)
    if (step.isFinal && gatewayForwardTargetKeys.has(key)) return false
    return true
  })

  let mainIndex = 0

  nodes.push({
    id: startNodeId,
    type: 'start',
    label: startConfig?.name || 'Início',
    subtitle: startConfig?.description,
    x: START_X,
    y: BASE_Y,
    events: startEvents,
  })

  normalMainSteps.forEach((step) => {
    let x = STEP_X_1 + mainIndex * 220
    if (gatewaySourceStep && step.id === gatewaySourceStep.id) {
      x = STEP_X_2
    }

    const node: DiagramNode = {
      id: `step-${step.id || step.orderIndex}`,
      type: 'activity',
      label: step.name,
      x,
      y: BASE_Y,
      stepId: step.id,
      orderIndex: step.orderIndex,
      step,
      events: getActiveEvents(step.events),
    }

    stepNodeMap.set(step.id || String(step.orderIndex), node)
    nodes.push(node)

    if (!gatewaySourceStep || step.id !== gatewaySourceStep.id) {
      mainIndex += 1
    }
  })

  if (gatewaySourceStep) {
    gatewayForwardTargets.forEach((step, idx) => {
      const total = gatewayForwardTargets.length
      const startY =
        total === 1 ? BASE_Y : BASE_Y - ((total - 1) * BRANCH_GAP_Y) / 2

      const node: DiagramNode = {
        id: `step-${step.id || step.orderIndex}`,
        type: 'activity',
        label: step.name,
        x: BRANCH_X,
        y: startY + idx * BRANCH_GAP_Y,
        stepId: step.id,
        orderIndex: step.orderIndex,
        step,
        events: getActiveEvents(step.events),
      }

      stepNodeMap.set(step.id || String(step.orderIndex), node)
      nodes.push(node)
    })
  }

  nodes.push({
    id: endNodeId,
    type: 'end',
    label: 'Fim',
    x: END_X,
    y: BASE_Y,
  })

  const initialNode = stepNodeMap.get(
    initialStep.id || String(initialStep.orderIndex)
  )

  if (initialNode) {
    edges.push({
      id: 'edge-start-initial',
      source: startNodeId,
      target: initialNode.id,
      color: '#1677ff',
      kind: 'normal',
      lane: 0,
    })
  }

  steps.forEach((step) => {
    const sourceNode = stepNodeMap.get(step.id || String(step.orderIndex))
    if (!sourceNode) return

    const transitions = step.transitions ?? []

    if (step.isFinal) {
      edges.push({
        id: `edge-${sourceNode.id}-end`,
        source: sourceNode.id,
        target: endNodeId,
        color: '#52c41a',
        kind: 'to-end',
        lane: 0,
      })
      return
    }

    if (transitions.length === 0) {
      edges.push({
        id: `edge-${sourceNode.id}-end`,
        source: sourceNode.id,
        target: endNodeId,
        color: '#94a3b8',
        kind: 'to-end',
        lane: 0,
      })
      return
    }

    if (transitions.length === 1) {
      const transition = transitions[0]
      const targetStep = resolveTargetStep(transition, steps)
      if (!targetStep) return

      const targetNode = stepNodeMap.get(
        targetStep.id || String(targetStep.orderIndex)
      )
      if (!targetNode) return

      const sourceOrderIndex = step.orderIndex ?? 0
      const targetOrderIndex = targetStep.orderIndex ?? 0
      const isReturn = targetOrderIndex < sourceOrderIndex

      edges.push({
        id: `edge-${sourceNode.id}-${targetNode.id}-${transition.triggerAction || 'flow'}`,
        source: sourceNode.id,
        target: targetNode.id,
        label: transition.triggerAction,
        color: getEdgeColor(transition.triggerAction),
        kind: isReturn ? 'return' : 'normal',
        lane: 0,
        transition,
        events: getActiveEvents(transition.events),
      })
      return
    }

    const gatewayId = `gateway-${step.id || step.orderIndex}`

    nodes.push({
      id: gatewayId,
      type: 'gateway',
      label: '',
      x: GATEWAY_X,
      y: sourceNode.y,
      stepId: step.id,
      orderIndex: step.orderIndex,
    })

    edges.push({
      id: `edge-${sourceNode.id}-${gatewayId}`,
      source: sourceNode.id,
      target: gatewayId,
      color: '#1677ff',
      kind: 'gateway',
      lane: 0,
    })

    transitions.forEach((transition, index) => {
      const targetStep = resolveTargetStep(transition, steps)
      if (!targetStep) return

      const targetNode = stepNodeMap.get(
        targetStep.id || String(targetStep.orderIndex)
      )
      if (!targetNode) return

      const sourceOrderIndex = step.orderIndex ?? 0
      const targetOrderIndex = targetStep.orderIndex ?? 0
      const isReturn = targetOrderIndex < sourceOrderIndex

      edges.push({
        id: `edge-${gatewayId}-${targetNode.id}-${index}`,
        source: gatewayId,
        target: targetNode.id,
        label: transition.triggerAction,
        color: getEdgeColor(transition.triggerAction),
        kind: isReturn ? 'return' : 'normal',
        lane: index,
        transition,
        events: getActiveEvents(transition.events),
      })
    })
  })

  return {
    nodes,
    edges,
    width: END_X + 220,
    height: 860,
    topReturnY: TOP_RETURN_Y,
  }
}

function applyManualPositions(
  nodes: DiagramNode[],
  nodePositions?: Record<string, WorkflowNodePosition>
) {
  if (!nodePositions) return nodes

  return nodes.map((node) => {
    const custom = nodePositions[node.id]
    if (!custom) return node

    return {
      ...node,
      x: custom.x,
      y: custom.y,
    }
  })
}

function renderNodeEventBadge(
  x: number,
  y: number,
  events: WorkflowEventDefinition[],
  onClick?: () => void
) {
  if (!events.length) return null

  const summary = getEventSummary(events) || `${events.length} evento(s)`
  const color = getEventColor(events[0]?.type)
  const width = Math.max(78, Math.min(128, summary.length * 6.1 + 18))

  return (
    <g
      style={{ cursor: onClick ? 'pointer' : 'default' }}
      onClick={(event) => {
        event.stopPropagation()
        onClick?.()
      }}
    >
      <rect
        x={x - width / 2}
        y={y}
        width={width}
        height={18}
        rx={9}
        fill="#ffffff"
        stroke={color}
        strokeWidth={1.5}
      />
      <circle cx={x - width / 2 + 10} cy={y + 9} r={3.5} fill={color} />
      <text
        x={x - width / 2 + 18}
        y={y + 12}
        fontSize="10"
        fill="#334155"
        fontWeight="500"
      >
        {truncate(summary, 18)}
      </text>
    </g>
  )
}

function renderEdgeAnnotations(
  edge: DiagramEdge,
  workflow: Workflow,
  centerX: number,
  topY: number,
  maxWidth: number,
  onEventClick?: (payload: EventClickPayload) => void
) {
  const events = getActiveEvents(edge.events)
  const hasLabel = !!edge.label
  const hasEvents = events.length > 0

  if (!hasLabel && !hasEvents) return null

  const labelWidth = hasLabel
    ? Math.max(56, Math.min(maxWidth, (edge.label?.length ?? 0) * 7.4 + 20))
    : 0

  const eventSummary = hasEvents
    ? `${events.length} evento${events.length > 1 ? 's' : ''}`
    : ''

  const eventWidth = hasEvents
    ? Math.max(74, Math.min(maxWidth, eventSummary.length * 6.8 + 20))
    : 0

  return (
    <g>
      {hasLabel && (
        <>
          <rect
            x={centerX - labelWidth / 2}
            y={topY}
            width={labelWidth}
            height={20}
            rx={8}
            fill="#ffffff"
            stroke="#e5e7eb"
          />
          <text
            x={centerX}
            y={topY + 13}
            fontSize="12"
            fill={edge.color || '#334155'}
            textAnchor="middle"
          >
            {edge.label}
          </text>
        </>
      )}

      {hasEvents && (
        <g
          style={{ cursor: onEventClick ? 'pointer' : 'default' }}
          onClick={(event) => {
            event.stopPropagation()
            if (!edge.transition) return

            onEventClick?.({
              scope: 'transition',
              workflow,
              transition: edge.transition,
              events,
            })
          }}
        >
          <rect
            x={centerX - eventWidth / 2}
            y={topY + (hasLabel ? 24 : 0)}
            width={eventWidth}
            height={18}
            rx={9}
            fill="#ffffff"
            stroke={getEventColor(events[0]?.type)}
            strokeWidth={1.5}
          />
          <circle
            cx={centerX - eventWidth / 2 + 10}
            cy={topY + (hasLabel ? 24 : 0) + 9}
            r={3.5}
            fill={getEventColor(events[0]?.type)}
          />
          <text
            x={centerX - eventWidth / 2 + 18}
            y={topY + (hasLabel ? 24 : 0) + 12}
            fontSize="10"
            fill="#334155"
            fontWeight="500"
          >
            {eventSummary}
          </text>
        </g>
      )}
    </g>
  )
}

function renderNode(
  node: DiagramNode,
  workflow: Workflow,
  editable: boolean,
  draggingNodeId: string | null,
  onNodeMouseDown: (
    event: ReactMouseEvent<SVGGElement, MouseEvent>,
    node: DiagramNode
  ) => void,
  shouldIgnoreNodeClick: (nodeId: string) => boolean,
  onStepClick?: (step: WorkflowStep) => void,
  onStartClick?: (workflow: Workflow) => void,
  onEventClick?: (payload: EventClickPayload) => void,
  hoveredNodeId?: string | null,
  setHoveredNodeId?: (id: string | null) => void
) {
  const isHovered = hoveredNodeId === node.id
  const isDragging = draggingNodeId === node.id
  const isActivityClickable = node.type === 'activity' && !!node.step
  const isStartClickable = node.type === 'start' && !!onStartClick
  const isClickable = isActivityClickable || isStartClickable
  const events = getActiveEvents(node.events)

  const cursor = editable
    ? isDragging
      ? 'grabbing'
      : 'grab'
    : isClickable
      ? 'pointer'
      : 'default'

  if (node.type === 'start') {
    return (
      <g
        key={node.id}
        style={{ cursor }}
        onMouseDown={(event) => onNodeMouseDown(event, node)}
        onClick={() => {
          if (shouldIgnoreNodeClick(node.id)) return
          onStartClick?.(workflow)
        }}
        onMouseEnter={() => setHoveredNodeId?.(node.id)}
        onMouseLeave={() => setHoveredNodeId?.(null)}
      >
        {isHovered && (isStartClickable || editable) && (
          <circle
            cx={node.x}
            cy={node.y}
            r={38}
            fill="rgba(22,119,255,0.10)"
            stroke="none"
          />
        )}

        <circle
          cx={node.x}
          cy={node.y}
          r={30}
          fill={isHovered ? '#dbeafe' : '#e6f4ff'}
          stroke="#1677ff"
          strokeWidth={3}
        />
        <circle
          cx={node.x}
          cy={node.y}
          r={22}
          fill="none"
          stroke="#1677ff"
          strokeWidth={1.5}
          opacity={0.55}
        />

        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          fontSize="12"
          fill="#0f172a"
          fontWeight="600"
        >
          {truncate(node.label, 10)}
        </text>

        <text
          x={node.x}
          y={node.y + 46}
          textAnchor="middle"
          fontSize="11"
          fill="#64748b"
        >
          {editable ? 'Clique ou arraste' : 'Clique para configurar'}
        </text>

        {events.length > 0 &&
          renderNodeEventBadge(node.x, node.y - 56, events, () => {
            onEventClick?.({
              scope: 'start',
              workflow,
              events,
            })
          })}

        {isHovered && (isStartClickable || editable) && (
          <g>
            <circle cx={node.x + 26} cy={node.y - 26} r={10} fill="#1677ff" />
            <text
              x={node.x + 26}
              y={node.y - 22}
              textAnchor="middle"
              fontSize="11"
              fill="#ffffff"
            >
              {editable ? '↕' : '⚙'}
            </text>
          </g>
        )}
      </g>
    )
  }

  if (node.type === 'gateway') {
    const size = 22
    const points = [
      `${node.x},${node.y - size}`,
      `${node.x + size},${node.y}`,
      `${node.x},${node.y + size}`,
      `${node.x - size},${node.y}`,
    ].join(' ')

    return (
      <g
        key={node.id}
        style={{ cursor }}
        onMouseDown={(event) => onNodeMouseDown(event, node)}
        onMouseEnter={() => setHoveredNodeId?.(node.id)}
        onMouseLeave={() => setHoveredNodeId?.(null)}
      >
        <polygon
          points={points}
          fill="#fff7e6"
          stroke="#fa8c16"
          strokeWidth={3}
        />
        <text
          x={node.x}
          y={node.y + 4}
          textAnchor="middle"
          fontSize="13"
          fill="#fa8c16"
        >
          ×
        </text>
      </g>
    )
  }

  if (node.type === 'end') {
    return (
      <g
        key={node.id}
        style={{ cursor }}
        onMouseDown={(event) => onNodeMouseDown(event, node)}
        onMouseEnter={() => setHoveredNodeId?.(node.id)}
        onMouseLeave={() => setHoveredNodeId?.(null)}
      >
        <circle
          cx={node.x}
          cy={node.y}
          r={24}
          fill="#f6ffed"
          stroke="#52c41a"
          strokeWidth={4}
        />
        <circle
          cx={node.x}
          cy={node.y}
          r={18}
          fill="none"
          stroke="#52c41a"
          strokeWidth={2}
        />
        <text
          x={node.x}
          y={node.y + 40}
          textAnchor="middle"
          fontSize="12"
          fill="#0f172a"
        >
          {node.label}
        </text>
      </g>
    )
  }

  const step = node.step
  const slaHours = step?.slaHours
  const responsible = step ? getResponsibleLabel(step) : null
  const isInitial = step?.isInitial
  const isFinal = step?.isFinal

  const borderColor = isInitial
    ? '#1677ff'
    : isFinal
      ? '#722ed1'
      : isHovered
        ? '#0ea5e9'
        : '#d9d9d9'

  const fillColor = isHovered ? '#f0f9ff' : '#ffffff'
  const hasInfoRow = !!(slaHours || responsible)
  const hasEventRow = events.length > 0

  const boxHeight = hasEventRow ? 96 : hasInfoRow ? 76 : 60
  const boxY = node.y - boxHeight / 2
  const titleY = hasInfoRow || hasEventRow ? node.y - 18 : node.y + 4

  return (
    <g
      key={node.id}
      style={{ cursor }}
      onMouseDown={(event) => onNodeMouseDown(event, node)}
      onClick={() => {
        if (shouldIgnoreNodeClick(node.id)) return
        if (isActivityClickable && node.step && onStepClick) {
          onStepClick(node.step)
        }
      }}
      onMouseEnter={() => setHoveredNodeId?.(node.id)}
      onMouseLeave={() => setHoveredNodeId?.(null)}
    >
      {isHovered && (isClickable || editable) && (
        <rect
          x={node.x - 87}
          y={boxY - 2}
          width={174}
          height={boxHeight + 4}
          rx={16}
          fill="rgba(14,165,233,0.12)"
          stroke="none"
        />
      )}

      <rect
        x={node.x - 85}
        y={boxY}
        width={170}
        height={boxHeight}
        rx={14}
        ry={14}
        fill={fillColor}
        stroke={borderColor}
        strokeWidth={2}
        style={{ transition: 'all 0.15s ease' }}
      />

      {(isInitial || isFinal) && (
        <rect
          x={node.x - 85}
          y={boxY}
          width={170}
          height={18}
          rx={14}
          fill={isInitial ? '#1677ff' : '#722ed1'}
          opacity={0.92}
        />
      )}

      {isInitial && (
        <text
          x={node.x}
          y={boxY + 12}
          textAnchor="middle"
          fontSize="9"
          fill="#ffffff"
          fontWeight="600"
        >
          INICIAL
        </text>
      )}

      {isFinal && (
        <text
          x={node.x}
          y={boxY + 12}
          textAnchor="middle"
          fontSize="9"
          fill="#ffffff"
          fontWeight="600"
        >
          FINAL
        </text>
      )}

      <text
        x={node.x}
        y={titleY}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="#0f172a"
      >
        {truncate(node.label, 22)}
      </text>

      {(hasInfoRow || hasEventRow) && (
        <line
          x1={node.x - 75}
          y1={node.y - 4}
          x2={node.x + 75}
          y2={node.y - 4}
          stroke="#f0f0f0"
          strokeWidth={1}
        />
      )}

      {hasInfoRow && (
        <>
          {slaHours && (
            <text
              x={node.x - 70}
              y={node.y + 12}
              fontSize="10"
              fill="#fa8c16"
              fontWeight="500"
            >
              SLA: {slaHours}h
            </text>
          )}

          {responsible && (
            <text
              x={slaHours ? node.x + 8 : node.x - 70}
              y={node.y + 12}
              fontSize="10"
              fill="#6b7280"
            >
              Resp: {truncate(responsible, 12)}
            </text>
          )}
        </>
      )}

      {hasEventRow && (
        <>
          <line
            x1={node.x - 75}
            y1={node.y + 20}
            x2={node.x + 75}
            y2={node.y + 20}
            stroke="#f0f0f0"
            strokeWidth={1}
          />

          {renderNodeEventBadge(node.x, node.y + 28, events, () => {
            if (!node.step) return

            onEventClick?.({
              scope: 'step',
              workflow,
              step: node.step,
              events,
            })
          })}
        </>
      )}

      {(isClickable || editable) && isHovered && (
        <g>
          <circle cx={node.x + 72} cy={boxY + 12} r={9} fill="#1677ff" />
          <text
            x={node.x + 72}
            y={boxY + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#fff"
          >
            {editable ? '↕' : '✎'}
          </text>
        </g>
      )}
    </g>
  )
}

function renderForwardEdge(
  edge: DiagramEdge,
  nodeMap: Map<string, DiagramNode>,
  workflow: Workflow,
  onEventClick?: (payload: EventClickPayload) => void
) {
  const source = nodeMap.get(edge.source)
  const target = nodeMap.get(edge.target)
  if (!source || !target) return null

  const sourceHalf = getNodeHalf(source.type)
  const targetHalf = getNodeHalf(target.type)

  const startX = source.x + sourceHalf
  const startY = source.y
  const endX = target.x - targetHalf
  const endY = target.y

  const bendX = startX + Math.max(45, (endX - startX) / 2)
  const path = `M ${startX} ${startY} L ${bendX} ${startY} L ${bendX} ${endY} L ${endX} ${endY}`

  const availableWidth = Math.max(80, Math.abs(endX - startX) - 24)
  const midX = clamp(
    (startX + endX) / 2,
    Math.min(startX, endX) + 40,
    Math.max(startX, endX) - 40
  )

  const hasEvents = (edge.events?.length ?? 0) > 0
  const annotationY =
    Math.min(startY, endY) - (hasEvents && edge.label ? 58 : hasEvents ? 36 : 28)

  return (
    <g key={edge.id}>
      <path
        d={path}
        fill="none"
        stroke={edge.color || '#64748b'}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`${endX},${endY} ${endX - 10},${endY - 6} ${endX - 10},${endY + 6}`}
        fill={edge.color || '#64748b'}
      />

      {renderEdgeAnnotations(
        edge,
        workflow,
        midX,
        annotationY,
        availableWidth,
        onEventClick
      )}
    </g>
  )
}

function renderReturnEdge(
  edge: DiagramEdge,
  nodeMap: Map<string, DiagramNode>,
  topReturnY: number,
  workflow: Workflow,
  onEventClick?: (payload: EventClickPayload) => void
) {
  const source = nodeMap.get(edge.source)
  const target = nodeMap.get(edge.target)
  if (!source || !target) return null

  const sourceHalf = getNodeHalf(source.type)
  const targetHalf = getNodeHalf(target.type)

  const startX = source.x + sourceHalf
  const startY = source.y
  const endX = target.x - targetHalf
  const endY = target.y

  const lane = edge.lane ?? 0
  const routeY = topReturnY - lane * 42

  const path = `M ${startX} ${startY} L ${startX + 40} ${startY} L ${startX + 40} ${routeY} L ${endX - 40} ${routeY} L ${endX - 40} ${endY} L ${endX} ${endY}`

  const availableWidth = Math.max(80, Math.abs(endX - startX) - 24)
  const midX = clamp(
    (startX + endX) / 2,
    Math.min(startX, endX) + 40,
    Math.max(startX, endX) - 40
  )

  const hasEvents = (edge.events?.length ?? 0) > 0
  const annotationY =
    routeY - (hasEvents && edge.label ? 58 : hasEvents ? 36 : 28)

  return (
    <g key={edge.id}>
      <path
        d={path}
        fill="none"
        stroke={edge.color || '#64748b'}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <polygon
        points={`${endX},${endY} ${endX - 10},${endY - 6} ${endX - 10},${endY + 6}`}
        fill={edge.color || '#64748b'}
      />

      {renderEdgeAnnotations(
        edge,
        workflow,
        midX,
        annotationY,
        availableWidth,
        onEventClick
      )}
    </g>
  )
}

export function WorkflowDiagram({
  workflow,
  height = 760,
  editable = false,
  onStepClick,
  onStartClick,
  onEventClick,
  onLayoutChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null)

  const [scale, setScale] = useState(1)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)
  const [draggingNodeId, setDraggingNodeId] = useState<string | null>(null)
  const [nodePositions, setNodePositions] = useState<
    Record<string, WorkflowNodePosition>
  >(workflow.layout?.nodePositions ?? {})

  const latestPositionsRef = useRef<Record<string, WorkflowNodePosition>>(
    workflow.layout?.nodePositions ?? {}
  )

  const dragRef = useRef<{
    nodeId: string
    startPointerX: number
    startPointerY: number
    startNodeX: number
    startNodeY: number
    moved: boolean
  } | null>(null)

  const suppressClickRef = useRef<string | null>(null)

  useEffect(() => {
    const next = workflow.layout?.nodePositions ?? {}
    setNodePositions(next)
    latestPositionsRef.current = next
  }, [workflow])

  const baseDiagram = useMemo(() => buildDiagram(workflow), [workflow])

  const nodes = useMemo(
    () => applyManualPositions(baseDiagram.nodes, nodePositions),
    [baseDiagram.nodes, nodePositions]
  )

  const edges = baseDiagram.edges
  const width = baseDiagram.width
  const diagramHeight = baseDiagram.height
  const topReturnY = baseDiagram.topReturnY

  const nodeMap = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes]
  )

  const svgHeight = Math.max(height, diagramHeight)

  const clientToSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current
      if (!svg) return null

      const rect = svg.getBoundingClientRect()

      return {
        x: (clientX - rect.left) / scale,
        y: (clientY - rect.top) / scale,
      }
    },
    [scale]
  )

  const shouldIgnoreNodeClick = useCallback((nodeId: string) => {
    if (suppressClickRef.current !== nodeId) return false
    suppressClickRef.current = null
    return true
  }, [])

  const handleNodeMouseDown = useCallback(
    (event: ReactMouseEvent<SVGGElement, MouseEvent>, node: DiagramNode) => {
      if (!editable) return
      if (event.button !== 0) return

      const point = clientToSvgPoint(event.clientX, event.clientY)
      if (!point) return

      event.preventDefault()
      event.stopPropagation()

      setDraggingNodeId(node.id)

      dragRef.current = {
        nodeId: node.id,
        startPointerX: point.x,
        startPointerY: point.y,
        startNodeX: node.x,
        startNodeY: node.y,
        moved: false,
      }
    },
    [editable, clientToSvgPoint]
  )

  useEffect(() => {
    if (!draggingNodeId) return

    function handleMouseMove(event: MouseEvent) {
      const drag = dragRef.current
      if (!drag) return

      const point = clientToSvgPoint(event.clientX, event.clientY)
      if (!point) return

      const dx = point.x - drag.startPointerX
      const dy = point.y - drag.startPointerY

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        drag.moved = true
      }

      const nextX = clamp(drag.startNodeX + dx, 50, width - 50)
      const nextY = clamp(drag.startNodeY + dy, 60, svgHeight - 60)

      setNodePositions((prev) => {
        const next = {
          ...prev,
          [drag.nodeId]: {
            x: nextX,
            y: nextY,
          },
        }

        latestPositionsRef.current = next
        return next
      })
    }

    function handleMouseUp() {
      const drag = dragRef.current

      if (drag?.moved) {
        suppressClickRef.current = drag.nodeId
        onLayoutChange?.(latestPositionsRef.current)
      }

      dragRef.current = null
      setDraggingNodeId(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [draggingNodeId, clientToSvgPoint, onLayoutChange, width, svgHeight])

  const zoomIn = () =>
    setScale((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))))
  const zoomOut = () =>
    setScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))
  const resetZoom = () => setScale(1)

  const resetLayout = () => {
    setNodePositions({})
    latestPositionsRef.current = {}
    onLayoutChange?.({})
  }

  if (!nodes.length) {
    return <Empty description="Nenhum fluxo para exibir" />
  }

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 16, background: '#f8fafc' }}
      extra={
        <Space>
          {editable && (
            <Button icon={<DragOutlined />} onClick={resetLayout}>
              Resetar layout
            </Button>
          )}
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut}>
            Diminuir
          </Button>
          <Button icon={<ExpandOutlined />} onClick={resetZoom}>
            Resetar zoom
          </Button>
          <Button icon={<ZoomInOutlined />} onClick={zoomIn}>
            Aumentar
          </Button>
        </Space>
      }
    >
      <div
        style={{
          overflow: 'auto',
          width: '100%',
          maxHeight: 720,
          borderRadius: 12,
        }}
      >
        <div
          style={{
            width,
            height: svgHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <svg ref={svgRef} width={width} height={svgHeight}>
            <defs>
              <pattern
                id="smallGrid"
                width="24"
                height="24"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M 24 0 L 0 0 0 24"
                  fill="none"
                  stroke="#eef2f7"
                  strokeWidth="1"
                />
              </pattern>
            </defs>

            <rect width="100%" height="100%" fill="url(#smallGrid)" />

            {edges
              .filter((edge) => edge.kind !== 'return')
              .map((edge) =>
                renderForwardEdge(edge, nodeMap, workflow, onEventClick)
              )}

            {edges
              .filter((edge) => edge.kind === 'return')
              .map((edge) =>
                renderReturnEdge(
                  edge,
                  nodeMap,
                  topReturnY,
                  workflow,
                  onEventClick
                )
              )}

            {nodes.map((node) =>
              renderNode(
                node,
                workflow,
                editable,
                draggingNodeId,
                handleNodeMouseDown,
                shouldIgnoreNodeClick,
                onStepClick,
                onStartClick,
                onEventClick,
                hoveredNodeId,
                setHoveredNodeId
              )
            )}
          </svg>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <Text type="secondary">
          {editable
            ? '💡 Arraste os nós para organizar manualmente o diagrama. Ao soltar, o layout é enviado para persistência.'
            : '💡 Clique nos elementos do diagrama para visualizar e editar suas configurações.'}
        </Text>
      </div>
    </Card>
  )
}