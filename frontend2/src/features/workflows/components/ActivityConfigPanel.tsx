import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import { DeleteOutlined, HolderOutlined, PlusOutlined } from '@ant-design/icons'

import type { WorkflowActivityConfig } from '../storage'
// Estes tipos você adicionou ao storage.ts conforme o patch:
import type { ActivityAction, ActivityActionOutcome } from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

const { Text } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

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
  metadataDefinitionIds: string[]
  notificationTemplateIds: string[]
  // Booleans legados — mantidos para compatibilidade
  allowApprove: boolean
  allowReject: boolean
  allowRequestChanges: boolean
  allowForward: boolean
  // Ações dinâmicas — novo campo opcional
  actions: ActivityAction[]
  instructions?: string
  helpText?: string
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OUTCOME_OPTIONS: Array<{ label: string; value: ActivityActionOutcome }> = [
  { label: 'Avançar (aprovar)',       value: 'approve' },
  { label: 'Reprovar',                value: 'reject' },
  { label: 'Solicitar revisão',       value: 'request-changes' },
  { label: 'Encaminhar',              value: 'forward' },
  { label: 'Personalizado (gateway)', value: 'custom' },
]

const COLOR_OPTIONS: Array<{ label: string; value: ActivityAction['color'] }> = [
  { label: 'Verde',    value: 'green' },
  { label: 'Vermelho', value: 'red' },
  { label: 'Laranja',  value: 'orange' },
  { label: 'Azul',     value: 'blue' },
  { label: 'Roxo',     value: 'purple' },
  { label: 'Dourado',  value: 'gold' },
  { label: 'Padrão',   value: 'default' },
]

/**
 * Converte os booleans legados em ActivityAction[] quando o config
 * ainda não tem o campo `actions` (migração automática).
 */
function migrateActionsFromBooleans(
  cfg: WorkflowActivityConfig | null,
): ActivityAction[] {
  // Se já tem actions salvas, usa elas
  if (cfg?.actions && cfg.actions.length > 0) return cfg.actions

  // Caso contrário, converte os booleans legados
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

  // Se nenhum boolean estava ativo, retorna as 3 ações padrão
  if (migrated.length === 0) {
    return [
      { id: crypto.randomUUID(), label: 'Aprovar',           color: 'green',  outcome: 'approve',         requiresComment: false },
      { id: crypto.randomUUID(), label: 'Reprovar',          color: 'red',    outcome: 'reject',          requiresComment: true },
      { id: crypto.randomUUID(), label: 'Solicitar revisão', color: 'orange', outcome: 'request-changes', requiresComment: true },
    ]
  }

  return migrated
}

/**
 * Deriva os booleans legados a partir das ações dinâmicas,
 * para manter retrocompatibilidade com outros consumidores do config.
 */
