import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  ClockCircleOutlined,
  DatabaseOutlined,
  DeleteOutlined,
  FileTextOutlined,
  HolderOutlined,
  PlusOutlined,
  TeamOutlined,
  ThunderboltOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons'

import {
  getMetadataDefinitions,
  type MetadataDefinitionListItem,
} from '../../../api/metadataDefinitions'
import { getMetadataSets, type MetadataSetDto } from '../../../api/metadataSets'
import type {
  ActivityAction,
  ActivityActionOutcome,
  ActivityMetadataFieldRule,
  WorkflowActivityConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

const { Text } = Typography

type ActivityConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowActivityConfig | null
  onSave: (
    values: Omit<WorkflowActivityConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void
}

type FormValues = {
  assignmentMode: 'user' | 'role' | 'area' | 'function'
  responsibleUserIds: string[]
  responsibleRoleIds: string[]
  responsibleAreaIds: string[]
  responsibleFunctionIds: string[]
  deadlineMode: 'hours' | 'days' | 'fixed-date'
  deadlineValue?: number | string

  metadataSetIds: string[]
  metadataDefinitionIds: string[]
  metadataFields: ActivityMetadataFieldRule[]

  notificationTemplateIds: string[]
  allowApprove: boolean
  allowReject: boolean
  allowRequestChanges: boolean
  allowForward: boolean
  actions: ActivityAction[]
  instructions?: string
  helpText?: string
}

const OUTCOME_OPTIONS: Array<{ label: string; value: ActivityActionOutcome }> = [
  { label: 'Avançar (aprovar)', value: 'approve' },
  { label: 'Reprovar', value: 'reject' },
  { label: 'Solicitar revisão', value: 'request-changes' },
  { label: 'Encaminhar', value: 'forward' },
  { label: 'Personalizado (gateway)', value: 'custom' },
]

const COLOR_OPTIONS: Array<{ label: string; value: ActivityAction['color'] }> = [
  { label: 'Verde', value: 'green' },
  { label: 'Vermelho', value: 'red' },
  { label: 'Laranja', value: 'orange' },
  { label: 'Azul', value: 'blue' },
  { label: 'Roxo', value: 'purple' },
  { label: 'Dourado', value: 'gold' },
  { label: 'Padrão', value: 'default' },
]

function migrateActionsFromBooleans(cfg: WorkflowActivityConfig | null): ActivityAction[] {
  if (cfg?.actions && cfg.actions.length > 0) return cfg.actions

  const migrated: ActivityAction[] = []

  if (cfg?.allowApprove ?? true) {
    migrated.push({
      id: crypto.randomUUID(),
      label: 'Aprovar',
      color: 'green',
      outcome: 'approve',
      requiresComment: false,
    })
  }

  if (cfg?.allowReject ?? true) {
    migrated.push({
      id: crypto.randomUUID(),
      label: 'Reprovar',
      color: 'red',
      outcome: 'reject',
      requiresComment: true,
    })
  }

  if (cfg?.allowRequestChanges ?? true) {
    migrated.push({
      id: crypto.randomUUID(),
      label: 'Solicitar revisão',
      color: 'orange',
      outcome: 'request-changes',
      requiresComment: true,
    })
  }

  if (cfg?.allowForward ?? false) {
    migrated.push({
      id: crypto.randomUUID(),
      label: 'Encaminhar',
      color: 'blue',
      outcome: 'forward',
      requiresComment: false,
    })
  }

  return migrated.length > 0
    ? migrated
    : [
        {
          id: crypto.randomUUID(),
          label: 'Aprovar',
          color: 'green',
          outcome: 'approve',
          requiresComment: false,
        },
        {
          id: crypto.randomUUID(),
          label: 'Reprovar',
          color: 'red',
          outcome: 'reject',
          requiresComment: true,
        },
        {
          id: crypto.randomUUID(),
          label: 'Solicitar revisão',
          color: 'orange',
          outcome: 'request-changes',
          requiresComment: true,
        },
      ]
}

function deriveBooleansFromActions(actions: ActivityAction[]) {
  return {
    allowApprove: actions.some((a) => a.outcome === 'approve'),
    allowReject: actions.some((a) => a.outcome === 'reject'),
    allowRequestChanges: actions.some((a) => a.outcome === 'request-changes'),
    allowForward: actions.some((a) => a.outcome === 'forward'),
  }
}

const tabPaneStyle: CSSProperties = {
  padding: '20px 24px 4px',
  minHeight: 280,
}

const sectionLabelStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
  color: '#94a3b8',
  marginBottom: 12,
  display: 'block',
}

