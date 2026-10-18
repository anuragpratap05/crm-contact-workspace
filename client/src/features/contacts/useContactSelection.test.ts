import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { parseContactListParams } from '@/lib/queryParams'
import { MAX_BULK_SELECTION, useContactSelection } from './useContactSelection'

const params = (query = '') => parseContactListParams(new URLSearchParams(query))

describe('the bulk selection model', () => {
  it('toggles ids on and off', () => {
    const { result } = renderHook(() => useContactSelection(params()))

    act(() => result.current.toggle('a'))
    act(() => result.current.toggle('b'))
    expect([...result.current.selected]).toEqual(['a', 'b'])

    act(() => result.current.toggle('a'))
    expect([...result.current.selected]).toEqual(['b'])
  })

  it('selects and clears a whole page', () => {
    const { result } = renderHook(() => useContactSelection(params()))

    act(() => result.current.setMany(['a', 'b', 'c'], true))
    expect(result.current.selected.size).toBe(3)

    act(() => result.current.setMany(['a', 'b'], false))
    expect([...result.current.selected]).toEqual(['c'])
  })

  it('survives paging, sorting and page size changes', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useContactSelection(params(query)),
      { initialProps: { query: '' } },
    )

    act(() => result.current.setMany(['a', 'b'], true))

    rerender({ query: 'page=2' })
    expect(result.current.selected.size).toBe(2)

    rerender({ query: 'page=2&sortBy=name&sortOrder=asc' })
    expect(result.current.selected.size).toBe(2)

    rerender({ query: 'page=2&sortBy=name&sortOrder=asc&limit=50' })
    expect(result.current.selected.size).toBe(2)
  })

  it('clears when the filters change, because the result set changed', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useContactSelection(params(query)),
      { initialProps: { query: '' } },
    )

    act(() => result.current.setMany(['a', 'b'], true))
    expect(result.current.selected.size).toBe(2)

    rerender({ query: 'search=lau' })
    expect(result.current.selected.size).toBe(0)
  })

  it('ignores tag order when deciding whether the filters changed', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) => useContactSelection(params(query)),
      { initialProps: { query: 'tags=VIP,Lead' } },
    )

    act(() => result.current.setMany(['a'], true))

    rerender({ query: 'tags=Lead,VIP' })
    expect(result.current.selected.size).toBe(1)
  })

  it('stops at the limit the server accepts', () => {
    const { result } = renderHook(() => useContactSelection(params()))

    const ids = Array.from({ length: MAX_BULK_SELECTION + 50 }, (_, index) => `id-${index}`)
    act(() => result.current.setMany(ids, true))

    expect(result.current.selected.size).toBe(MAX_BULK_SELECTION)
    expect(result.current.atLimit).toBe(true)

    act(() => result.current.toggle('one-more'))
    expect(result.current.selected.has('one-more')).toBe(false)
  })

  it('clears everything on demand', () => {
    const { result } = renderHook(() => useContactSelection(params()))

    act(() => result.current.setMany(['a', 'b'], true))
    act(() => result.current.clear())

    expect(result.current.selected.size).toBe(0)
  })
})
