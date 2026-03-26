/**
 * SystemTaskConfigPanel.tsx
 *
 * Painel de configuração para bpmn:ServiceTask — "Tarefa de Sistema".
 *
 * DESIGN INTENCIONAL — painel simples:
 *   O "como" executar (campo de revisão, formato, prefixo, URL, script)
 *   é definido na configuração do processo / tipo documental.
 *   Aqui só declaramos "o que" acontece neste ponto do fluxo,
 *   registramos uma nota de auditoria e configuramos notificações.
 *
 * Fluxo de uso:
 *   1. Administrador define no processo: campo "revisao", formato "v-numeric"
 *   2. No BPMN, arrasta um ServiceTask após a aprovação humana
 *   3. Neste painel: seleciona "Incrementar revisão" + nota de auditoria
 *   4. Em runtime: o motor lê a regra do processo e executa o incremento
 */

import { useEffect } from 'react'
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Select,
  Space,
  Tag,
  Typography,
} from 'antd'
import { SettingOutlined } from '@ant-design/icons'

import type {
  SystemTaskActionType,
  SystemTaskConfig,
  WorkflowElementConfig,
} from '../storage'
import type { BpmnElementSummary } from '../studioValidation'

const { Text } = Typography

// ─── Types ────────────────────────────────────────────────────────────────────

type SystemTaskConfigPanelProps = {
  workflowId: string
  selectedElement: BpmnElementSummary | null
  initialConfig: WorkflowElementConfig | null
  onSave: (
    values: Omit<WorkflowElementConfig, 'id' | 'createdAt' | 'updatedAt'>,
  ) => void
}

type FormValues = SystemTaskConfig

// ─── Constants ────────────────────────────────────────────────────────────────

type ActionOption = {
  label: string
  value: SystemTaskActionType
  tag: string
  tagColor: string
  description: string
  auditPlaceholder: string
}

const ACTION_OPTIONS: ActionOption[] = [
  {
    label:            'Incrementar revisão',
    value:            'increment-revision',
    tag:              'Revisão',
    tagColor:         'blue',
    description:      'Avança o campo de revisão do documento conforme a regra definida no processo (ex.: 1→2, v1→v2, A→B).',
    auditPlaceholder: 'Ex.: Avança a revisão do documento após aprovação gerencial.',
  },
  {
    label:            'Definir valor de metadado',
    value:            'set-metadata',
    tag:              'Metadado',
    tagColor:         'purple',
    description:      'Atribui um valor ao campo configurado no processo (ex.: status = "aprovado", dataPublicacao = hoje).',
    auditPlaceholder: 'Ex.: Marca o documento como aprovado e registra a data.',
  },
  {
    label:            'Copiar metadado',
    value:            'copy-metadata',
    tag:              'Metadado',
    tagColor:         'purple',
    description:      'Copia o valor de um campo para outro, conforme mapeamento definido no processo.',
    auditPlaceholder: 'Ex.: Copia a data de revisão para a data de publicação.',
  },
  {
    label:            'Requisição HTTP',
    value:            'http-request',
    tag:              'Integração',
    tagColor:         'orange',
    description:      'Chama o endpoint externo (webhook / API) configurado no processo.',
    auditPlaceholder: 'Ex.: Notifica o sistema ERP sobre a aprovação do contrato.',
  },
  {
    label:            'Script personalizado',
    value:            'custom-script',
    tag:              'Script',
    tagColor:         'volcano',
    description:      'Executa a expressão ou script definido na configuração do processo.',
    auditPlaceholder: 'Ex.: Executa regra de negócio específica do tipo documental.',
  },
]

