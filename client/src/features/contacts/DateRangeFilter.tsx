import { useState } from 'react'

interface Props {
  from: string
  to: string
  onChange: (range: { createdFrom: string; createdTo: string }) => void
}

const inputClass =
  'rounded-md border border-slate-300 bg-white px-2 py-2 text-sm text-slate-900 ' +
  'focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none'

export function DateRangeFilter({ from, to, onChange }: Props) {
  const [draft, setDraft] = useState({ from, to })
  const [applied, setApplied] = useState({ from, to })

  if (applied.from !== from || applied.to !== to) {
    setApplied({ from, to })
    setDraft({ from, to })
  }

  const reversed = Boolean(draft.from && draft.to && new Date(draft.from) > new Date(draft.to))

  const commit = (next: { from: string; to: string }) => {
    setDraft(next)
    if (next.from && next.to && new Date(next.from) > new Date(next.to)) return
    onChange({ createdFrom: next.from, createdTo: next.to })
  }

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-slate-600">Created between</span>
      <div className="flex items-center gap-2">
        <label className="sr-only" htmlFor="created-from">
          Created from
        </label>
        <input
          id="created-from"
          type="date"
          value={draft.from}
          aria-invalid={reversed}
          onChange={(event) => commit({ ...draft, from: event.target.value })}
          className={inputClass}
        />
        <span className="text-sm text-slate-400">to</span>
        <label className="sr-only" htmlFor="created-to">
          Created to
        </label>
        <input
          id="created-to"
          type="date"
          value={draft.to}
          aria-invalid={reversed}
          onChange={(event) => commit({ ...draft, to: event.target.value })}
          className={inputClass}
        />
      </div>
      {reversed ? (
        <p role="alert" className="mt-1 text-xs text-red-700">
          The start date must come before the end date.
        </p>
      ) : null}
    </div>
  )
}
