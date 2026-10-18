import { useEffect, useRef, useState } from 'react'

const DEBOUNCE_MS = 300

interface Props {
  value: string
  onChange: (value: string) => void
}

export function SearchInput({ value, onChange }: Props) {
  const [draft, setDraft] = useState(value)
  const committed = useRef(value)

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value
      setDraft(value)
    }
  }, [value])

  useEffect(() => {
    if (draft === committed.current) return

    const timer = window.setTimeout(() => {
      committed.current = draft
      onChange(draft)
    }, DEBOUNCE_MS)

    return () => window.clearTimeout(timer)
  }, [draft, onChange])

  return (
    <div className="relative">
      <label htmlFor="contact-search" className="sr-only">
        Search contacts
      </label>
      <input
        id="contact-search"
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search name, email or phone…"
        className="w-full rounded-md border border-slate-300 bg-white py-2 pr-8 pl-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none"
      />
      {draft ? (
        <button
          type="button"
          onClick={() => setDraft('')}
          aria-label="Clear search"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
        >
          ✕
        </button>
      ) : null}
      <p className="mt-1 text-xs text-slate-500">Matches the start of a name, email or phone number.</p>
    </div>
  )
}
