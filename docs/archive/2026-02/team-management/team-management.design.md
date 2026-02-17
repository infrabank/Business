# Team Management - Design Document

> Feature: team-management
> Phase: Design
> Created: 2026-02-17
> Plan Reference: `docs/01-plan/features/team-management.plan.md`

## 1. Implementation Overview

5 phases, 8 features. This document specifies the exact files, APIs, types, and components for each.

```
Phase 1 (Data Layer):     F1-types → F1-service → F2-list-api
Phase 2 (CRUD APIs):      F3-role → F4-remove → F5-invitation
Phase 3 (RBAC):           F7-rbac-util → F7-api-guards
Phase 4 (UI):             F6-team-page → F6-invite-modal → F6-banner
Phase 5 (Settings Fix):   F8-settings-backend
```

---

## 2. Phase 1: Data Layer

### F1: Member Invite & Data Types

**Goal**: Extend existing types, create member service with bkend.ai Supabase integration.

#### 2.1.1 Extend `src/types/organization.ts`

Current file has `Organization`, `Member`, `MemberRole`. Add `Invitation`:

```typescript
// Add to existing src/types/organization.ts

export interface Invitation {
  id: string
  orgId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedBy: string
  createdAt: string
  expiresAt: string
}

export interface MemberWithUser extends Member {
  user: { name: string; email: string; avatarUrl?: string }
}
```

No changes to existing `Organization`, `Member`, `MemberRole` types.

#### 2.1.2 Create `src/services/member.service.ts`

Central business logic for all member operations. All DB access via `bkend` client.

