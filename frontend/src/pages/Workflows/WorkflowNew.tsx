import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Form,
  Input,
  Button,
  Space,
  InputNumber,
  Checkbox,
  Select,
  Typography,
  Divider,
  message,
  Row,
  Col,
  Tag,
  Switch,
  Tabs,
  Empty,
  Transfer,
  Spin,
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  ArrowLeftOutlined,
  UserOutlined,
  NotificationOutlined,
  FileTextOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { createWorkflow, type WorkflowPayload } from '../../api/workflows'
import {
  getMetadataDefinitions,
  type MetadataDefinitionListItem,
} from '../../api/metadataDefinitions'
import { getNotificationTemplates } from '../../api/notificationTemplates'

const { Title, Text } = Typography

const ACTION_SUGGESTIONS = [
  'aprovar',
  'reprovar',
  'devolver',
  'enviar',
  'concluir',
  'publicar',
  'arquivar',
  'cancelar',
  'solicitar',
  'revisar',
]

const RESPONSIBLE_SUGGESTIONS = [
  'Elaborador',
  'Revisor',
  'Aprovador',
  'Gestor da Área',
  'Qualidade',
  'Administrador',
  'Solicitante',
]

const METADATA_TYPE_OPTIONS = [
  { label: 'Texto', value: 'text' },
  { label: 'Número', value: 'number' },
  { label: 'Data', value: 'date' },
  { label: 'Lista', value: 'select' },
  { label: 'Multilista', value: 'multiselect' },
  { label: 'Booleano', value: 'boolean' },
  { label: 'Usuário', value: 'user' },
]

type EditableWorkflowTransition = {
  toStepOrderIndex: number
  triggerAction: string
}

type EditableWorkflowMetadata = {
  definitionId?: string
  setName?: string
  name: string
  label: string
  type: string
  required: boolean
  multiple: boolean
  options: string[]
}

type EditableWorkflowStep = {
  name: string
  description: string
  orderIndex: number
  isInitial: boolean
  isFinal: boolean
  slaHours?: number
  allowedActions: string[]
  transitions: EditableWorkflowTransition[]
  responsibles: string[]
  receivesNotification: boolean
  requiredNotification: boolean
  notificationTemplateIds: string[]
  metadata: EditableWorkflowMetadata[]
}

type MetadataCatalogItem = MetadataDefinitionListItem & {
  type?: string
  options?: string[]
  setName?: string | null
  groupName?: string | null
  collectionName?: string | null
  multiple?: boolean
  allowMultiple?: boolean
  required?: boolean
}

type NotificationTemplateListItem = {
  id: string
  name: string
  description?: string
  code?: string
  isActive?: boolean
}

type WorkflowPayloadExtended = {
  name: string
  description?: string
  steps: Array<{
    name: string
    description: string
    orderIndex: number
    isInitial: boolean
    isFinal: boolean
    slaHours?: number
    allowedActions: string[]
    receivesNotification: boolean
    requiredNotification: boolean
    notificationTemplateIds: string[]
    responsibles: Array<{ name: string }>
    metadata: Array<{
      metadataDefinitionId?: string
      name: string
      label: string
      type: string
      required: boolean
      multiple: boolean
      options: string[]
    }>
    transitions: Array<{
      toStepOrderIndex: number
      triggerAction: string
    }>
  }>
}

type WorkflowNewPageProps = {
  embedded?: boolean
  onCancel?: () => void
  onSaved?: () => void
}

function getDefaultTargetStep(orderIndex: number, totalSteps: number) {
  if (totalSteps <= 1) return 1
  return orderIndex < totalSteps ? orderIndex + 1 : 1
}

function syncStepTransitions(
  step: EditableWorkflowStep,
  totalSteps: number,
): EditableWorkflowStep {
  const uniqueActions = [...new Set(step.allowedActions.map(action => action.trim()).filter(Boolean))]

  const transitions = uniqueActions.map(action => {
    const existing = step.transitions.find(tr => tr.triggerAction === action)

    return {
      triggerAction: action,
      toStepOrderIndex:
        existing?.toStepOrderIndex && existing.toStepOrderIndex <= totalSteps
          ? existing.toStepOrderIndex
          : getDefaultTargetStep(step.orderIndex, totalSteps),
    }
  })

  return {
    ...step,
    allowedActions: uniqueActions,
    transitions,
  }
}

