import { useEffect, useState } from 'react'
import { Card, Typography } from 'antd'
import { BpmnEditor } from '../../features/workflows/components/BpmnEditor'

const STORAGE_KEY = 'gestao-docs:workflow-designer:default'

export function WorkflowDesignerPage() {
  const [xml, setXml] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEY) ?? ''
  })

  useEffect(() => {
    if (!xml.trim()) return
    localStorage.setItem(STORAGE_KEY, xml)
  }, [xml])

  return (
    <Card bordered={false}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Modelador BPMN
      </Typography.Title>

      <Typography.Paragraph type="secondary">
        Editor completo de workflow com modelagem visual,
        painel de propriedades, minimap, zoom,
        importação e exportação.
      </Typography.Paragraph>

      <BpmnEditor
        initialXml={xml}
        onChange={setXml}
      />
    </Card>
  )
}