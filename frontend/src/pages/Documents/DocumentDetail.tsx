import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Card,
  Descriptions,
  Button,
  Upload,
  Space,
  Typography,
  Tabs,
  Table,
  Form,
  Input,
  Tag,
  Popconfirm,
  message,
  Steps,
  Divider,
  Alert,
  Modal,
  Badge,
  Tooltip,
  Popover,
} from 'antd'
import {
  UploadOutlined,
  DownloadOutlined,
  ArrowLeftOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  MinusCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  ArrowRightOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  FieldTimeOutlined,
  InfoCircleOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  BranchesOutlined,
} from '@ant-design/icons'
import {
  getDocument,
  getDocuments,
  uploadFile,
  cancelDocument,
  downloadFile,
} from '../../api/documents'
import { executeTask } from '../../api/tasks'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import { getMetadataValues, saveMetadataValues } from '../../api/metadata'
import { MetadataForm } from '../../components/MetadataForm'

const { Title, Text } = Typography

// ─── Constantes de label/cor ─────────────────────────────────────────────────

const ACTION_LABELS: Record<string, string> = {
  submit: 'Submeter',
  approve: 'Aprovar',
  reject: 'Reprovar',
  'request-changes': 'Solicitar ajustes',
  cancel: 'Cancelar',
  publish: 'Publicar',
  review: 'Revisar',
  forward: 'Encaminhar',
}

function getActionLabel(action: string) {
  return ACTION_LABELS[action] ?? action
}

const ACTION_COLORS: Record<string, string> = {
  approve: '#52c41a',
  publish: '#52c41a',
  submit: '#1677ff',
  forward: '#1677ff',
  reject: '#ff4d4f',
  'request-changes': '#fa8c16',
  cancel: '#8c8c8c',
  review: '#722ed1',
}

type ConfiguredAction = {
  id: string
  label: string
  color: string
  outcome: string
  requiresComment: boolean
}

// ─── Tipos auxiliares para as etapas do workflow ──────────────────────────────

type WorkflowStepTransition = {
  triggerAction: string
  toStepOrderIndex: number | null
  toStepId: string | null
  toStepName: string | null
}

type WorkflowStepEnriched = {
  id: string
  name: string
  orderIndex: number | null
  isInitial: boolean
  isFinal: boolean
  kind: string
  allowedActions: string[]
  actions: ConfiguredAction[]
  deadlineMode: string | null
  deadlineValue: number | string | null
  responsibles: Array<{ type: string; id?: string; name?: string }>
  transitions: WorkflowStepTransition[]
  instructions?: string | null
  helpText?: string | null
}

// ─── Helper: label do SLA ─────────────────────────────────────────────────────

function formatSla(
  deadlineMode: string | null,
  deadlineValue: number | string | null,
): string | null {
  if (!deadlineMode || deadlineValue === null || deadlineValue === undefined || deadlineValue === '') {
    return null
  }
  const value = Number(deadlineValue)
  if (isNaN(value) || value <= 0) return null
  if (deadlineMode === 'hours') return `${value}h de prazo`
  if (deadlineMode === 'days') return `${value} dia${value !== 1 ? 's' : ''} de prazo`
  return null
}

// ─── Helper: label dos responsáveis ──────────────────────────────────────────

function formatResponsibleLabel(
  responsible: { type: string; id?: string; name?: string },
): string {
  const name = responsible.name ?? responsible.id ?? '—'
  if (responsible.type === 'dynamic') return 'Solicitante'
  if (responsible.type === 'user') return name
  if (responsible.type === 'role') return `Papel: ${name}`
  if (responsible.type === 'group') return `Grupo: ${name}`
  return name
}

// ─── Modal: detalhes da próxima etapa + confirmar ação ────────────────────────

type ActionConfirmModalProps = {
  open: boolean
  action: ConfiguredAction | null
  nextStep: WorkflowStepEnriched | null
  taskId: string
  commentValue: string
  commentError: boolean
  loading: boolean
  onCommentChange: (value: string) => void
  onConfirm: () => void
  onCancel: () => void
}

