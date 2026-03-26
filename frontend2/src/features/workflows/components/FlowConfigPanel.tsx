import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Switch,
} from 'antd'
import type {
  FlowConfig,
  WorkflowElementConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

type FlowConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  onSave: (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>
  ) => void
}

type FormValues = FlowConfig

function getDefaultFlowConfig(
  selectedElement: BpmnElementSummary | null
): FlowConfig {
  return {
    label: selectedElement?.name || undefined,
    conditionType: 'always',
    expression: undefined,
    metadataFieldId: undefined,
    expectedValue: undefined,
    isDefault: false,
    notificationTemplateIds: [],
    description: undefined,
  }
}

export function FlowConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: FlowConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const conditionType = Form.useWatch('conditionType', form)

  useEffect(() => {
    const config: FlowConfig =
      initialConfig?.kind === 'flow'
        ? (initialConfig.config as FlowConfig)
        : getDefaultFlowConfig(selectedElement)

    form.setFieldsValue(config)
  }, [form, initialConfig, selectedElement])

  if (!selectedElement) {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um fluxo" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'flow') {
    return (
      <Card bordered={false} style={{ borderRadius: 18 }}>
        <Empty description="Selecione um fluxo" />
      </Card>
    )
  }

  const handleSubmit = (values: FormValues) => {
    onSave({
      workflowId,
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'flow',
      config: {
        label: values.label,
        conditionType: values.conditionType,
        expression: values.expression,
        metadataFieldId: values.metadataFieldId,
        expectedValue: values.expectedValue,
        isDefault: values.isDefault ?? false,
        notificationTemplateIds: values.notificationTemplateIds ?? [],
        description: values.description,
      },
    })
  }

  return (
    <Card
      bordered={false}
      style={{ borderRadius: 18 }}
      title="Configuração da transição"
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={selectedElement.name || 'Fluxo'}
        description="Defina a condição que determina quando esta transição poderá ser seguida."
      />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item label="Rótulo da transição" name="label">
          <Input placeholder="Ex.: Aprovado, Reprovado, Revisar" />
        </Form.Item>

        <Form.Item label="Tipo de condição" name="conditionType">
          <Select
            options={[
              { label: 'Sempre', value: 'always' },
              { label: 'Expressão', value: 'expression' },
              { label: 'Valor de metadado', value: 'metadata-value' },
            ]}
          />
        </Form.Item>

        {conditionType === 'expression' ? (
          <Form.Item label="Expressão" name="expression">
            <Input.TextArea
              rows={4}
              placeholder="Ex.: documento.valor > 1000 && documento.status === 'aprovado'"
            />
          </Form.Item>
        ) : null}

        {conditionType === 'metadata-value' ? (
          <>
            <Form.Item label="Campo de metadado" name="metadataFieldId">
              <Input placeholder="Informe o ID do metadado" />
            </Form.Item>

            <Form.Item label="Valor esperado" name="expectedValue">
              <Input placeholder="Informe o valor esperado" />
            </Form.Item>
          </>
        ) : null}

        <Form.Item
          label="Templates de notificação"
          name="notificationTemplateIds"
        >
          <Select
            mode="tags"
            placeholder="Ex.: notif-aprovado, notif-revisao"
          />
        </Form.Item>

        <Form.Item
          label="Descrição"
          name="description"
        >
          <Input.TextArea
            rows={3}
            placeholder="Descreva quando esta transição deve ser utilizada"
          />
        </Form.Item>

        <Form.Item
          label="Fluxo padrão"
          name="isDefault"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Salvar configuração da transição
        </Button>
      </Form>
    </Card>
  )
}