import { useMemo, useState } from 'react'
import { Card, Empty, Typography, Space, Button } from 'antd'
import { ZoomInOutlined, ZoomOutOutlined, ExpandOutlined } from '@ant-design/icons'
import type { Workflow, WorkflowStep, WorkflowTransition } from '../types'

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
}

type DiagramEdge = {
  id: string
  source: string
  target: string
  label?: string
  color?: string
  kind?: 'normal' | 'gateway' | 'return' | 'to-end'
  lane?: number
}

type Props = {
  workflow: Workflow
  height?: number
  onStepClick?: (step: WorkflowStep) => void
}

function getOrderedSteps(workflow: Workflow): WorkflowStep[] {
  return [...(workflow.steps ?? [])].sort((a, b) => a.orderIndex - b.orderIndex)
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
    responsibles?: Array<string | { name?: string; fullName?: string; roleName?: string; positionName?: string; type?: string }>
    assignees?: Array<string | { name?: string; fullName?: string; roleName?: string }>
    users?: Array<string | { name?: string; fullName?: string }>
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

  const START_X = 90
  const STEP_X_1 = 220
  const STEP_X_2 = 430
  const GATEWAY_X = 600
  const BRANCH_X = 860
  const END_X = 1140

  const BASE_Y = 300
  const TOP_RETURN_Y = 110
  const BRANCH_GAP_Y = 150

  const startNodeId = 'start-node'
  const endNodeId = 'end-node'

  const stepNodeMap = new Map<string, DiagramNode>()

  const initialStep = steps.find((step) => step.isInitial) ?? steps[0]

  const gatewaySourceStep = steps.find((step) => (step.transitions?.length ?? 0) > 1)

  const gatewayResolvedTargets = gatewaySourceStep
    ? (gatewaySourceStep.transitions ?? [])
        .map((transition) => resolveTargetStep(transition, steps))
        .filter(Boolean) as WorkflowStep[]
    : []

  const gatewayForwardTargets = gatewaySourceStep
    ? gatewayResolvedTargets.filter(
        (target) => (target.orderIndex ?? 0) >= (gatewaySourceStep.orderIndex ?? 0)
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
    label: 'Início',
    x: START_X,
    y: BASE_Y,
  })

  normalMainSteps.forEach((step) => {
    let x = STEP_X_1 + mainIndex * 210
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
      const startY = total === 1 ? BASE_Y : BASE_Y - ((total - 1) * BRANCH_GAP_Y) / 2

      const node: DiagramNode = {
        id: `step-${step.id || step.orderIndex}`,
        type: 'activity',
        label: step.name,
        x: BRANCH_X,
        y: startY + idx * BRANCH_GAP_Y,
        stepId: step.id,
        orderIndex: step.orderIndex,
        step,
      }

      stepNodeMap.set(step.id || String(step.orderIndex), node)
      nodes.push(node)
    })
  }

  const rightMostY = BASE_Y

  nodes.push({
    id: endNodeId,
    type: 'end',
    label: 'Fim',
    x: END_X,
    y: rightMostY,
  })

  const initialNode = stepNodeMap.get(initialStep.id || String(initialStep.orderIndex))
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

      const targetNode = stepNodeMap.get(targetStep.id || String(targetStep.orderIndex))
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

      const targetNode = stepNodeMap.get(targetStep.id || String(targetStep.orderIndex))
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
      })
    })
  })

  return {
    nodes,
    edges,
    width: END_X + 180,
    height: 760,
    topReturnY: TOP_RETURN_Y,
  }
}

