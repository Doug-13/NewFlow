import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  BellOutlined,
  FileTextOutlined,
  SettingOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons'

import type {
  SystemTaskActionType,
  SystemTaskConfig,
  WorkflowElementConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

const { Text } = Typography

type SystemTaskConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  onSave: (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void
}

type FormValues = SystemTaskConfig

type ActionOption = {
  label: string
  value: SystemTaskActionType
  tag: string
  tagColor: string
  description: string
  auditPlaceholder: string
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    label: 'Incrementar revisão',
    value: 'increment-revision',
    tag: 'Revisão',
    tagColor: 'blue',
    description:
      'Avança o campo de revisão do documento conforme a regra definida no processo (ex.: 1→2, v1→v2, A→B).',
    auditPlaceholder:
      'Ex.: Avança a revisão do documento após aprovação gerencial.',
  },
  {
    label: 'Definir valor de metadado',
    value: 'set-metadata',
    tag: 'Metadado',
    tagColor: 'purple',
    description:
      'Atribui um valor ao campo configurado no processo (ex.: status = "aprovado", dataPublicacao = hoje).',
    auditPlaceholder:
      'Ex.: Marca o documento como aprovado e registra a data.',
  },
  {
    label: 'Copiar metadado',
    value: 'copy-metadata',
    tag: 'Metadado',
    tagColor: 'purple',
    description:
      'Copia o valor de um campo para outro, conforme mapeamento definido no processo.',
    auditPlaceholder:
      'Ex.: Copia a data de revisão para a data de publicação.',
  },
  {
    label: 'Requisição HTTP',
    value: 'http-request',
    tag: 'Integração',
    tagColor: 'orange',
    description:
      'Chama o endpoint externo (webhook / API) configurado no processo.',
    auditPlaceholder:
      'Ex.: Notifica o sistema ERP sobre a aprovação do contrato.',
  },
  {
    label: 'Script personalizado',
    value: 'custom-script',
    tag: 'Script',
    tagColor: 'volcano',
    description:
      'Executa a expressão ou script definido na configuração do processo.',
    auditPlaceholder:
      'Ex.: Executa regra de negócio específica do tipo documental.',
  },
]

const DEFAULT_CONFIG: FormValues = {
  actionType: 'increment-revision',
  auditNote: undefined,
  notificationTemplateIds: [],
}

const tabPaneStyle: React.CSSProperties = {
  padding: '20px 24px 4px',
  minHeight: 260,
}

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94a3b8',
  marginBottom: 12,
  display: 'block',
}

export function SystemTaskConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: SystemTaskConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const actionType = Form.useWatch('actionType', form)

  useEffect(() => {
    if (!selectedElement) return

    const saved =
      initialConfig?.kind === 'system-task'
        ? (initialConfig.config as SystemTaskConfig)
        : null

    form.setFieldsValue({
      actionType: saved?.actionType ?? DEFAULT_CONFIG.actionType,
      auditNote: saved?.auditNote,
      notificationTemplateIds: saved?.notificationTemplateIds ?? [],
    })
  }, [form, initialConfig, selectedElement])

  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Selecione uma tarefa de sistema no fluxo" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'system-task') {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Este elemento não é uma tarefa de sistema" />
      </Card>
    )
  }

  const handleSubmit = (values: FormValues) => {
    onSave({
      workflowId,
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'system-task',
      config: {
        actionType: values.actionType,
        auditNote: values.auditNote,
        notificationTemplateIds: values.notificationTemplateIds ?? [],
      } satisfies SystemTaskConfig,
    })
  }

  const selectedAction = ACTION_OPTIONS.find((o) => o.value === actionType)

  return (
    <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
      <Card
        variant="borderless"
        style={{ borderRadius: 18 }}
        title={
          <Space>
            <SettingOutlined style={{ color: '#1677ff' }} />
            <span>Tarefa de sistema</span>
          </Space>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Alert
          type="info"
          showIcon
          style={{ margin: '16px 16px 0 16px' }}
          message={selectedElement.name || 'Tarefa de sistema'}
          description={
            <>
              Executada <strong>automaticamente pelo motor</strong> ao chegar nesta
              etapa — sem interação humana. Os parâmetros de execução
              são definidos na configuração do processo.
            </>
          }
        />

        <Tabs
          size="small"
          tabBarStyle={{
            margin: '16px 0 0 0',
            paddingLeft: 24,
            paddingRight: 24,
            borderBottom: '1px solid #f1f5f9',
            background: '#fafbfc',
          }}
          items={[
            {
              key: 'action',
              label: (
                <Space size={6}>
                  <ThunderboltOutlined />
                  <span>Ação</span>
                </Space>
              ),
              children: (
                <div style={tabPaneStyle}>
                  <Text style={sectionLabelStyle}>O que esta etapa faz</Text>

                  <Form.Item
                    label="Tipo de ação"
                    name="actionType"
                    rules={[{ required: true, message: 'Selecione a ação' }]}
                    style={{ marginBottom: 16 }}
                  >
                    <Select
                      options={ACTION_OPTIONS.map((o) => ({
                        label: (
                          <Space size={8}>
                            <Tag color={o.tagColor} style={{ margin: 0 }}>
                              {o.tag}
                            </Tag>
                            {o.label}
                          </Space>
                        ),
                        value: o.value,
                      }))}
                    />
                  </Form.Item>

                  {selectedAction && (
                    <Alert
                      type="success"
                      showIcon={false}
                      style={{ borderRadius: 10 }}
                      message={
                        <Space direction="vertical" size={2}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {selectedAction.description}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            Os parâmetros específicos (campo, formato, valor, URL)
                            são configurados no <strong>processo / tipo documental</strong>.
                          </Text>
                        </Space>
                      }
                    />
                  )}
                </div>
              ),
            },

            {
              key: 'audit',
              label: (
                <Space size={6}>
                  <FileTextOutlined />
                  <span>Auditoria</span>
                </Space>
              ),
              children: (
                <div style={tabPaneStyle}>
                  <Text style={sectionLabelStyle}>Rastreabilidade</Text>

                  <Form.Item
                    label="Nota de auditoria"
                    name="auditNote"
                    tooltip="Texto em linguagem de negócio registrado no histórico da instância."
                    style={{ marginBottom: 0 }}
                  >
                    <Input.TextArea
                      rows={4}
                      placeholder={
                        selectedAction?.auditPlaceholder ??
                        'Descreva o efeito desta etapa no documento...'
                      }
                    />
                  </Form.Item>
                </div>
              ),
            },

            {
              key: 'notifications',
              label: (
                <Space size={6}>
                  <BellOutlined />
                  <span>Notificações</span>
                </Space>
              ),
              children: (
                <div style={tabPaneStyle}>
                  <Text style={sectionLabelStyle}>Disparos após execução</Text>

                  <Form.Item
                    label="Notificações após execução"
                    name="notificationTemplateIds"
                    tooltip="Templates disparados imediatamente após o motor executar esta tarefa"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      mode="tags"
                      placeholder="Ex.: notif-revisao-atualizada, notif-sistema"
                    />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid #f1f5f9',
            background: '#fafbfc',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <Button
            type="primary"
            htmlType="submit"
            style={{
              borderRadius: 8,
              background: '#0f172a',
              borderColor: '#0f172a',
              fontWeight: 600,
              paddingLeft: 28,
              paddingRight: 28,
            }}
          >
            Salvar tarefa de sistema
          </Button>
        </div>
      </Card>
    </Form>
  )
}