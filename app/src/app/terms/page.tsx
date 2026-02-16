import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1 bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">Terms of Service</h1>
            <p className="mb-8 text-lg text-gray-600">Last updated: February 2026</p>

            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">1. Acceptance of Terms</h2>
                <p className="leading-relaxed">
                  By accessing and using LLM Cost Manager, you accept and agree to be bound by these Terms of Service.
                  If you do not agree to these terms, please do not use our service. We reserve the right to update these
                  terms at any time, and continued use of the service constitutes acceptance of any modifications.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">2. Service Description</h2>
                <p className="leading-relaxed">
                  LLM Cost Manager provides cost management and usage analytics for LLM API services. We aggregate data from
                  multiple providers (OpenAI, Anthropic, Google) to give you comprehensive insights into your AI spending.
                  The service is provided "as is" without warranties of any kind, either express or implied.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">3. User Responsibilities</h2>
                <p className="leading-relaxed">
                  You are responsible for maintaining the confidentiality of your account credentials and API keys. You agree
                  to provide accurate information during registration and keep your account information up to date. You must
                  not use the service for any illegal purposes or in violation of any applicable laws or regulations.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">4. Billing and Payments</h2>
                <p className="leading-relaxed">
                  Paid subscriptions are billed monthly in advance. You authorize us to charge your payment method on a recurring
                  basis. Fees are non-refundable except as required by law. You may cancel your subscription at any time, and
                  cancellation will take effect at the end of your current billing period.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">5. Limitation of Liability</h2>
                <p className="leading-relaxed">
                  To the maximum extent permitted by law, LLM Cost Manager shall not be liable for any indirect, incidental,
                  special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly
                  or indirectly. Our total liability shall not exceed the amount paid by you in the twelve months preceding
                  the claim.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">6. Termination</h2>
                <p className="leading-relaxed">
                  We reserve the right to suspend or terminate your access to the service at any time for violations of these
                  terms or for any other reason. Upon termination, your right to use the service will immediately cease, and
                  we may delete your account and data in accordance with our data retention policies.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">7. Contact Us</h2>
                <p className="leading-relaxed">
                  If you have any questions about these Terms of Service, please contact us at{' '}
                  <a href="mailto:support@llmcost.io" className="text-blue-600 hover:text-blue-800">
                    support@llmcost.io
                  </a>
                  .
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
