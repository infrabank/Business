import {
  BarChart3,
  Bell,
  Lightbulb,
  Activity,
  Users,
  FileText,
  Key,
  Eye,
  TrendingDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// --- Types ---

export interface Feature {
  icon: LucideIcon
  title: string
  description: string
}

export interface Step {
  number: number
  title: string
  description: string
  icon: LucideIcon
}

export interface Testimonial {
  quote: string
  name: string
  role: string
  company: string
  initials: string
}

export interface Stat {
  value: string
  label: string
}

export interface FaqItem {
  question: string
  answer: string
}

export interface CompanyLogo {
  name: string
}

// --- Data ---

export const features: Feature[] = [
  {
    icon: BarChart3,
    title: 'Unified Dashboard',
    description:
      'See all your LLM spending across OpenAI, Anthropic, and Google in one view. Track costs by project, team, or model.',
  },
  {
    icon: Bell,
    title: 'Budget Alerts',
    description:
      'Set monthly budgets and get instant notifications before you exceed them. Never face surprise bills again.',
  },
  {
    icon: Lightbulb,
    title: 'Cost Optimization',
    description:
      'AI-powered recommendations to reduce spending. Find cheaper models, batch opportunities, and unused API keys.',
  },
  {
    icon: Activity,
    title: 'Real-time Tracking',
    description:
      'Monitor your API usage as it happens. See per-request costs, token counts, and response latencies live.',
  },
  {
    icon: Users,
    title: 'Team Management',
    description:
      'Allocate budgets by team or project. Track who spends what and enforce per-team limits.',
  },
  {
    icon: FileText,
    title: 'Detailed Reports',
    description:
      'Export comprehensive reports by provider, model, or date range. CSV and PDF export for stakeholder reviews.',
  },
]

export const steps: Step[] = [
  {
    number: 1,
    title: 'Connect',
    description:
      'Add your API keys from OpenAI, Anthropic, or Google. Setup takes less than 2 minutes.',
    icon: Key,
  },
  {
    number: 2,
    title: 'Monitor',
    description:
      'Start tracking costs in real-time. See spending breakdowns by provider, model, and project.',
    icon: Eye,
  },
  {
    number: 3,
    title: 'Optimize',
    description:
      'Get AI-powered recommendations to cut costs by up to 50%. Switch models, batch requests, and eliminate waste.',
    icon: TrendingDown,
  },
]

export const testimonials: Testimonial[] = [
  {
    quote:
      'We were spending $15K/month on LLM APIs without knowing where the money went. LLM Cost Manager helped us cut that by 40% in the first month.',
    name: 'Sarah Chen',
    role: 'CTO',
    company: 'DataFlow AI',
    initials: 'SC',
  },
  {
    quote:
      'The budget alerts alone saved us from a $5K overage. Now our team can experiment freely knowing we have guardrails in place.',
    name: 'Marcus Rivera',
    role: 'Engineering Lead',
    company: 'NexGen Labs',
    initials: 'MR',
  },
  {
    quote:
      'Switching from GPT-4 to Claude where appropriate saved us 30% on our monthly bill. The optimization tips were spot on.',
    name: 'Emily Park',
    role: 'AI Product Manager',
    company: 'BuildSmart',
    initials: 'EP',
  },
]

export const stats: Stat[] = [
  { value: '$2M+', label: 'Saved by our users' },
  { value: '10K+', label: 'API calls tracked daily' },
  { value: '50%', label: 'Average cost reduction' },
  { value: '3', label: 'Providers supported' },
]

export const faqItems: FaqItem[] = [
  {
    question: 'What LLM providers do you support?',
    answer:
      'We currently support OpenAI, Anthropic (Claude), and Google AI (Gemini). More providers are on our roadmap.',
  },
  {
    question: 'Is my API key secure?',
    answer:
      'Yes. API keys are encrypted with AES-256 before storage and are never exposed in the dashboard. We use industry-standard security practices.',
  },
  {
    question: 'Can I try before buying?',
    answer:
      'Absolutely. Our Free plan lets you connect 1 provider and track 7 days of history at no cost. No credit card required.',
  },
  {
    question: 'How does billing work?',
    answer:
      'We offer monthly subscriptions starting at $29/month. You can upgrade, downgrade, or cancel anytime. All plans include a 14-day free trial.',
  },
  {
    question: 'What happens if I exceed my budget?',
    answer:
      "You'll receive alerts at 50%, 80%, and 100% of your budget. We never cut off your API access — we just keep you informed so you can take action.",
  },
]

export const companyLogos: CompanyLogo[] = [
  { name: 'TechCorp' },
  { name: 'AI Labs' },
  { name: 'DataFlow' },
  { name: 'CloudScale' },
  { name: 'NexGen' },
  { name: 'BuildSmart' },
]
