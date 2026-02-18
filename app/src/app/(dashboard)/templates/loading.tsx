export default function TemplatesLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
          <div className="mt-2 h-4 w-52 rounded bg-gray-100 dark:bg-slate-800" />
        </div>
        <div className="h-9 w-32 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-2 h-4 w-full rounded bg-gray-100 dark:bg-slate-800" />
            <div className="mt-4 flex gap-2">
              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-slate-800" />
              <div className="h-6 w-16 rounded-full bg-gray-100 dark:bg-slate-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
