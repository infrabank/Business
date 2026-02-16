export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} LLM Cost Manager. 모든 권리 보유.
          </p>
          <div className="flex gap-6">
            <a href="/privacy" className="text-sm text-gray-400 hover:text-gray-600">개인정보 처리방침</a>
            <a href="/terms" className="text-sm text-gray-400 hover:text-gray-600">이용약관</a>
            <a href="mailto:support@llmcost.io" className="text-sm text-gray-400 hover:text-gray-600">지원</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
