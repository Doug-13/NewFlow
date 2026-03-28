import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
} from 'antd'
import type {
  EndEventConfig,
  WorkflowElementConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

type EndEventConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  onSave: (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>
  ) => void
}

type FormValues = EndEventConfig

const DEFAULT_END_EVENT_CONFIG: EndEventConfig = {
  finalMetadataDefinitionIds: [],
  summarySections: [],
  notificationTemplateIds: [],
  finalAction: 'complete',
  linkedWorkflowId: undefined,
  instructions: undefined,
}

export function EndEventConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: EndEventConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const finalAction = Form.useWatch('finalAction', form)

  useEffect(() => {
    const config: EndEventConfig =
      initialConfig?.kind === 'end'
        ? (initialConfig.config as EndEventConfig)
        : DEFAULT_END_EVENT_CONFIG

    form.setFieldsValue(config)
  }, [form, initialConfig, selectedElement])

  if (!selectedElement) {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um evento final" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'end') {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um evento final" />
      </Card>
    )
  }

  const handleSubmit = (values: FormValues) => {
    onSave({
      workflowId,
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'end',
      config: {
        finalMetadataDefinitionIds: values.finalMetadataDefinitionIds ?? [],
        summarySections: values.summarySections ?? [],
        notificationTemplateIds: values.notificationTemplateIds ?? [],
        finalAction: values.finalAction,
        linkedWorkflowId: values.linkedWorkflowId,
        instructions: values.instructions,
      },
    })
  }

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 18 }}
      title="Configuração do encerramento"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={selectedElement.name || 'Evento final'}
        description="Defina quais dados serão mostrados no final e quais ações/notificações serão executadas ao encerrar o processo."
      />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
          label="Metadados exibidos no final"
          name="finalMetadataDefinitionIds"
        >
          <Select
            mode="tags"
            placeholder="Ex.: numeroDocumento, revisaoFinal, aprovador"
          />
        </Form.Item>

        <Form.Item label="Seções do resumo final" name="summarySections">
          <Select
            mode="tags"
            placeholder="Ex.: dados-gerais, aprovacoes, anexos, historico"
          />
        </Form.Item>

        <Form.Item
          label="Templates de notificação"
          name="notificationTemplateIds"
        >
          <Select
            mode="tags"
            placeholder="Ex.: notif-finalizacao, notif-publicacao"
          />
        </Form.Item>

        <Form.Item label="Ação final" name="finalAction">
          <Select
            options={[
              { label: 'Concluir', value: 'complete' },
              { label: 'Arquivar', value: 'archive' },
              { label: 'Publicar', value: 'publish' },
              { label: 'Abrir workflow vinculado', value: 'open-linked-workflow' },
            ]}
          />
        </Form.Item>

        {finalAction === 'open-linked-workflow' ? (
          <Form.Item label="Workflow vinculado" name="linkedWorkflowId">
            <Input placeholder="Informe o ID do workflow vinculado" />
          </Form.Item>
        ) : null}

        <Form.Item label="Instruções finais" name="instructions">
          <Input.TextArea
            rows={4}
            placeholder="Explique o que deve acontecer ao encerrar este processo"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Salvar configuração do final
        </Button>
      </Form>
    </Card>
  )
}