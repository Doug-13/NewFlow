import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Select, Space, Typography } from 'antd'
import { PlusOutlined, EyeOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getDocuments } from '../../api/documents'
import { StatusBadge } from '../../components/StatusBadge'
import type { DocumentInstance } from '../../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { Title } = Typography

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Em Elaboração', value: 'EmElaboracao' },
  { label: 'Em Revisão', value: 'EmRevisao' },
  { label: 'Em Aprovação', value: 'EmAprovacao' },
  { label: 'Aprovado', value: 'Aprovado' },
  { label: 'Reprovado', value: 'Reprovado' },
  { label: 'Cancelado', value: 'Cancelado' },
]

export function DocumentsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['documents', status],
    queryFn: () => getDocuments(status ? { status } : undefined)
  })

  const columns = [
    { title: 'Título', dataIndex: 'title', key: 'title' },
    { title: 'Tipo', dataIndex: 'documentTypeName', key: 'documentTypeName' },
    { title: 'Workflow', dataIndex: 'workflowName', key: 'workflowName' },
    { title: 'Etapa Atual', dataIndex: 'currentStepName', key: 'currentStepName', render: (v: any) => v ?? '-' },
    { title: 'Status', key: 'status', render: (_: any, r: DocumentInstance) => <StatusBadge status={r.status} /> },
    { title: 'Criado por', dataIndex: 'createdByUserName', key: 'createdByUserName' },
    { title: 'Atualizado', key: 'updatedAt', render: (_: any, r: DocumentInstance) => format(new Date(r.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) },
    { title: '', key: 'actions', render: (_: any, r: DocumentInstance) => (
      <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/documents/${r.id}`)}>Ver</Button>
    )},
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
        <Title level={4}>Documentos</Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/documents/new')}>Novo Documento</Button>
      </div>
      <Space style={{ marginBottom: 16 }}>
        <span>Filtrar por status:</span>
        <Select value={status} onChange={setStatus} options={STATUS_OPTIONS} style={{ width: 160 }} />
      </Space>
      <Table dataSource={data} columns={columns} rowKey="id" loading={isLoading} />
    </div>
  )
}
