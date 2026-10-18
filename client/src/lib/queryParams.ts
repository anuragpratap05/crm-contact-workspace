import type { ContactListQuery, SortBy, SortOrder, TagMatch } from '@/types/api'

export const PAGE_SIZES = [25, 50, 100] as const

export const DEFAULTS = {
  page: 1,
  limit: 25,
  sortBy: 'createdAt',
  sortOrder: 'desc',
  tagMatch: 'any',
} as const satisfies Partial<ContactListParams>

const SORT_BY_VALUES: readonly SortBy[] = ['name', 'createdAt', 'updatedAt']
const SORT_ORDER_VALUES: readonly SortOrder[] = ['asc', 'desc']
const TAG_MATCH_VALUES: readonly TagMatch[] = ['any', 'all']

const MAX_SEARCH_LENGTH = 100
const MAX_COMPANY_LENGTH = 120

export interface ContactListParams {
  search: string
  tags: string[]
  tagMatch: TagMatch
  company: string
  createdFrom: string
  createdTo: string
  sortBy: SortBy
  sortOrder: SortOrder
  page: number
  limit: number
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[], fallback: T): T {
  return allowed.find((candidate) => candidate === value) ?? fallback
}

function positiveInteger(value: string | null, fallback: number): number {
  if (value === null) return fallback
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 1) return fallback
  return parsed
}

function pageSize(value: string | null): number {
  const parsed = positiveInteger(value, DEFAULTS.limit)
  return PAGE_SIZES.includes(parsed as (typeof PAGE_SIZES)[number]) ? parsed : DEFAULTS.limit
}

function isoDate(value: string | null): string {
  if (!value) return ''
  return Number.isNaN(new Date(value).getTime()) ? '' : value
}

function tagList(value: string | null): string[] {
  if (!value) return []
  const seen = new Set<string>()
  for (const tag of value.split(',')) {
    const trimmed = tag.trim()
    if (trimmed) seen.add(trimmed)
  }
  return [...seen]
}

export function parseContactListParams(search: URLSearchParams): ContactListParams {
  let createdFrom = isoDate(search.get('createdFrom'))
  let createdTo = isoDate(search.get('createdTo'))

  if (createdFrom && createdTo && new Date(createdFrom) > new Date(createdTo)) {
    createdFrom = ''
    createdTo = ''
  }

  return {
    search: (search.get('search') ?? '').trim().slice(0, MAX_SEARCH_LENGTH),
    tags: tagList(search.get('tags')),
    tagMatch: oneOf(search.get('tagMatch'), TAG_MATCH_VALUES, DEFAULTS.tagMatch),
    company: (search.get('company') ?? '').trim().slice(0, MAX_COMPANY_LENGTH),
    createdFrom,
    createdTo,
    sortBy: oneOf(search.get('sortBy'), SORT_BY_VALUES, DEFAULTS.sortBy),
    sortOrder: oneOf(search.get('sortOrder'), SORT_ORDER_VALUES, DEFAULTS.sortOrder),
    page: positiveInteger(search.get('page'), DEFAULTS.page),
    limit: pageSize(search.get('limit')),
  }
}

export function toSearchParams(params: ContactListParams): URLSearchParams {
  const search = new URLSearchParams()

  if (params.search) search.set('search', params.search)
  if (params.tags.length > 0) search.set('tags', params.tags.join(','))
  if (params.tagMatch !== DEFAULTS.tagMatch) search.set('tagMatch', params.tagMatch)
  if (params.company) search.set('company', params.company)
  if (params.createdFrom) search.set('createdFrom', params.createdFrom)
  if (params.createdTo) search.set('createdTo', params.createdTo)
  if (params.sortBy !== DEFAULTS.sortBy) search.set('sortBy', params.sortBy)
  if (params.sortOrder !== DEFAULTS.sortOrder) search.set('sortOrder', params.sortOrder)
  if (params.page !== DEFAULTS.page) search.set('page', String(params.page))
  if (params.limit !== DEFAULTS.limit) search.set('limit', String(params.limit))

  return search
}

export function toContactListQuery(params: ContactListParams): ContactListQuery {
  return {
    ...(params.search ? { search: params.search } : {}),
    ...(params.tags.length > 0 ? { tags: params.tags, tagMatch: params.tagMatch } : {}),
    ...(params.company ? { company: params.company } : {}),
    ...(params.createdFrom ? { createdFrom: params.createdFrom } : {}),
    ...(params.createdTo ? { createdTo: params.createdTo } : {}),
    sortBy: params.sortBy,
    sortOrder: params.sortOrder,
    page: params.page,
    limit: params.limit,
  }
}

export function hasActiveFilters(params: ContactListParams): boolean {
  return Boolean(
    params.search || params.tags.length > 0 || params.company || params.createdFrom || params.createdTo,
  )
}
