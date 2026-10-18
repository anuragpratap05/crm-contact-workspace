import { Button } from '@/components/ui/Button'
import { formatCount } from '@/lib/format'
import { MAX_BULK_SELECTION } from './useContactSelection'
import type { BulkTagAction } from '@/types/api'

interface Props {
  count: number
  atLimit: boolean
  onBulkTag: (action: BulkTagAction) => void
  onClear: () => void
}

export function BulkTagBar({ count, atLimit, onBulkTag, onClear }: Props) {
  return (
    <div className="flex flex-col gap-3 rounded-lg bg-slate-900 px-4 py-3 text-white sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        {formatCount(count, 'contact')} selected
        {atLimit ? (
          <span className="ml-2 text-amber-300">
            maximum of {MAX_BULK_SELECTION} reached
          </span>
        ) : null}
      </p>
      <div className="flex items-center gap-2">
        <Button onClick={() => onBulkTag('add')}>Add tag</Button>
        <Button onClick={() => onBulkTag('remove')}>Remove tag</Button>
        <Button
          onClick={onClear}
          className="bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          Clear
        </Button>
      </div>
    </div>
  )
}
