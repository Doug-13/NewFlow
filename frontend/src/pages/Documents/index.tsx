import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Table, Button, Select, Space, Typography, Card, Row, Col,
  Tag, Tooltip, Alert, Empty, Spin,
} from 'antd'
import {
  PlusOutlined, EyeOutlined, ArrowLeftOutlined,
  FileTextOutlined, LockOutlined, FolderOpenOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { getDocuments } from '../../api/documents'
import { getOrgGroups } from '../../api/organization'
import { loadStoredWorkflows, type StoredWorkflow } from '../../api/workflowStorage'
import { StatusBadge } from '../../components/StatusBadge'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../api/client'
import type { DocumentInstance } from '../../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const { Title, Text } = Typography

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Em Elaboração', value: 'in_progress' },
  { label: 'Publicado',     value: 'published' },
  { label: 'Reprovado',     value: 'rejected' },
  { label: 'Cancelado',     value: 'cancelled' },
]

// ─── Helpers de permissão ─────────────────────────────────────────────────────

function checkPermission(
  perms: any,
  userId: string,
  userRole: string,
  userProcessMemberships: any[],
  userGroups: any[],
): boolean {
  if (userRole === 'Admin' || userRole === 'admin') return true
  if (!perms) return true

  const hasRestriction =
    (perms.userIds?.length ?? 0) > 0 ||
    (perms.groupIds?.length ?? 0) > 0 ||
    (perms.processIds?.length ?? 0) > 0 ||
    (perms.areaIds?.length ?? 0) > 0 ||
    (perms.disciplineIds?.length ?? 0) > 0 ||
    (perms.roleIds?.length ?? 0) > 0

  if (!hasRestriction) return true
  if (perms.userIds?.includes(userId)) return true

  if (perms.processIds?.some((pid: string) =>
    userProcessMemberships.some((m: any) => m.processId === pid && m.isActive !== false),
  )) return true

  if (perms.groupIds?.some((gid: string) =>
    userGroups.some((g: any) => g.id === gid && (g.memberIds ?? []).includes(userId)),
  )) return true

  return false
}

function canVisualize(wf: any, uid: string, role: string, memberships: any[], groups: any[]) {
  return checkPermission(wf?.permissions?.visualization, uid, role, memberships, groups)
}

function canCreate(wf: any, uid: string, role: string, memberships: any[], groups: any[]) {
  return checkPermission(wf?.permissions?.creation, uid, role, memberships, groups)
}

// ─── Tela de seleção de processos ────────────────────────────────────────────

interface ProcessEntry {
  process: any
  workflow: StoredWorkflow | null
  hasView:   boolean
  hasCreate: boolean
}

