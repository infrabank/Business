import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export function FinalCta() {
  return (
    <section className="bg-gray-900 py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold text-white">
          LLM 호출 비용 과다 지불을 멈추세요
        </h2>
        <p className="mt-4 text-lg text-gray-400">
          기다리는 매 순간이 중복 API 호출과 비싼 모델에 낭비되는 비용입니다. 한 줄만 변경하세요. 절감은 즉시 시작됩니다.
        </p>
        <Link
          href="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-base font-medium text-gray-900 transition-all duration-200 hover:scale-[1.02] hover:bg-gray-100 hover:shadow-lg"
        >
          지금 절감 시작 <ArrowRight className="h-4 w-4" />
        </Link>
        <p className="mt-4 text-sm text-gray-500">
          무료 플랜 제공 &middot; 1줄 설정 &middot; 언제든 취소
        </p>
      </div>
    </section>
  )
}
