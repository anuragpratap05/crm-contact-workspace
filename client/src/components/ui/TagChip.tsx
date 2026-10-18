interface Props {
  label: string
  onRemove?: () => void
  disabled?: boolean
}

export function TagChip({ label, onRemove, disabled = false }: Props) {
  if (!onRemove) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
        {label}
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pr-1 pl-2.5 text-xs font-medium text-slate-700">
      {label}
      <button
        type="button"
        onClick={onRemove}
        disabled={disabled}
        aria-label={`Remove tag ${label}`}
        className="rounded-full px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 disabled:opacity-50"
      >
        ✕
      </button>
    </span>
  )
}