function ActionConfirmModal({
  open,
  action,
  nextStep,
  taskId: _taskId,
  commentValue,
  commentError,
  loading,
  onCommentChange,
  onConfirm,
  onCancel,
}: ActionConfirmModalProps) {
  if (!action) return null

  const actionColor = ACTION_COLORS[action.outcome] ?? action.color
  const slaLabel = nextStep
    ? formatSla(nextStep.deadlineMode, nextStep.deadlineValue)
    : null

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      title={
        <Space>
          <ThunderboltOutlined style={{ color: actionColor }} />
          <span>Confirmar ação</span>
          <Tag color={actionColor} style={{ marginLeft: 4 }}>
            {action.label}
          </Tag>
        </Space>
      }
      width={560}
      destroyOnClose
    >
      {/* Próxima etapa */}
      {nextStep && (
        <>
          <div
            style={{
              background: '#f6f8fc',
              border: '1px solid #e6eaf2',
              borderRadius: 10,
              padding: '16px 20px',
              marginBottom: 20,
            }}
          >
            <Space align="center" style={{ marginBottom: 12 }}>
              <ArrowRightOutlined style={{ color: '#1677ff' }} />
              <Text strong style={{ fontSize: 13, color: '#1677ff' }}>
                Próxima etapa
              </Text>
            </Space>

            <Text
              strong
              style={{ display: 'block', fontSize: 16, marginBottom: 12 }}
            >
              {nextStep.name}
            </Text>

            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              {/* Responsáveis */}
              {nextStep.responsibles && nextStep.responsibles.length > 0 && (
                <Space wrap size={6}>
                  <TeamOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Responsável{nextStep.responsibles.length > 1 ? 'eis' : ''}:
                  </Text>
                  {nextStep.responsibles.map((resp, idx) => (
                    <Tag key={idx} icon={<UserOutlined />} color="blue">
                      {formatResponsibleLabel(resp)}
                    </Tag>
                  ))}
                </Space>
              )}

              {/* SLA */}
              {slaLabel && (
                <Space size={6}>
                  <FieldTimeOutlined style={{ color: '#fa8c16' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Prazo estimado:
                  </Text>
                  <Tag color="orange">{slaLabel}</Tag>
                </Space>
              )}

              {/* Ações disponíveis na próxima etapa */}
              {nextStep.allowedActions && nextStep.allowedActions.length > 0 && (
                <Space size={6} wrap>
                  <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Ações disponíveis:
                  </Text>
                  {nextStep.allowedActions.map((act) => (
                    <Tag
                      key={act}
                      color={ACTION_COLORS[act] ?? 'default'}
                      style={{ fontSize: 11 }}
                    >
                      {getActionLabel(act)}
                    </Tag>
                  ))}
                </Space>
              )}

              {/* Etapa final */}
              {nextStep.isFinal && (
                <Tag color="green" icon={<CheckCircleOutlined />}>
                  Etapa final do fluxo
                </Tag>
              )}
            </Space>
          </div>
          <Divider style={{ margin: '0 0 16px' }} />
        </>
      )}

      {/* Comentário */}
      <Form.Item
        label={
          action.requiresComment
            ? 'Comentário (obrigatório)'
            : 'Comentário (opcional)'
        }
        validateStatus={commentError ? 'error' : ''}
        help={commentError ? 'Comentário obrigatório para esta ação.' : ''}
        style={{ marginBottom: 20 }}
      >
        <Input.TextArea
          rows={3}
          value={commentValue}
          onChange={(e) => onCommentChange(e.target.value)}
          placeholder={
            action.requiresComment
              ? 'Descreva o motivo...'
              : 'Adicione um comentário (opcional)...'
          }
          autoFocus
        />
      </Form.Item>

      {/* Botões */}
      <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
        <Button onClick={onCancel}>Cancelar</Button>
        <Button
          type="primary"
          loading={loading}
          onClick={onConfirm}
          style={{
            background: actionColor,
            borderColor: actionColor,
          }}
        >
          Confirmar {action.label}
        </Button>
      </Space>
    </Modal>
  )
}

// ─── Aba Workflow ─────────────────────────────────────────────────────────────

type WorkflowTabProps = {
  workflowSteps: WorkflowStepEnriched[]
  currentStepOrderIndex: number | null
  isFinished: boolean
  docStatus: string
}

function WorkflowTab({
  workflowSteps,
  currentStepOrderIndex,
  isFinished,
  docStatus,
}: WorkflowTabProps) {
  if (!workflowSteps || workflowSteps.length === 0) {
    return (
      <Card>
        <Text type="secondary">Nenhuma etapa de workflow configurada.</Text>
      </Card>
    )
  }

  return (
    <Card>
      {isFinished && (
        <div style={{ marginBottom: 16 }}>
          <Tag
            color={
              docStatus === 'published' || docStatus === 'Aprovado'
                ? 'green'
                : docStatus === 'rejected' || docStatus === 'Reprovado'
                  ? 'red'
                  : 'default'
            }
          >
            {docStatus === 'published' || docStatus === 'Aprovado'
              ? 'Documento publicado'
              : docStatus === 'rejected' || docStatus === 'Reprovado'
                ? 'Documento reprovado'
                : 'Documento cancelado'}
          </Tag>
        </div>
      )}

      <Divider style={{ fontSize: 13, marginTop: 0, textAlign: "left" }}>
        Detalhes das etapas
      </Divider>

      {/* Cards de cada etapa */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workflowSteps.map((step, idx) => {
          const isCurrent = step.orderIndex === currentStepOrderIndex && !isFinished
          const isPast =
            (currentStepOrderIndex !== null &&
              typeof step.orderIndex === 'number' &&
              step.orderIndex < currentStepOrderIndex) ||
            isFinished

          const slaLabel = formatSla(step.deadlineMode, step.deadlineValue)

          // responsáveis: tenta pegar de step.responsibles
          const hasResponsibles =
            Array.isArray(step.responsibles) && step.responsibles.length > 0

          // ações: prioriza actions (com label), senão allowedActions
          const displayActions: string[] =
            Array.isArray(step.allowedActions) && step.allowedActions.length > 0
              ? step.allowedActions
              : []

          return (
            <div
              key={step.id ?? idx}
              style={{
                border: isCurrent
                  ? '1.5px solid #1677ff'
                  : '1px solid #f0f0f0',
                borderRadius: 10,
                padding: '12px 16px',
                background: isCurrent
                  ? '#f0f7ff'
                  : isPast
                    ? '#fafafa'
                    : '#fff',
                position: 'relative',
                transition: 'border-color 0.2s',
              }}
            >
              {/* Badge de status — canto direito */}
              <div
                style={{
                  position: 'absolute',
                  top: 12,
                  right: 14,
                  display: 'flex',
                  gap: 6,
                  alignItems: 'center',
                }}
              >
                {isCurrent && (
                  <Badge
                    status="processing"
                    text={
                      <Text style={{ fontSize: 11, color: '#1677ff' }}>
                        Em andamento
                      </Text>
                    }
                  />
                )}
                {isPast && !isCurrent && (
                  <Badge
                    status="success"
                    text={
                      <Text style={{ fontSize: 11, color: '#52c41a' }}>
                        Concluída
                      </Text>
                    }
                  />
                )}
                {!isCurrent && !isPast && (
                  <Badge
                    status="default"
                    text={
                      <Text style={{ fontSize: 11, color: '#bfbfbf' }}>
                        Pendente
                      </Text>
                    }
                  />
                )}
                {step.isInitial && (
                  <Tag color="blue" style={{ fontSize: 11 }}>
                    Inicial
                  </Tag>
                )}
                {step.isFinal && (
                  <Tag color="green" style={{ fontSize: 11 }}>
                    Final
                  </Tag>
                )}
              </div>

              {/* Linha 1: índice + nome */}
              <Space align="center" style={{ marginBottom: 8, paddingRight: 160 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: isCurrent
                      ? '#1677ff'
                      : isPast
                        ? '#52c41a'
                        : '#d9d9d9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isPast ? (
                    <CheckCircleOutlined style={{ color: '#fff', fontSize: 12 }} />
                  ) : (
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: 600, lineHeight: 1 }}>
                      {idx + 1}
                    </Text>
                  )}
                </div>
                <Text strong style={{ fontSize: 13 }}>
                  {step.name}
                </Text>
              </Space>

              {/* Linha 2: responsáveis + SLA + ações */}
              <Space wrap size={[16, 6]} style={{ paddingLeft: 30 }}>
                {/* Responsáveis */}
                {hasResponsibles && (
                  <Space size={4}>
                    <TeamOutlined style={{ color: '#8c8c8c', fontSize: 12 }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {step.responsibles.map(formatResponsibleLabel).join(', ')}
                    </Text>
                  </Space>
                )}

                {/* SLA */}
                {slaLabel && (
                  <Space size={4}>
                    <FieldTimeOutlined style={{ color: '#fa8c16', fontSize: 12 }} />
                    <Text style={{ fontSize: 12, color: '#fa8c16', fontWeight: 500 }}>
                      {slaLabel}
                    </Text>
                  </Space>
                )}

                {/* Ações */}
                {displayActions.length > 0 && (
                  <Space size={4} wrap>
                    <InfoCircleOutlined style={{ color: '#bfbfbf', fontSize: 12 }} />
                    {displayActions.map((act) => (
                      <Tooltip key={act} title={`Ação: ${getActionLabel(act)}`}>
                        <Tag
                          color={ACTION_COLORS[act] ?? 'default'}
                          style={{ fontSize: 11, cursor: 'default', margin: 0 }}
                        >
                          {getActionLabel(act)}
                        </Tag>
                      </Tooltip>
                    ))}
                  </Space>
                )}

                {/* Sem configuração alguma */}
                {!hasResponsibles && !slaLabel && displayActions.length === 0 && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Sem configurações registradas
                  </Text>
                )}
              </Space>

              {/* Linha 3: Transições */}
              {step.transitions && step.transitions.length > 0 && (
                <div style={{ marginTop: 8, paddingLeft: 30 }}>
                  <Space size={6} wrap>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      Transições:
                    </Text>
                    {step.transitions.map((tr, tIdx) => (
                      <Space key={tIdx} size={3}>
                        <Tag
                          color={ACTION_COLORS[tr.triggerAction] ?? 'default'}
                          style={{ fontSize: 10, margin: 0 }}
                        >
                          {getActionLabel(tr.triggerAction)}
                        </Tag>
                        <ArrowRightOutlined style={{ fontSize: 10, color: '#bfbfbf' }} />
                        <Text style={{ fontSize: 11, color: '#595959' }}>
                          {tr.toStepName ?? `Etapa ${tr.toStepOrderIndex}`}
                        </Text>
                      </Space>
                    ))}
                  </Space>
                </div>
              )}

              {/* Linha 4: Instruções */}
              {(step.instructions || step.helpText) && (
                <div style={{ marginTop: 10, paddingLeft: 30 }}>
                  {step.instructions && (
                    <div style={{
                      background: '#fffbeb',
                      border: '1px solid #fde68a',
                      borderRadius: 8,
                      padding: '10px 14px',
                      marginBottom: step.helpText ? 8 : 0,
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: '#92400e', display: 'block', marginBottom: 4 }}>
                        📋 Instruções
                      </Text>
                      <Text style={{ fontSize: 12, color: '#78350f', whiteSpace: 'pre-wrap' }}>
                        {step.instructions}
                      </Text>
                    </div>
                  )}
                  {step.helpText && (
                    <div style={{
                      background: '#f0f9ff',
                      border: '1px solid #bae6fd',
                      borderRadius: 8,
                      padding: '10px 14px',
                    }}>
                      <Text style={{ fontSize: 11, fontWeight: 600, color: '#0c4a6e', display: 'block', marginBottom: 4 }}>
                        💡 Texto de apoio
                      </Text>
                      <Text style={{ fontSize: 12, color: '#075985', whiteSpace: 'pre-wrap' }}>
                        {step.helpText}
                      </Text>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Card>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore((state) => state.user)

  // Estado do modal de confirmação de ação
  const [modalAction, setModalAction] = useState<ConfiguredAction | null>(null)
  const [commentValue, setCommentValue] = useState('')
  const [commentError, setCommentError] = useState(false)

  const [metaForm] = Form.useForm()

  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id!),
  })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(id!, file),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', id] })
      message.success('Arquivo enviado!')
    },
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelDocument(id!),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', id] })
      message.success('Documento cancelado.')
    },
  })

  const taskMutation = useMutation({
    mutationFn: ({
      taskId,
      outcome,
      comment,
    }: {
      taskId: string
      outcome: string
      comment: string
    }) => executeTask(taskId, outcome, comment || undefined),
    onSuccess: async () => {
      const executedAt = Date.now()

      // Invalida todas as queries relevantes
      await qc.invalidateQueries({ queryKey: ['document', id] })
      await qc.invalidateQueries({ queryKey: ['tasks'] })
      await qc.invalidateQueries({ queryKey: ['dashboard'] })
      await qc.invalidateQueries({ queryKey: ['document-revisions'] })

      setModalAction(null)
      setCommentValue('')
      setCommentError(false)

      // Verifica se uma nova revisão foi criada AGORA pela system-task
      // Só navega se o documento foi criado nos últimos 5 segundos (recém criado pelo motor)
      try {
        const allDocs = await getDocuments({ processId: (doc as any).processId })
        const rootId  = (doc as any).parentDocumentId ?? id!

        const newlyCreated = (allDocs as any[]).find((d: any) => {
          if (d.id === id) return false                          // não é o atual
          if (d.parentDocumentId !== rootId && d.id !== rootId) return false  // não é da família
          const createdMs = new Date(d.createdAt).getTime()
          return createdMs > executedAt - 5000                  // criado nos últimos 5s
        })

        if (newlyCreated) {
          message.success(`Revisão ${newlyCreated.revision ?? ''} criada — abrindo novo documento...`)
          navigate(`/documents/${newlyCreated.id}`)
          return
        }
      } catch { /* se falhar, permanece no documento atual */ }

      message.success('Ação executada com sucesso!')
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error ??
          error?.message ??
          'Erro ao executar ação.',
      )
    },
  })

  const saveMetaMutation = useMutation({
    mutationFn: (values: Record<string, any>) => {
      const payload = Object.entries(values).map(
        ([metadataDefinitionId, value]) => ({
          metadataDefinitionId,
          value: value?.toISOString ? value.toISOString() : value,
        }),
      )
      return saveMetadataValues(id!, payload)
    },
    onSuccess: () => message.success('Metadados salvos!'),
  })

  const { data: metadataFields } = useQuery({
    queryKey: ['metadata-values', id],
    queryFn: () => getMetadataValues(id!),
  })

  // ── Família de revisões ──────────────────────────────────────────────────────
  // root = documento mais antigo da família (parentDocumentId = null)
  const parentDocumentId = (doc as any)?.parentDocumentId ?? null
  const revisionRootId = parentDocumentId ?? id!   // se este doc é o root, usa o próprio id

  const { data: allRevisions = [] } = useQuery({
    queryKey: ['document-revisions', revisionRootId],
    queryFn: async () => {
      const response = await getDocuments({ processId: (doc as any).processId })
      const all = response as any[]
      // Inclui: o próprio root + todos que apontam para o root
      const family = all.filter((d: any) =>
        d.id === revisionRootId ||
        d.parentDocumentId === revisionRootId
      )
      // Ordena do mais antigo para o mais novo
      return family.sort((a: any, b: any) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    },
    enabled: !!doc,
  })

  const currentRevision = (doc as any)?.revision ?? null
  const latestRevision = allRevisions.length > 0
    ? allRevisions[allRevisions.length - 1]
    : null
  const isObsolete = latestRevision && latestRevision.id !== id && allRevisions.length > 1

  if (isLoading || !doc) {
    return <div style={{ padding: 24 }}>Carregando...</div>
  }

  // ── Dados derivados ──────────────────────────────────────────────────────────

  const myPendingTask: any = doc.tasks.find(
    (task: any) =>
      (task.status === 'Pendente' || task.status === 'pending') &&
      (task.assignedToUserId === user?.id || task.assignedUserId === user?.id),
  )

  const workflowSteps: WorkflowStepEnriched[] = (doc as any).workflowSteps ?? []
  const currentStepOrderIndex: number | null =
    (doc as any).currentStepOrderIndex ?? null

  const isFinished = [
    'published',
    'rejected',
    'cancelled',
    'Aprovado',
    'Reprovado',
    'Cancelado',
  ].includes(doc.status)

  // Ações disponíveis para a tarefa pendente
  const configuredActions: ConfiguredAction[] = myPendingTask
    ? ((myPendingTask as any).taskActions ?? [])
    : []

  const availableActions: ConfiguredAction[] =
    configuredActions.length > 0
      ? configuredActions
      : (((myPendingTask as any)?.allowedActions ?? doc.availableActions ?? []).map(
          (action: string) => ({
            id: action,
            label: getActionLabel(action),
            color: ACTION_COLORS[action] ?? 'blue',
            outcome: action,
            requiresComment: false,
          }),
        ) as ConfiguredAction[])

  // ── Encontrar próxima etapa dado uma ação ────────────────────────────────────

  function findNextStep(action: ConfiguredAction): WorkflowStepEnriched | null {
    if (!workflowSteps || workflowSteps.length === 0) return null

    const currentStep = workflowSteps.find(
      (s) => s.orderIndex === currentStepOrderIndex,
    ) ?? null

    if (!currentStep) return null

    const matchedTransition = currentStep.transitions?.find(
      (tr) => tr.triggerAction === action.outcome,
    ) ?? null

    if (matchedTransition && matchedTransition.toStepOrderIndex !== null) {
      return (
        workflowSteps.find(
          (s) => s.orderIndex === matchedTransition.toStepOrderIndex,
        ) ?? null
      )
    }

    // fallback: próxima etapa sequencial
    if (typeof currentStep.orderIndex === 'number') {
      return (
        workflowSteps.find(
          (s) =>
            typeof s.orderIndex === 'number' &&
            s.orderIndex === (currentStep.orderIndex as number) + 1,
        ) ?? null
      )
    }

    return null
  }

  // ── Handlers do modal ────────────────────────────────────────────────────────

  function handleActionClick(action: ConfiguredAction) {
    setModalAction(action)
    setCommentValue('')
    setCommentError(false)
  }

  function handleModalConfirm() {
    if (!modalAction || !myPendingTask) return

    if (modalAction.requiresComment && !commentValue.trim()) {
      setCommentError(true)
      return
    }

    taskMutation.mutate({
      taskId: myPendingTask.id,
      outcome: modalAction.outcome,
      comment: commentValue,
    })
  }

  function handleModalCancel() {
    setModalAction(null)
    setCommentValue('')
    setCommentError(false)
  }

  // ── Colunas de arquivos ───────────────────────────────────────────────────────

  const fileColumns = [
    { title: 'Versão', dataIndex: 'versionNumber', width: 80 },
    { title: 'Arquivo', dataIndex: 'originalFilename' },
    {
      title: 'Tamanho',
      key: 'size',
      render: (_: any, record: any) =>
        `${(record.fileSizeBytes / 1024).toFixed(1)} KB`,
    },
    { title: 'Enviado por', dataIndex: 'uploadedByUserName' },
    {
      title: 'Data',
      key: 'date',
      render: (_: any, record: any) =>
        format(new Date(record.uploadedAt), 'dd/MM/yyyy HH:mm', {
          locale: ptBR,
        }),
    },
    {
      title: '',
      key: 'dl',
      render: (_: any, record: any) => (
        <a href={downloadFile(id!, record.id)} target="_blank" rel="noreferrer">
          <Button size="small" icon={<DownloadOutlined />}>
            Baixar
          </Button>
        </a>
      ),
    },
  ]

  // ── Aba de Metadados ─────────────────────────────────────────────────────────

  const metadataTabContent = (
    <Card>
      {myPendingTask && (
        <Alert
          type="info"
          style={{ marginBottom: 16 }}
          showIcon
          title={
            <Space wrap size={4}>
              <UserOutlined />
              <Text strong>Responsável:</Text>
              <Text>{myPendingTask.assignedToUserName}</Text>

              {myPendingTask.dueAt && (
                <>
                  <Divider type="vertical" />
                  <CalendarOutlined />
                  <Text strong>Prazo:</Text>
                  <Text
                    style={{
                      color:
                        new Date(myPendingTask.dueAt) < new Date()
                          ? '#ff4d4f'
                          : undefined,
                    }}
                  >
                    {format(new Date(myPendingTask.dueAt), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </Text>
                </>
              )}
            </Space>
          }
        />
      )}

      {/* Instruções da etapa atual */}
      {(() => {
        const currentStep = workflowSteps.find((s) => s.orderIndex === currentStepOrderIndex)
        if (!currentStep) return null
        const { instructions, helpText } = currentStep
        if (!instructions && !helpText) return null
        return (
          <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
            {instructions && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: 8,
                padding: '12px 16px',
              }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: '#92400e', display: 'block', marginBottom: 6 }}>
                  📋 Instruções da etapa
                </Text>
                <Text style={{ fontSize: 13, color: '#78350f', whiteSpace: 'pre-wrap' }}>
                  {instructions}
                </Text>
              </div>
            )}
            {helpText && (
              <div style={{
                background: '#f0f9ff',
                border: '1px solid #bae6fd',
                borderRadius: 8,
                padding: '12px 16px',
              }}>
                <Text style={{ fontSize: 12, fontWeight: 700, color: '#0c4a6e', display: 'block', marginBottom: 6 }}>
                  💡 Texto de apoio
                </Text>
                <Text style={{ fontSize: 13, color: '#075985', whiteSpace: 'pre-wrap' }}>
                  {helpText}
                </Text>
              </div>
            )}
          </div>
        )
      })()}

      {/* Revisão obsoleta — bloqueia edição e ações */}
      {isObsolete && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 16, borderRadius: 8 }}
          title="Revisão obsoleta — somente leitura"
          description="Esta revisão está desatualizada. Os dados exibidos são históricos e não podem ser alterados."
        />
      )}

      <Form
        form={metaForm}
        layout="vertical"
        onFinish={(values) => saveMetaMutation.mutate(values)}
      >
        {metadataFields && metadataFields.length > 0 ? (
          <MetadataForm fields={metadataFields} form={metaForm} readOnly={!!isObsolete} />
        ) : (
          <Text type="secondary">
            Nenhum metadado configurado para esta etapa.
          </Text>
        )}

        {!isFinished && !isObsolete && (
          <Button
            type="primary"
            htmlType="submit"
            loading={saveMetaMutation.isPending}
            style={{ marginTop: 16 }}
          >
            Salvar
          </Button>
        )}

        {myPendingTask && availableActions.length > 0 && !isFinished && !isObsolete && (
          <>
            <Divider style={{ margin: '20px 0 16px' }} />

            <Text strong style={{ display: 'block', marginBottom: 12 }}>
              Executar ação na etapa:{' '}
              <Tag color="blue">{myPendingTask.stepName}</Tag>
            </Text>

            <Space wrap>
              {availableActions.map((action) => (
                <Button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  style={{
                    borderColor: ACTION_COLORS[action.outcome] ?? action.color,
                    color: ACTION_COLORS[action.outcome] ?? action.color,
                    fontWeight: 500,
                  }}
                >
                  {action.label}
                </Button>
              ))}
            </Space>
          </>
        )}
      </Form>
    </Card>
  )

  // ── Barra de progresso no topo (mantida) ─────────────────────────────────────

  const stepsItems = workflowSteps.map((step) => {
    const isCurrent = step.orderIndex === currentStepOrderIndex && !isFinished
    const isPast =
      (currentStepOrderIndex !== null &&
        typeof step.orderIndex === 'number' &&
        step.orderIndex < currentStepOrderIndex) ||
      isFinished

    return {
      title: step.name,
      status: isCurrent
        ? ('process' as const)
        : isPast
          ? ('finish' as const)
          : ('wait' as const),
      icon: isCurrent ? (
        <ClockCircleOutlined />
      ) : isPast ? (
        <CheckCircleOutlined />
      ) : (
        <MinusCircleOutlined style={{ color: '#d9d9d9' }} />
      ),
    }
  })

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Alerta de revisão obsoleta */}
      {isObsolete && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: 12, borderRadius: 10 }}
          title="Revisão obsoleta"
          description={
            <span>
              Esta não é a revisão mais recente.{' '}
              <Button
                type="link"
                size="small"
                style={{ padding: 0, height: 'auto' }}
                onClick={() => navigate(`/documents/${latestRevision!.id}`)}
              >
                Ver revisão atual ({latestRevision!.revision ?? 'mais recente'})
              </Button>
            </span>
          }
        />
      )}

      {/* Cabeçalho */}
      <Space style={{ marginBottom: 8 }} wrap align="center">
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/documents')}
        >
          Voltar
        </Button>

        <div>
          <Space wrap align="center">
            {(doc as any).code && (
              <Tag style={{ fontSize: 13, padding: '2px 8px' }}>
                {(doc as any).code}
              </Tag>
            )}

            <Title level={4} style={{ margin: 0 }}>
              {doc.title}
            </Title>

            <StatusBadge status={doc.status} />
          </Space>

          {/* Revisão abaixo do código */}
          <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            {currentRevision !== null && currentRevision !== undefined ? (
              <Popover
                trigger="click"
                title={
                  <Space>
                    <HistoryOutlined />
                    <span>Histórico de revisões</span>
                  </Space>
                }
                content={
                  <div style={{ width: 320 }}>
                    {allRevisions.length === 0 ? (
                      <Text type="secondary" style={{ fontSize: 13 }}>Nenhuma outra revisão encontrada.</Text>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[...allRevisions].reverse().map((rev: any) => {
                          const isCurrent = rev.id === id
                          const isLatestRev = rev.id === latestRevision?.id
                          return (
                            <div
                              key={rev.id}
                              onClick={() => !isCurrent && navigate(`/documents/${rev.id}`)}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                padding: '8px 12px',
                                borderRadius: 8,
                                background: isCurrent ? '#eff6ff' : '#fafafa',
                                border: isCurrent ? '1.5px solid #bfdbfe' : '1px solid #f0f0f0',
                                cursor: isCurrent ? 'default' : 'pointer',
                                transition: 'background 0.15s',
                              }}
                            >
                              <div
                                style={{
                                  width: 32,
                                  height: 32,
                                  borderRadius: 8,
                                  background: isCurrent ? '#3b82f6' : '#e5e7eb',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Text style={{ fontSize: 11, fontWeight: 700, color: isCurrent ? '#fff' : '#6b7280' }}>
                                  {rev.revision ?? '—'}
                                </Text>
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text
                                  strong={isCurrent}
                                  style={{ fontSize: 12, display: 'block', color: isCurrent ? '#1d4ed8' : '#111827' }}
                                  ellipsis
                                >
                                  {rev.code}
                                  {isCurrent && <Tag color="blue" style={{ marginLeft: 6, fontSize: 10 }}>Atual</Tag>}
                                  {isLatestRev && !isCurrent && <Tag color="green" style={{ marginLeft: 6, fontSize: 10 }}>Mais recente</Tag>}
                                  {!isLatestRev && !isCurrent && <Tag color="default" style={{ marginLeft: 6, fontSize: 10 }}>Obsoleta</Tag>}
                                </Text>
                                <Text style={{ fontSize: 11, color: '#9ca3af' }}>
                                  {format(new Date(rev.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                  {rev.createdByName && ` · ${rev.createdByName}`}
                                </Text>
                              </div>
                              {!isCurrent && (
                                <BranchesOutlined style={{ color: '#9ca3af', fontSize: 13, flexShrink: 0 }} />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                }
              >
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '3px 10px',
                    borderRadius: 6,
                    border: '1.5px solid #bfdbfe',
                    background: '#eff6ff',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  <HistoryOutlined style={{ color: '#3b82f6', fontSize: 12 }} />
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8' }}>
                    Rev {currentRevision}
                  </Text>
                  {allRevisions.length > 1 && (
                    <Text style={{ fontSize: 10, color: '#60a5fa' }}>
                      · {allRevisions.length} revisõe{allRevisions.length !== 1 ? 's' : ''}
                    </Text>
                  )}
                </div>
              </Popover>
            ) : (
              // Sem revisão ainda — mostra placeholder discreto
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 6,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                }}
              >
                <HistoryOutlined style={{ color: '#d1d5db', fontSize: 11 }} />
                <Text style={{ fontSize: 11, color: '#9ca3af' }}>Sem revisão</Text>
              </div>
            )}
          </div>
        </div>
      </Space>

      {/* Barra de progresso compacta no topo */}
      {workflowSteps.length > 0 && (
        <Card
          style={{ marginBottom: 16 }}
          styles={{ body: { padding: '16px 24px' } }}
        >
          <Text strong style={{ display: 'block', marginBottom: 12 }}>
            Progresso do Fluxo
          </Text>

          <Steps
            current={
              isFinished
                ? workflowSteps.length
                : workflowSteps.findIndex(
                    (step) => step.orderIndex === currentStepOrderIndex,
                  )
            }
            items={stepsItems}
            size="small"
          />

          {isFinished && (
            <div style={{ marginTop: 8 }}>
              <Tag
                color={
                  doc.status === 'published' || doc.status === 'Aprovado'
                    ? 'green'
                    : doc.status === 'rejected' || doc.status === 'Reprovado'
                      ? 'red'
                      : 'default'
                }
              >
                {doc.status === 'published' || doc.status === 'Aprovado'
                  ? 'Documento publicado'
                  : doc.status === 'rejected' || doc.status === 'Reprovado'
                    ? 'Documento reprovado'
                    : 'Documento cancelado'}
              </Tag>
            </div>
          )}
        </Card>
      )}

      {/* Tabs */}
      <Tabs
        defaultActiveKey="metadata"
        items={[
          {
            key: 'metadata',
            label: 'Metadados',
            children: metadataTabContent,
          },
          {
            key: 'workflow',
            label: 'Workflow',
            children: (
              <WorkflowTab
                workflowSteps={workflowSteps}
                currentStepOrderIndex={currentStepOrderIndex}
                isFinished={isFinished}
                docStatus={doc.status ?? ''}
              />
            ),
          },
          {
            key: 'info',
            label: 'Informações',
            children: (
              <Card>
                <Descriptions column={2}>
                  <Descriptions.Item label="Código">
                    {(doc as any).code ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Workflow">
                    {(doc as any).workflowName || '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Etapa Atual">
                    {doc.currentStepName ?? '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <StatusBadge status={doc.status} />
                  </Descriptions.Item>
                  <Descriptions.Item label="Criado por">
                    {doc.createdByUserName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Criado em">
                    {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm', {
                      locale: ptBR,
                    })}
                  </Descriptions.Item>
                  <Descriptions.Item label="Descrição" span={2}>
                    {(doc as any).description ?? '-'}
                  </Descriptions.Item>
                </Descriptions>

                {!isFinished && (
                  <Popconfirm
                    title="Cancelar documento?"
                    onConfirm={() => cancelMutation.mutate()}
                  >
                    <Button danger style={{ marginTop: 16 }}>
                      Cancelar Documento
                    </Button>
                  </Popconfirm>
                )}
              </Card>
            ),
          },
          {
            key: 'files',
            label: `Arquivos (${doc.files.length})`,
            children: (
              <Card
                extra={
                  <Upload
                    beforeUpload={(file) => {
                      uploadMutation.mutate(file)
                      return false
                    }}
                    showUploadList={false}
                  >
                    <Button
                      icon={<UploadOutlined />}
                      loading={uploadMutation.isPending}
                    >
                      Nova Versão
                    </Button>
                  </Upload>
                }
              >
                <Table
                  dataSource={doc.files}
                  columns={fileColumns}
                  rowKey="id"
                  pagination={false}
                  size="small"
                />
              </Card>
            ),
          },
          {
            key: 'tasks',
            label: `Tarefas (${doc.tasks.length})`,
            children: (
              <Card>
                <Table
                  dataSource={doc.tasks}
                  rowKey="id"
                  pagination={false}
                  size="small"
                  columns={[
                    { title: 'Etapa', dataIndex: 'stepName' },
                    { title: 'Responsável', dataIndex: 'assignedToUserName' },
                    {
                      title: 'Status',
                      key: 'status',
                      render: (_: any, record: any) => (
                        <StatusBadge status={record.status} />
                      ),
                    },
                    {
                      title: 'Ação Tomada',
                      dataIndex: 'actionTaken',
                      render: (value: any) =>
                        value ? getActionLabel(value) : '-',
                    },
                    {
                      title: 'Comentário',
                      dataIndex: 'comment',
                      render: (value: any) => value ?? '-',
                    },
                    {
                      title: 'Concluída',
                      key: 'completedAt',
                      render: (_: any, record: any) =>
                        record.completedAt
                          ? format(
                              new Date(record.completedAt),
                              'dd/MM/yyyy HH:mm',
                              { locale: ptBR },
                            )
                          : '-',
                    },
                  ]}
                />
              </Card>
            ),
          },
          {
            key: 'history',
            label: 'Histórico',
            children: (
              <Card>
                <Timeline logs={doc.auditLogs} />
              </Card>
            ),
          },
        ]}
      />

      {/* Modal de confirmação de ação */}
      <ActionConfirmModal
        open={modalAction !== null}
        action={modalAction}
        nextStep={modalAction ? findNextStep(modalAction) : null}
        taskId={myPendingTask?.id ?? ''}
        commentValue={commentValue}
        commentError={commentError}
        loading={taskMutation.isPending}
        onCommentChange={(value) => {
          setCommentValue(value)
          if (commentError) setCommentError(false)
        }}
        onConfirm={handleModalConfirm}
        onCancel={handleModalCancel}
      />
    </div>
  )
}