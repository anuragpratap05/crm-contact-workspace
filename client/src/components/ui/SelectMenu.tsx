import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react'
import type { ReactNode } from 'react'

const buttonClass =
  'flex w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 ' +
  'text-left text-sm text-slate-900 hover:bg-slate-50 focus:border-slate-400 focus:ring-2 focus:ring-slate-200 focus:outline-none'

const optionsClass =
  'z-20 max-h-72 w-64 overflow-auto rounded-md border border-slate-200 bg-white py-1 shadow-lg focus:outline-none'

const optionClass =
  'flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm text-slate-700 data-focus:bg-slate-100'

interface SingleProps {
  label: string
  value: string
  options: string[]
  placeholder: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function SingleSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: SingleProps) {
  return (
    <Listbox value={value} onChange={onChange} disabled={disabled}>
      <FieldLabel>{label}</FieldLabel>
      <ListboxButton className={buttonClass}>
        <span className={value ? '' : 'text-slate-400'}>{value || placeholder}</span>
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" className={optionsClass}>
        <ListboxOption value="" className={optionClass}>
          <span className="text-slate-500">{placeholder}</span>
        </ListboxOption>
        {options.map((option) => (
          <ListboxOption key={option} value={option} className={optionClass}>
            {({ selected }) => (
              <>
                <span className={selected ? 'font-medium text-slate-900' : ''}>{option}</span>
                {selected ? <Check /> : null}
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

interface MultiProps {
  label: string
  value: string[]
  options: string[]
  placeholder: string
  onChange: (value: string[]) => void
  disabled?: boolean
}

export function MultiSelect({
  label,
  value,
  options,
  placeholder,
  onChange,
  disabled = false,
}: MultiProps) {
  const summary =
    value.length === 0 ? placeholder : value.length === 1 ? value[0] : `${value.length} selected`

  return (
    <Listbox value={value} onChange={onChange} multiple disabled={disabled}>
      <FieldLabel>{label}</FieldLabel>
      <ListboxButton className={buttonClass}>
        <span className={value.length === 0 ? 'text-slate-400' : ''}>{summary}</span>
        <Chevron />
      </ListboxButton>
      <ListboxOptions anchor="bottom start" className={optionsClass}>
        {options.map((option) => (
          <ListboxOption key={option} value={option} className={optionClass}>
            {({ selected }) => (
              <>
                <span className={selected ? 'font-medium text-slate-900' : ''}>{option}</span>
                {selected ? <Check /> : null}
              </>
            )}
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs font-medium text-slate-600">{children}</span>
}

function Chevron() {
  return (
    <span aria-hidden className="text-slate-400">
      ▾
    </span>
  )
}

function Check() {
  return (
    <span aria-hidden className="text-slate-900">
      ✓
    </span>
  )
}
