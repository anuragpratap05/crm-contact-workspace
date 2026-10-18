import { QueryClient } from '@tanstack/react-query'
import { ApiError } from './api/errors'

const MAX_RETRIES = 2

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (failureCount >= MAX_RETRIES) return false
        if (!(error instanceof ApiError)) return false
        return error.status === 0 || error.status >= 500
      },
    },
    mutations: {
      retry: false,
    },
  },
})
