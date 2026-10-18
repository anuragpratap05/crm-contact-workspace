import { Link, useNavigate } from 'react-router-dom'
import type { MouseEvent } from 'react'
import { TagChip } from '@/components/ui/TagChip'
import { formatDate } from '@/lib/format'
import type { Contact } from '@/types/api'

const VISIBLE_TAGS = 2

interface Props {
  contacts: Contact[]
  isStale: boolean
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

export function ContactsTable({ contacts, isStale }: Props) {
  const navigate = useNavigate()

  const openContact = (event: MouseEvent<HTMLTableRowElement>, id: string) => {
    if (event.target instanceof HTMLElement && event.target.closest('a')) return
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
            <th scope="col" className="px-4 py-3 font-medium">Name</th>
            <th scope="col" className="px-4 py-3 font-medium">Email</th>
            <th scope="col" className="px-4 py-3 font-medium">Phone</th>
            <th scope="col" className="px-4 py-3 font-medium">Company</th>
            <th scope="col" className="px-4 py-3 font-medium">Tags</th>
            <th scope="col" className="px-4 py-3 font-medium">Updated</th>
          </tr>
        </thead>
        <tbody>
          {contacts.map((contact) => (
            <tr
              key={contact.id}
              onClick={(event) => openContact(event, contact.id)}
              className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
            >
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
                {formatDate(contact.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
