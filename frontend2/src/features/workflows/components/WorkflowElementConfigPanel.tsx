/**
 * WorkflowElementConfigPanel.tsx
 *
 * Orquestrador — roteia para o painel correto baseado no kind e type do elemento.
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  kind          │ elementType              │ Painel                  │
 * ├─────────────────────────────────────────────────────────────────────┤
 * │  start         │ bpmn:StartEvent          │ StartEventConfigPanel   │
 * │  activity      │ bpmn:SubProcess          │ SubProcessConfigPanel   │
 * │  activity      │ bpmn:CallActivity        │ SubProcessConfigPanel   │
 * │  activity      │ demais tasks             │ ActivityConfigPanel     │
 * │  notification  │ bpmn:SendTask            │ NotificationEventConfigPanel │
 * │  notification  │ bpmn:Intermediate*Event  │ NotificationEventConfigPanel │
 * │  gateway       │ bpmn:*Gateway            │ GatewayConfigPanel      │
 * │  flow          │ bpmn:SequenceFlow        │ FlowConfigPanel         │
 * │  end           │ bpmn:EndEvent            │ EndEventConfigPanel     │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * DIFERENÇA FUNDAMENTAL:
 *   'activity'     → tarefa humana: tem executor, prazo e ações de decisão
 *   'notification' → disparo automático do fluxo: sem executor, sem prazo,
 *                    sem ações — apenas template, canal e destinatários
 */

import { Card, Empty, Typography } from 'antd'

import type { WorkflowActivityConfig, WorkflowElementConfig } from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

import { ActivityConfigPanel }            from './ActivityConfigPanel'
import { EndEventConfigPanel }            from './EndEventConfigPanel'
import { FlowConfigPanel }                from './FlowConfigPanel'
import { GatewayConfigPanel }             from './GatewayConfigPanel'
import { NotificationEventConfigPanel }   from './Notificationeventconfigpanel'
import { SystemTaskConfigPanel }          from './Systemtaskconfigpanel'
import { StartEventConfigPanel }          from './StartEventConfigPanel'
import { SubProcessConfigPanel }          from './SubProcessConfigPanel'

const { Text } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

type WorkflowElementConfigPanelProps = {
  workflowId: string
  bpmnXml: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  elementConfigs: WorkflowElementConfig[]
  onSave: (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Achata um WorkflowElementConfig de kind 'activity' para WorkflowActivityConfig */
function toActivityConfig(cfg: WorkflowElementConfig): WorkflowActivityConfig {
  return {
    id:          cfg.id,
    workflowId:  cfg.workflowId,
    elementId:   cfg.elementId,
    elementType: cfg.elementType,
    elementName: cfg.elementName,
    createdAt:   cfg.createdAt,
    updatedAt:   cfg.updatedAt,
    ...(cfg.config as object),
  } as WorkflowActivityConfig
}

/** Sub-roteamento dentro de kind === 'activity' */
function resolveActivityPanel(
  elementType: string,
): 'subprocess' | 'default' {
  if (
    elementType === 'bpmn:SubProcess' ||
    elementType === 'bpmn:CallActivity'
  ) {
    return 'subprocess'
  }
  return 'default'
}

// ─── Component ───────────────────────────────────────────────────────────────

export function WorkflowElementConfigPanel({
  workflowId,
  bpmnXml,
  selectedElement,
  initialConfig,
  elementConfigs,
  onSave,
}: WorkflowElementConfigPanelProps) {

  // ── Nada selecionado ────────────────────────────────────────────────────────
  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty
          description={
            <Text type="secondary">
              Clique em um elemento do diagrama para configurá-lo
            </Text>
          }
        />
      </Card>
    )
  }

  // ── Elemento não configurável ────────────────────────────────────────────────
  if (!selectedElement.isConfigurable) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty
          description={
            <Text type="secondary">
              Este tipo de elemento não possui configuração
            </Text>
          }
        />
      </Card>
    )
  }

  // ── Roteamento por kind ───────────────────────────────────────────────────────

  switch (selectedElement.kind) {

    // ── Evento inicial ──────────────────────────────────────────────────────────
    case 'start':
      return (
        <StartEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    // ── Notificação do fluxo ────────────────────────────────────────────────────
    // bpmn:SendTask, bpmn:IntermediateThrowEvent, bpmn:IntermediateCatchEvent
    // NÃO é uma atividade humana — roteado para o painel de notificação.
    case 'notification':
      return (
        <NotificationEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    // ── Tarefa de sistema ────────────────────────────────────────────────────
    // bpmn:ServiceTask — executada automaticamente pelo motor.
    // Sem executor humano, sem prazo de tarefa, sem ações de decisão.
    // Casos: incrementar revisão, definir metadado, chamar API, executar script.
    case 'system-task':
      return (
        <SystemTaskConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    // ── Atividade humana (com sub-roteamento por tipo) ──────────────────────────
    case 'activity': {
      const panel = resolveActivityPanel(selectedElement.type)
      const activityConfig =
        initialConfig?.kind === 'activity' ? toActivityConfig(initialConfig) : null

      if (panel === 'subprocess') {
        return (
          <SubProcessConfigPanel
            workflowId={workflowId}
            selectedElement={selectedElement}
            initialConfig={activityConfig}
            onSave={(values) => {
              onSave({
                workflowId,
                elementId:   selectedElement.id,
                elementType: selectedElement.type,
                elementName: selectedElement.name,
                kind: 'activity',
                config: values as any,
              })
            }}
          />
        )
      }

      return (
        <ActivityConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={activityConfig}
          onSave={(activityValues) => {
            onSave({
              workflowId,
              elementId:   selectedElement.id,
              elementType: selectedElement.type,
              elementName: selectedElement.name,
              kind: 'activity',
              config: activityValues as any,
            })
          }}
        />
      )
    }

    // ── Gateway ─────────────────────────────────────────────────────────────────
    case 'gateway':
      return (
        <GatewayConfigPanel
          workflowId={workflowId}
          bpmnXml={bpmnXml}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          elementConfigs={elementConfigs}
          onSave={onSave}
        />
      )

    // ── Fluxo de sequência ──────────────────────────────────────────────────────
    case 'flow':
      return (
        <FlowConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    // ── Evento final ────────────────────────────────────────────────────────────
    case 'end':
      return (
        <EndEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    default:
      return (
        <Card variant="borderless" style={{ borderRadius: 18 }}>
          <Empty description="Elemento não reconhecido" />
        </Card>
      )
  }
}