import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Form,
  Input,
  Button,
  Card,
  Typography,
  Space,
  message,
  Upload,
  Alert,
  Descriptions,
  Spin,
} from 'antd'
import {
  UploadOutlined,
  ArrowLeftOutlined,
  LockOutlined,
  ApartmentOutlined,
  FolderOpenOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons'
import { getOrgGroups } from '../../api/organization'
import { loadStoredWorkflows } from '../../api/workflowStorage'
import { createDocument, uploadFile } from '../../api/documents'
import {
  getMetadataDefinitions,
  type MetadataDefinitionDto,
  type MetadataValueDto,
} from '../../api/metadata'
import { MetadataForm } from '../../components/MetadataForm'
import { useAuthStore } from '../../store/authStore'
import { api } from '../../api/client'
import { getElementConfigsByWorkflow } from '../../features/workflows/storage'

const { Title, Text } = Typography

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

  if (
    perms.processIds?.some((pid: string) =>
      userProcessMemberships.some(
        (membership: any) =>
          membership.processId === pid && membership.isActive !== false,
      ),
    )
  ) {
    return true
  }

  if (
    perms.groupIds?.some((gid: string) =>
      userGroups.some(
        (group: any) =>
          group.id === gid && (group.memberIds ?? []).includes(userId),
      ),
    )
  ) {
    return true
  }

  return false
}

function mergeCreationFields(
  workflowId: string,
  workflowSteps: any[],
  metadataDefinitions: MetadataDefinitionDto[],
): MetadataValueDto[] {
  const initialStep =
    workflowSteps.find((step: any) => step.isInitial === true) ??
    workflowSteps[0] ??
    null

  if (!initialStep) return []

  const elementConfigs = getElementConfigsByWorkflow(workflowId)

  const startConfig =
    elementConfigs.find(
      (item) =>
        item.elementId === String(initialStep.id ?? '') && item.kind === 'start',
    ) ?? null

  const activityConfig =
    elementConfigs.find(
      (item) =>
        item.elementId === String(initialStep.id ?? '') &&
        item.kind === 'activity',
    ) ?? null

  const selectedConfig =
    startConfig?.config ??
    activityConfig?.config ??
    null

  const explicitFields = Array.isArray((selectedConfig as any)?.metadataFields)
    ? ((selectedConfig as any).metadataFields as Array<Record<string, unknown>>)
    : Array.isArray(initialStep?.metadataFields)
      ? (initialStep.metadataFields as Array<Record<string, unknown>>)
      : []

  const metadataDefinitionIds =
    Array.isArray((selectedConfig as any)?.initialMetadataDefinitionIds)
      ? ((selectedConfig as any).initialMetadataDefinitionIds as string[])
      : Array.isArray((selectedConfig as any)?.metadataDefinitionIds)
        ? ((selectedConfig as any).metadataDefinitionIds as string[])
        : []

  const fromDefinitions = metadataDefinitionIds
    .map((metadataDefinitionId) =>
      metadataDefinitions.find((item) => item.id === metadataDefinitionId),
    )
    .filter(Boolean)
    .map((definition) => ({
      metadataDefinitionId: String(definition!.id),
      name: String(definition!.name ?? definition!.label ?? definition!.id),
      label: String(definition!.label ?? definition!.name ?? definition!.id),
      fieldType: String(definition!.fieldType ?? 'text'),
      maskType:
        definition!.maskType === undefined ? null : definition!.maskType,
      isRequired: Boolean(definition!.isRequired),
      value: null,
      options: Array.isArray(definition!.options) ? definition!.options : [],
      tableColumns: Array.isArray(definition!.tableColumns)
        ? definition!.tableColumns
        : [],
    }))

  const fromExplicitFields = explicitFields.map((field) => {
    const metadataDefinitionId = String(field.metadataDefinitionId ?? '')
    const definition = metadataDefinitions.find(
      (item) => item.id === metadataDefinitionId,
    )

    return {
      metadataDefinitionId,
      name: String(
        field.name ??
          definition?.name ??
          field.label ??
          definition?.label ??
          metadataDefinitionId,
      ),
      label: String(
        field.label ??
          definition?.label ??
          field.name ??
          definition?.name ??
          metadataDefinitionId,
      ),
      fieldType: String(field.fieldType ?? definition?.fieldType ?? 'text'),
      maskType:
        field.maskType !== undefined
          ? String(field.maskType)
          : definition?.maskType ?? null,
      isRequired: Boolean(field.isRequired ?? definition?.isRequired ?? false),
      isReadOnly: Boolean(field.isReadOnly),
      value: null,
      options: Array.isArray(definition?.options) ? definition?.options : [],
      tableColumns: Array.isArray(definition?.tableColumns)
        ? definition?.tableColumns
        : [],
    }
  })

  const map = new Map<string, MetadataValueDto>()

  ;[...fromDefinitions, ...fromExplicitFields].forEach((field) => {
    const previous = map.get(field.metadataDefinitionId)

    map.set(field.metadataDefinitionId, {
      metadataDefinitionId: field.metadataDefinitionId,
      name: field.name ?? previous?.name ?? field.metadataDefinitionId,
      label: field.label ?? previous?.label ?? field.metadataDefinitionId,
      fieldType: field.fieldType ?? previous?.fieldType ?? 'text',
      maskType: field.maskType ?? previous?.maskType ?? null,
      isRequired: Boolean(field.isRequired || previous?.isRequired),
      value: null,
      options: field.options ?? previous?.options,
      tableColumns: field.tableColumns ?? previous?.tableColumns,
    })
  })

  return Array.from(map.values())
}

