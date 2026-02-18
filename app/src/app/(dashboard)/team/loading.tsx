export default function TeamLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-24 rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-48 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-16 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900" />
        ))}
      </div>
    </div>
  )
}
