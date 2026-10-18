import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { beforeEach, describe, expect, it } from 'vitest'
import { API, server } from '@/test/server'
import { renderWithProviders } from '@/test/render'
import ContactsPage from './ContactsPage'
import type { Contact } from '@/types/api'

const requests: URL[] = []

function contact(index: number): Contact {
  return {
    id: `id-${index}`,
    firstName: `First${index}`,
    lastName: `Last${index}`,
    email: `person${index}@example.com`,
    tags: [],
    version: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  }
}

function listHandler(total: number) {
  return http.get(`${API}/contacts`, ({ request }) => {
    const url = new URL(request.url)
    requests.push(url)

    const limit = Number(url.searchParams.get('limit') ?? 25)
    const page = Number(url.searchParams.get('page') ?? 1)
    const start = (page - 1) * limit
    const items = Array.from({ length: Math.max(Math.min(limit, total - start), 0) }, (_, i) =>
      contact(start + i),
    )
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit)

    return HttpResponse.json({
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0,
      },
    })
  })
}

beforeEach(() => {
  requests.length = 0
  server.use(
    http.get(`${API}/tags`, () => HttpResponse.json({ data: ['VIP', 'Lead'] })),
    http.get(`${API}/companies`, () => HttpResponse.json({ data: ['Acme'] })),
  )
})

describe('empty states', () => {
  it('says there are no contacts when nothing is filtered', async () => {
    server.use(listHandler(0))
    renderWithProviders(<ContactsPage />, { route: '/contacts' })

    expect(await screen.findByText('No contacts yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Clear filters' })).not.toBeInTheDocument()
  })

  it('says nothing matched, and offers to clear, when filters are active', async () => {
    server.use(listHandler(0))
    renderWithProviders(<ContactsPage />, { route: '/contacts?search=zzzz' })

    expect(await screen.findByText('No contacts match these filters')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('offers a way back when the page is past the end', async () => {
    server.use(listHandler(30))
    renderWithProviders(<ContactsPage />, { route: '/contacts?page=9' })

    expect(await screen.findByText('This page is empty')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Back to the first page' })).toBeInTheDocument()
  })
})

describe('filter changes', () => {
  it('resets to the first page so results cannot be hidden on a page that no longer exists', async () => {
    const user = userEvent.setup()
    server.use(listHandler(300))

    const { router } = renderWithProviders(<ContactsPage />, { route: '/contacts?page=9' })

    await screen.findByRole('link', { name: 'First200 Last200' })
    expect(router.state.location.search).toBe('?page=9')

    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'lau')

    await waitFor(() =>
      expect(requests.at(-1)?.searchParams.get('search')).toBe('lau'),
    )

    expect(router.state.location.search).toBe('?search=lau')
    expect(requests.at(-1)?.searchParams.get('page')).toBe('1')
  })

  it('debounces typing into a single request', async () => {
    const user = userEvent.setup()
    server.use(listHandler(50))

    renderWithProviders(<ContactsPage />, { route: '/contacts' })
    await screen.findByRole('link', { name: 'First0 Last0' })

    const before = requests.length
    await user.type(screen.getByRole('searchbox', { name: 'Search contacts' }), 'lau')
    await waitFor(() => expect(requests.length).toBe(before + 1))

    expect(requests.at(-1)?.searchParams.get('search')).toBe('lau')
  })
})
