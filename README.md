# 📋 세종학당 문화인턴 지원 시스템 - 프로젝트 지식 v4.3.1 (Updated 2025-06-25)

## 🏷️ 기본 정보

**레포지토리**: `faye8796/request`  
**현재 버전**: v4.3.1 (Database-Only Budget System Complete)  
**개발 상태**: 5단계 진행 중 (예산 설정 시스템 100% DB 기반 완료)  
**최근 업데이트**: 2025-06-25 14:35 (하드코딩 제거, 100% DB 기반 예산 설정 완성)  
**라이브 URL**: 세종학당 문화인턴 지원 시스템

---

## ✅ 파일 구조 (최신 v4.3.1)

```
request/
├── index.html (학생 로그인) ✅
├── admin.html (관리자 대시보드) ✅ 🆕v4.2  
├── admin/
│   ├── equipment-management.html (교구신청 관리) ✅ 🔧v4.3.2
│   ├── flight-management.html (항공권 관리) ✅
│   └── institute-management.html (학당정보 관리) ✅
├── student/
│   ├── dashboard.html (메뉴 선택) ✅ 🆕v4.2
│   ├── equipment-request.html (교구신청) ✅
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
│   └── supabase-admin.js (관리자 전용 기능, 41KB) ✅ 🔧v4.3.1
├── js/student/ (모듈 분할 시스템)
│   ├── api-helper.js (API 관리) ✅
│   ├── dashboard.js (대시보드 전용) ✅
│   ├── equipment-request.js (교구신청 전용) ✅
│   ├── flight-request.js (항공권신청 전용) ✅
│   ├── institute-info.js (학당정보 전용) ✅
│   ├── lesson-plan-helper.js (수업계획 도우미) ✅
│   ├── notification-system.js (알림 시스템) ✅
│   ├── receipt-management.js (영수증 관리) ✅
│   └── shipping-management.js (배송지 관리) ✅
├── js/admin/
│   ├── admin-budget.js (예산 관리 모듈) ✅ 🔧v4.3.1
│   ├── admin-enhanced-ui.js (향상된 UI 모듈) ✅ 🔧v4.3.1
│   └── (기타 관리자 전용 모듈들)
├── css/ (스타일시트)
├── database/
│   ├── schema.sql (DB 스키마 v2.11) ✅
│   ├── requests_table_update_v4.3.sql (v4.3 테이블 업데이트) ✅ 🆕
│   ├── lesson_plan_required_migration.sql ✅
│   └── fix_rls_policies.sql ✅
└── docs/ (문서화)
    ├── CONTRIBUTING.md, DEPLOYMENT.md ✅
    ├── MIGRATION.md, TESTING.md ✅
    └── SECURITY.md ✅
```

---

## 🚀 v4.3.1 주요 변경사항 (2025-06-25 최신)

### 🔧 예산 설정 시스템 하드코딩 완전 제거
**100% DB 기반 예산 설정 시스템 완성**:

**❌ 제거된 하드코딩**:
- `admin-budget.js`의 `populateBudgetSettingsForm()` 함수에서 하드코딩된 `defaultFields` 완전 제거
- `supabase-admin.js`의 `getAllFieldBudgetSettings()` 함수에서 하드코딩된 기본값 반환 로직 완전 제거

**✅ 새로운 100% DB 기반 시스템**:
- **오직 `budget_settings` 테이블 데이터만 사용**: 하드코딩된 분야별 기본값 완전 삭제
- **DB에 없는 분야는 표시하지 않음**: 관리자가 직접 DB에서 관리
- **빈 설정시 안내 메시지**: 새 분야 추가 기능 제공
- **분야 추가/삭제 기능**: 동적으로 분야 관리 가능

**🎯 하드코딩 제거 전후 비교**:
```javascript
// ❌ 기존 (하드코딩)
const defaultFields = {
    '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
    '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
    // ... 나머지 분야들
};
const finalSettings = { ...defaultFields, ...settings };

// ✅ v4.3.1 (100% DB 기반)
// 오직 DB에서 조회한 settings만 사용
if (!settings || Object.keys(settings).length === 0) {
    // 빈 설정시 안내 메시지 표시
    showEmptySettingsNotice();
    return;
}
Object.entries(settings).forEach(([field, setting]) => {
    // DB 데이터만 표시
});
```

