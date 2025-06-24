# 📋 세종학당 문화인턴 지원 시스템 - 프로젝트 지식 v4.3.0 (Updated 2025-06-24)

## 🏷️ 기본 정보

**레포지토리**: `faye8796/request`  
**현재 버전**: v4.3.0 (Complete 4-Type Equipment Request Optimization)  
**개발 상태**: 🎉 **v4.3.0 업데이트 완료** - 4가지 교구 신청 타입별 최적화  
**최근 업데이트**: 2025-06-24 09:37 (v4.3.0 UI+백엔드 완전 연동)  
**라이브 URL**: 세종학당 문화인턴 지원 시스템

---

## ✅ 파일 구조 (최신 v4.3.0)

```
request/
├── index.html (학생 로그인) ✅
├── admin.html (관리자 대시보드) ✅ 🆕v4.2  
├── admin/
│   ├── equipment-management.html (교구신청 관리) ✅ 🔧
│   ├── flight-management.html (항공권 관리) ✅
│   └── institute-management.html (학당정보 관리) ✅
├── student/
│   ├── dashboard.html (메뉴 선택) ✅ 🆕v4.2
│   ├── equipment-request.html (교구신청) ✅ 🎨v4.3.0 4가지 타입별 최적화
│   ├── institute-info.html (학당정보 조회) ✅
│   └── flight-request.html (항공권신청, 미구현)
├── js/
│   ├── admin-institute.js (관리자 학당 관리) ✅
│   ├── app.js (앱 초기화) ✅
│   ├── auth.js (인증 관리) ✅
│   ├── config.js (환경설정) ✅
│   ├── lesson-plan.js (수업계획) ✅
│   ├── student.js (학생 통합 매니저 - 축소됨) ✅ 🔧
│   ├── student-addon.js (학생 확장기능, 빈파일)
│   ├── supabase-client.js (DB 연동 - 통합 매니저) ✅ 🆕v4.2
│   └── utils.js (공통 유틸) ✅
├── js/supabase/ (모듈화된 Supabase 파일들) 🆕v4.2
│   ├── supabase-core.js (핵심 공통 기능, 5KB) ✅
│   ├── supabase-student.js (학생 전용 기능, 33KB) ✅
│   └── supabase-admin.js (관리자 전용 기능, 41KB) ✅
├── js/student/ (모듈 분할 시스템)
│   ├── api-helper.js (API 관리) ✅
│   ├── dashboard.js (대시보드 전용) ✅
│   ├── equipment-request.js (교구신청 전용) ✅ 🎯v4.3.0 4가지 타입별 완전 최적화
│   ├── flight-request.js (항공권신청 전용) ✅
│   ├── institute-info.js (학당정보 전용) ✅
│   ├── lesson-plan-helper.js (수업계획 도우미) ✅
│   ├── notification-system.js (알림 시스템) ✅
│   ├── receipt-management.js (영수증 관리) ✅
│   └── shipping-management.js (배송지 관리) ✅
├── js/admin/
│   └── (관리자 전용 모듈들)
├── css/ (스타일시트)
├── database/
│   ├── schema.sql (DB 스키마 v2.11) ✅
│   ├── requests_table_update_v4.3.sql (v4.3 테이블 업데이트) ✅ 🎯v4.3.0
│   ├── lesson_plan_required_migration.sql ✅
│   └── fix_rls_policies.sql ✅
└── docs/ (문서화)
    ├── CONTRIBUTING.md, DEPLOYMENT.md ✅
    ├── MIGRATION.md, TESTING.md ✅
    └── SECURITY.md ✅
```

---

## 🎉 v4.3.0 완료된 변경사항 (2025-06-24 최신)

### 🎯 **4가지 교구 신청 타입별 완전 최적화**

**✅ 1단계: 데이터베이스 구조 설계 완료**
- `requests_table_update_v4.3.sql` 완성
- 불필요한 컬럼 제거: `bundle_info`, `shipping_address`, `notes`
- 컬럼명 변경: `purchase_link` → `link`
- 새 컬럼 추가: `store_info`, `account_id`, `account_pw`

