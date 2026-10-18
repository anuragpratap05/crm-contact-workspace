import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { DEFAULTS, parseContactListParams, toSearchParams } from '@/lib/queryParams'
import type { ContactListParams } from '@/lib/queryParams'

interface UpdateOptions {
  replace?: boolean
}

export function useContactListParams() {
  const [searchParams, setSearchParams] = useSearchParams()

  const params = useMemo(() => parseContactListParams(searchParams), [searchParams])

  const update = useCallback(
    (patch: Partial<ContactListParams>, options: UpdateOptions = {}) => {
      const next: ContactListParams = { ...params, ...patch }

      if (!('page' in patch)) {
        next.page = DEFAULTS.page
      }

      setSearchParams(toSearchParams(next), { replace: options.replace ?? false })
    },
    [params, setSearchParams],
  )

  const reset = useCallback(() => {
    setSearchParams(new URLSearchParams())
  }, [setSearchParams])

  return { params, update, reset }
}
