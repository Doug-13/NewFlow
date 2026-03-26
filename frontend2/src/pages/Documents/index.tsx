import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Select, Space, Typography, Card, Row, Col, Tag } from 'antd'
import { PlusOutlined, EyeOutlined, ArrowLeftOutlined, FileTextOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getDocuments } from '../../api/documents'
import { getWorkflows } from '../../api/workflows'
import { StatusBadge } from '../../components/StatusBadge'
import type { DocumentInstance } from '../../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Em Elaboração', value: 'EmElaboracao' },
  { label: 'Em Revisão', value: 'EmRevisao' },
  { label: 'Em Aprovação', value: 'EmAprovacao' },
  { label: 'Aprovado', value: 'Aprovado' },
  { label: 'Reprovado', value: 'Reprovado' },
  { label: 'Cancelado', value: 'Cancelado' },
]

function ProcessSelection({ onSelect }: { onSelect: (workflow: any) => void }) {
  const { data: workflows = [], isLoading } = useQuery({
    queryKey: ['workflows'],
    queryFn: getWorkflows,
  })

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Selecione o Processo</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Escolha em qual processo deseja criar ou visualizar documentos.
      </Text>
      {isLoading ? (
        <Text>Carregando processos...</Text>
      ) : (
        <Row gutter={[16, 16]}>
          {(workflows as any[]).map((wf) => (
            <Col xs={24} sm={12} md={8} key={wf.id}>
              <Card
                hoverable
                onClick={() => onSelect(wf)}
                style={{ borderRadius: 16, cursor: 'pointer' }}
                styles={{ body: { padding: 20 } }}
              >
                <Space direction="vertical" style={{ width: '100%' }} size={8}>
                  <Space>
                    <FileTextOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                    <Text strong style={{ fontSize: 15 }}>{wf.name}</Text>
                  </Space>
                  {wf.description && (
                    <Text type="secondary" style={{ fontSize: 12 }}>{wf.description}</Text>
                  )}
                  <Space size={6}>
                    {wf.version && <Tag style={{ margin: 0 }}>v{wf.version}</Tag>}
                    {wf.status && <Tag color={wf.status === 'active' ? 'green' : 'default'} style={{ margin: 0 }}>{wf.status === 'active' ? 'Ativo' : wf.status}</Tag>}
                  </Space>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

export function DocumentsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['documents', status, selectedWorkflow?.id],
    queryFn: () => getDocuments(status ? { status } : undefined),
    enabled: !!selectedWorkflow,
  })

  const filteredData = selectedWorkflow
    ? (data ?? []).filter((d: any) => !d.workflowId || d.workflowId === selectedWorkflow.id)
    : []

  const columns = [
    { title: 'Título', dataIndex: 'title', key: 'title' },
    { title: 'Tipo', dataIndex: 'documentTypeName', key: 'documentTypeName' },
    { title: 'Etapa Atual', dataIndex: 'currentStepName', key: 'currentStepName', render: (v: any) => v ?? '-' },
    { title: 'Status', key: 'status', render: (_: any, r: DocumentInstance) => <StatusBadge status={r.status} /> },
    { title: 'Criado por', dataIndex: 'createdByUserName', key: 'createdByUserName' },
    { title: 'Atualizado', key: 'updatedAt', render: (_: any, r: DocumentInstance) => format(new Date(r.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) },
    { title: '', key: 'actions', render: (_: any, r: DocumentInstance) => (
      <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/documents/${r.id}`)}>Ver</Button>
    )},
  ]

  if (!selectedWorkflow) {
    return <ProcessSelection onSelect={setSelectedWorkflow} />
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedWorkflow(null)}>
            Mudar processo
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>Documentos</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Processo: {selectedWorkflow.name}</Text>
          </div>
        </Space>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => navigate(`/documents/new?workflowId=${selectedWorkflow.id}`)}
        >
          Novo Documento
        </Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <span>Filtrar por status:</span>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 160 }} />
      </Space>
      <Table dataSource={filteredData} columns={columns} rowKey="id" loading={isLoading} />
    </div>
  )
}
