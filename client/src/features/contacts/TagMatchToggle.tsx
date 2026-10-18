import type { TagMatch } from '@/types/api'

const MODES: { value: TagMatch; label: string }[] = [
  { value: 'any', label: 'Any tag' },
  { value: 'all', label: 'All tags' },
]

interface Props {
  value: TagMatch
  onChange: (value: TagMatch) => void
}

export function TagMatchToggle({ value, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="How selected tags are matched"
      className="inline-flex rounded-md border border-slate-300 bg-white p-0.5"
    >
      {MODES.map((mode) => (
        <button
          key={mode.value}
          type="button"
          aria-pressed={value === mode.value}
          onClick={() => onChange(mode.value)}
          className={`rounded px-2.5 py-1 text-xs font-medium ${
            value === mode.value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          {mode.label}
        </button>
      ))}
    </div>
  )
}
