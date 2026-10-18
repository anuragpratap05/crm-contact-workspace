import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { fetchCompanies, fetchContacts, fetchTags } from './api'
import { toContactListQuery } from '@/lib/queryParams'
import type { ContactListParams } from '@/lib/queryParams'
import type { ContactListQuery } from '@/types/api'

export const contactKeys = {
  all: ['contacts'] as const,
  lists: () => [...contactKeys.all, 'list'] as const,
  list: (query: ContactListQuery) => [...contactKeys.lists(), query] as const,
  details: () => [...contactKeys.all, 'detail'] as const,
  detail: (id: string) => [...contactKeys.details(), id] as const,
}

export function useContactsQuery(params: ContactListParams) {
  const query = toContactListQuery(params)

  return useQuery({
    queryKey: contactKeys.list(query),
    queryFn: ({ signal }) => fetchContacts(query, signal),
    placeholderData: keepPreviousData,
  })
}

export function usePrefetchPage(params: ContactListParams) {
  const queryClient = useQueryClient()

  return useCallback(
    (page: number) => {
      const query = toContactListQuery({ ...params, page })

      void queryClient.prefetchQuery({
        queryKey: contactKeys.list(query),
        queryFn: ({ signal }) => fetchContacts(query, signal),
      })
    },
    [params, queryClient],
  )
}

const FILTER_OPTIONS_STALE_TIME = 5 * 60_000

export function useTagsQuery() {
  return useQuery({
    queryKey: ['tags'],
    queryFn: ({ signal }) => fetchTags(signal),
    staleTime: FILTER_OPTIONS_STALE_TIME,
  })
}

export function useCompaniesQuery() {
  return useQuery({
    queryKey: ['companies'],
    queryFn: ({ signal }) => fetchCompanies(signal),
    staleTime: FILTER_OPTIONS_STALE_TIME,
  })
}
