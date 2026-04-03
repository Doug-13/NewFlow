import { useEffect, useState } from 'react'
import {
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  DatePicker,
  Typography,
  Alert,
  Space,
  Tag,
  Row,
  Col,
} from 'antd'
import type { MetadataValueDto } from '../api/metadata'
import dayjs from 'dayjs'

const { Text } = Typography

interface Props {
  fields: MetadataValueDto[]
  form: any
  /** Força todos os campos como somente leitura (ex: revisão obsoleta) */
  readOnly?: boolean
}

// Determina quantas colunas um campo deve ocupar
function getFieldSpan(fieldType: string): number {
  if (
    fieldType === 'textarea' ||
    fieldType === 'table' ||
    fieldType === 'multiselect'
  ) return 24
  return 12
}

// Converte qualquer valor de data para string ISO de forma segura
function toIsoString(value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'string') {
    const parsed = dayjs(value)
    return parsed.isValid() ? value : null
  }
  if (typeof value === 'number') {
    const parsed = dayjs(value)
    return parsed.isValid() ? parsed.toISOString() : null
  }
  if (value && typeof (value as any).format === 'function') {
    try { return (value as any).format() } catch { return null }
  }
  return null
}

function toPickerValue(value: string | null): ReturnType<typeof dayjs> | null {
  if (!value) return null
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed : null
}

function DateField({
  fieldType,
  disabled,
  isoValue,
  onChange,
}: {
  fieldType: string
  disabled: boolean
  isoValue: string | null
  onChange: (iso: string | null) => void
}) {
  return (
    <DatePicker
      style={{ width: '100%' }}
      format={fieldType === 'datetime' ? 'DD/MM/YYYY HH:mm' : 'DD/MM/YYYY'}
      showTime={fieldType === 'datetime' ? { format: 'HH:mm' } : false}
      disabled={disabled}
      value={toPickerValue(isoValue)}
      onChange={(dayjsValue) => {
        if (!dayjsValue) { onChange(null); return }
        try { onChange(dayjsValue.toISOString()) }
        catch { onChange(dayjsValue.format('YYYY-MM-DDTHH:mm:ss.000Z')) }
      }}
    />
  )
}

// ─── Estilos compartilhados ───────────────────────────────────────────────────

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  marginBottom: 6,
  display: 'block',
  letterSpacing: '0.01em',
}

const READONLY_LABEL_STYLE: React.CSSProperties = {
  ...LABEL_STYLE,
  color: '#9ca3af',
}

const INPUT_STYLE: React.CSSProperties = {
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #e5e7eb',
  background: '#fff',
}

const READONLY_INPUT_STYLE: React.CSSProperties = {
  fontSize: 14,
  borderRadius: 8,
  border: '1.5px solid #f3f4f6',
  background: '#f9fafb',
  color: '#6b7280',
}

