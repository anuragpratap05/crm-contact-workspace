import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { ApiError } from '@/lib/api/errors'
import { ConflictDialog } from './ConflictDialog'
import { useUpdateContactMutation } from './queries'
import { useUnsavedChangesWarning } from './useUnsavedChangesWarning'
import {
  FIELD_LABELS,
  contactFormSchema,
  contactToFormValues,
  formValuesToRequest,
  isEditableField,
} from './contactFormSchema'
import type { ContactFormValues, EditableField } from './contactFormSchema'
import type { Contact } from '@/types/api'

interface Conflict {
  current: Contact | null
  mine: ContactFormValues
}

interface Props {
  contact: Contact
}

export function ContactForm({ contact }: Props) {
  const mutation = useUpdateContactMutation(contact.id)
  const [conflict, setConflict] = useState<Conflict | null>(null)
  const [saved, setSaved] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isDirty, isSubmitting, defaultValues },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: contactToFormValues(contact),
  })

  const blocker = useUnsavedChangesWarning(isDirty && !isSubmitting)
  const values = watch()

  const applyServerError = (error: unknown, submitted: ContactFormValues) => {
    if (!(error instanceof ApiError)) return

    switch (error.info.code) {
      case 'VALIDATION_ERROR':
        for (const issue of error.info.issues) {
          if (isEditableField(issue.field)) {
            setError(issue.field, { type: 'server', message: issue.message })
          }
        }
        break
      case 'DUPLICATE_EMAIL':
        setError('email', { type: 'server', message: error.message })
        break
      case 'VERSION_CONFLICT':
        setConflict({ current: error.info.current, mine: submitted })
        break
      default:
        break
    }
  }

  const save = (next: ContactFormValues) => {
    setSaved(false)
    mutation.mutate(formValuesToRequest(next), {
      onSuccess: (updated) => {
        setConflict(null)
        setSaved(true)
        reset(contactToFormValues(updated))
      },
      onError: (error) => applyServerError(error, next),
    })
  }

  const onSubmit = handleSubmit((next) => {
    save(next)
  })

  const resolveConflict = (merged: ContactFormValues) => {
    setConflict(null)
    reset(merged)
    save(merged)
  }

  const bannerError =
    mutation.error instanceof ApiError &&
    (mutation.error.info.code === 'INTERNAL_ERROR' || mutation.error.info.code === 'NOT_FOUND')
      ? mutation.error
      : null

  const clearsValue = (field: EditableField) =>
    Boolean(defaultValues?.[field]) && values[field].trim() === ''

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {bannerError ? <ApiErrorNotice error={bannerError} /> : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            field="firstName"
            required
            error={errors.firstName?.message}
            register={register('firstName')}
          />
          <Field
            field="lastName"
            required
            error={errors.lastName?.message}
            register={register('lastName')}
          />
          <Field
            field="email"
            type="email"
            error={errors.email?.message}
            register={register('email')}
            warning={clearsValue('email') ? 'Saving will remove the stored email.' : undefined}
          />
          <Field
            field="phone"
            error={errors.phone?.message}
            register={register('phone')}
            warning={clearsValue('phone') ? 'Saving will remove the stored phone.' : undefined}
          />
          <div className="sm:col-span-2">
            <Field
              field="company"
              error={errors.company?.message}
              register={register('company')}
              warning={clearsValue('company') ? 'Saving will remove the stored company.' : undefined}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" variant="primary" disabled={!isDirty || mutation.isPending}>
            {mutation.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setSaved(false)
              reset()
            }}
            disabled={!isDirty || mutation.isPending}
          >
            Discard
          </Button>
          {saved && !isDirty ? (
            <span role="status" className="text-sm text-emerald-700">
              Saved
            </span>
          ) : null}
          {isDirty ? <span className="text-sm text-slate-500">Unsaved changes</span> : null}
        </div>
      </form>

      {conflict ? (
        <ConflictDialog
          current={conflict.current}
          mine={conflict.mine}
          isSaving={mutation.isPending}
          onCancel={() => setConflict(null)}
          onResolve={resolveConflict}
        />
      ) : null}

      {blocker.state === 'blocked' ? (
        <Modal
          open
          onClose={() => blocker.reset?.()}
          title="Leave without saving?"
          description="This contact has changes that have not been saved."
          footer={
            <>
              <Button onClick={() => blocker.reset?.()}>Stay on this page</Button>
              <Button variant="primary" onClick={() => blocker.proceed?.()}>
                Leave and discard
              </Button>
            </>
          }
        >
          <p className="text-sm text-slate-600">
            Your edits will be lost if you leave now.
          </p>
        </Modal>
      ) : null}
    </>
  )
}

interface FieldProps {
  field: EditableField
  register: ReturnType<ReturnType<typeof useForm<ContactFormValues>>['register']>
  error?: string | undefined
  warning?: string | undefined
  required?: boolean
  type?: string
}

function Field({ field, register, error, warning, required = false, type = 'text' }: FieldProps) {
  return (
    <div>
      <label htmlFor={field} className="mb-1 block text-xs font-medium text-slate-600">
        {FIELD_LABELS[field]}
        {required ? <span className="text-red-600"> *</span> : null}
      </label>
      <input
        {...register}
        id={field}
        type={type}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${field}-error` : undefined}
        className={`w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 focus:ring-2 focus:outline-none ${
          error
            ? 'border-red-400 focus:border-red-500 focus:ring-red-100'
            : 'border-slate-300 focus:border-slate-400 focus:ring-slate-200'
        }`}
      />
      {error ? (
        <p id={`${field}-error`} role="alert" className="mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      {!error && warning ? <p className="mt-1 text-xs text-amber-700">{warning}</p> : null}
    </div>
  )
}
