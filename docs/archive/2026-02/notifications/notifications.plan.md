# Plan: notifications

> 외부 알림 채널 - 이메일, Slack, 웹훅을 통해 예산 경고, 이상 감지, 최적화 알림을 실시간 전달

## 1. Overview

### 1.1 Feature Summary
LLM Cost Manager의 알림(Alert)을 앱 내부뿐 아니라 외부 채널(이메일, Slack Webhook, Custom Webhook)로 자동 전달하는 기능. 사용자가 대시보드에 접속하지 않아도 예산 초과, 이상 비용 급증 등 중요 알림을 즉시 인지할 수 있도록 한다.

### 1.2 Business Context
- **Why**: 앱 내 알림만으로는 "이미 과금된 후"에야 인지. 이메일/Slack으로 실시간 전달 시 즉각 대응 가능
- **Impact**: Growth 플랜 전환의 핵심 동기. "Slack으로 $500 이상 지출 알림 받기" = 직접적 ROI
- **Differentiation**: 경쟁사 대비 멀티채널 알림 + 알림 다이제스트 지원
- **Priority**: High - anomaly-detection에서 "Out of Scope: 외부 알림 채널(Slack/Email - 별도 PDCA)"로 명시
- **Dependency**: anomaly-detection(완료), billing-payments(완료) 기반

### 1.3 Scope
- **In Scope**: 이메일 알림(Resend API), Slack Incoming Webhook, Custom Webhook, 채널별 설정 UI, 알림 다이제스트(일별 요약), 전송 이력, Cron 기반 다이제스트 발송
- **Out of Scope**: SMS, 모바일 푸시 알림, Microsoft Teams 연동(v2), 알림 템플릿 커스터마이징(v2)

## 2. Requirements

### FR-01: 알림 채널 관리
사용자가 외부 알림 채널을 등록하고 관리한다.
- 이메일 채널: 기본 활성화 (가입 이메일 자동 등록), 추가 이메일 등록 가능
- Slack 채널: Incoming Webhook URL 등록으로 연동
- Webhook 채널: 커스텀 URL + 선택적 헤더/시크릿 등록
- 채널별 활성화/비활성화 토글
- 최대 채널 수: Free 1개(이메일만), Growth 무제한

### FR-02: 알림 라우팅 설정
알림 유형별로 어떤 채널로 전송할지 설정한다.
- 알림 유형(budget_warning, budget_exceeded, anomaly, optimization)별 채널 매핑
- 심각도(warning/critical) 기반 필터링: "critical만 Slack으로" 같은 설정
- 전체 알림 수신 on/off (Do Not Disturb)
- 기본 설정: 모든 알림 → 이메일

### FR-03: 이메일 알림 전송
Resend API를 통해 이메일 알림을 발송한다.
- 알림 생성 시 즉시 전송 (실시간)
- HTML 이메일 템플릿: 알림 유형별 색상, 금액, 차트 링크
- 발신자: noreply@llmcost.app (또는 Resend 도메인)
- 수신 거부(unsubscribe) 링크 포함

### FR-04: Slack 알림 전송
Slack Incoming Webhook으로 알림을 전달한다.
- Block Kit 포맷의 리치 메시지 (색상 바, 금액, 링크)
- 알림 유형별 이모지 및 색상 구분
- 대시보드 바로가기 링크 포함
- Webhook URL 유효성 검증 (등록 시 테스트 메시지 전송)

### FR-05: Custom Webhook 전송
사용자 정의 URL로 알림 데이터를 전송한다.
- POST 요청으로 JSON payload 전송
- 선택적 인증 헤더 (Bearer token 또는 custom header)
- 시크릿 기반 서명 (HMAC-SHA256) 지원
- 재시도 로직: 실패 시 최대 3회 (지수 백오프)
- 응답 코드 2xx를 성공으로 처리

### FR-06: 알림 다이제스트
일별 요약 이메일을 발송한다.
- 매일 오전 9시(사용자 타임존 기준, 기본 UTC+9) 전일 알림 요약
- 다이제스트 내용: 알림 건수, 유형별 분류, 총 비용 변화, 상위 이슈 3건
- 다이제스트 전용 이메일 템플릿
- 다이제스트 모드: 즉시 전송 / 다이제스트만 / 둘 다 선택 가능
- Growth 플랜 전용

### FR-07: 전송 이력 및 상태
알림 전송 결과를 기록하고 조회한다.
- 전송 기록: 채널, 전송 시각, 성공/실패, 에러 메시지
- 최근 30일 전송 이력 조회 API
- 설정 UI에서 최근 전송 이력 표시 (최근 10건)
- 실패 알림에 대한 재전송 버튼

