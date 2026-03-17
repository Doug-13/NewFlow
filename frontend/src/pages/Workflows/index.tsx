import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Table, Button, Tag, Typography, Space, Card } from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  ApartmentOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getWorkflows } from '../../api/workflows'
import type { Workflow } from '../../types'

const { Title, Text } = Typography

export function WorkflowsPage() {
  const navigate = useNavigate()

  const { data = [], isLoading } = useQuery<Workflow[]>({
    queryKey: ['workflows'],
    queryFn: getWorkflows,
  })

  const columns = useMemo(
    () => [
      {
        title: 'Nome',
        dataIndex: 'name',
        key: 'name',
        render: (value: string) => <Text strong>{value}</Text>,
      },
      {
        title: 'Descrição',
        dataIndex: 'description',
        key: 'description',
        render: (value?: string) => value || '-',
      },
      {
        title: 'Versão',
        dataIndex: 'version',
        key: 'version',
        width: 100,
      },
      {
        title: 'Etapas',
        key: 'steps',
        width: 100,
        render: (_: unknown, record: Workflow) => record.steps?.length ?? 0,
      },
      {
        title: 'Status',
        key: 'isActive',
        width: 110,
        render: (_: unknown, record: Workflow) => (
          <Tag color={record.isActive ? 'green' : 'red'}>
            {record.isActive ? 'Ativo' : 'Inativo'}
          </Tag>
        ),
      },
      {
        title: 'Ações',
        key: 'actions',
        width: 180,
        render: (_: unknown, record: Workflow) => (
          <Space>
            <Button
              size="small"
              icon={<EyeOutlined />}
              onClick={() => navigate(`/workflows/${record.id}`)}
            >
              Ver
            </Button>

            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(`/workflows/${record.id}/edit`)}
            >
              Editar
            </Button>
          </Space>
        ),
      },
    ],
    [navigate]
  )

  return (
    <div style={{ padding: 24, background: '#f5f7fb', minHeight: '100vh' }}>
      <Card bordered={false} style={{ borderRadius: 16, marginBottom: 16 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <Space>
            <ApartmentOutlined style={{ fontSize: 22, color: '#1677ff' }} />
            <div>
              <Title level={3} style={{ margin: 0 }}>
                Workflows
              </Title>
              <Text type="secondary">Gerencie os fluxos no padrão BPM</Text>
            </div>
          </Space>

          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => navigate('/workflows/new')}
          >
            Novo Workflow
          </Button>
        </div>
      </Card>

      <Card bordered={false} style={{ borderRadius: 16 }}>
        <Table
          dataSource={data}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  )
}