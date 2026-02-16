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
  Shield,
  Repeat,
  Zap,
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
    icon: TrendingDown,
    title: 'Automatic Cost Reduction',
    description:
      'Our proxy automatically caches identical requests and routes simple queries to cheaper models. Most teams see 30-60% savings from day one.',
  },
  {
    icon: Activity,
    title: 'Real-time Per-Request Tracking',
    description:
      'See the exact cost of every single API call as it happens. Know which requests are expensive and which ones got optimized — in real time.',
  },
  {
    icon: BarChart3,
    title: 'Before vs After Dashboard',
    description:
      'See exactly what you would have paid without LCM versus what you actually paid. A clear dollar amount showing your ROI every single day.',
  },
  {
    icon: Repeat,
    title: 'Smart Response Caching',
    description:
      'Identical prompts get instant cached responses instead of hitting the API again. Zero latency, zero cost — automatic for every request.',
  },
  {
    icon: Lightbulb,
    title: 'Intelligent Model Routing',
    description:
      'Simple questions automatically route to GPT-4o-mini instead of GPT-4o. Same quality answers, 90% cheaper. Works across all providers.',
  },
  {
    icon: Shield,
    title: 'Budget Guardrails',
    description:
      'Set hard spending limits per API key. When the budget hits the cap, requests get blocked — no more surprise bills at the end of the month.',
  },
]

export const steps: Step[] = [
  {
    number: 1,
    title: 'Swap Your API Endpoint',
    description:
      'Replace api.openai.com with our proxy URL. One line change — your existing code works exactly the same.',
    icon: Key,
  },
  {
    number: 2,
    title: 'We Optimize Every Request',
    description:
      'Caching, smart routing, budget enforcement — all happen automatically. You write zero extra code.',
    icon: Zap,
  },
  {
    number: 3,
    title: 'Watch Your Bill Drop',
    description:
      'See real-time savings in your dashboard. Most teams save 30-60% in the first week. The service pays for itself.',
    icon: TrendingDown,
  },
]

export const testimonials: Testimonial[] = [
  {
    quote:
      'We swapped one URL and our OpenAI bill dropped from $8,200 to $3,400 in the first month. The response caching alone saved us $2,800 on duplicate embeddings calls.',
    name: 'James Kim',
    role: 'CTO',
    company: 'Plio AI',
    initials: 'JK',
  },
  {
    quote:
      'I was mass-calling GPT-4o for simple classification tasks. LCM auto-routed them to GPT-4o-mini and I literally didn\'t notice a quality difference. 85% cost reduction on those calls.',
    name: 'Rachel Torres',
    role: 'ML Engineer',
    company: 'Stackline',
    initials: 'RT',
  },
  {
    quote:
      'The before vs after dashboard is what sold my CFO. She could see exactly how much we were saving — $4,100 last month. Budget approved in 5 minutes.',
    name: 'David Park',
    role: 'VP of Engineering',
    company: 'Convexa',
    initials: 'DP',
  },
]

export const stats: Stat[] = [
  { value: '42%', label: 'Average cost reduction' },
  { value: '$0', label: 'Cost of cached responses' },
  { value: '1 line', label: 'Code change to start' },
  { value: '<2 min', label: 'Setup time' },
]

export const faqItems: FaqItem[] = [
  {
    question: 'How much will I actually save?',
    answer:
      'It depends on your usage pattern. Teams with repetitive prompts (embeddings, classification, templates) typically save 40-60% from caching alone. Smart model routing adds another 20-30% on top of that. Your dashboard shows exact savings in real-time.',
  },
  {
    question: 'Does routing to cheaper models affect quality?',
    answer:
      'We only route simple, short requests (under 500 tokens) to cheaper alternatives. Complex prompts always use your original model. In practice, most users report zero noticeable quality difference on routed requests.',
  },
  {
    question: 'How does the proxy work with my existing code?',
    answer:
      'You change the base URL in your API client from api.openai.com to our proxy URL and use your LCM proxy key instead of your real API key. That\'s it — one line change. Your real API key stays encrypted on our servers.',
  },
  {
    question: 'Is my API key secure?',
    answer:
      'Your real API key is encrypted with AES-256-GCM before storage. We generate a proxy key (lmc_xxx) that you use instead. Even our team cannot see your original key. The proxy key can be revoked instantly.',
  },
  {
    question: 'What providers do you support?',
    answer:
      'OpenAI, Anthropic (Claude), and Google AI (Gemini). All three support caching, smart routing, and real-time cost tracking through our proxy.',
  },
  {
    question: 'What if I hit my budget limit?',
    answer:
      'When a proxy key reaches its budget limit, further requests return a 429 status code. Your application handles this like any rate limit. No surprise charges — ever.',
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