**✅ 2단계: JavaScript 백엔드 로직 완료**
- `equipment-request.js` v4.3.0 완전 구현
- 새로운 API 함수들:
  - `createV43Application` (단일 신청)
  - `createV43BundleApplication` (묶음 신청)  
  - `updateV43Application` (신청 수정)
- 4가지 타입별 데이터 구성 로직 완성

**✅ 3단계: UI 완전 최적화 완료**
- `equipment-request.html` v4.3.0 재설계
- 묶음 신청 모달 4가지 타입별 전문화:
  - 온라인 묶음: 별도 `account_id`, `account_pw` 필드
  - 오프라인 묶음: `store_info` 전용 필드
  - 구매 방식별 동적 UI 변경
  - 사용자 친화적 도움말 및 안내사항

**✅ 4단계: 이벤트 핸들러 완전 연동 완료**
- `handleBundlePurchaseMethodChange` 함수 구현
- 구매 사이트 선택 시 동적 필드 제어
- 필수/선택 필드 자동 설정
- v4.3.0 컬럼 구조와 100% 호환

### 🔥 **4가지 신청 타입별 전문화**

| 타입 | 필수 컬럼 | 선택 컬럼 | 특징 |
|------|----------|----------|------|
| **온라인 단일** | `link` | - | 구매 링크만 필요 |
| **온라인 묶음** | `link`, `account_id`, `account_pw` | - | 계정 정보로 대리 구매 |
| **오프라인 단일** | - | `store_info` | 직접 구매 |
| **오프라인 묶음** | - | `store_info` | 업체 정보 + 구매 계획 |

---

## 🗄️ Supabase 데이터베이스 구조 (v2.11 + v4.3.0)

### 📊 핵심 테이블들

**🔹 사용자 관리**:
- `user_profiles` - 학생/관리자 프로필 (59명)
- `foundation_managers` - 재단 관리자 (13명)
- `institute_managers` - 학당 관리자 (13명)

**🔹 학당 정보**:
- `institutes` - 세종학당 정보 (1개)
- `cultural_programs` - 문화프로그램 (3개)

**🔹 교구 신청 시스템**:
- `lesson_plans` - 수업계획 (1개) ⚠️ approved_at/approved_by 컬럼 제거됨
- `requests` - 교구신청 내역 (7개) 🎯v4.3.0 구조 완전 최적화
- `receipts` - 영수증 관리 (v2.11 최적화)
- `shipping_addresses` - 배송지 정보 (1개)

**🔹 예산 관리**:
- `budget_settings` - 예산 설정 (26개)
- `student_budgets` - 학생별 예산 (1개)

**🔹 시스템 설정**:
- `system_settings` - 시스템 설정 (13개)
- `feature_settings` - 기능 활성화 (3개)

### 🔑 주요 테이블 상세

#### requests (교구신청) v4.3.0 🎯 완전 최적화
```sql
- id (int, PK)
- user_id (uuid, FK → user_profiles)
- item_name, purpose, price
- purchase_type ('online' | 'offline')
- is_bundle (boolean)
- 🎯 link (TEXT) - 온라인 구매 링크 (단일: 필수, 묶음: 사이트+메모)
- 🎯 store_info (TEXT) - 오프라인 구매처 정보 (업체정보+구매계획)
- 🎯 account_id (VARCHAR(255)) - 온라인 묶음구매 계정 아이디
- 🎯 account_pw (VARCHAR(255)) - 온라인 묶음구매 계정 비밀번호 (암호화)
- status, reviewed_at, reviewed_by, rejection_reason
- 🗑️ bundle_info, shipping_address, notes (v4.3.0에서 제거)
```

---

## 🎯 다음 구현 대상

### 🔜 관리자 시스템 v4.3.0 호환성
- **equipment-management.html**: v4.3.0 새 컬럼 구조 반영
- **신청 상세 보기**: 4가지 타입별 데이터 표시 최적화
- **관리자 워크플로우**: 온라인 묶음 구매 프로세스 지원

### 🔜 학생 시스템 완성
- **flight-request.html**: 항공권 신청 페이지 UI 구현
- **모듈 연동**: 기 구현된 flight-request.js 연동
- **워크플로우**: 항공권 신청 → 관리자 승인 플로우

