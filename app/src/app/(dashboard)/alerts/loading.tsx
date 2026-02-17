export default function AlertsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-52 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4">
            <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-slate-700" />
            <div className="flex-1">
              <div className="h-4 w-48 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="mt-2 h-3 w-32 rounded bg-gray-50 dark:bg-slate-800/50" />
            </div>
            <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-slate-800" />
          </div>
        ))}
      </div>
    </div>
  )
}
