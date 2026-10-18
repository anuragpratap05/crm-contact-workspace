import { api } from '@/lib/api/client'
import type {
  BulkTagAction,
  BulkTagResult,
  Contact,
  ContactListQuery,
  PaginatedContacts,
  UpdateContactRequest,
} from '@/types/api'

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

export async function fetchContact(id: string, signal?: AbortSignal): Promise<Contact> {
  const { data } = await api.get<{ data: Contact }>(`/contacts/${id}`, { signal })
  return data.data
}

export async function updateContact(id: string, body: UpdateContactRequest): Promise<Contact> {
  const { data } = await api.put<{ data: Contact }>(`/contacts/${id}`, body)
  return data.data
}

export async function addTag(id: string, tag: string): Promise<Contact> {
  const { data } = await api.post<{ data: Contact }>(`/contacts/${id}/tags`, { tag })
  return data.data
}

export async function removeTag(id: string, tag: string): Promise<Contact> {
  const { data } = await api.delete<{ data: Contact }>(
    `/contacts/${id}/tags/${encodeURIComponent(tag)}`,
  )
  return data.data
}

export async function bulkTag(
  contactIds: string[],
  tag: string,
  action: BulkTagAction,
): Promise<BulkTagResult> {
  const { data } = await api.post<{ data: BulkTagResult }>('/contacts/tags/bulk', {
    contactIds,
    tag,
    action,
  })
  return data.data
}
