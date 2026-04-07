import { mockApi } from './mockApi'
import type { Visualizacao } from '../pages/Exibicao/ExibicaoPage'

const BASE_PATH = '/visualizacoes'

export async function getVisualizacoes(): Promise<Visualizacao[]> {
  const data = await mockApi.get<Visualizacao[]>(BASE_PATH)
  return [...data].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
}

export async function createVisualizacao(payload: Omit<Visualizacao, 'id'>): Promise<Visualizacao> {
  return mockApi.post<Visualizacao>(BASE_PATH, payload)
}

export async function updateVisualizacao(id: string, payload: Omit<Visualizacao, 'id'>): Promise<Visualizacao> {
  return mockApi.put<Visualizacao>(`${BASE_PATH}/${id}`, payload)
}

export async function deleteVisualizacao(id: string): Promise<void> {
  await mockApi.delete(`${BASE_PATH}/${id}`)
}
