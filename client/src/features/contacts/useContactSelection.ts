import { useCallback, useState } from 'react'
import type { ContactListParams } from '@/lib/queryParams'

export const MAX_BULK_SELECTION = 500

function filterSignature(params: ContactListParams): string {
  return JSON.stringify([
    params.search,
    [...params.tags].sort(),
    params.tagMatch,
    params.company,
    params.createdFrom,
    params.createdTo,
  ])
}

export function useContactSelection(params: ContactListParams) {
  const signature = filterSignature(params)
  const [applied, setApplied] = useState(signature)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  if (applied !== signature) {
    setApplied(signature)
    setSelected(new Set())
  }

  const toggle = useCallback((id: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else if (next.size < MAX_BULK_SELECTION) {
        next.add(id)
      }
      return next
    })
  }, [])

  const setMany = useCallback((ids: string[], checked: boolean) => {
    setSelected((previous) => {
      const next = new Set(previous)
      for (const id of ids) {
        if (!checked) {
          next.delete(id)
        } else if (next.size < MAX_BULK_SELECTION) {
          next.add(id)
        }
      }
      return next
    })
  }, [])

  const clear = useCallback(() => setSelected(new Set()), [])

  return {
    selected,
    toggle,
    setMany,
    clear,
    atLimit: selected.size >= MAX_BULK_SELECTION,
  }
}
