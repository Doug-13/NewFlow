import { INITIAL_MOCK_DB, type MockDatabase } from './mockData'

const STORAGE_KEY = 'gestao-doc:mock-db'

type CollectionName = keyof MockDatabase

type CollectionItem<TCollection extends CollectionName> = MockDatabase[TCollection][number]

function canUseLocalStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function clone<T>(value: T): T {
  return structuredClone(value)
}

function readStorage(): MockDatabase | null {
  if (!canUseLocalStorage()) return null

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as MockDatabase
  } catch {
    return null
  }
}

function writeStorage(db: MockDatabase) {
  if (!canUseLocalStorage()) return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
}

function ensureAllCollections(db: Partial<MockDatabase> | null | undefined): MockDatabase {
  return {
    platformAdmins: clone(db?.platformAdmins ?? INITIAL_MOCK_DB.platformAdmins),
    users: clone(db?.users ?? INITIAL_MOCK_DB.users),
    tenantModules: clone(db?.tenantModules ?? INITIAL_MOCK_DB.tenantModules),
    organizationUnits: clone(db?.organizationUnits ?? INITIAL_MOCK_DB.organizationUnits),
    organizationAreas: clone(db?.organizationAreas ?? INITIAL_MOCK_DB.organizationAreas),
    organizationDisciplines: clone(db?.organizationDisciplines ?? INITIAL_MOCK_DB.organizationDisciplines),
    organizationRoles: clone(db?.organizationRoles ?? INITIAL_MOCK_DB.organizationRoles),
    organizationGroups: clone(db?.organizationGroups ?? INITIAL_MOCK_DB.organizationGroups),
    documentInstances: clone(db?.documentInstances ?? INITIAL_MOCK_DB.documentInstances),
    tasks: clone(db?.tasks ?? INITIAL_MOCK_DB.tasks),
    workflows: clone(db?.workflows ?? INITIAL_MOCK_DB.workflows),
    documentTypes: clone(db?.documentTypes ?? INITIAL_MOCK_DB.documentTypes),
    metadataSets: clone(db?.metadataSets ?? INITIAL_MOCK_DB.metadataSets),
    metadataDefinitions: clone(db?.metadataDefinitions ?? INITIAL_MOCK_DB.metadataDefinitions),
    metadataValues: clone(db?.metadataValues ?? INITIAL_MOCK_DB.metadataValues),
    notificationTemplates: clone(db?.notificationTemplates ?? INITIAL_MOCK_DB.notificationTemplates),
    dashboard: clone(db?.dashboard ?? INITIAL_MOCK_DB.dashboard),
  }
}

export function getMockDb(): MockDatabase {
  return ensureAllCollections(readStorage())
}

export function saveMockDb(db: MockDatabase): MockDatabase {
  const normalized = ensureAllCollections(db)
  writeStorage(normalized)
  return clone(normalized)
}

export function resetMockDb(): MockDatabase {
  return saveMockDb(clone(INITIAL_MOCK_DB))
}

export function initializeMockDb(): MockDatabase {
  const current = readStorage()
  if (!current) {
    return resetMockDb()
  }

  const normalized = ensureAllCollections(current)
  writeStorage(normalized)
  return clone(normalized)
}

export function getCollection<TCollection extends CollectionName>(
  collectionName: TCollection
): CollectionItem<TCollection>[] {
  const db = getMockDb()
  return clone(db[collectionName]) as CollectionItem<TCollection>[]
}

export function setCollection<TCollection extends CollectionName>(
  collectionName: TCollection,
  items: CollectionItem<TCollection>[]
): CollectionItem<TCollection>[] {
  const db = getMockDb()
  db[collectionName] = clone(items) as MockDatabase[TCollection]
  saveMockDb(db)
  return clone(db[collectionName]) as CollectionItem<TCollection>[]
}

export function findById<TCollection extends CollectionName>(
  collectionName: TCollection,
  id: string
): CollectionItem<TCollection> | null {
  const items = getCollection(collectionName)
  return (items.find((item) => String((item as { id?: string }).id) === id) ?? null) as CollectionItem<TCollection> | null
}

export function insertItem<TCollection extends CollectionName>(
  collectionName: TCollection,
  item: CollectionItem<TCollection>
): CollectionItem<TCollection> {
  const items = getCollection(collectionName)
  items.push(clone(item))
  setCollection(collectionName, items)
  return clone(item)
}

export function updateItem<TCollection extends CollectionName>(
  collectionName: TCollection,
  id: string,
  patch: Partial<CollectionItem<TCollection>>
): CollectionItem<TCollection> | null {
  const items = getCollection(collectionName)
  const index = items.findIndex((item) => String((item as { id?: string }).id) === id)

  if (index < 0) return null

  const updated = {
    ...items[index],
    ...clone(patch),
  }

  items[index] = updated
  setCollection(collectionName, items)
  return clone(updated)
}

export function removeItem<TCollection extends CollectionName>(
  collectionName: TCollection,
  id: string
): boolean {
  const items = getCollection(collectionName)
  const nextItems = items.filter((item) => String((item as { id?: string }).id) !== id)

  if (nextItems.length === items.length) return false

  setCollection(collectionName, nextItems)
  return true
}

export type { CollectionName, CollectionItem }
