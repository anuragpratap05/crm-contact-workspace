import type { Contact } from '@/types/api'

export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'NOT_FOUND',
  'DUPLICATE_EMAIL',
  'VERSION_CONFLICT',
  'INTERNAL_ERROR',
] as const

export type ErrorCode = (typeof ERROR_CODES)[number]

export interface FieldIssue {
  field: string
  message: string
}

export type InternalErrorCause = 'network' | 'timeout' | 'server' | 'malformed'

export type ApiErrorInfo =
  | { code: 'VALIDATION_ERROR'; issues: FieldIssue[] }
  | { code: 'NOT_FOUND' }
  | { code: 'DUPLICATE_EMAIL'; field: string }
  | { code: 'VERSION_CONFLICT'; current: Contact | null }
  | { code: 'INTERNAL_ERROR'; cause: InternalErrorCause }

const DEFAULT_MESSAGES: Record<ErrorCode, string> = {
  VALIDATION_ERROR: 'The request was rejected as invalid.',
  NOT_FOUND: 'That record no longer exists.',
  DUPLICATE_EMAIL: 'Another contact already uses that email address.',
  VERSION_CONFLICT: 'This contact was changed by someone else.',
  INTERNAL_ERROR: 'The server reported an unexpected error.',
}

export class ApiError extends Error {
  readonly status: number
  readonly info: ApiErrorInfo

  constructor(status: number, info: ApiErrorInfo, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.info = info
  }

  get code(): ErrorCode {
    return this.info.code
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && (ERROR_CODES as readonly string[]).includes(value)
}

function parseIssues(details: unknown): FieldIssue[] {
  if (!Array.isArray(details)) return []

  const issues: FieldIssue[] = []
  for (const entry of details) {
    if (isRecord(entry) && typeof entry.field === 'string' && typeof entry.message === 'string') {
      issues.push({ field: entry.field, message: entry.message })
    }
  }
  return issues
}

function parseContact(value: unknown): Contact | null {
  if (!isRecord(value)) return null

  const { id, firstName, lastName, version, tags, createdAt, updatedAt } = value

  if (typeof id !== 'string') return null
  if (typeof firstName !== 'string' || typeof lastName !== 'string') return null
  if (typeof version !== 'number' || !Array.isArray(tags)) return null
  if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') return null

  return {
    id,
    firstName,
    lastName,
    ...(typeof value.email === 'string' ? { email: value.email } : {}),
    ...(typeof value.phone === 'string' ? { phone: value.phone } : {}),
    ...(typeof value.company === 'string' ? { company: value.company } : {}),
    tags: tags.filter((tag): tag is string => typeof tag === 'string'),
    version,
    createdAt,
    updatedAt,
  }
}

interface Envelope {
  code: ErrorCode
  message: string
  details: unknown
}

function readEnvelope(body: unknown): Envelope | null {
  if (!isRecord(body) || !isRecord(body.error)) return null

  const { code, message, details } = body.error
  if (!isErrorCode(code)) return null

  return {
    code,
    message: typeof message === 'string' && message.length > 0 ? message : DEFAULT_MESSAGES[code],
    details,
  }
}

export function apiErrorFromResponse(status: number, body: unknown): ApiError {
  const envelope = readEnvelope(body)

  if (!envelope) {
    return new ApiError(
      status,
      { code: 'INTERNAL_ERROR', cause: status >= 500 ? 'server' : 'malformed' },
      DEFAULT_MESSAGES.INTERNAL_ERROR,
    )
  }

  switch (envelope.code) {
    case 'VALIDATION_ERROR':
      return new ApiError(
        status,
        { code: 'VALIDATION_ERROR', issues: parseIssues(envelope.details) },
        envelope.message,
      )
    case 'NOT_FOUND':
      return new ApiError(status, { code: 'NOT_FOUND' }, envelope.message)
    case 'DUPLICATE_EMAIL': {
      const field =
        isRecord(envelope.details) && typeof envelope.details.field === 'string'
          ? envelope.details.field
          : 'email'
      return new ApiError(status, { code: 'DUPLICATE_EMAIL', field }, envelope.message)
    }
    case 'VERSION_CONFLICT': {
      const current = isRecord(envelope.details) ? parseContact(envelope.details.current) : null
      return new ApiError(status, { code: 'VERSION_CONFLICT', current }, envelope.message)
    }
    case 'INTERNAL_ERROR':
      return new ApiError(status, { code: 'INTERNAL_ERROR', cause: 'server' }, envelope.message)
  }
}

export function apiErrorFromFailure(cause: InternalErrorCause, message: string): ApiError {
  return new ApiError(0, { code: 'INTERNAL_ERROR', cause }, message)
}
