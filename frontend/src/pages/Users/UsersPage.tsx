import { useMemo, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Typography,
  Tag,
  Avatar,
  Upload,
  message,
} from 'antd'
import type { UploadChangeParam, UploadFile } from 'antd/es/upload/interface'
import {
  PlusOutlined,
  UserOutlined,
  UploadOutlined,
} from '@ant-design/icons'
import { getUsers, createUser, updateUser } from '../../api/users'
import type { UserListItem } from '../../types'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import './UsersPage.css'


const { Title, Text } = Typography
const { TextArea } = Input

type ExtendedUserListItem = UserListItem & {
  cpf?: string
  phone?: string
  photoUrl?: string
  department?: string
  jobTitle?: string
  position?: string
  notes?: string
}

type UserFormValues = {
  name: string
  email: string
  password?: string
  role: string
  cpf?: string
  phone?: string
  photoFile?: File
  department?: string
  jobTitle?: string
  position?: string
  isActive: boolean
  notes?: string
}

function formatCpf(value?: string) {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')
  if (digits.length !== 11) return value
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

function formatPhone(value?: string) {
  if (!value) return '-'
  const digits = value.replace(/\D/g, '')

  if (digits.length === 11) {
    return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  }

  if (digits.length === 10) {
    return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  }

  return value
}

function getBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
  })
}

