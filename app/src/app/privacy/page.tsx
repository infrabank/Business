import { NavBar } from '@/components/layout/NavBar'
import { Footer } from '@/components/layout/Footer'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <NavBar />
      <main className="flex-1 bg-gray-50 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl bg-white p-8 shadow-sm">
            <h1 className="mb-4 text-4xl font-bold text-gray-900">Privacy Policy</h1>
            <p className="mb-8 text-lg text-gray-600">Last updated: February 2026</p>

            <div className="space-y-6 text-gray-700">
              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">1. Information We Collect</h2>
                <p className="leading-relaxed">
                  We collect information you provide directly to us, including your name, email address, and organization details
                  when you create an account. We also collect usage data to improve our services and provide you with better insights
                  into your LLM API usage and costs.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">2. How We Use Your Information</h2>
                <p className="leading-relaxed">
                  Your information is used to provide and improve our cost management services, communicate with you about your account,
                  and ensure the security and functionality of our platform. We aggregate and anonymize data for analytics and service
                  improvements, but never share your personal information with third parties for marketing purposes.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">3. Data Security</h2>
                <p className="leading-relaxed">
                  We implement industry-standard security measures to protect your data. Your API keys are encrypted at rest and in transit,
                  and we follow best practices for authentication, authorization, and data access controls. We regularly audit our security
                  practices to ensure your information remains protected.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">4. Your Rights</h2>
                <p className="leading-relaxed">
                  You have the right to access, update, or delete your personal information at any time through your account settings.
                  You may also request a copy of your data or ask us to stop processing your information. To exercise these rights,
                  please contact us at support@llmcost.io.
                </p>
              </section>

              <section>
                <h2 className="mb-3 text-2xl font-semibold text-gray-900">5. Contact Us</h2>
                <p className="leading-relaxed">
                  If you have any questions about this Privacy Policy or our data practices, please contact us at{' '}
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
