import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API, server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import { ContactForm } from './ContactForm'
import type { Contact, UpdateContactRequest } from '@/types/api'

const original: Contact = {
  id: 'contact-1',
  firstName: 'Aarav',
  lastName: 'Anderson',
  email: 'aarav@example.com',
  phone: '+1-235-4505',
  company: 'Summit Health',
  tags: [],
  version: 3,
  createdAt: '2026-02-28T16:50:44.022Z',
  updatedAt: '2026-02-28T16:50:44.022Z',
}

const theirs: Contact = {
  ...original,
  lastName: 'Andersen',
  company: 'Summit Medical',
  version: 4,
}

let bodies: UpdateContactRequest[] = []

beforeEach(() => {
  bodies = []
})

function putHandler(respond: (attempt: number) => Response) {
  return http.put(`${API}/contacts/:id`, async ({ request }) => {
    bodies.push((await request.json()) as UpdateContactRequest)
    return respond(bodies.length)
  })
}

const conflict = () =>
  HttpResponse.json(
    {
      error: {
        code: 'VERSION_CONFLICT',
        message: 'This contact was modified by someone else.',
        details: { current: theirs },
      },
    },
    { status: 409 },
  )

async function editCompanyAndSave(user: ReturnType<typeof userEvent.setup>, value: string) {
  const company = screen.getByLabelText('Company')
  await user.clear(company)
  await user.type(company, value)
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
}

describe('saving a contact', () => {
  it('sends every field plus the version, because PUT replaces rather than patches', async () => {
    const user = userEvent.setup()
    server.use(putHandler(() => HttpResponse.json({ data: { ...original, version: 4 } })))

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]).toEqual({
      firstName: 'Aarav',
      lastName: 'Anderson',
      email: 'aarav@example.com',
      phone: '+1-235-4505',
      company: 'Summit Health Group',
      version: 3,
    })
  })

  it('sends null for a cleared optional field', async () => {
    const user = userEvent.setup()
    server.use(putHandler(() => HttpResponse.json({ data: { ...original, version: 4 } })))

    renderWithProviders(<ContactForm contact={original} />)
    await user.clear(screen.getByLabelText('Phone'))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(bodies).toHaveLength(1))
    expect(bodies[0]?.phone).toBeNull()
  })

  it('warns that clearing a populated field will remove the stored value', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactForm contact={original} />)

    await user.clear(screen.getByLabelText('Phone'))

    expect(await screen.findByText('Saving will remove the stored phone.')).toBeInTheDocument()
  })

  it('blocks an invalid field before it reaches the server', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ContactForm contact={original} />)

    await user.clear(screen.getByLabelText(/First name/))
    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('First name is required')).toBeInTheDocument()
    expect(bodies).toHaveLength(0)
  })
})

describe('server errors land on the field they belong to', () => {
  it('maps VALIDATION_ERROR details onto inputs', async () => {
    const user = userEvent.setup()
    server.use(
      putHandler(() =>
        HttpResponse.json(
          {
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Request validation failed',
              details: [{ field: 'company', message: 'Must be at most 120 characters' }],
            },
          },
          { status: 400 },
        ),
      ),
    )

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    expect(await screen.findByText('Must be at most 120 characters')).toBeInTheDocument()
  })

  it('maps DUPLICATE_EMAIL onto the email input', async () => {
    const user = userEvent.setup()
    server.use(
      putHandler(() =>
        HttpResponse.json(
          {
            error: {
              code: 'DUPLICATE_EMAIL',
              message: 'A contact with email "taken@example.com" already exists',
              details: { field: 'email' },
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    const message = await screen.findByText(/already exists/)
    expect(message).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('resolving a version conflict', () => {
  it('lets the user keep their own edit for one field and take theirs for another', async () => {
    const user = userEvent.setup()
    server.use(
      putHandler((attempt) =>
        attempt === 1 ? conflict() : HttpResponse.json({ data: { ...theirs, version: 5 } }),
      ),
    )

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    expect(await screen.findByText('Someone else saved this contact first')).toBeInTheDocument()

    const lastName = screen.getByRole('group', { name: 'Last name' })
    await user.click(within(lastName).getByRole('radio', { name: /Their version/ }))

    await user.click(screen.getByRole('button', { name: 'Save selected values' }))

    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[1]).toEqual({
      firstName: 'Aarav',
      lastName: 'Andersen',
      email: 'aarav@example.com',
      phone: '+1-235-4505',
      company: 'Summit Health Group',
      version: 4,
    })

    expect(await screen.findByText('Saved')).toBeInTheDocument()
  })

  it('shows only the fields that actually differ', async () => {
    const user = userEvent.setup()
    server.use(putHandler(() => conflict()))

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    await screen.findByText('Someone else saved this contact first')

    expect(screen.getByRole('group', { name: 'Last name' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Company' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'First name' })).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Email' })).not.toBeInTheDocument()
  })

  it('discards the user edit entirely when they ask for theirs', async () => {
    const user = userEvent.setup()
    server.use(
      putHandler((attempt) =>
        attempt === 1 ? conflict() : HttpResponse.json({ data: { ...theirs, version: 5 } }),
      ),
    )

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    await screen.findByText('Someone else saved this contact first')
    await user.click(screen.getByRole('button', { name: 'Discard my changes' }))

    await waitFor(() => expect(bodies).toHaveLength(2))
    expect(bodies[1]).toMatchObject({
      lastName: 'Andersen',
      company: 'Summit Medical',
      version: 4,
    })
  })

  it('offers a reload when the conflict payload has no usable contact', async () => {
    const user = userEvent.setup()
    server.use(
      putHandler(() =>
        HttpResponse.json(
          {
            error: {
              code: 'VERSION_CONFLICT',
              message: 'changed',
              details: { current: { id: 'contact-1' } },
            },
          },
          { status: 409 },
        ),
      ),
    )

    renderWithProviders(<ContactForm contact={original} />)
    await editCompanyAndSave(user, 'Summit Health Group')

    expect(await screen.findByText('This contact changed')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reload the contact' })).toBeInTheDocument()
  })
})