### FR-08: 알림 전송 Cron
Vercel Cron으로 다이제스트 발송을 실행한다.
- `POST /api/cron/send-digest` - 모든 활성 조직의 일별 다이제스트 발송
- 기존 cron 패턴 활용 (CRON_SECRET 인증)
- 매일 0시 UTC 실행 (한국 오전 9시)
- 다이제스트 활성화된 조직만 대상

## 3. Data Model

### 3.1 Existing Types (변경 없음)
```typescript
// types/alert.ts - 기존 알림 타입
type AlertType = 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'optimization'
interface Alert { id, orgId, type, title, message, metadata?, isRead, sentAt }
```

### 3.2 New Type: NotificationChannel
```typescript
type ChannelType = 'email' | 'slack' | 'webhook'

interface NotificationChannel {
  id: string
  orgId: string
  type: ChannelType
  name: string               // 사용자 지정 이름 ("팀 Slack", "개발팀 이메일")
  enabled: boolean
  config: EmailConfig | SlackConfig | WebhookConfig
  alertTypes: AlertType[]     // 수신할 알림 유형
  severityFilter?: ('warning' | 'critical')[]  // null이면 모든 심각도
  createdAt: string
  updatedAt: string
}

interface EmailConfig {
  recipients: string[]        // 수신 이메일 목록
}

interface SlackConfig {
  webhookUrl: string          // Slack Incoming Webhook URL
  channel?: string            // 채널명 (표시용)
}

interface WebhookConfig {
  url: string                 // POST 대상 URL
  headers?: Record<string, string>  // 커스텀 헤더
  secret?: string             // HMAC 서명용 시크릿
}
```

### 3.3 New Type: NotificationPreferences
```typescript
interface NotificationPreferences {
  id: string
  orgId: string
  enabled: boolean            // 전체 알림 on/off (DND)
  digestEnabled: boolean      // 다이제스트 활성화
  digestTime: string          // "09:00" (로컬 타임)
  timezone: string            // "Asia/Seoul"
  deliveryMode: 'instant' | 'digest' | 'both'
  createdAt: string
  updatedAt: string
}
```

### 3.4 New Type: NotificationLog
```typescript
type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'retrying'

interface NotificationLog {
  id: string
  orgId: string
  alertId: string             // 원본 Alert ID
  channelId: string           // 전송 채널 ID
  channelType: ChannelType
  status: DeliveryStatus
  attempts: number
  lastAttemptAt: string
  error?: string              // 실패 시 에러 메시지
  sentAt?: string             // 성공 시 전송 시각
  createdAt: string
}
```

### 3.5 bkend.ai Collections
- `notification-channels` - 조직별 알림 채널 (새로 생성)
- `notification-preferences` - 조직별 알림 설정 (새로 생성)
- `notification-logs` - 전송 이력 (새로 생성)
- `alerts` - 기존 알림 (전송 트리거 활용)

## 4. API Design

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| GET | /api/notifications/channels | Required | any | 채널 목록 조회 |
| POST | /api/notifications/channels | Required | admin+ | 채널 등록 |
| PATCH | /api/notifications/channels/[id] | Required | admin+ | 채널 수정 |
| DELETE | /api/notifications/channels/[id] | Required | admin+ | 채널 삭제 |
| POST | /api/notifications/channels/[id]/test | Required | admin+ | 테스트 메시지 전송 |
| GET | /api/notifications/preferences | Required | any | 알림 설정 조회 |
| PATCH | /api/notifications/preferences | Required | admin+ | 알림 설정 수정 |
| GET | /api/notifications/logs | Required | any | 전송 이력 조회 |
| POST | /api/notifications/send | Internal | system | 알림 전송 실행 (내부 호출) |
| POST | /api/cron/send-digest | CRON_SECRET | system | 일별 다이제스트 발송 |

## 5. Implementation Files

