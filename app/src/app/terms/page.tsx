import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1 bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">이용약관</h1>
            <p className="mb-8 text-lg text-gray-600">최종 업데이트: 2026년 2월</p>

            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">1. 약관 동의</h2>
                <p className="leading-relaxed">
                  LLM Cost Manager를 이용함으로써 본 이용약관에 동의하고 이를 준수할 것에 동의합니다.
                  본 약관에 동의하지 않는 경우 서비스를 이용하지 마시기 바랍니다. 당사는 언제든지 본 약관을
                  업데이트할 권리를 보유하며, 서비스의 지속적인 사용은 모든 수정 사항에 대한 동의로 간주됩니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">2. 서비스 설명</h2>
                <p className="leading-relaxed">
                  LLM Cost Manager는 LLM API 서비스에 대한 비용 관리 및 사용량 분석을 제공합니다.
                  여러 프로바이더(OpenAI, Anthropic, Google)의 데이터를 집계하여 AI 지출에 대한 포괄적인
                  인사이트를 제공합니다. 서비스는 명시적 또는 묵시적 보증 없이 "있는 그대로" 제공됩니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">3. 사용자 책임</h2>
                <p className="leading-relaxed">
                  계정 자격 증명 및 API 키의 기밀을 유지할 책임은 사용자에게 있습니다. 가입 시 정확한 정보를
                  제공하고 계정 정보를 최신 상태로 유지하는 데 동의합니다. 불법적인 목적이나 관련 법률 또는
                  규정을 위반하는 방식으로 서비스를 사용해서는 안 됩니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">4. 청구 및 결제</h2>
                <p className="leading-relaxed">
                  유료 구독은 매월 선불로 청구됩니다. 반복적으로 결제 수단에 청구하는 것을 승인합니다.
                  요금은 법에서 요구하는 경우를 제외하고 환불되지 않습니다. 언제든지 구독을 취소할 수 있으며,
                  취소는 현재 청구 기간이 끝날 때 효력이 발생합니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">5. 책임 제한</h2>
                <p className="leading-relaxed">
                  법이 허용하는 최대 범위 내에서 LLM Cost Manager는 직간접적으로 발생한 간접, 우발적, 특별,
                  결과적 또는 징벌적 손해 또는 이익이나 수익의 손실에 대해 책임을 지지 않습니다.
                  당사의 총 책임은 청구 전 12개월 동안 고객님이 지불한 금액을 초과하지 않습니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">6. 종료</h2>
                <p className="leading-relaxed">
                  당사는 본 약관 위반 또는 기타 이유로 언제든지 서비스에 대한 액세스를 일시 중지하거나 종료할
                  권리를 보유합니다. 종료 시 서비스 사용 권한은 즉시 중단되며, 데이터 보관 정책에 따라
                  계정과 데이터를 삭제할 수 있습니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">7. 문의하기</h2>
                <p className="leading-relaxed">
                  본 이용약관에 대해 질문이 있으시면{' '}
                  <a href="mailto:support@llmcost.io" className="text-blue-600 hover:text-blue-800">
                    support@llmcost.io
                  </a>
                  로 문의하시기 바랍니다.
                </p>
              </section>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
