import { MultiSelect, SingleSelect } from '@/components/ui/SelectMenu'
import { DateRangeFilter } from './DateRangeFilter'
import { SearchInput } from './SearchInput'
import { TagMatchToggle } from './TagMatchToggle'
import { useCompaniesQuery, useTagsQuery } from './queries'
import type { ContactListParams } from '@/lib/queryParams'
import type { UpdateContactListParams } from './useContactListParams'

interface Props {
  params: ContactListParams
  update: UpdateContactListParams
}

export function FilterBar({ params, update }: Props) {
  const tags = useTagsQuery()
  const companies = useCompaniesQuery()

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
        <div>
          <span className="mb-1 block text-xs font-medium text-slate-600">Search</span>
          <SearchInput
            value={params.search}
            onChange={(search) => update({ search }, { replace: true })}
          />
        </div>

        <div>
          <MultiSelect
            label="Tags"
            value={params.tags}
            options={tags.data ?? []}
            placeholder={tags.isPending ? 'Loading…' : 'Any tag'}
            onChange={(selected) => update({ tags: selected })}
            disabled={tags.isPending || (tags.data?.length ?? 0) === 0}
          />
          {params.tags.length > 1 ? (
            <div className="mt-2">
              <TagMatchToggle
                value={params.tagMatch}
                onChange={(tagMatch) => update({ tagMatch })}
              />
            </div>
          ) : null}
        </div>

        <div>
          <SingleSelect
            label="Company"
            value={params.company}
            options={companies.data ?? []}
            placeholder={companies.isPending ? 'Loading…' : 'All companies'}
            onChange={(company) => update({ company })}
            disabled={companies.isPending || (companies.data?.length ?? 0) === 0}
          />
        </div>

        <DateRangeFilter
          from={params.createdFrom}
          to={params.createdTo}
          onChange={(range) => update(range)}
        />
      </div>
    </div>
  )
}