**🆕 새로운 관리 기능**:
- **새 분야 추가**: 관리자가 실시간으로 새로운 분야 추가 가능
- **분야 삭제**: 기존 분야 삭제 기능 (확인 대화상자 포함)
- **동적 관리**: DB 중심의 완전 동적 예산 설정 관리

---

## 🚀 v4.3.0 변경사항 (requests 테이블 최적화)

### 🔧 requests 테이블 구조 대폭 업데이트
**교구 신청 타입별 최적화 완료**:

**🗑️ 제거된 컬럼들**:
- `bundle_info` (JSONB) - 묶음 구매 정보
- `shipping_address` (TEXT) - 배송지 정보  
- `notes` (TEXT) - 비고

**🔄 변경된 컬럼**:
- `purchase_link` → `link` (온라인 구매 링크)

**➕ 추가된 컬럼들**:
- `store_info` (TEXT) - 오프라인 구매처 정보
- `account_id` (VARCHAR(255)) - 온라인 묶음구매 계정 아이디
- `account_pw` (VARCHAR(255)) - 온라인 묶음구매 계정 비밀번호

**🎯 4가지 신청 타입별 최적화**:
1. **온라인 단일**: `link`(필수)
2. **온라인 묶음**: `link`(필수) + `account_id`(필수) + `account_pw`(필수)
3. **오프라인 단일**: `store_info`(선택)
4. **오프라인 묶음**: `store_info`(선택)

---

## 🚀 v4.2.0 변경사항 (Supabase 모듈화 완료)

### 📦 Supabase 모듈화 시스템 완료
기존의 거대한 `supabase-client.js` 파일을 기능별로 4개 모듈로 분할:

**🔹 핵심 아키텍처**:
- `js/supabase/supabase-core.js` (5KB) - 초기화, 에러 처리, 유틸리티 함수
- `js/supabase/supabase-student.js` (33KB) - 학생 전용 모든 기능
- `js/supabase/supabase-admin.js` (41KB) - 관리자 전용 모든 기능  
- `js/supabase-client.js` (통합 매니저) - 모든 모듈 통합 관리

**🔹 SupabaseAdmin 모듈 (v4.3.1)**:
- 📊 통계 및 대시보드 (getStats, getBudgetOverviewStats, searchApplications)
- 📚 수업계획 관리 (getPendingLessonPlans, approveLessonPlan, rejectLessonPlan)
- 💰 예산 관리 (getAllFieldBudgetSettings, updateFieldBudgetSettings) **🔧v4.3.1 하드코딩 제거**
- 📦 교구신청 관리 (getAllApplications, updateApplicationStatus)
- 📄 영수증 관리 (getAllReceipts)
- ⚙️ 시스템 설정 (getSystemSettings, updateSystemSetting, toggleTestMode)
- 🔐 관리자 인증 (authenticateAdmin)

**🔹 SupabaseStudent 모듈**:
- 학생 전용 모든 기능을 독립적으로 분리
- 기존 기능 소실 없이 안전하게 추출
- SupabaseCore 의존성 기반 설계

### 🔄 로딩 시스템 v4.3.1
- **의존성 관리**: SupabaseCore → SupabaseStudent/Admin → 통합 매니저
- **캐시 버스팅**: 모든 파일에 `v=4.3.1` 적용
- **모듈별 안전한 초기화**: 각 모듈 독립적 로딩 체크
- **호환성 보장**: 기존 코드 100% 호환성 유지

---

## 🗄️ Supabase 데이터베이스 구조 (v2.11 + v4.3)

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
- `requests` - 교구신청 내역 (7개) 🆕v4.3 구조 최적화
- `receipts` - 영수증 관리 (v2.11 최적화)
- `shipping_addresses` - 배송지 정보 (1개)

**🔹 예산 관리** 🔧v4.3.1:
- `budget_settings` - 예산 설정 (DB 전용, 하드코딩 없음)
- `student_budgets` - 학생별 예산 (1개)

**🔹 시스템 설정**:
- `system_settings` - 시스템 설정 (13개)
- `feature_settings` - 기능 활성화 (3개)

### 🔑 주요 테이블 상세

