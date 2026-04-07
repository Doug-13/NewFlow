import { mockApi } from './mockApi'
import type { ProcessoVisualizacaoConfig } from './mockData'

const BASE_PATH = '/processoVisualizacoes'

export async function getConfigByProcesso(processId: string): Promise<ProcessoVisualizacaoConfig | null> {
  const all = await mockApi.get<ProcessoVisualizacaoConfig[]>(`${BASE_PATH}?processId=${processId}`)
  return all[0] ?? null
}

export async function saveConfigProcesso(
  processId: string,
  visualizacaoIdsAtivas: string[],
): Promise<ProcessoVisualizacaoConfig> {
  const all = await mockApi.get<ProcessoVisualizacaoConfig[]>(`${BASE_PATH}?processId=${processId}`)
  const existing = all[0] ?? null

  if (existing) {
    return mockApi.put<ProcessoVisualizacaoConfig>(`${BASE_PATH}/${existing.id}`, {
      processId,
      visualizacaoIdsAtivas,
    })
  }

  return mockApi.post<ProcessoVisualizacaoConfig>(BASE_PATH, {
    processId,
    visualizacaoIdsAtivas,
  })
}
