import { useState } from 'react'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { ActiveFilters } from '@/features/contacts/ActiveFilters'
import { ContactsTable } from '@/features/contacts/ContactsTable'
import { ContactsTableSkeleton } from '@/features/contacts/ContactsTableSkeleton'
import { BulkTagBar } from '@/features/contacts/BulkTagBar'
import { BulkTagDialog } from '@/features/contacts/BulkTagDialog'
import { FilterBar } from '@/features/contacts/FilterBar'
import { PaginationBar } from '@/features/contacts/PaginationBar'
import { useContactListParams } from '@/features/contacts/useContactListParams'
import { useContactSelection } from '@/features/contacts/useContactSelection'
import { usePrefetchPage, useContactsQuery } from '@/features/contacts/queries'
import { hasActiveFilters } from '@/lib/queryParams'
import type { BulkTagAction, SortBy } from '@/types/api'

const linkButtonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50'

export default function ContactsPage() {
  const { params, update, clearFilters } = useContactListParams()
  const query = useContactsQuery(params)
  const prefetchPage = usePrefetchPage(params)
  const selection = useContactSelection(params)
  const [bulkAction, setBulkAction] = useState<BulkTagAction | null>(null)

  const filtered = hasActiveFilters(params)

  const handleSort = (field: SortBy) => {
    if (params.sortBy === field) {
      update({ sortOrder: params.sortOrder === 'asc' ? 'desc' : 'asc' })
      return
    }
    update({ sortBy: field, sortOrder: field === 'name' ? 'asc' : 'desc' })
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Contacts</h1>

      <FilterBar params={params} update={update} />

      <ActiveFilters params={params} update={update} onClearAll={clearFilters} />

      {selection.selected.size > 0 ? (
        <BulkTagBar
          count={selection.selected.size}
          atLimit={selection.atLimit}
          onBulkTag={setBulkAction}
          onClear={selection.clear}
        />
      ) : null}

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
                  <button type="button" onClick={clearFilters} className={linkButtonClass}>
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
            <ContactsTable
              contacts={query.data.items}
              isStale={query.isPlaceholderData}
              sortBy={params.sortBy}
              sortOrder={params.sortOrder}
              onSort={handleSort}
              selected={selection.selected}
              onToggle={selection.toggle}
              onTogglePage={selection.setMany}
            />
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

      {bulkAction ? (
        <BulkTagDialog
          action={bulkAction}
          contactIds={[...selection.selected]}
          onClose={() => setBulkAction(null)}
          onDone={() => {
            setBulkAction(null)
            selection.clear()
          }}
        />
      ) : null}
    </div>
  )
}