### 🔜 시스템 최적화
- **모바일 최적화**: 반응형 디자인 개선
- **성능 최적화**: 모듈 번들링 및 최적화
- **사용자 경험**: 인터랙션 및 애니메이션 개선

---

## 💾 기술스택 및 아키텍처 v4.3.0

### 🛠️ Frontend
- **HTML5/CSS3**: 시맨틱 마크업 및 반응형 디자인
- **Vanilla JavaScript**: ES6+ 모듈 시스템
- **Icons**: Lucide Icons
- **Architecture**: 완전 모듈화된 JavaScript 구조

### 🗄️ Backend
- **Supabase**: PostgreSQL 17.4.1
- **Authentication**: 통합 인증 시스템
- **Storage**: 파일 업로드 및 관리
- **Real-time**: 실시간 데이터 동기화

### 🔧 개발 도구
- **GitHub**: 소스코드 관리 및 배포
- **GitHub MCP**: 개발 자동화
- **Supabase MCP**: 데이터베이스 관리

### 📱 배포 환경
- **Production**: GitHub Pages
- **Database**: Supabase Cloud (ap-northeast-2)
- **CDN**: jsDelivr (Supabase JS v2)

---

## 📝 최신 커밋 히스토리 (2025-06-24 v4.3.0 완료)

1. **🔧 JavaScript 이벤트 핸들러 업데이트 v4.3.0** - 완전 연동 (09:37)
2. **🎨 v4.3.0 UI 최적화** - 4가지 교구 신청 타입별 전문화된 사용자 경험 (09:32)
3. **🔧 requests 테이블 구조 업데이트 v4.3** - 교구 신청 타입별 최적화
4. **🔐 admin.html v4.2.0 모듈화 시스템 업데이트** - 관리자용 테스트 페이지
5. **📋 dashboard.html v4.2.0 모듈화 시스템 업데이트** - 학생용 테스트 페이지
6. **🚀 supabase-client.js 모듈화 시스템 v4.2.0 완료** - 통합 매니저 배포
7. **🔐 SupabaseAdmin 모듈 생성** - v4.1.6 관리자 전용 기능 분리 완료
8. **🚀 supabase-student.js 모듈 생성** - 학생 전용 기능들 추출 및 모듈화
9. **v4.2.0 - Supabase 모듈화 1단계: supabase-core.js 생성**
10. **🔧 영수증 관련 함수 수정 v4.1.5** - 최적화된 receipts 테이블 호환

---

## 🎯 활용 가이드

### 🔍 코드 분석 시 v4.3.0
- **모듈별 접근**: Supabase 기능은 js/supabase/ 디렉토리에서 확인
- **의존성 체크**: SupabaseCore → Student/Admin → Client 순서
- **v4.3.0 호환성**: requests 테이블 새 구조 확인 필수
- **4가지 타입**: 온라인/오프라인 × 단일/묶음 조합 이해

### 🛠️ 개발 진행 시
- **모듈 우선**: 새로운 기능은 해당 전용 모듈에 추가
- **기존 기능 보호**: 교구신청 기능 최우선 보호
- **점진적 개선**: 모듈별 독립적 개선
- **테스트 필수**: 모든 변경사항은 실제 환경 테스트

### 📊 데이터베이스 작업 시
- **스키마 확인**: database/schema.sql v2.11 + v4.3.0 참조
- **마이그레이션**: database/requests_table_update_v4.3.sql 사용
- **모듈 활용**: SupabaseAdmin/Student 모듈 사용
- **RLS 정책**: 보안 정책 준수
- **백업 필수**: 모든 변경 전 백업 수행

### 🔧 v4.3.0 requests 테이블 활용
- **온라인 단일**: `link` 필드만 활용
- **온라인 묶음**: `link` + `account_id` + `account_pw` 활용  
- **오프라인 단일**: 기본 정보만 (store_info 선택적)
- **오프라인 묶음**: `store_info` 필드로 업체정보+구매계획 저장
- **타입 구분**: `is_bundle` + `purchase_type` 조합으로 판단

---

## 🚨 중요 경로 정보

