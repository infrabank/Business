import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1 bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">개인정보 처리방침</h1>
            <p className="mb-8 text-lg text-gray-600">최종 업데이트: 2026년 2월</p>

            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">1. 수집하는 정보</h2>
                <p className="leading-relaxed">
                  계정 생성 시 이름, 이메일 주소, 조직 정보 등 고객님이 직접 제공하는 정보를 수집합니다.
                  또한 서비스를 개선하고 LLM API 사용량 및 비용에 대한 더 나은 인사이트를 제공하기 위해
                  사용 데이터를 수집합니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">2. 정보 사용 방법</h2>
                <p className="leading-relaxed">
                  고객님의 정보는 비용 관리 서비스 제공 및 개선, 계정 관련 커뮤니케이션, 플랫폼의 보안 및
                  기능 보장을 위해 사용됩니다. 분석 및 서비스 개선을 위해 데이터를 집계하고 익명화하지만,
                  마케팅 목적으로 개인정보를 제3자와 공유하지 않습니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">3. 데이터 보안</h2>
                <p className="leading-relaxed">
                  고객님의 데이터를 보호하기 위해 업계 표준 보안 조치를 시행합니다. API 키는 저장 및 전송 시
                  암호화되며, 인증, 권한 부여, 데이터 액세스 제어를 위한 모범 사례를 따릅니다.
                  정기적으로 보안 관행을 감사하여 고객님의 정보가 보호되도록 합니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">4. 고객님의 권리</h2>
                <p className="leading-relaxed">
                  계정 설정을 통해 언제든지 개인정보에 액세스하거나 업데이트 또는 삭제할 권리가 있습니다.
                  데이터 사본을 요청하거나 정보 처리 중단을 요청할 수도 있습니다. 이러한 권리를 행사하려면
                  support@llmcost.io로 문의하시기 바랍니다.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">5. 문의하기</h2>
                <p className="leading-relaxed">
                  개인정보 처리방침 또는 데이터 처리 관행에 대해 질문이 있으시면{' '}
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
