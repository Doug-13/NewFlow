import { Card, Empty, Typography } from 'antd'

import type { WorkflowActivityConfig, WorkflowElementConfig, WorkflowScopedBase } from '../storage'
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
  /**
   * Contexto de escopo do workflow pai.
   * Necessário porque WorkflowElementConfig extende WorkflowScopedBase
   * e exige accountId + scopeLevel em todos os saves.
   */
  scopeContext: Pick<WorkflowScopedBase, 'accountId' | 'scopeLevel' | 'accountName' | 'processId' | 'processName' | 'tenantId'>
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
    // Propaga scope
    accountId: cfg.accountId,
    accountName: cfg.accountName,
    scopeLevel: cfg.scopeLevel,
    processId: cfg.processId,
    processName: cfg.processName,
    tenantId: cfg.tenantId,
    ...(cfg.config as object),
  } as WorkflowActivityConfig
}

function resolveActivityPanel(elementType: string): 'subprocess' | 'default' {
  if (elementType === 'bpmn:SubProcess' || elementType === 'bpmn:CallActivity') {
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
  scopeContext,
  onSave,
}: WorkflowElementConfigPanelProps) {

  /**
   * Wrapper que injeta os campos de scope obrigatórios antes de repassar
   * para o onSave do WorkflowStudioPage.
   *
   * Aceita um objeto parcial (sem accountId/scopeLevel) porque esses campos
   * são adicionados aqui — os painéis filhos não precisam conhecê-los.
   */
  const onSaveWithScope = (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt' | 'accountId' | 'scopeLevel' | 'accountName' | 'processId' | 'processName' | 'tenantId'>
      & Partial<Pick<WorkflowElementConfig, 'accountId' | 'scopeLevel' | 'accountName' | 'processId' | 'processName' | 'tenantId'>>,
  ) => {
    onSave({
      // scope injetado — pode ser sobrescrito por valores vindos do filho
      accountId:   scopeContext.accountId,
      accountName: scopeContext.accountName,
      scopeLevel:  scopeContext.scopeLevel,
      processId:   scopeContext.processId   ?? null,
      processName: scopeContext.processName ?? null,
      tenantId:    scopeContext.tenantId    ?? scopeContext.accountId,
      ...values,
    } as Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>)
  }

  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description={<Text type="secondary">Clique em um elemento do diagrama para configurá-lo</Text>} />
      </Card>
    )
  }

  if (!selectedElement.isConfigurable) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description={<Text type="secondary">Este tipo de elemento não possui configuração</Text>} />
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
          onSave={onSaveWithScope}
        />
      )

    case 'notification':
      return (
        <NotificationEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSaveWithScope}
        />
      )

    case 'system-task':
      return (
        <SystemTaskConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSaveWithScope}
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
              onSaveWithScope({
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
          scopeContext={scopeContext}
          selectedElement={selectedElement}
          initialConfig={activityConfig}
          onSave={(activityValues) => {
            onSaveWithScope({
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

    case 'gateway':
      return (
        <GatewayConfigPanel
          workflowId={workflowId}
          bpmnXml={bpmnXml}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          elementConfigs={elementConfigs}
          onSave={onSaveWithScope}
        />
      )

    case 'flow':
      return (
        <FlowConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSaveWithScope}
        />
      )

    case 'end':
      return (
        <EndEventConfigPanel
          workflowId={workflowId}
          selectedElement={selectedElement}
          initialConfig={initialConfig}
          onSave={onSaveWithScope}
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