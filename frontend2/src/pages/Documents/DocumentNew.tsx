import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Form, Input, Button, Select, Card, Typography, Space, message, Upload } from 'antd'
import { UploadOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import { getWorkflows } from '../../api/workflows'
import { createDocument, uploadFile } from '../../api/documents'

const { Title } = Typography

export function DocumentNewPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedWorkflowId = searchParams.get('workflowId')
  const qc = useQueryClient()
  const [form] = Form.useForm()
  const [fileToUpload, setFileToUpload] = useState<File | null>(null)

  const { data: workflows } = useQuery({ queryKey: ['workflows'], queryFn: getWorkflows })

  useEffect(() => {
    if (!preselectedWorkflowId || !workflows?.length) return
    const wf = workflows.find((w: any) => w.id === preselectedWorkflowId)
    if (!wf) return
    form.setFieldValue('workflowId', wf.id)
  }, [preselectedWorkflowId, workflows, form])

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

  const handleSubmit = (values: any) => {
    mutation.mutate({
      title: values.title,
      workflowId: values.workflowId,
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
          <Form.Item label="Título (Nome do documento)" name="title" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Processo / Workflow" name="workflowId" rules={[{ required: true }]}>
            <Select
              options={workflows?.map((w: any) => ({ label: `${w.name}${w.version ? ` (v${w.version})` : ''}`, value: w.id }))}
              placeholder="Selecione..."
              disabled={!!preselectedWorkflowId}
            />
          </Form.Item>
          <Form.Item label="Arquivo inicial (opcional)">
            <Upload beforeUpload={(f) => { setFileToUpload(f); return false }} maxCount={1}>
              <Button icon={<UploadOutlined />}>Selecionar arquivo</Button>
            </Upload>
          </Form.Item>
        </Card>

        <Button type="primary" htmlType="submit" loading={mutation.isPending}>Criar Documento</Button>
      </Form>
    </div>
  )
}