function renderNode(
  node: DiagramNode,
  onStepClick?: (step: WorkflowStep) => void,
  hoveredNodeId?: string | null,
  setHoveredNodeId?: (id: string | null) => void
) {
  const isHovered = hoveredNodeId === node.id
  const isClickable = node.type === 'activity' && !!node.step

  if (node.type === 'start') {
    return (
      <g key={node.id}>
        <circle cx={node.x} cy={node.y} r={24} fill="#e6f4ff" stroke="#1677ff" strokeWidth={3} />
        <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="12" fill="#0f172a">
          {node.label}
        </text>
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
      <g key={node.id}>
        <polygon points={points} fill="#fff7e6" stroke="#fa8c16" strokeWidth={3} />
        <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="13" fill="#fa8c16">
          ×
        </text>
      </g>
    )
  }

  if (node.type === 'end') {
    return (
      <g key={node.id}>
        <circle cx={node.x} cy={node.y} r={24} fill="#f6ffed" stroke="#52c41a" strokeWidth={4} />
        <circle cx={node.x} cy={node.y} r={18} fill="none" stroke="#52c41a" strokeWidth={2} />
        <text x={node.x} y={node.y + 40} textAnchor="middle" fontSize="12" fill="#0f172a">
          {node.label}
        </text>
      </g>
    )
  }

  // Activity node — enriquecido com SLA e responsável
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

  // Altura da caixa aumenta se tem informações extras
  const hasExtra = !!(slaHours || responsible)
  const boxHeight = hasExtra ? 76 : 60
  const boxY = node.y - boxHeight / 2

  const labelY = hasExtra ? node.y - 14 : node.y + 4

  return (
    <g
      key={node.id}
      style={{ cursor: isClickable ? 'pointer' : 'default' }}
      onClick={() => {
        if (isClickable && node.step && onStepClick) {
          onStepClick(node.step)
        }
      }}
      onMouseEnter={() => setHoveredNodeId?.(node.id)}
      onMouseLeave={() => setHoveredNodeId?.(null)}
    >
      {/* Sombra de hover */}
      {isHovered && isClickable && (
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
        strokeWidth={isHovered ? 2 : 2}
        style={{ transition: 'all 0.15s ease' }}
      />

      {/* Badge inicial/final */}
      {(isInitial || isFinal) && (
        <rect
          x={node.x - 85}
          y={boxY}
          width={170}
          height={18}
          rx={14}
          fill={isInitial ? '#1677ff' : '#722ed1'}
          opacity={0.9}
        />
      )}
      {isInitial && (
        <text x={node.x} y={boxY + 12} textAnchor="middle" fontSize="9" fill="#ffffff" fontWeight="600">
          INICIAL
        </text>
      )}
      {isFinal && (
        <text x={node.x} y={boxY + 12} textAnchor="middle" fontSize="9" fill="#ffffff" fontWeight="600">
          FINAL
        </text>
      )}

      {/* Label principal */}
      <text
        x={node.x}
        y={labelY}
        textAnchor="middle"
        fontSize="13"
        fontWeight="500"
        fill="#0f172a"
      >
        {node.label.length > 18 ? node.label.slice(0, 17) + '…' : node.label}
      </text>

      {/* Linha divisória */}
      {hasExtra && (
        <line
          x1={node.x - 75}
          y1={node.y - 2}
          x2={node.x + 75}
          y2={node.y - 2}
          stroke="#f0f0f0"
          strokeWidth={1}
        />
      )}

      {/* SLA */}
      {slaHours && (
        <g>
          <text
            x={node.x - 70}
            y={node.y + 14}
            fontSize="10"
            fill="#fa8c16"
            fontWeight="500"
          >
            ⏱ SLA: {slaHours}h
          </text>
        </g>
      )}

      {/* Responsável */}
      {responsible && (
        <text
          x={slaHours ? node.x + 10 : node.x - 70}
          y={node.y + 14}
          fontSize="10"
          fill="#6b7280"
        >
          👤 {responsible.length > 10 ? responsible.slice(0, 9) + '…' : responsible}
        </text>
      )}

      {/* Ícone de clique */}
      {isClickable && isHovered && (
        <g>
          <circle cx={node.x + 72} cy={boxY + 12} r={9} fill="#1677ff" />
          <text x={node.x + 72} y={boxY + 16} textAnchor="middle" fontSize="10" fill="#fff">
            ✎
          </text>
        </g>
      )}
    </g>
  )
}

function renderLabel(edge: DiagramEdge, x: number, y: number, align: 'left' | 'center' = 'left') {
  if (!edge.label) return null

  const labelWidth = Math.max(56, edge.label.length * 7.4)
  const rectX = align === 'center' ? x - labelWidth / 2 : x - 6
  const textAnchor = align === 'center' ? 'middle' : 'start'

  return (
    <>
      <rect x={rectX} y={y - 12} width={labelWidth} height={20} rx={8} fill="#ffffff" stroke="#e5e7eb" />
      <text x={x} y={y + 2} fontSize="12" fill={edge.color || '#334155'} textAnchor={textAnchor}>
        {edge.label}
      </text>
    </>
  )
}

function renderForwardEdge(edge: DiagramEdge, nodeMap: Map<string, DiagramNode>) {
  const source = nodeMap.get(edge.source)
  const target = nodeMap.get(edge.target)
  if (!source || !target) return null

  const sourceHalf = source.type === 'activity' ? 85 : source.type === 'gateway' ? 22 : 24
  const targetHalf = target.type === 'activity' ? 85 : target.type === 'gateway' ? 22 : 24

  const startX = source.x + sourceHalf
  const startY = source.y
  const endX = target.x - targetHalf
  const endY = target.y

  const lane = edge.lane ?? 0
  const bendX = startX + Math.max(45, (endX - startX) / 2)

  const path = `M ${startX} ${startY} L ${bendX} ${startY} L ${bendX} ${endY} L ${endX} ${endY}`

  let labelX = bendX + 8
  let labelY = startY === endY ? startY - 18 : (startY + endY) / 2 - 16
  let align: 'left' | 'center' = 'left'

  if (edge.kind === 'gateway') { labelX = bendX + 8; labelY = startY - 18 }
  if (source.type === 'gateway') {
    labelX = bendX + 8
    labelY = endY > startY ? startY + 34 + lane * 6 : startY - 24 - lane * 6
  }
  if (edge.kind === 'to-end') { labelX = (startX + endX) / 2; labelY = startY - 18; align = 'center' }

  return (
    <g key={edge.id}>
      <path d={path} fill="none" stroke={edge.color || '#64748b'} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={`${endX},${endY} ${endX - 10},${endY - 6} ${endX - 10},${endY + 6}`} fill={edge.color || '#64748b'} />
      {renderLabel(edge, labelX, labelY, align)}
    </g>
  )
}

function renderReturnEdge(edge: DiagramEdge, nodeMap: Map<string, DiagramNode>, topReturnY: number) {
  const source = nodeMap.get(edge.source)
  const target = nodeMap.get(edge.target)
  if (!source || !target) return null

  const sourceHalf = source.type === 'activity' ? 85 : source.type === 'gateway' ? 22 : 24
  const targetHalf = target.type === 'activity' ? 85 : target.type === 'gateway' ? 22 : 24

  const startX = source.x + sourceHalf
  const startY = source.y
  const endX = target.x - targetHalf
  const endY = target.y

  const lane = edge.lane ?? 0
  const routeY = topReturnY - lane * 34

  const path = `M ${startX} ${startY} L ${startX + 40} ${startY} L ${startX + 40} ${routeY} L ${endX - 40} ${routeY} L ${endX - 40} ${endY} L ${endX} ${endY}`
  const labelX = (startX + endX) / 2
  const labelY = routeY - 10

  return (
    <g key={edge.id}>
      <path d={path} fill="none" stroke={edge.color || '#64748b'} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <polygon points={`${endX},${endY} ${endX - 10},${endY - 6} ${endX - 10},${endY + 6}`} fill={edge.color || '#64748b'} />
      {renderLabel(edge, labelX, labelY, 'center')}
    </g>
  )
}

export function WorkflowDiagram({ workflow, height = 760, onStepClick }: Props) {
  const [scale, setScale] = useState(1)
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null)

  const { nodes, edges, width, height: diagramHeight, topReturnY } = useMemo(
    () => buildDiagram(workflow),
    [workflow]
  )

  if (!nodes.length) {
    return <Empty description="Nenhum fluxo para exibir" />
  }

  const nodeMap = new Map(nodes.map((node) => [node.id, node]))
  const svgHeight = Math.max(height, diagramHeight)

  const zoomIn = () => setScale((prev) => Math.min(2, Number((prev + 0.1).toFixed(2))))
  const zoomOut = () => setScale((prev) => Math.max(0.5, Number((prev - 0.1).toFixed(2))))
  const resetZoom = () => setScale(1)

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 16, background: '#f8fafc' }}
      extra={
        <Space>
          <Button icon={<ZoomOutOutlined />} onClick={zoomOut}>Diminuir</Button>
          <Button icon={<ExpandOutlined />} onClick={resetZoom}>Resetar</Button>
          <Button icon={<ZoomInOutlined />} onClick={zoomIn}>Aumentar</Button>
        </Space>
      }
    >
      <div style={{ overflow: 'auto', width: '100%', maxHeight: 720, borderRadius: 12 }}>
        <div
          style={{
            width,
            height: svgHeight,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          <svg width={width} height={svgHeight}>
            <defs>
              <pattern id="smallGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#eef2f7" strokeWidth="1" />
              </pattern>
              <filter id="nodeShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgba(0,0,0,0.08)" />
              </filter>
              <filter id="nodeHover" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="4" stdDeviation="8" floodColor="rgba(22,119,255,0.18)" />
              </filter>
            </defs>

            <rect width="100%" height="100%" fill="url(#smallGrid)" />

            {edges.filter((e) => e.kind !== 'return').map((e) => renderForwardEdge(e, nodeMap))}
            {edges.filter((e) => e.kind === 'return').map((e) => renderReturnEdge(e, nodeMap, topReturnY))}
            {nodes.map((node) => renderNode(node, onStepClick, hoveredNodeId, setHoveredNodeId))}
          </svg>
        </div>
      </div>

      {onStepClick && (
        <div style={{ marginTop: 12 }}>
          <Text type="secondary">
            💡 Clique em uma atividade no diagrama para visualizar e editar suas configurações.
          </Text>
        </div>
      )}
    </Card>
  )
}
