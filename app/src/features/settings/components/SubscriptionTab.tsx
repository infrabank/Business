'use client'

import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { useAppStore } from '@/lib/store'
import { useBilling } from '@/features/billing/hooks/useBilling'
import { CreditCard, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'danger' | 'info'> = {
  active: 'success',
  past_due: 'warning',
  canceled: 'danger',
  unpaid: 'danger',
  incomplete: 'warning',
}

const STATUS_LABEL: Record<string, string> = {
  active: '활성',
  past_due: '결제 지연',
  canceled: '해지됨',
  unpaid: '미결제',
  incomplete: '미완료',
}

export function SubscriptionTab() {
  const currentUser = useAppStore((s) => s.currentUser)
  const { subscription, invoices, commission, isLoading, openPortal } = useBilling()

  const plan = subscription?.plan || currentUser?.plan || 'free'
  const status = subscription?.status || 'active'

  const nextBillingDate = subscription?.currentPeriodEnd
    ? new Date(subscription.currentPeriodEnd).toLocaleDateString('en-US', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : null

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">현재 플랜</h2></CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-3">
              <div className="h-6 w-48 rounded bg-gray-200 dark:bg-slate-700" />
              <div className="h-4 w-64 rounded bg-gray-200 dark:bg-slate-700" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Badge variant="info">{plan.charAt(0).toUpperCase() + plan.slice(1)} 플랜</Badge>
                <Badge variant={STATUS_VARIANT[status] || 'info'}>
                  {STATUS_LABEL[status] || status}
                </Badge>
                {plan === 'growth' && <span className="text-sm text-gray-600 dark:text-slate-400">절감액의 20%</span>}
              </div>

              {status === 'past_due' && (
                <p className="text-sm text-amber-600 dark:text-amber-500">
                  결제에 실패했습니다. 서비스 중단을 방지하려면 결제 수단을 업데이트해주세요.
                </p>
              )}

              {subscription?.cancelAtPeriodEnd && (
                <p className="text-sm text-red-600 dark:text-red-500">
                  현재 기간 종료 시 구독이 해지됩니다 ({nextBillingDate})
                </p>
              )}

              {nextBillingDate && !subscription?.cancelAtPeriodEnd && plan !== 'free' && (
                <p className="text-sm text-gray-500 dark:text-slate-400">다음 결제일: {nextBillingDate}</p>
              )}

              <div className="flex gap-3">
                {plan !== 'free' && subscription?.stripeCustomerId && (
                  <Button variant="outline" onClick={openPortal}>
                    <CreditCard className="mr-2 h-4 w-4" />
                    결제 관리
                  </Button>
                )}
                <Link href="/pricing">
                  <Button variant={plan === 'free' ? 'primary' : 'outline'}>
                    {plan === 'free' ? '플랜 업그레이드' : '플랜 변경'}
                  </Button>
                </Link>
              </div>

              {invoices.length > 0 && (
                <div className="mt-6">
                  <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-slate-300">최근 청구서</h3>
                  <div className="divide-y rounded-lg border dark:border-slate-700 dark:divide-slate-700">
                    {invoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-gray-600 dark:text-slate-400">
                            {new Date(inv.createdAt).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric',
                            })}
                          </span>
                          <span className="text-sm font-medium text-gray-900 dark:text-slate-100">
                            ${inv.amount.toFixed(2)}
                          </span>
                          <Badge variant={inv.status === 'paid' ? 'success' : 'warning'}>
                            {inv.status}
                          </Badge>
                        </div>
                        {inv.invoiceUrl && (
                          <a
                            href={inv.invoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-indigo-400 hover:text-blue-800 dark:hover:text-indigo-300"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {plan === 'growth' && commission && (
        <Card>
          <CardHeader><h2 className="text-lg font-semibold text-gray-900 dark:text-slate-100">이번 달 수수료</h2></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-gray-50 dark:bg-slate-800/50 p-4 text-center">
                <p className="text-xs font-medium text-gray-500 dark:text-slate-400">요청 수</p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-slate-100">{commission.requestCount.toLocaleString()}</p>
              </div>
              <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-4 text-center">
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">절감액</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">${commission.currentMonthSavings.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950/30 p-4 text-center">
                <p className="text-xs font-medium text-blue-600 dark:text-blue-400">수수료 (20%)</p>
                <p className="mt-1 text-2xl font-bold text-blue-600 dark:text-blue-400">${commission.commissionAmount.toFixed(2)}</p>
              </div>
              <div className="rounded-lg bg-emerald-100 dark:bg-emerald-950/50 p-4 text-center">
                <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300">순 절감액</p>
                <p className="mt-1 text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                  ${(commission.currentMonthSavings - commission.commissionAmount).toFixed(2)}
                </p>
              </div>
            </div>
            <p className="mt-3 text-xs text-gray-400 dark:text-slate-400">
              기간: {new Date(commission.periodStart).toLocaleDateString('ko-KR')} — {new Date(commission.periodEnd).toLocaleDateString('ko-KR')}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
