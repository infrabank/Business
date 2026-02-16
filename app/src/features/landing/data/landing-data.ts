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
    title: '자동 비용 절감',
    description:
      '프록시가 동일한 요청을 자동으로 캐싱하고 AI를 사용해 단순 쿼리를 저렴한 모델로 라우팅합니다. 대부분의 팀이 첫날부터 30-60% 절감을 경험합니다.',
  },
  {
    icon: Activity,
    title: '실시간 요청별 추적',
    description:
      '모든 API 호출의 정확한 비용을 실시간으로 확인하세요. 어떤 요청이 비싸고 어떤 요청이 최적화되었는지 실시간으로 파악할 수 있습니다.',
  },
  {
    icon: BarChart3,
    title: '전후 비교 대시보드',
    description:
      'LCM 없이 지불했을 금액과 실제 지불한 금액을 정확히 비교하세요. 매일 ROI를 명확한 금액으로 보여줍니다.',
  },
  {
    icon: Repeat,
    title: '스마트 응답 캐싱',
    description:
      '동일한 프롬프트는 API를 다시 호출하지 않고 즉시 캐시된 응답을 받습니다. 지연 시간 제로, 비용 제로 — 모든 요청에 자동 적용.',
  },
  {
    icon: Lightbulb,
    title: '지능형 모델 라우팅',
    description:
      'AI 기반 의도 분류기가 각 요청을 이해합니다. 코딩과 분석은 프리미엄 모델에서 처리. 단순 Q&A와 인사는 저렴한 대안으로 자동 라우팅 — 요청당 최대 94% 절감.',
  },
  {
    icon: Shield,
    title: '예산 가드레일',
    description:
      'API 키별로 엄격한 지출 한도를 설정하세요. 예산이 상한선에 도달하면 요청이 차단됩니다 — 월말 예상치 못한 청구서는 이제 그만.',
  },
]

export const steps: Step[] = [
  {
    number: 1,
    title: 'API 엔드포인트 변경',
    description:
      'api.openai.com을 프록시 URL로 교체하세요. 한 줄만 변경 — 기존 코드가 정확히 동일하게 작동합니다.',
    icon: Key,
  },
  {
    number: 2,
    title: '모든 요청을 최적화합니다',
    description:
      'AI 의도 분류, 응답 캐싱, 예산 적용 — 모두 자동으로 처리됩니다. 코딩은 GPT-4o에서, 단순 Q&A는 GPT-4o-mini로 라우팅. 추가 코드 불필요.',
    icon: Zap,
  },
  {
    number: 3,
    title: '청구서가 줄어드는 것을 확인',
    description:
      '대시보드에서 실시간 절감액을 확인하세요. 대부분의 팀이 첫 주에 30-60%를 절감합니다. 서비스 비용은 스스로 충당됩니다.',
    icon: TrendingDown,
  },
]

export const testimonials: Testimonial[] = [
  {
    quote:
      'URL 하나만 바꿨는데 OpenAI 청구서가 첫 달에 $8,200에서 $3,400으로 떨어졌습니다. 응답 캐싱만으로도 중복 임베딩 호출에서 $2,800을 절감했습니다.',
    name: 'James Kim',
    role: 'CTO',
    company: 'Plio AI',
    initials: 'JK',
  },
  {
    quote:
      '단순 분류 작업에 GPT-4o를 대량으로 호출하고 있었습니다. LCM이 자동으로 GPT-4o-mini로 라우팅했는데 품질 차이를 전혀 느끼지 못했습니다. 해당 호출에서 85% 비용 절감.',
    name: 'Rachel Torres',
    role: 'ML Engineer',
    company: 'Stackline',
    initials: 'RT',
  },
  {
    quote:
      '전후 비교 대시보드가 CFO를 설득했습니다. 정확히 얼마나 절감하고 있는지 볼 수 있었죠 — 지난달 $4,100. 5분 만에 예산 승인.',
    name: 'David Park',
    role: 'VP of Engineering',
    company: 'Convexa',
    initials: 'DP',
  },
]

export const stats: Stat[] = [
  { value: '42%', label: '평균 비용 절감률' },
  { value: '$0', label: '캐시된 응답 비용' },
  { value: '1줄', label: '시작을 위한 코드 변경' },
  { value: '<2분', label: '설정 시간' },
]

export const faqItems: FaqItem[] = [
  {
    question: '요금제는 어떻게 되나요?',
    answer:
      '순수 커미션 모델을 사용합니다 — 월별 고정 요금 없음. 캐싱과 스마트 라우팅으로 절감해드린 금액의 20%만 받습니다. 절감액이 없으면 비용도 없습니다. 대시보드에서 정확한 절감액과 커미션을 실시간으로 확인할 수 있습니다.',
  },
  {
    question: '실제로 얼마나 절감할 수 있나요?',
    answer:
      '사용 패턴에 따라 다릅니다. 반복적인 프롬프트(임베딩, 분류, 템플릿)를 사용하는 팀은 캐싱만으로도 일반적으로 40-60%를 절감합니다. AI 기반 의도 라우팅으로 추가로 20-30%가 더해집니다 — 분류기가 단순 쿼리를 감지하여 저렴한 모델로 자동 라우팅합니다. 대시보드에서 정확한 절감액을 실시간으로 확인할 수 있습니다.',
  },
  {
    question: '저렴한 모델로 라우팅하면 품질에 영향을 주나요?',
    answer:
      'AI 의도 분류기가 각 요청을 분석하여 무엇을 요청하는지 이해합니다. 코딩, 분석, 창작 작문, 추론은 항상 선택한 프리미엄 모델을 사용합니다. 단순 질문, 인사, 번역만 저렴한 대안으로 라우팅됩니다 — 품질이 중요한 작업은 절대 타협하지 않습니다.',
  },
  {
    question: '프록시가 기존 코드와 어떻게 작동하나요?',
    answer:
      'API 클라이언트의 기본 URL을 api.openai.com에서 프록시 URL로 변경하고 실제 API 키 대신 LCM 프록시 키를 사용하면 됩니다. 그게 전부입니다 — 한 줄 변경. 실제 API 키는 서버에서 암호화되어 보관됩니다.',
  },
  {
    question: '내 API 키는 안전한가요?',
    answer:
      '실제 API 키는 저장 전에 AES-256-GCM으로 암호화됩니다. 대신 사용할 프록시 키(lmc_xxx)를 생성합니다. 저희 팀도 원래 키를 볼 수 없습니다. 프록시 키는 즉시 취소할 수 있습니다.',
  },
  {
    question: '어떤 프로바이더를 지원하나요?',
    answer:
      'OpenAI, Anthropic (Claude), Google AI (Gemini)를 지원합니다. 세 가지 모두 프록시를 통한 캐싱, 스마트 라우팅, 실시간 비용 추적을 지원합니다.',
  },
  {
    question: '예산 한도에 도달하면 어떻게 되나요?',
    answer:
      '프록시 키가 예산 한도에 도달하면 이후 요청은 429 상태 코드를 반환합니다. 애플리케이션이 일반적인 속도 제한처럼 처리합니다. 예상치 못한 청구는 절대 없습니다.',
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
