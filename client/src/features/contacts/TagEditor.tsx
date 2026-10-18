import { useState } from 'react'
import { ApiErrorNotice } from '@/components/ApiErrorNotice'
import { Button } from '@/components/ui/Button'
import { TagChip } from '@/components/ui/TagChip'
import { MAX_TAG_LENGTH, TagCombobox } from '@/components/ui/TagCombobox'
import { useAddTagMutation, useRemoveTagMutation, useTagsQuery } from './queries'
import type { Contact } from '@/types/api'

interface Props {
  contact: Contact
}

export function TagEditor({ contact }: Props) {
  const [draft, setDraft] = useState('')
  const tags = useTagsQuery()
  const addTag = useAddTagMutation(contact.id)
  const removeTag = useRemoveTagMutation(contact.id)

  const trimmed = draft.trim()
  const alreadyPresent = contact.tags.some((tag) => tag.toLowerCase() === trimmed.toLowerCase())
  const canAdd = trimmed.length > 0 && trimmed.length <= MAX_TAG_LENGTH && !alreadyPresent

  const suggestions = (tags.data ?? []).filter((tag) => !contact.tags.includes(tag))

  const submit = () => {
    if (!canAdd) return
    addTag.mutate(trimmed, { onSuccess: () => setDraft('') })
  }

  return (
    <div className="space-y-3">
      {contact.tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {contact.tags.map((tag) => (
            <TagChip
              key={tag}
              label={tag}
              disabled={removeTag.isPending}
              onRemove={() => removeTag.mutate(tag)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-slate-500">No tags on this contact.</p>
      )}

      <form
        onSubmit={(event) => {
          event.preventDefault()
          submit()
        }}
        className="flex items-start gap-2"
      >
        <div className="w-64">
          <label htmlFor="add-tag" className="sr-only">
            Add a tag
          </label>
          <TagCombobox
            id="add-tag"
            value={draft}
            options={suggestions}
            onChange={setDraft}
            disabled={addTag.isPending}
          />
          {alreadyPresent ? (
            <p className="mt-1 text-xs text-slate-500">This contact already has that tag.</p>
          ) : null}
        </div>
        <Button type="submit" disabled={!canAdd || addTag.isPending}>
          {addTag.isPending ? 'Adding…' : 'Add tag'}
        </Button>
      </form>

      {addTag.isError ? <ApiErrorNotice error={addTag.error} /> : null}
      {removeTag.isError ? <ApiErrorNotice error={removeTag.error} /> : null}
    </div>
  )
}
