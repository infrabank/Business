export type MemberRole = 'owner' | 'admin' | 'viewer'

export interface Organization {
  id: string
  name: string
  ownerId: string
  slug: string
  billingEmail?: string
  createdAt: string
  updatedAt: string
}

export interface Member {
  id: string
  userId: string
  orgId: string
  role: MemberRole
  joinedAt: string
  user?: { name: string; email: string; avatarUrl?: string }
}

export interface MemberWithUser extends Member {
  user: { name: string; email: string; avatarUrl?: string }
}

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
