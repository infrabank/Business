# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LLM Cost Manager** - LLM API 비용을 통합 관리하고 최적화하는 SaaS 플랫폼.

AI 시대의 리바이스 청바지 = 모든 AI 사용 기업/개인에게 필수적인 비용관리 서비스.

### Service Definition

- **Product**: LLM 비용관리 & 사용량 분석 플랫폼
- **Value Prop**: 멀티 프로바이더(OpenAI, Anthropic, Google) API 비용을 단일 대시보드에서 통합 관리
- **Target**: AI를 도입한 모든 기업과 개인 (SMB 우선)
- **Revenue**: Freemium SaaS (Free → $29 → $99 → $299/월)
- **Approach**: 1인 운영, AI-Native 개발, 2-3개월 MVP 출시

## Project Level & Tech Stack

- **bkit Level**: Dynamic (Backend + Auth + DB 필요)
- **Language**: Korean (primary), English (code/docs)
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + TypeScript
- **Backend**: bkend.ai BaaS (인증, DB, 파일 스토리지)
- **State**: Zustand
- **Charts**: Recharts
- **API Client**: TanStack Query + fetch
- **Testing**: Vitest + Playwright
- **Deployment**: Vercel (Frontend) / bkend.ai (Backend)

## Development Methodology

- **PDCA Cycle**: Plan → Do → Check → Act 반복
- **AI-Native**: Claude Code + bkit 기반 개발
- **Pipeline**: Phase 1(Schema) → Phase 9(Deployment) 순서 진행
- **Current Phase**: Design 완료 → Phase 2 Convention / Phase 3 Mockup 진행 예정

## Directory Structure

```
Business/
├── .claude/              # Claude Code 설정
├── .bkit/                # bkit 에이전트 상태
├── docs/
│   ├── 01-plan/          # 사업 기획서, 스키마, 요구사항
│   │   ├── features/     # PDCA Plan 문서
│   │   └── schema.md     # Phase 1 데이터 모델
│   ├── 02-design/        # 설계 문서
│   │   └── features/     # PDCA Design 문서
│   ├── 03-analysis/      # 갭 분석, 코드 분석
│   └── 04-reports/       # PDCA 완료 보고서
├── src/                  # 소스 코드 (Next.js)
│   ├── app/              # App Router pages
│   ├── components/       # 공유 UI 컴포넌트
│   ├── features/         # 기능별 모듈 (auth, dashboard, providers, etc.)
│   ├── services/         # 비즈니스 로직 + Provider Adapters
│   ├── lib/              # 유틸리티, bkend 클라이언트
│   └── types/            # TypeScript 타입 정의
├── public/               # 정적 파일
└── CLAUDE.md             # 이 파일
```

## Conventions

- 모든 코드 커밋 메시지: 영어, conventional commits 형식
- 변수/함수명: camelCase (TypeScript)
- 컴포넌트: PascalCase
- 파일명: kebab-case
- 문서: 한국어 우선, 기술 용어는 영어 병기

## Permissions

이 프로젝트는 skip-permissions 모드로 설정됨. 모든 파일 읽기/쓰기/실행이 허용됨.
