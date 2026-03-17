import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Tabs, Table, Button, Modal, Form, Input, Select, Space, Popconfirm, Typography, Tag } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'
import {
  getUnits, createUnit, updateUnit, deleteUnit,
  getAreas, createArea, updateArea, deleteArea,
  getOrgRoles, createOrgRole, updateOrgRole, deleteOrgRole,
  type UnitDto, type AreaDto, type OrgRoleDto
} from '../../api/organization'

const { Title } = Typography

function CrudTable<T extends { id: string; name: string; description?: string; isActive: boolean; createdAt: string }>({
  queryKey, fetchFn, createFn, updateFn, deleteFn, extraFields, extraFormFields
}: {
  queryKey: string
  fetchFn: () => Promise<T[]>
  createFn: (data: any) => Promise<T>
  updateFn: (id: string, data: any) => Promise<T>
  deleteFn: (id: string) => Promise<any>
  extraFields?: any[]
  extraFormFields?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<T | null>(null)
  const [form] = Form.useForm()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: fetchFn })
  const createMutation = useMutation({ mutationFn: createFn, onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); handleClose() } })
  const updateMutation = useMutation({ mutationFn: ({ id, data }: any) => updateFn(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: [queryKey] }); handleClose() } })
  const deleteMutation = useMutation({ mutationFn: deleteFn, onSuccess: () => qc.invalidateQueries({ queryKey: [queryKey] }) })

  const handleOpen = (item?: T) => {
    setEditing(item ?? null)
    form.setFieldsValue(item ?? { name: '', description: '' })
    setOpen(true)
  }
  const handleClose = () => { setOpen(false); setEditing(null); form.resetFields() }
  const handleSubmit = (values: any) => {
    if (editing) updateMutation.mutate({ id: editing.id, data: values })
    else createMutation.mutate(values)
  }

  const columns = [
    { title: 'Nome', dataIndex: 'name', key: 'name' },
    { title: 'Descrição', dataIndex: 'description', key: 'description', render: (v: any) => v || '-' },
    ...(extraFields || []),
    { title: 'Status', key: 'isActive', render: (_: any, r: T) => <Tag color={r.isActive ? 'green' : 'red'}>{r.isActive ? 'Ativo' : 'Inativo'}</Tag> },
    { title: 'Ações', key: 'actions', render: (_: any, r: T) => (
      <Space>
        <Button size="small" icon={<EditOutlined />} onClick={() => handleOpen(r)} />
        <Popconfirm title="Desativar?" onConfirm={() => deleteMutation.mutate(r.id)}>
          <Button size="small" icon={<DeleteOutlined />} danger />
        </Popconfirm>
      </Space>
    )},
  ]

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => handleOpen()}>Novo</Button>
      </div>
      <Table dataSource={data} columns={columns} rowKey="id" loading={isLoading} size="small" />
      <Modal title={editing ? 'Editar' : 'Novo'} open={open} onCancel={handleClose}
        onOk={() => form.submit()} confirmLoading={createMutation.isPending || updateMutation.isPending}>
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="Nome" name="name" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item label="Descrição" name="description"><Input.TextArea rows={2} /></Form.Item>
          {extraFormFields}
        </Form>
      </Modal>
    </>
  )
}

export function OrganizationPage() {
  const { data: units } = useQuery({ queryKey: ['units'], queryFn: getUnits })

  return (
    <div>
      <Title level={4}>Estrutura Organizacional</Title>
      <Tabs items={[
        {
          key: 'units', label: 'Unidades',
          children: <CrudTable<UnitDto>
            queryKey="units" fetchFn={getUnits} createFn={createUnit} updateFn={updateUnit} deleteFn={deleteUnit}
          />
        },
        {
          key: 'areas', label: 'Áreas / Departamentos',
          children: <CrudTable<AreaDto>
            queryKey="areas" fetchFn={getAreas} createFn={createArea} updateFn={updateArea} deleteFn={deleteArea}
            extraFields={[{ title: 'Unidade', key: 'unitName', render: (_: any, r: AreaDto) => r.unitName || '-' }]}
            extraFormFields={
              <Form.Item label="Unidade" name="unitId">
                <Select allowClear placeholder="Selecione..." options={units?.map(u => ({ label: u.name, value: u.id }))} />
              </Form.Item>
            }
          />
        },
        {
          key: 'roles', label: 'Funções',
          children: <CrudTable<OrgRoleDto>
            queryKey="org-roles" fetchFn={getOrgRoles} createFn={createOrgRole} updateFn={updateOrgRole} deleteFn={deleteOrgRole}
          />
        },
      ]} />
    </div>
  )
}