function dedupeStrings(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)))
}

function createMetadataFieldRule(
  definition?: MetadataDefinitionListItem,
  fallbackId?: string,
  existing?: ActivityMetadataFieldRule,
): ActivityMetadataFieldRule {
  return {
    metadataDefinitionId: definition?.id ?? fallbackId ?? '',
    name: definition?.name ?? existing?.name,
    label: definition?.label ?? existing?.label,
    fieldType: definition?.fieldType ?? existing?.fieldType,
    metadataSetId: definition?.metadataSetId ?? existing?.metadataSetId,
    metadataSetName: definition?.metadataSetName ?? existing?.metadataSetName,
    isRequired: existing?.isRequired ?? Boolean(definition?.isRequired),
    isReadOnly: existing?.isReadOnly ?? false,
  }
}

function sortMetadataFields(fields: ActivityMetadataFieldRule[]) {
  return [...fields].sort((a, b) => {
    const setCompare = (a.metadataSetName ?? '').localeCompare(b.metadataSetName ?? '')
    if (setCompare !== 0) return setCompare
    return (a.label ?? a.name ?? '').localeCompare(b.label ?? b.name ?? '')
  })
}

export function ActivityConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: ActivityConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const deadlineMode = Form.useWatch('deadlineMode', form)

  const [selectedMetadataSetIds, setSelectedMetadataSetIds] = useState<string[]>([])
  const [manualMetadataDefinitionIds, setManualMetadataDefinitionIds] = useState<string[]>([])
  const [metadataFieldRules, setMetadataFieldRules] = useState<ActivityMetadataFieldRule[]>([])

  const initializationKeyRef = useRef('')

  const {
    data: metadataDefinitions = [],
    isLoading: metadataDefinitionsLoading,
    isError: metadataDefinitionsError,
  } = useQuery({
    queryKey: ['workflow-activity-metadata-definitions'],
    queryFn: () => getMetadataDefinitions(),
    staleTime: 1000 * 60 * 5,
  })

  const {
    data: metadataSets = [],
    isLoading: metadataSetsLoading,
    isError: metadataSetsError,
  } = useQuery({
    queryKey: ['workflow-activity-metadata-sets'],
    queryFn: () => getMetadataSets(),
    staleTime: 1000 * 60 * 5,
  })

  const metadataDefinitionMap = useMemo(() => {
    const map = new Map<string, MetadataDefinitionListItem>()
    metadataDefinitions.forEach((item) => {
      map.set(item.id, item)
    })
    return map
  }, [metadataDefinitions])

  const metadataSetsOptions = useMemo(
    () =>
      metadataSets
        .filter((item) => item.isActive !== false)
        .sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name))
        .map((item: MetadataSetDto) => ({
          value: item.id,
          label: `${item.name} (${item.code})`,
        })),
    [metadataSets],
  )

  const groupedMetadataOptions = useMemo(() => {
    const groups = new Map<
      string,
      { label: string; options: Array<{ value: string; label: string }> }
    >()

    metadataDefinitions.forEach((item) => {
      const groupKey = item.metadataSetId ?? '__sem_conjunto__'
      const groupLabel = item.metadataSetName || 'Sem conjunto'

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          label: groupLabel,
          options: [],
        })
      }

      groups.get(groupKey)!.options.push({
        value: item.id,
        label: `${item.label} (${item.name}) • ${item.fieldType}${
          item.isRequired ? ' • obrigatório padrão' : ''
        }`,
      })
    })

    return Array.from(groups.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [metadataDefinitions])

  const metadataDefinitionIdsFromSets = useMemo(() => {
    return dedupeStrings(
      metadataDefinitions
        .filter(
          (definition) =>
            !!definition.metadataSetId &&
            selectedMetadataSetIds.includes(definition.metadataSetId),
        )
        .map((definition) => definition.id),
    )
  }, [metadataDefinitions, selectedMetadataSetIds])

  const selectedMetadataDefinitionIds = useMemo(() => {
    return dedupeStrings([
      ...metadataDefinitionIdsFromSets,
      ...manualMetadataDefinitionIds,
    ])
  }, [metadataDefinitionIdsFromSets, manualMetadataDefinitionIds])

  const resolvedMetadataFields = useMemo(() => {
    const currentMap = new Map<string, ActivityMetadataFieldRule>()

    metadataFieldRules.forEach((field) => {
      currentMap.set(field.metadataDefinitionId, field)
    })

    return sortMetadataFields(
      selectedMetadataDefinitionIds.map((id) => {
        const current = currentMap.get(id)
        const definition = metadataDefinitionMap.get(id)

        return createMetadataFieldRule(definition, id, current)
      }),
    )
  }, [metadataFieldRules, selectedMetadataDefinitionIds, metadataDefinitionMap])

  const syncMetadataState = (
    nextSetIds: string[],
    nextManualIds: string[],
    nextFields?: ActivityMetadataFieldRule[],
  ) => {
    const normalizedManualIds = dedupeStrings(nextManualIds)
    const idsFromSets = dedupeStrings(
      metadataDefinitions
        .filter(
          (definition) =>
            !!definition.metadataSetId &&
            nextSetIds.includes(definition.metadataSetId),
        )
        .map((definition) => definition.id),
    )

    const effectiveIds = dedupeStrings([...idsFromSets, ...normalizedManualIds])

    const baseMap = new Map<string, ActivityMetadataFieldRule>()
    metadataFieldRules.forEach((field) => {
      baseMap.set(field.metadataDefinitionId, field)
    })
    resolvedMetadataFields.forEach((field) => {
      baseMap.set(field.metadataDefinitionId, field)
    })
    ;(nextFields ?? []).forEach((field) => {
      baseMap.set(field.metadataDefinitionId, field)
    })

    const normalizedFields = sortMetadataFields(
      effectiveIds.map((id) => {
        const existing = baseMap.get(id)
        const definition = metadataDefinitionMap.get(id)
        return createMetadataFieldRule(definition, id, existing)
      }),
    )

    setSelectedMetadataSetIds(nextSetIds)
    setManualMetadataDefinitionIds(normalizedManualIds)
    setMetadataFieldRules(normalizedFields)

    form.setFieldsValue({
      metadataSetIds: nextSetIds,
      metadataDefinitionIds: effectiveIds,
      metadataFields: normalizedFields,
    })
  }

  useEffect(() => {
    if (!selectedElement || selectedElement.kind !== 'activity') return
    if (metadataDefinitionsLoading) return

    const currentKey = [
      workflowId,
      selectedElement.id,
      initialConfig?.updatedAt ?? 'new',
      metadataDefinitions.length,
    ].join('::')

    if (initializationKeyRef.current === currentKey) {
      return
    }

    const initialMetadataFields =
      initialConfig?.metadataFields && initialConfig.metadataFields.length > 0
        ? initialConfig.metadataFields
        : (initialConfig?.metadataDefinitionIds ?? []).map((id) =>
            createMetadataFieldRule(metadataDefinitionMap.get(id), id),
          )

    const initialMetadataDefinitionIds =
      initialMetadataFields.length > 0
        ? initialMetadataFields.map((field) => field.metadataDefinitionId)
        : []

    const initialSetIds = initialConfig?.metadataSetIds ?? []

    const idsComingFromSets = new Set(
      metadataDefinitions
        .filter(
          (definition) =>
            !!definition.metadataSetId &&
            initialSetIds.includes(definition.metadataSetId),
        )
        .map((definition) => definition.id),
    )

    const initialManualIds = initialMetadataDefinitionIds.filter(
      (id) => !idsComingFromSets.has(id),
    )

    form.setFieldsValue({
      assignmentMode: initialConfig?.assignmentMode ?? 'role',
      responsibleUserIds: initialConfig?.responsibleUserIds ?? [],
      responsibleRoleIds: initialConfig?.responsibleRoleIds ?? [],
      responsibleAreaIds: initialConfig?.responsibleAreaIds ?? [],
      responsibleFunctionIds: initialConfig?.responsibleFunctionIds ?? [],
      deadlineMode: initialConfig?.deadlineMode ?? 'days',
      deadlineValue: initialConfig?.deadlineValue,

      metadataSetIds: initialSetIds,
      metadataDefinitionIds: initialMetadataDefinitionIds,
      metadataFields: initialMetadataFields,

      notificationTemplateIds: initialConfig?.notificationTemplateIds ?? [],
      allowApprove: initialConfig?.allowApprove ?? true,
      allowReject: initialConfig?.allowReject ?? true,
      allowRequestChanges: initialConfig?.allowRequestChanges ?? true,
      allowForward: initialConfig?.allowForward ?? false,
      actions: migrateActionsFromBooleans(initialConfig),
      instructions: initialConfig?.instructions,
      helpText: initialConfig?.helpText,
    })

    setSelectedMetadataSetIds(initialSetIds)
    setManualMetadataDefinitionIds(initialManualIds)
    setMetadataFieldRules(sortMetadataFields(initialMetadataFields))

    initializationKeyRef.current = currentKey
  }, [
    form,
    workflowId,
    selectedElement,
    initialConfig,
    metadataDefinitions,
    metadataDefinitionsLoading,
    metadataDefinitionMap,
  ])

  if (!selectedElement || selectedElement.kind !== 'activity') {
    return <Empty description="Selecione uma atividade no fluxo" style={{ padding: 32 }} />
  }

  const handleMetadataSetsChange = (nextSetIds: string[]) => {
    syncMetadataState(nextSetIds, manualMetadataDefinitionIds)
  }

  const handleMetadataDefinitionsChange = (nextIds: string[]) => {
    const remainingSetIds = selectedMetadataSetIds.filter((setId) => {
      const idsFromSet = metadataDefinitions
        .filter((definition) => definition.metadataSetId === setId)
        .map((definition) => definition.id)

      if (idsFromSet.length === 0) return false

      return idsFromSet.every((id) => nextIds.includes(id))
    })

    const idsFromRemainingSets = dedupeStrings(
      metadataDefinitions
        .filter(
          (definition) =>
            !!definition.metadataSetId &&
            remainingSetIds.includes(definition.metadataSetId),
        )
        .map((definition) => definition.id),
    )

    const nextManualIds = nextIds.filter((id) => !idsFromRemainingSets.includes(id))

    syncMetadataState(remainingSetIds, nextManualIds)
  }

  const updateMetadataField = (
    metadataDefinitionId: string,
    patch: Partial<ActivityMetadataFieldRule>,
  ) => {
    const nextFields = resolvedMetadataFields.map((field) =>
      field.metadataDefinitionId === metadataDefinitionId
        ? { ...field, ...patch }
        : field,
    )

    setMetadataFieldRules(sortMetadataFields(nextFields))

    form.setFieldsValue({
      metadataSetIds: selectedMetadataSetIds,
      metadataDefinitionIds: selectedMetadataDefinitionIds,
      metadataFields: sortMetadataFields(nextFields),
    })
  }

  const removeMetadataField = (metadataDefinitionId: string) => {
    const nextIds = selectedMetadataDefinitionIds.filter((id) => id !== metadataDefinitionId)
    handleMetadataDefinitionsChange(nextIds)
  }

  const handleSubmit = (values: FormValues) => {
    const actions = (values.actions ?? []).map((a) => ({
      ...a,
      id: a.id || crypto.randomUUID(),
      requiresComment: a.requiresComment ?? false,
    }))

    const normalizedMetadataFields = sortMetadataFields(
      resolvedMetadataFields.filter((field) => field.metadataDefinitionId),
    )

    onSave({
      workflowId,
      elementId: selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      assignmentMode: values.assignmentMode,
      responsibleUserIds: values.responsibleUserIds ?? [],
      responsibleRoleIds: values.responsibleRoleIds ?? [],
      responsibleAreaIds: values.responsibleAreaIds ?? [],
      responsibleFunctionIds: values.responsibleFunctionIds ?? [],
      deadlineMode: values.deadlineMode,
      deadlineValue: values.deadlineValue,

      metadataSetIds: selectedMetadataSetIds,
      metadataDefinitionIds: normalizedMetadataFields.map(
        (field) => field.metadataDefinitionId,
      ),
      metadataFields: normalizedMetadataFields,

      notificationTemplateIds: values.notificationTemplateIds ?? [],
      ...deriveBooleansFromActions(actions),
      actions,
      instructions: values.instructions,
      helpText: values.helpText,
    })
  }

  return (
    <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>
      <Tabs
        size="small"
        tabBarStyle={{
          margin: 0,
          paddingLeft: 24,
          paddingRight: 24,
          borderBottom: '1px solid #f1f5f9',
          background: '#fafbfc',
        }}
        items={[
          {
            key: 'responsible',
            label: (
              <Space size={6}>
                <TeamOutlined />
                <span>Responsáveis</span>
              </Space>
            ),
            children: (
              <div style={tabPaneStyle}>
                <Text style={sectionLabelStyle}>Modo de atribuição</Text>

                <Form.Item name="assignmentMode" style={{ marginBottom: 20 }}>
                  <Select
                    options={[
                      { label: 'Por usuário', value: 'user' },
                      { label: 'Por função', value: 'function' },
                      { label: 'Por cargo', value: 'role' },
                      { label: 'Por área', value: 'area' },
                    ]}
                  />
                </Form.Item>

                <Text style={sectionLabelStyle}>Destinatários</Text>

                <Form.Item label="Usuários" name="responsibleUserIds" style={{ marginBottom: 12 }}>
                  <Select mode="tags" placeholder="Ex.: douglas, maria" />
                </Form.Item>

                <Form.Item label="Cargos" name="responsibleRoleIds" style={{ marginBottom: 12 }}>
                  <Select mode="tags" placeholder="Ex.: aprovador, revisor" />
                </Form.Item>

                <Form.Item label="Áreas" name="responsibleAreaIds" style={{ marginBottom: 12 }}>
                  <Select mode="tags" placeholder="Ex.: qualidade, engenharia" />
                </Form.Item>

                <Form.Item
                  label="Funções"
                  name="responsibleFunctionIds"
                  style={{ marginBottom: 0 }}
                >
                  <Select mode="tags" placeholder="Ex.: elaborador, gestor" />
                </Form.Item>
              </div>
            ),
          },

          {
            key: 'deadline',
            label: (
              <Space size={6}>
                <ClockCircleOutlined />
                <span>Prazo</span>
              </Space>
            ),
            children: (
              <div style={tabPaneStyle}>
                <Text style={sectionLabelStyle}>Prazo da atividade</Text>

                <Row gutter={12} style={{ marginBottom: 24 }}>
                  <Col span={12}>
                    <Form.Item label="Modo" name="deadlineMode" style={{ marginBottom: 0 }}>
                      <Select
                        options={[
                          { label: 'Horas', value: 'hours' },
                          { label: 'Dias', value: 'days' },
                          { label: 'Data fixa', value: 'fixed-date' },
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={12}>
                    <Form.Item label="Valor" name="deadlineValue" style={{ marginBottom: 0 }}>
                      {deadlineMode === 'fixed-date' ? (
                        <Input placeholder="AAAA-MM-DD" />
                      ) : (
                        <InputNumber
                          style={{ width: '100%' }}
                          min={1}
                          placeholder="Ex.: 2"
                        />
                      )}
                    </Form.Item>
                  </Col>
                </Row>

                <Text style={sectionLabelStyle}>Notificações</Text>

                <Form.Item
                  label="Templates de notificação"
                  name="notificationTemplateIds"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    mode="tags"
                    placeholder="Ex.: notif-aprovacao, notif-prazo"
                  />
                </Form.Item>
              </div>
            ),
          },

          {
            key: 'metadata',
            label: (
              <Space size={6}>
                <DatabaseOutlined />
                <span>Metadados</span>
              </Space>
            ),
            children: (
              <div style={tabPaneStyle}>
                <Text style={sectionLabelStyle}>Conjuntos de metadados</Text>

                {metadataSetsError ? (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Não foi possível carregar os conjuntos de metadados"
                  />
                ) : null}

                <Form.Item label="Conjuntos" style={{ marginBottom: 16 }}>
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    value={selectedMetadataSetIds}
                    onChange={handleMetadataSetsChange}
                    loading={metadataSetsLoading}
                    placeholder={
                      metadataSetsLoading
                        ? 'Carregando conjuntos...'
                        : 'Selecione um ou mais conjuntos'
                    }
                    options={metadataSetsOptions}
                    optionFilterProp="label"
                  />
                </Form.Item>

                <Text
                  type="secondary"
                  style={{ display: 'block', marginBottom: 20, fontSize: 12 }}
                >
                  Ao selecionar um conjunto, todos os metadados pertencentes a ele são adicionados automaticamente.
                </Text>

                <Text style={sectionLabelStyle}>Metadados da atividade</Text>

                {metadataDefinitionsError ? (
                  <Alert
                    type="error"
                    showIcon
                    style={{ marginBottom: 16 }}
                    message="Não foi possível carregar os metadados do sistema"
                  />
                ) : null}

                <Form.Item label="Metadados selecionados" style={{ marginBottom: 16 }}>
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    value={selectedMetadataDefinitionIds}
                    onChange={handleMetadataDefinitionsChange}
                    loading={metadataDefinitionsLoading}
                    placeholder={
                      metadataDefinitionsLoading
                        ? 'Carregando metadados...'
                        : 'Selecione os metadados da atividade'
                    }
                    options={groupedMetadataOptions}
                    optionFilterProp="label"
                    filterOption={(input, option) => {
                      const label = String(option?.label ?? '').toLowerCase()
                      return label.includes(input.toLowerCase())
                    }}
                  />
                </Form.Item>

                {resolvedMetadataFields.length === 0 ? (
                  <Alert
                    type="warning"
                    showIcon
                    message="Nenhum metadado selecionado"
                    description="Selecione conjuntos ou metadados específicos para configurar esta atividade."
                    style={{ borderRadius: 10 }}
                  />
                ) : (
                  <Space direction="vertical" size={10} style={{ width: '100%' }}>
                    {resolvedMetadataFields.map((field) => (
                      <div
                        key={field.metadataDefinitionId}
                        style={{
                          border: '1px solid #e2e8f0',
                          borderRadius: 12,
                          padding: 14,
                          background: '#f8fafc',
                        }}
                      >
                        <Row gutter={[12, 12]} align="middle">
                          <Col xs={24} md={10}>
                            <Space direction="vertical" size={2}>
                              <Text strong>{field.label || field.name || field.metadataDefinitionId}</Text>

                              <Space wrap size={6}>
                                {field.name ? <Tag>{field.name}</Tag> : null}
                                {field.fieldType ? <Tag color="blue">{field.fieldType}</Tag> : null}
                                {field.metadataSetName ? (
                                  <Tag color="purple" icon={<FolderOpenOutlined />}>
                                    {field.metadataSetName}
                                  </Tag>
                                ) : null}
                              </Space>
                            </Space>
                          </Col>

                          <Col xs={12} md={5}>
                            <Space direction="vertical" size={4}>
                              <Text style={{ fontSize: 12 }}>Obrigatório</Text>
                              <Switch
                                checked={field.isRequired}
                                onChange={(checked) =>
                                  updateMetadataField(field.metadataDefinitionId, {
                                    isRequired: checked,
                                  })
                                }
                              />
                            </Space>
                          </Col>

                          <Col xs={12} md={5}>
                            <Space direction="vertical" size={4}>
                              <Text style={{ fontSize: 12 }}>Somente leitura</Text>
                              <Switch
                                checked={field.isReadOnly}
                                onChange={(checked) =>
                                  updateMetadataField(field.metadataDefinitionId, {
                                    isReadOnly: checked,
                                  })
                                }
                              />
                            </Space>
                          </Col>

                          <Col xs={24} md={4} style={{ textAlign: 'right' }}>
                            <Tooltip title="Remover metadado">
                              <Button
                                danger
                                type="text"
                                icon={<DeleteOutlined />}
                                onClick={() => removeMetadataField(field.metadataDefinitionId)}
                              >
                                Remover
                              </Button>
                            </Tooltip>
                          </Col>
                        </Row>
                      </div>
                    ))}
                  </Space>
                )}

                <Text
                  type="secondary"
                  style={{ display: 'block', marginTop: 10, fontSize: 12 }}
                >
                  “Somente leitura” deixa o campo visível na etapa, mas sem permitir edição pelo executor.
                </Text>
              </div>
            ),
          },

          {
            key: 'actions',
            label: (
              <Space size={6}>
                <ThunderboltOutlined />
                <span>Ações</span>
              </Space>
            ),
            children: (
              <div style={tabPaneStyle}>
                <Text style={sectionLabelStyle}>Ações disponíveis para o executor</Text>

                <Text
                  type="secondary"
                  style={{ fontSize: 12, display: 'block', marginBottom: 16 }}
                >
                  Cada ação pode ser roteada para um caminho diferente no gateway seguinte.
                </Text>

                <Form.List name="actions">
                  {(fields, { add, remove }) => (
                    <Space direction="vertical" style={{ width: '100%' }} size={8}>
                      {fields.length === 0 && (
                        <Alert
                          type="warning"
                          showIcon
                          message="Nenhuma ação configurada"
                          description="Adicione pelo menos uma ação para que o executor possa interagir."
                          style={{ borderRadius: 10 }}
                        />
                      )}

                      {fields.map(({ key, name }) => (
                        <ActionRow
                          key={key}
                          name={name}
                          form={form}
                          onRemove={() => remove(name)}
                        />
                      ))}

                      <Button
                        type="dashed"
                        block
                        icon={<PlusOutlined />}
                        style={{ borderRadius: 8, height: 36 }}
                        onClick={() =>
                          add({
                            id: crypto.randomUUID(),
                            label: 'Nova ação',
                            color: 'default',
                            outcome: 'custom',
                            requiresComment: false,
                          })
                        }
                      >
                        Adicionar ação
                      </Button>
                    </Space>
                  )}
                </Form.List>
              </div>
            ),
          },

          {
            key: 'instructions',
            label: (
              <Space size={6}>
                <FileTextOutlined />
                <span>Instruções</span>
              </Space>
            ),
            children: (
              <div style={tabPaneStyle}>
                <Text style={sectionLabelStyle}>Orientações para o executor</Text>

                <Form.Item
                  label="Instruções da atividade"
                  name="instructions"
                  style={{ marginBottom: 16 }}
                >
                  <Input.TextArea
                    rows={5}
                    placeholder="Explique o que deve ser feito nesta etapa, critérios de aprovação, documentos necessários..."
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>

                <Form.Item label="Texto de apoio" name="helpText" style={{ marginBottom: 0 }}>
                  <Input.TextArea
                    rows={4}
                    placeholder="Dicas adicionais, links úteis, exemplos..."
                    style={{ borderRadius: 8 }}
                  />
                </Form.Item>
              </div>
            ),
          },
        ]}
      />

      <div
        style={{
          padding: '14px 24px',
          borderTop: '1px solid #f1f5f9',
          background: '#fafbfc',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button
          type="primary"
          htmlType="submit"
          style={{
            borderRadius: 8,
            background: '#0f172a',
            borderColor: '#0f172a',
            fontWeight: 600,
            paddingLeft: 28,
            paddingRight: 28,
          }}
        >
          Salvar configuração
        </Button>
      </div>
    </Form>
  )
}

function ActionRow({
  name,
  form,
  onRemove,
}: {
  name: number
  form: ReturnType<typeof Form.useForm<FormValues>>[0]
  onRemove: () => void
}) {
  const color: ActivityAction['color'] =
    Form.useWatch(['actions', name, 'color'], form) ?? 'default'
  const label: string =
    Form.useWatch(['actions', name, 'label'], form) ?? ''

  return (
    <div
      style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderRadius: 12,
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <HolderOutlined style={{ color: '#cbd5e1', cursor: 'grab', flexShrink: 0 }} />

        <Form.Item
          name={[name, 'label']}
          noStyle
          rules={[{ required: true, message: 'Informe o nome' }]}
        >
          <Input
            placeholder="Nome da ação"
            variant="borderless"
            style={{ fontWeight: 600, padding: '0 4px', flex: 1 }}
          />
        </Form.Item>

        <Tag color={color} style={{ margin: 0, flexShrink: 0 }}>
          {label || 'Ação'}
        </Tag>

        <Tooltip title="Remover">
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={onRemove}
            style={{ flexShrink: 0 }}
          />
        </Tooltip>
      </div>

      <Row gutter={[10, 0]} align="middle">
        <Col xs={8}>
          <Form.Item label="Cor" name={[name, 'color']} style={{ marginBottom: 0 }}>
            <Select size="small" options={COLOR_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={10}>
          <Form.Item label="Comportamento" name={[name, 'outcome']} style={{ marginBottom: 0 }}>
            <Select size="small" options={OUTCOME_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={6} style={{ paddingTop: 22 }}>
          <Form.Item
            name={[name, 'requiresComment']}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch
              size="small"
              checkedChildren="Comentário"
              unCheckedChildren="Opcional"
            />
          </Form.Item>
        </Col>
      </Row>
    </div>
  )
}