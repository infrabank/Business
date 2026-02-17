'use client'

interface Column<T> {
  key: string
  header: string
  render?: (item: T) => React.ReactNode
  align?: 'left' | 'center' | 'right'
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  keyExtractor: (item: T) => string
  emptyMessage?: string
  ariaLabel?: string
}

export function DataTable<T>({ columns, data, keyExtractor, emptyMessage = 'No data', ariaLabel }: DataTableProps<T>) {
  if (data.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200/60 dark:border-slate-700/60 py-16 text-center text-slate-400 dark:text-slate-500">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm">
      <table className="w-full text-sm" aria-label={ariaLabel}>
        <thead>
          <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 ${
                  col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                }`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={keyExtractor(item)} className="border-b border-slate-50 dark:border-slate-800 last:border-0 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`px-5 py-4 ${
                    col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                  }`}
                >
                  {col.render ? col.render(item) : String((item as Record<string, unknown>)[col.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
