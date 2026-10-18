import { Combobox, ComboboxInput, ComboboxOption, ComboboxOptions } from '@headlessui/react'

export const MAX_TAG_LENGTH = 40

interface Props {
  value: string
  options: string[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  id?: string
}

export function TagCombobox({
  value,
  options,
  onChange,
  placeholder = 'Type or pick a tag',
  disabled = false,
  id,
}: Props) {
  const needle = value.trim().toLowerCase()
  const matches = needle === '' ? options : options.filter((o) => o.toLowerCase().includes(needle))
  const isNew = needle !== '' && !options.some((o) => o.toLowerCase() === needle)

  return (
    <Combobox value={value} onChange={(next: string | null) => onChange(next ?? '')} immediate>
      <ComboboxInput
        id={id}
        value={value}
        disabled={disabled}
        maxLength={MAX_TAG_LENGTH}
        placeholder={placeholder}
        displayValue={(tag: string) => tag}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none disabled:opacity-50"
      />
      <ComboboxOptions
        anchor="bottom start"
        className="z-30 max-h-60 w-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg empty:hidden focus:outline-none"
      >
        {isNew ? (
          <ComboboxOption
            value={value.trim()}
            className="cursor-pointer px-3 py-2 text-sm text-slate-700 data-focus:bg-slate-100"
          >
            Create “{value.trim()}”
          </ComboboxOption>
        ) : null}
        {matches.map((option) => (
          <ComboboxOption
            key={option}
            value={option}
            className="cursor-pointer px-3 py-2 text-sm text-slate-700 data-focus:bg-slate-100"
          >
            {option}
          </ComboboxOption>
        ))}
      </ComboboxOptions>
    </Combobox>
  )
}
