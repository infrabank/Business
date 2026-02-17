export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
      {/* Content skeleton */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="h-4 w-20 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-3 h-8 w-28 rounded bg-gray-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="h-5 w-36 rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 w-full rounded bg-gray-50 dark:bg-slate-800/50" />
          ))}
        </div>
      </div>
    </div>
  )
}
