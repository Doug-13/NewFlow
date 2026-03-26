import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Form,
  Input,
  Row,
  Select,
  Space,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  EditOutlined,
  EyeOutlined,
  HistoryOutlined,
  SaveOutlined,
} from '@ant-design/icons'

import { BpmnEditor } from '../../features/workflows/components/BpmnEditor'
import { WorkflowElementConfigPanel } from '../../features/workflows/components/WorkflowElementConfigPanel'
import { WorkflowValidationPanel } from '../../features/workflows/components/WorkflowValidationPanel'
import { WorkflowVersionsPanel } from '../../features/workflows/components/WorkflowVersionsPanel'
import {
  createWorkflowSnapshot,
  getWorkflowById,
  listWorkflowSnapshots,
  restoreWorkflowSnapshot,
  upsertWorkflow,
  type WorkflowActivityConfig,
  type WorkflowDefinition,
  type WorkflowElementConfig,
  type WorkflowStatus,
} from '../../features/workflows/storage'
import {
  type BpmnElementSummary,
  validateWorkflowStudio,
} from '../../features/workflows/studioValidation'

const { Title, Text } = Typography

type WorkflowStudioFormValues = {
  name: string
  description?: string
  version: string
  status: WorkflowStatus
  documentTypeName?: string
}

const STATUS_OPTIONS: Array<{ label: string; value: WorkflowStatus }> = [
  { label: 'Rascunho', value: 'draft' },
  { label: 'Ativo', value: 'active' },
  { label: 'Inativo', value: 'inactive' },
  { label: 'Arquivado', value: 'archived' },
]

function getStatusColor(status: WorkflowStatus) {
  switch (status) {
    case 'active':   return 'green'
    case 'draft':    return 'gold'
    case 'inactive': return 'default'
    case 'archived': return 'red'
    default:         return 'default'
  }
}

function buildSupportedElementSignature(elements: BpmnElementSummary[]) {
  return elements
    .filter((item) => item.kind !== 'unsupported')
    .map((item) => `${item.kind}:${item.id}`)
    .sort()
    .join('|')
}

// ─── LocalStorage helpers ─────────────────────────────────────────────────────

function readElementConfigsStorage(): WorkflowElementConfig[] {
  try {
    const raw = window.localStorage.getItem('workflow-element-configs')
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as WorkflowElementConfig[]) : []
  } catch {
    return []
  }
}

function writeElementConfigsStorage(configs: WorkflowElementConfig[]) {
  window.localStorage.setItem('workflow-element-configs', JSON.stringify(configs))
}

function getElementConfigsByWorkflow(workflowId: string): WorkflowElementConfig[] {
  return readElementConfigsStorage().filter((item) => item.workflowId === workflowId)
}

function getElementConfig(
  workflowId: string,
  elementId: string,
): WorkflowElementConfig | null {
  return (
    readElementConfigsStorage().find(
      (item) => item.workflowId === workflowId && item.elementId === elementId,
    ) ?? null
  )
}

function upsertElementConfig(
  values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
) {
  const current = readElementConfigsStorage()
  const index = current.findIndex(
    (item) =>
      item.workflowId === values.workflowId &&
      item.elementId === values.elementId,
  )

  const now = new Date().toISOString()

  const nextItem: WorkflowElementConfig =
    index >= 0
      ? { ...current[index], ...values, updatedAt: now }
      : { ...values, id: crypto.randomUUID(), createdAt: now, updatedAt: now }

  const nextConfigs = [...current]
  if (index >= 0) {
    nextConfigs[index] = nextItem
  } else {
    nextConfigs.push(nextItem)
  }

  writeElementConfigsStorage(nextConfigs)
  return nextItem
}

function removeMissingElementConfigs(
  workflowId: string,
  validElementIds: string[],
) {
  const validIdsSet = new Set(validElementIds)
  const nextConfigs = readElementConfigsStorage().filter((item) => {
    if (item.workflowId !== workflowId) return true
    return validIdsSet.has(item.elementId)
  })
  writeElementConfigsStorage(nextConfigs)
}

