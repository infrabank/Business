export default function ProvidersLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-36 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-56 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-slate-700" />
              <div className="h-5 w-28 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-4 w-full rounded bg-gray-50 dark:bg-slate-800/50" />
              <div className="h-4 w-3/4 rounded bg-gray-50 dark:bg-slate-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
