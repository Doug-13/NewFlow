export type NotificationChannel = 'email' | 'system' | 'whatsapp'

export type NotificationTemplate = {
  id: string
  tenantId: string
  name: string
  code: string
  description: string
  channel: NotificationChannel
  subject: string
  body: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type NotificationTemplatePayload = {
  name: string
  code: string
  description: string
  channel: NotificationChannel
  subject: string
  body: string
  isActive: boolean
}

export type NotificationTemplateListItem = NotificationTemplate
