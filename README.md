# 세종학당 문화교구 신청 플랫폼 v3.0

<div align="center">
  <h3>🏛️ 세종학당 문화교구 신청 플랫폼</h3>
  <p><strong>v3.0 통합 최적화 버전</strong></p>
  <p>실시간 알림, 파일 업로드, 시스템 모니터링, 보안 강화</p>
</div>

---

## 📋 목차

- [🎯 프로젝트 개요](#-프로젝트-개요)
- [🚀 v3.0 주요 개선사항](#-v30-주요-개선사항)
- [✨ 핵심 기능](#-핵심-기능)
- [🛠️ 기술 스택](#️-기술-스택)
- [⚡ 빠른 시작](#-빠른-시작)
- [🗄️ 데이터베이스 설정](#️-데이터베이스-설정)
- [🔧 환경 설정](#-환경-설정)
- [📱 사용법](#-사용법)
- [🔒 보안](#-보안)
- [🎨 UI/UX 개선사항](#-uiux-개선사항)
- [📊 시스템 모니터링](#-시스템-모니터링)
- [🤝 기여하기](#-기여하기)
- [📞 지원](#-지원)

---

## 🎯 프로젝트 개요

세종학당 문화교구 신청 플랫폼은 전 세계 세종학당에서 활동하는 강사들이 문화교구를 체계적으로 신청하고 관리할 수 있도록 지원하는 웹 플랫폼입니다.

### 핵심 목표
- **효율적인 교구 신청 관리**: 온라인/오프라인 구매 방식 지원
- **수업계획 기반 예산 배정**: 체계적인 수업계획 검토 및 승인 시스템
- **실시간 협업**: 강사와 관리자 간 실시간 소통 및 알림
- **투명한 예산 관리**: 분야별 예산 설정 및 사용 현황 추적

---

## 🚀 v3.0 주요 개선사항

### 1. 🔧 **아키텍처 통합 및 최적화**
- **중복 파일 제거**: `auth-fixed.js`, `student-fixed.js`, `supabase-client-fixed.js` 등 중복 파일 정리
- **통합 클라이언트**: `SupabaseManager` 클래스로 모든 API 통합 관리
- **환경변수 기반 설정**: 하드코딩된 설정값들을 환경변수로 분리
- **모듈화된 구조**: 기능별 명확한 모듈 분리

### 2. 🔔 **실시간 알림 시스템**
- **즉시 알림**: 수업계획 승인/반려, 교구 신청 상태 변경 시 실시간 알림
- **알림 타입**: 중요도별 알림 분류 (일반, 중요, 긴급)
- **알림 히스토리**: 읽음/안읽음 상태 관리 및 히스토리 보관
- **자동 만료**: 시간 기반 알림 자동 정리

### 3. 📁 **파일 업로드 시스템**
- **드래그앤드롭**: 영수증 이미지 드래그앤드롭 업로드 지원
- **이미지 압축**: 자동 이미지 최적화 및 용량 관리
- **파일 보안**: 업로드 파일 타입 검증 및 해시 기반 중복 방지
- **진행률 표시**: 실시간 업로드 진행상황 표시

### 4. 📊 **시스템 모니터링 및 분석**
- **헬스 체크**: 실시간 시스템 상태 모니터링
- **성능 추적**: API 응답시간, 에러율, 캐시 효율성 추적
- **사용자 활동 분석**: 로그인 패턴, 페이지 사용량 분석
- **자동화된 보고서**: 관리자용 시스템 상태 보고서 생성

### 5. 🔐 **보안 강화**
- **로그인 보안**: 최대 시도 횟수 제한, 계정 잠금, 세션 관리
- **보안 로깅**: 모든 보안 관련 이벤트 상세 로깅
- **세션 관리**: 자동 로그아웃, 세션 타임아웃, 활동 추적
- **데이터 보호**: RLS (Row Level Security) 정책 강화

### 6. 🎨 **UI/UX 개선**
- **반응형 디자인**: 모바일/태블릿/데스크톱 완벽 지원
- **접근성 향상**: WCAG 2.1 가이드라인 준수
- **다크 모드**: 사용자 환경 설정에 따른 자동 다크 모드
- **로딩 상태**: 모든 비동기 작업에 대한 시각적 피드백

---

## ✨ 핵심 기능

### 👨‍🎓 **학생 (강사) 기능**
- ✅ **수업계획 작성**: 파견 기간별 상세 수업계획 작성 및 제출
- ✅ **교구 신청**: 온라인/오프라인 구매 방식 선택적 신청
- ✅ **예산 관리**: 실시간 예산 사용 현황 및 잔액 확인
- ✅ **배송지 관리**: 다중 배송지 설정 및 관리
- ✅ **영수증 관리**: 오프라인 구매 시 영수증 업로드 및 정산
- 🆕 **실시간 알림**: 신청 상태 변경 및 중요 공지사항 실시간 수신
- 🆕 **진행상황 추적**: 신청부터 배송까지 전 과정 실시간 추적

### 👨‍💼 **관리자 기능**
- ✅ **수업계획 검토**: 제출된 수업계획 검토 및 승인/반려
- ✅ **예산 설정**: 분야별 회당 지원금 및 최대 상한 설정
- ✅ **신청 관리**: 교구 신청 승인/반려 및 구매 처리
- ✅ **통계 및 분석**: 예산 사용 현황 및 신청 통계 분석
- ✅ **Excel 내보내기**: 모든 데이터 Excel 형태로 내보내기
- 🆕 **시스템 모니터링**: 실시간 시스템 상태 및 성능 모니터링
- 🆕 **보안 대시보드**: 로그인 시도, 보안 이벤트 모니터링
- 🆕 **자동화 도구**: 일괄 처리, 자동 알림, 데이터 정리

---

## 🛠️ 기술 스택

### **Frontend**
- **HTML5/CSS3**: 시맨틱 마크업 및 모던 CSS
- **Vanilla JavaScript**: ES6+ 기반 모듈화된 JavaScript
- **Lucide Icons**: 일관성 있는 아이콘 시스템
- **Responsive Design**: CSS Grid/Flexbox 기반 반응형 레이아웃

### **Backend & Database**
- **Supabase**: PostgreSQL 기반 백엔드 서비스
  - 실시간 데이터베이스
  - 인증 및 권한 관리
  - 파일 저장소 (Storage)
  - Row Level Security (RLS)
- **PostgreSQL**: 관계형 데이터베이스
  - 트리거 및 함수 활용
  - 인덱스 최적화
  - 자동 백업 및 복구

### **DevOps & Monitoring**
- **환경변수 관리**: 개발/프로덕션 환경 분리
- **자동 마이그레이션**: 데이터베이스 스키마 버전 관리
- **실시간 모니터링**: 성능 지표 및 오류 추적
- **보안 로깅**: 종합적인 보안 이벤트 관리

---

## ⚡ 빠른 시작

### 1. **프로젝트 클론**
```bash
git clone https://github.com/faye8796/request.git
cd request
git checkout supabase-optimization
```

### 2. **Supabase 프로젝트 설정**
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. 프로젝트 URL과 anon key 확인

### 3. **환경변수 설정**
```javascript
// index.html의 window.ENV 객체 수정 (프로덕션에서는 별도 파일)
window.ENV = {
    SUPABASE_URL: 'your-supabase-url',
    SUPABASE_ANON_KEY: 'your-supabase-anon-key',
    ADMIN_CODE: 'your-admin-code', // 보안상 복잡한 코드 사용 권장
    DEBUG: 'false', // 프로덕션에서는 false
    REALTIME_ENABLED: 'true',
    STORAGE_BUCKET: 'receipts'
};
```

### 4. **데이터베이스 마이그레이션**
```sql
-- Supabase SQL Editor에서 실행
-- 1. 기본 스키마
\i database/schema.sql

-- 2. v3.0 통합 최적화
\i database/v3_integrated_optimization.sql
```

### 5. **로컬 서버 실행**
```bash
# 간단한 HTTP 서버 실행 (Python 3)
python -m http.server 8000

# 또는 Node.js serve
npx serve .

# 브라우저에서 http://localhost:8000 접속
```

---

## 🗄️ 데이터베이스 설정

### 핵심 테이블 구조

```sql
-- 사용자 프로필
user_profiles (
    id, email, name, user_type, field, 
    sejong_institute, total_lessons, birth_date,
    notification_settings, last_login_at, login_count
)

-- 수업계획
lesson_plans (
    id, user_id, status, lessons, submitted_at,
    approved_at, approved_by, rejection_reason
)

-- 교구 신청
requests (
    id, user_id, item_name, purpose, price,
    purchase_type, purchase_link, status,
    is_bundle, shipping_address, notes
)

-- 🆕 실시간 알림
notifications (
    id, user_id, type, title, message, data,
    is_read, priority, expires_at
)

-- 🆕 파일 업로드
file_uploads (
    id, user_id, related_table, related_id,
    file_name, file_size, file_type, storage_path,
    public_url, file_hash, metadata, is_processed
)

-- 🆕 시스템 로그
system_logs (
    id, level, category, event_type, user_id,
    message, data, ip_address, user_agent,
    request_id, duration_ms
)
```

### RLS (Row Level Security) 정책

```sql
-- 사용자는 자신의 데이터만 접근 가능
CREATE POLICY "Users can view own data" ON user_profiles
    FOR SELECT USING (id = auth.uid()::uuid);

-- 알림은 수신자만 조회/수정 가능
CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- 파일은 업로드한 사용자만 접근 가능
CREATE POLICY "Users can view own files" ON file_uploads
    FOR SELECT USING (user_id = auth.uid()::uuid);
```

---

## 🔧 환경 설정

### 개발 환경
```javascript
// config.js - 개발 설정
DEBUG: true,
ENABLE_CONSOLE_LOGS: true,
QUICK_LOGIN: {
    STUDENT: { name: '김민수', birthDate: '1995-03-15' },
    ADMIN_CODE: 'admin123'
},
ANIMATION_DURATION_MS: 100, // 빠른 애니메이션
CACHE_DURATION_MS: 1000     // 짧은 캐시
```

### 프로덕션 환경
```javascript
// config.js - 프로덕션 설정
DEBUG: false,
ENABLE_CONSOLE_LOGS: false,
SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30분
MAX_LOGIN_ATTEMPTS: 5,
LOCKOUT_DURATION_MS: 15 * 60 * 1000  // 15분
```

### Supabase Storage 설정
```sql
-- receipts 버킷 생성 및 정책 설정
INSERT INTO storage.buckets (id, name, public) 
VALUES ('receipts', 'receipts', false);

-- 사용자별 업로드 권한
CREATE POLICY "Users can upload own receipts" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## 📱 사용법

### 👨‍🎓 **학생 (강사) 사용법**

#### 1. **로그인**
- 이름과 생년월일로 로그인
- 개발 모드에서는 `Ctrl+Shift+D`로 빠른 로그인 가능

#### 2. **수업계획 작성**
```javascript
// 수업계획 자동 저장 (3초마다)
const autoSave = debounce(async () => {
    await SupabaseAPI.saveLessonPlan(userId, planData, true);
    showAutoSaveStatus('saved');
}, 3000);
```

#### 3. **교구 신청**
- **온라인 구매**: 관리자가 대신 구매하여 배송
- **오프라인 구매**: 직접 구매 후 영수증 제출

#### 4. **영수증 업로드**
```javascript
// 드래그앤드롭 또는 파일 선택
const file = event.target.files[0];
const uploadResult = await SupabaseAPI.uploadFile(file, 'receipts');
if (uploadResult.success) {
    console.log('업로드 완료:', uploadResult.data.publicUrl);
}
```

### 👨‍💼 **관리자 사용법**

#### 1. **수업계획 검토**
```javascript
// 수업계획 승인
await SupabaseAPI.approveLessonPlan(studentId);

// 수업계획 반려
await SupabaseAPI.rejectLessonPlan(studentId, '반려 사유');
```

#### 2. **예산 관리**
```javascript
// 분야별 예산 설정
await SupabaseAPI.updateFieldBudgetSettings('한국어교육', {
    perLessonAmount: 15000,
    maxBudget: 400000
});
```

#### 3. **시스템 모니터링**
```javascript
// 시스템 상태 확인
const health = await SupabaseAPI.healthCheck();
console.log('시스템 상태:', health.status);

// 성능 지표 확인
const stats = await SupabaseAPI.getStats();
console.log('통계:', stats);
```

---

## 🔒 보안

### 인증 및 권한
- **이중 인증**: 이름 + 생년월일 (학생), 관리자 코드 (관리자)
- **세션 관리**: 30분 자동 타임아웃, 활동 기반 연장
- **권한 체크**: 모든 API 호출에 권한 검증

### 보안 강화 기능
```javascript
// 로그인 시도 제한
const maxAttempts = 5;
const lockoutDuration = 15 * 60 * 1000; // 15분

// 보안 로그 기록
function logSecurityEvent(event, data) {
    SupabaseAPI.recordMetric('security_event', 1, 'count', {
        event_type: event,
        user_id: data.userId,
        ip_address: data.ip,
        timestamp: new Date().toISOString()
    });
}
```

### 데이터 보호
- **RLS 정책**: 사용자별 데이터 접근 제어
- **암호화**: 민감한 데이터 암호화 저장
- **감사 로그**: 모든 중요 작업 로깅

---

## 🎨 UI/UX 개선사항

### 반응형 디자인
```css
/* 모바일 우선 설계 */
@media (max-width: 768px) {
    .stats-grid { grid-template-columns: 1fr; }
    .toast-container { left: 20px; right: 20px; }
}

/* 태블릿 */
@media (min-width: 769px) and (max-width: 1024px) {
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
}

/* 데스크톱 */
@media (min-width: 1025px) {
    .stats-grid { grid-template-columns: repeat(3, 1fr); }
}
```

### 접근성 향상
```css
/* 고대비 모드 지원 */
@media (prefers-contrast: high) {
    .btn { border-width: 2px; }
    .notification-badge { border: 2px solid white; }
}

/* 애니메이션 감소 옵션 */
@media (prefers-reduced-motion: reduce) {
    * { animation: none !important; }
}

/* 포커스 링 개선 */
.btn:focus { outline: 2px solid #4f46e5; outline-offset: 2px; }
```

### 다크 모드
```css
@media (prefers-color-scheme: dark) {
    :root {
        --bg-primary: #1f2937;
        --text-primary: #f9fafb;
        --border-color: #374151;
    }
    
    .system-status-panel { background: var(--bg-primary); }
}
```

---

## 📊 시스템 모니터링

### 성능 지표
```javascript
// API 응답시간 추적
const startTime = Date.now();
const result = await apiCall();
const duration = Date.now() - startTime;

await SupabaseAPI.recordMetric('api_response_time', duration, 'ms', {
    endpoint: 'lesson_plans',
    method: 'GET'
});
```

### 에러 추적
```javascript
// 자동 에러 리포팅
window.addEventListener('error', (event) => {
    SupabaseAPI.recordMetric('javascript_error', 1, 'count', {
        message: event.message,
        filename: event.filename,
        line: event.lineno,
        stack: event.error?.stack
    });
});
```

### 사용자 행동 분석
```javascript
// 페이지 뷰 추적
function trackPageView(page) {
    SupabaseAPI.recordMetric('page_view', 1, 'count', {
        page: page,
        user_type: AuthManager.getUserType(),
        timestamp: new Date().toISOString()
    });
}
```

---

## 🤝 기여하기

### 개발 환경 설정
```bash
# 1. 포크 및 클론
git clone https://github.com/your-username/request.git
cd request

# 2. 개발 브랜치 생성
git checkout -b feature/your-feature-name

# 3. 개발 서버 실행
python -m http.server 8000
```

### 코드 컨벤션
```javascript
// 함수명: camelCase
function handleUserLogin() { }

// 클래스명: PascalCase
class SupabaseManager { }

// 상수: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// 컴포넌트 파일: kebab-case
// auth-manager.js, lesson-plan.js
```

### Pull Request 가이드라인
1. **명확한 제목**: `[기능] 실시간 알림 시스템 추가`
2. **상세한 설명**: 변경사항과 이유 명시
3. **테스트**: 모든 기능 테스트 완료
4. **문서화**: README 및 코멘트 업데이트

---

## 📞 지원

### 문제 해결
- **GitHub Issues**: [Issues 페이지](https://github.com/faye8796/request/issues)
- **개발자 도구**: 브라우저에서 `F12` → Console 탭에서 디버그 정보 확인
- **디버그 모드**: `window.CONFIG.DEV.DEBUG = true`로 상세 로그 활성화

### 개발자 도구
```javascript
// 브라우저 콘솔에서 사용 가능한 디버그 명령어
dev.quickLogin('student');    // 빠른 학생 로그인
dev.quickLogin('admin');      // 빠른 관리자 로그인
dev.testApiConnection();      // API 연결 테스트
dev.printConfig();            // 현재 설정 출력
dev.checkCacheStatus();       // 캐시 상태 확인

// 시스템 상태 확인
SupabaseAPI.healthCheck();    // 종합 헬스 체크
AuthManager.getSecurityStats(); // 보안 통계
```

### 버전 히스토리
- **v3.0** (2025.06): 통합 최적화, 실시간 기능, 보안 강화
- **v2.1** (2024.12): Supabase 연동, 기본 기능 안정화
- **v2.0** (2024.11): 수업계획 시스템 추가
- **v1.0** (2024.10): 초기 버전 릴리스

---

<div align="center">
  <p><strong>세종학당 문화교구 신청 플랫폼 v3.0</strong></p>
  <p>Made with ❤️ for 세종학당 강사들</p>
  
  ![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)
  ![License](https://img.shields.io/badge/license-MIT-green.svg)
  ![Status](https://img.shields.io/badge/status-active-brightgreen.svg)
</div>