function ProcessList({
  entries,
  onSelect,
  onCreateDirect,
}: {
  entries: ProcessEntry[]
  onSelect: (e: ProcessEntry) => void
  onCreateDirect: (e: ProcessEntry) => void
}) {
  if (entries.length === 0) {
    return (
      <Empty
        image={<FolderOpenOutlined style={{ fontSize: 48, color: '#bbb' }} />}
        description="Você não tem acesso a nenhum processo no momento."
      />
    )
  }

  return (
    <div>
      <Title level={4} style={{ marginBottom: 4 }}>Documentos por Processo</Title>
      <Text type="secondary" style={{ display: 'block', marginBottom: 24 }}>
        Selecione o processo para visualizar seus documentos.
      </Text>
      <Row gutter={[16, 16]}>
        {entries.map(({ process, workflow, hasView, hasCreate }) => (
          <Col xs={24} sm={12} md={8} key={process.id}>
            <Card
              hoverable={hasView}
              onClick={() => hasView && onSelect({ process, workflow, hasView, hasCreate })}
              style={{
                borderRadius: 16,
                cursor: hasView ? 'pointer' : 'default',
                opacity: hasView ? 1 : 0.55,
              }}
              styles={{ body: { padding: 20 } }}
              extra={
                hasCreate ? (
                  <Tooltip title="Novo documento neste processo">
                    <Button
                      type="primary"
                      shape="circle"
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={(e) => { e.stopPropagation(); onCreateDirect({ process, workflow, hasView, hasCreate }) }}
                    />
                  </Tooltip>
                ) : (
                  <Tooltip title="Sem permissão de criação">
                    <Button shape="circle" size="small" icon={<LockOutlined />} disabled />
                  </Tooltip>
                )
              }
            >
              <Space direction="vertical" style={{ width: '100%' }} size={6}>
                <Space>
                  <FileTextOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                  <Text strong style={{ fontSize: 15 }}>{process.name}</Text>
                </Space>
                {process.description && (
                  <Text type="secondary" style={{ fontSize: 12 }}>{process.description}</Text>
                )}
                <Space size={6} style={{ marginTop: 2 }}>
                  <Tag style={{ margin: 0 }} color="blue">{process.code}</Tag>
                  {workflow ? (
                    <Tag style={{ margin: 0 }} color="green">Workflow: {workflow.name}</Tag>
                  ) : (
                    <Tag style={{ margin: 0 }} color="default">Sem workflow</Tag>
                  )}
                  {!hasView && <Tag style={{ margin: 0 }} color="orange"><LockOutlined /> Restrito</Tag>}
                </Space>
              </Space>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function DocumentsPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [status, setStatus] = useState('')
  const [selectedEntry, setSelectedEntry] = useState<ProcessEntry | null>(null)

  const accountId = user?.accountId ?? (user as any)?.tenantId ?? ''

  // Memberships do usuário
  const { data: userProcessMemberships = [], isLoading: loadingMemberships } = useQuery({
    queryKey: ['user-process-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return []
      const res = await api.get('/user-process-memberships', { params: { userId: user.id } })
      return res.data ?? []
    },
    enabled: !!user?.id,
  })

  // Todos os processos da conta
  const { data: allProcesses = [], isLoading: loadingProcesses } = useQuery({
    queryKey: ['processes', accountId],
    queryFn: async () => {
      const res = await api.get('/processes', { params: { accountId } })
      return (res.data ?? []).filter((p: any) => p.isActive !== false)
    },
    enabled: !!accountId,
  })

  // Workflows do localStorage (mesma fonte usada pelo WorkflowsPage e studio)
  const { data: allWorkflows = [] } = useQuery({
    queryKey: ['stored-workflows'],
    queryFn: () => loadStoredWorkflows(),
    // Revalida ao focar a janela, pois o studio pode ter alterado o localStorage
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  // Grupos da organização
  const { data: orgGroups = [] } = useQuery({
    queryKey: ['org-groups'],
    queryFn: getOrgGroups,
  })

  // Documentos do processo selecionado
  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['documents', selectedEntry?.process?.id, status],
    queryFn: () => getDocuments({ processId: selectedEntry!.process.id, ...(status ? { status } : {}) }),
    enabled: !!selectedEntry,
  })

  const isLoading = loadingMemberships || loadingProcesses

  // Monta as entradas de processo com permissões calculadas
  const processEntries: ProcessEntry[] = (allProcesses as any[])
    .map((process) => {
      // Verifica se o usuário é membro do processo
      const isMember = (user?.role === 'Admin' || user?.role === 'admin') ||
        (userProcessMemberships as any[]).some((m: any) => m.processId === process.id && m.isActive !== false)

      if (!isMember) return null

      const workflow = (allWorkflows as any[]).find((w: any) => w.processId === process.id) ?? null

      const uid  = user?.id ?? ''
      const role = user?.role ?? ''

      const hasView   = canVisualize(workflow, uid, role, userProcessMemberships as any[], orgGroups as any[])
      const hasCreate = canCreate(workflow, uid, role, userProcessMemberships as any[], orgGroups as any[])

      return { process, workflow, hasView, hasCreate }
    })
    .filter(Boolean) as ProcessEntry[]

  const handleCreateDirect = (entry: ProcessEntry) => {
    const params = new URLSearchParams({
      processId:   entry.process.id,
      processName: entry.process.name,
      ...(entry.workflow ? { workflowId: entry.workflow.id } : {}),
    })
    navigate(`/documents/new?${params.toString()}`)
  }

  // ── Tela de seleção de processo ───────────────────────────────────────────
  if (!selectedEntry) {
    if (isLoading) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin size="large" />
        </div>
      )
    }
    return (
      <ProcessList
        entries={processEntries}
        onSelect={setSelectedEntry}
        onCreateDirect={handleCreateDirect}
      />
    )
  }

  // ── Tela de lista de documentos do processo ───────────────────────────────
  const { process, workflow, hasCreate } = selectedEntry

  const filteredDocs = status
    ? (documents as any[]).filter((d: any) => d.status === status)
    : (documents as any[])

  const columns = [
    { title: 'Título',      dataIndex: 'title',            key: 'title' },
    { title: 'Etapa Atual', dataIndex: 'currentStepName',  key: 'currentStepName', render: (v: any) => v ?? '-' },
    {
      title: 'Status', key: 'status',
      render: (_: any, r: DocumentInstance) => <StatusBadge status={r.status} />,
    },
    {
      title: 'Criado por', key: 'createdBy',
      render: (_: any, r: any) => r.createdByUserName ?? r.createdByName ?? '-',
    },
    {
      title: 'Atualizado', key: 'updatedAt',
      render: (_: any, r: DocumentInstance) =>
        format(new Date(r.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
    },
    {
      title: '', key: 'actions',
      render: (_: any, r: DocumentInstance) => (
        <Button size="small" icon={<EyeOutlined />} onClick={() => navigate(`/documents/${r.id}`)}>
          Ver
        </Button>
      ),
    },
  ]

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <Space align="start">
          <Button icon={<ArrowLeftOutlined />} onClick={() => setSelectedEntry(null)}>
            Processos
          </Button>
          <div>
            <Title level={4} style={{ margin: 0 }}>{process.name}</Title>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {workflow ? `Workflow: ${workflow.name}` : 'Sem workflow configurado'}
            </Text>
          </div>
        </Space>

        {hasCreate ? (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleCreateDirect(selectedEntry)}
          >
            Novo Documento
          </Button>
        ) : (
          <Tooltip title="Você não tem permissão para criar documentos neste processo">
            <Button type="primary" icon={<LockOutlined />} disabled>
              Novo Documento
            </Button>
          </Tooltip>
        )}
      </div>

      {!hasCreate && (
        <Alert
          type="warning"
          showIcon
          message="Você pode visualizar os documentos, mas não tem permissão de criação neste processo."
          style={{ marginBottom: 16 }}
        />
      )}

      <Space style={{ marginBottom: 16 }}>
        <span>Filtrar por status:</span>
        <Select
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
          style={{ width: 180 }}
          allowClear
          placeholder="Todos"
        />
      </Space>

      <Table
        dataSource={filteredDocs}
        columns={columns}
        rowKey="id"
        loading={loadingDocs}
        locale={{ emptyText: 'Nenhum documento encontrado.' }}
      />
    </div>
  )
}
