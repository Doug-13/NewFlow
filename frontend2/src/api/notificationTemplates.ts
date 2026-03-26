import { mockApi } from './mockApi'
import type {
  NotificationTemplate,
  NotificationTemplateListItem,
  NotificationTemplatePayload,
} from '../types/notificationTemplates'

const BASE_PATH = '/notificationTemplates'
const DEFAULT_TENANT_ID = 'tenant-1'

function normalizePayload(payload: NotificationTemplatePayload): NotificationTemplatePayload {
  return {
    ...payload,
    name: payload.name.trim(),
    code: payload.code.trim(),
    description: payload.description?.trim() || '',
    subject: payload.channel === 'email' ? payload.subject?.trim() || '' : '',
    body: payload.body.trim(),
    isActive: Boolean(payload.isActive),
  }
}

export async function getNotificationTemplates(): Promise<NotificationTemplateListItem[]> {
  const data = await mockApi.get<NotificationTemplate[]>(BASE_PATH)
  return [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
}

export async function getNotificationTemplateById(id: string): Promise<NotificationTemplate | null> {
  try {
    return await mockApi.get<NotificationTemplate>(`${BASE_PATH}/${id}`)
  } catch {
    return null
  }
}

export async function createNotificationTemplate(
  payload: NotificationTemplatePayload
): Promise<NotificationTemplate> {
  const normalized = normalizePayload(payload)

  return mockApi.post<NotificationTemplate>(BASE_PATH, {
    tenantId: DEFAULT_TENANT_ID,
    ...normalized,
  })
}

export async function updateNotificationTemplate(
  id: string,
  payload: NotificationTemplatePayload
): Promise<NotificationTemplate> {
  const normalized = normalizePayload(payload)

  return mockApi.put<NotificationTemplate>(`${BASE_PATH}/${id}`, {
    ...normalized,
  })
}

export async function deleteNotificationTemplate(id: string): Promise<void> {
  await mockApi.delete(`${BASE_PATH}/${id}`)
}
