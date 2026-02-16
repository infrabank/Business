export function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-slate-900">
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-slate-500">
            &copy; {new Date().getFullYear()} LLM Cost Manager. 모든 권리 보유.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">개인정보 처리방침</a>
            <a href="/terms" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">이용약관</a>
            <a href="mailto:support@llmcost.io" className="text-sm text-slate-400 hover:text-white transition-colors duration-200">지원</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