**✅ 정확한 파일 경로**:
```
js/supabase/supabase-core.js
js/supabase/supabase-student.js
js/supabase/supabase-admin.js
js/student/equipment-request.js (v4.3.0 완전 최적화)
student/equipment-request.html (v4.3.0 UI 재설계)
database/requests_table_update_v4.3.sql (DB 마이그레이션)
```

---

## 🎉 v4.3.0 업데이트 완료 요약

### ✅ **완료된 작업**
1. **📊 데이터베이스 설계**: requests 테이블 v4.3.0 구조 완성
2. **⚙️ JavaScript 백엔드**: 4가지 타입별 API 및 로직 완성
3. **🎨 UI/UX 설계**: 묶음 신청 모달 완전 재설계
4. **🔗 이벤트 연동**: HTML-JavaScript 100% 연동 완료

### 🎯 **핵심 성과**
- **4가지 교구 신청 타입별 완전 전문화** 달성
- **온라인 묶음 구매**: 계정 정보 분리로 보안 강화
- **오프라인 묶음 구매**: 구조화된 업체 정보 관리
- **사용자 경험**: 타입별 최적화된 UI/UX 제공

### 📋 **남은 작업**
1. **데이터베이스 마이그레이션**: `requests_table_update_v4.3.sql` 실행
2. **관리자 시스템**: v4.3.0 새 컬럼 구조 반영
3. **최종 테스트**: 4가지 타입별 전체 워크플로우 검증

---

## 🚀 시작하기

### 사용자 접속 방법

#### 학생 사용자
1. `culturing.org/intern-system/` 접속
2. 이름과 생년월일로 로그인
3. 대시보드에서 원하는 기능 선택
4. **🆕 v4.3.0**: 4가지 교구 신청 타입별 최적화된 UI 경험

#### 관리자 사용자
1. `culturing.org/intern-system/admin.html` 접속
2. 관리자 코드로 로그인
3. 통합 관리 대시보드 사용
4. **v4.3.0**: 새로운 컬럼 구조 데이터 확인 가능

### 개발자 설정

#### 1. 저장소 클론
```bash
git clone https://github.com/faye8796/request.git
cd request
```

#### 2. Supabase 설정
`js/config.js` 파일에서 Supabase 연결 정보를 설정하세요.

#### 3. 데이터베이스 마이그레이션 (v4.3.0)
```sql
-- Supabase Dashboard → SQL Editor에서 실행
-- database/requests_table_update_v4.3.sql 내용 실행
```

#### 4. 로컬 테스트
```bash
# 간단한 HTTP 서버로 테스트
python -m http.server 8000
# 또는
npx serve
```

---

## 🎨 UI/UX 특징 v4.3.0

### 학생 대시보드
- **현대적 카드 UI**: 직관적인 메뉴 선택
- **상태 구분**: 사용 가능/준비 중 기능 명확 표시
- **반응형 디자인**: 모바일/데스크톱 최적화
- **🆕 v4.3.0**: 4가지 교구 신청 타입별 전문화된 UI

### 묶음 신청 모달 v4.3.0
- **타입별 최적화**: 온라인/오프라인 × 단일/묶음 4가지 조합
- **동적 UI**: 구매 방식 선택에 따른 실시간 필드 변경
- **보안 강화**: 계정 정보 암호화 및 안전한 저장
- **사용자 가이드**: 각 필드별 상세한 도움말 제공

### 관리자 대시보드
- **탭 시스템**: 기능별 명확한 구분
- **통합 통계**: 모든 신청 현황 한 눈에 보기
- **기존 기능 유지**: 안정성 보장
- **v4.3.0 준비**: 새로운 컬럼 구조 지원 준비

---

이 프로젝트는 **세종학당 문화인턴들의 교구신청과 파견 지원을 위한 종합 관리 시스템**으로, **v4.3.0에서 4가지 교구 신청 타입별 완전 전문화**를 달성했습니다. 온라인/오프라인 × 단일/묶음의 모든 조합에 대해 최적화된 사용자 경험을 제공하며, 모듈화된 아키텍처를 통해 지속적인 발전이 가능한 시스템입니다.