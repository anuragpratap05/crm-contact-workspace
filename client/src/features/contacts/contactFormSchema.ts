import { z } from 'zod'
import type { Contact, UpdateContactRequest } from '@/types/api'

export const contactFormSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(80, 'Must be at most 80 characters'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(80, 'Must be at most 80 characters'),
  email: z
    .string()
    .trim()
    .max(254, 'Must be at most 254 characters')
    .refine((value) => value === '' || z.string().email().safeParse(value).success, {
      message: 'Must be a valid email address',
    }),
  phone: z.string().trim().max(40, 'Must be at most 40 characters'),
  company: z.string().trim().max(120, 'Must be at most 120 characters'),
  version: z.number().int().min(0),
})

export type ContactFormValues = z.infer<typeof contactFormSchema>

export const EDITABLE_FIELDS = ['firstName', 'lastName', 'email', 'phone', 'company'] as const

export type EditableField = (typeof EDITABLE_FIELDS)[number]

export const FIELD_LABELS: Record<EditableField, string> = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
  company: 'Company',
}

export function isEditableField(field: string): field is EditableField {
  return (EDITABLE_FIELDS as readonly string[]).includes(field)
}

export function contactToFormValues(contact: Contact): ContactFormValues {
  return {
    firstName: contact.firstName,
    lastName: contact.lastName,
    email: contact.email ?? '',
    phone: contact.phone ?? '',
    company: contact.company ?? '',
    version: contact.version,
  }
}

export function formValuesToRequest(values: ContactFormValues): UpdateContactRequest {
  const optional = (value: string) => (value.trim() === '' ? null : value.trim())

  return {
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    email: optional(values.email),
    phone: optional(values.phone),
    company: optional(values.company),
    version: values.version,
  }
}

export function differingFields(
  mine: ContactFormValues,
  theirs: ContactFormValues,
): EditableField[] {
  return EDITABLE_FIELDS.filter((field) => mine[field].trim() !== theirs[field].trim())
}
