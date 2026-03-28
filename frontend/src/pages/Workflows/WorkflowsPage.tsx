import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Button,
  Card,
  Empty,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  SearchOutlined,
} from '@ant-design/icons'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { Title, Text } = Typography

type WorkflowStatus = 'draft' | 'active' | 'inactive' | 'archived'

type WorkflowListItem = {
  id: string
  name: string
  description?: string
  documentTypeId?: string
  documentTypeName?: string
  version?: string
  status: WorkflowStatus
  stepsCount?: number
  updatedAt: string
  createdAt?: string
}

const STORAGE_KEY = 'gestao-docs:workflows'

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

function safeParseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback

  try {
    return JSON.parse(value) as T
  } catch {
    return fallback
  }
}

function normalizeWorkflow(item: any): WorkflowListItem {
  return {
    id: String(item?.id ?? crypto.randomUUID()),
    name: String(item?.name ?? item?.title ?? 'Workflow sem nome'),
    description:
      typeof item?.description === 'string' ? item.description : undefined,
    documentTypeId:
      typeof item?.documentTypeId === 'string' ? item.documentTypeId : undefined,
    documentTypeName:
      typeof item?.documentTypeName === 'string'
        ? item.documentTypeName
        : typeof item?.documentType === 'string'
          ? item.documentType
          : undefined,
    version:
      typeof item?.version === 'string'
        ? item.version
        : typeof item?.revision === 'string'
          ? item.revision
          : '1.0',
    status:
      item?.status === 'active' ||
      item?.status === 'draft' ||
      item?.status === 'inactive' ||
      item?.status === 'archived'
        ? item.status
        : 'draft',
    stepsCount:
      typeof item?.stepsCount === 'number'
        ? item.stepsCount
        : Array.isArray(item?.steps)
          ? item.steps.length
          : Array.isArray(item?.nodes)
            ? item.nodes.length
            : 0,
    updatedAt:
      typeof item?.updatedAt === 'string'
        ? item.updatedAt
        : new Date().toISOString(),
    createdAt:
      typeof item?.createdAt === 'string' ? item.createdAt : undefined,
  }
}

function loadWorkflows(): WorkflowListItem[] {
  const raw = safeParseJson<any[]>(localStorage.getItem(STORAGE_KEY), [])

  if (!Array.isArray(raw)) return []

  return raw.map(normalizeWorkflow)
}

function saveWorkflows(items: WorkflowListItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function seedWorkflowsIfEmpty() {
  const current = loadWorkflows()
  if (current.length > 0) return

  const seed: WorkflowListItem[] = [
    {
      id: crypto.randomUUID(),
      name: 'Fluxo de Contratos',
      description: 'Aprovação e revisão documental de contratos.',
      documentTypeId: 'doc-type-contracts',
      documentTypeName: 'Contratos',
      version: '1.0',
      status: 'active',
      stepsCount: 6,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: crypto.randomUUID(),
      name: 'Fluxo de Procedimentos',
      description: 'Criação, revisão e aprovação de procedimentos internos.',
      documentTypeId: 'doc-type-procedures',
      documentTypeName: 'Procedimentos',
      version: '0.1',
      status: 'draft',
      stepsCount: 4,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ]

  saveWorkflows(seed)
}

export function WorkflowsPage({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [items, setItems] = useState<WorkflowListItem[]>([])

  useEffect(() => {
    seedWorkflowsIfEmpty()
    setItems(loadWorkflows())
    setLoading(false)
  }, [])

  const filteredItems = useMemo(() => {
    const term = search.trim().toLowerCase()

    if (!term) return items

    return items.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        (item.description ?? '').toLowerCase().includes(term) ||
        (item.documentTypeName ?? '').toLowerCase().includes(term) ||
        item.status.toLowerCase().includes(term) ||
        (item.version ?? '').toLowerCase().includes(term)
      )
    })
  }, [items, search])

  const handleDelete = (workflow: WorkflowListItem) => {
    Modal.confirm({
      title: 'Excluir workflow',
      content: `Deseja realmente excluir o workflow "${workflow.name}"?`,
      okText: 'Excluir',
      okButtonProps: { danger: true },
      cancelText: 'Cancelar',
      onOk: () => {
        const nextItems = items.filter((item) => item.id !== workflow.id)
        setItems(nextItems)
        saveWorkflows(nextItems)
        message.success('Workflow excluído com sucesso.')
      },
    })
  }

  const columns: ColumnsType<WorkflowListItem> = [
    {
      title: 'Workflow',
      dataIndex: 'name',
      key: 'name',
      render: (_, record) => (
        <div>
          <div style={{ fontWeight: 600 }}>{record.name}</div>
          <Text type="secondary">
            {record.description || 'Sem descrição informada'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Tipo documental',
      dataIndex: 'documentTypeName',
      key: 'documentTypeName',
      width: 180,
      render: (value?: string) =>
        value ? <Tag>{value}</Tag> : <Text type="secondary">Não vinculado</Text>,
    },
    {
      title: 'Versão',
      dataIndex: 'version',
      key: 'version',
      width: 100,
      render: (value?: string) => value ?? '-',
    },
    {
      title: 'Etapas',
      dataIndex: 'stepsCount',
      key: 'stepsCount',
      width: 100,
      render: (value?: number) => value ?? 0,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (value: WorkflowStatus) => (
        <Tag color={getStatusColor(value)}>{getStatusLabel(value)}</Tag>
      ),
    },
    {
      title: 'Atualizado em',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      width: 180,
      render: (value: string) => {
        try {
          return format(new Date(value), "dd/MM/yyyy 'às' HH:mm", {
            locale: ptBR,
          })
        } catch {
          return value
        }
      },
    },
    {
      title: 'Ações',
      key: 'actions',
      width: 220,
      fixed: 'right',
      render: (_, record) => (
        <Space wrap>
          <Button
            icon={<EyeOutlined />}
            onClick={() => navigate(`/workflows/${record.id}`)}
          >
            Visualizar
          </Button>

          <Button
            icon={<EditOutlined />}
            onClick={() => navigate(`/workflows/${record.id}/studio`)}
          >
            Studio
          </Button>

          <Button
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(record)}
          >
            Excluir
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card bordered={false}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            flexWrap: 'wrap',
            alignItems: 'flex-start',
          }}
        >
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Workflows
            </Title>

            <Text type="secondary">
              Gerencie os fluxos e edite tudo em um único Workflow Studio.
            </Text>
          </div>

          <Space wrap>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => navigate('/workflows/new')}
            >
              Novo workflow
            </Button>
          </Space>
        </div>
      </Card>

      <Card bordered={false}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <Input
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar workflow por nome, descrição, tipo ou status"
              prefix={<SearchOutlined />}
              style={{ maxWidth: 420 }}
            />

            <Space wrap>
              <Button onClick={() => navigate('/workflows/new')}>
                Criar no Studio
              </Button>
            </Space>
          </div>

          <Table<WorkflowListItem>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={filteredItems}
            scroll={{ x: 1200 }}
            locale={{
              emptyText: <Empty description="Nenhum workflow encontrado" />,
            }}
            pagination={{
              pageSize: 8,
              showSizeChanger: false,
            }}
          />
        </Space>
      </Card>
    </Space>
  )
}