```typescript
// src/services/member.service.ts

import { bkend } from '@/lib/bkend'
import { checkMemberLimit, isFeatureAvailable } from '@/lib/plan-limits'
import type { Member, MemberRole, Invitation, MemberWithUser, Organization } from '@/types/organization'
import type { User, UserPlan } from '@/types/user'

// ─── Query helpers ──────────────────────────────────────────

export async function getOrgMembers(orgId: string): Promise<MemberWithUser[]> {
  const members = await bkend.get<Member[]>('/members', { params: { orgId } })
  // Enrich with user data
  const enriched: MemberWithUser[] = []
  for (const m of members) {
    try {
      const users = await bkend.get<User[]>('/users', { params: { id: m.userId } })
      enriched.push({
        ...m,
        user: users.length > 0
          ? { name: users[0].name, email: users[0].email, avatarUrl: users[0].avatarUrl }
          : { name: 'Unknown', email: '' },
      })
    } catch {
      enriched.push({ ...m, user: { name: 'Unknown', email: '' } })
    }
  }
  return enriched
}

export async function getMemberByUserId(orgId: string, userId: string): Promise<Member | null> {
  const members = await bkend.get<Member[]>('/members', {
    params: { orgId, userId },
  })
  return members.length > 0 ? members[0] : null
}

export async function getMemberRole(orgId: string, userId: string): Promise<MemberRole | null> {
  const member = await getMemberByUserId(orgId, userId)
  return member?.role ?? null
}

// ─── Invite ─────────────────────────────────────────────────

export async function inviteMember(
  orgId: string,
  email: string,
  role: MemberRole,
  invitedBy: string,
  plan: UserPlan
): Promise<Invitation> {
  // 1. Check feature gate
  if (!isFeatureAvailable(plan, 'team')) {
    throw new Error('PLAN_REQUIRED')
  }

  // 2. Check member limit
  const currentMembers = await bkend.get<Member[]>('/members', { params: { orgId } })
  const limitCheck = checkMemberLimit(plan, currentMembers.length)
  if (!limitCheck.allowed) {
    throw new Error('MEMBER_LIMIT_REACHED')
  }

  // 3. Check duplicate invitation
  const existing = await bkend.get<Invitation[]>('/invitations', {
    params: { orgId, email, status: 'pending' },
  })
  if (existing.length > 0) {
    throw new Error('ALREADY_INVITED')
  }

  // 4. Check if already a member
  const users = await bkend.get<User[]>('/users', { params: { email } })
  if (users.length > 0) {
    const existingMember = await getMemberByUserId(orgId, users[0].id)
    if (existingMember) {
      throw new Error('ALREADY_MEMBER')
    }
  }

  // 5. Create invitation (expires in 7 days)
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  return bkend.post<Invitation>('/invitations', {
    orgId,
    email,
    role,
    status: 'pending',
    invitedBy,
    expiresAt,
  })
}

// ─── Invitation management ──────────────────────────────────

export async function getOrgInvitations(orgId: string): Promise<Invitation[]> {
  return bkend.get<Invitation[]>('/invitations', {
    params: { orgId, status: 'pending' },
  })
}

export async function getPendingInvitesForUser(email: string): Promise<(Invitation & { orgName?: string })[]> {
  const invitations = await bkend.get<Invitation[]>('/invitations', {
    params: { email, status: 'pending' },
  })
  // Enrich with org name
  const enriched = []
  for (const inv of invitations) {
    try {
      const orgs = await bkend.get<Organization[]>('/organizations', { params: { id: inv.orgId } })
      enriched.push({ ...inv, orgName: orgs[0]?.name })
    } catch {
      enriched.push({ ...inv, orgName: undefined })
    }
  }
  return enriched
}

export async function acceptInvitation(invitationId: string, userId: string): Promise<Member> {
  const invitation = await bkend.get<Invitation>(`/invitations/${invitationId}`)

  if (invitation.status !== 'pending') {
    throw new Error('INVITATION_NOT_PENDING')
  }
  if (new Date(invitation.expiresAt) < new Date()) {
    await bkend.patch(`/invitations/${invitationId}`, { status: 'expired' })
    throw new Error('INVITATION_EXPIRED')
  }

  // Create member record
  const member = await bkend.post<Member>('/members', {
    orgId: invitation.orgId,
    userId,
    role: invitation.role,
  })

  // Mark invitation as accepted
  await bkend.patch(`/invitations/${invitationId}`, { status: 'accepted' })

  return member
}

export async function declineInvitation(invitationId: string): Promise<void> {
  const invitation = await bkend.get<Invitation>(`/invitations/${invitationId}`)
  if (invitation.status !== 'pending') {
    throw new Error('INVITATION_NOT_PENDING')
  }
  await bkend.patch(`/invitations/${invitationId}`, { status: 'declined' })
}

export async function cancelInvitation(invitationId: string, orgId: string): Promise<void> {
  const invitation = await bkend.get<Invitation>(`/invitations/${invitationId}`)
  if (invitation.orgId !== orgId) {
    throw new Error('FORBIDDEN')
  }
  await bkend.delete(`/invitations/${invitationId}`)
}

// ─── Role management ────────────────────────────────────────

export async function updateMemberRole(
  memberId: string,
  orgId: string,
  newRole: MemberRole,
  actorRole: MemberRole
): Promise<Member> {
  // Only owner can promote to admin
  if (newRole === 'admin' && actorRole !== 'owner') {
    throw new Error('FORBIDDEN')
  }
  // Cannot change owner role via this function
  if (newRole === 'owner') {
    throw new Error('USE_TRANSFER_OWNERSHIP')
  }

  const member = await bkend.get<Member>(`/members/${memberId}`)
  if (member.orgId !== orgId) throw new Error('FORBIDDEN')
  if (member.role === 'owner') throw new Error('CANNOT_CHANGE_OWNER')

  return bkend.patch<Member>(`/members/${memberId}`, { role: newRole })
}

export async function transferOwnership(
  orgId: string,
  currentOwnerId: string,
  newOwnerId: string
): Promise<void> {
  const currentOwner = await getMemberByUserId(orgId, currentOwnerId)
  if (!currentOwner || currentOwner.role !== 'owner') {
    throw new Error('NOT_OWNER')
  }

  const newOwner = await getMemberByUserId(orgId, newOwnerId)
  if (!newOwner) throw new Error('MEMBER_NOT_FOUND')

  // Swap roles
  await bkend.patch(`/members/${currentOwner.id}`, { role: 'admin' })
  await bkend.patch(`/members/${newOwner.id}`, { role: 'owner' })
  await bkend.patch(`/organizations/${orgId}`, { ownerId: newOwnerId })
}

// ─── Remove / Leave ─────────────────────────────────────────

export async function removeMember(memberId: string, orgId: string): Promise<void> {
  const member = await bkend.get<Member>(`/members/${memberId}`)
  if (member.orgId !== orgId) throw new Error('FORBIDDEN')
  if (member.role === 'owner') throw new Error('CANNOT_REMOVE_OWNER')
  await bkend.delete(`/members/${memberId}`)
}

export async function leaveOrg(orgId: string, userId: string): Promise<void> {
  const member = await getMemberByUserId(orgId, userId)
  if (!member) throw new Error('NOT_A_MEMBER')
  if (member.role === 'owner') throw new Error('OWNER_CANNOT_LEAVE')
  await bkend.delete(`/members/${member.id}`)
}
```