export function DocumentNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const qc = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const [form] = Form.useForm()
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)

  const paramWorkflowId = searchParams.get('workflowId')
  const paramProcessId = searchParams.get('processId')
  const paramProcessName = searchParams.get('processName')

  const { data: workflows = [], isLoading: loadingWorkflows } = useQuery({
    queryKey: ['stored-workflows'],
    queryFn: () => loadStoredWorkflows(),
    refetchOnWindowFocus: true,
    staleTime: 0,
  })

  const { data: metadataDefinitions = [] } = useQuery({
    queryKey: ['metadata-definitions'],
    queryFn: () => getMetadataDefinitions(),
  })

  const { data: userProcessMemberships = [] } = useQuery({
    queryKey: ['user-process-memberships', user?.id],
    queryFn: async () => {
      if (!user?.id) return []

      const response = await api.get('/user-process-memberships', {
        params: { userId: user.id },
      })

      return response.data ?? []
    },
    enabled: !!user?.id,
  })

  const { data: orgGroups = [] } = useQuery({
    queryKey: ['org-groups'],
    queryFn: getOrgGroups,
  })

  const workflow =
    (workflows as any[]).find((item: any) =>
      paramWorkflowId
        ? item.id === paramWorkflowId
        : paramProcessId
          ? item.processId === paramProcessId
          : false,
    ) ?? null

  const steps = (workflow?.steps as any[]) ?? []
  const initialStep =
    steps.find((step: any) => step.isInitial === true) ?? steps[0] ?? null

  const creationFields = useMemo(
    () =>
      workflow
        ? mergeCreationFields(
            String(workflow.id),
            steps,
            metadataDefinitions,
          )
        : [],
    [workflow, steps, metadataDefinitions],
  )

  const canCreate = workflow
    ? checkPermission(
        workflow.permissions?.creation,
        user?.id ?? '',
        user?.role ?? '',
        userProcessMemberships as any[],
        orgGroups as any[],
      )
    : false

  const mutation = useMutation({
    mutationFn: createDocument,
    onSuccess: async (data) => {
      if (fileToUpload && data.id) {
        try {
          await uploadFile(data.id, fileToUpload)
        } catch {
          // ignore
        }
      }

      qc.invalidateQueries({ queryKey: ['documents'] })
      message.success('Documento criado e posicionado na primeira etapa do fluxo!')
      navigate(`/documents/${data.id}`)
    },
    onError: (error: any) => {
      message.error(
        error?.response?.data?.error ??
          error?.message ??
          'Erro ao criar documento.',
      )
    },
  })

  const handleSubmit = (values: Record<string, any>) => {
    if (!canCreate) {
      message.error('Você não tem permissão para criar documentos neste processo.')
      return
    }

    if (!workflow) {
      message.error('Nenhum fluxo encontrado para este processo.')
      return
    }

    const initialMetadataValues = creationFields.reduce<Record<string, unknown>>(
      (accumulator, field) => {
        accumulator[field.metadataDefinitionId] = values[field.metadataDefinitionId]
        return accumulator
      },
      {},
    )

    mutation.mutate({
      title: values.title,
      workflowId: workflow.id,
      workflowName: workflow.name,
      accountId: user?.accountId ?? (workflow as any).accountId ?? '',
      processId: paramProcessId ?? workflow.processId ?? '',
      processName: paramProcessName ?? workflow.processName ?? '',
      createdById: user?.id ?? '',
      createdByName: user?.name ?? '',
      steps: workflow.steps ?? [],
      initialMetadataValues,
    })
  }

  useEffect(() => {
    if (!loadingWorkflows && !paramProcessId && !paramWorkflowId) {
      navigate('/documents')
    }
  }, [loadingWorkflows, paramProcessId, paramWorkflowId, navigate])

  if (loadingWorkflows) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={() => navigate('/documents')}
        >
          Voltar
        </Button>

        <Title level={4} style={{ margin: 0 }}>
          Novo Documento
        </Title>
      </Space>

      <Card
        style={{ marginBottom: 16, background: '#f6f8fa' }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <Descriptions size="small" column={2}>
          <Descriptions.Item label={<><FolderOpenOutlined /> Processo</>}>
            <Text strong>{paramProcessName ?? workflow?.processName ?? '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={<><ApartmentOutlined /> Fluxo vinculado</>}>
            {workflow ? (
              <Text strong>{workflow.name}</Text>
            ) : (
              <Text type="danger">
                <ExclamationCircleOutlined /> Nenhum fluxo encontrado para este processo
              </Text>
            )}
          </Descriptions.Item>

          {initialStep && (
            <Descriptions.Item label="Primeira etapa" span={2}>
              <Text type="secondary">
                O documento será criado diretamente em: <strong>{initialStep.name}</strong>
              </Text>
            </Descriptions.Item>
          )}
        </Descriptions>
      </Card>

      {!workflow && (
        <Alert
          type="warning"
          showIcon
          icon={<ExclamationCircleOutlined />}
          message="Nenhum fluxo cadastrado para este processo"
          description="Acesse as configurações do processo e cadastre um workflow antes de criar documentos."
          style={{ marginBottom: 16 }}
          action={
            <Button size="small" onClick={() => navigate('/documents')}>
              Voltar
            </Button>
          }
        />
      )}

      {workflow && !canCreate && (
        <Alert
          type="error"
          showIcon
          icon={<LockOutlined />}
          message="Sem permissão de criação"
          description={`Você não tem permissão para criar documentos no processo "${paramProcessName ?? workflow.processName}". Solicite ao administrador.`}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card style={{ marginBottom: 16 }}>
          <Form.Item
            label="Título do documento"
            name="title"
            rules={[
              { required: true, message: 'Informe o título do documento' },
            ]}
          >
            <Input
              placeholder="Ex.: Contrato de Prestação de Serviços — Empresa X"
              disabled={!workflow || !canCreate}
            />
          </Form.Item>

          {creationFields.length > 0 && (
            <>
              <Title level={5}>Metadados iniciais</Title>
              <MetadataForm fields={creationFields} form={form} />
            </>
          )}

          <Form.Item label="Arquivo inicial (opcional)">
            <Upload
              beforeUpload={(file) => {
                setFileToUpload(file)
                return false
              }}
              maxCount={1}
              disabled={!workflow || !canCreate}
            >
              <Button
                icon={<UploadOutlined />}
                disabled={!workflow || !canCreate}
              >
                Selecionar arquivo
              </Button>
            </Upload>
          </Form.Item>
        </Card>

        <Button
          type="primary"
          htmlType="submit"
          loading={mutation.isPending}
          disabled={!workflow || !canCreate}
          icon={!workflow || !canCreate ? <LockOutlined /> : undefined}
          size="large"
        >
          {!canCreate && workflow ? 'Sem permissão' : 'Criar Documento'}
        </Button>
      </Form>
    </div>
  )
}