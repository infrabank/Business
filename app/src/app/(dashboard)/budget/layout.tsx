import type { Metadata } from 'next'

export const metadata: Metadata = { title: '예산' }

export default function BudgetPageLayout({ children }: { children: React.ReactNode }) {
  return children
}
