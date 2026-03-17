import { useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import {
  Card,
  Tag,
  Button,
  Typography,
  Descriptions,
  Space,
  Tabs,
  Row,
  Col,
  Divider,
  Empty,
  List,
  Badge,
  Skeleton,
  Drawer,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Collapse,
  Alert,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  NotificationOutlined,
  UserOutlined,
  FileTextOutlined,
  SwapOutlined,
  PlayCircleOutlined,
  StopOutlined,
  EditOutlined,
  SaveOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { getWorkflow } from '../../api/workflows'
import { WorkflowDiagram } from '../../components/WorkflowDiagram'
import type { Workflow, WorkflowStep } from '../../types'

const { Title, Text } = Typography
const { Panel } = Collapse

const actionColors: Record<string, string> = {
  aprovar: 'green',
  reprovar: 'red',
  devolver: 'orange',
  enviar: 'blue',
}

type WorkflowMetadata =
  | string
  | {
      id?: string
      name?: string
      label?: string
      type?: string
      required?: boolean
      isRequired?: boolean
      multiple?: boolean
      options?: string[]
    }

type WorkflowResponsible =
  | string
  | {
      id?: string
      name?: string
      fullName?: string
      roleName?: string
      positionName?: string
      type?: string
    }

function getActionColor(action: string) {
  return actionColors[action?.toLowerCase?.()] ?? 'default'
}

function getResponsibles(step: WorkflowStep): WorkflowResponsible[] {
  const s = step as WorkflowStep & {
    responsibles?: WorkflowResponsible[]
    assignees?: WorkflowResponsible[]
    users?: WorkflowResponsible[]
  }
  return s.responsibles ?? s.assignees ?? s.users ?? []
}

function getMetadata(step: WorkflowStep): WorkflowMetadata[] {
  const s = step as WorkflowStep & {
    metadata?: WorkflowMetadata[]
    activityMetadata?: WorkflowMetadata[]
    fields?: WorkflowMetadata[]
  }
  return s.metadata ?? s.activityMetadata ?? s.fields ?? []
}

function getReceivesNotification(step: WorkflowStep): boolean {
  const s = step as WorkflowStep & {
    receivesNotification?: boolean
    notifyResponsible?: boolean
    notificationEnabled?: boolean
  }
  return Boolean(s.receivesNotification ?? s.notifyResponsible ?? s.notificationEnabled ?? false)
}

function getRequiredNotification(step: WorkflowStep): boolean {
  const s = step as WorkflowStep & {
    requiredNotification?: boolean
    notificationRequired?: boolean
  }
  return Boolean(s.requiredNotification ?? s.notificationRequired ?? false)
}

function renderResponsibleName(responsible: WorkflowResponsible) {
  if (typeof responsible === 'string') return responsible
  return (
    responsible.name ||
    responsible.fullName ||
    responsible.roleName ||
    responsible.positionName ||
    responsible.type ||
    'Responsável não identificado'
  )
}

function renderMetadataTag(metadata: WorkflowMetadata) {
  if (typeof metadata === 'string') {
    return { title: metadata, subtitle: '', required: false, multiple: false }
  }
  return {
    title: metadata.label || metadata.name || 'Metadado sem nome',
    subtitle: metadata.type ? `Tipo: ${metadata.type}` : '',
    required: Boolean(metadata.required ?? metadata.isRequired ?? false),
    multiple: Boolean(metadata.multiple ?? false),
  }
}

// ─── Drawer de edição de etapa ───────────────────────────────────────────────

type StepDrawerProps = {
  step: WorkflowStep | null
  open: boolean
  onClose: () => void
  onSave: (updated: WorkflowStep) => void
}

function StepEditDrawer({ step, open, onClose, onSave }: StepDrawerProps) {
  const [form] = Form.useForm()

  if (!step) return null

  const responsibles = getResponsibles(step)
  const metadata = getMetadata(step)
  const receivesNotification = getReceivesNotification(step)
  const requiredNotification = getRequiredNotification(step)

  const handleSave = () => {
    form.validateFields().then((values) => {
      onSave({ ...step, ...values })
      onClose()
    })
  }

  return (
    <Drawer
      title={
        <Space>
          <EditOutlined style={{ color: '#1677ff' }} />
          <span>Editar etapa</span>
          {step.isInitial && <Tag color="blue" icon={<PlayCircleOutlined />}>Inicial</Tag>}
          {step.isFinal && <Tag color="purple" icon={<StopOutlined />}>Final</Tag>}
        </Space>
      }
      open={open}
      onClose={onClose}
      width={560}
      extra={
        <Space>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            Salvar alterações
          </Button>
        </Space>
      }
      destroyOnClose
    >
      <Alert
        message="Editando localmente"
        description="As alterações feitas aqui serão aplicadas apenas na visualização atual. Para persistir, chame o endpoint de atualização do fluxo."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: 20, borderRadius: 10 }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          name: step.name,
          description: step.description ?? '',
          slaHours: step.slaHours ?? null,
          isInitial: step.isInitial ?? false,
          isFinal: step.isFinal ?? false,
          allowedActions: step.allowedActions ?? [],
        }}
      >
        <Collapse
          defaultActiveKey={['basic', 'transitions', 'responsibles', 'notifications', 'metadata']}
          ghost
          style={{ marginBottom: 8 }}
        >
          {/* ── Identificação ── */}
          <Panel
            key="basic"
            header={
              <Space>
                <FileTextOutlined style={{ color: '#1677ff' }} />
                <Text strong>Identificação</Text>
              </Space>
            }
          >
            <Form.Item
              label="Nome da etapa"
              name="name"
              rules={[{ required: true, message: 'Informe o nome da etapa' }]}
            >
              <Input placeholder="Ex.: Aprovação gerencial" />
            </Form.Item>

            <Form.Item label="Descrição" name="description">
              <Input.TextArea rows={2} placeholder="Descreva o objetivo desta etapa" />
            </Form.Item>

            <Row gutter={12}>
              <Col span={12}>
                <Form.Item label="SLA (horas)" name="slaHours">
                  <InputNumber min={0} style={{ width: '100%' }} placeholder="Ex.: 24" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Inicial" name="isInitial" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item label="Final" name="isFinal" valuePropName="checked">
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label="Ações permitidas" name="allowedActions">
              <Select
                mode="tags"
                placeholder="Ex.: aprovar, reprovar, devolver"
                options={['aprovar', 'reprovar', 'devolver', 'enviar', 'concluir', 'publicar', 'arquivar', 'cancelar'].map(
                  (a) => ({ label: a, value: a })
                )}
              />
            </Form.Item>
          </Panel>

          {/* ── Responsáveis ── */}
          <Panel
            key="responsibles"
            header={
              <Space>
                <UserOutlined style={{ color: '#722ed1' }} />
                <Text strong>Responsáveis</Text>
                <Badge count={responsibles.length} style={{ backgroundColor: '#722ed1' }} />
              </Space>
            }
          >
            {responsibles.length > 0 ? (
              <Space wrap>
                {responsibles.map((r, i) => (
                  <Tag key={i} color="geekblue" style={{ borderRadius: 20 }}>
                    {renderResponsibleName(r)}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">Nenhum responsável definido para esta etapa.</Text>
            )}
            <div style={{ marginTop: 12 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                A edição de responsáveis é feita através da API de papéis e permissões.
              </Text>
            </div>
          </Panel>

          {/* ── Notificações ── */}
          <Panel
            key="notifications"
            header={
              <Space>
                <NotificationOutlined style={{ color: '#fa8c16' }} />
                <Text strong>Notificações</Text>
              </Space>
            }
          >
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                {receivesNotification
                  ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                <Text>Recebe notificação: <Text strong>{receivesNotification ? 'Sim' : 'Não'}</Text></Text>
              </Space>
              <Space>
                {requiredNotification
                  ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                <Text>Notificação obrigatória: <Text strong>{requiredNotification ? 'Sim' : 'Não'}</Text></Text>
              </Space>
            </Space>
          </Panel>

          {/* ── Transições ── */}
          <Panel
            key="transitions"
            header={
              <Space>
                <SwapOutlined style={{ color: '#13c2c2' }} />
                <Text strong>Transições</Text>
                <Badge count={step.transitions?.length ?? 0} style={{ backgroundColor: '#13c2c2' }} />
              </Space>
            }
          >
            {(step.transitions ?? []).length > 0 ? (
              <List
                size="small"
                dataSource={step.transitions}
                renderItem={(transition, index) => (
                  <List.Item key={transition.id ?? index}>
                    <Space>
                      <Tag color={getActionColor(transition.triggerAction)}>
                        {transition.triggerAction}
                      </Tag>
                      <Text type="secondary">→</Text>
                      <Text>{transition.toStepName || 'Destino não informado'}</Text>
                    </Space>
                  </List.Item>
                )}
              />
            ) : (
              <Text type="secondary">Nenhuma transição configurada.</Text>
            )}
          </Panel>

          {/* ── Metadados ── */}
          <Panel
            key="metadata"
            header={
              <Space>
                <FileTextOutlined style={{ color: '#52c41a' }} />
                <Text strong>Metadados da atividade</Text>
                <Badge count={metadata.length} style={{ backgroundColor: '#52c41a' }} />
              </Space>
            }
          >
            {metadata.length > 0 ? (
              <List
                size="small"
                dataSource={metadata}
                renderItem={(item, index) => {
                  const parsed = renderMetadataTag(item)
                  return (
                    <List.Item key={index}>
                      <Space wrap>
                        <Text strong>{parsed.title}</Text>
                        {parsed.subtitle && <Tag color="default">{parsed.subtitle}</Tag>}
                        {parsed.required && <Tag color="red">Obrigatório</Tag>}
                        {parsed.multiple && <Tag color="cyan">Multivalorado</Tag>}
                      </Space>
                    </List.Item>
                  )
                }}
              />
            ) : (
              <Text type="secondary">Nenhum metadado configurado.</Text>
            )}
          </Panel>
        </Collapse>
      </Form>
    </Drawer>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function WorkflowDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [selectedStep, setSelectedStep] = useState<WorkflowStep | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const { data: workflow, isLoading } = useQuery<Workflow>({
    queryKey: ['workflow', id],
    queryFn: () => getWorkflow(id!),
    enabled: !!id,
  })

  const orderedSteps = useMemo(() => {
    return (workflow?.steps ?? []).slice().sort((a, b) => a.orderIndex - b.orderIndex)
  }, [workflow])

  const handleStepClick = (step: WorkflowStep) => {
    setSelectedStep(step)
    setDrawerOpen(true)
  }

  const handleStepSave = (updated: WorkflowStep) => {
    // Aqui você chamaria sua mutation/API para salvar
    console.log('Step atualizado:', updated)
    // Ex: updateStepMutation.mutate(updated)
    setDrawerOpen(false)
  }

  if (isLoading) {
    return (
      <div style={{ padding: 24 }}>
        <Skeleton active paragraph={{ rows: 3 }} />
        <Card style={{ marginTop: 16 }}>
          <Skeleton active paragraph={{ rows: 8 }} />
        </Card>
      </div>
    )
  }

  if (!workflow) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Fluxo não encontrado" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Space
        style={{ marginBottom: 20, width: '100%', justifyContent: 'space-between', display: 'flex' }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflows')}>
            Voltar
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>{workflow.name}</Title>
            <Text type="secondary">Visualização detalhada do fluxo BPM</Text>
          </div>
        </Space>
      </Space>

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Space>
              <FileTextOutlined style={{ fontSize: 20, color: '#1677ff' }} />
              <div>
                <Text type="secondary">Nome do fluxo</Text>
                <div><Text strong>{workflow.name}</Text></div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Space>
              <Badge status="processing" />
              <div>
                <Text type="secondary">Versão</Text>
                <div><Text strong>{workflow.version}</Text></div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Space>
              <SwapOutlined style={{ fontSize: 20, color: '#722ed1' }} />
              <div>
                <Text type="secondary">Total de etapas</Text>
                <div><Text strong>{workflow.steps.length}</Text></div>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12} xl={6}>
          <Card bordered={false} style={{ borderRadius: 16 }}>
            <Space>
              <ClockCircleOutlined style={{ fontSize: 20, color: '#fa8c16' }} />
              <div>
                <Text type="secondary">Modelo BPM</Text>
                <div><Text strong>Fluxo controlado</Text></div>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>

      <Card bordered={false} style={{ marginBottom: 16, borderRadius: 16 }} title="Resumo do fluxo">
        <Descriptions column={2}>
          <Descriptions.Item label="Nome">{workflow.name}</Descriptions.Item>
          <Descriptions.Item label="Versão">{workflow.version}</Descriptions.Item>
          <Descriptions.Item label="Etapas">{workflow.steps.length}</Descriptions.Item>
          <Descriptions.Item label="Descrição">{workflow.description || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Tabs
          items={[
            {
              key: 'diagram',
              label: 'Diagrama de Fluxo',
              children: (
                <div style={{ paddingTop: 8 }}>
                  <WorkflowDiagram
                    workflow={workflow}
                    height={520}
                    onStepClick={handleStepClick}
                  />
                </div>
              ),
            },
            {
              key: 'list',
              label: 'Lista de Etapas',
              children: (
                <div style={{ paddingTop: 8 }}>
                  {orderedSteps.map((step) => {
                    const responsibles = getResponsibles(step)
                    const metadata = getMetadata(step)
                    const receivesNotification = getReceivesNotification(step)
                    const requiredNotification = getRequiredNotification(step)

                    return (
                      <Card
                        key={step.id}
                        bordered={false}
                        style={{
                          marginBottom: 16,
                          borderRadius: 18,
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
                          borderLeft: step.isInitial
                            ? '5px solid #1677ff'
                            : step.isFinal
                              ? '5px solid #722ed1'
                              : '5px solid #d9d9d9',
                        }}
                        title={
                          <Space wrap>
                            <Text strong style={{ fontSize: 16 }}>
                              {step.orderIndex}. {step.name}
                            </Text>
                            {step.isInitial && <Tag icon={<PlayCircleOutlined />} color="blue">Inicial</Tag>}
                            {step.isFinal && <Tag icon={<StopOutlined />} color="purple">Final</Tag>}
                            {step.slaHours ? (
                              <Tag icon={<ClockCircleOutlined />} color="gold">SLA: {step.slaHours}h</Tag>
                            ) : null}
                          </Space>
                        }
                        extra={
                          <Button
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => handleStepClick(step)}
                          >
                            Editar
                          </Button>
                        }
                      >
                        {step.description && (
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary">{step.description}</Text>
                          </div>
                        )}

                        <Row gutter={[16, 16]}>
                          <Col xs={24} lg={12}>
                            <Card
                              size="small"
                              title={<Space><UserOutlined /><span>Responsáveis</span></Space>}
                              style={{ borderRadius: 12 }}
                            >
                              {responsibles.length > 0 ? (
                                <Space wrap>
                                  {responsibles.map((responsible, index) => (
                                    <Tag key={`${step.id}-resp-${index}`} color="geekblue">
                                      {renderResponsibleName(responsible)}
                                    </Tag>
                                  ))}
                                </Space>
                              ) : (
                                <Text type="secondary">Nenhum responsável definido</Text>
                              )}
                            </Card>
                          </Col>

                          <Col xs={24} lg={12}>
                            <Card
                              size="small"
                              title={<Space><NotificationOutlined /><span>Notificações</span></Space>}
                              style={{ borderRadius: 12 }}
                            >
                              <Space direction="vertical" size={8}>
                                <Space>
                                  {receivesNotification
                                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                  <Text>Recebe notificação: <Text strong>{receivesNotification ? 'Sim' : 'Não'}</Text></Text>
                                </Space>
                                <Space>
                                  {requiredNotification
                                    ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                                    : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                                  <Text>Notificação obrigatória: <Text strong>{requiredNotification ? 'Sim' : 'Não'}</Text></Text>
                                </Space>
                              </Space>
                            </Card>
                          </Col>

                          <Col xs={24}>
                            <Card
                              size="small"
                              title={<Space><FileTextOutlined /><span>Metadados da atividade</span></Space>}
                              style={{ borderRadius: 12 }}
                            >
                              {metadata.length > 0 ? (
                                <List
                                  size="small"
                                  dataSource={metadata}
                                  renderItem={(item, index) => {
                                    const parsed = renderMetadataTag(item)
                                    return (
                                      <List.Item key={`${step.id}-meta-${index}`}>
                                        <Space direction="vertical" size={4} style={{ width: '100%' }}>
                                          <Space wrap>
                                            <Text strong>{parsed.title}</Text>
                                            {parsed.subtitle && <Tag color="default">{parsed.subtitle}</Tag>}
                                            {parsed.required && <Tag color="red">Obrigatório</Tag>}
                                            {parsed.multiple && <Tag color="cyan">Multivalorado</Tag>}
                                          </Space>
                                        </Space>
                                      </List.Item>
                                    )
                                  }}
                                />
                              ) : (
                                <Text type="secondary">Nenhum metadado configurado para esta atividade</Text>
                              )}
                            </Card>
                          </Col>

                          <Col xs={24} lg={12}>
                            <Card size="small" title="Ações permitidas" style={{ borderRadius: 12 }}>
                              {step.allowedActions.length > 0 ? (
                                <Space wrap>
                                  {step.allowedActions.map((action) => (
                                    <Tag key={action} color={getActionColor(action)}>{action}</Tag>
                                  ))}
                                </Space>
                              ) : (
                                <Text type="secondary">Nenhuma ação permitida</Text>
                              )}
                            </Card>
                          </Col>

                          <Col xs={24} lg={12}>
                            <Card size="small" title="Transições" style={{ borderRadius: 12 }}>
                              {step.transitions.length > 0 ? (
                                <Space wrap>
                                  {step.transitions.map((transition, index) => (
                                    <Tag
                                      key={transition.id ?? `${step.id}-transition-${index}`}
                                      color={getActionColor(transition.triggerAction)}
                                    >
                                      {transition.triggerAction} → {transition.toStepName || 'Destino não informado'}
                                    </Tag>
                                  ))}
                                </Space>
                              ) : (
                                <Text type="secondary">Nenhuma transição configurada</Text>
                              )}
                            </Card>
                          </Col>
                        </Row>

                        <Divider style={{ margin: '16px 0 0' }} />
                      </Card>
                    )
                  })}
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Drawer de edição */}
      <StepEditDrawer
        step={selectedStep}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSave={handleStepSave}
      />
    </div>
  )
}