function normalizeSteps(nextSteps: EditableWorkflowStep[]) {
  const reordered = nextSteps.map((step, index) => ({
    ...step,
    orderIndex: index + 1,
  }))

  return reordered.map(step => syncStepTransitions(step, reordered.length))
}

function extractMetadataSetName(item: MetadataCatalogItem) {
  return (
    item.setName?.trim() ||
    item.groupName?.trim() ||
    item.collectionName?.trim() ||
    ''
  )
}

function mapMetadataDefinitionToEditable(item: MetadataCatalogItem): EditableWorkflowMetadata {
  return {
    definitionId: item.id,
    setName: extractMetadataSetName(item) || undefined,
    name: item.name || '',
    label: item.label || item.name || '',
    type: item.type || 'text',
    required: Boolean(item.required),
    multiple: Boolean(item.multiple ?? item.allowMultiple ?? item.type === 'multiselect'),
    options: Array.isArray(item.options) ? item.options : [],
  }
}

function mergeMetadata(
  current: EditableWorkflowMetadata[],
  incoming: EditableWorkflowMetadata[],
) {
  const map = new Map<string, EditableWorkflowMetadata>()

  current.forEach(item => {
    const key = item.definitionId || item.name
    map.set(key, item)
  })

  incoming.forEach(item => {
    const key = item.definitionId || item.name
    if (!map.has(key)) {
      map.set(key, item)
    }
  })

  return Array.from(map.values())
}

function buildWorkflowPayload(
  values: { name: string; description?: string },
  steps: EditableWorkflowStep[],
): WorkflowPayloadExtended {
  return {
    name: values.name,
    description: values.description,
    steps: steps.map(step => ({
      name: step.name,
      description: step.description,
      orderIndex: step.orderIndex,
      isInitial: step.isInitial,
      isFinal: step.isFinal,
      slaHours: step.slaHours,
      allowedActions: step.allowedActions,
      receivesNotification: step.receivesNotification,
      requiredNotification: step.requiredNotification,
      notificationTemplateIds: step.notificationTemplateIds,
      responsibles: step.responsibles
        .filter(name => name.trim().length > 0)
        .map(name => ({ name })),
      metadata: step.metadata.map(meta => ({
        metadataDefinitionId: meta.definitionId,
        name: meta.name,
        label: meta.label,
        type: meta.type,
        required: meta.required,
        multiple: meta.multiple,
        options: meta.options,
      })),
      transitions: step.transitions.map(tr => ({
        toStepOrderIndex: tr.toStepOrderIndex,
        triggerAction: tr.triggerAction,
      })),
    })),
  }
}

