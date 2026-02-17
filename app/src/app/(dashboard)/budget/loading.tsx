export default function BudgetLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-32 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-48 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6">
        <div className="h-5 w-40 rounded bg-gray-200 dark:bg-slate-700" />
        <div className="mt-4 h-4 w-full rounded-full bg-gray-100 dark:bg-slate-800" />
        <div className="mt-3 flex justify-between">
          <div className="h-4 w-16 rounded bg-gray-50 dark:bg-slate-800/50" />
          <div className="h-4 w-16 rounded bg-gray-50 dark:bg-slate-800/50" />
        </div>
      </div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-5">
            <div className="h-5 w-32 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-2 h-4 w-48 rounded bg-gray-50 dark:bg-slate-800/50" />
          </div>
        ))}
      </div>
    </div>
  )
}
