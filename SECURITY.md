# 보안 설정 가이드

이 문서는 세종학당 문화교구 신청 플랫폼의 보안 설정 방법을 설명합니다.

## 🔒 환경변수 설정

### 개발 환경
개발 환경에서는 `js/config.js` 파일에 설정이 하드코딩되어 있습니다. 이는 개발과 테스트 목적으로만 사용해야 합니다.

### 프로덕션 환경

#### 방법 1: 환경변수 파일 (권장)
프로덕션 환경에서는 별도의 환경변수 파일을 생성하여 보안 정보를 관리하세요.

1. **env.js 파일 생성**
```javascript
// env.js (이 파일은 Git에 포함하지 말 것!)
window.ENV = {
    SUPABASE_URL: 'your-production-supabase-url',
    SUPABASE_ANON_KEY: 'your-production-anon-key'
};
```

2. **index.html에서 로드**
```html
<!-- 프로덕션 환경변수 (config.js 이전에 로드) -->
<script src="js/env.js"></script>
<script src="js/config.js"></script>
```

3. **.gitignore에 추가**
```
js/env.js
```

#### 방법 2: 빌드 시 환경변수 주입
CI/CD 파이프라인에서 빌드 시 환경변수를 주입하는 방법:

```bash
# GitHub Actions 예시
- name: Replace environment variables
  run: |
    sed -i "s|PLACEHOLDER_SUPABASE_URL|${{ secrets.SUPABASE_URL }}|g" js/config.js
    sed -i "s|PLACEHOLDER_SUPABASE_ANON_KEY|${{ secrets.SUPABASE_ANON_KEY }}|g" js/config.js
```

#### 방법 3: 서버사이드 환경변수 (Node.js/Express)
Express 서버를 사용하는 경우:

```javascript
// server.js
app.get('/config', (req, res) => {
    res.json({
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY
    });
});
```

```javascript
// config.js 수정
async function loadConfig() {
    try {
        const response = await fetch('/config');
        const config = await response.json();
        window.ENV = config;
    } catch (error) {
        console.error('Failed to load config:', error);
    }
}
```

## 🛡️ Supabase 보안 설정

### Row Level Security (RLS) 정책

#### 1. 사용자 프로필 테이블
```sql
-- user_profiles 테이블 RLS 활성화
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 정보만 볼 수 있음
CREATE POLICY "Students can view own profile" ON user_profiles
    FOR SELECT USING (
        auth.role() = 'authenticated' AND 
        user_type = 'student' AND 
        id = auth.uid()
    );

-- 관리자는 모든 정보를 볼 수 있음  
CREATE POLICY "Admins can view all profiles" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );
```

#### 2. 교구 신청 테이블
```sql
-- requests 테이블 RLS 활성화
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 신청만 볼 수 있음
CREATE POLICY "Students can manage own requests" ON requests
    FOR ALL USING (user_id = auth.uid());

-- 관리자는 모든 신청을 볼 수 있음
CREATE POLICY "Admins can view all requests" ON requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );
```

#### 3. 수업계획 테이블
```sql
-- lesson_plans 테이블 RLS 활성화
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;

-- 학생은 자신의 수업계획만 관리
CREATE POLICY "Students can manage own lesson plans" ON lesson_plans
    FOR ALL USING (user_id = auth.uid());

-- 관리자는 모든 수업계획을 볼 수 있음
CREATE POLICY "Admins can view all lesson plans" ON lesson_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        )
    );
```

### API 키 권한 설정

#### Anonymous Key 권한 (public role)
```sql
-- 읽기 권한만 부여
GRANT SELECT ON user_profiles TO anon;
GRANT SELECT ON requests TO anon;
GRANT SELECT ON lesson_plans TO anon;
GRANT SELECT ON budget_settings TO anon;

-- 쓰기 권한은 제한적으로 부여
GRANT INSERT ON requests TO anon;
GRANT UPDATE ON requests TO anon;
```

#### Service Role Key (관리자 전용)
서비스 롤 키는 서버사이드에서만 사용하고, 클라이언트에서는 절대 노출하지 마세요.

## 🔐 추가 보안 조치

### 1. HTTPS 강제
```javascript
// config.js에 추가
if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
    location.replace(`https:${location.href.substring(location.protocol.length)}`);
}
```

### 2. Content Security Policy (CSP)
```html
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; 
               script-src 'self' 'unsafe-inline' https://unpkg.com; 
               style-src 'self' 'unsafe-inline'; 
               img-src 'self' data:; 
               connect-src 'self' https://*.supabase.co;">
```

### 3. 입력값 검증
```javascript
// utils.js에 추가
function sanitizeInput(input) {
    if (typeof input !== 'string') return input;
    
    return input
        .replace(/[<>]/g, '') // HTML 태그 제거
        .replace(/javascript:/gi, '') // JavaScript 스키마 제거
        .trim();
}
```

### 4. 세션 관리
```javascript
// auth.js에 추가
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30분

function setupSessionTimeout() {
    let sessionTimer;
    
    function resetTimer() {
        clearTimeout(sessionTimer);
        sessionTimer = setTimeout(() => {
            SupabaseAPI.logout();
            window.location.reload();
        }, SESSION_TIMEOUT);
    }
    
    // 사용자 활동 감지
    document.addEventListener('click', resetTimer);
    document.addEventListener('keypress', resetTimer);
    
    resetTimer();
}
```

## 📋 보안 체크리스트

### 배포 전 확인사항
- [ ] API 키가 하드코딩되지 않았는지 확인
- [ ] .gitignore에 보안 파일들이 추가되었는지 확인
- [ ] Supabase RLS 정책이 모든 테이블에 적용되었는지 확인
- [ ] HTTPS가 강제로 설정되었는지 확인
- [ ] CSP 헤더가 설정되었는지 확인
- [ ] 입력값 검증이 모든 폼에 적용되었는지 확인
- [ ] 세션 타임아웃이 설정되었는지 확인

### 정기 보안 점검
- [ ] API 키 교체 (3개월마다)
- [ ] 접근 로그 검토 (월 1회)
- [ ] 보안 정책 업데이트 확인 (월 1회)
- [ ] 의존성 패키지 보안 업데이트 (월 1회)

## 🚨 보안 사고 대응

### API 키 노출 시
1. 즉시 Supabase 대시보드에서 API 키 교체
2. 새로운 키로 애플리케이션 업데이트
3. 이전 키로 이루어진 접근 로그 검토
4. 필요시 사용자들에게 비밀번호 변경 안내

### 데이터 유출 의심 시
1. 즉시 Supabase RLS 정책 점검
2. 접근 로그 분석
3. 영향받은 사용자 식별
4. 관련 기관에 보고

## 📞 지원 연락처

보안 관련 문의나 사고 신고:
- 기술팀: tech-security@sejong.or.kr
- 긴급 상황: +82-2-XXXX-XXXX

---

**중요**: 이 가이드의 모든 보안 설정을 프로덕션 배포 전에 반드시 적용하세요.
