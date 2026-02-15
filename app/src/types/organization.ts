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
