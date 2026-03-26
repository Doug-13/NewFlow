import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, Descriptions, Button, Upload, Space, Typography, Tabs, Table, Modal, Form, Input, Radio, Tag, Popconfirm, message } from 'antd'
import { UploadOutlined, DownloadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { getDocument, uploadFile, cancelDocument, downloadFile } from '../../api/documents'
import { executeTask } from '../../api/tasks'
import { StatusBadge } from '../../components/StatusBadge'
import { Timeline } from '../../components/Timeline'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useAuthStore } from '../../store/authStore'
import type { ApprovalTask } from '../../types'
import { getMetadataValues, saveMetadataValues } from '../../api/metadata'
import { MetadataForm } from '../../components/MetadataForm'

const { Title, Text } = Typography

export function DocumentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const user = useAuthStore(s => s.user)
  const [taskModal, setTaskModal] = useState<ApprovalTask | null>(null)
  const [taskForm] = Form.useForm()

  const { data: doc, isLoading } = useQuery({ queryKey: ['document', id], queryFn: () => getDocument(id!) })

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadFile(id!, file),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document', id] }); message.success('Arquivo enviado!') }
  })

  const cancelMutation = useMutation({
    mutationFn: () => cancelDocument(id!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['document', id] }); message.success('Documento cancelado.') }
  })

  const taskMutation = useMutation({
    mutationFn: (values: any) => executeTask(taskModal!.id, values.action, values.comment),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document', id] })
      qc.invalidateQueries({ queryKey: ['tasks'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setTaskModal(null)
      taskForm.resetFields()
      message.success('Ação executada!')
    },
    onError: (err: any) => { message.error(err?.response?.data?.error ?? 'Erro ao executar ação.') }
  })

  const [metaForm] = Form.useForm()

  const { data: metadataFields } = useQuery({
    queryKey: ['metadata-values', id],
    queryFn: () => getMetadataValues(id!)
  })

  const saveMetaMutation = useMutation({
    mutationFn: (values: Record<string, any>) => {
      const payload = Object.entries(values).map(([metadataDefinitionId, value]) => ({
        metadataDefinitionId,
        value: value?.toISOString ? value.toISOString() : value
      }))
      return saveMetadataValues(id!, payload)
    },
    onSuccess: () => message.success('Metadados salvos!')
  })

  if (isLoading || !doc) return <div style={{ padding: 24 }}>Carregando...</div>

  const myPendingTask = doc.tasks.find(t => t.status === 'Pendente' && t.assignedToUserId === user?.id)

  const fileColumns = [
    { title: 'Versão', dataIndex: 'versionNumber', width: 80 },
    { title: 'Arquivo', dataIndex: 'originalFilename' },
    { title: 'Tamanho', key: 'size', render: (_: any, r: any) => `${(r.fileSizeBytes / 1024).toFixed(1)} KB` },
    { title: 'Enviado por', dataIndex: 'uploadedByUserName' },
    { title: 'Data', key: 'date', render: (_: any, r: any) => format(new Date(r.uploadedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) },
    { title: '', key: 'dl', render: (_: any, r: any) => (
      <a href={downloadFile(id!, r.id)} target="_blank" rel="noreferrer">
        <Button size="small" icon={<DownloadOutlined />}>Baixar</Button>
      </a>
    )},
  ]

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>Voltar</Button>
        <Title level={4} style={{ margin: 0 }}>{doc.title}</Title>
        <StatusBadge status={doc.status} />
      </Space>

      {myPendingTask && (
        <Card style={{ marginBottom: 16, borderColor: '#fa8c16', background: '#fffbe6' }}>
          <strong>Você tem uma tarefa pendente neste documento.</strong>
          <div>Etapa: <Tag>{myPendingTask.stepName}</Tag></div>
          <Button type="primary" style={{ marginTop: 8 }} onClick={() => { setTaskModal(myPendingTask); taskForm.resetFields() }}>
            Executar Ação
          </Button>
        </Card>
      )}

      <Tabs items={[
        {
          key: 'info', label: 'Informações',
          children: (
            <Card>
              <Descriptions column={2}>
                <Descriptions.Item label="Tipo">{doc.documentTypeName}</Descriptions.Item>
                <Descriptions.Item label="Workflow">{doc.workflowName}</Descriptions.Item>
                <Descriptions.Item label="Etapa Atual">{doc.currentStepName ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="Status"><StatusBadge status={doc.status} /></Descriptions.Item>
                <Descriptions.Item label="Criado por">{doc.createdByUserName}</Descriptions.Item>
                <Descriptions.Item label="Criado em">{format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}</Descriptions.Item>
                <Descriptions.Item label="Descrição" span={2}>{doc.description ?? '-'}</Descriptions.Item>
              </Descriptions>
              {doc.status !== 'Aprovado' && doc.status !== 'Reprovado' && doc.status !== 'Cancelado' && (
                <Popconfirm title="Cancelar documento?" onConfirm={() => cancelMutation.mutate()}>
                  <Button danger style={{ marginTop: 16 }}>Cancelar Documento</Button>
                </Popconfirm>
              )}
            </Card>
          )
        },
        {
          key: 'files', label: `Arquivos (${doc.files.length})`,
          children: (
            <Card extra={
              <Upload beforeUpload={(f) => { uploadMutation.mutate(f); return false }} showUploadList={false}>
                <Button icon={<UploadOutlined />} loading={uploadMutation.isPending}>Nova Versão</Button>
              </Upload>
            }>
              <Table dataSource={doc.files} columns={fileColumns} rowKey="id" pagination={false} size="small" />
            </Card>
          )
        },
        {
          key: 'tasks', label: `Tarefas (${doc.tasks.length})`,
          children: (
            <Card>
              <Table dataSource={doc.tasks} rowKey="id" pagination={false} size="small" columns={[
                { title: 'Etapa', dataIndex: 'stepName' },
                { title: 'Responsável', dataIndex: 'assignedToUserName' },
                { title: 'Status', key: 'status', render: (_: any, r: any) => <StatusBadge status={r.status} /> },
                { title: 'Ação', dataIndex: 'actionTaken', render: (v: any) => v ?? '-' },
                { title: 'Comentário', dataIndex: 'comment', render: (v: any) => v ?? '-' },
                { title: 'Concluída', key: 'completedAt', render: (_: any, r: any) => r.completedAt ? format(new Date(r.completedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '-' },
              ]} />
            </Card>
          )
        },
        {
          key: 'metadata',
          label: `Metadados (${metadataFields?.length ?? 0})`,
          children: (
            <Card>
              {metadataFields && metadataFields.length > 0 ? (
                <Form form={metaForm} layout="vertical" onFinish={(values) => saveMetaMutation.mutate(values)}>
                  <MetadataForm fields={metadataFields} form={metaForm} />
                  <Button type="primary" htmlType="submit" loading={saveMetaMutation.isPending} style={{ marginTop: 8 }}>
                    Salvar Metadados
                  </Button>
                </Form>
              ) : (
                <Text type="secondary">Nenhum metadado configurado para este tipo de documento.</Text>
              )}
            </Card>
          )
        },
        {
          key: 'history', label: 'Histórico',
          children: <Card><Timeline logs={doc.auditLogs} /></Card>
        },
      ]} />

      <Modal
        title={`Executar ação — ${taskModal?.stepName}`}
        open={!!taskModal}
        onCancel={() => setTaskModal(null)}
        onOk={() => taskForm.submit()}
        confirmLoading={taskMutation.isPending}
      >
        <Form form={taskForm} layout="vertical" onFinish={(values) => taskMutation.mutate(values)}>
          <Form.Item label="Ação" name="action" rules={[{ required: true }]}>
            <Radio.Group>
              {(myPendingTask?.stepName ? doc.availableActions : []).map(action => (
                <Radio.Button key={action} value={action}>{action}</Radio.Button>
              ))}
            </Radio.Group>
          </Form.Item>
          <Form.Item label="Comentário" name="comment">
            <Input.TextArea rows={3} placeholder="Opcional..." />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}
