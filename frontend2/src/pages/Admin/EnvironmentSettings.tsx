import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Tabs,
  Typography,
  message,
} from 'antd'
import {
  BellOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  SaveOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import {
  getEnvironmentSettings,
  saveEnvironmentSettings,
} from '../../api/environmentSettings'
import {
  getMetadataDefinitions,
  type MetadataDefinitionListItem,
} from '../../api/metadataDefinitions'
import { useAuthStore } from '../../store/authStore'
import type { EnvironmentSettings, CodingRulePart } from '../../types/environmentSettings'
import { WorkflowsPage } from '../Workflows/WorkflowsPage'
import { NotificationTemplatesPage } from '../Notifications/NotificationTemplatesPage'

const { Title, Text } = Typography

const DEFAULT_VALUES: EnvironmentSettings = {
  revision: {
    pattern: 'numeric',
    initialValue: '00',
    autoIncrementOnApproval: true,
    allowManualEdition: false,
  },
  creationMode: {
    mode: 'both',
    requireTemplateInBatch: true,
  },
  codingRule: {
    parts: [
      { type: 'fixed', fixedValue: 'DOC', separatorAfter: '-' },
      { type: 'year', separatorAfter: '-' },
      { type: 'sequential', separatorAfter: '' },
    ],
  },
  sequential: {
    startAt: 1,
    digits: 4,
    resetPeriod: 'yearly',
  },
  deadlines: {
    totalProcessDays: 15,
  },
}

function normalizeSettings(values?: Partial<EnvironmentSettings> | null): EnvironmentSettings {
  return {
    revision: {
      ...DEFAULT_VALUES.revision,
      ...(values?.revision ?? {}),
    },
    creationMode: {
      ...DEFAULT_VALUES.creationMode,
      ...(values?.creationMode ?? {}),
    },
    codingRule: {
      parts:
        values?.codingRule?.parts?.length
          ? values.codingRule.parts.map(part => ({
              ...part,
              separatorAfter: part.separatorAfter ?? '',
            }))
          : DEFAULT_VALUES.codingRule.parts,
    },
    sequential: {
      ...DEFAULT_VALUES.sequential,
      ...(values?.sequential ?? {}),
    },
    deadlines: {
      ...DEFAULT_VALUES.deadlines,
      ...(values?.deadlines ?? {}),
    },
  }
}

function buildPartPreview(
  part: CodingRulePart,
  metadataDefinitions: MetadataDefinitionListItem[],
  settings: EnvironmentSettings,
) {
  switch (part.type) {
    case 'fixed':
      return part.fixedValue?.trim() || 'FIXO'
    case 'metadata': {
      const metadata =
        metadataDefinitions.find(item => item.id === part.metadataDefinitionId) ?? null
      return `{${part.metadataLabel || metadata?.label || metadata?.name || 'METADADO'}}`
    }
    case 'year':
      return '2026'
    case 'unit':
      return 'UN'
    case 'area':
      return 'AREA'
    case 'process':
      return 'PROC'
    case 'sequential':
      return String(settings.sequential.startAt).padStart(settings.sequential.digits, '0')
    default:
      return ''
  }
}

function buildCodePreview(
  values: EnvironmentSettings,
  metadataDefinitions: MetadataDefinitionListItem[],
) {
  return values.codingRule.parts
    .map(part => {
      const value = buildPartPreview(part, metadataDefinitions, values)
      const separator = part.separatorAfter ?? ''
      return `${value}${separator}`
    })
    .join('')
}

export function EnvironmentSettingsPage() {
  const [form] = Form.useForm<EnvironmentSettings>()
  const [activeTab, setActiveTab] = useState('environment')
  const user = useAuthStore(s => s.user)

  const tenantId = user?.tenantId

  const { data, isLoading } = useQuery<EnvironmentSettings>({
    queryKey: ['environment-settings', tenantId],
    queryFn: () => getEnvironmentSettings(tenantId as string),
    enabled: !!tenantId,
  })

  const { data: metadataDefinitions = [] } = useQuery<MetadataDefinitionListItem[]>({
    queryKey: ['metadata-definitions'],
    queryFn: () => getMetadataDefinitions(),
  })

  const saveMutation = useMutation({
    mutationFn: (values: EnvironmentSettings) =>
      saveEnvironmentSettings(tenantId as string, values),
    onSuccess: saved => {
      form.setFieldsValue(normalizeSettings(saved))
      message.success('Configurações salvas com sucesso.')
    },
    onError: () => {
      message.error('Não foi possível salvar as configurações.')
    },
  })

  useEffect(() => {
    form.setFieldsValue(normalizeSettings(data))
  }, [data, form])

  const watchedValues = Form.useWatch([], form)

  const safeValues = useMemo(
    () => normalizeSettings(watchedValues as Partial<EnvironmentSettings> | undefined),
    [watchedValues],
  )

  const previewCode = useMemo(() => {
    return buildCodePreview(safeValues, metadataDefinitions)
  }, [safeValues, metadataDefinitions])

  const hasSequentialPart = useMemo(() => {
    return safeValues.codingRule.parts.some(part => part.type === 'sequential')
  }, [safeValues])

  const metadataOptions = useMemo(
    () =>
      metadataDefinitions.map(item => ({
        label: item.label || item.name,
        value: item.id,
      })),
    [metadataDefinitions],
  )

  const handleRevisionPatternChange = (
    value: 'numeric' | 'alphabetic' | 'alphanumeric',
  ) => {
    const currentInitialValue = form.getFieldValue(['revision', 'initialValue'])

    if (
      !currentInitialValue ||
      currentInitialValue === '00' ||
      currentInitialValue === 'AA' ||
      currentInitialValue === 'A1'
    ) {
      const nextValue =
        value === 'alphabetic' ? 'AA' : value === 'alphanumeric' ? 'A1' : '00'

      form.setFieldValue(['revision', 'initialValue'], nextValue)
    }
  }

  const handleSubmit = async (values: EnvironmentSettings) => {
    if (!tenantId) {
      message.error('Tenant não encontrado para o usuário logado.')
      return
    }

    const normalized = normalizeSettings(values)

    normalized.codingRule.parts = normalized.codingRule.parts.map(part => {
      if (part.type !== 'metadata') return part

      const metadata =
        metadataDefinitions.find(item => item.id === part.metadataDefinitionId) ?? null

      return {
        ...part,
        metadataLabel: metadata?.label || metadata?.name || 'METADADO',
      }
    })

    await saveMutation.mutateAsync(normalized)
  }

  if (!tenantId) {
    return (
      <Alert
        type="error"
        showIcon
        message="Não foi possível identificar a organização do usuário logado."
      />
    )
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      <div>
        <Title level={3} style={{ marginBottom: 4 }}>
          <SettingOutlined /> Configurações do ambiente
        </Title>
        <Text type="secondary">
          Gerencie regras globais do ambiente, workflows e notificações do sistema.
        </Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'environment',
            label: 'Configurações de ambiente',
            children: (
              <>
                <Alert
                  type="info"
                  showIcon
                  message="Estas configurações impactam a forma como documentos e processos serão criados no ambiente."
                  style={{ marginBottom: 16 }}
                />

                <Form<EnvironmentSettings>
                  form={form}
                  layout="vertical"
                  onFinish={handleSubmit}
                  initialValues={DEFAULT_VALUES}
                >
                  <Row gutter={[16, 16]}>
                    <Col xs={24} xl={12}>
                      <Card title="Revisão">
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Padrão de revisão"
                              name={['revision', 'pattern']}
                              rules={[{ required: true, message: 'Selecione o padrão de revisão' }]}
                            >
                              <Radio.Group
                                onChange={e => handleRevisionPatternChange(e.target.value)}
                              >
                                <Radio value="numeric">Numérica</Radio>
                                <Radio value="alphabetic">Alfabética</Radio>
                                <Radio value="alphanumeric">Alfanumérica</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item noStyle shouldUpdate>
                              {({ getFieldValue }) => {
                                const pattern = getFieldValue(['revision', 'pattern']) as
                                  | 'numeric'
                                  | 'alphabetic'
                                  | 'alphanumeric'
                                  | undefined

                                const placeholder =
                                  pattern === 'alphabetic'
                                    ? 'Ex: AA'
                                    : pattern === 'alphanumeric'
                                      ? 'Ex: A1'
                                      : 'Ex: 00'

                                return (
                                  <Form.Item
                                    label="Valor inicial"
                                    name={['revision', 'initialValue']}
                                    rules={[
                                      { required: true, message: 'Informe o valor inicial' },
                                    ]}
                                  >
                                    <Input placeholder={placeholder} />
                                  </Form.Item>
                                )
                              }}
                            </Form.Item>
                          </Col>

                          <Col xs={24} md={12}>
                            <Form.Item
                              label="Incrementar ao aprovar"
                              name={['revision', 'autoIncrementOnApproval']}
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>

                          <Col span={24}>
                            <Form.Item
                              label="Permitir edição manual da revisão"
                              name={['revision', 'allowManualEdition']}
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col xs={24} xl={12}>
                      <Card title="Modo de criação">
                        <Row gutter={16}>
                          <Col span={24}>
                            <Form.Item
                              label="Forma de criação"
                              name={['creationMode', 'mode']}
                              rules={[{ required: true, message: 'Selecione o modo de criação' }]}
                            >
                              <Radio.Group>
                                <Radio value="manual">Somente manual</Radio>
                                <Radio value="batch">Somente em lote</Radio>
                                <Radio value="both">Manual e em lote</Radio>
                              </Radio.Group>
                            </Form.Item>
                          </Col>

                          <Col span={24}>
                            <Form.Item
                              label="Exigir template na criação em lote"
                              name={['creationMode', 'requireTemplateInBatch']}
                              valuePropName="checked"
                            >
                              <Switch />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    </Col>

                    <Col xs={24}>
                      <Card title="Regra de codificação">
                        <Space direction="vertical" size={16} style={{ width: '100%' }}>
                          <div
                            style={{
                              padding: 12,
                              borderRadius: 12,
                              background: '#fafafa',
                              border: '1px solid #f0f0f0',
                            }}
                          >
                            <Text type="secondary">Exemplo do código gerado:</Text>
                            <div style={{ marginTop: 4 }}>
                              <Text strong style={{ fontSize: 16 }}>
                                {previewCode || '—'}
                              </Text>
                            </div>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: '180px minmax(220px, 1fr) 180px 90px',
                              gap: 12,
                              padding: '0 4px',
                              fontSize: 12,
                              fontWeight: 600,
                              color: '#8c8c8c',
                            }}
                          >
                            <div>Tipo</div>
                            <div>Valor</div>
                            <div>Separador após</div>
                            <div>Ações</div>
                          </div>

                          <Form.List name={['codingRule', 'parts']}>
                            {(fields, { add, remove }) => (
                              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                                {fields.map(field => (
                                  <div
                                    key={field.key}
                                    style={{
                                      display: 'grid',
                                      gridTemplateColumns:
                                        '180px minmax(220px, 1fr) 180px 90px',
                                      gap: 12,
                                      alignItems: 'start',
                                      padding: 12,
                                      border: '1px solid #f0f0f0',
                                      borderRadius: 12,
                                      background: '#fff',
                                    }}
                                  >
                                    <Form.Item
                                      name={[field.name, 'type']}
                                      rules={[{ required: true, message: 'Selecione o tipo' }]}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Select
                                        placeholder="Tipo"
                                        options={[
                                          { label: 'Valor fixo', value: 'fixed' },
                                          { label: 'Metadado', value: 'metadata' },
                                          { label: 'Ano', value: 'year' },
                                          { label: 'Unidade', value: 'unit' },
                                          { label: 'Área', value: 'area' },
                                          { label: 'Processo', value: 'process' },
                                          { label: 'Sequencial', value: 'sequential' },
                                        ]}
                                      />
                                    </Form.Item>

                                    <Form.Item
                                      noStyle
                                      shouldUpdate={(prev, curr) =>
                                        prev?.codingRule?.parts?.[field.name]?.type !==
                                        curr?.codingRule?.parts?.[field.name]?.type
                                      }
                                    >
                                      {({ getFieldValue }) => {
                                        const type = getFieldValue([
                                          'codingRule',
                                          'parts',
                                          field.name,
                                          'type',
                                        ])

                                        if (type === 'fixed') {
                                          return (
                                            <Form.Item
                                              name={[field.name, 'fixedValue']}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: 'Informe o valor fixo',
                                                },
                                              ]}
                                              style={{ marginBottom: 0 }}
                                            >
                                              <Input placeholder="Ex: DOC, ENG, FOR..." />
                                            </Form.Item>
                                          )
                                        }

                                        if (type === 'metadata') {
                                          return (
                                            <Form.Item
                                              name={[field.name, 'metadataDefinitionId']}
                                              rules={[
                                                {
                                                  required: true,
                                                  message: 'Selecione o metadado',
                                                },
                                              ]}
                                              style={{ marginBottom: 0 }}
                                            >
                                              <Select
                                                placeholder="Selecione um metadado"
                                                options={metadataOptions}
                                              />
                                            </Form.Item>
                                          )
                                        }

                                        return (
                                          <Input
                                            disabled
                                            value="Preenchimento automático"
                                            style={{ width: '100%' }}
                                          />
                                        )
                                      }}
                                    </Form.Item>

                                    <Form.Item
                                      name={[field.name, 'separatorAfter']}
                                      style={{ marginBottom: 0 }}
                                    >
                                      <Select
                                        placeholder="Separador"
                                        options={[
                                          { label: 'Sem separador', value: '' },
                                          { label: '-', value: '-' },
                                          { label: '/', value: '/' },
                                          { label: '.', value: '.' },
                                        ]}
                                      />
                                    </Form.Item>

                                    <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                                      <Button
                                        danger
                                        type="text"
                                        icon={<MinusCircleOutlined />}
                                        onClick={() => remove(field.name)}
                                      >
                                        Remover
                                      </Button>
                                    </div>
                                  </div>
                                ))}

                                <Button
                                  type="dashed"
                                  icon={<PlusOutlined />}
                                  onClick={() =>
                                    add({
                                      type: 'fixed',
                                      fixedValue: '',
                                      separatorAfter: '',
                                    })
                                  }
                                  block
                                >
                                  Adicionar tópico
                                </Button>
                              </Space>
                            )}
                          </Form.List>
                        </Space>
                      </Card>
                    </Col>

                    {hasSequentialPart && (
                      <Col xs={24} xl={12}>
                        <Card title="Sequencial">
                          <Row gutter={16}>
                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Iniciar em"
                                name={['sequential', 'startAt']}
                                rules={[{ required: true, message: 'Informe o início' }]}
                              >
                                <InputNumber min={1} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Quantidade de dígitos"
                                name={['sequential', 'digits']}
                                rules={[{ required: true, message: 'Informe os dígitos' }]}
                              >
                                <InputNumber min={1} max={10} style={{ width: '100%' }} />
                              </Form.Item>
                            </Col>

                            <Col xs={24} md={8}>
                              <Form.Item
                                label="Reinício"
                                name={['sequential', 'resetPeriod']}
                                rules={[{ required: true, message: 'Selecione o reinício' }]}
                              >
                                <Select
                                  options={[
                                    { label: 'Nunca', value: 'never' },
                                    { label: 'Anual', value: 'yearly' },
                                    { label: 'Mensal', value: 'monthly' },
                                  ]}
                                />
                              </Form.Item>
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                    )}

                    <Col span={24}>
                      <Card title="Prazo do processo">
                        <Row gutter={16}>
                          <Col xs={24} md={12} xl={8}>
                            <Form.Item
                              label="Prazo total para conclusão do processo"
                              name={['deadlines', 'totalProcessDays']}
                              rules={[{ required: true, message: 'Informe o prazo total' }]}
                              extra="Tempo esperado para o documento chegar ao fim do processo."
                            >
                              <InputNumber
                                min={0}
                                style={{ width: '100%' }}
                                addonAfter="dias"
                              />
                            </Form.Item>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  </Row>

                  <Divider />

                  <Space>
                    <Button
                      type="primary"
                      htmlType="submit"
                      icon={<SaveOutlined />}
                      loading={saveMutation.isPending}
                    >
                      Salvar configurações
                    </Button>

                    <Button onClick={() => form.setFieldsValue(DEFAULT_VALUES)}>
                      Restaurar padrão
                    </Button>
                  </Space>
                </Form>
              </>
            ),
          },
          {
            key: 'workflows',
            label: 'Workflows',
            children: <WorkflowsPage embedded />,
          },
          {
            key: 'notifications',
            label: (
              <Space size={6}>
                <BellOutlined />
                <span>Notificações</span>
              </Space>
            ),
            children: <NotificationTemplatesPage />,
          },
        ]}
      />
    </Space>
  )
}