### F2: Member List API

#### 2.2.1 Create `src/app/api/members/route.ts`

```typescript
// GET /api/members — list org members
import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { getOrgMembers } from '@/services/member.service'
import type { Organization } from '@/types/organization'

export async function GET() {
  try {
    const authUser = await getMeServer()
    const orgs = await bkend.get<Organization[]>('/organizations', {
      params: { ownerId: authUser.id },
    })
    if (orgs.length === 0) {
      return NextResponse.json([])
    }
    const members = await getOrgMembers(orgs[0].id)
    return NextResponse.json(members)
  } catch (error) {
    if (error instanceof Error && error.message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
```

**Pattern**: Same auth pattern as `api/billing/status/route.ts` — `getMeServer()` → find org → query.

**Note**: For members who are not owners, we need to find their org via the `members` table instead. The GET handler should also check membership:

```typescript
// Extended org-finding logic (inside GET handler):
let orgId: string | null = null
// Try as owner first
const ownedOrgs = await bkend.get<Organization[]>('/organizations', {
  params: { ownerId: authUser.id },
})
if (ownedOrgs.length > 0) {
  orgId = ownedOrgs[0].id
} else {
  // Find org as member
  const memberships = await bkend.get<Member[]>('/members', {
    params: { userId: authUser.id },
  })
  if (memberships.length > 0) {
    orgId = memberships[0].orgId
  }
}
```

---

## 3. Phase 2: CRUD APIs

### F1 (continued): Invite API

#### 3.1.1 Create `src/app/api/members/invite/route.ts`

```typescript
// POST /api/members/invite
import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { bkend } from '@/lib/bkend'
import { inviteMember, getMemberRole } from '@/services/member.service'
import type { Organization } from '@/types/organization'
import type { User } from '@/types/user'

export async function POST(request: NextRequest) {
  try {
    const authUser = await getMeServer()
    const { email, role } = await request.json()

    if (!email || !role) {
      return NextResponse.json({ error: 'email and role required' }, { status: 400 })
    }
    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Find user's org + verify admin+ role
    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get user plan for limit check
    const user = await bkend.get<User>(`/users/${authUser.id}`)
    const invitation = await inviteMember(orgId, email, role, authUser.id, user.plan || 'free')
    return NextResponse.json(invitation, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const statusMap: Record<string, number> = {
      PLAN_REQUIRED: 403,
      MEMBER_LIMIT_REACHED: 403,
      ALREADY_INVITED: 409,
      ALREADY_MEMBER: 409,
      'Not authenticated': 401,
    }
    return NextResponse.json({ error: msg }, { status: statusMap[msg] || 500 })
  }
}
```

#### 3.1.2 Shared `resolveOrgAndRole` Helper

Create `src/services/member.service.ts` export (add to existing service):

```typescript
export async function resolveOrgAndRole(userId: string): Promise<{
  orgId: string | null
  memberRole: MemberRole | null
}> {
  // Owner check first
  const ownedOrgs = await bkend.get<Organization[]>('/organizations', {
    params: { ownerId: userId },
  })
  if (ownedOrgs.length > 0) {
    return { orgId: ownedOrgs[0].id, memberRole: 'owner' }
  }
  // Member check
  const memberships = await bkend.get<Member[]>('/members', {
    params: { userId },
  })
  if (memberships.length > 0) {
    return { orgId: memberships[0].orgId, memberRole: memberships[0].role }
  }
  return { orgId: null, memberRole: null }
}
```

### F3: Role Change API

#### 3.2.1 Create `src/app/api/members/[id]/route.ts`

```typescript
// PATCH /api/members/:id — change role
// DELETE /api/members/:id — remove member
import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, updateMemberRole, removeMember } from '@/services/member.service'

interface RouteParams { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authUser = await getMeServer()
    const { role } = await request.json()

    if (!role || !['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updated = await updateMemberRole(id, orgId, role, memberRole)
    return NextResponse.json(updated)
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = ['FORBIDDEN', 'CANNOT_CHANGE_OWNER', 'USE_TRANSFER_OWNERSHIP'].includes(msg) ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authUser = await getMeServer()

    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await removeMember(id, orgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = ['FORBIDDEN', 'CANNOT_REMOVE_OWNER'].includes(msg) ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
```

