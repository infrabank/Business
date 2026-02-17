'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import { useSession } from '@/hooks/useSession'
import { useAppStore } from '@/lib/store'
import { bkend } from '@/lib/bkend'
import Link from 'next/link'
import type { Organization } from '@/types'

export function OrganizationTab() {
  const { currentUser } = useSession()
  const orgId = useAppStore((s) => s.currentOrgId)

  const [orgName, setOrgName] = useState('')
  const [orgSlug, setOrgSlug] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [orgLoading, setOrgLoading] = useState(true)
  const [orgSaving, setOrgSaving] = useState(false)

  useEffect(() => {
    async function loadOrg() {
      if (!orgId) { setOrgLoading(false); return }
      try {
        const orgs = await bkend.get<Organization[]>('/organizations', { params: { id: orgId } })
        if (orgs.length > 0) {
          setOrgName(orgs[0].name || '')
          setOrgSlug(orgs[0].slug || '')
          setBillingEmail(orgs[0].billingEmail || currentUser?.email || '')
        }
      } catch {
        // ignore
      } finally {
        setOrgLoading(false)
      }
    }
    loadOrg()
  }, [orgId, currentUser?.email])

  const handleUpdateOrg = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgId) return
    setOrgSaving(true)
    try {
      await bkend.patch(`/organizations/${orgId}`, { name: orgName, slug: orgSlug, billingEmail })
      toast('success', '조직 정보가 업데이트되었습니다.')
    } catch {
      toast('error', '조직 업데이트에 실패했습니다.')
    } finally {
      setOrgSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">조직 정보</h2></CardHeader>
        <CardContent>
          {orgLoading ? (
            <div className="max-w-md space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 animate-pulse rounded bg-gray-100" />
              ))}
            </div>
          ) : (
            <form className="max-w-md space-y-4" onSubmit={handleUpdateOrg}>
              <Input id="orgName" label="조직 이름" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              <Input id="slug" label="URL 슬러그" value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
              <Input id="billingEmail" label="청구 이메일" type="email" value={billingEmail} onChange={(e) => setBillingEmail(e.target.value)} />
              <Button type="submit" disabled={orgSaving}>
                {orgSaving ? '저장 중...' : '조직 정보 업데이트'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><h2 className="text-lg font-semibold text-gray-900">팀 관리</h2></CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">멤버 초대, 역할 관리, 접근제어를 설정하세요.</p>
          <Link href="/team" className="mt-3 inline-block">
            <Button variant="outline">팀 관리 페이지로 이동</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
