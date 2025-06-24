# 📋 세종학당 문화인턴 지원 시스템 - 프로젝트 지식 v4.3.1 (Updated 2025-06-24)

## 🏷️ 기본 정보

**레포지토리**: `faye8796/request`  
**현재 버전**: v4.3.1 (Admin UI Enhancement Complete)  
**개발 상태**: 5단계 진행 중 (교구 신청 관리자 UI 완전 최적화 완료)  
**최근 업데이트**: 2025-06-24 16:50 (AdminEnhancedUI v4.3 호환성 완료)  
**라이브 URL**: 세종학당 문화인턴 지원 시스템

---

## ✅ 파일 구조 (최신 v4.3.1)

```
request/
├── index.html (학생 로그인) ✅
├── admin.html (관리자 대시보드) ✅ 🆕v4.2  
├── admin/
│   ├── equipment-management.html (교구신청 관리) ✅ 🔧v4.3.1
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
│   └── supabase-admin.js (관리자 전용 기능, 41KB) ✅
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
│   ├── admin-enhanced-ui.js (향상된 UI 모듈) ✅ 🔧v4.3.1
│   └── (기타 관리자 전용 모듈들)
├── css/ (스타일시트)
│   ├── admin-addon.css (관리자 UI 전용) ✅ 🔧v4.3.1
│   └── (기타 스타일파일들)
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

## 🚀 v4.3.1 주요 변경사항 (2025-06-24 최신)

### 🎨 AdminEnhancedUI v4.3 완전 호환성 업데이트
**관리자 교구신청 관리 UI 대폭 개선**:

**🔧 v4.3 requests 테이블 구조 완전 호환**:
- `purchase_link` → `link` 컬럼명 변경 반영
- 새로운 v4.3 컬럼들 활용 (`store_info`, `account_id`, `account_pw`)
- 4가지 교구 신청 타입별 최적화된 UI 표시

**🎯 4가지 신청 타입별 전용 UI**:
1. **온라인 단일**: 🛒 구매링크만 깔끔하게 표시
2. **온라인 묶음**: 🛒 구매링크 + 대리구매 계정정보 노출
3. **오프라인 단일**: 🏪 구매처 정보 표시  
4. **오프라인 묶음**: 🏪 구매처 정보 표시

**✨ 새로운 UI 기능들**:
- **학생별 그룹화**: 같은 학생의 교구신청을 묶음으로 표시
- **온라인 우선 정렬**: 대리구매 효율성을 위한 스마트 정렬
- **배송지 정보 통합**: 각 학생의 배송지 정보 한눈에 확인
- **계정정보 관리**: 온라인 묶음구매 계정 아이디/비밀번호 복사/보기 기능
- **타입별 요약 배지**: 4가지 신청 타입별 색상 구분 배지
- **일괄 승인 기능**: 학생별 대기중인 모든 교구 한번에 승인

**🔐 보안 기능 강화**:
- 비밀번호 마스킹/표시 토글 버튼
- 클립보드 복사 기능 (계정정보 빠른 복사)
- 복사 완료 시각적 피드백

**📱 반응형 디자인 개선**:
- 모바일에서도 완벽한 UI 표시
- 터치 친화적인 버튼 크기 조정
- 작은 화면에서도 정보 손실 없음

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

**🔹 SupabaseAdmin 모듈 (v4.1.6)**:
- 📊 통계 및 대시보드 (getStats, getBudgetOverviewStats, searchApplications)
- 📚 수업계획 관리 (getPendingLessonPlans, approveLessonPlan, rejectLessonPlan)
- 💰 예산 관리 (getAllFieldBudgetSettings, updateFieldBudgetSettings)
- 📦 교구신청 관리 (getAllApplications, updateApplicationStatus)
- 📄 영수증 관리 (getAllReceipts)
- ⚙️ 시스템 설정 (getSystemSettings, updateSystemSetting, toggleTestMode)
- 🔐 관리자 인증 (authenticateAdmin)

**🔹 SupabaseStudent 모듈**:
- 학생 전용 모든 기능을 독립적으로 분리
- 기존 기능 소실 없이 안전하게 추출
- SupabaseCore 의존성 기반 설계

### 🔄 로딩 시스템 v4.3
- **의존성 관리**: SupabaseCore → SupabaseStudent/Admin → 통합 매니저
- **캐시 버스팅**: 모든 파일에 `v=4.3.0` 적용
- **모듈별 안전한 초기화**: 각 모듈 독립적 로딩 체크
- **호환성 보장**: 기존 코드 100% 호환성 유지

### 🎨 스크립트 로딩 순서 v4.3
```html
<!-- 1. 핵심 설정 -->
<script src="../js/config.js?v=4.3.0"></script>
<script src="../js/auth.js?v=4.3.0"></script>
<script src="../js/utils.js?v=4.3.0"></script>

