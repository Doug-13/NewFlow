import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Typography,
} from 'antd'
import type {
  StartEventConfig,
  WorkflowElementConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'
import type { ElementConfigSavePayload } from '../panelTypes'

const { Text } = Typography

type StartEventConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  onSave: (values: ElementConfigSavePayload) => void
}

type FormValues = StartEventConfig

export function StartEventConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: StartEventConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()

  useEffect(() => {
    const config =
      initialConfig?.kind === 'start'
        ? (initialConfig.config as StartEventConfig)
        : {
            initialMetadataDefinitionIds: [],
            requiredAttachmentTypes: [],
            notificationTemplateIds: [],
            allowedStarterRoleIds: [],
            instructions: undefined,
            formTitle: undefined,
          }

    form.setFieldsValue(config)
  }, [form, initialConfig, selectedElement])

  if (!selectedElement) {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um evento inicial" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'start') {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um evento inicial" />
      </Card>
    )
  }

  const handleSubmit = (values: FormValues) => {
    onSave({
      workflowId,
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'start',
      config: {
        initialMetadataDefinitionIds: values.initialMetadataDefinitionIds ?? [],
        requiredAttachmentTypes: values.requiredAttachmentTypes ?? [],
        notificationTemplateIds: values.notificationTemplateIds ?? [],
        allowedStarterRoleIds: values.allowedStarterRoleIds ?? [],
        instructions: values.instructions,
        formTitle: values.formTitle,
      },
    })
  }

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 18 }}
      title="Configuração do início"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={selectedElement.name || 'Evento inicial'}
        description="Defina os metadados de abertura, anexos obrigatórios e notificações do início do processo."
      />

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Título do formulário inicial" name="formTitle">
          <Input placeholder="Ex.: Abertura de solicitação" />
        </Form.Item>

        <Form.Item
          label="Metadados obrigatórios na abertura"
          name="initialMetadataDefinitionIds"
        >
          <Select mode="tags" placeholder="Ex.: titulo, codigo, solicitante" />
        </Form.Item>

        <Form.Item
          label="Tipos de anexo obrigatórios"
          name="requiredAttachmentTypes"
        >
          <Select mode="tags" placeholder="Ex.: pdf, imagem, contrato-base" />
        </Form.Item>

        <Form.Item
          label="Perfis que podem iniciar"
          name="allowedStarterRoleIds"
        >
          <Select mode="tags" placeholder="Ex.: solicitante, gestor, qualidade" />
        </Form.Item>

        <Form.Item
          label="Templates de notificação"
          name="notificationTemplateIds"
        >
          <Select mode="tags" placeholder="Ex.: notif-abertura, notif-confirmacao" />
        </Form.Item>

        <Form.Item label="Instruções iniciais" name="instructions">
          <Input.TextArea
            rows={4}
            placeholder="Explique o que o usuário deve informar ao iniciar o processo"
          />
        </Form.Item>

        <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
          Dica: use este ponto para definir exatamente quais dados precisam ser informados no início do fluxo.
        </Text>

        <Button type="primary" htmlType="submit" block>
          Salvar configuração do início
        </Button>
      </Form>
    </Card>
  )
}