export function MetadataForm({ fields, form, readOnly: globalReadOnly = false }: Props) {
  const [dateValues, setDateValues] = useState<Record<string, string | null>>({})

  useEffect(() => {
    if (!fields || fields.length === 0) return

    const initial: Record<string, any> = {}
    const initialDates: Record<string, string | null> = {}

    fields.forEach((field) => {
      if (field.value === null || field.value === undefined) return

      if (field.fieldType === 'date' || field.fieldType === 'datetime') {
        const iso = toIsoString(field.value)
        initialDates[field.metadataDefinitionId] = iso
        initial[field.metadataDefinitionId] = iso
      } else {
        initial[field.metadataDefinitionId] = field.value
      }
    })

    setDateValues(initialDates)
    form.setFieldsValue(initial)
  }, [fields, form])

  if (fields.length === 0) return null

  const getSelectOptions = (field: MetadataValueDto) =>
    (field.options ?? []).map((option) => ({
      value: option.value,
      label: field.fieldType === 'sigla_select'
        ? `${option.sigla ?? option.value} - ${option.label}`
        : option.label,
    }))

  const renderNonDateField = (field: MetadataValueDto, readOnly: boolean) => {
    const style = readOnly ? READONLY_INPUT_STYLE : INPUT_STYLE
    const disabled = readOnly

    if (field.fieldType === 'text')
      return <Input disabled={disabled} style={style} />
    if (field.fieldType === 'textarea')
      return <Input.TextArea rows={3} disabled={disabled} style={{ ...style, resize: 'vertical' }} />
    if (field.fieldType === 'number')
      return <InputNumber style={{ width: '100%', ...style }} disabled={disabled} />
    if (field.fieldType === 'currency')
      return (
        <InputNumber
          style={{ width: '100%', ...style }}
          prefix="R$"
          precision={2}
          decimalSeparator=","
          disabled={disabled}
        />
      )
    if (field.fieldType === 'boolean')
      return <Switch disabled={disabled} />
    if (field.fieldType === 'select')
      return (
        <Select
          options={getSelectOptions(field)}
          placeholder="Selecione..."
          allowClear
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    if (field.fieldType === 'multiselect')
      return (
        <Select
          mode="multiple"
          options={getSelectOptions(field)}
          placeholder="Selecione..."
          allowClear
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    if (field.fieldType === 'sigla_select')
      return (
        <Select
          options={getSelectOptions(field)}
          placeholder="Selecione a sigla..."
          allowClear
          disabled={disabled}
          style={{ width: '100%' }}
        />
      )
    if (field.fieldType === 'user')
      return <Input placeholder="Nome do usuário" disabled={disabled} style={style} />
    if (field.fieldType === 'table')
      return (
        <Alert
          type="info"
          showIcon
          title="Campo tabela"
          description={
            <Space wrap>
              {(field.tableColumns ?? []).length > 0
                ? (field.tableColumns ?? []).map((col) => (
                    <Tag key={col.id}>{col.externalName} ({col.internalName})</Tag>
                  ))
                : <span>Sem colunas configuradas.</span>}
            </Space>
          }
        />
      )
    return <Input disabled={disabled} style={style} />
  }

  // Renderiza label com indicador de obrigatório / etapa anterior
  const renderLabel = (field: MetadataValueDto, readOnly: boolean) => {
    const labelStyle = readOnly ? READONLY_LABEL_STYLE : LABEL_STYLE
    return (
      <span style={labelStyle}>
        {!readOnly && field.isRequired && (
          <span style={{ color: '#ef4444', marginRight: 3 }}>*</span>
        )}
        {field.label}
        {readOnly && (
          <Tag
            style={{
              marginLeft: 6,
              fontSize: 10,
              padding: '0 5px',
              lineHeight: '16px',
              border: '1px solid #e5e7eb',
              color: '#9ca3af',
              background: '#f9fafb',
            }}
          >
            Etapa anterior
          </Tag>
        )}
      </span>
    )
  }

  return (
    <div>
      {/* Cabeçalho da seção */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 20,
          marginTop: 4,
          paddingBottom: 12,
          borderBottom: '2px solid #f3f4f6',
        }}
      >
        <div
          style={{
            width: 4,
            height: 18,
            background: 'linear-gradient(180deg, #3b82f6, #6366f1)',
            borderRadius: 4,
            flexShrink: 0,
          }}
        />
        <Text
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#111827',
            letterSpacing: '-0.01em',
          }}
        >
          Informações do Documento
        </Text>
        <Tag
          style={{
            marginLeft: 'auto',
            background: '#eff6ff',
            border: '1px solid #bfdbfe',
            color: '#3b82f6',
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          {fields.filter((f) => !(f as any).isReadOnly).length} campo{fields.filter((f) => !(f as any).isReadOnly).length !== 1 ? 's' : ''}
        </Tag>
      </div>

      {/* Grid de campos */}
      <Row gutter={[16, 4]}>
        {fields.map((field) => {
          const readOnly = globalReadOnly || Boolean((field as any).isReadOnly)
          const isDate = field.fieldType === 'date' || field.fieldType === 'datetime'
          const isBoolean = field.fieldType === 'boolean'
          const span = getFieldSpan(field.fieldType)
          const rules = !readOnly && field.isRequired
            ? [{ required: true, message: `${field.label} é obrigatório` }]
            : []

          // Wrapper visual para campos read-only
          const wrapperStyle: React.CSSProperties = readOnly
            ? {
                background: '#f9fafb',
                borderRadius: 10,
                padding: '2px 8px 4px',
                border: '1px solid #f3f4f6',
              }
            : {}

          if (isDate) {
            return (
              <Col key={field.metadataDefinitionId} xs={24} sm={span}>
                <div style={{ marginBottom: 20, ...wrapperStyle }}>
                  <Form.Item name={field.metadataDefinitionId} hidden noStyle>
                    <Input />
                  </Form.Item>
                  {renderLabel(field, readOnly)}
                  <DateField
                    fieldType={field.fieldType}
                    disabled={readOnly}
                    isoValue={dateValues[field.metadataDefinitionId] ?? null}
                    onChange={(iso) => {
                      setDateValues((prev) => ({ ...prev, [field.metadataDefinitionId]: iso }))
                      form.setFieldValue(field.metadataDefinitionId, iso)
                    }}
                  />
                </div>
              </Col>
            )
          }

          if (isBoolean) {
            return (
              <Col key={field.metadataDefinitionId} xs={24} sm={12}>
                <div style={{ marginBottom: 20, ...wrapperStyle }}>
                  <Form.Item
                    name={field.metadataDefinitionId}
                    valuePropName="checked"
                    rules={rules}
                    style={{ marginBottom: 0 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 4 }}>
                      <Switch disabled={readOnly} />
                      {renderLabel(field, readOnly)}
                    </div>
                  </Form.Item>
                </div>
              </Col>
            )
          }

          return (
            <Col key={field.metadataDefinitionId} xs={24} sm={span}>
              <div style={{ marginBottom: 20, ...wrapperStyle }}>
                {renderLabel(field, readOnly)}
                <Form.Item
                  name={field.metadataDefinitionId}
                  rules={rules}
                  style={{ marginBottom: 0 }}
                >
                  {renderNonDateField(field, readOnly)}
                </Form.Item>
              </div>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}