<!-- 2. Supabase 모듈들 (의존성 순서) -->
<script src="../js/supabase/supabase-core.js?v=4.3.0"></script>
<script src="../js/supabase/supabase-student.js?v=4.3.0"></script>
<script src="../js/supabase/supabase-admin.js?v=4.3.0"></script>
<script src="../js/supabase-client.js?v=4.3.0"></script>

<!-- 3. 학생 모듈들 -->
<script src="../js/student/api-helper.js?v=4.3.0"></script>
<script src="../js/student/notification-system.js?v=4.3.0"></script>
<!-- ... 기타 학생 모듈들 ... -->

<!-- 4. 관리자 모듈들 -->
<script src="../js/admin/admin-enhanced-ui.js?v=4.3.0"></script>
<!-- ... 기타 관리자 모듈들 ... -->

<!-- 5. 통합 매니저 -->
<script src="../js/student.js?v=4.3.0"></script>
```

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

**🔹 예산 관리**:
- `budget_settings` - 예산 설정 (26개)
- `student_budgets` - 학생별 예산 (1개)

**🔹 시스템 설정**:
- `system_settings` - 시스템 설정 (13개)
- `feature_settings` - 기능 활성화 (3개)

### 🔑 주요 테이블 상세

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

#### receipts (영수증) v2.11 최적화
```sql
- id (int, PK)
- request_id (int, FK → requests)
- user_id (uuid, FK → user_profiles)
- receipt_number (unique)
- purchase_date, total_amount
- file_url, file_name, original_name, file_size, file_type
- purchase_store, note, uploaded_at
- verified, verified_at, verified_by
- updated_at
```

---

## 🏗️ 관리자 시스템 구조 v4.3.1

### 🎯 admin.html v4.2.0 (모듈화)
- **관리자 인증**: `admin123` / `sejong2025`
- **모듈 기반 구조**: SupabaseAdmin 모듈 활용
- **테스트 페이지**: 모듈화 시스템 검증용
- **세션 관리**: localStorage 기반 안전한 인증

### 🎨 AdminEnhancedUI v4.3.1 (완전 최적화)
**🔧 학생별 그룹화 시스템**:
```javascript
AdminEnhancedUI = {
  // v4.3 호환성
  groupApplicationsByStudent()     // 학생별 교구 묶음 표시
  loadShippingInfoForStudents()    // 배송지 정보 통합 로드
  
  // 4가지 타입별 UI
  createPurchaseInfoHTML()         // v4.3 구매 정보 표시
  getPurchaseMethodInfo()          // 타입별 배지 생성
  
  // 새로운 기능들
  copyToClipboard()               // 계정정보 복사
  togglePasswordVisibility()      // 비밀번호 보기/숨기기
  handleBulkApprove()             // 일괄 승인 처리
  
  // 향상된 검색 및 정렬
  handleEnhancedSearch()          // debounce 적용 검색
  renderGroupedApplications()      // 온라인 우선 정렬 렌더링
}
```

### 📊 SupabaseAdmin 객체 (js/supabase/supabase-admin.js)
```javascript
SupabaseAdmin = {
  // 통계 및 대시보드
  getStats()                    // 전체 통계
  getBudgetOverviewStats()      // 예산 현황
  searchApplications()          // 신청 검색
  
  // 수업계획 관리
  getPendingLessonPlans()       // 대기중 수업계획
  approveLessonPlan()          // 수업계획 승인
  rejectLessonPlan()           // 수업계획 반려
  getAllLessonPlans()          // 전체 수업계획
  
  // 예산 관리
  getAllFieldBudgetSettings()   // 예산 설정 조회
  updateFieldBudgetSettings()   // 예산 설정 수정
  getFieldBudgetStatus()        // 예산 현황
  
  // 교구신청 관리 (v4.3 호환)
  getAllApplications()          // 전체 신청 목록
  updateApplicationStatus()     // 신청 상태 변경
  updateItemStatus()           // 개별 항목 상태 변경
  
  // 영수증 관리
  getAllReceipts()             // 전체 영수증
  
  // 시스템 설정
  getSystemSettings()          // 시스템 설정 조회
  updateSystemSetting()        // 시스템 설정 변경
  toggleTestMode()             // 테스트 모드 토글
  prepareExportData()          // 데이터 내보내기
  
  // 관리자 인증
  authenticateAdmin()          // 관리자 인증
}
```

---

## 🛡️ 핵심 개발 원칙 v4.3.1

### ✅ 모듈화 아키텍처
- **Supabase 모듈 완전 분리**: Core → Student/Admin → Client
- **기존 기능 100% 보존**: 모든 기능 소실 없음
- **의존성 안전 관리**: 순차적 모듈 로딩
- **캐시 버스팅**: v4.3.0 버전 기반

### 🆕 v4.3.1 새로운 특징
- **AdminEnhancedUI 완전 최적화**: v4.3 requests 테이블 구조 100% 호환
- **4가지 신청 타입별 전문 UI**: 온라인/오프라인 × 단일/묶음 완벽 구분
- **대리구매 효율성 극대화**: 온라인 묶음구매 계정정보 노출 및 관리
- **학생별 통합 관리**: 그룹화 + 배송지 + 일괄처리 완벽 통합
- **반응형 디자인 완성**: 모든 디바이스에서 완벽한 UX

### 🔐 보안 및 인증
- **세션 관리**: localStorage 기반 안전한 인증
- **RLS 정책**: 사용자별 데이터 접근 제어
- **파일 업로드**: Supabase Storage 연동
- **계정정보 보안**: 비밀번호 마스킹 및 클립보드 보안 복사

---

## 🔄 최근 해결된 문제점들 (v4.3.1)

### ✅ AdminEnhancedUI v4.3.1 완전 최적화 완료
- **v4.3 테이블 구조 100% 호환**: purchase_link → link 변경 완전 반영
- **4가지 신청 타입별 전용 UI**: 각 타입별 최적화된 정보 표시
- **온라인 묶음구매 계정정보**: 안전한 복사/보기 기능 완성
- **학생별 그룹화 시스템**: 관리 효율성 극대화
- **배송지 정보 통합**: 한눈에 보는 배송 정보
- **일괄 승인 기능**: 대기중인 모든 교구 한번에 처리

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
- **flight-management.html**: 항공권 관리 기능 강화
- **institute-management.html**: 학당 정보 수정 기능
- **실시간 대시보드**: SupabaseAdmin 모듈 활용

### 🔜 시스템 최적화
- **모바일 최적화**: 반응형 디자인 추가 개선
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

## 📝 최신 커밋 히스토리 (2025-06-24 v4.3.1)

1. **🔧 equipment-management.html v4.3 업데이트** - 캐시 버스팅 및 UI 알림 개선
2. **🎨 admin-addon.css v4.3 업데이트** - 새로운 UI 요소 스타일링 추가
3. **🚀 AdminEnhancedUI v4.3 호환성 업데이트** - requests 테이블 구조 변경 반영
4. **🔧 requests 테이블 구조 업데이트 v4.3** - 교구 신청 타입별 최적화
5. **🔐 admin.html v4.2.0 모듈화 시스템 업데이트** - 관리자용 테스트 페이지
6. **📋 dashboard.html v4.2.0 모듈화 시스템 업데이트** - 학생용 테스트 페이지
7. **🚀 supabase-client.js 모듈화 시스템 v4.2.0 완료** - 통합 매니저 배포
8. **🔐 SupabaseAdmin 모듈 생성** - v4.1.6 관리자 전용 기능 분리 완료
9. **🚀 supabase-student.js 모듈 생성** - 학생 전용 기능들 추출 및 모듈화
10. **v4.2.0 - Supabase 모듈화 1단계: supabase-core.js 생성**

---

## 🎯 활용 가이드

### 🔍 코드 분석 시 v4.3.1
- **모듈별 접근**: Supabase 기능은 js/supabase/ 디렉토리에서 확인
- **의존성 체크**: SupabaseCore → Student/Admin → Client 순서
- **v4.3 호환성**: requests 테이블 새 구조 확인 필수
- **AdminEnhancedUI**: js/admin/admin-enhanced-ui.js에서 향상된 UI 로직 확인

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

### 🎨 AdminEnhancedUI v4.3.1 활용
- **학생별 그룹화**: `groupApplicationsByStudent()` 함수 활용
- **배송지 통합**: `loadShippingInfoForStudents()` 함수 활용
- **계정정보 관리**: `copyToClipboard()`, `togglePasswordVisibility()` 함수 활용
- **일괄 처리**: `handleBulkApprove()` 함수 활용

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

이 프로젝트는 **세종학당 문화인턴들의 교구신청과 파견 지원을 위한 종합 관리 시스템**으로, **완전 모듈화된 아키텍처**와 **최적화된 데이터베이스 구조**, 그리고 **v4.3.1에서 완성된 향상된 관리자 UI**를 기반으로 지속적으로 발전하고 있습니다.

**🏆 v4.3.1의 주요 성과**:
- ✅ **requests 테이블 v4.3 구조 100% 호환**
- ✅ **4가지 교구 신청 타입별 전문 UI 완성**
- ✅ **학생별 그룹화 시스템 완전 구현**
- ✅ **온라인 묶음구매 대리구매 최적화**
- ✅ **배송지 정보 통합 관리 완성**
- ✅ **반응형 디자인 및 UX 최적화**
- ✅ **보안 기능 강화 (비밀번호 마스킹, 안전한 복사)**

관리자는 이제 **더욱 효율적이고 직관적인 인터페이스**를 통해 학생들의 교구신청을 관리할 수 있으며, **4가지 신청 타입별로 최적화된 정보 표시**와 **학생별 통합 관리 기능**을 활용할 수 있습니다.
