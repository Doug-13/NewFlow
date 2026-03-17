import { api } from './client'

export interface UnitDto { id: string; name: string; description?: string; isActive: boolean; createdAt: string }
export interface AreaDto { id: string; name: string; description?: string; unitId?: string; unitName?: string; isActive: boolean; createdAt: string }
export interface OrgRoleDto { id: string; name: string; description?: string; isActive: boolean; createdAt: string }

export const getUnits = async () => (await api.get('/organization/units')).data as UnitDto[]
export const createUnit = async (data: { name: string; description?: string }) => (await api.post('/organization/units', data)).data as UnitDto
export const updateUnit = async (id: string, data: { name: string; description?: string }) => (await api.put(`/organization/units/${id}`, data)).data as UnitDto
export const deleteUnit = async (id: string) => api.delete(`/organization/units/${id}`)

export const getAreas = async () => (await api.get('/organization/areas')).data as AreaDto[]
export const createArea = async (data: { name: string; description?: string; unitId?: string }) => (await api.post('/organization/areas', data)).data as AreaDto
export const updateArea = async (id: string, data: { name: string; description?: string; unitId?: string }) => (await api.put(`/organization/areas/${id}`, data)).data as AreaDto
export const deleteArea = async (id: string) => api.delete(`/organization/areas/${id}`)

export const getOrgRoles = async () => (await api.get('/organization/roles')).data as OrgRoleDto[]
export const createOrgRole = async (data: { name: string; description?: string }) => (await api.post('/organization/roles', data)).data as OrgRoleDto
export const updateOrgRole = async (id: string, data: { name: string; description?: string }) => (await api.put(`/organization/roles/${id}`, data)).data as OrgRoleDto
export const deleteOrgRole = async (id: string) => api.delete(`/organization/roles/${id}`)
