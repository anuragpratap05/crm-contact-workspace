import { useQueries } from '@tanstack/react-query'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { fetchCompanies, fetchContacts, fetchTags } from '@/features/contacts/api'
import { apiBaseUrl } from '@/lib/api/client'

interface StatProps {
  label: string
  value: string
}

function Stat({ label, value }: StatProps) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{label}</p>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}

export default function ContactsPage() {
  const [contacts, tags, companies] = useQueries({
    queries: [
      {
        queryKey: ['contacts', { limit: 1 }],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchContacts({ limit: 1 }, signal),
      },
      { queryKey: ['tags'], queryFn: ({ signal }: { signal: AbortSignal }) => fetchTags(signal) },
      {
        queryKey: ['companies'],
        queryFn: ({ signal }: { signal: AbortSignal }) => fetchCompanies(signal),
      },
    ],
  })

  const isPending = contacts.isPending || tags.isPending || companies.isPending
  const error = contacts.error ?? tags.error ?? companies.error
  const isRetrying = contacts.isFetching || tags.isFetching || companies.isFetching

  const retry = () => {
    void contacts.refetch()
    void tags.refetch()
    void companies.refetch()
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-slate-600">
          The table, search, filters and sorting arrive in the next phase. This page confirms the
          app is talking to{' '}
          <code className="rounded bg-slate-200 px-1.5 py-0.5 font-mono text-xs">
            {apiBaseUrl}
          </code>
          .
        </p>
      </div>

      {error ? <ApiErrorNotice error={error} onRetry={retry} isRetrying={isRetrying} /> : null}

      {isPending && !error ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {['Contacts', 'Tags', 'Companies'].map((label) => (
            <div
              key={label}
              className="h-[82px] animate-pulse rounded-lg border border-slate-200 bg-white"
            />
          ))}
        </div>
      ) : null}

      {!isPending && !error ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat label="Contacts" value={String(contacts.data?.pagination.total ?? 0)} />
          <Stat label="Tags in use" value={String(tags.data?.length ?? 0)} />
          <Stat label="Companies" value={String(companies.data?.length ?? 0)} />
        </div>
      ) : null}
    </div>
  )
}