### F4: Leave Org API

#### 3.3.1 Create `src/app/api/members/leave/route.ts`

```typescript
// POST /api/members/leave — leave organization
import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, leaveOrg } from '@/services/member.service'

export async function POST() {
  try {
    const authUser = await getMeServer()
    const { orgId } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })

    await leaveOrg(orgId, authUser.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const status = msg === 'OWNER_CANNOT_LEAVE' ? 403 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
```

### F5: Invitation CRUD APIs

#### 3.4.1 Create `src/app/api/members/invitations/route.ts`

```typescript
// GET /api/members/invitations — list pending invitations for org
import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, getOrgInvitations } from '@/services/member.service'

export async function GET() {
  try {
    const authUser = await getMeServer()
    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json([])
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const invitations = await getOrgInvitations(orgId)
    return NextResponse.json(invitations)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

#### 3.4.2 Create `src/app/api/members/invitations/[id]/route.ts`

```typescript
// DELETE /api/members/invitations/:id — cancel invitation
import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { resolveOrgAndRole, cancelInvitation } from '@/services/member.service'

interface RouteParams { params: Promise<{ id: string }> }

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authUser = await getMeServer()
    const { orgId, memberRole } = await resolveOrgAndRole(authUser.id)
    if (!orgId) return NextResponse.json({ error: 'No organization' }, { status: 404 })
    if (memberRole !== 'owner' && memberRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    await cancelInvitation(id, orgId)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: msg === 'FORBIDDEN' ? 403 : 500 })
  }
}
```

#### 3.4.3 Create `src/app/api/members/invitations/[id]/accept/route.ts`

```typescript
// POST /api/members/invitations/:id/accept
import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { acceptInvitation } from '@/services/member.service'

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const authUser = await getMeServer()
    const member = await acceptInvitation(id, authUser.id)
    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    const statusMap: Record<string, number> = {
      INVITATION_NOT_PENDING: 409,
      INVITATION_EXPIRED: 410,
      'Not authenticated': 401,
    }
    return NextResponse.json({ error: msg }, { status: statusMap[msg] || 500 })
  }
}
```

#### 3.4.4 Create `src/app/api/members/invitations/[id]/decline/route.ts`

```typescript
// POST /api/members/invitations/:id/decline
import { NextRequest, NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { declineInvitation } from '@/services/member.service'

interface RouteParams { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    await getMeServer() // auth check
    await declineInvitation(id)
    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Failed'
    return NextResponse.json({ error: msg }, { status: msg === 'INVITATION_NOT_PENDING' ? 409 : 500 })
  }
}
```

#### 3.4.5 Create `src/app/api/members/pending/route.ts`

```typescript
// GET /api/members/pending — get pending invitations for current user
import { NextResponse } from 'next/server'
import { getMeServer } from '@/lib/auth'
import { getPendingInvitesForUser } from '@/services/member.service'

export async function GET() {
  try {
    const authUser = await getMeServer()
    const invitations = await getPendingInvitesForUser(authUser.email)
    return NextResponse.json(invitations)
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
```

---

## 4. Phase 3: RBAC

### F7: Role-Based Access Control

#### 4.1.1 RBAC Permission Matrix

| Action | owner | admin | viewer |
|--------|:-----:|:-----:|:------:|
| View dashboard/reports | Yes | Yes | Yes |
| Manage providers | Yes | Yes | No |
| Manage projects | Yes | Yes | No |
| Manage budgets | Yes | Yes | No |
| Invite members | Yes | Yes | No |
| Remove members | Yes | Yes (not owner) | No |
| Change roles | Yes | No (except viewer) | No |
| Billing management | Yes | No | No |
| Organization settings | Yes | No | No |
| Delete organization | Yes | No | No |

#### 4.1.2 API Guard Pattern

Instead of a middleware (which runs on every request), use a reusable guard function in API routes that need write access:

```typescript
// Add to src/services/member.service.ts

export type Permission = 'read' | 'write' | 'admin' | 'billing' | 'org_settings'

const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: ['read', 'write', 'admin', 'billing', 'org_settings'],
  admin: ['read', 'write', 'admin'],
  viewer: ['read'],
}

export function hasPermission(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission)
}

