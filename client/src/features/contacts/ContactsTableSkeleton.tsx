const ROWS = 8
const COLUMNS = 8

export function ContactsTableSkeleton() {
  return (
    <div
      aria-hidden
      className="overflow-hidden rounded-lg border border-slate-200 bg-white"
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
      </div>
      {Array.from({ length: ROWS }, (_, row) => (
        <div key={row} className="flex gap-4 border-b border-slate-100 px-4 py-3.5 last:border-0">
          {Array.from({ length: COLUMNS }, (_, column) => (
            <div key={column} className="h-3 flex-1 animate-pulse rounded bg-slate-100" />
          ))}
        </div>
      ))}
    </div>
  )
}
