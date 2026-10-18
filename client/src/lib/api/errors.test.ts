import { http, HttpResponse } from 'msw'
import { describe, expect, it } from 'vitest'
import { API, server } from '@/test/server'
import { fetchContact } from '@/features/contacts/api'
import { ApiError, apiErrorFromResponse } from './errors'

const contact = {
  id: '6ad38b446a7b87f4c30abf9f',
  firstName: 'Aarav',
  lastName: 'Anderson',
  email: 'aarav@example.com',
  tags: ['VIP'],
  version: 3,
  createdAt: '2026-02-28T16:50:44.022Z',
  updatedAt: '2026-10-18T11:12:10.133Z',
}

describe('apiErrorFromResponse', () => {
  it('keeps well-formed validation issues and drops malformed ones', () => {
    const error = apiErrorFromResponse(400, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: [{ field: 'firstName', message: 'First name is required' }, { field: 'noMessage' }],
      },
    })

    expect(error.info).toEqual({
      code: 'VALIDATION_ERROR',
      issues: [{ field: 'firstName', message: 'First name is required' }],
    })
    expect(error.message).toBe('Request validation failed')
  })

  it('defaults DUPLICATE_EMAIL to the email field when details are missing', () => {
    const error = apiErrorFromResponse(409, {
      error: { code: 'DUPLICATE_EMAIL', message: 'already exists' },
    })

    expect(error.info).toEqual({ code: 'DUPLICATE_EMAIL', field: 'email' })
  })

  it('parses the current contact out of a version conflict', () => {
    const error = apiErrorFromResponse(409, {
      error: { code: 'VERSION_CONFLICT', message: 'changed', details: { current: contact } },
    })

    expect(error.info.code).toBe('VERSION_CONFLICT')
    if (error.info.code !== 'VERSION_CONFLICT') throw new Error('unreachable')
    expect(error.info.current?.version).toBe(3)
    expect(error.info.current?.tags).toEqual(['VIP'])
  })

  it('drops non-string tags rather than trusting the payload', () => {
    const error = apiErrorFromResponse(409, {
      error: {
        code: 'VERSION_CONFLICT',
        message: 'changed',
        details: { current: { ...contact, tags: ['VIP', 7, null] } },
      },
    })

    if (error.info.code !== 'VERSION_CONFLICT') throw new Error('unreachable')
    expect(error.info.current?.tags).toEqual(['VIP'])
  })

  it('reports current as null when the conflict payload does not parse', () => {
    const error = apiErrorFromResponse(409, {
      error: { code: 'VERSION_CONFLICT', message: 'changed', details: { current: { id: 'abc' } } },
    })

    expect(error.info).toEqual({ code: 'VERSION_CONFLICT', current: null })
  })

  it('treats a non-envelope body as an internal error', () => {
    const gateway = apiErrorFromResponse(502, '<html>Bad Gateway</html>')
    expect(gateway.info).toEqual({ code: 'INTERNAL_ERROR', cause: 'server' })

    const unknown = apiErrorFromResponse(400, { error: { code: 'WHO_KNOWS', message: 'nope' } })
    expect(unknown.info).toEqual({ code: 'INTERNAL_ERROR', cause: 'malformed' })
  })

  it('keeps NOT_FOUND and its server message', () => {
    const error = apiErrorFromResponse(404, {
      error: { code: 'NOT_FOUND', message: 'Contact not found' },
    })

    expect(error.info).toEqual({ code: 'NOT_FOUND' })
    expect(error.message).toBe('Contact not found')
  })
})

describe('the response interceptor', () => {
  it('turns a server envelope into an ApiError before it reaches the caller', async () => {
    server.use(
      http.get(`${API}/contacts/:id`, () =>
        HttpResponse.json(
          { error: { code: 'NOT_FOUND', message: 'Contact not found' } },
          { status: 404 },
        ),
      ),
    )

    await expect(fetchContact('6ad38b446a7b87f4c30abf9f')).rejects.toSatisfy(
      (error: unknown) => error instanceof ApiError && error.info.code === 'NOT_FOUND',
    )
  })

  it('turns a network failure into an internal error with a network cause', async () => {
    server.use(http.get(`${API}/contacts/:id`, () => HttpResponse.error()))

    await expect(fetchContact('6ad38b446a7b87f4c30abf9f')).rejects.toSatisfy(
      (error: unknown) =>
        error instanceof ApiError &&
        error.info.code === 'INTERNAL_ERROR' &&
        error.info.cause === 'network',
    )
  })
})