#### budget_settings (예산설정) v4.3.1 🔧
```sql
- field (VARCHAR, PK) - 분야명 (한국어교육, 전통문화예술 등)
- per_lesson_amount (INT) - 수업당 지원금액
- max_budget_limit (INT) - 최대 예산 상한
- created_at, updated_at (TIMESTAMP)
- ✅ 100% DB 기반, 하드코딩 없음
- ✅ 관리자가 동적으로 분야 추가/삭제 가능
```

#### requests (교구신청) v4.3 🆕
```sql
- id (int, PK)
- user_id (uuid, FK → user_profiles)
- item_name, purpose, price
- purchase_type ('online' | 'offline')
- is_bundle (boolean)
- 🆕 link (TEXT) - 온라인 구매 링크 (구 purchase_link)
- 🆕 store_info (TEXT) - 오프라인 구매처 정보
- 🆕 account_id (VARCHAR(255)) - 온라인 묶음구매 계정 아이디
- 🆕 account_pw (VARCHAR(255)) - 온라인 묶음구매 계정 비밀번호
- status, reviewed_at, reviewed_by, rejection_reason
- ❌ bundle_info, shipping_address, notes (v4.3에서 제거)
```

#### lesson_plans (수업계획) v2.11
```sql
- id (int, PK)
- user_id (uuid, FK → user_profiles)
- status ('draft' | 'submitted' | 'approved' | 'rejected')
- rejection_reason
- lessons (jsonb) - 수업 계획 데이터
- submitted_at
- ❌ approved_at, approved_by (v2.11에서 완전 제거)
```

---

## 🏗️ 관리자 시스템 구조 v4.3.1

### 🎯 admin.html v4.2.0 (모듈화)
- **관리자 인증**: `admin123` / `sejong2025`
- **모듈 기반 구조**: SupabaseAdmin 모듈 활용
- **테스트 페이지**: 모듈화 시스템 검증용
- **세션 관리**: localStorage 기반 안전한 인증

### 💰 AdminBudget 모듈 v4.3.1 (하드코딩 제거)
**🔧 100% DB 기반 예산 관리 시스템**:
```javascript
AdminManager.Budget = {
  // v4.3.1 하드코딩 제거 완료
  populateBudgetSettingsForm()     // 오직 DB 데이터만 사용
  showAddNewFieldDialog()          // 새 분야 추가 기능
  confirmDeleteField()             // 분야 삭제 확인
  deleteField()                    // 분야 삭제 처리
  
  // 기존 기능 유지
  loadBudgetOverview()             // 예산 현황 로드
  handleBudgetSettingsSubmit()     // 예산 설정 저장
  showFieldBudgetStatus()          // 분야별 예산 현황
}
```

### 📊 SupabaseAdmin 객체 v4.3.1 (js/supabase/supabase-admin.js)
```javascript
SupabaseAdmin = {
  // 💰 예산 관리 - v4.3.1 하드코딩 제거
  getAllFieldBudgetSettings()      // ✅ 100% DB 기반, 빈 객체 {} 반환
  updateFieldBudgetSettings()      // 예산 설정 수정
  getFieldBudgetStatus()           // 예산 현황
  
  // 통계 및 대시보드
  getStats()                       // 전체 통계
  getBudgetOverviewStats()         // 예산 현황
  searchApplications()             // 신청 검색
  
  // 수업계획 관리
  getPendingLessonPlans()          // 대기중 수업계획
  approveLessonPlan()             // 수업계획 승인
  rejectLessonPlan()              // 수업계획 반려
  
  // 교구신청 관리 (v4.3 호환)
  getAllApplications()             // 전체 신청 목록
  updateApplicationStatus()        // 신청 상태 변경
  
  // 영수증 관리
  getAllReceipts()                // 전체 영수증
  
  // 시스템 설정
  getSystemSettings()             // 시스템 설정 조회
  updateSystemSetting()           // 시스템 설정 변경
  
  // 관리자 인증
  authenticateAdmin()             // 관리자 인증
}
```

---

## 🛡️ 핵심 개발 원칙 v4.3.1

### ✅ 모듈화 아키텍처
- **Supabase 모듈 완전 분리**: Core → Student/Admin → Client
- **기존 기능 100% 보존**: 모든 기능 소실 없음
- **의존성 안전 관리**: 순차적 모듈 로딩
- **캐시 버스팅**: v4.3.1 버전 기반

