import { PAGE_SIZES } from '@/lib/queryParams'
import { formatCount } from '@/lib/format'
import type { Pagination } from '@/types/api'

interface Props {
  pagination: Pagination
  onPageChange: (page: number) => void
  onLimitChange: (limit: number) => void
  onPrefetchPage: (page: number) => void
  disabled: boolean
}

const buttonClass =
  'rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 ' +
  'hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50'

export function PaginationBar({
  pagination,
  onPageChange,
  onLimitChange,
  onPrefetchPage,
  disabled,
}: Props) {
  const { page, limit, total, totalPages, hasNextPage, hasPreviousPage } = pagination

  const firstOnPage = (page - 1) * limit + 1
  const lastOnPage = Math.min(page * limit, total)
  const pageHasRows = firstOnPage <= total

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-600">
        {pageHasRows
          ? `Showing ${firstOnPage.toLocaleString()}–${lastOnPage.toLocaleString()} of ${formatCount(total, 'contact')}`
          : formatCount(total, 'contact')}
      </p>

      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <span className="hidden sm:inline">Per page</span>
          <select
            value={limit}
            disabled={disabled}
            onChange={(event) => onLimitChange(Number(event.target.value))}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700 disabled:opacity-50"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-2">
          <button
            type="button"
            className={buttonClass}
            disabled={!hasPreviousPage || disabled}
            onMouseEnter={() => onPrefetchPage(page - 1)}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="text-sm whitespace-nowrap text-slate-600 tabular-nums">
            Page {page.toLocaleString()} of {Math.max(totalPages, 1).toLocaleString()}
          </span>
          <button
            type="button"
            className={buttonClass}
            disabled={!hasNextPage || disabled}
            onMouseEnter={() => onPrefetchPage(page + 1)}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
