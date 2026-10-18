import { useState } from 'react'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { MAX_TAG_LENGTH, TagCombobox } from '@/components/ui/TagCombobox'
import { formatCount } from '@/lib/format'
import { useBulkTagMutation, useTagsQuery } from './queries'
import type { BulkTagAction, BulkTagResult } from '@/types/api'

interface Props {
  action: BulkTagAction
  contactIds: string[]
  onClose: () => void
  onDone: () => void
}

function summarise(result: BulkTagResult, requested: number): string[] {
  const lines: string[] = []
  const verb = result.action === 'add' ? 'Added' : 'Removed'
  const preposition = result.action === 'add' ? 'to' : 'from'

  lines.push(`${verb} “${result.tag}” ${preposition} ${formatCount(result.modified, 'contact')}.`)

  const unchanged = result.matched - result.modified
  if (unchanged > 0) {
    lines.push(
      result.action === 'add'
        ? `${formatCount(unchanged, 'contact')} already had it.`
        : `${formatCount(unchanged, 'contact')} did not have it.`,
    )
  }

  const missing = requested - result.matched
  if (missing > 0) {
    lines.push(`${formatCount(missing, 'contact')} could not be found.`)
  }

  return lines
}

export function BulkTagDialog({ action, contactIds, onClose, onDone }: Props) {
  const [tag, setTag] = useState('')
  const tags = useTagsQuery()
  const mutation = useBulkTagMutation()

  const trimmed = tag.trim()
  const canSubmit = trimmed.length > 0 && trimmed.length <= MAX_TAG_LENGTH

  const title = action === 'add' ? 'Add a tag' : 'Remove a tag'
  const verb = action === 'add' ? 'Add' : 'Remove'

  if (mutation.isSuccess) {
    return (
      <Modal
        open
        onClose={onDone}
        title="Done"
        footer={
          <Button variant="primary" onClick={onDone}>
            Close
          </Button>
        }
      >
        <div className="space-y-1 text-sm text-slate-700">
          {summarise(mutation.data, contactIds.length).map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      description={`${verb} one tag ${action === 'add' ? 'on' : 'from'} ${formatCount(contactIds.length, 'selected contact')}.`}
      footer={
        <>
          <Button onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit || mutation.isPending}
            onClick={() => mutation.mutate({ contactIds, tag: trimmed, action })}
          >
            {mutation.isPending ? 'Working…' : `${verb} tag`}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <label htmlFor="bulk-tag" className="mb-1 block text-xs font-medium text-slate-600">
            Tag
          </label>
          <TagCombobox
            id="bulk-tag"
            value={tag}
            options={tags.data ?? []}
            onChange={setTag}
            disabled={mutation.isPending}
          />
        </div>

        <p className="text-xs text-slate-500">
          {action === 'add'
            ? 'Contacts that already have this tag are left alone.'
            : 'Contacts without this tag are left alone.'}
        </p>

        {mutation.isError ? <ApiErrorNotice error={mutation.error} /> : null}
      </div>
    </Modal>
  )
}