export function UsersPage() {
  const [open, setOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<ExtendedUserListItem | null>(null)

  const [form] = Form.useForm<UserFormValues>()
  const qc = useQueryClient()

  const [photoPreview, setPhotoPreview] = useState<string | undefined>()
  const [fileList, setFileList] = useState<UploadFile[]>([])

  const { data, isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
  })

  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      message.success('Usuário criado com sucesso.')
      qc.invalidateQueries({ queryKey: ['users'] })
      handleCloseModal()
    },
  })

  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      message.success('Usuário atualizado com sucesso.')
      qc.invalidateQueries({ queryKey: ['users'] })
      handleCloseModal()
    },
  })

  const isSaving = createMutation.isPending || updateMutation.isPending

  const roleColors: Record<string, string> = {
    Admin: 'purple',
    Gestor: 'blue',
    Operador: 'default',
  }

  const handleCloseModal = () => {
    setOpen(false)
    setEditingUser(null)
    form.resetFields()
    setPhotoPreview(undefined)
    setFileList([])
  }

  const handleOpenCreate = () => {
    setEditingUser(null)
    form.resetFields()
    form.setFieldsValue({
      role: 'Operador',
      isActive: true,
    })
    setPhotoPreview(undefined)
    setFileList([])
    setOpen(true)
  }

  const handleOpenEdit = (user: ExtendedUserListItem) => {
    setEditingUser(user)

    form.setFieldsValue({
      name: user.name,
      email: user.email,
      password: '',
      role: user.role,
      cpf: user.cpf,
      phone: user.phone,
      department: user.department,
      jobTitle: user.jobTitle,
      position: user.position,
      isActive: user.isActive,
      notes: user.notes,
    })

    setPhotoPreview(user.photoUrl)
    setFileList([])
    setOpen(true)
  }

  const columns = useMemo(
    () => [
      {
        title: 'Usuário',
        key: 'user',
        render: (_: unknown, r: ExtendedUserListItem) => (
          <div className="users-page__user-cell">
            <Avatar
              size={42}
              src={r.photoUrl}
              icon={!r.photoUrl ? <UserOutlined /> : undefined}
              className="users-page__user-avatar"
            />
            <div className="users-page__user-info">
              <div className="users-page__user-name">{r.name}</div>
              <div className="users-page__user-email">{r.email}</div>
            </div>
          </div>
        ),
      },
      {
        title: 'CPF',
        dataIndex: 'cpf',
        key: 'cpf',
        render: (value: string) => (
          <span className="users-page__muted">{formatCpf(value)}</span>
        ),
      },
      {
        title: 'Telefone',
        dataIndex: 'phone',
        key: 'phone',
        render: (value: string) => (
          <span className="users-page__muted">{formatPhone(value)}</span>
        ),
      },
      {
        title: 'Setor',
        dataIndex: 'department',
        key: 'department',
        render: (value: string) => (
          <span className="users-page__muted">{value || '-'}</span>
        ),
      },
      {
        title: 'Cargo',
        dataIndex: 'jobTitle',
        key: 'jobTitle',
        render: (value: string) => (
          <span className="users-page__muted">{value || '-'}</span>
        ),
      },
      {
        title: 'Papel',
        key: 'role',
        render: (_: unknown, r: ExtendedUserListItem) => (
          <Tag color={roleColors[r.role] || 'default'}>{r.role}</Tag>
        ),
      },
      {
        title: 'Status',
        key: 'isActive',
        render: (_: unknown, r: ExtendedUserListItem) => (
          <Tag color={r.isActive ? 'green' : 'red'}>
            {r.isActive ? 'Ativo' : 'Inativo'}
          </Tag>
        ),
      },
      {
        title: 'Criado em',
        key: 'createdAt',
        render: (_: unknown, r: ExtendedUserListItem) => {
          if (!r.createdAt) return <span className="users-page__muted">—</span>
          const date = new Date(r.createdAt)
          if (isNaN(date.getTime())) return <span className="users-page__muted">—</span>
          return format(date, 'dd/MM/yyyy', { locale: ptBR })
        },
      },
    ],
    [],
  )

  const handleBeforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/')
    if (!isImage) {
      message.error('Selecione um arquivo de imagem válido.')
      return Upload.LIST_IGNORE
    }

    const isLt3M = file.size / 1024 / 1024 < 3
    if (!isLt3M) {
      message.error('A imagem deve ter no máximo 3MB.')
      return Upload.LIST_IGNORE
    }

    return false
  }

  const handleUploadChange = async (info: UploadChangeParam<UploadFile>) => {
    const newFileList = info.fileList.slice(-1)
    setFileList(newFileList)

    const currentFile = newFileList[0]?.originFileObj
    if (currentFile) {
      const base64 = await getBase64(currentFile as File)
      setPhotoPreview(base64)
      form.setFieldValue('photoFile', currentFile as File)
    } else {
      setPhotoPreview(editingUser?.photoUrl)
      form.setFieldValue('photoFile', undefined)
    }
  }

  const handleSubmit = (values: UserFormValues) => {
    const payload = {
      ...values,
      cpf: values.cpf ? values.cpf.replace(/\D/g, '') : undefined,
      phone: values.phone ? values.phone.replace(/\D/g, '') : undefined,
      photoUrl: photoPreview,
    }

    if (editingUser) {
      updateMutation.mutate({
        id: editingUser.id,
        ...payload,
        password: values.password?.trim() ? values.password : undefined,
      })
      return
    }

    createMutation.mutate({
      ...payload,
      password: values.password,
    })
  }

  return (
    <div className="users-page">
      <div className="users-page__header">
        <div className="users-page__title-wrap">
          <Title level={4} className="users-page__title">
            Usuários
          </Title>
          <Text className="users-page__subtitle">
            Gerencie o cadastro e os perfis dos usuários do sistema
          </Text>
        </div>

        <div className="users-page__actions">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleOpenCreate}
            className="users-page__new-btn"
          >
            Novo Usuário
          </Button>
        </div>
      </div>

      <div className="users-page__table-card">
        <Table
          dataSource={(data ?? []) as ExtendedUserListItem[]}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          scroll={{ x: 1200 }}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          onRow={(record: ExtendedUserListItem) => ({
            onClick: () => handleOpenEdit(record),
            style: { cursor: 'pointer' },
          })}
        />
      </div>

      <Modal
        title={editingUser ? 'Editar Usuário' : 'Novo Usuário'}
        open={open}
        onCancel={handleCloseModal}
        onOk={() => form.submit()}
        okText={editingUser ? 'Salvar alterações' : 'Criar usuário'}
        confirmLoading={isSaving}
        width={1360}
        destroyOnHidden
        className="users-page__modal"
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            role: 'Operador',
            isActive: true,
          }}
          onFinish={handleSubmit}
        >
          <div className="users-page__profile-upload">
            <Avatar
              size={130}
              src={photoPreview}
              icon={!photoPreview ? <UserOutlined /> : undefined}
              className="users-page__profile-avatar"
            />

            <div className="users-page__profile-upload-content">
              <div className="users-page__profile-upload-title">Foto do perfil</div>
              <div className="users-page__profile-upload-text">
                Selecione uma imagem para identificar o usuário no sistema.
              </div>

              <Form.Item name="photoFile" valuePropName="file">
                <Upload
                  accept="image/*"
                  beforeUpload={handleBeforeUpload}
                  onChange={handleUploadChange}
                  fileList={fileList}
                  maxCount={1}
                  showUploadList={false}
                >
                  <Button icon={<UploadOutlined />}>Buscar foto no computador</Button>
                </Upload>
              </Form.Item>
            </div>
          </div>

          <div className="users-page__form-grid">
            <Form.Item
              label="Nome completo"
              name="name"
              rules={[{ required: true, message: 'Informe o nome' }]}
            >
              <Input placeholder="Digite o nome completo" />
            </Form.Item>

            <Form.Item
              label="E-mail"
              name="email"
              rules={[
                { required: true, message: 'Informe o e-mail' },
                { type: 'email', message: 'Informe um e-mail válido' },
              ]}
            >
              <Input placeholder="usuario@empresa.com" />
            </Form.Item>

            <Form.Item
              label="Senha"
              name="password"
              rules={
                editingUser
                  ? [{ min: 6, message: 'Mínimo de 6 caracteres' }]
                  : [
                    { required: true, message: 'Informe a senha' },
                    { min: 6, message: 'Mínimo de 6 caracteres' },
                  ]
              }
              extra={
                editingUser
                  ? 'Preencha somente se desejar alterar a senha.'
                  : undefined
              }
            >
              <Input.Password
                placeholder={
                  editingUser ? 'Deixe em branco para manter a atual' : 'Digite a senha'
                }
              />
            </Form.Item>

            <Form.Item label="Papel" name="role">
              <Select
                options={[
                  { label: 'Admin', value: 'Admin' },
                  { label: 'Gestor', value: 'Gestor' },
                  { label: 'Operador', value: 'Operador' },
                ]}
              />
            </Form.Item>

            <Form.Item
              label="CPF"
              name="cpf"
              rules={[
                {
                  pattern: /^\d{11}$|^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
                  message: 'Informe um CPF válido',
                },
              ]}
            >
              <Input placeholder="Opcional" maxLength={14} />
            </Form.Item>

            <Form.Item label="Telefone" name="phone">
              <Input placeholder="(51) 99999-9999" maxLength={15} />
            </Form.Item>

            <Form.Item label="Setor / Departamento" name="department">
              <Input placeholder="Ex.: Qualidade, Engenharia, RH" />
            </Form.Item>

            <Form.Item label="Cargo / Função" name="jobTitle">
              <Input placeholder="Ex.: Analista, Coordenador, Supervisor" />
            </Form.Item>

            <Form.Item label="Posição" name="position">
              <Input placeholder="Ex.: Responsável por aprovação documental" />
            </Form.Item>

            <Form.Item label="Status" name="isActive">
              <Select
                options={[
                  { label: 'Ativo', value: true },
                  { label: 'Inativo', value: false },
                ]}
              />
            </Form.Item>
          </div>

          <Form.Item label="Observações" name="notes">
            <TextArea
              rows={4}
              placeholder="Informações adicionais relevantes sobre o usuário"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}