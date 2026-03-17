import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Button, Select, Card, Typography, Space, message, Upload } from 'antd'
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { getDocumentTypes } from '../../api/documentTypes'
import { getWorkflows } from '../../api/workflows'
import { getUsers } from '../../api/users'
import { createDocument, uploadFile } from '../../api/documents'

const { Title } = Typography

export function DocumentNewPage() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const [selectedWorkflow, setSelectedWorkflow] = useState<any>(null)
  const [assignments, setAssignments] = useState<any[]>([])
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)

  const { data: docTypes } = useQuery({ queryKey: ['document-types'], queryFn: () => getDocumentTypes(true) })
  const { data: workflows } = useQuery({ queryKey: ['workflows'], queryFn: getWorkflows })
  const { data: users } = useQuery({ queryKey: ['users'], queryFn: getUsers })

  const mutation = useMutation({
    mutationFn: createDocument,
    onSuccess: async (data) => {
      if (fileToUpload && data.id) {
        try { await uploadFile(data.id, fileToUpload) } catch { /* ignore */ }
      }
      qc.invalidateQueries({ queryKey: ['documents'] })
      message.success('Documento criado!')
      navigate(`/documents/${data.id}`)
    }
  })

  const handleWorkflowChange = (id: string) => {
    const wf = workflows?.find(w => w.id === id)
    setSelectedWorkflow(wf ?? null)
    setAssignments(wf?.steps.map(s => ({ workflowStepId: s.id, assignedToUserId: '', stepName: s.name })) ?? [])
  }

  const handleSubmit = (values: any) => {
    if (assignments.some(a => !a.assignedToUserId)) {
      message.error('Atribua um responsável para cada etapa do workflow.')
      return
    }
    mutation.mutate({
      title: values.title,
      description: values.description,
      documentTypeId: values.documentTypeId,
      workflowId: values.workflowId,
      stepAssignments: assignments.map(a => ({ workflowStepId: a.workflowStepId, assignedToUserId: a.assignedToUserId }))
    })
  }

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/documents')}>Voltar</Button>
        <Title level={4} style={{ margin: 0 }}>Novo Documento</Title>
      </Space>

      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Card style={{ marginBottom: 16 }}>
          <Form.Item label="Título" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Descrição" name="description">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item label="Tipo de Documento" name="documentTypeId" rules={[{ required: true }]}>
            <Select options={docTypes?.map(d => ({ label: d.name, value: d.id }))} placeholder="Selecione..." />
          </Form.Item>
          <Form.Item label="Workflow" name="workflowId" rules={[{ required: true }]}>
            <Select
              options={workflows?.map(w => ({ label: `${w.name} (v${w.version})`, value: w.id }))}
              placeholder="Selecione..."
              onChange={handleWorkflowChange}
            />
          </Form.Item>
          <Form.Item label="Arquivo inicial (opcional)">
            <Upload beforeUpload={(f) => { setFileToUpload(f); return false }} maxCount={1}>
              <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
            </Upload>
          </Form.Item>
        </Card>

        {selectedWorkflow && assignments.length > 0 && (
          <Card title="Responsáveis por Etapa" style={{ marginBottom: 16 }}>
            {assignments.map((a, i) => (
              <Form.Item key={a.workflowStepId} label={`Etapa: ${a.stepName}`} required>
                <Select
                  options={users?.map((u: { id: string; name: string; role: string }) => ({ label: `${u.name} (${u.role})`, value: u.id }))}
                  placeholder="Selecione o responsável..."
                  onChange={v => {
                    const newA = [...assignments]
                    newA[i] = { ...newA[i], assignedToUserId: v }
                    setAssignments(newA)
                  }}
                />
              </Form.Item>
            ))}
          </Card>
        )}

        <Button type="primary" htmlType="submit" loading={mutation.isPending}>Criar Documento</Button>
      </Form>
    </div>
  )
}