function mapElementConfigToActivityConfig(
  item: WorkflowElementConfig,
): WorkflowActivityConfig | null {
  if (item.kind !== 'activity') return null

  const config = item.config as Omit<
    WorkflowActivityConfig,
    'id' | 'workflowId' | 'elementId' | 'elementType' | 'elementName' | 'createdAt' | 'updatedAt'
  >

  return {
    id: item.id,
    workflowId: item.workflowId,
    elementId: item.elementId,
    elementType: item.elementType,
    elementName: item.elementName,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    ...config,
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function WorkflowStudioPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm<WorkflowStudioFormValues>()

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)
  const [elements, setElements] = useState<BpmnElementSummary[]>([])
  const [selectedElement, setSelectedElement] = useState<BpmnElementSummary | null>(null)
  const [configsVersion, setConfigsVersion] = useState(0)

  const lastElementSignatureRef = useRef('')

  useEffect(() => {
    if (!id) return
    const currentWorkflow = getWorkflowById(id)
    if (!currentWorkflow) { setWorkflow(null); return }
    setWorkflow(currentWorkflow)
    form.setFieldsValue({
      name: currentWorkflow.name,
      description: currentWorkflow.description,
      version: currentWorkflow.version,
      status: currentWorkflow.status,
      documentTypeName: currentWorkflow.documentTypeName,
    })
  }, [form, id])

  const elementConfigs = useMemo(() => {
    if (!workflow) return []
    return getElementConfigsByWorkflow(workflow.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow, configsVersion])

  const activityConfigs = useMemo<WorkflowActivityConfig[]>(() => {
    return elementConfigs
      .map(mapElementConfigToActivityConfig)
      .filter((item): item is WorkflowActivityConfig => item !== null)
  }, [elementConfigs])

  const currentElementConfig = useMemo(() => {
    if (!workflow || !selectedElement) return null
    return getElementConfig(workflow.id, selectedElement.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow, selectedElement, configsVersion])

  const snapshots = useMemo(() => {
    if (!workflow) return []
    return listWorkflowSnapshots(workflow.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflow, configsVersion])

  const validation = useMemo(() => {
    if (!workflow) {
      return {
        issues: [],
        summary: {
          totalRelevantElements: 0,
          configuredRelevantElements: 0,
          errors: 0,
          warnings: 0,
          readinessPercent: 0,
        },
      }
    }
    return validateWorkflowStudio(workflow, elements, elementConfigs)
  }, [workflow, elements, elementConfigs])

  // Auto-save stepsCount
  useEffect(() => {
    if (!workflow) return
    const timer = window.setTimeout(() => {
      upsertWorkflow({
        ...workflow,
        stepsCount: elements.filter((item) => item.kind === 'activity').length,
      })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [workflow, elements])

  if (!workflow) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Workflow não encontrado" />
      </div>
    )
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleSaveNow = () => {
    const nextWorkflow: WorkflowDefinition = {
      ...workflow,
      stepsCount: elements.filter((item) => item.kind === 'activity').length,
      updatedAt: new Date().toISOString(),
    }
    upsertWorkflow(nextWorkflow)
    setWorkflow(nextWorkflow)
    message.success('Workflow salvo com sucesso.')
  }

  const handlePublish = () => {
    if (validation.summary.errors > 0) {
      message.error('Resolva os erros de validação antes de publicar.')
      return
    }

    const nextWorkflow: WorkflowDefinition = {
      ...workflow,
      status: 'active',
      publishedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      stepsCount: elements.filter((item) => item.kind === 'activity').length,
    }

    upsertWorkflow(nextWorkflow)
    setWorkflow(nextWorkflow)

    createWorkflowSnapshot({
      workflow: nextWorkflow,
      activityConfigs,
      versionLabel: `Publicação ${nextWorkflow.version}`,
      note: 'Snapshot criado na publicação.',
    })

    setConfigsVersion((prev) => prev + 1)
    message.success('Workflow publicado com sucesso.')
  }

  const handleCreateSnapshot = () => {
    const versionLabel = `${workflow.version} - ${new Date().toLocaleString()}`
    createWorkflowSnapshot({
      workflow,
      activityConfigs,
      versionLabel,
      note: 'Snapshot manual do Workflow Studio.',
    })
    setConfigsVersion((prev) => prev + 1)
    message.success('Snapshot criado com sucesso.')
  }

  const handleRestoreSnapshot = (snapshotId: string) => {
    const restored = restoreWorkflowSnapshot(snapshotId)
    if (!restored) { message.error('Não foi possível restaurar o snapshot.'); return }

    const restoredWorkflow = getWorkflowById(workflow.id)
    if (!restoredWorkflow) { message.error('Workflow não encontrado após restauração.'); return }

    setWorkflow(restoredWorkflow)
    form.setFieldsValue({
      name: restoredWorkflow.name,
      description: restoredWorkflow.description,
      version: restoredWorkflow.version,
      status: restoredWorkflow.status,
      documentTypeName: restoredWorkflow.documentTypeName,
    })
    setConfigsVersion((prev) => prev + 1)
    message.success('Snapshot restaurado com sucesso.')
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      {/* Header */}
      <Space
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: 20,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/workflows')}>
            Voltar
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>Workflow Studio</Title>
            <Text type="secondary">
              Modelagem BPMN, configuração operacional, validação e versionamento.
            </Text>
          </div>
        </Space>

        <Space wrap>
          <Button icon={<EyeOutlined />} onClick={() => navigate(`/workflows/${workflow.id}`)}>
            Ver detalhes
          </Button>
          <Button icon={<HistoryOutlined />} onClick={handleCreateSnapshot}>
            Snapshot
          </Button>
          <Button icon={<SaveOutlined />} onClick={handleSaveNow}>
            Salvar
          </Button>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={handlePublish}>
            Publicar
          </Button>
        </Space>
      </Space>

      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 16 }}
        title="Workflow Studio"
        description="Nesta tela o BPMN desenha o processo e cada elemento relevante recebe sua própria configuração operacional."
      />

      {/* Status + form row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Descriptions column={1} size="small" title="Status do workflow">
              <Descriptions.Item label="Situação">
                <Tag color={getStatusColor(workflow.status)}>{workflow.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Versão">
                <Tag color="blue">{workflow.version}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Elementos relevantes">
                {validation.summary.totalRelevantElements}
              </Descriptions.Item>
              <Descriptions.Item label="Elementos configurados">
                {validation.summary.configuredRelevantElements}
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card variant="borderless" style={{ borderRadius: 18 }} title="Dados gerais">
            <Form<WorkflowStudioFormValues>
              form={form}
              layout="vertical"
              onValuesChange={(_, values) => {
                setWorkflow((prev) =>
                  prev
                    ? {
                        ...prev,
                        name: values.name ?? prev.name,
                        description: values.description,
                        version: values.version ?? prev.version,
                        status: values.status ?? prev.status,
                        documentTypeName: values.documentTypeName,
                        updatedAt: new Date().toISOString(),
                      }
                    : prev,
                )
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item
                    label="Nome do workflow"
                    name="name"
                    rules={[{ required: true, message: 'Informe o nome do workflow' }]}
                  >
                    <Input id="workflow-studio-name" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item label="Versão" name="version">
                    <Input id="workflow-studio-version" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24} md={4}>
                  <Form.Item label="Status" name="status">
                    <Select id="workflow-studio-status" options={STATUS_OPTIONS} />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item label="Tipo documental" name="documentTypeName">
                    <Input id="workflow-studio-document-type" autoComplete="off" />
                  </Form.Item>
                </Col>
                <Col xs={24}>
                  <Form.Item label="Descrição" name="description">
                    <Input.TextArea
                      id="workflow-studio-description"
                      autoComplete="off"
                      rows={2}
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* BPMN + config panels */}
      <Row gutter={[16, 16]}>
        <Col xs={24} xl={16}>
          <Card
            variant="borderless"
            style={{ borderRadius: 20 }}
            title={
              <Space>
                <EditOutlined />
                <span>Modelador BPMN</span>
              </Space>
            }
          >
            <BpmnEditor
              initialXml={workflow.bpmnXml}
              onChange={(xml) => {
                setWorkflow((prev) => {
                  if (!prev) return prev
                  if (prev.bpmnXml === xml) return prev
                  return { ...prev, bpmnXml: xml, updatedAt: new Date().toISOString() }
                })
              }}
              onSelectionChange={setSelectedElement}
              onElementsChange={(nextElements) => {
                setElements(nextElements)

                if (
                  selectedElement &&
                  !nextElements.some((item) => item.id === selectedElement.id)
                ) {
                  setSelectedElement(null)
                }

                const nextSignature = buildSupportedElementSignature(nextElements)
                if (nextSignature === lastElementSignatureRef.current) return
                lastElementSignatureRef.current = nextSignature

                removeMissingElementConfigs(
                  workflow.id,
                  nextElements
                    .filter((item) => item.kind !== 'unsupported')
                    .map((item) => item.id),
                )
                setConfigsVersion((prev) => prev + 1)
              }}
            />
          </Card>
        </Col>

        <Col xs={24} xl={8}>
          <Tabs
            defaultActiveKey="element"
            items={[
              {
                key: 'element',
                label: 'Elemento',
                children: (
                  <WorkflowElementConfigPanel
                    workflowId={workflow.id}
                    bpmnXml={workflow.bpmnXml ?? ''}
                    selectedElement={selectedElement}
                    initialConfig={currentElementConfig}
                    elementConfigs={elementConfigs}
                    onSave={(
                      values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
                    ) => {
                      upsertElementConfig(values)
                      setConfigsVersion((prev) => prev + 1)
                      message.success('Configuração do elemento salva.')
                    }}
                  />
                ),
              },
              {
                key: 'validation',
                label: 'Validação',
                children: <WorkflowValidationPanel validation={validation} />,
              },
              {
                key: 'versions',
                label: 'Versões',
                children: (
                  <WorkflowVersionsPanel
                    snapshots={snapshots}
                    onCreateSnapshot={handleCreateSnapshot}
                    onRestoreSnapshot={handleRestoreSnapshot}
                  />
                ),
              },
            ]}
          />
        </Col>
      </Row>
    </div>
  )
}