### 5.1 New Files (예상 15개)
| File | Purpose |
|------|---------|
| `src/types/notification.ts` | NotificationChannel, Preferences, Log 타입 |
| `src/services/notification.service.ts` | 핵심 알림 전송 로직 (라우팅, 전송, 재시도) |
| `src/services/notification-email.service.ts` | Resend API 이메일 전송 |
| `src/services/notification-slack.service.ts` | Slack Webhook 전송 |
| `src/services/notification-webhook.service.ts` | Custom Webhook 전송 |
| `src/services/notification-digest.service.ts` | 다이제스트 집계 및 발송 |
| `src/app/api/notifications/channels/route.ts` | GET/POST 채널 관리 |
| `src/app/api/notifications/channels/[id]/route.ts` | PATCH/DELETE 개별 채널 |
| `src/app/api/notifications/channels/[id]/test/route.ts` | POST 테스트 전송 |
| `src/app/api/notifications/preferences/route.ts` | GET/PATCH 알림 설정 |
| `src/app/api/notifications/logs/route.ts` | GET 전송 이력 |
| `src/app/api/cron/send-digest/route.ts` | Cron 다이제스트 발송 |
| `src/features/notifications/components/NotificationSettings.tsx` | 알림 설정 UI |
| `src/features/notifications/components/ChannelManager.tsx` | 채널 관리 UI |
| `src/features/notifications/hooks/useNotificationChannels.ts` | 채널 관리 hook |

### 5.2 Modified Files (예상 5개)
| File | Change |
|------|--------|
| `src/types/index.ts` | Notification 타입 export 추가 |
| `src/services/budget.service.ts` | 알림 생성 후 notification.service 호출 추가 |
| `src/services/anomaly.service.ts` | 알림 생성 후 notification.service 호출 추가 |
| `src/lib/constants.ts` | NAV_ITEMS에 알림 설정 또는 settings 하위 탭 추가 |
| `vercel.json` | cron schedule 추가 (`0 0 * * *`) |

## 6. Implementation Order

```
Phase 1: Data Layer (FR-01 타입, FR-07 로그)
  → NotificationChannel, Preferences, Log 타입 정의
  → notification.service.ts (핵심 라우팅 + 전송 오케스트레이션)
  → notification-email.service.ts (Resend API)
  → notification-slack.service.ts (Slack Webhook)
  → notification-webhook.service.ts (Custom Webhook)

Phase 2: APIs (FR-01, FR-02, FR-07)
  → GET/POST /api/notifications/channels
  → PATCH/DELETE /api/notifications/channels/[id]
  → POST /api/notifications/channels/[id]/test
  → GET/PATCH /api/notifications/preferences
  → GET /api/notifications/logs

Phase 3: Alert Integration (FR-03, FR-04, FR-05)
  → budget.service.ts에 알림 전송 트리거 추가
  → anomaly.service.ts에 알림 전송 트리거 추가
  → 전송 실패 시 재시도 로직

Phase 4: Digest + Cron (FR-06, FR-08)
  → notification-digest.service.ts
  → POST /api/cron/send-digest
  → vercel.json cron 추가

Phase 5: Settings UI (FR-01, FR-02, FR-07)
  → ChannelManager (채널 추가/수정/삭제/테스트)
  → NotificationSettings (설정 + 이력)
  → settings 페이지 통합
```

## 7. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Resend API 비용 (이메일 발송량) | Medium | Free tier 3,000건/월 활용, 다이제스트 모드로 발송량 절감 |
| Slack Webhook URL 만료/변경 | Medium | 테스트 전송 기능으로 사전 검증, 실패 시 자동 비활성화 + 알림 |
| Webhook 타임아웃 (외부 서버 응답 지연) | Medium | 5초 타임아웃, 3회 재시도 (1s/4s/16s 지수 백오프) |
| Vercel Cron 60초 제한 (다이제스트) | Medium | 조직별 배치 처리 (10개씩), 타임아웃 시 다음 실행에 이어서 |
| 알림 폭주 (같은 알림 반복 전송) | High | 24시간 중복 전송 방지, 동일 alertId 기준 dedup |
| 이메일 스팸 분류 | Low | Resend 도메인 인증, 수신 거부 링크 필수 포함 |
| Secret/Webhook URL 보안 | High | 기존 encryption.service 활용하여 DB 저장 시 암호화 |

## 8. Success Criteria

- [ ] 이메일 채널로 알림이 자동 전송된다 (Resend API)
- [ ] Slack Webhook으로 Block Kit 메시지가 전송된다
- [ ] Custom Webhook으로 JSON payload가 전송된다
- [ ] 채널별 알림 유형 필터링이 동작한다
- [ ] 일별 다이제스트가 설정된 시간에 발송된다
- [ ] 전송 이력(성공/실패)이 기록되고 조회된다
- [ ] 채널 테스트 전송이 동작한다
- [ ] Free 플랜은 이메일 1채널만 사용 가능하다
- [ ] 실패 시 3회 재시도 후 에러 로그가 남는다
- [ ] tsc 에러 0개, 프로덕션 빌드 성공

## 9. Estimation

- **New Files**: ~15개
- **Modified Files**: ~5개
- **Total LOC**: ~1,600 lines (estimated)
- **Complexity**: Medium-High (외부 API 연동 3종 + Cron + UI)
