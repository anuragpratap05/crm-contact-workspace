import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import {
  EDITABLE_FIELDS,
  FIELD_LABELS,
  contactToFormValues,
  differingFields,
} from './contactFormSchema'
import type { ContactFormValues, EditableField } from './contactFormSchema'
import type { Contact } from '@/types/api'

type Side = 'mine' | 'theirs'

interface Props {
  current: Contact | null
  mine: ContactFormValues
  isSaving: boolean
  onCancel: () => void
  onResolve: (values: ContactFormValues) => void
}

const ALL_MINE: Record<EditableField, Side> = {
  firstName: 'mine',
  lastName: 'mine',
  email: 'mine',
  phone: 'mine',
  company: 'mine',
}

function display(value: string) {
  return value.trim() === '' ? '(empty)' : value
}

export function ConflictDialog({ current, mine, isSaving, onCancel, onResolve }: Props) {
  const [choices, setChoices] = useState<Record<EditableField, Side>>(ALL_MINE)

  if (!current) {
    return (
      <Modal
        open
        onClose={onCancel}
        title="This contact changed"
        description="Someone else saved this contact while you were editing, and the server did not return their version."
        footer={
          <>
            <Button onClick={onCancel}>Keep editing</Button>
            <Button variant="primary" onClick={() => window.location.reload()}>
              Reload the contact
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Reloading will show the current values. Your unsaved edits will be lost, so copy anything
          you need first.
        </p>
      </Modal>
    )
  }

  const theirs = contactToFormValues(current)
  const fields = differingFields(mine, theirs)

  const merged = (): ContactFormValues => {
    const pick = (field: EditableField) =>
      choices[field] === 'theirs' ? theirs[field] : mine[field]

    return {
      firstName: pick('firstName'),
      lastName: pick('lastName'),
      email: pick('email'),
      phone: pick('phone'),
      company: pick('company'),
      version: current.version,
    }
  }

  const takeTheirs = () => onResolve({ ...theirs, version: current.version })

  if (fields.length === 0) {
    return (
      <Modal
        open
        onClose={onCancel}
        title="Someone else saved first"
        description="Their changes do not overlap with yours."
        footer={
          <>
            <Button onClick={onCancel} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={takeTheirs} disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save anyway'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          This contact was saved by someone else after you opened it, but every field you edited
          still matches theirs. Saving again will apply your version on top of theirs.
        </p>
      </Modal>
    )
  }

  return (
    <Modal
      open
      wide
      onClose={onCancel}
      title="Someone else saved this contact first"
      description="Choose which value to keep for each field that differs. Nothing is saved until you confirm."
      footer={
        <>
          <Button onClick={onCancel} disabled={isSaving}>
            Keep editing
          </Button>
          <Button onClick={takeTheirs} disabled={isSaving}>
            Discard my changes
          </Button>
          <Button variant="primary" onClick={() => onResolve(merged())} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save selected values'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {fields.map((field) => (
          <fieldset key={field}>
            <legend className="mb-2 text-sm font-medium text-slate-900">
              {FIELD_LABELS[field]}
            </legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {(['mine', 'theirs'] as const).map((side) => {
                const value = side === 'mine' ? mine[field] : theirs[field]
                const active = choices[field] === side

                return (
                  <label
                    key={side}
                    className={`cursor-pointer rounded-md border p-3 text-sm ${
                      active
                        ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      name={`conflict-${field}`}
                      checked={active}
                      onChange={() => setChoices((prev) => ({ ...prev, [field]: side }))}
                    />
                    <span className="block text-xs font-medium tracking-wide text-slate-500 uppercase">
                      {side === 'mine' ? 'Your edit' : 'Their version'}
                    </span>
                    <span
                      className={`mt-1 block break-words ${
                        value.trim() === '' ? 'text-slate-400 italic' : 'text-slate-900'
                      }`}
                    >
                      {display(value)}
                    </span>
                  </label>
                )
              })}
            </div>
          </fieldset>
        ))}

        <p className="text-xs text-slate-500">
          Fields you both left alone ({EDITABLE_FIELDS.length - fields.length} of{' '}
          {EDITABLE_FIELDS.length}) are not shown and keep their current value.
        </p>
      </div>
    </Modal>
  )
}