export function WorkflowNewPage({
  embedded = false,
  onCancel,
  onSaved,
}: WorkflowNewPageProps) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const [metadataSelectionByStep, setMetadataSelectionByStep] = useState<Record<number, string[]>>({})
  const [metadataSetSelectionByStep, setMetadataSetSelectionByStep] = useState<Record<number, string | undefined>>({})

  const [steps, setSteps] = useState<EditableWorkflowStep[]>(
    normalizeSteps([
      {
        name: 'Elaboração',
        description: '',
        orderIndex: 1,
        isInitial: true,
        isFinal: false,
        slaHours: 48,
        allowedActions: ['enviar'],
        transitions: [{ toStepOrderIndex: 2, triggerAction: 'enviar' }],
        responsibles: ['Elaborador'],
        receivesNotification: true,
        requiredNotification: false,
        notificationTemplateIds: [],
        metadata: [],
      },
      {
        name: 'Aprovação',
        description: '',
        orderIndex: 2,
        isInitial: false,
        isFinal: false,
        slaHours: 24,
        allowedActions: ['aprovar', 'reprovar', 'devolver'],
        transitions: [
          { toStepOrderIndex: 3, triggerAction: 'aprovar' },
          { toStepOrderIndex: 4, triggerAction: 'reprovar' },
          { toStepOrderIndex: 1, triggerAction: 'devolver' },
        ],
        responsibles: ['Aprovador'],
        receivesNotification: true,
        requiredNotification: true,
        notificationTemplateIds: [],
        metadata: [],
      },
      {
        name: 'Aprovado',
        description: '',
        orderIndex: 3,
        isInitial: false,
        isFinal: true,
        allowedActions: [],
        transitions: [],
        responsibles: ['Qualidade'],
        receivesNotification: false,
        requiredNotification: false,
        notificationTemplateIds: [],
        metadata: [],
      },
      {
        name: 'Reprovado',
        description: '',
        orderIndex: 4,
        isInitial: false,
        isFinal: true,
        allowedActions: [],
        transitions: [],
        responsibles: ['Qualidade'],
        receivesNotification: false,
        requiredNotification: false,
        notificationTemplateIds: [],
        metadata: [],
      },
    ]),
  )

  const {
    data: metadataDefinitions = [],
    isLoading: isLoadingMetadataDefinitions,
  } = useQuery<MetadataCatalogItem[]>({
    queryKey: ['metadata-definitions'],
    queryFn: async () => {
      const result = await getMetadataDefinitions()
      return result as MetadataCatalogItem[]
    },
  })

  const {
    data: notificationTemplates = [],
    isLoading: isLoadingNotificationTemplates,
  } = useQuery<NotificationTemplateListItem[]>({
    queryKey: ['notification-templates'],
    queryFn: async () => {
      const result = await getNotificationTemplates()
      return result as NotificationTemplateListItem[]
    },
  })

  const mutation = useMutation({
    mutationFn: (payload: WorkflowPayloadExtended) =>
      createWorkflow(payload as unknown as WorkflowPayload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      message.success('Workflow criado!')

      if (embedded) {
        onSaved?.()
        return
      }

      navigate('/workflows')
    },
    onError: () => {
      message.error('Não foi possível criar o workflow.')
    },
  })

  const actionOptions = useMemo(() => {
    const merged = [...ACTION_SUGGESTIONS, ...steps.flatMap(step => step.allowedActions)]
    return [...new Set(merged.map(item => item.trim()).filter(Boolean))].map(item => ({
      label: item,
      value: item,
    }))
  }, [steps])

  const metadataOptions = useMemo(() => {
    return metadataDefinitions
      .map(item => {
        const setName = extractMetadataSetName(item)
        const label = item.label || item.name || 'Metadado sem nome'

        return {
          label: setName ? `${label} (${setName})` : label,
          value: item.id,
        }
      })
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [metadataDefinitions])

  const metadataSetOptions = useMemo(() => {
    return [...new Set(metadataDefinitions.map(extractMetadataSetName).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b))
      .map(setName => ({
        label: setName,
        value: setName,
      }))
  }, [metadataDefinitions])

  const notificationTransferData = useMemo(() => {
    return notificationTemplates
      .filter(item => item.isActive !== false)
      .map(item => ({
        key: item.id,
        title: item.name,
        description: item.description || item.code || '',
      }))
  }, [notificationTemplates])

  const addStep = () => {
    const nextIndex = steps.length + 1

    setSteps(prev =>
      normalizeSteps([
        ...prev,
        {
          name: `Etapa ${nextIndex}`,
          description: '',
          orderIndex: nextIndex,
          isInitial: false,
          isFinal: false,
          slaHours: 24,
          allowedActions: ['aprovar', 'reprovar'],
          transitions: [],
          responsibles: [],
          receivesNotification: false,
          requiredNotification: false,
          notificationTemplateIds: [],
          metadata: [],
        },
      ]),
    )
  }

  const removeStep = (index: number) => {
    setSteps(prev => normalizeSteps(prev.filter((_, i) => i !== index)))
  }

  const updateStep = <K extends keyof EditableWorkflowStep>(
    index: number,
    field: K,
    value: EditableWorkflowStep[K],
  ) => {
    setSteps(prev => {
      const newSteps = [...prev]
      newSteps[index] = { ...newSteps[index], [field]: value }
      return normalizeSteps(newSteps)
    })
  }

  const updateTransitionTarget = (
    stepIndex: number,
    triggerAction: string,
    toStepOrderIndex: number,
  ) => {
    setSteps(prev => {
      const newSteps = [...prev]
      const step = newSteps[stepIndex]

      newSteps[stepIndex] = {
        ...step,
        transitions: step.transitions.map(tr =>
          tr.triggerAction === triggerAction ? { ...tr, toStepOrderIndex } : tr,
        ),
      }

      return normalizeSteps(newSteps)
    })
  }

  const addSelectedMetadata = (stepIndex: number) => {
    const selectedIds = metadataSelectionByStep[stepIndex] || []

    if (!selectedIds.length) {
      message.warning('Selecione ao menos um metadado.')
      return
    }

    const selectedMetadata = metadataDefinitions
      .filter(item => selectedIds.includes(item.id))
      .map(mapMetadataDefinitionToEditable)

    updateStep(
      stepIndex,
      'metadata',
      mergeMetadata(steps[stepIndex].metadata, selectedMetadata),
    )

    setMetadataSelectionByStep(prev => ({
      ...prev,
      [stepIndex]: [],
    }))
  }

  const addMetadataSet = (stepIndex: number) => {
    const selectedSet = metadataSetSelectionByStep[stepIndex]

    if (!selectedSet) {
      message.warning('Selecione um conjunto de metadados.')
      return
    }

    const selectedMetadata = metadataDefinitions
      .filter(item => extractMetadataSetName(item) === selectedSet)
      .map(mapMetadataDefinitionToEditable)

    if (!selectedMetadata.length) {
      message.warning('Nenhum metadado encontrado para este conjunto.')
      return
    }

    updateStep(
      stepIndex,
      'metadata',
      mergeMetadata(steps[stepIndex].metadata, selectedMetadata),
    )

    setMetadataSetSelectionByStep(prev => ({
      ...prev,
      [stepIndex]: undefined,
    }))
  }

  const updateMetadata = (
    stepIndex: number,
    metadataIndex: number,
    field: keyof EditableWorkflowMetadata,
    value: string | boolean | string[],
  ) => {
    const newMetadata = [...steps[stepIndex].metadata]
    newMetadata[metadataIndex] = {
      ...newMetadata[metadataIndex],
      [field]: value,
    }
    updateStep(stepIndex, 'metadata', newMetadata)
  }

  const removeMetadata = (stepIndex: number, metadataIndex: number) => {
    updateStep(
      stepIndex,
      'metadata',
      steps[stepIndex].metadata.filter((_, idx) => idx !== metadataIndex),
    )
  }

  const handleSave = (values: { name: string; description?: string }) => {
    mutation.mutate(buildWorkflowPayload(values, steps))
  }

  return (
    <div
      style={{
        padding: embedded ? 0 : 24,
        background: embedded ? 'transparent' : '#f5f7fb',
        minHeight: embedded ? 'auto' : '100vh',
      }}
    >
      <Space style={{ marginBottom: 20 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => {
            if (embedded) {
              onCancel?.()
              return
            }
            navigate('/workflows')
          }}
        >
          Voltar
        </Button>
        <div>
          <Title level={3} style={{ margin: 0 }}>
            Novo Workflow
          </Title>
          <Text type="secondary">
            Configure o fluxo BPM com etapas, responsáveis, notificações e metadados
          </Text>
        </div>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleSave}>
        <Card style={{ marginBottom: 16, borderRadius: 16 }} title="Dados gerais do workflow">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Nome do Workflow"
                name="name"
                rules={[{ required: true, message: 'Informe o nome do workflow' }]}
              >
                <Input placeholder="Ex.: Fluxo de Aprovação de Contratos" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label="Descrição" name="description">
                <Input.TextArea rows={2} placeholder="Descreva o objetivo do workflow" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Card
          title="Etapas do fluxo"
          style={{ borderRadius: 16 }}
          extra={
            <Button icon={<PlusOutlined />} type="primary" onClick={addStep}>
              Adicionar Etapa
            </Button>
          }
        >
          {steps.map((step, i) => (
            <Card
              key={i}
              size="small"
              style={{
                marginBottom: 16,
                borderRadius: 16,
                borderLeft: step.isInitial
                  ? '5px solid #1677ff'
                  : step.isFinal
                    ? '5px solid #722ed1'
                    : '5px solid #d9d9d9',
                boxShadow: '0 6px 18px rgba(15, 23, 42, 0.05)',
              }}
              title={
                <Space wrap>
                  <Text strong>
                    Etapa {i + 1}: {step.name}
                  </Text>
                  {step.isInitial && <Tag color="blue">Inicial</Tag>}
                  {step.isFinal && <Tag color="purple">Final</Tag>}
                  {step.slaHours ? <Tag color="gold">SLA: {step.slaHours}h</Tag> : null}
                  {step.transitions.length > 1 && <Tag color="orange">Gateway BPM</Tag>}
                </Space>
              }
              extra={
                <Button
                  icon={<DeleteOutlined />}
                  danger
                  size="small"
                  onClick={() => removeStep(i)}
                />
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={16}>
                <Row gutter={16}>
                  <Col xs={24} md={8}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                      Nome da etapa
                    </div>
                    <Input value={step.name} onChange={e => updateStep(i, 'name', e.target.value)} />
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                      SLA (horas)
                    </div>
                    <InputNumber
                      value={step.slaHours}
                      onChange={v => updateStep(i, 'slaHours', v ?? undefined)}
                      placeholder="Sem SLA"
                      min={0}
                      style={{ width: '100%' }}
                    />
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                      Descrição
                    </div>
                    <Input
                      value={step.description}
                      onChange={e => updateStep(i, 'description', e.target.value)}
                    />
                  </Col>
                </Row>

                <Space wrap>
                  <Checkbox
                    checked={step.isInitial}
                    onChange={e => updateStep(i, 'isInitial', e.target.checked)}
                  >
                    Etapa Inicial
                  </Checkbox>

                  <Checkbox
                    checked={step.isFinal}
                    onChange={e => updateStep(i, 'isFinal', e.target.checked)}
                  >
                    Etapa Final
                  </Checkbox>
                </Space>

                <Divider style={{ margin: '8px 0' }} />

                <Tabs
                  defaultActiveKey="rules"
                  items={[
                    {
                      key: 'rules',
                      label: (
                        <Space size={6}>
                          <ApartmentOutlined />
                          <span>Regras da atividade</span>
                        </Space>
                      ),
                      children: (
                        <Card
                          size="small"
                          style={{ borderRadius: 12, border: 'none', boxShadow: 'none' }}
                        >
                          <Row gutter={16}>
                            <Col xs={24} md={12}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                Ações permitidas
                              </div>
                              <Select
                                mode="tags"
                                value={step.allowedActions}
                                onChange={v => updateStep(i, 'allowedActions', v)}
                                options={actionOptions}
                                placeholder="Selecione ou digite novas ações"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                                optionFilterProp="label"
                              />
                            </Col>

                            <Col xs={24} md={12}>
                              <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                Responsáveis
                              </div>
                              <Select
                                mode="tags"
                                value={step.responsibles}
                                onChange={v => updateStep(i, 'responsibles', v)}
                                options={RESPONSIBLE_SUGGESTIONS.map(r => ({
                                  label: r,
                                  value: r,
                                }))}
                                placeholder="Selecione ou digite responsáveis"
                                style={{ width: '100%' }}
                                tokenSeparators={[',']}
                                suffixIcon={<UserOutlined />}
                              />
                            </Col>
                          </Row>
                        </Card>
                      ),
                    },
                    {
                      key: 'notifications',
                      label: (
                        <Space size={6}>
                          <NotificationOutlined />
                          <span>Notificações</span>
                        </Space>
                      ),
                      children: (
                        <Card
                          size="small"
                          style={{ borderRadius: 12, border: 'none', boxShadow: 'none' }}
                        >
                          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                            <Col xs={24} md={8}>
                              <Space direction="vertical" size={4}>
                                <Text>Recebe notificação</Text>
                                <Switch
                                  checked={step.receivesNotification}
                                  onChange={checked =>
                                    updateStep(i, 'receivesNotification', checked)
                                  }
                                />
                              </Space>
                            </Col>

                            <Col xs={24} md={8}>
                              <Space direction="vertical" size={4}>
                                <Text>Notificação obrigatória</Text>
                                <Switch
                                  checked={step.requiredNotification}
                                  onChange={checked =>
                                    updateStep(i, 'requiredNotification', checked)
                                  }
                                  disabled={!step.receivesNotification}
                                />
                              </Space>
                            </Col>

                            <Col xs={24} md={8}>
                              <Space direction="vertical" size={4}>
                                <Text type="secondary">
                                  Selecionadas: {step.notificationTemplateIds.length}
                                </Text>
                              </Space>
                            </Col>
                          </Row>

                          {isLoadingNotificationTemplates ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                              <Spin />
                            </div>
                          ) : notificationTransferData.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Nenhuma notificação cadastrada"
                            />
                          ) : (
                            <Transfer
                              dataSource={notificationTransferData}
                              targetKeys={step.notificationTemplateIds}
                              onChange={nextTargetKeys =>
                                updateStep(i, 'notificationTemplateIds', nextTargetKeys as string[])
                              }
                              render={item =>
                                item.description
                                  ? `${item.title} — ${item.description}`
                                  : item.title
                              }
                              titles={['Disponíveis', 'Selecionadas']}
                              listStyle={{
                                width: '100%',
                                height: 260,
                              }}
                              disabled={!step.receivesNotification}
                              showSearch
                              oneWay
                            />
                          )}
                        </Card>
                      ),
                    },
                    {
                      key: 'transitions',
                      label: 'Transições',
                      children: (
                        <Card
                          size="small"
                          style={{ borderRadius: 12, border: 'none', boxShadow: 'none' }}
                        >
                          {step.allowedActions.length === 0 ? (
                            <Empty
                              image={Empty.PRESENTED_IMAGE_SIMPLE}
                              description="Nenhuma ação cadastrada para esta etapa"
                            />
                          ) : (
                            <Space direction="vertical" size={12} style={{ width: '100%' }}>
                              {step.transitions.map(tr => (
                                <Row key={tr.triggerAction} gutter={12} align="middle">
                                  <Col xs={24} md={10}>
                                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                      Ação
                                    </div>
                                    <Input value={tr.triggerAction} disabled />
                                  </Col>

                                  <Col xs={24} md={2}>
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        height: '100%',
                                        paddingTop: 24,
                                        fontWeight: 600,
                                        color: '#8c8c8c',
                                      }}
                                    >
                                      →
                                    </div>
                                  </Col>

                                  <Col xs={24} md={12}>
                                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                      Vai para a etapa
                                    </div>
                                    <Select
                                      value={tr.toStepOrderIndex}
                                      onChange={value =>
                                        updateTransitionTarget(i, tr.triggerAction, value)
                                      }
                                      style={{ width: '100%' }}
                                      options={steps
                                        .filter(targetStep => targetStep.orderIndex !== step.orderIndex)
                                        .map(targetStep => ({
                                          label: `Etapa ${targetStep.orderIndex}: ${targetStep.name}`,
                                          value: targetStep.orderIndex,
                                        }))}
                                    />
                                  </Col>
                                </Row>
                              ))}
                            </Space>
                          )}
                        </Card>
                      ),
                    },
                    {
                      key: 'metadata',
                      label: (
                        <Space size={6}>
                          <FileTextOutlined />
                          <span>Metadados</span>
                        </Space>
                      ),
                      children: (
                        <Card
                          size="small"
                          style={{ borderRadius: 12, border: 'none', boxShadow: 'none' }}
                        >
                          <Space direction="vertical" size={16} style={{ width: '100%' }}>
                            {isLoadingMetadataDefinitions ? (
                              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                                <Spin />
                              </div>
                            ) : (
                              <>
                                <Card
                                  size="small"
                                  title="Adicionar metadados cadastrados"
                                  style={{ borderRadius: 12 }}
                                >
                                  <Row gutter={12}>
                                    <Col xs={24} md={10}>
                                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                        Metadados
                                      </div>
                                      <Select
                                        mode="multiple"
                                        value={metadataSelectionByStep[i] || []}
                                        onChange={value =>
                                          setMetadataSelectionByStep(prev => ({
                                            ...prev,
                                            [i]: value,
                                          }))
                                        }
                                        options={metadataOptions}
                                        placeholder="Selecione um ou mais metadados"
                                        style={{ width: '100%' }}
                                        optionFilterProp="label"
                                        showSearch
                                      />
                                    </Col>

                                    <Col xs={24} md={10}>
                                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                        Conjunto
                                      </div>
                                      <Select
                                        value={metadataSetSelectionByStep[i]}
                                        onChange={value =>
                                          setMetadataSetSelectionByStep(prev => ({
                                            ...prev,
                                            [i]: value,
                                          }))
                                        }
                                        options={metadataSetOptions}
                                        placeholder="Selecione um conjunto"
                                        style={{ width: '100%' }}
                                        optionFilterProp="label"
                                        showSearch
                                        allowClear
                                      />
                                    </Col>

                                    <Col xs={24} md={4}>
                                      <div style={{ fontSize: 12, color: 'transparent', marginBottom: 6 }}>
                                        Ações
                                      </div>
                                      <Space direction="vertical" style={{ width: '100%' }}>
                                        <Button type="primary" block onClick={() => addSelectedMetadata(i)}>
                                          Adicionar
                                        </Button>
                                        <Button block onClick={() => addMetadataSet(i)}>
                                          Add conjunto
                                        </Button>
                                      </Space>
                                    </Col>
                                  </Row>
                                </Card>

                                {step.metadata.length === 0 ? (
                                  <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Nenhum metadado adicionado nesta etapa"
                                  />
                                ) : (
                                  step.metadata.map((meta, mi) => (
                                    <Card
                                      key={`${meta.definitionId || meta.name}-${mi}`}
                                      size="small"
                                      style={{ marginBottom: 12, borderRadius: 12 }}
                                      title={`Metadado ${mi + 1}`}
                                      extra={
                                        <Space>
                                          {meta.setName ? <Tag color="cyan">{meta.setName}</Tag> : null}
                                          <Button size="small" danger onClick={() => removeMetadata(i, mi)}>
                                            Remover
                                          </Button>
                                        </Space>
                                      }
                                    >
                                      <Row gutter={12}>
                                        <Col xs={24} md={6}>
                                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                            Nome técnico
                                          </div>
                                          <Input value={meta.name} disabled />
                                        </Col>

                                        <Col xs={24} md={6}>
                                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                            Rótulo
                                          </div>
                                          <Input value={meta.label} disabled />
                                        </Col>

                                        <Col xs={24} md={6}>
                                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                            Tipo
                                          </div>
                                          <Select
                                            value={meta.type}
                                            options={METADATA_TYPE_OPTIONS}
                                            style={{ width: '100%' }}
                                            disabled
                                          />
                                        </Col>

                                        <Col xs={24} md={6}>
                                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                                            Opções
                                          </div>
                                          <Select
                                            mode="tags"
                                            value={meta.options}
                                            style={{ width: '100%' }}
                                            disabled
                                          />
                                        </Col>
                                      </Row>

                                      <Space wrap style={{ marginTop: 12 }}>
                                        <Checkbox
                                          checked={meta.required}
                                          onChange={e =>
                                            updateMetadata(i, mi, 'required', e.target.checked)
                                          }
                                        >
                                          Obrigatório nesta etapa
                                        </Checkbox>

                                        <Checkbox checked={meta.multiple} disabled>
                                          Multivalorado
                                        </Checkbox>
                                      </Space>
                                    </Card>
                                  ))
                                )}
                              </>
                            )}
                          </Space>
                        </Card>
                      ),
                    },
                  ]}
                />
              </Space>
            </Card>
          ))}
        </Card>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Salvar Workflow
          </Button>

          <Button
            onClick={() => {
              if (embedded) {
                onCancel?.()
                return
              }
              navigate('/workflows')
            }}
          >
            Cancelar
          </Button>
        </Space>
      </Form>
    </div>
  )
}