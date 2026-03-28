import { Card, Empty, Typography } from 'antd'

import type { WorkflowActivityConfig, WorkflowElementConfig } from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

import { ActivityConfigPanel } from './ActivityConfigPanel'
import { EndEventConfigPanel } from './EndEventConfigPanel'
import { FlowConfigPanel } from './FlowConfigPanel'
import { GatewayConfigPanel } from './GatewayConfigPanel'
import { NotificationEventConfigPanel } from './Notificationeventconfigpanel'
import { SystemTaskConfigPanel } from './Systemtaskconfigpanel'
import { StartEventConfigPanel } from './StartEventConfigPanel'
import { SubProcessConfigPanel } from './SubProcessConfigPanel'

const { Text } = Typography

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

function toActivityConfig(cfg: WorkflowElementConfig): WorkflowActivityConfig {
  return {
    id: cfg.id,
    workflowId: cfg.workflowId,
    elementId: cfg.elementId,
    elementType: cfg.elementType,
    elementName: cfg.elementName,
    createdAt: cfg.createdAt,
    updatedAt: cfg.updatedAt,
    ...(cfg.config as object),
  } as WorkflowActivityConfig
}

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

export function WorkflowElementConfigPanel({
  workflowId,
  bpmnXml,
  selectedElement,
  initialConfig,
  elementConfigs,
  onSave,
}: WorkflowElementConfigPanelProps) {
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

  switch (selectedElement.kind) {
    case 'start':
      return (
        <StartEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    case 'notification':
      return (
        <NotificationEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

    case 'system-task':
      return (
        <SystemTaskConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

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
                elementId: selectedElement.id,
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
              elementId: selectedElement.id,
              elementType: selectedElement.type,
              elementName: selectedElement.name,
              kind: 'activity',
              config: activityValues as any,
            })
          }}
        />
      )
    }

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

    case 'flow':
      return (
        <FlowConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSave}
        />
      )

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