export async function requirePermission(
  userId: string,
  permission: Permission
): Promise<{ orgId: string; role: MemberRole }> {
  const { orgId, memberRole } = await resolveOrgAndRole(userId)
  if (!orgId || !memberRole) throw new Error('NO_ORG')
  if (!hasPermission(memberRole, permission)) throw new Error('FORBIDDEN')
  return { orgId, role: memberRole }
}
```

**Usage in API routes** (example pattern):

```typescript
// Any write-protected API route:
const authUser = await getMeServer()
const { orgId } = await requirePermission(authUser.id, 'write')
// proceed with orgId...
```

#### 4.1.3 Files to Add RBAC Guards (future enhancement)

These existing API routes should eventually use `requirePermission`, but are **out of scope for this PDCA** to avoid regression risk. The member API routes (Phase 2) will use RBAC from the start:

| Existing Route | Current Auth | RBAC Guard (future) |
|----------------|-------------|---------------------|
| POST /api/providers/encrypt-key | getMeServer | `requirePermission('write')` |
| POST /api/sync/trigger | getMeServer | `requirePermission('write')` |
| POST /api/reports/export | getMeServer | `requirePermission('read')` |

---

## 5. Phase 4: UI Components

### F6: Team Management UI

#### 5.1.1 Create `src/app/(dashboard)/team/page.tsx`

Page wrapper that checks plan and renders team management:

```typescript
// src/app/(dashboard)/team/page.tsx
'use client'

import { useSession } from '@/hooks/useSession'
import { isFeatureAvailable } from '@/lib/plan-limits'
import type { UserPlan } from '@/types'
import { TeamPage } from '@/features/team/components/TeamPage'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import Link from 'next/link'

export default function TeamRoute() {
  const { isReady, currentUser } = useSession()
  const plan = (currentUser?.plan || 'free') as UserPlan

  if (!isReady) {
    return <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">팀</h1></div>
      {[...Array(2)].map((_, i) => (
        <div key={i} className="h-48 animate-pulse rounded-xl bg-gray-100" />
      ))}
    </div>
  }

  if (!isFeatureAvailable(plan, 'team')) {
    return <UpgradePrompt />
  }

  return <TeamPage />
}

