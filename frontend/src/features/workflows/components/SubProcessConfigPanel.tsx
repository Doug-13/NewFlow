import { useEffect, useMemo } from 'react'
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { ApartmentOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons'

import { loadWorkflows } from '../storage'
import type { WorkflowActivityConfig } from '../storage'
import type { ActivityAction, ActivityActionOutcome } from '../storage'
import type { BpmnElementSummary } from '../studioValidation'
import type { ElementConfigSavePayload } from '../panelTypes'

const { Text, Title } = Typography

type SubProcessConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowActivityConfig | null
  onSave: (values: ElementConfigSavePayload) => void
}

type FormValues = {
  linkedWorkflowId?: string
  assignmentMode: 'user' | 'role' | 'area' | 'function'
  responsibleUserIds: string[]
  responsibleRoleIds: string[]
  responsibleAreaIds: string[]
  responsibleFunctionIds: string[]
  deadlineMode: 'hours' | 'days' | 'fixed-date'
  deadlineValue?: number | string
  metadataDefinitionIds: string[]
  notificationTemplateIds: string[]
  actions: ActivityAction[]
  instructions?: string
  helpText?: string
}

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

export function SubProcessConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: SubProcessConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const deadlineMode = Form.useWatch('deadlineMode', form)

  const availableWorkflows = useMemo(() =>
    loadWorkflows()
      .filter((w) => w.id !== workflowId)
      .map((w) => ({
        value: w.id,
        label: `${w.name} — v${w.version} (${w.status})`,
      })),
    [workflowId],
  )

  useEffect(() => {
    if (!selectedElement) return
    const cfg = initialConfig as any

    form.setFieldsValue({
      linkedWorkflowId:        cfg?.linkedWorkflowId,
      assignmentMode:          cfg?.assignmentMode          ?? 'role',
      responsibleUserIds:      cfg?.responsibleUserIds      ?? [],
      responsibleRoleIds:      cfg?.responsibleRoleIds      ?? [],
      responsibleAreaIds:      cfg?.responsibleAreaIds      ?? [],
      responsibleFunctionIds:  cfg?.responsibleFunctionIds  ?? [],
      deadlineMode:            cfg?.deadlineMode            ?? 'days',
      deadlineValue:           cfg?.deadlineValue,
      metadataDefinitionIds:   cfg?.metadataDefinitionIds   ?? [],
      notificationTemplateIds: cfg?.notificationTemplateIds ?? [],
      actions:                 cfg?.actions?.length ? cfg.actions : [],
      instructions:            cfg?.instructions,
      helpText:                cfg?.helpText,
    })
  }, [form, initialConfig, selectedElement])

  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Selecione um subprocesso no fluxo" />
      </Card>
    )
  }

  const handleSubmit = (values: FormValues) => {
    const actions = (values.actions ?? []).map((a) => ({
      ...a,
      id: a.id || crypto.randomUUID(),
      requiresComment: a.requiresComment ?? false,
    }))

    onSave({
      workflowId,
      elementId:   selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'activity',
      config: {
        assignmentMode:          values.assignmentMode,
        responsibleUserIds:      values.responsibleUserIds      ?? [],
        responsibleRoleIds:      values.responsibleRoleIds      ?? [],
        responsibleAreaIds:      values.responsibleAreaIds      ?? [],
        responsibleFunctionIds:  values.responsibleFunctionIds  ?? [],
        deadlineMode:            values.deadlineMode,
        deadlineValue:           values.deadlineValue,
        metadataDefinitionIds:   values.metadataDefinitionIds   ?? [],
        notificationTemplateIds: values.notificationTemplateIds ?? [],
        allowApprove:        actions.some((a) => a.outcome === 'approve'),
        allowReject:         actions.some((a) => a.outcome === 'reject'),
        allowRequestChanges: actions.some((a) => a.outcome === 'request-changes'),
        allowForward:        actions.some((a) => a.outcome === 'forward'),
        actions,
        instructions:     values.instructions,
        helpText:         values.helpText,
        linkedWorkflowId: values.linkedWorkflowId,
      } as any,
    })
  }

  return (
    <Card variant="borderless" style={{ borderRadius: 18 }} title="Configuração do subprocesso">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        title={selectedElement.name || 'Subprocesso'}
        description="Um subprocesso encapsula um workflow completo. Vincule o workflow filho que será executado nesta etapa."
      />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>

        {/* ── Workflow filho ──────────────────────────────────────── */}
        <Space style={{ marginBottom: 8 }}>
          <ApartmentOutlined style={{ color: '#1677ff', fontSize: 16 }} />
          <Title level={5} style={{ margin: 0 }}>Workflow filho</Title>
        </Space>

        {availableWorkflows.length === 0 ? (
          <Alert
            type="warning" showIcon style={{ marginBottom: 16 }}
            title="Nenhum workflow disponível"
            description="Crie outros workflows no sistema para poder vinculá-los como subprocesso."
          />
        ) : (
          <Form.Item
            label="Selecionar workflow filho"
            name="linkedWorkflowId"
            rules={[{ required: true, message: 'Vincule um workflow filho ao subprocesso' }]}
          >
            <Select showSearch allowClear placeholder="Buscar e selecionar workflow..." optionFilterProp="label" options={availableWorkflows} />
          </Form.Item>
        )}

        <Divider />

        {/* ── Atribuição ──────────────────────────────────────────── */}
        <Form.Item label="Modo de atribuição" name="assignmentMode">
          <Select options={[
            { label: 'Usuário', value: 'user' },
            { label: 'Função',  value: 'function' },
            { label: 'Cargo',   value: 'role' },
            { label: 'Área',    value: 'area' },
          ]} />
        </Form.Item>
        <Form.Item label="Usuários responsáveis"  name="responsibleUserIds">     <Select mode="tags" placeholder="Ex.: douglas, maria" /></Form.Item>
        <Form.Item label="Cargos responsáveis"    name="responsibleRoleIds">     <Select mode="tags" placeholder="Ex.: aprovador, revisor" /></Form.Item>
        <Form.Item label="Áreas responsáveis"     name="responsibleAreaIds">     <Select mode="tags" placeholder="Ex.: qualidade, engenharia" /></Form.Item>
        <Form.Item label="Funções responsáveis"   name="responsibleFunctionIds"> <Select mode="tags" placeholder="Ex.: elaborador, gestor" /></Form.Item>

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

        <Form.Item label="Metadados obrigatórios"    name="metadataDefinitionIds">  <Select mode="tags" placeholder="Ex.: titulo, codigo" /></Form.Item>
        <Form.Item label="Templates de notificação"  name="notificationTemplateIds"><Select mode="tags" placeholder="Ex.: notif-subprocesso" /></Form.Item>

        <Divider />

        {/* ── Ações ───────────────────────────────────────────────── */}
        <div style={{ marginBottom: 10 }}>
          <Text strong>Ações ao concluir o subprocesso</Text>
        </div>

        <Form.List name="actions">
          {(fields, { add, remove }) => (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {fields.map(({ key, name }) => (
                <Card
                  key={key}
                  size="small"
                  style={{ borderRadius: 10, background: '#fafafa' }}
                  styles={{ body: { padding: '10px 14px' } }}
                  title={
                    <Space size={6}>
                      <Form.Item name={[name, 'label']} noStyle rules={[{ required: true }]}>
                        <Input placeholder="Nome da ação" variant="borderless" style={{ fontWeight: 600, padding: 0, width: 150 }} />
                      </Form.Item>
                      <ActionTagPreview form={form} name={name} />
                    </Space>
                  }
                  extra={<Button type="text" danger size="small" icon={<DeleteOutlined />} onClick={() => remove(name)} />}
                >
                  <Space size={8} style={{ flexWrap: 'wrap' }}>
                    <Form.Item label="Cor" name={[name, 'color']} style={{ marginBottom: 0, minWidth: 110 }}>
                      <Select size="small" options={COLOR_OPTIONS} />
                    </Form.Item>
                    <Form.Item label="Comportamento" name={[name, 'outcome']} style={{ marginBottom: 0, minWidth: 200 }}>
                      <Select size="small" options={OUTCOME_OPTIONS} />
                    </Form.Item>
                  </Space>
                </Card>
              ))}

              <Button
                type="dashed" block icon={<PlusOutlined />}
                onClick={() => add({ id: crypto.randomUUID(), label: 'Nova ação', color: 'default', outcome: 'custom', requiresComment: false })}
              >
                Adicionar ação
              </Button>
            </Space>
          )}
        </Form.List>

        <Divider />

        <Form.Item label="Instruções" name="instructions">
          <Input.TextArea rows={3} placeholder="Explique o que deve ser feito neste subprocesso" />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Salvar configuração do subprocesso
        </Button>
      </Form>
    </Card>
  )
}

function ActionTagPreview({ form, name }: { form: any; name: number }) {
  const color = Form.useWatch(['actions', name, 'color'], form) ?? 'default'
  const label = Form.useWatch(['actions', name, 'label'], form) ?? 'Ação'
  return <Tag color={color}>{label || 'Ação'}</Tag>
}