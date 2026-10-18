import { ApiError } from '@/lib/api/errors'
import type { InternalErrorCause } from '@/lib/api/errors'

interface Copy {
  title: string
  detail: string
}

const INTERNAL_COPY: Record<InternalErrorCause, Copy> = {
  network: {
    title: 'Cannot reach the API',
    detail: 'Check that the backend is running and that VITE_API_BASE_URL points at it.',
  },
  timeout: {
    title: 'The API did not respond in time',
    detail:
      'Free hosting tiers sleep after inactivity and can take up to a minute to wake up. Retrying usually works.',
  },
  server: {
    title: 'The API returned an error',
    detail: 'Something failed on the server. Retrying may help.',
  },
  malformed: {
    title: 'Unexpected response',
    detail: 'The API replied with something this app could not read.',
  },
}

function copyFor(error: unknown): Copy {
  if (!(error instanceof ApiError)) {
    return { title: 'Something went wrong', detail: 'An unexpected error occurred.' }
  }

  const { info } = error

  switch (info.code) {
    case 'INTERNAL_ERROR':
      return INTERNAL_COPY[info.cause]
    case 'NOT_FOUND':
      return { title: 'Not found', detail: error.message }
    case 'VALIDATION_ERROR':
      return {
        title: 'The request was rejected',
        detail:
          info.issues.length > 0
            ? info.issues.map((issue) => `${issue.field}: ${issue.message}`).join(', ')
            : error.message,
      }
    case 'DUPLICATE_EMAIL':
      return { title: 'Duplicate email', detail: error.message }
    case 'VERSION_CONFLICT':
      return { title: 'Changed by someone else', detail: error.message }
  }
}

interface Props {
  error: unknown
  onRetry?: () => void
  isRetrying?: boolean
}

export function ApiErrorNotice({ error, onRetry, isRetrying = false }: Props) {
  const { title, detail } = copyFor(error)

  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900"
    >
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-red-800">{detail}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          disabled={isRetrying}
          className="mt-3 rounded-md border border-red-300 bg-white px-3 py-1.5 font-medium text-red-900 hover:bg-red-100 disabled:opacity-60"
        >
          {isRetrying ? 'Retrying…' : 'Try again'}
        </button>
      ) : null}
    </div>
  )
}