function UpgradePrompt() {
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold text-gray-900">팀</h1></div>
      <Card>
        <CardContent className="py-16 text-center">
          <h2 className="text-xl font-semibold text-gray-900">팀 관리는 Growth 플랜에서 이용 가능합니다</h2>
          <p className="mt-2 text-gray-500">무제한 멤버 초대, 역할 기반 접근제어를 사용하세요.</p>
          <Link href="/pricing" className="mt-6 inline-block">
            <Button>플랜 업그레이드</Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
```

#### 5.1.2 Create `src/features/team/components/TeamPage.tsx`

Main team management component:

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MemberTable } from './MemberTable'
import { InvitationList } from './InvitationList'
import { InviteMemberModal } from './InviteMemberModal'
import type { MemberWithUser, Invitation } from '@/types/organization'
import { UserPlus } from 'lucide-react'

export function TeamPage() {
  const [members, setMembers] = useState<MemberWithUser[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [showInviteModal, setShowInviteModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        fetch('/api/members'),
        fetch('/api/members/invitations'),
      ])
      if (membersRes.ok) setMembers(await membersRes.json())
      if (invitationsRes.ok) setInvitations(await invitationsRes.json())
    } catch { /* ignore */ } finally { setLoading(false) }
  }, [])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">팀</h1>
          <p className="text-gray-500">멤버 초대 및 역할 관리</p>
        </div>
        <Button onClick={() => setShowInviteModal(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> 멤버 초대
        </Button>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold text-gray-900">
            멤버 ({members.length})
          </h2>
        </CardHeader>
        <CardContent>
          <MemberTable members={members} loading={loading} onUpdate={loadData} />
        </CardContent>
      </Card>

      {invitations.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold text-gray-900">
              대기 중인 초대 ({invitations.length})
            </h2>
          </CardHeader>
          <CardContent>
            <InvitationList invitations={invitations} onUpdate={loadData} />
          </CardContent>
        </Card>
      )}

      {showInviteModal && (
        <InviteMemberModal
          onClose={() => setShowInviteModal(false)}
          onInvited={loadData}
        />
      )}
    </div>
  )
}
```

#### 5.1.3 Create `src/features/team/components/MemberTable.tsx`

Uses existing `DataTable` component:

```typescript
'use client'

import { useState } from 'react'
import { DataTable } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import type { MemberWithUser, MemberRole } from '@/types/organization'
import { Trash2 } from 'lucide-react'

interface MemberTableProps {
  members: MemberWithUser[]
  loading: boolean
  onUpdate: () => void
}

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: '소유자',
  admin: '관리자',
  viewer: '뷰어',
}

const ROLE_VARIANTS: Record<MemberRole, 'info' | 'success' | 'default'> = {
  owner: 'info',
  admin: 'success',
  viewer: 'default',
}

export function MemberTable({ members, loading, onUpdate }: MemberTableProps) {
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function handleRoleChange(memberId: string, newRole: MemberRole) {
    setActionLoading(memberId)
    try {
      const res = await fetch(`/api/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast('success', '역할이 변경되었습니다.')
      onUpdate()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '역할 변경 실패')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm('이 멤버를 제거하시겠습니까?')) return
    setActionLoading(memberId)
    try {
      const res = await fetch(`/api/members/${memberId}`, { method: 'DELETE' })
      if (!res.ok) {
        const { error } = await res.json()
        throw new Error(error)
      }
      toast('success', '멤버가 제거되었습니다.')
      onUpdate()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '멤버 제거 실패')
    } finally {
      setActionLoading(null)
    }
  }

  if (loading) {
    return <div className="space-y-3">{[...Array(3)].map((_, i) => (
      <div key={i} className="h-12 animate-pulse rounded bg-gray-100" />
    ))}</div>
  }

  const columns = [
    {
      key: 'name',
      header: '이름',
      render: (m: MemberWithUser) => (
        <div>
          <p className="font-medium text-gray-900">{m.user.name}</p>
          <p className="text-xs text-gray-500">{m.user.email}</p>
        </div>
      ),
    },
    {
      key: 'role',
      header: '역할',
      render: (m: MemberWithUser) => (
        m.role === 'owner' ? (
          <Badge variant={ROLE_VARIANTS[m.role]}>{ROLE_LABELS[m.role]}</Badge>
        ) : (
          <select
            value={m.role}
            onChange={(e) => handleRoleChange(m.id, e.target.value as MemberRole)}
            disabled={actionLoading === m.id}
            className="rounded border border-gray-200 px-2 py-1 text-sm"
          >
            <option value="admin">관리자</option>
            <option value="viewer">뷰어</option>
          </select>
        )
      ),
    },
    {
      key: 'joinedAt',
      header: '가입일',
      render: (m: MemberWithUser) => (
        <span className="text-sm text-gray-500">
          {new Date(m.joinedAt).toLocaleDateString('ko-KR')}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (m: MemberWithUser) => (
        m.role !== 'owner' ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRemove(m.id)}
            disabled={actionLoading === m.id}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        ) : null
      ),
    },
  ]

  return (
    <DataTable
      columns={columns}
      data={members}
      keyExtractor={(m) => m.id}
      emptyMessage="아직 멤버가 없습니다."
      ariaLabel="팀 멤버 목록"
    />
  )
}
```

#### 5.1.4 Create `src/features/team/components/InvitationList.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import type { Invitation, MemberRole } from '@/types/organization'
import { X } from 'lucide-react'

const ROLE_LABELS: Record<MemberRole, string> = {
  owner: '소유자', admin: '관리자', viewer: '뷰어',
}

interface InvitationListProps {
  invitations: Invitation[]
  onUpdate: () => void
}

