# Plan: team-management

> 팀/멤버 관리 - 초대, 역할 기반 접근제어, 조직 멤버십 관리

## 1. Overview

### 1.1 Feature Summary
LLM Cost Manager의 Growth 플랜 사용자를 위한 팀 멤버 관리 기능. 조직에 멤버를 초대하고, 역할(owner/admin/viewer)에 따른 접근 권한을 제어하며, 멤버 목록을 관리하는 전체 플로우를 구현한다.

### 1.2 Business Context
- **Why**: Growth 플랜($29/월)의 핵심 차별점. Free 플랜은 1명 제한, Growth는 무제한 멤버
- **Impact**: B2B 전환의 핵심 기능. 팀 단위 사용 시 플랜 업그레이드 유도
- **Priority**: High - 이미 타입/플랜 제한 로직이 구현되어 있으나 실제 UI/API가 없음

### 1.3 Scope
- **In Scope**: 멤버 초대, 역할 관리, 멤버 목록/삭제, 설정 페이지 백엔드 연결, 역할 기반 권한 체크
- **Out of Scope**: 이메일 발송(알림 시스템은 별도 PDCA), SSO/SAML, 조직 간 전환 UI

## 2. Requirements

### FR-01: 멤버 초대 API
이메일 기반으로 조직에 멤버를 초대한다. bkend.ai DB에 초대 레코드를 생성한다.
- `POST /api/members/invite` - 이메일 + 역할로 초대 생성
- 이미 가입된 사용자: 즉시 멤버로 추가
- 미가입 사용자: pending 상태의 초대 레코드 생성
- Growth 플랜만 허용 (`checkMemberLimit` 활용)
- 중복 초대 방지 (동일 이메일 + orgId 체크)

### FR-02: 멤버 목록 API
조직의 현재 멤버와 대기 중인 초대를 조회한다.
- `GET /api/members` - 현재 조직의 멤버 목록 반환
- `GET /api/members/invitations` - 대기 중인 초대 목록 반환
- 멤버 정보: 이름, 이메일, 역할, 가입일
- 초대 정보: 이메일, 역할, 초대일, 상태

### FR-03: 멤버 역할 변경 API
admin 이상 권한으로 멤버 역할을 변경한다.
- `PATCH /api/members/[id]` - 역할 변경 (owner/admin/viewer)
- owner만 다른 멤버를 admin으로 승격 가능
- owner 역할은 양도만 가능 (1명 유지)
- viewer는 읽기 전용 (데이터 수정 불가)

### FR-04: 멤버 삭제/탈퇴 API
조직에서 멤버를 제거하거나 본인이 탈퇴한다.
- `DELETE /api/members/[id]` - 멤버 제거 (admin 이상)
- `POST /api/members/leave` - 본인 탈퇴
- owner는 삭제/탈퇴 불가 (먼저 양도 필요)
- 초대 취소: `DELETE /api/members/invitations/[id]`

### FR-05: 초대 수락/거절
미가입 또는 기존 사용자가 초대를 수락하거나 거절한다.
- `POST /api/members/invitations/[id]/accept` - 초대 수락
- `POST /api/members/invitations/[id]/decline` - 초대 거절
- 수락 시 Member 레코드 생성, Invitation 상태 변경
- 로그인 후 대시보드에서 pending 초대 배너 표시

### FR-06: 팀 관리 UI 페이지
설정 페이지 내 팀 섹션 또는 별도 `/team` 페이지에서 멤버를 관리한다.
- 현재 멤버 목록 테이블 (이름, 이메일, 역할, 가입일)
- 초대 대기 목록 (이메일, 역할, 초대일, 상태)
- "멤버 초대" 모달 (이메일 입력 + 역할 선택)
- 역할 변경 드롭다운 (권한에 따라 표시)
- 멤버 제거/초대 취소 버튼
- Free 플랜 사용자에게 업그레이드 유도 UI

### FR-07: 역할 기반 접근제어 (RBAC)
API 레벨에서 역할에 따른 접근을 제어한다.
- owner: 모든 권한 (조직 삭제, 빌링, 멤버 관리)
- admin: 멤버 초대/삭제, 프로바이더/프로젝트/예산 관리
- viewer: 읽기 전용 (대시보드 조회, 리포트 조회)
- `getMemberRole(userId, orgId)` 유틸리티 함수
- API 라우트에 role check 미들웨어 패턴 적용

### FR-08: 설정 페이지 백엔드 연결
기존 설정 페이지의 TODO를 실제 백엔드 호출로 대체한다.
- 프로필 업데이트: `bkend.patch('/users/{id}', { name, email })`
- 조직 업데이트: `bkend.patch('/organizations/{id}', { name, slug, billingEmail })`
- 현재 `setTimeout` mock 제거

## 3. Data Model

### 3.1 Existing Types (변경 없음)
```typescript
// types/organization.ts - 이미 존재
type MemberRole = 'owner' | 'admin' | 'viewer'
interface Organization { id, name, ownerId, slug, billingEmail?, createdAt, updatedAt }
interface Member { id, userId, orgId, role: MemberRole, joinedAt, user?: { name, email, avatarUrl? } }
```

### 3.2 New Type: Invitation
```typescript
// types/organization.ts에 추가
interface Invitation {
  id: string
  orgId: string
  email: string
  role: MemberRole
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  invitedBy: string  // userId
  createdAt: string
  expiresAt: string  // 7일 후 만료
}
```