### 🆕 v4.3.1 새로운 특징
- **100% DB 기반 예산 시스템**: 하드코딩된 기본값 완전 제거
- **동적 분야 관리**: 관리자가 실시간으로 분야 추가/삭제 가능
- **순수 데이터 중심**: 모든 예산 설정이 `budget_settings` 테이블에만 의존
- **오류 방지 설계**: DB에 없는 분야는 표시하지 않음

### 🔐 보안 및 인증
- **세션 관리**: localStorage 기반 안전한 인증
- **RLS 정책**: 사용자별 데이터 접근 제어
- **파일 업로드**: Supabase Storage 연동

---

## 🔄 최근 해결된 문제점들 (v4.3.1)

### ✅ 예산 설정 시스템 하드코딩 완전 제거 완료
- **admin-budget.js**: `populateBudgetSettingsForm()` 함수의 하드코딩된 `defaultFields` 완전 삭제
- **supabase-admin.js**: `getAllFieldBudgetSettings()` 함수의 하드코딩된 기본값 반환 로직 완전 삭제
- **100% DB 기반**: 오직 `budget_settings` 테이블 데이터만 사용
- **동적 관리**: 새 분야 추가/삭제 기능 구현
- **빈 설정 처리**: DB에 설정이 없을 때 적절한 안내 메시지 표시

### ✅ requests 테이블 v4.3 최적화 완료
- **4가지 신청 타입별 전문화**: 온라인/오프라인 × 단일/묶음
- **불필요한 컬럼 제거**: bundle_info, shipping_address, notes
- **명확한 컬럼명**: purchase_link → link
- **새로운 기능 지원**: 온라인 묶음구매 계정 정보

### ✅ Supabase 모듈화 시스템 완료 (v4.2)
- **supabase-client.js 분할**: 4개 전문 모듈로 완전 분리
- **SupabaseAdmin 모듈**: 관리자 전용 41KB 모듈 생성
- **SupabaseStudent 모듈**: 학생 전용 33KB 모듈 생성
- **SupabaseCore 모듈**: 공통 기능 5KB 모듈 생성

### ✅ 데이터베이스 스키마 v2.11 최적화
- **lesson_plans 테이블**: approved_at/approved_by 컬럼 완전 제거
- **receipts 테이블**: v2.11 구조로 최적화
- **중복 컬럼 제거**: 데이터베이스 성능 개선
- **NOT NULL 제약조건**: 데이터 무결성 강화

### ✅ 영수증 시스템 완전 개선 (v4.1.x)
- **파일명 시스템**: 순번_가격.확장자 형식 (예: 001_15000.jpg)
- **한글 파일명 문제**: 완전 해결
- **드래그앤드롭 UX**: 페이지 새로고침 방지, UI 피드백 강화
- **Storage 호환성**: 100% 보장

---

## 🎯 다음 구현 대상

### 🔜 학생 시스템 완성
- **flight-request.html**: 항공권 신청 페이지 UI 구현
- **모듈 연동**: 기 구현된 flight-request.js 연동
- **워크플로우**: 항공권 신청 → 관리자 승인 플로우

### 🔜 관리자 시스템 확장
- **v4.3.1 호환성**: 하드코딩 제거된 예산 시스템 반영
- **flight-management.html**: 항공권 관리 기능 강화
- **institute-management.html**: 학당 정보 수정 기능
- **실시간 대시보드**: SupabaseAdmin 모듈 활용

### 🔜 시스템 최적화
- **모바일 최적화**: 반응형 디자인 개선
- **성능 최적화**: 모듈 번들링 및 최적화
- **사용자 경험**: 인터랙션 및 애니메이션 개선

---

## 💾 기술스택 및 아키텍처 v4.3.1

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

## 📝 최신 커밋 히스토리 (2025-06-25 v4.3.1)

