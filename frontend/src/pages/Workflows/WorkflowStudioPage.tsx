import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  Alert, Badge, Button, Card, Col, Descriptions, Empty, Form, Input,
  Modal, Row, Select, Space, Tabs, Tag, Typography, message,
} from 'antd'
import type { TabsProps } from 'antd'
import {
  ArrowLeftOutlined, BgColorsOutlined, BranchesOutlined, CheckCircleOutlined,
  ClockCircleOutlined, EditOutlined, EyeOutlined, HistoryOutlined,
  MailOutlined, NodeIndexOutlined, PlayCircleOutlined, SaveOutlined,
  SettingOutlined, StopOutlined, ThunderboltOutlined,
} from '@ant-design/icons'

import { BpmnEditor, COLOR_PALETTE, type ColorEntry } from '../../features/workflows/components/BpmnEditor'
import { WorkflowElementConfigPanel } from '../../features/workflows/components/WorkflowElementConfigPanel'
import { WorkflowValidationPanel } from '../../features/workflows/components/WorkflowValidationPanel'
import { WorkflowVersionsPanel } from '../../features/workflows/components/WorkflowVersionsPanel'
import {
  createWorkflowSnapshot, getElementConfig, getElementConfigsByWorkflow,
  getWorkflowById, listWorkflowSnapshots, removeMissingElementConfigs,
  restoreWorkflowSnapshot, upsertElementConfig, upsertWorkflow,
  type WorkflowDefinition, type WorkflowStatus,
} from '../../features/workflows/storage'
import { type BpmnElementSummary, validateWorkflowStudio } from '../../features/workflows/studioValidation'
import { useAuthStore } from '../../store/authStore'

const { Title, Text } = Typography

type WorkflowStudioFormValues = {
  name: string
  description?: string
  version: string
  status: WorkflowStatus
  documentTypeName?: string
}

const STATUS_OPTIONS: Array<{ label: string; value: WorkflowStatus }> = [
  { label: 'Rascunho',  value: 'draft' },
  { label: 'Ativo',     value: 'active' },
  { label: 'Inativo',   value: 'inactive' },
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
    .filter((i) => i.kind !== 'unsupported')
    .map((i) => `${i.kind}:${i.id}`)
    .sort()
    .join('|')
}

// Conta etapas relevantes do fluxo — inclui os novos eventos automáticos
function countWorkflowSteps(elements: BpmnElementSummary[]) {
  return elements.filter((i) =>
    i.kind === 'activity'    ||
    i.kind === 'system-task' ||
    i.kind === 'notification'||
    i.kind === 'message'     ||
    i.kind === 'timer'       ||
    i.kind === 'signal'      ||
    i.kind === 'conditional',
  ).length
}

// Labels para o modal de configuração — inclui os 4 novos kinds
function getElementKindLabel(kind?: BpmnElementSummary['kind']) {
  if (kind === 'start')        return 'Evento inicial'
  if (kind === 'end')          return 'Evento final'
  if (kind === 'activity')     return 'Atividade humana'
  if (kind === 'gateway')      return 'Gateway de decisão'
  if (kind === 'notification') return 'Notificação'
  if (kind === 'system-task')  return 'Tarefa de sistema'
  if (kind === 'flow')         return 'Fluxo de sequência'
  if (kind === 'message')      return 'Evento de Mensagem'
  if (kind === 'timer')        return 'Evento Temporal'
  if (kind === 'signal')       return 'Evento de Sinal'
  if (kind === 'conditional')  return 'Evento Condicional'
  return 'Elemento'
}

// Ícone para cada kind no header do modal
function ElementKindIcon({ kind }: { kind?: BpmnElementSummary['kind'] }) {
  if (kind === 'start')        return <PlayCircleOutlined />
  if (kind === 'end')          return <StopOutlined />
  if (kind === 'activity')     return <EditOutlined />
  if (kind === 'gateway')      return <BranchesOutlined />
  if (kind === 'notification') return <ThunderboltOutlined />
  if (kind === 'system-task')  return <SettingOutlined />
  if (kind === 'flow')         return <NodeIndexOutlined />
  if (kind === 'message')      return <MailOutlined />
  if (kind === 'timer')        return <ClockCircleOutlined />
  if (kind === 'signal')       return <ThunderboltOutlined />
  if (kind === 'conditional')  return <BranchesOutlined />
  return <EditOutlined />
}