### 3.3 bkend.ai Collections
- `members` - 조직 멤버 (기존 스키마 활용)
- `invitations` - 초대 레코드 (새로 생성)

## 4. API Design

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | /api/members | Required | any | 조직 멤버 목록 |
| POST | /api/members/invite | Required | admin+ | 멤버 초대 |
| PATCH | /api/members/[id] | Required | admin+ | 역할 변경 |
| DELETE | /api/members/[id] | Required | admin+ | 멤버 제거 |
| POST | /api/members/leave | Required | any | 본인 탈퇴 |
| GET | /api/members/invitations | Required | admin+ | 초대 목록 |
| DELETE | /api/members/invitations/[id] | Required | admin+ | 초대 취소 |
| POST | /api/members/invitations/[id]/accept | Required | any | 초대 수락 |
| POST | /api/members/invitations/[id]/decline | Required | any | 초대 거절 |
| GET | /api/members/pending | Required | any | 본인의 대기 초대 조회 |

## 5. Implementation Files

### 5.1 New Files (예상 10개)
| File | Purpose |
|------|---------|
| `src/app/api/members/route.ts` | GET: 멤버 목록 |
| `src/app/api/members/invite/route.ts` | POST: 멤버 초대 |
| `src/app/api/members/leave/route.ts` | POST: 본인 탈퇴 |
| `src/app/api/members/[id]/route.ts` | PATCH: 역할 변경, DELETE: 멤버 제거 |
| `src/app/api/members/invitations/route.ts` | GET: 초대 목록 |
| `src/app/api/members/invitations/[id]/route.ts` | DELETE: 초대 취소 |
| `src/app/api/members/invitations/[id]/accept/route.ts` | POST: 초대 수락 |
| `src/app/api/members/invitations/[id]/decline/route.ts` | POST: 초대 거절 |
| `src/app/api/members/pending/route.ts` | GET: 본인 대기 초대 |
| `src/services/member.service.ts` | 멤버/초대 비즈니스 로직 |
| `src/features/team/components/TeamPage.tsx` | 팀 관리 UI |
| `src/features/team/components/InviteMemberModal.tsx` | 초대 모달 |
| `src/features/team/components/MemberTable.tsx` | 멤버 테이블 |
| `src/features/team/components/InvitationList.tsx` | 초대 대기 목록 |
| `src/features/team/components/PendingInviteBanner.tsx` | 대시보드 초대 배너 |

### 5.2 Modified Files (예상 6개)
| File | Change |
|------|--------|
| `src/types/organization.ts` | Invitation 타입 추가 |
| `src/app/(dashboard)/settings/page.tsx` | 팀 섹션 추가 + TODO 백엔드 연결 |
| `src/lib/constants.ts` | NAV_ITEMS에 '팀' 추가 |
| `src/middleware.ts` | `/team` 보호 경로 추가 |
| `src/app/(dashboard)/team/page.tsx` | 팀 관리 페이지 (new route) |
| `src/lib/auth.ts` | getMemberRole 유틸리티 추가 |

## 6. Implementation Order

```
Phase 1: Data Layer (FR-01, FR-02)
  → Invitation 타입 추가
  → member.service.ts 생성
  → GET /api/members, POST /api/members/invite

Phase 2: CRUD APIs (FR-03, FR-04, FR-05)
  → PATCH /api/members/[id] (역할 변경)
  → DELETE /api/members/[id] (멤버 제거)
  → POST /api/members/leave (탈퇴)
  → Invitation CRUD (accept/decline/cancel/pending)

Phase 3: RBAC (FR-07)
  → getMemberRole() 유틸리티
  → API 라우트에 역할 체크 적용
  → viewer 읽기 전용 제한

Phase 4: UI (FR-06)
  → TeamPage + MemberTable + InvitationList
  → InviteMemberModal
  → PendingInviteBanner
  → NAV_ITEMS + middleware 업데이트

Phase 5: Settings Fix (FR-08)
  → 프로필/조직 업데이트 백엔드 연결
  → 팀 섹션 링크 추가
```

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| bkend.ai에 invitations 컬렉션이 없을 수 있음 | Medium | bkend API로 동적 생성 |
| 미가입 사용자 초대 처리 | Low | pending 상태로 저장, 가입 시 자동 매칭은 Out of Scope |
| owner 양도 실수 | High | 확인 모달 + 본인 비밀번호/이메일 재확인 |
| Free 플랜 멤버 제한 우회 | Medium | API 레벨에서 checkMemberLimit 강제 적용 |

## 8. Success Criteria

- [ ] Growth 플랜 사용자가 이메일로 멤버를 초대할 수 있다
- [ ] 초대받은 사용자가 수락/거절할 수 있다
- [ ] owner/admin/viewer 역할에 따라 접근이 제한된다
- [ ] 멤버 목록에서 역할 변경/삭제가 가능하다
- [ ] Free 플랜 사용자에게 업그레이드 유도가 표시된다
- [ ] 설정 페이지의 프로필/조직 업데이트가 실제 동작한다
- [ ] tsc 에러 0개, 프로덕션 빌드 성공

## 9. Estimation

- **New Files**: ~15개
- **Modified Files**: ~6개
- **Total LOC**: ~1,200 lines (estimated)
- **Complexity**: Medium-High (RBAC 로직 포함)
