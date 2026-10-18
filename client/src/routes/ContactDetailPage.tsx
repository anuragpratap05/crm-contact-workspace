import { Link, useParams } from 'react-router-dom'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { EmptyState } from '@/components/ui/EmptyState'
import { TagChip } from '@/components/ui/TagChip'
import { ContactForm } from '@/features/contacts/ContactForm'
import { useContactQuery } from '@/features/contacts/queries'
import { ApiError } from '@/lib/api/errors'
import { formatDate } from '@/lib/format'

const backLinkClass = 'text-sm font-medium text-slate-600 hover:text-slate-900'

export default function ContactDetailPage() {
  const { id = '' } = useParams<{ id: string }>()
  const query = useContactQuery(id)

  const notFound = query.error instanceof ApiError && query.error.info.code === 'NOT_FOUND'

  return (
    <div className="space-y-5">
      <Link to="/contacts" className={backLinkClass}>
        ← Back to contacts
      </Link>

      {query.isPending ? (
        <div className="space-y-4">
          <div className="h-7 w-56 animate-pulse rounded bg-slate-200" />
          <div className="h-64 animate-pulse rounded-lg border border-slate-200 bg-white" />
        </div>
      ) : null}

      {notFound ? (
        <EmptyState
          title="Contact not found"
          description="This contact does not exist, or it was removed after the link was created."
          action={
            <Link
              to="/contacts"
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Back to contacts
            </Link>
          }
        />
      ) : null}

      {query.isError && !notFound ? (
        <ApiErrorNotice
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}

      {query.data ? (
        <>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">
              {query.data.firstName} {query.data.lastName}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Created {formatDate(query.data.createdAt)} · Updated{' '}
              {formatDate(query.data.updatedAt)} · Version {query.data.version}
            </p>
          </div>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-4 text-sm font-semibold text-slate-900">Details</h2>
            <ContactForm key={query.data.id} contact={query.data} />
          </section>

          <section className="rounded-lg border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-900">Tags</h2>
            {query.data.tags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {query.data.tags.map((tag) => (
                  <TagChip key={tag} label={tag} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No tags on this contact.</p>
            )}
          </section>
        </>
      ) : null}
    </div>
  )
}