const DEFAULT_CONFIG: FormValues = {
  actionType:              'increment-revision',
  auditNote:               undefined,
  notificationTemplateIds: [],
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SystemTaskConfigPanel({
  workflowId,
  selectedElement,
  initialConfig,
  onSave,
}: SystemTaskConfigPanelProps) {
  const [form] = Form.useForm<FormValues>()
  const actionType = Form.useWatch('actionType', form)

  useEffect(() => {
    if (!selectedElement) return

    const saved =
      initialConfig?.kind === 'system-task'
        ? (initialConfig.config as SystemTaskConfig)
        : null

    form.setFieldsValue({
      actionType:              saved?.actionType              ?? DEFAULT_CONFIG.actionType,
      auditNote:               saved?.auditNote,
      notificationTemplateIds: saved?.notificationTemplateIds ?? [],
    })
  }, [form, initialConfig, selectedElement])

  // ── Guards ──────────────────────────────────────────────────────────────────

  if (!selectedElement) {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Selecione uma tarefa de sistema no fluxo" />
      </Card>
    )
  }

  if (selectedElement.kind !== 'system-task') {
    return (
      <Card variant="borderless" style={{ borderRadius: 18 }}>
        <Empty description="Este elemento não é uma tarefa de sistema" />
      </Card>
    )
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = (values: FormValues) => {
    onSave({
      workflowId,
      elementId:   selectedElement.id,
      elementType: selectedElement.type,
      elementName: selectedElement.name,
      kind: 'system-task',
      config: {
        actionType:              values.actionType,
        auditNote:               values.auditNote,
        notificationTemplateIds: values.notificationTemplateIds ?? [],
      } satisfies SystemTaskConfig,
    })
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const selectedAction = ACTION_OPTIONS.find((o) => o.value === actionType)

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Card
      variant="borderless"
      style={{ borderRadius: 18 }}
      title={
        <Space>
          <SettingOutlined style={{ color: '#1677ff' }} />
          <span>Tarefa de sistema</span>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message={selectedElement.name || 'Tarefa de sistema'}
        description={
          <>
            Executada <strong>automaticamente pelo motor</strong> ao chegar nesta
            etapa — sem interação humana. Os parâmetros de execução (campo, formato,
            regras) são definidos na configuração do processo.
          </>
        }
      />

      <Form<FormValues> form={form} layout="vertical" onFinish={handleSubmit}>

        {/* ── Tipo de ação ─────────────────────────────────────────── */}
        <Form.Item
          label="O que este ponto do fluxo faz?"
          name="actionType"
          rules={[{ required: true, message: 'Selecione a ação' }]}
        >
          <Select
            options={ACTION_OPTIONS.map((o) => ({
              label: (
                <Space size={8}>
                  <Tag color={o.tagColor} style={{ margin: 0 }}>{o.tag}</Tag>
                  {o.label}
                </Space>
              ),
              value: o.value,
            }))}
          />
        </Form.Item>

        {selectedAction && (
          <Alert
            type="success"
            showIcon={false}
            style={{ marginBottom: 16, borderRadius: 10 }}
            message={
              <Space direction="vertical" size={2}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {selectedAction.description}
                </Text>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  Os parâmetros específicos (campo, formato, valor, URL) são
                  configurados no <strong>processo / tipo documental</strong>.
                </Text>
              </Space>
            }
          />
        )}

        <Divider />

        {/* ── Nota de auditoria ─────────────────────────────────────── */}
        <Form.Item
          label="Nota de auditoria"
          name="auditNote"
          tooltip="Texto em linguagem de negócio registrado no histórico da instância. Ajuda na rastreabilidade."
        >
          <Input.TextArea
            rows={3}
            placeholder={selectedAction?.auditPlaceholder ?? 'Descreva o efeito desta etapa no documento...'}
          />
        </Form.Item>

        {/* ── Notificações ─────────────────────────────────────────── */}
        <Form.Item
          label="Notificações após execução"
          name="notificationTemplateIds"
          tooltip="Templates disparados imediatamente após o motor executar esta tarefa"
        >
          <Select
            mode="tags"
            placeholder="Ex.: notif-revisao-atualizada, notif-sistema"
          />
        </Form.Item>

        <Button type="primary" htmlType="submit" block>
          Salvar tarefa de sistema
        </Button>
      </Form>
    </Card>
  )
}