function ColorPaletteTab({
  selectedElement,
  onApplyColor,
}: {
  selectedElement: BpmnElementSummary | null
  onApplyColor: (entry: ColorEntry) => void
}) {
  if (!selectedElement) return <Empty description="Selecione um elemento para alterar a cor" />
  return (
    <div style={{ padding: 20 }}>
      <Alert
        type="info" showIcon style={{ marginBottom: 16 }}
        message={selectedElement.name || selectedElement.id}
        description="Escolha uma cor para aplicar ao elemento selecionado no diagrama."
      />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 12 }}>
        {COLOR_PALETTE.map((entry) => (
          <button
            key={entry.label} type="button" onClick={() => onApplyColor(entry)}
            style={{ border: '1px solid #e5e7eb', borderRadius: 12, background: '#fff', padding: 12, textAlign: 'left', cursor: 'pointer' }}
          >
            <div style={{ width: '100%', height: 44, borderRadius: 8, background: entry.fill, border: `2px solid ${entry.stroke}`, marginBottom: 8 }} />
            <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{entry.label}</div>
            <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>Fill: {entry.fill}</div>
            <div style={{ fontSize: 11, color: '#64748b' }}>Stroke: {entry.stroke}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export function WorkflowStudioPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [form] = Form.useForm<WorkflowStudioFormValues>()

  const processId = searchParams.get('processId') ?? undefined
  const backPath  = processId ? `/processes/${processId}` : '/workflows'

  const user      = useAuthStore((s) => s.user)
  const accountId = (user as any)?.accountId ?? (user as any)?.tenantId ?? ''

  const [workflow, setWorkflow]                 = useState<WorkflowDefinition | null>(null)
  const [elements, setElements]                 = useState<BpmnElementSummary[]>([])
  const [selectedElement, setSelectedElement]   = useState<BpmnElementSummary | null>(null)
  const [configsVersion, setConfigsVersion]     = useState(0)
  const [configModalOpen, setConfigModalOpen]   = useState(false)
  const [elementNameInput, setElementNameInput] = useState('')
  const [modalTabKey, setModalTabKey]           = useState<'config' | 'colors'>('config')

  const bpmnRenameRef           = useRef<((id: string, name: string) => void) | null>(null)
  const bpmnColorRef            = useRef<((id: string, color: ColorEntry) => void) | null>(null)
  const lastElementSignatureRef = useRef('')

  useEffect(() => {
    if (!id) return
    const currentWorkflow = getWorkflowById(id)
    if (!currentWorkflow) { setWorkflow(null); return }
    setWorkflow(currentWorkflow)
    form.setFieldsValue({
      name: currentWorkflow.name, description: currentWorkflow.description,
      version: currentWorkflow.version, status: currentWorkflow.status,
      documentTypeName: currentWorkflow.documentTypeName,
    })
  }, [form, id])

  const elementConfigs = useMemo(() => {
    if (!workflow) return []
    return getElementConfigsByWorkflow(workflow.id)
  }, [workflow, configsVersion])

  const currentElementConfig = useMemo(() => {
    if (!workflow || !selectedElement) return null
    return getElementConfig(workflow.id, selectedElement.id)
  }, [workflow, selectedElement, configsVersion])

  const snapshots = useMemo(() => {
    if (!workflow) return []
    return listWorkflowSnapshots(workflow.id)
  }, [workflow, configsVersion])

  const validation = useMemo(() => {
    if (!workflow) return {
      issues: [],
      summary: { totalRelevantElements: 0, configuredRelevantElements: 0, errors: 0, warnings: 0, readinessPercent: 0 },
    }
    return validateWorkflowStudio(workflow, elements, elementConfigs)
  }, [workflow, elements, elementConfigs])

  useEffect(() => {
    if (!workflow) return
    const timer = window.setTimeout(() => {
      upsertWorkflow({ ...workflow, stepsCount: countWorkflowSteps(elements) })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [workflow, elements])

  const scopeContext = useMemo(() => ({
    accountId:   workflow?.accountId   ?? accountId,
    accountName: workflow?.accountName,
    scopeLevel:  workflow?.scopeLevel  ?? 'process' as const,
    processId:   workflow?.processId   ?? processId ?? null,
    processName: workflow?.processName ?? null,
    tenantId:    workflow?.tenantId    ?? accountId,
  }), [workflow, accountId, processId])

  if (!workflow) return <div style={{ padding: 24 }}><Empty description="Workflow não encontrado" /></div>

  const openElementModal = (element: BpmnElementSummary | null, initialTab: 'config' | 'colors' = 'config') => {
    if (!element?.isConfigurable) return
    setSelectedElement(element)
    setElementNameInput(element.name || '')
    setModalTabKey(initialTab)
    setConfigModalOpen(true)
  }

  const handleSaveNow = () => {
    const nextWorkflow: WorkflowDefinition = {
      ...workflow, stepsCount: countWorkflowSteps(elements), updatedAt: new Date().toISOString(),
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
      ...workflow, status: 'active',
      publishedAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      stepsCount: countWorkflowSteps(elements),
    }
    upsertWorkflow(nextWorkflow)
    setWorkflow(nextWorkflow)
    createWorkflowSnapshot({
      workflow: nextWorkflow, elementConfigs,
      versionLabel: `Publicação ${nextWorkflow.version}`,
      note: 'Snapshot criado na publicação.',
    })
    setConfigsVersion((prev) => prev + 1)
    message.success('Workflow publicado com sucesso.')
  }

  const handleCreateSnapshot = () => {
    createWorkflowSnapshot({
      workflow, elementConfigs,
      versionLabel: `${workflow.version} - ${new Date().toLocaleString()}`,
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
      name: restoredWorkflow.name, description: restoredWorkflow.description,
      version: restoredWorkflow.version, status: restoredWorkflow.status,
      documentTypeName: restoredWorkflow.documentTypeName,
    })
    setConfigsVersion((prev) => prev + 1)
    message.success('Snapshot restaurado com sucesso.')
  }

  const applySelectedElementColor = (entry: ColorEntry) => {
    if (!selectedElement) return
    bpmnColorRef.current?.(selectedElement.id, entry)
    message.success(`Cor "${entry.label}" aplicada.`)
  }

  const modalItems: TabsProps['items'] = [
    {
      key: 'config',
      label: <Space size={6}><EditOutlined /><span>Configuração</span></Space>,
      children: (
        <div style={{ padding: '0 4px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          <WorkflowElementConfigPanel
            workflowId={workflow.id}
            bpmnXml={workflow.bpmnXml ?? ''}
            selectedElement={selectedElement}
            initialConfig={currentElementConfig}
            elementConfigs={elementConfigs}
            scopeContext={scopeContext}
            onSave={(values) => {
              let nextValues = values
              const finalName = elementNameInput.trim()
              if (selectedElement && finalName && finalName !== selectedElement.name) {
                bpmnRenameRef.current?.(selectedElement.id, finalName)
                nextValues = { ...nextValues, elementName: finalName }
              }
              upsertElementConfig(nextValues)
              setConfigsVersion((prev) => prev + 1)
              setConfigModalOpen(false)
              message.success('Configuração salva.')
            }}
          />
        </div>
      ),
    },
    {
      key: 'colors',
      label: <Space size={6}><BgColorsOutlined /><span>Cores</span></Space>,
      children: <ColorPaletteTab selectedElement={selectedElement} onApplyColor={applySelectedElementColor} />,
    },
  ]

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Space style={{ width: '100%', display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate(backPath)}>
            {processId ? 'Voltar ao processo' : 'Voltar'}
          </Button>
          <div>
            <Title level={3} style={{ margin: 0 }}>Workflow Studio</Title>
            <Text type="secondary">Modelagem BPMN, configuração operacional, validação e versionamento.</Text>
          </div>
        </Space>
        <Space wrap>
          <Button icon={<EyeOutlined />}          onClick={() => navigate(`/workflows/${workflow.id}`)}>Ver detalhes</Button>
          <Button icon={<HistoryOutlined />}       onClick={handleCreateSnapshot}>Snapshot</Button>
          <Button icon={<SaveOutlined />}          onClick={handleSaveNow}>Salvar</Button>
          <Button type="primary" icon={<CheckCircleOutlined />} onClick={handlePublish}>Publicar</Button>
        </Space>
      </Space>

      <Alert
        type="info" showIcon style={{ marginBottom: 16, borderRadius: 16 }}
        message="Workflow Studio"
        description="Clique para selecionar um elemento e dê duplo clique para abrir o modal de configuração."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} lg={8}>
          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Descriptions column={1} size="small" title="Status do workflow">
              <Descriptions.Item label="Situação">
                <Tag color={getStatusColor(workflow.status)}>{workflow.status}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Versão"><Tag color="blue">{workflow.version}</Tag></Descriptions.Item>
              <Descriptions.Item label="Elementos relevantes">{validation.summary.totalRelevantElements}</Descriptions.Item>
              <Descriptions.Item label="Elementos configurados">{validation.summary.configuredRelevantElements}</Descriptions.Item>
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
                  prev ? {
                    ...prev,
                    name: values.name ?? prev.name,
                    description: values.description,
                    version: values.version ?? prev.version,
                    status: values.status ?? prev.status,
                    documentTypeName: values.documentTypeName,
                    updatedAt: new Date().toISOString(),
                  } : prev,
                )
              }}
            >
              <Row gutter={16}>
                <Col xs={24} md={8}>
                  <Form.Item label="Nome do workflow" name="name" rules={[{ required: true }]}>
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
                    <Input.TextArea id="workflow-studio-description" autoComplete="off" rows={2} />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>
      </Row>

      <Card
        variant="borderless"
        style={{ borderRadius: 20 }}
        title={<Space><EditOutlined /><span>Modelador BPMN</span></Space>}
        extra={
          <Space>
            <Button
              size="small"
              onClick={() => openElementModal(selectedElement, 'config')}
              disabled={!selectedElement?.isConfigurable}
            >
              {selectedElement?.isConfigurable
                ? `Configurar: ${selectedElement.name || selectedElement.id}`
                : 'Selecione um elemento'}
            </Button>
            <Button
              size="small" icon={<BgColorsOutlined />}
              onClick={() => openElementModal(selectedElement, 'colors')}
              disabled={!selectedElement?.isConfigurable}
            >
              Cores
            </Button>
          </Space>
        }
      >
        <BpmnEditor
          renameRef={bpmnRenameRef}
          colorRef={bpmnColorRef}
          initialXml={workflow.bpmnXml}
          onChange={(xml) => {
            setWorkflow((prev) => {
              if (!prev || prev.bpmnXml === xml) return prev
              return { ...prev, bpmnXml: xml, updatedAt: new Date().toISOString() }
            })
          }}
          onSelectionChange={(el) => { setSelectedElement(el); setElementNameInput(el?.name || '') }}
          onElementDoubleClick={(el) => openElementModal(el, 'config')}
          onElementsChange={(nextElements) => {
            setElements(nextElements)
            if (selectedElement && !nextElements.some((i) => i.id === selectedElement.id)) {
              setSelectedElement(null)
              setConfigModalOpen(false)
            }
            const nextSignature = buildSupportedElementSignature(nextElements)
            if (nextSignature === lastElementSignatureRef.current) return
            lastElementSignatureRef.current = nextSignature
            removeMissingElementConfigs(
              workflow.id,
              nextElements.filter((i) => i.kind !== 'unsupported').map((i) => i.id),
            )
            setConfigsVersion((prev) => prev + 1)
          }}
        />
      </Card>

      <Tabs
        style={{ marginTop: 16 }}
        items={[
          { key: 'validation', label: 'Validação', children: <WorkflowValidationPanel validation={validation} /> },
          { key: 'versions',   label: 'Versões',   children: <WorkflowVersionsPanel snapshots={snapshots} onCreateSnapshot={handleCreateSnapshot} onRestoreSnapshot={handleRestoreSnapshot} /> },
        ]}
      />

      {/* ── Modal de configuração do elemento ─────────────────────────────────── */}
      <Modal
        open={configModalOpen}
        onCancel={() => setConfigModalOpen(false)}
        footer={null}
        width={760}
        destroyOnClose={false}
        closeIcon={null}
        styles={{
          container: { padding: 0, borderRadius: 20, overflow: 'hidden' },
          body: { padding: 0 },
        }}
        title={null}
      >
        {selectedElement && (
          <>
            {/* Header do modal */}
            <div style={{
              background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
              padding: '24px 28px 20px', position: 'relative', overflow: 'hidden',
            }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -20, right: 60, width: 80, height: 80, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }} />

              <Space style={{ width: '100%', justifyContent: 'space-between' }} align="start">
                <Space align="center" size={14}>
                  {/* Ícone do kind — cobre todos os 11 kinds */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12,
                    background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.15)',
                    display: 'grid', placeItems: 'center', fontSize: 20, color: '#fff', flexShrink: 0,
                  }}>
                    <ElementKindIcon kind={selectedElement.kind} />
                  </div>

                  <div>
                    <Input
                      value={elementNameInput}
                      onChange={(e) => setElementNameInput(e.target.value)}
                      onBlur={(e) => {
                        const newName = e.target.value.trim()
                        if (newName && newName !== selectedElement.name) {
                          bpmnRenameRef.current?.(selectedElement.id, newName)
                          setSelectedElement((prev) => prev ? { ...prev, name: newName } : prev)
                        }
                      }}
                      onPressEnter={(e) => {
                        const newName = (e.target as HTMLInputElement).value.trim()
                        if (newName && newName !== selectedElement.name) {
                          bpmnRenameRef.current?.(selectedElement.id, newName)
                          setSelectedElement((prev) => prev ? { ...prev, name: newName } : prev)
                        }
                        ;(e.target as HTMLInputElement).blur()
                      }}
                      placeholder="Nome do elemento..."
                      variant="borderless"
                      style={{
                        color: '#fff', fontSize: 17, fontWeight: 700, padding: '0 4px',
                        background: 'rgba(255,255,255,0.07)', borderRadius: 8,
                        border: '1px solid rgba(255,255,255,0.15)',
                        maxWidth: 420, width: 420, caretColor: '#fff',
                      }}
                    />

                    <Space size={6} style={{ marginTop: 6 }}>
                      <Tag style={{
                        margin: 0, background: 'rgba(255,255,255,0.12)',
                        border: '1px solid rgba(255,255,255,0.20)', color: '#e2e8f0',
                        borderRadius: 6, fontSize: 11, padding: '0 8px',
                      }}>
                        {getElementKindLabel(selectedElement.kind)}
                      </Tag>
                      <Tag style={{
                        margin: 0, background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8',
                        borderRadius: 6, fontSize: 11, padding: '0 8px',
                      }}>
                        {selectedElement.id}
                      </Tag>
                      {currentElementConfig
                        ? <Badge status="success" text={<span style={{ color: '#86efac', fontSize: 11 }}>Configurado</span>} />
                        : <Badge status="warning" text={<span style={{ color: '#fbbf24', fontSize: 11 }}>Sem configuração</span>} />}
                    </Space>
                  </div>
                </Space>

                <Button
                  type="text" size="small"
                  onClick={() => setConfigModalOpen(false)}
                  style={{ color: 'rgba(255,255,255,0.5)', fontSize: 18, lineHeight: 1, padding: '4px 8px', marginTop: -2 }}
                >
                  ✕
                </Button>
              </Space>
            </div>

            <Tabs
              activeKey={modalTabKey}
              onChange={(key) => setModalTabKey(key as 'config' | 'colors')}
              items={modalItems}
              tabBarStyle={{
                margin: 0, paddingLeft: 20, paddingRight: 20,
                borderBottom: '1px solid #f1f5f9', background: '#fafbfc',
              }}
            />
          </>
        )}
      </Modal>
    </div>
  )
}