1. **🔧 v4.3.1 SupabaseAdmin 하드코딩 제거** - 100% DB 기반 예산 설정
2. **🔧 v4.3.1 예산 설정 하드코딩 제거** - DB 전용 로직 구현
3. **🔧 equipment-management.html v4.3 업데이트** - 캐시 버스팅 및 UI 알림 개선
4. **🎨 admin-addon.css v4.3 업데이트** - 새로운 UI 요소 스타일링 추가
5. **🚀 AdminEnhancedUI v4.3 호환성 업데이트** - requests 테이블 구조 변경 반영
6. **🔧 requests 테이블 구조 업데이트 v4.3** - 교구 신청 타입별 최적화
7. **🔐 admin.html v4.2.0 모듈화 시스템 업데이트** - 관리자용 테스트 페이지
8. **📋 dashboard.html v4.2.0 모듈화 시스템 업데이트** - 학생용 테스트 페이지
9. **🚀 supabase-client.js 모듈화 시스템 v4.2.0 완료** - 통합 매니저 배포
10. **🔐 SupabaseAdmin 모듈 생성** - v4.1.6 관리자 전용 기능 분리 완료

---

## 🎯 활용 가이드

### 🔍 코드 분석 시 v4.3.1
- **모듈별 접근**: Supabase 기능은 js/supabase/ 디렉토리에서 확인
- **의존성 체크**: SupabaseCore → Student/Admin → Client 순서
- **v4.3 호환성**: requests 테이블 새 구조 확인 필수
- **예산 시스템**: 100% DB 기반, 하드코딩 없음

### 🛠️ 개발 진행 시
- **모듈 우선**: 새로운 기능은 해당 전용 모듈에 추가
- **기존 기능 보호**: 교구신청 기능 최우선 보호
- **점진적 개선**: 모듈별 독립적 개선
- **테스트 필수**: 모든 변경사항은 실제 환경 테스트

### 📊 데이터베이스 작업 시
- **스키마 확인**: database/schema.sql v2.11 + v4.3 참조
- **마이그레이션**: database/requests_table_update_v4.3.sql 사용
- **모듈 활용**: SupabaseAdmin/Student 모듈 사용
- **RLS 정책**: 보안 정책 준수
- **백업 필수**: 모든 변경 전 백업 수행

### 🔧 v4.3 requests 테이블 활용
- **온라인 단일**: `link` 필드 활용
- **온라인 묶음**: `link` + `account_id` + `account_pw` 활용
- **오프라인 단일/묶음**: `store_info` 필드 활용
- **타입 구분**: `is_bundle` + `purchase_type` 조합으로 판단

### 💰 v4.3.1 예산 설정 활용
- **100% DB 기반**: `budget_settings` 테이블만 참조
- **동적 관리**: 관리자 UI에서 분야 추가/삭제
- **하드코딩 없음**: 모든 기본값이 DB에서 관리됨
- **빈 설정 처리**: DB에 없으면 안내 메시지 표시

---

## 🚨 주요 경로 수정사항

**❌ 기존 지식의 오류**:
```
js/supabase-core.js
js/supabase-student.js  
js/supabase-admin.js
```

**✅ 실제 정확한 경로**:
```
js/supabase/supabase-core.js
js/supabase/supabase-student.js
js/supabase/supabase-admin.js
```

---

## 🎉 v4.3.1 완성 요약

이 프로젝트는 **세종학당 문화인턴들의 교구신청과 파견 지원을 위한 종합 관리 시스템**으로, **완전 모듈화된 아키텍처**와 **최적화된 데이터베이스 구조**, 그리고 **v4.3.1에서 완성된 100% DB 기반 예산 설정 시스템**을 기반으로 지속적으로 발전하고 있습니다.

**🏆 v4.3.1의 주요 성과**:
- ✅ **예산 설정 하드코딩 완전 제거**: 모든 기본값이 DB에서 관리됨
- ✅ **100% 데이터 중심 설계**: `budget_settings` 테이블만 사용
- ✅ **동적 분야 관리**: 관리자가 실시간으로 분야 추가/삭제 가능
- ✅ **오류 방지 설계**: DB에 없는 분야는 표시하지 않음
- ✅ **깔끔한 코드베이스**: 하드코딩된 레거시 코드 완전 정리
- ✅ **유지보수성 향상**: 모든 설정이 DB 중심으로 관리됨

관리자는 이제 **완전히 DB 중심화된 예산 설정 시스템**을 통해 **하드코딩된 제약 없이** 자유롭게 분야별 예산을 관리할 수 있으며, **모든 설정이 실시간으로 반영되는 효율적인 시스템**을 활용할 수 있습니다.
