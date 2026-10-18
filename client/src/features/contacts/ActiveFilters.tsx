import { formatDate } from '@/lib/format'
import { hasActiveFilters } from '@/lib/queryParams'
import type { ContactListParams } from '@/lib/queryParams'
import type { UpdateContactListParams } from './useContactListParams'

interface Props {
  params: ContactListParams
  update: UpdateContactListParams
  onClearAll: () => void
}

interface Chip {
  key: string
  label: string
  clear: () => void
}

export function ActiveFilters({ params, update, onClearAll }: Props) {
  if (!hasActiveFilters(params)) return null

  const chips: Chip[] = []

  if (params.search) {
    chips.push({
      key: 'search',
      label: `Search: ${params.search}`,
      clear: () => update({ search: '' }),
    })
  }

  for (const tag of params.tags) {
    chips.push({
      key: `tag:${tag}`,
      label: `Tag: ${tag}`,
      clear: () => update({ tags: params.tags.filter((candidate) => candidate !== tag) }),
    })
  }

  if (params.company) {
    chips.push({
      key: 'company',
      label: `Company: ${params.company}`,
      clear: () => update({ company: '' }),
    })
  }

  if (params.createdFrom) {
    chips.push({
      key: 'createdFrom',
      label: `Created after ${formatDate(params.createdFrom)}`,
      clear: () => update({ createdFrom: '' }),
    })
  }

  if (params.createdTo) {
    chips.push({
      key: 'createdTo',
      label: `Created before ${formatDate(params.createdTo)}`,
      clear: () => update({ createdTo: '' }),
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {params.tags.length > 1 ? (
        <span className="text-xs text-slate-500">
          Matching {params.tagMatch === 'all' ? 'all' : 'any'} of:
        </span>
      ) : null}

      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white py-1 pr-1 pl-2.5 text-xs text-slate-700"
        >
          {chip.label}
          <button
            type="button"
            onClick={chip.clear}
            aria-label={`Remove filter ${chip.label}`}
            className="rounded-full px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            ✕
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-slate-600 underline hover:text-slate-900"
      >
        Clear all
      </button>
    </div>
  )
}
