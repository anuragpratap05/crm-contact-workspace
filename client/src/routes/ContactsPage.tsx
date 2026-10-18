import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { ContactsTable } from '@/features/contacts/ContactsTable'
import { ContactsTableSkeleton } from '@/features/contacts/ContactsTableSkeleton'
import { PaginationBar } from '@/features/contacts/PaginationBar'
import { useContactListParams } from '@/features/contacts/useContactListParams'
import { usePrefetchPage, useContactsQuery } from '@/features/contacts/queries'
import { hasActiveFilters } from '@/lib/queryParams'

const linkButtonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'

export default function ContactsPage() {
  const { params, update, reset } = useContactListParams()
  const query = useContactsQuery(params)
  const prefetchPage = usePrefetchPage(params)

  const filtered = hasActiveFilters(params)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>
        <p className="mt-1 text-sm text-slate-600">
          Search, filtering and sorting arrive in the next phase.
        </p>
      </div>

      {query.isPending ? <ContactsTableSkeleton /> : null}

      {query.isError ? (
        <ApiErrorNotice
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}

      {query.data ? (
        <>
          {query.data.items.length === 0 && query.data.pagination.total === 0 ? (
            <EmptyState
              title={filtered ? 'No contacts match these filters' : 'No contacts yet'}
              description={
                filtered
                  ? 'Nothing here fits the current filters. Try widening or clearing them.'
                  : 'Once contacts exist in the database they will appear here.'
              }
              action={
                filtered ? (
                  <button type="button" onClick={reset} className={linkButtonClass}>
                    Clear filters
                  </button>
                ) : null
              }
            />
          ) : null}

          {query.data.items.length === 0 && query.data.pagination.total > 0 ? (
            <EmptyState
              title="This page is empty"
              description={`There are only ${query.data.pagination.totalPages} pages of results at this page size.`}
              action={
                <button
                  type="button"
                  onClick={() => update({ page: 1 })}
                  className={linkButtonClass}
                >
                  Back to the first page
                </button>
              }
            />
          ) : null}

          {query.data.items.length > 0 ? (
            <ContactsTable contacts={query.data.items} isStale={query.isPlaceholderData} />
          ) : null}

          {query.data.pagination.total > 0 ? (
            <PaginationBar
              pagination={query.data.pagination}
              onPageChange={(page) => update({ page })}
              onLimitChange={(limit) => update({ limit })}
              onPrefetchPage={prefetchPage}
              disabled={query.isPlaceholderData}
            />
          ) : null}
        </>
      ) : null}
    </div>
  )
}
