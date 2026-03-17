import { Timeline as AntTimeline } from 'antd'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { AuditLog } from '../types'

const actionLabels: Record<string, string> = {
  DocumentoCreated: 'Documento criado',
  FileUploaded:     'Arquivo enviado',
  TaskExecuted:     'Ação executada',
  DocumentoCancelled: 'Documento cancelado',
}

export function Timeline({ logs }: { logs: AuditLog[] }) {
  return (
    <AntTimeline
      items={logs.map((log) => ({
        children: (
          <div>
            <strong>{actionLabels[log.action] ?? log.action}</strong>
            {log.userName && <span style={{ color: '#888', marginLeft: 8 }}>por {log.userName}</span>}
            {log.comment && <p style={{ margin: '4px 0 0', color: '#555' }}>{log.comment}</p>}
            <small style={{ color: '#aaa' }}>
              {format(new Date(log.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
            </small>
          </div>
        ),
      }))}
    />
  )
}
