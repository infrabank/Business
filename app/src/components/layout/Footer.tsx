export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} LLM Cost Manager. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Privacy</a>
            <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Terms</a>
            <a href="#" className="text-sm text-gray-400 hover:text-gray-600">Support</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
