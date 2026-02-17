export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div>
        <div className="h-7 w-28 rounded-lg bg-gray-200 dark:bg-slate-700" />
        <div className="mt-2 h-4 w-48 rounded bg-gray-100 dark:bg-slate-800" />
      </div>
      <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-6 space-y-5">
        {[...Array(4)].map((_, i) => (
          <div key={i}>
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-slate-700" />
            <div className="mt-2 h-10 w-full rounded-lg bg-gray-50 dark:bg-slate-950" />
          </div>
        ))}
        <div className="h-10 w-24 rounded-lg bg-gray-200 dark:bg-slate-700" />
      </div>
    </div>
  )
}
