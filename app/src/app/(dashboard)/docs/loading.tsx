export default function DocsLoading() {
  return (
    <div className="flex gap-8 animate-pulse">
      <div className="hidden w-56 flex-shrink-0 lg:block">
        <div className="space-y-2">
          <div className="h-4 w-16 rounded bg-gray-200 dark:bg-slate-700" />
          {[...Array(7)].map((_, i) => (
            <div key={i} className="h-9 w-full rounded-lg bg-gray-100 dark:bg-slate-800" />
          ))}
        </div>
      </div>
      <div className="min-w-0 flex-1 space-y-6">
        <div>
          <div className="h-7 w-32 rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-40 rounded bg-gray-200 dark:bg-slate-700" />
                  <div className="h-4 w-full rounded bg-gray-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
