import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  Col,
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
  BranchesOutlined,
  EyeOutlined,
  SafetyOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import { BpmnEditor } from '../../features/workflows/components/BpmnEditor'
import {
  getWorkflowById,
  upsertWorkflow,
  type WorkflowDefinition,
  type WorkflowPermissions,
  type WorkflowStatus,
  EMPTY_WORKFLOW_PERMISSIONS,
} from '../../features/workflows/storage'
import { PermissionSection } from './WorkflowNew'

const { Title, Text } = Typography

type WorkflowEditFormValues = {
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
    case 'active':
      return 'green'
    case 'draft':
      return 'gold'
    case 'inactive':
      return 'default'
    case 'archived':
      return 'red'
    default:
      return 'default'
  }
}

function getStatusLabel(status: WorkflowStatus) {
  switch (status) {
    case 'active':
      return 'Ativo'
    case 'draft':
      return 'Rascunho'
    case 'inactive':
      return 'Inativo'
    case 'archived':
      return 'Arquivado'
    default:
      return status
  }
}

export function WorkflowEditPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form] = Form.useForm<WorkflowEditFormValues>()

  const [workflow, setWorkflow] = useState<WorkflowDefinition | null>(null)
  const [bpmnXml, setBpmnXml] = useState('')
  const [permissions, setPermissions] = useState<WorkflowPermissions>(EMPTY_WORKFLOW_PERMISSIONS)

  useEffect(() => {
    if (!id) return

    const currentWorkflow = getWorkflowById(id)
    setWorkflow(currentWorkflow)

    if (currentWorkflow) {
      setBpmnXml(currentWorkflow.bpmnXml ?? '')
      setPermissions(currentWorkflow.permissions ?? EMPTY_WORKFLOW_PERMISSIONS)

      form.setFieldsValue({
        name: currentWorkflow.name,
        description: currentWorkflow.description,
        version: currentWorkflow.version,
        status: currentWorkflow.status,
        documentTypeName: currentWorkflow.documentTypeName,
      })
    }
  }, [form, id])

  const stats = useMemo(() => {
    if (!workflow) return null

    return {
      hasDiagram: Boolean(bpmnXml?.trim()),
      stepsCount: workflow.stepsCount ?? 0,
    }
  }, [bpmnXml, workflow])

  const handleSave = async (values: WorkflowEditFormValues) => {
    if (!workflow) return

    const nextWorkflow: WorkflowDefinition = {
      ...workflow,
      name: values.name,
      description: values.description,
      version: values.version,
      status: values.status,
      documentTypeName: values.documentTypeName,
      bpmnXml,
      permissions,
      updatedAt: new Date().toISOString(),
    }

    upsertWorkflow(nextWorkflow)
    setWorkflow(nextWorkflow)
    message.success('Workflow salvo com sucesso.')
    navigate(`/workflows/${workflow.id}`)
  }

  if (!workflow) {
    return (
      <div style={{ padding: 24 }}>
        <Empty description="Workflow não encontrado" />
      </div>
    )
  }

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Space
        style={{
          marginBottom: 20,
          width: '100%',
          justifyContent: 'space-between',
          display: 'flex',
        }}
      >
        <Space>
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate(`/workflows/${workflow.id}`)}
          >
            Voltar
          </Button>

          <div>
            <Title level={3} style={{ margin: 0 }}>
              Editar Workflow
            </Title>
            <Text type="secondary">
              Edição principal do fluxo usando o modelador BPMN.
            </Text>
          </div>
        </Space>

        <Space>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/workflows/${workflow.id}`)}
          >
            Ver detalhes
          </Button>
        </Space>
      </Space>

      {/* Antd 5.x: `message` → `title` */}
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16, borderRadius: 16 }}
        title="Tela oficial de edição"
        description="Nesta versão, a modelagem do processo deve ser feita no BPMN. A antiga edição manual de etapas foi removida para evitar duplicidade de regras."
      />

      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Text type="secondary">Status</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color={getStatusColor(workflow.status)}>
                {getStatusLabel(workflow.status)}
              </Tag>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Text type="secondary">Versão</Text>
            <div style={{ marginTop: 8 }}>
              <Text strong>{workflow.version}</Text>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card variant="borderless" style={{ borderRadius: 18 }}>
            <Text type="secondary">Diagrama</Text>
            <div style={{ marginTop: 8 }}>
              <Space>
                <BranchesOutlined style={{ color: '#1677ff' }} />
                <Text strong>
                  {stats?.hasDiagram ? 'Configurado' : 'Novo diagrama'}
                </Text>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>

      <Tabs
        items={[
          {
            key: 'general',
            label: <Space><BranchesOutlined />Dados do fluxo</Space>,
            children: (
              <Form form={form} layout="vertical" onFinish={handleSave}>
                <Card variant="borderless" style={{ borderRadius: 20, marginBottom: 16 }} title="Dados gerais">
                  <Row gutter={16}>
                    <Col xs={24} md={8}>
                      <Form.Item label="Nome do workflow" name="name"
                        rules={[{ required: true, message: 'Informe o nome do workflow' }]}>
                        <Input id="workflow-edit-name" autoComplete="off" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Form.Item label="Versão" name="version"
                        rules={[{ required: true, message: 'Informe a versão' }]}>
                        <Input id="workflow-edit-version" autoComplete="off" />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={4}>
                      <Form.Item label="Status" name="status"
                        rules={[{ required: true, message: 'Informe o status' }]}>
                        <Select id="workflow-edit-status" options={STATUS_OPTIONS} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={8}>
                      <Form.Item label="Tipo documental" name="documentTypeName">
                        <Input id="workflow-edit-document-type" autoComplete="off" placeholder="Ex.: Contratos" />
                      </Form.Item>
                    </Col>
                    <Col xs={24}>
                      <Form.Item label="Descrição" name="description">
                        <Input.TextArea id="workflow-edit-description" autoComplete="off" rows={3} />
                      </Form.Item>
                    </Col>
                  </Row>
                  <Space>
                    <Button type="primary" htmlType="submit" icon={<SaveOutlined />}>Salvar workflow</Button>
                    <Button onClick={() => navigate(`/workflows/${workflow.id}`)}>Cancelar</Button>
                  </Space>
                </Card>

                <Card variant="borderless" style={{ borderRadius: 20 }} title="Modelador BPMN">
                  <BpmnEditor initialXml={bpmnXml} onChange={setBpmnXml} />
                </Card>
              </Form>
            ),
          },
          {
            key: 'permissions',
            label: <Space><SafetyOutlined />Permissões</Space>,
            children: (
              <Card variant="borderless" style={{ borderRadius: 20 }}>
                <PermissionSection value={permissions} onChange={setPermissions} />
              </Card>
            ),
          },
        ]}
      />
    </div>
  )
}