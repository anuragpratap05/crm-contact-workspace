import { describe, expect, it } from 'vitest'
import {
  DEFAULTS,
  hasActiveFilters,
  parseContactListParams,
  toContactListQuery,
  toSearchParams,
} from './queryParams'

const parse = (query: string) => parseContactListParams(new URLSearchParams(query))

describe('parsing the list query from the URL', () => {
  it('falls back to defaults when nothing is set', () => {
    expect(parse('')).toEqual({
      search: '',
      tags: [],
      tagMatch: DEFAULTS.tagMatch,
      company: '',
      createdFrom: '',
      createdTo: '',
      sortBy: DEFAULTS.sortBy,
      sortOrder: DEFAULTS.sortOrder,
      page: DEFAULTS.page,
      limit: DEFAULTS.limit,
    })
  })

  it('replaces values the server would reject rather than forwarding them', () => {
    const params = parse('sortBy=bogus&sortOrder=sideways&page=-3&limit=7&tagMatch=maybe')

    expect(params.sortBy).toBe(DEFAULTS.sortBy)
    expect(params.sortOrder).toBe(DEFAULTS.sortOrder)
    expect(params.page).toBe(DEFAULTS.page)
    expect(params.limit).toBe(DEFAULTS.limit)
    expect(params.tagMatch).toBe(DEFAULTS.tagMatch)
  })

  it('trims, drops blanks and deduplicates tags', () => {
    expect(parse('tags=,,VIP,, VIP ,Lead,').tags).toEqual(['VIP', 'Lead'])
  })

  it('accepts a page size the UI offers', () => {
    expect(parse('limit=100').limit).toBe(100)
  })

  it('drops a reversed date range entirely', () => {
    const params = parse('createdFrom=2026-12-31&createdTo=2026-01-01')

    expect(params.createdFrom).toBe('')
    expect(params.createdTo).toBe('')
  })

  it('keeps a valid date range', () => {
    const params = parse('createdFrom=2026-01-01&createdTo=2026-12-31')

    expect(params.createdFrom).toBe('2026-01-01')
    expect(params.createdTo).toBe('2026-12-31')
  })

  it('ignores an unparseable date', () => {
    expect(parse('createdFrom=not-a-date').createdFrom).toBe('')
  })
})

describe('serialising the list query back to the URL', () => {
  it('omits every default so the common case has no query string', () => {
    expect(toSearchParams(parse('')).toString()).toBe('')
  })

  it('keeps only what differs from the defaults', () => {
    const params = parse('search=lau&page=3&sortBy=name&sortOrder=asc')

    expect(toSearchParams(params).toString()).toBe(
      'search=lau&sortBy=name&sortOrder=asc&page=3',
    )
  })

  it('leaves tagMatch out when a single tag makes it meaningless', () => {
    expect(toSearchParams(parse('tags=VIP&tagMatch=all')).has('tagMatch')).toBe(false)
    expect(toSearchParams(parse('tags=VIP,Lead&tagMatch=all')).get('tagMatch')).toBe('all')
  })

  it('round-trips a fully populated query', () => {
    const query = 'search=lau&tags=VIP%2CLead&tagMatch=all&company=Acme&createdFrom=2026-01-01&createdTo=2026-06-30&sortBy=name&sortOrder=asc&page=2&limit=50'

    expect(parse(toSearchParams(parse(query)).toString())).toEqual(parse(query))
  })
})

describe('building the request from the parsed query', () => {
  it('always states sort, page and limit explicitly', () => {
    expect(toContactListQuery(parse(''))).toEqual({
      sortBy: DEFAULTS.sortBy,
      sortOrder: DEFAULTS.sortOrder,
      page: DEFAULTS.page,
      limit: DEFAULTS.limit,
    })
  })

  it('sends tagMatch only alongside tags', () => {
    expect(toContactListQuery(parse('tagMatch=all'))).not.toHaveProperty('tagMatch')
    expect(toContactListQuery(parse('tags=VIP&tagMatch=all')).tagMatch).toBe('all')
  })
})

describe('hasActiveFilters', () => {
  it('ignores sorting and pagination', () => {
    expect(hasActiveFilters(parse('sortBy=name&page=4&limit=50'))).toBe(false)
  })

  it.each(['search=lau', 'tags=VIP', 'company=Acme', 'createdFrom=2026-01-01'])(
    'treats %s as a filter',
    (query) => {
      expect(hasActiveFilters(parse(query))).toBe(true)
    },
  )
})
