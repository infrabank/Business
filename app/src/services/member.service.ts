import { bkend } from '@/lib/bkend'
import { checkMemberLimit, isFeatureAvailable } from '@/lib/plan-limits'
import type {
  Member,
  MemberRole,
  MemberWithUser,
  Invitation,
  Organization,
} from '@/types/organization'
import type { User, UserPlan } from '@/types'

// ─── Org resolution ─────────────────────────────────────────

export async function resolveOrgAndRole(
  userId: string
): Promise<{ orgId: string | null; memberRole: MemberRole | null }> {
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

// ─── Query helpers ──────────────────────────────────────────

export async function getOrgMembers(orgId: string): Promise<MemberWithUser[]> {
  const members = await bkend.get<Member[]>('/members', { params: { orgId } })
  const enriched: MemberWithUser[] = []
  for (const m of members) {
    try {
      const users = await bkend.get<User[]>('/users', { params: { id: m.userId } })
      enriched.push({
        ...m,
        user:
          users.length > 0
            ? { name: users[0].name, email: users[0].email, avatarUrl: users[0].avatarUrl }
            : { name: 'Unknown', email: '' },
      })
    } catch {
      enriched.push({ ...m, user: { name: 'Unknown', email: '' } })
    }
  }
  return enriched
}

export async function getMemberByUserId(
  orgId: string,
  userId: string
): Promise<Member | null> {
  const members = await bkend.get<Member[]>('/members', {
    params: { orgId, userId },
  })
  return members.length > 0 ? members[0] : null
}

export async function getMemberRole(
  orgId: string,
  userId: string
): Promise<MemberRole | null> {
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
  // 1. Feature gate
  if (!isFeatureAvailable(plan, 'team')) {
    throw new Error('PLAN_REQUIRED')
  }

  // 2. Member limit
  const currentMembers = await bkend.get<Member[]>('/members', { params: { orgId } })
  const limitCheck = checkMemberLimit(plan, currentMembers.length)
  if (!limitCheck.allowed) {
    throw new Error('MEMBER_LIMIT_REACHED')
  }

  // 3. Duplicate invitation
  const existing = await bkend.get<Invitation[]>('/invitations', {
    params: { orgId, email, status: 'pending' },
  })
  if (existing.length > 0) {
    throw new Error('ALREADY_INVITED')
  }

  // 4. Already a member
  const users = await bkend.get<User[]>('/users', { params: { email } })
  if (users.length > 0) {
    const existingMember = await getMemberByUserId(orgId, users[0].id)
    if (existingMember) {
      throw new Error('ALREADY_MEMBER')
    }
  }

  // 5. Create invitation (7 day expiry)
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

export async function getPendingInvitesForUser(
  email: string
): Promise<(Invitation & { orgName?: string })[]> {
  const invitations = await bkend.get<Invitation[]>('/invitations', {
    params: { email, status: 'pending' },
  })
  const enriched = []
  for (const inv of invitations) {
    try {
      const orgs = await bkend.get<Organization[]>('/organizations', {
        params: { id: inv.orgId },
      })
      enriched.push({ ...inv, orgName: orgs[0]?.name })
    } catch {
      enriched.push({ ...inv, orgName: undefined })
    }
  }
  return enriched
}

export async function acceptInvitation(
  invitationId: string,
  userId: string
): Promise<Member> {
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

export async function cancelInvitation(
  invitationId: string,
  orgId: string
): Promise<void> {
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
  if (newRole === 'admin' && actorRole !== 'owner') {
    throw new Error('FORBIDDEN')
  }
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

// ─── RBAC ───────────────────────────────────────────────────

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
