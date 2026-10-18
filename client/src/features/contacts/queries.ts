import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import {
  addTag,
  bulkTag,
  fetchCompanies,
  fetchContact,
  fetchContacts,
  fetchTags,
  removeTag,
  updateContact,
} from './api'
import { toContactListQuery } from '@/lib/queryParams'
import type { ContactListParams } from '@/lib/queryParams'
import type { BulkTagAction, Contact, ContactListQuery, UpdateContactRequest } from '@/types/api'

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
    queryKey: TAGS_QUERY_KEY,
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

export function useContactQuery(id: string) {
  return useQuery({
    queryKey: contactKeys.detail(id),
    queryFn: ({ signal }) => fetchContact(id, signal),
  })
}

export function useUpdateContactMutation(id: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (body: UpdateContactRequest) => updateContact(id, body),
    onSuccess: (contact) => {
      queryClient.setQueryData(contactKeys.detail(id), contact)
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
    },
  })
}

export const TAGS_QUERY_KEY = ['tags'] as const

interface TagContext {
  previous: Contact | undefined
}

function useTagMutation(
  id: string,
  mutationFn: (tag: string) => Promise<Contact>,
  applyLocally: (contact: Contact, tag: string) => Contact,
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onMutate: async (tag: string): Promise<TagContext> => {
      await queryClient.cancelQueries({ queryKey: contactKeys.detail(id) })

      const previous = queryClient.getQueryData<Contact>(contactKeys.detail(id))
      if (previous) {
        queryClient.setQueryData<Contact>(contactKeys.detail(id), applyLocally(previous, tag))
      }

      return { previous }
    },
    onError: (_error, _tag, context) => {
      if (context?.previous) {
        queryClient.setQueryData(contactKeys.detail(id), context.previous)
      }
    },
    onSuccess: (contact) => {
      queryClient.setQueryData(contactKeys.detail(id), contact)
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.lists() })
      void queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })
}

export function useAddTagMutation(id: string) {
  return useTagMutation(
    id,
    (tag) => addTag(id, tag),
    (contact, tag) =>
      contact.tags.includes(tag) ? contact : { ...contact, tags: [...contact.tags, tag] },
  )
}

export function useRemoveTagMutation(id: string) {
  return useTagMutation(
    id,
    (tag) => removeTag(id, tag),
    (contact, tag) => ({ ...contact, tags: contact.tags.filter((item) => item !== tag) }),
  )
}

export function useBulkTagMutation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      contactIds,
      tag,
      action,
    }: {
      contactIds: string[]
      tag: string
      action: BulkTagAction
    }) => bulkTag(contactIds, tag, action),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: contactKeys.all })
      void queryClient.invalidateQueries({ queryKey: TAGS_QUERY_KEY })
    },
  })
}