export function InvitationList({ invitations, onUpdate }: InvitationListProps) {
  const [cancelling, setCancelling] = useState<string | null>(null)

  async function handleCancel(id: string) {
    setCancelling(id)
    try {
      const res = await fetch(`/api/members/invitations/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Cancel failed')
      toast('success', '초대가 취소되었습니다.')
      onUpdate()
    } catch {
      toast('error', '초대 취소에 실패했습니다.')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="divide-y rounded-lg border">
      {invitations.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-900">{inv.email}</span>
            <Badge variant="default">{ROLE_LABELS[inv.role]}</Badge>
            <span className="text-xs text-gray-400">
              {new Date(inv.createdAt).toLocaleDateString('ko-KR')}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleCancel(inv.id)}
            disabled={cancelling === inv.id}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}
```

#### 5.1.5 Create `src/features/team/components/InviteMemberModal.tsx`

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { toast } from '@/components/ui/Toast'
import type { MemberRole } from '@/types/organization'

interface InviteMemberModalProps {
  onClose: () => void
  onInvited: () => void
}

export function InviteMemberModal({ onClose, onInvited }: InviteMemberModalProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('viewer')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      const res = await fetch('/api/members/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role }),
      })
      if (!res.ok) {
        const { error } = await res.json()
        const messages: Record<string, string> = {
          PLAN_REQUIRED: 'Growth 플랜이 필요합니다.',
          MEMBER_LIMIT_REACHED: '멤버 수 제한에 도달했습니다.',
          ALREADY_INVITED: '이미 초대된 이메일입니다.',
          ALREADY_MEMBER: '이미 멤버인 사용자입니다.',
        }
        throw new Error(messages[error] || error)
      }
      toast('success', `${email}에게 초대를 보냈습니다.`)
      onInvited()
      onClose()
    } catch (error) {
      toast('error', error instanceof Error ? error.message : '초대 실패')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-900">멤버 초대</h2>
        <p className="mt-1 text-sm text-gray-500">이메일로 팀 멤버를 초대하세요.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <Input
            id="invite-email"
            label="이메일"
            type="email"
            placeholder="colleague@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">역할</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as MemberRole)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
            >
              <option value="admin">관리자 - 프로바이더, 프로젝트, 예산, 멤버 관리</option>
              <option value="viewer">뷰어 - 대시보드, 리포트 조회만 가능</option>
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              취소
            </Button>
            <Button type="submit" loading={loading} className="flex-1">
              초대 보내기
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
```

#### 5.1.6 Create `src/features/team/components/PendingInviteBanner.tsx`

Shown on dashboard when user has pending invitations:

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { toast } from '@/components/ui/Toast'
import { Mail, Check, X } from 'lucide-react'

interface PendingInvite {
  id: string
  orgName?: string
  role: string
}

export function PendingInviteBanner() {
  const [invites, setInvites] = useState<PendingInvite[]>([])
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/members/pending')
      .then((r) => r.ok ? r.json() : [])
      .then(setInvites)
      .catch(() => {})
  }, [])

  if (invites.length === 0) return null

  async function handleAction(id: string, action: 'accept' | 'decline') {
    setLoading(id)
    try {
      const res = await fetch(`/api/members/invitations/${id}/${action}`, { method: 'POST' })
      if (!res.ok) throw new Error()
      toast('success', action === 'accept' ? '초대를 수락했습니다.' : '초대를 거절했습니다.')
      setInvites((prev) => prev.filter((i) => i.id !== id))
    } catch {
      toast('error', '처리에 실패했습니다.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="space-y-2">
      {invites.map((inv) => (
        <div key={inv.id} className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-blue-600" />
            <span className="text-sm text-blue-900">
              <strong>{inv.orgName || '조직'}</strong>에서 {inv.role} 역할로 초대했습니다.
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => handleAction(inv.id, 'accept')}
              disabled={loading === inv.id}
            >
              <Check className="mr-1 h-3 w-3" /> 수락
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleAction(inv.id, 'decline')}
              disabled={loading === inv.id}
            >
              <X className="mr-1 h-3 w-3" /> 거절
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
```

#### 5.1.7 Modify `src/lib/constants.ts` — Add Team Nav Item

```typescript
// Add to NAV_ITEMS array (after '프록시'):
{ label: '팀', href: '/team', icon: 'Users' },
```

#### 5.1.8 Modify `src/middleware.ts` — Add `/team` Protected Path

Add `'/team'` to the `protectedPaths` array and matcher config.

---

## 6. Phase 5: Settings Fix

### F8: Settings Page Backend Connection

#### 6.1.1 Modify `src/app/(dashboard)/settings/page.tsx`

Replace the two TODO-marked handlers:

**Profile save** (line ~79):
```typescript
// Replace: await new Promise((resolve) => setTimeout(resolve, 800))
// Replace: // TODO: Call bkend.patch('/users/me', ...)
// With:
await bkend.patch(`/users/${currentUser!.id}`, { name: profileName })
```

Note: Email change is complex (requires Supabase auth update). Keep email field as display-only for now.

**Org save** (line ~92):
```typescript
// Replace: await new Promise((resolve) => setTimeout(resolve, 800))
// Replace: // TODO: Call bkend.patch(`/organizations/${orgId}`, ...)
// With:
await bkend.patch(`/organizations/${orgId}`, { name: orgName, slug: orgSlug, billingEmail })
```

#### 6.1.2 Add Team Section Link

Add a "팀 관리" link card in the settings page between the Organization and Subscription cards:

```typescript
<Card>
  <CardHeader><h2 className="text-lg font-semibold text-gray-900">팀 관리</h2></CardHeader>
  <CardContent>
    <p className="text-sm text-gray-500">멤버 초대, 역할 관리, 접근제어를 설정하세요.</p>
    <Link href="/team" className="mt-3 inline-block">
      <Button variant="outline">팀 관리 페이지로 이동</Button>
    </Link>
  </CardContent>
</Card>
```

---

## 7. Architecture Conventions

### 7.1 API Route Pattern
All routes follow the established pattern:
1. `getMeServer()` for auth (returns `{ id, email, name }`)
2. `resolveOrgAndRole()` for org + RBAC context
3. Try/catch with error code → HTTP status mapping
4. Consistent JSON response format: `{ error: string }` for errors

### 7.2 bkend Client Usage
- `bkend.get<T[]>('/table', { params: { key: 'value' } })` — filter by equality
- `bkend.post<T>('/table', body)` — create with auto-generated id
- `bkend.patch<T>('/table/id', body)` — partial update
- `bkend.delete('/table/id')` — delete by id
- All params must be **strings** (e.g., `status: 'pending'` not `status: true`)

### 7.3 Component Pattern
- `'use client'` directive for all interactive components
- Existing UI primitives: `Card`, `CardHeader`, `CardContent`, `Button`, `Input`, `Badge`, `DataTable`, `toast`
- `Badge` variants: `default`, `success`, `warning`, `danger`, `info`
- Loading states: skeleton divs with `animate-pulse`
- Fintech premium aesthetic (rounded-2xl, slate colors, subtle shadows)

### 7.4 State Management
- `useSession()` hook provides `{ isReady, currentUser, currentOrgId }`
- `useAppStore` Zustand store for global state
- No new Zustand slices needed — team data fetched via API per-page

---

## 8. File Summary

### New Files (17)
| # | File | LOC (est) |
|---|------|-----------|
| 1 | `src/services/member.service.ts` | ~200 |
| 2 | `src/app/api/members/route.ts` | ~40 |
| 3 | `src/app/api/members/invite/route.ts` | ~50 |
| 4 | `src/app/api/members/[id]/route.ts` | ~60 |
| 5 | `src/app/api/members/leave/route.ts` | ~25 |
| 6 | `src/app/api/members/invitations/route.ts` | ~25 |
| 7 | `src/app/api/members/invitations/[id]/route.ts` | ~30 |
| 8 | `src/app/api/members/invitations/[id]/accept/route.ts` | ~30 |
| 9 | `src/app/api/members/invitations/[id]/decline/route.ts` | ~25 |
| 10 | `src/app/api/members/pending/route.ts` | ~20 |
| 11 | `src/app/(dashboard)/team/page.tsx` | ~45 |
| 12 | `src/features/team/components/TeamPage.tsx` | ~65 |
| 13 | `src/features/team/components/MemberTable.tsx` | ~120 |
| 14 | `src/features/team/components/InvitationList.tsx` | ~55 |
| 15 | `src/features/team/components/InviteMemberModal.tsx` | ~80 |
| 16 | `src/features/team/components/PendingInviteBanner.tsx` | ~60 |
| 17 | `src/features/team/components/index.ts` | ~5 |

### Modified Files (4)
| # | File | Change |
|---|------|--------|
| 1 | `src/types/organization.ts` | Add `Invitation`, `MemberWithUser` |
| 2 | `src/lib/constants.ts` | Add '팀' to NAV_ITEMS |
| 3 | `src/middleware.ts` | Add '/team' to protected paths + matcher |
| 4 | `src/app/(dashboard)/settings/page.tsx` | Backend connect + team link |

### Total: ~935 LOC across 21 files
