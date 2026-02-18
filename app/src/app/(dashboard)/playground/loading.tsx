export default function PlaygroundLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-40 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-64 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="mt-4 h-48 rounded bg-gray-50 dark:bg-slate-800/50" />
        </div>
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
          <div className="h-5 w-24 rounded bg-gray-200 dark:bg-slate-700" />
          <div className="mt-4 h-48 rounded bg-gray-50 dark:bg-slate-800/50" />
        </div>
      </div>
    </div>
  )
}
