export default function DashboardPageLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-3 h-8 w-20 rounded bg-gray-100 dark:bg-slate-800" />
            <div className="mt-2 h-3 w-16 rounded bg-gray-50 dark:bg-slate-800/50" />
          </div>
        ))}
      </div>
      {/* Chart skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-4 h-64 w-full rounded-lg bg-gray-50 dark:bg-slate-800/50" />
      </div>
      {/* Table skeleton */}
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="h-5 w-28 rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-8 w-1/4 rounded bg-gray-50 dark:bg-slate-800/50" />
              <div className="h-8 w-1/4 rounded bg-gray-50 dark:bg-slate-800/50" />
              <div className="h-8 w-1/4 rounded bg-gray-50 dark:bg-slate-800/50" />
              <div className="h-8 w-1/4 rounded bg-gray-50 dark:bg-slate-800/50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
