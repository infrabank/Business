export default function ProxyLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-52 rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-80 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-36 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
      {/* Tab bar skeleton */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-slate-800 p-1">
        <div className="h-9 w-28 rounded-md bg-white dark:bg-slate-900 shadow-sm" />
        <div className="h-9 w-28 rounded-md bg-transparent" />
        <div className="h-9 w-28 rounded-md bg-transparent" />
      </div>
      {/* Content skeleton */}
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center justify-between">
              <div className="h-5 w-40 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-8 w-20 rounded bg-gray-100 dark:bg-slate-800" />
            </div>
            <div className="mt-3 flex gap-4">
              <div className="h-4 w-24 rounded bg-gray-50 dark:bg-slate-800/50" />
              <div className="h-4 w-20 rounded bg-gray-50 dark:bg-slate-800/50" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
