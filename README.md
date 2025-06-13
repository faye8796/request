# 세종학당 문화교구 신청 플랫폼

## 🚀 최근 업데이트 (2025-06-13)

### 🔧 수업계획 저장 문제 해결

**문제점:**
- 수업계획 저장 시 "수업계획 저장 중 오류가 발생했습니다" 메시지가 나타나며 저장이 실패하는 문제

**원인:**
- Supabase RLS (Row Level Security) 정책이 `auth.uid()`를 사용하도록 설정되어 있었는데, 이 애플리케이션은 Supabase Auth를 사용하지 않고 자체 인증 시스템을 사용함
- `auth.uid()`가 항상 null을 반환하여 모든 데이터베이스 작업이 차단됨

**해결 방법:**
1. **RLS 정책 제거 및 비활성화**: 모든 테이블에서 RLS를 비활성화하여 자체 인증 시스템이 정상 작동하도록 수정
2. **Supabase 클라이언트 개선**: 더 나은 에러 핸들링과 디버깅 로그 추가
3. **수업계획 관리자 강화**: 상세한 디버깅 로그와 에러 메시지 개선
4. **테스트 모드 활성화**: 수업계획 편집 제한을 해제하여 언제든지 테스트 가능

### 📋 주요 변경 사항

#### 1. 데이터베이스 설정
- ✅ RLS 정책 완전 제거
- ✅ 모든 테이블에서 RLS 비활성화
- ✅ 테스트 모드 활성화

#### 2. 코드 개선
- 🔧 **js/supabase-client.js**: 향상된 에러 핸들링과 디버깅 로그
- 🔧 **js/lesson-plan.js**: 상세한 디버깅 정보와 개선된 사용자 피드백
- 📄 **database/fix_rls_policies.sql**: RLS 정책 수정 스크립트 추가

#### 3. 디버깅 도구
- 🐛 콘솔에서 상세한 로그 메시지 확인 가능
- 🐛 각 단계별 진행 상황 표시
- 🐛 에러 발생 시 구체적인 원인 제공

## 🔍 문제 해결 가이드

### 수업계획 저장이 여전히 안될 경우

1. **브라우저 개발자 도구 확인**:
   ```
   F12 → Console 탭에서 로그 메시지 확인
   ```

2. **예상되는 로그 메시지들**:
   ```
   ✅ Supabase client initialized successfully
   🎓 LessonPlanManager 초기화 시작
   📋 수업 계획표 생성 시작
   💾 임시저장 시작
   ```

3. **네트워크 연결 확인**:
   - Supabase 서버 연결 상태 확인
   - 인터넷 연결 상태 확인

4. **테스트 모드 확인**:
   - 화면에 "🧪 테스트 모드: 언제든지 수정 가능합니다." 메시지가 표시되는지 확인

### 관리자용 디버깅 명령어

개발자 도구 콘솔에서 다음 명령어들을 사용할 수 있습니다:

```javascript
// API 연결 테스트
await SupabaseAPI.testConnection()

// 현재 사용자 정보 확인
AuthManager.getCurrentUser()

// 시스템 설정 확인
await SupabaseAPI.getSystemSettings()

// 테스트 모드 토글
await SupabaseAPI.toggleTestMode()
```

## 📱 사용법

### 학생용

1. **로그인**: 이름과 생년월일로 로그인
2. **수업계획 작성**:
   - 파견 기간과 총 수업 횟수 입력
   - "수업 계획표 생성" 버튼 클릭
   - 수업별 주제와 내용 작성 (선택사항)
   - "임시 저장" 또는 "수업 계획 완료" 클릭

3. **교구 신청**: 수업계획 승인 후 교구 신청 가능

### 관리자용

1. **로그인**: 관리자 코드로 로그인
2. **수업계획 관리**: 제출된 수업계획 승인/반려
3. **교구 신청 관리**: 교구 신청 승인/반려
4. **예산 설정**: 분야별 예산 설정
5. **시스템 설정**: 수업계획 마감일 등 설정

## ⚙️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: 자체 구현 (이름 + 생년월일)
- **Deployment**: GitHub Pages 호환

## 🛠️ 개발 환경 설정

### 로컬 개발

1. 저장소 클론:
   ```bash
   git clone https://github.com/faye8796/request.git
   cd request
   ```

2. 로컬 서버 실행:
   ```bash
   # Python 3
   python -m http.server 8000
   
   # 또는 Node.js
   npx serve .
   ```

3. 브라우저에서 접속:
   ```
   http://localhost:8000
   ```

### Supabase 설정

1. **프로젝트 정보**:
   - URL: `https://aazvopacnbbkvusihqva.supabase.co`
   - 프로젝트명: `sejong-cultural-request`

2. **데이터베이스 스키마**:
   - `database/schema.sql`: 초기 스키마
   - `database/fix_rls_policies.sql`: RLS 정책 수정

3. **환경 변수**:
   - `SUPABASE_URL`: Supabase 프로젝트 URL
   - `SUPABASE_ANON_KEY`: 익명 키

## 📝 버전 히스토리

### v2.1.0 (2025-06-13)
- 🐛 수업계획 저장 문제 해결
- 🔧 RLS 정책 수정
- 📈 디버깅 도구 추가
- 🧪 테스트 모드 활성화

### v2.0.0 (이전)
- 🚀 Supabase 연동
- 📱 반응형 UI 개선
- 🔐 보안 강화

## 🆘 지원

문제가 발생하면:

1. **Issue 등록**: GitHub Issues에 문제 상황 상세히 기록
2. **로그 첨부**: 브라우저 개발자 도구의 Console 로그 캡처
3. **재현 단계**: 문제 발생 단계를 순서대로 기록

---

**개발자**: faye8796  
**라이선스**: MIT  
**최종 업데이트**: 2025-06-13
