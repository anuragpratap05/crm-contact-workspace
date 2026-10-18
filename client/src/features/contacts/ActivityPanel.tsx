import { useState } from 'react'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { Button } from '@/components/ui/Button'
import { TagChip } from '@/components/ui/TagChip'
import { formatDateTime, formatList, formatRelativeTime } from '@/lib/format'
import { FIELD_LABELS, isEditableField } from './contactFormSchema'
import { useActivitiesQuery } from './queries'
import type { Activity, ActivityType } from '@/types/api'

const LIMITS = [20, 50, 100]

const DOT_COLOURS: Record<ActivityType, string> = {
  CONTACT_UPDATED: 'bg-sky-500',
  TAG_ADDED: 'bg-emerald-500',
  TAG_REMOVED: 'bg-amber-500',
}

function describe(activity: Activity): { text: string; tag?: string } {
  switch (activity.type) {
    case 'CONTACT_UPDATED': {
      const fields = activity.metadata?.fields ?? []
      const labels = fields.map((field) =>
        isEditableField(field) ? FIELD_LABELS[field].toLowerCase() : field,
      )
      return { text: labels.length > 0 ? `Updated ${formatList(labels)}` : 'Updated the contact' }
    }
    case 'TAG_ADDED':
      return { text: 'Added the tag', ...(activity.metadata?.tag ? { tag: activity.metadata.tag } : {}) }
    case 'TAG_REMOVED':
      return {
        text: 'Removed the tag',
        ...(activity.metadata?.tag ? { tag: activity.metadata.tag } : {}),
      }
  }
}

interface Props {
  contactId: string
}

export function ActivityPanel({ contactId }: Props) {
  const [limit, setLimit] = useState(LIMITS[0] ?? 20)
  const query = useActivitiesQuery(contactId, limit)

  const canShowMore =
    query.data !== undefined && query.data.length === limit && limit < (LIMITS.at(-1) ?? 100)

  const showMore = () => {
    const next = LIMITS.find((candidate) => candidate > limit)
    if (next !== undefined) setLimit(next)
  }

  return (
    <div className="space-y-4">
      {query.isPending ? (
        <ul className="space-y-3">
          {[0, 1, 2].map((row) => (
            <li key={row} className="h-4 animate-pulse rounded bg-slate-100" />
          ))}
        </ul>
      ) : null}

      {query.isError ? (
        <ApiErrorNotice
          error={query.error}
          onRetry={() => void query.refetch()}
          isRetrying={query.isFetching}
        />
      ) : null}

      {query.data && query.data.length === 0 ? (
        <p className="text-sm text-slate-500">No activity recorded for this contact yet.</p>
      ) : null}

      {query.data && query.data.length > 0 ? (
        <ol className={`space-y-3 ${query.isPlaceholderData ? 'opacity-60' : ''}`}>
          {query.data.map((activity) => {
            const { text, tag } = describe(activity)

            return (
              <li key={activity.id} className="flex items-start gap-3 text-sm">
                <span
                  aria-hidden
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${DOT_COLOURS[activity.type]}`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-slate-800">
                    {text}
                    {tag ? (
                      <>
                        {' '}
                        <TagChip label={tag} />
                      </>
                    ) : null}
                    {activity.metadata?.bulk ? (
                      <span className="ml-1.5 text-xs text-slate-500">in a bulk update</span>
                    ) : null}
                  </p>
                  <time
                    dateTime={activity.createdAt}
                    title={formatDateTime(activity.createdAt)}
                    className="text-xs text-slate-500"
                  >
                    {formatRelativeTime(activity.createdAt)}
                  </time>
                </div>
              </li>
            )
          })}
        </ol>
      ) : null}

      {canShowMore ? (
        <Button onClick={showMore} disabled={query.isFetching}>
          Show more
        </Button>
      ) : null}
    </div>
  )
}
