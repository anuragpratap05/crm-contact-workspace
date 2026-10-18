import { api } from '@/lib/api/client'
import type { ContactListQuery, PaginatedContacts } from '@/types/api'

function toRequestParams(query: ContactListQuery): Record<string, string> {
  const params: Record<string, string> = {}

  if (query.search) params.search = query.search
  if (query.tags && query.tags.length > 0) params.tags = query.tags.join(',')
  if (query.tagMatch) params.tagMatch = query.tagMatch
  if (query.company) params.company = query.company
  if (query.createdFrom) params.createdFrom = query.createdFrom
  if (query.createdTo) params.createdTo = query.createdTo
  if (query.sortBy) params.sortBy = query.sortBy
  if (query.sortOrder) params.sortOrder = query.sortOrder
  if (query.page) params.page = String(query.page)
  if (query.limit) params.limit = String(query.limit)

  return params
}

export async function fetchContacts(
  query: ContactListQuery = {},
  signal?: AbortSignal,
): Promise<PaginatedContacts> {
  const { data } = await api.get<PaginatedContacts>('/contacts', {
    params: toRequestParams(query),
    signal,
  })
  return data
}

export async function fetchTags(signal?: AbortSignal): Promise<string[]> {
  const { data } = await api.get<{ data: string[] }>('/tags', { signal })
  return data.data
}

export async function fetchCompanies(signal?: AbortSignal): Promise<string[]> {
  const { data } = await api.get<{ data: string[] }>('/companies', { signal })
  return data.data
}
