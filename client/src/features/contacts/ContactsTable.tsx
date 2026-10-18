import { Link, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { TagChip } from '@/components/ui/TagChip'
import { formatDate } from '@/lib/format'
import type { Contact, SortBy, SortOrder } from '@/types/api'

const VISIBLE_TAGS = 2

interface Props {
  contacts: Contact[]
  isStale: boolean
  sortBy: SortBy
  sortOrder: SortOrder
  onSort: (field: SortBy) => void
  selected: Set<string>
  onToggle: (id: string) => void
  onTogglePage: (ids: string[], checked: boolean) => void
}

interface SortableHeaderProps {
  label: string
  field: SortBy
  sortBy: SortBy
  sortOrder: SortOrder
  onSort: (field: SortBy) => void
  hint?: string
}

function SortableHeader({ label, field, sortBy, sortOrder, onSort, hint }: SortableHeaderProps) {
  const active = sortBy === field

  return (
    <th
      scope="col"
      aria-sort={active ? (sortOrder === 'asc' ? 'ascending' : 'descending') : 'none'}
      className="px-4 py-3 font-medium"
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        title={hint}
        className="inline-flex items-center gap-1 uppercase hover:text-slate-900 focus:text-slate-900 focus:outline-none"
      >
        {label}
        <span aria-hidden className={active ? 'text-slate-900' : 'text-slate-300'}>
          {active ? (sortOrder === 'asc' ? '▲' : '▼') : '↕'}
        </span>
      </button>
    </th>
  )
}

function TagCell({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <span className="text-slate-400">—</span>

  const shown = tags.slice(0, VISIBLE_TAGS)
  const remaining = tags.length - shown.length

  return (
    <div className="flex items-center gap-1 whitespace-nowrap">
      {shown.map((tag) => (
        <TagChip key={tag} label={tag} />
      ))}
      {remaining > 0 ? (
        <span className="text-xs text-slate-500" title={tags.slice(VISIBLE_TAGS).join(', ')}>
          +{remaining}
        </span>
      ) : null}
    </div>
  )
}

export function ContactsTable({
  contacts,
  isStale,
  sortBy,
  sortOrder,
  onSort,
  selected,
  onToggle,
  onTogglePage,
}: Props) {
  const navigate = useNavigate()

  const pageIds = contacts.map((contact) => contact.id)
  const selectedOnPage = pageIds.filter((id) => selected.has(id)).length
  const allOnPageSelected = pageIds.length > 0 && selectedOnPage === pageIds.length

  const openContact = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.target instanceof HTMLElement && event.target.closest('a, input, label, button')) {
      return
    }
    void navigate(`/contacts/${id}`)
  }

  return (
    <div
      aria-busy={isStale}
      className={`overflow-x-auto rounded-lg border border-slate-200 bg-white transition-opacity ${
        isStale ? 'opacity-60' : 'opacity-100'
      }`}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
            <th scope="col" className="w-10 px-4 py-3">
              <input
                type="checkbox"
                checked={allOnPageSelected}
                ref={(node) => {
                  if (node) node.indeterminate = selectedOnPage > 0 && !allOnPageSelected
                }}
                onChange={(event) => onTogglePage(pageIds, event.target.checked)}
                aria-label="Select every contact on this page"
                className="size-4 cursor-pointer rounded border-slate-300"
              />
            </th>
            <SortableHeader
              label="Name"
              field="name"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
              hint="Sorts by last name, then first name"
            />
            <th scope="col" className="px-4 py-3 font-medium">Email</th>
            <th scope="col" className="px-4 py-3 font-medium">Phone</th>
            <th scope="col" className="px-4 py-3 font-medium">Company</th>
            <th scope="col" className="px-4 py-3 font-medium">Tags</th>
            <SortableHeader
              label="Created"
              field="createdAt"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              label="Updated"
              field="updatedAt"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              onClick={(event) => openContact(event, contact.id)}
              className={`cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50 ${
                selected.has(contact.id) ? 'bg-slate-50' : ''
              }`}
            >
              <td className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={selected.has(contact.id)}
                  onChange={() => onToggle(contact.id)}
                  aria-label={`Select ${contact.firstName} ${contact.lastName}`}
                  className="size-4 cursor-pointer rounded border-slate-300"
                />
              </td>
              <td className="px-4 py-3 whitespace-nowrap">
                <Link
                  to={`/contacts/${contact.id}`}
                  className="font-medium text-slate-900 hover:underline focus:underline focus:outline-none"
                >
                  {contact.firstName} {contact.lastName}
                </Link>
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {contact.email ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {contact.phone ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                {contact.company ?? <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3">
                <TagCell tags={contact.tags} />
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                {formatDate(contact.createdAt)}
              </td>
              <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                {formatDate(contact.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
