import { useEffect } from 'react'
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
} from 'antd'
import type { MetadataValueDto } from '../api/metadata'
import dayjs from 'dayjs'

const { Text } = Typography

interface Props {
  fields: MetadataValueDto[]
  form: any
}

export function MetadataForm({ fields, form }: Props) {
  useEffect(() => {
    const initial: Record<string, any> = {}

    fields.forEach((field) => {
      if (field.value !== null && field.value !== undefined) {
        if (field.fieldType === 'date' || field.fieldType === 'datetime') {
          initial[field.metadataDefinitionId] = field.value ? dayjs(field.value) : null
        } else {
          initial[field.metadataDefinitionId] = field.value
        }
      }
    })

    form.setFieldsValue(initial)
  }, [fields, form])

  if (fields.length === 0) return null

  const getSelectOptions = (field: MetadataValueDto) => {
    return (field.options ?? []).map((option) => ({
      value: option.value,
      label:
        field.fieldType === 'sigla_select'
          ? `${option.sigla ?? option.value} - ${option.label}`
          : option.label,
    }))
  }

  const renderField = (field: MetadataValueDto) => {
    if (field.fieldType === 'text') return <Input />
    if (field.fieldType === 'textarea') return <Input.TextArea rows={3} />
    if (field.fieldType === 'number') return <InputNumber style={{ width: '100%' }} />
    if (field.fieldType === 'currency') {
      return (
        <InputNumber
          style={{ width: '100%' }}
          prefix="R$"
          precision={2}
          decimalSeparator=","
        />
      )
    }
    if (field.fieldType === 'date') {
      return <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" />
    }
    if (field.fieldType === 'datetime') {
      return <DatePicker showTime style={{ width: '100%' }} format="DD/MM/YYYY HH:mm" />
    }
    if (field.fieldType === 'boolean') return <Switch />
    if (field.fieldType === 'select') {
      return <Select options={getSelectOptions(field)} placeholder="Selecione..." allowClear />
    }
    if (field.fieldType === 'multiselect') {
      return <Select mode="multiple" options={getSelectOptions(field)} placeholder="Selecione..." allowClear />
    }
    if (field.fieldType === 'sigla_select') {
      return <Select options={getSelectOptions(field)} placeholder="Selecione a sigla..." allowClear />
    }
    if (field.fieldType === 'user') return <Input placeholder="Nome do usuário" />

    if (field.fieldType === 'table') {
      return (
        <Alert
          type="info"
          showIcon
          message="Campo tabela configurado no front"
          description={
            <Space wrap>
              {(field.tableColumns ?? []).length > 0 ? (
                (field.tableColumns ?? []).map((column) => (
                  <Tag key={column.id}>
                    {column.externalName} ({column.internalName})
                  </Tag>
                ))
              ) : (
                <span>Sem colunas configuradas.</span>
              )}
            </Space>
          }
        />
      )
    }

    return <Input />
  }

  return (
    <>
      <Text strong style={{ display: 'block', marginBottom: 12, marginTop: 8 }}>
        Informações do Documento
      </Text>

      {fields.map((field) => {
        if (field.fieldType === 'boolean') {
          return (
            <Form.Item
              key={field.metadataDefinitionId}
              label={field.label}
              name={field.metadataDefinitionId}
              valuePropName="checked"
              rules={field.isRequired ? [{ required: true, message: `${field.label} é obrigatório` }] : []}
            >
              {renderField(field)}
            </Form.Item>
          )
        }

        return (
          <Form.Item
            key={field.metadataDefinitionId}
            label={field.label}
            name={field.metadataDefinitionId}
            rules={field.isRequired ? [{ required: true, message: `${field.label} é obrigatório` }] : []}
          >
            {renderField(field)}
          </Form.Item>
        )
      })}
    </>
  )
}