export interface Contact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  company?: string
  tags: string[]
  version: number
  createdAt: string
  updatedAt: string
}

export interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

export interface PaginatedContacts {
  items: Contact[]
  pagination: Pagination
}

export const ACTIVITY_TYPES = ['CONTACT_UPDATED', 'TAG_ADDED', 'TAG_REMOVED'] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]

export interface ActivityMetadata {
  fields?: string[]
  tag?: string
  bulk?: boolean
}

export interface Activity {
  id: string
  contactId: string
  type: ActivityType
  metadata?: ActivityMetadata
  createdAt: string
}

export type BulkTagAction = 'add' | 'remove'

export interface BulkTagResult {
  matched: number
  modified: number
  tag: string
  action: BulkTagAction
}

export type SortBy = 'name' | 'createdAt' | 'updatedAt'
export type SortOrder = 'asc' | 'desc'
export type TagMatch = 'any' | 'all'

export interface ContactListQuery {
  search?: string
  tags?: string[]
  tagMatch?: TagMatch
  company?: string
  createdFrom?: string
  createdTo?: string
  sortBy?: SortBy
  sortOrder?: SortOrder
  page?: number
  limit?: number
}
