import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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
  metadata: EditableWorkflowMetadata[]
}

function buildWorkflowPayload(values: { name: string; description?: string }, steps: EditableWorkflowStep[]): WorkflowPayload {
  return {
    name: values.name,
    description: values.description,
    steps: steps.map((step) => ({
      name: step.name,
      description: step.description,
      orderIndex: step.orderIndex,
      isInitial: step.isInitial,
      isFinal: step.isFinal,
      slaHours: step.slaHours,
      allowedActions: step.allowedActions,
      receivesNotification: step.receivesNotification,
      requiredNotification: step.requiredNotification,
      responsibles: step.responsibles
        .filter((name) => name.trim().length > 0)
        .map((name) => ({ name })),
      metadata: step.metadata.map((meta) => ({
        name: meta.name,
        label: meta.label,
        type: meta.type,
        required: meta.required,
        multiple: meta.multiple,
        options: meta.options,
      })),
      transitions: step.transitions.map((tr) => ({
        toStepOrderIndex: tr.toStepOrderIndex,
        triggerAction: tr.triggerAction,
      })),
    })),
  }
}

export function WorkflowNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form] = Form.useForm()

  const [steps, setSteps] = useState<EditableWorkflowStep[]>([
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
      metadata: [
        {
          name: 'titulo_documento',
          label: 'Título do Documento',
          type: 'text',
          required: true,
          multiple: false,
          options: [],
        },
      ],
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
      metadata: [
        {
          name: 'parecer_aprovacao',
          label: 'Parecer de Aprovação',
          type: 'text',
          required: false,
          multiple: false,
          options: [],
        },
      ],
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
      metadata: [],
    },
  ])

  const mutation = useMutation({
    mutationFn: createWorkflow,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workflows'] })
      message.success('Workflow criado!')
      navigate('/workflows')
    },
  })

  const addStep = () => {
    const nextIndex = steps.length + 1

    setSteps([
      ...steps,
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
        metadata: [],
      },
    ])
  }

  const removeStep = (index: number) => {
    const nextLength = steps.length - 1

    const newSteps = steps
      .filter((_, i) => i !== index)
      .map((step, i) => ({
        ...step,
        orderIndex: i + 1,
        transitions: step.transitions.map((tr) => ({
          ...tr,
          toStepOrderIndex:
            tr.toStepOrderIndex > nextLength ? Math.max(1, nextLength) : tr.toStepOrderIndex,
        })),
      }))

    setSteps(newSteps)
  }

  const updateStep = <K extends keyof EditableWorkflowStep>(
    index: number,
    field: K,
    value: EditableWorkflowStep[K]
  ) => {
    const newSteps = [...steps]
    newSteps[index] = { ...newSteps[index], [field]: value }
    setSteps(newSteps)
  }

  const addTransition = (stepIndex: number) => {
    updateStep(stepIndex, 'transitions', [
      ...steps[stepIndex].transitions,
      { toStepOrderIndex: 1, triggerAction: 'aprovar' },
    ])
  }

  const updateTransition = (
    stepIndex: number,
    transitionIndex: number,
    field: keyof EditableWorkflowTransition,
    value: string | number
  ) => {
    const newTransitions = [...steps[stepIndex].transitions]
    newTransitions[transitionIndex] = {
      ...newTransitions[transitionIndex],
      [field]: value,
    }
    updateStep(stepIndex, 'transitions', newTransitions)
  }

  const removeTransition = (stepIndex: number, transitionIndex: number) => {
    updateStep(
      stepIndex,
      'transitions',
      steps[stepIndex].transitions.filter((_, idx) => idx !== transitionIndex)
    )
  }

  const addMetadata = (stepIndex: number) => {
    updateStep(stepIndex, 'metadata', [
      ...steps[stepIndex].metadata,
      {
        name: '',
        label: '',
        type: 'text',
        required: false,
        multiple: false,
        options: [],
      },
    ])
  }

  const updateMetadata = (
    stepIndex: number,
    metadataIndex: number,
    field: keyof EditableWorkflowMetadata,
    value: string | boolean | string[]
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
      steps[stepIndex].metadata.filter((_, idx) => idx !== metadataIndex)
    )
  }

  const handleSave = (values: { name: string; description?: string }) => {
    mutation.mutate(buildWorkflowPayload(values, steps))
  }

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Space style={{ marginBottom: 20 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflows')}>
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
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Nome da etapa</div>
                    <Input value={step.name} onChange={(e) => updateStep(i, 'name', e.target.value)} />
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>SLA (horas)</div>
                    <InputNumber
                      value={step.slaHours}
                      onChange={(v) => updateStep(i, 'slaHours', v ?? undefined)}
                      placeholder="Sem SLA"
                      min={0}
                      style={{ width: '100%' }}
                    />
                  </Col>

                  <Col xs={24} md={8}>
                    <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Descrição</div>
                    <Input
                      value={step.description}
                      onChange={(e) => updateStep(i, 'description', e.target.value)}
                    />
                  </Col>
                </Row>

                <Space wrap>
                  <Checkbox checked={step.isInitial} onChange={(e) => updateStep(i, 'isInitial', e.target.checked)}>
                    Etapa Inicial
                  </Checkbox>

                  <Checkbox checked={step.isFinal} onChange={(e) => updateStep(i, 'isFinal', e.target.checked)}>
                    Etapa Final
                  </Checkbox>
                </Space>

                <Divider style={{ margin: '8px 0' }} />

                <Card
                  size="small"
                  title={
                    <Space>
                      <ApartmentOutlined />
                      <span>Regras da atividade</span>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Ações permitidas</div>
                      <Select
                        mode="tags"
                        value={step.allowedActions}
                        onChange={(v) => updateStep(i, 'allowedActions', v)}
                        options={ACTION_SUGGESTIONS.map((a) => ({ label: a, value: a }))}
                        placeholder="Selecione ou digite uma ação"
                        style={{ width: '100%' }}
                        tokenSeparators={[',']}
                      />
                    </Col>

                    <Col xs={24} md={12}>
                      <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Responsáveis</div>
                      <Select
                        mode="tags"
                        value={step.responsibles}
                        onChange={(v) => updateStep(i, 'responsibles', v)}
                        options={RESPONSIBLE_SUGGESTIONS.map((r) => ({ label: r, value: r }))}
                        placeholder="Selecione ou digite responsáveis"
                        style={{ width: '100%' }}
                        tokenSeparators={[',']}
                        suffixIcon={<UserOutlined />}
                      />
                    </Col>
                  </Row>
                </Card>

                <Card
                  size="small"
                  title={
                    <Space>
                      <NotificationOutlined />
                      <span>Notificações</span>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                >
                  <Row gutter={16}>
                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={4}>
                        <Text>Recebe notificação</Text>
                        <Switch
                          checked={step.receivesNotification}
                          onChange={(checked) => updateStep(i, 'receivesNotification', checked)}
                        />
                      </Space>
                    </Col>

                    <Col xs={24} md={12}>
                      <Space direction="vertical" size={4}>
                        <Text>Notificação obrigatória</Text>
                        <Switch
                          checked={step.requiredNotification}
                          onChange={(checked) => updateStep(i, 'requiredNotification', checked)}
                          disabled={!step.receivesNotification}
                        />
                      </Space>
                    </Col>
                  </Row>
                </Card>

                <Card size="small" title="Transições" style={{ borderRadius: 12 }}>
                  {step.transitions.map((tr, ti) => (
                    <Space key={ti} wrap style={{ marginBottom: 8, display: 'flex' }}>
                      <Select
                        value={tr.triggerAction}
                        onChange={(v) => updateTransition(i, ti, 'triggerAction', v)}
                        options={[...new Set([...ACTION_SUGGESTIONS, ...step.allowedActions])].map((a) => ({
                          label: a,
                          value: a,
                        }))}
                        style={{ width: 180 }}
                        showSearch
                        placeholder="Ação"
                      />

                      <span>→ Etapa</span>

                      <InputNumber
                        value={tr.toStepOrderIndex}
                        min={1}
                        max={steps.length}
                        onChange={(v) => updateTransition(i, ti, 'toStepOrderIndex', v ?? 1)}
                      />

                      <Button size="small" danger onClick={() => removeTransition(i, ti)}>
                        Remover
                      </Button>
                    </Space>
                  ))}

                  <Button size="small" onClick={() => addTransition(i)}>
                    + Transição
                  </Button>
                </Card>

                <Card
                  size="small"
                  title={
                    <Space>
                      <FileTextOutlined />
                      <span>Metadados da atividade</span>
                    </Space>
                  }
                  style={{ borderRadius: 12 }}
                >
                  {step.metadata.map((meta, mi) => (
                    <Card
                      key={mi}
                      size="small"
                      style={{ marginBottom: 12, borderRadius: 12 }}
                      title={`Metadado ${mi + 1}`}
                      extra={
                        <Button size="small" danger onClick={() => removeMetadata(i, mi)}>
                          Remover
                        </Button>
                      }
                    >
                      <Row gutter={12}>
                        <Col xs={24} md={6}>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Nome técnico</div>
                          <Input
                            value={meta.name}
                            onChange={(e) => updateMetadata(i, mi, 'name', e.target.value)}
                            placeholder="ex.: numero_contrato"
                          />
                        </Col>

                        <Col xs={24} md={6}>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Rótulo</div>
                          <Input
                            value={meta.label}
                            onChange={(e) => updateMetadata(i, mi, 'label', e.target.value)}
                            placeholder="Ex.: Número do Contrato"
                          />
                        </Col>

                        <Col xs={24} md={6}>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Tipo</div>
                          <Select
                            value={meta.type}
                            onChange={(v) => updateMetadata(i, mi, 'type', v)}
                            options={METADATA_TYPE_OPTIONS}
                            style={{ width: '100%' }}
                          />
                        </Col>

                        <Col xs={24} md={6}>
                          <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>Opções</div>
                          <Select
                            mode="tags"
                            value={meta.options}
                            onChange={(v) => updateMetadata(i, mi, 'options', v)}
                            placeholder="Para lista/multilista"
                            style={{ width: '100%' }}
                            tokenSeparators={[',']}
                          />
                        </Col>
                      </Row>

                      <Space wrap style={{ marginTop: 12 }}>
                        <Checkbox checked={meta.required} onChange={(e) => updateMetadata(i, mi, 'required', e.target.checked)}>
                          Obrigatório
                        </Checkbox>

                        <Checkbox checked={meta.multiple} onChange={(e) => updateMetadata(i, mi, 'multiple', e.target.checked)}>
                          Multivalorado
                        </Checkbox>
                      </Space>
                    </Card>
                  ))}

                  <Button size="small" onClick={() => addMetadata(i)}>
                    + Metadado
                  </Button>
                </Card>
              </Space>
            </Card>
          ))}
        </Card>

        <Divider />

        <Space>
          <Button type="primary" htmlType="submit" loading={mutation.isPending}>
            Salvar Workflow
          </Button>

          <Button onClick={() => navigate('/workflows')}>Cancelar</Button>
        </Space>
      </Form>
    </div>
  )
  
}