function deriveBooleansFromActions(actions: ActivityAction[]) {
  return {
    allowApprove:         actions.some((a) => a.outcome === 'approve'),
    allowReject:          actions.some((a) => a.outcome === 'reject'),
    allowRequestChanges:  actions.some((a) => a.outcome === 'request-changes'),
    allowForward:         actions.some((a) => a.outcome === 'forward'),
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: ActivityConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const deadlineMode = Form.useWatch('deadlineMode', form)

  useEffect(() => {
    form.setFieldsValue({
      assignmentMode:          initialConfig?.assignmentMode          ?? 'role',
      responsibleUserIds:      initialConfig?.responsibleUserIds      ?? [],
      responsibleRoleIds:      initialConfig?.responsibleRoleIds      ?? [],
      responsibleAreaIds:      initialConfig?.responsibleAreaIds      ?? [],
      responsibleFunctionIds:  initialConfig?.responsibleFunctionIds  ?? [],
      deadlineMode:            initialConfig?.deadlineMode            ?? 'days',
      deadlineValue:           initialConfig?.deadlineValue,
      metadataDefinitionIds:   initialConfig?.metadataDefinitionIds   ?? [],
      notificationTemplateIds: initialConfig?.notificationTemplateIds ?? [],
      // Booleans legados (mantidos no form para compatibilidade)
      allowApprove:        initialConfig?.allowApprove        ?? true,
      allowReject:         initialConfig?.allowReject         ?? true,
      allowRequestChanges: initialConfig?.allowRequestChanges ?? true,
      allowForward:        initialConfig?.allowForward        ?? false,
      // Ações dinâmicas (migra automaticamente de booleans se necessário)
      actions:      migrateActionsFromBooleans(initialConfig),
      instructions: initialConfig?.instructions,
      helpText:     initialConfig?.helpText,
    })
  }, [form, initialConfig, selectedElement])

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Selecione uma atividade no fluxo" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'activity') {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Selecione uma atividade no fluxo" />
      </Card>
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = (values: FormValues) => {
    const actions = (values.actions ?? []).map((a) => ({
      ...a,
      id: a.id || crypto.randomUUID(),
      requiresComment: a.requiresComment ?? false,
    }))

    // Deriva booleans automaticamente para manter compatibilidade
    const booleans = deriveBooleansFromActions(actions)

    onSave({
      workflowId,
      elementId:   selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      assignmentMode:          values.assignmentMode,
      responsibleUserIds:      values.responsibleUserIds      ?? [],
      responsibleRoleIds:      values.responsibleRoleIds      ?? [],
      responsibleAreaIds:      values.responsibleAreaIds      ?? [],
      responsibleFunctionIds:  values.responsibleFunctionIds  ?? [],
      deadlineMode:            values.deadlineMode,
      deadlineValue:           values.deadlineValue,
      metadataDefinitionIds:   values.metadataDefinitionIds   ?? [],
      notificationTemplateIds: values.notificationTemplateIds ?? [],
      // Booleans mantidos e derivados das ações
      ...booleans,
      // Ações dinâmicas
      actions,
      instructions: values.instructions,
      helpText:     values.helpText,
    })
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card variant="borderless" style={{ borderRadius: 18 }} title="Configuração da atividade">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title={selectedElement.name || selectedElement.id}
        description={`Tipo: ${selectedElement.type}`}
      />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>

        {/* ── Atribuição ──────────────────────────────────────────── */}
        <Form.Item label="Modo de atribuição" name="assignmentMode">
          <Select options={[
            { label: 'Usuário', value: 'user' },
            { label: 'Função',  value: 'function' },
            { label: 'Cargo',   value: 'role' },
            { label: 'Área',    value: 'area' },
          ]} />
        </Form.Item>

        <Form.Item label="Usuários responsáveis" name="responsibleUserIds">
          <Select mode="tags" placeholder="Ex.: douglas, maria, joao" />
        </Form.Item>

        <Form.Item label="Cargos responsáveis" name="responsibleRoleIds">
          <Select mode="tags" placeholder="Ex.: aprovador, revisor" />
        </Form.Item>

        <Form.Item label="Áreas responsáveis" name="responsibleAreaIds">
          <Select mode="tags" placeholder="Ex.: qualidade, engenharia" />
        </Form.Item>

        <Form.Item label="Funções responsáveis" name="responsibleFunctionIds">
          <Select mode="tags" placeholder="Ex.: elaborador, gestor" />
        </Form.Item>

        {/* ── Prazo ───────────────────────────────────────────────── */}
        <Space style={{ width: '100%', display: 'flex' }} size={12}>
          <Form.Item label="Modo de prazo" name="deadlineMode" style={{ flex: 1, minWidth: 130 }}>
            <Select options={[
              { label: 'Horas',     value: 'hours' },
              { label: 'Dias',      value: 'days' },
              { label: 'Data fixa', value: 'fixed-date' },
            ]} />
          </Form.Item>
          <Form.Item label="Prazo" name="deadlineValue" style={{ flex: 1, minWidth: 130 }}>
            {deadlineMode === 'fixed-date'
              ? <Input placeholder="Ex.: 2026-12-31" />
              : <InputNumber style={{ width: '100%' }} min={1} />
            }
          </Form.Item>
        </Space>

        {/* ── Metadados / notificações ─────────────────────────────── */}
        <Form.Item label="Metadados obrigatórios" name="metadataDefinitionIds">
          <Select mode="tags" placeholder="Ex.: titulo, codigo, revisao" />
        </Form.Item>

        <Form.Item label="Templates de notificação" name="notificationTemplateIds">
          <Select mode="tags" placeholder="Ex.: notif-aprovacao, notif-prazo" />
        </Form.Item>

        {/* ── Ações dinâmicas ──────────────────────────────────────── */}
        <Divider />

        <div style={{ marginBottom: 12 }}>
          <Text strong>Ações disponíveis para o executor</Text>
          <div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Crie, renomeie e configure cada ação. O gateway usa essas ações para rotear o fluxo.
            </Text>
          </div>
        </div>

        <Form.List name="actions">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size={10}>
              {fields.length === 0 && (
                <Alert
                  type="warning"
                  showIcon
                  title="Nenhuma ação configurada"
                  description="Adicione pelo menos uma ação para que o executor possa interagir com esta atividade."
                />
              )}

              {fields.map(({ key, name }) => (
                <ActionCard
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

        {/* ── Instruções ──────────────────────────────────────────── */}
        <Divider />

        <Form.Item label="Instruções da atividade" name="instructions">
          <Input.TextArea rows={4} placeholder="Explique o que deve ser feito nesta etapa" />
        </Form.Item>

        <Form.Item label="Texto de apoio" name="helpText">
          <Input.TextArea rows={3} placeholder="Mensagem complementar para o executor" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Salvar configuração da atividade
        </Button>
      </Form>
    </Card>
  )
}

// ─── Sub-componente: card de uma ação ─────────────────────────────────────────

function ActionCard({
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
    <Card
      size="small"
      style={{ borderRadius: 12, background: '#fafafa' }}
      styles={{ body: { padding: '12px 16px' } }}
      title={
        <Space size={6} style={{ flexWrap: 'nowrap' }}>
          <HolderOutlined style={{ color: '#bfbfbf', cursor: 'grab', flexShrink: 0 }} />
          <Form.Item
            name={[name, 'label']}
            noStyle
            rules={[{ required: true, message: 'Informe o nome' }]}
          >
            <Input
              placeholder="Nome da ação"
              variant="borderless"
              style={{ fontWeight: 600, padding: 0, width: 160 }}
            />
          </Form.Item>
          <Tag color={color} style={{ flexShrink: 0 }}>
            {label || 'Ação'}
          </Tag>
        </Space>
      }
      extra={
        <Tooltip title="Remover ação">
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            size="small"
            onClick={onRemove}
          />
        </Tooltip>
      }
    >
      <Row gutter={[12, 0]}>
        <Col xs={24} sm={8}>
          <Form.Item label="Cor" name={[name, 'color']} style={{ marginBottom: 8 }}>
            <Select size="small" options={COLOR_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={24} sm={16}>
          <Form.Item
            label="Comportamento"
            name={[name, 'outcome']}
            style={{ marginBottom: 8 }}
          >
            <Select size="small" options={OUTCOME_OPTIONS} />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            label="Texto de confirmação"
            name={[name, 'confirmText']}
            style={{ marginBottom: 8 }}
          >
            <Input
              size="small"
              placeholder='Ex.: "Confirma a aprovação do documento?"'
            />
          </Form.Item>
        </Col>

        <Col xs={24}>
          <Form.Item
            name={[name, 'requiresComment']}
            valuePropName="checked"
            style={{ marginBottom: 0 }}
          >
            <Switch
              size="small"
              checkedChildren="Exige comentário"
              unCheckedChildren="Comentário opcional"
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  )
}