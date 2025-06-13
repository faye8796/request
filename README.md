# 세종학당 문화교구 신청 플랫폼 v2.0

## 📋 프로젝트 개요

세종학당 해외 파견 교사들이 문화교구를 신청하고 관리할 수 있는 웹 기반 플랫폼입니다. Supabase 백엔드와 연동하여 실시간 데이터 관리를 지원합니다.

## 🚀 주요 기능

### 학생(교사) 기능
- **인증**: 이름 + 생년월일로 간편 로그인
- **수업계획 작성**: 파견 기간 중 수업 계획 등록 및 관리
- **교구 신청**: 온라인/오프라인 구매 방식 선택 가능
- **예산 관리**: 실시간 예산 현황 확인
- **영수증 제출**: 오프라인 구매 시 영수증 업로드
- **배송지 관리**: 교구 배송을 위한 주소 설정

### 관리자 기능
- **신청 승인**: 교구 신청 검토 및 승인/반려
- **수업계획 관리**: 교사 수업계획 승인 시스템
- **예산 설정**: 분야별 예산 배정 및 관리
- **통계 대시보드**: 신청 현황 및 예산 사용 통계
- **Excel 내보내기**: 전체 데이터 내보내기 기능
- **시스템 설정**: 마감일, 테스트 모드 등 설정 관리

## 🏗️ 기술 스택

- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Backend**: Supabase (PostgreSQL + Real-time API)
- **Authentication**: Custom 인증 시스템
- **Storage**: Supabase Storage (영수증 이미지)
- **Icons**: Lucide Icons
- **Build**: 별도 빌드 도구 없이 바닐라 웹 기술 사용

## 📂 프로젝트 구조

```
request/
├── index.html              # 메인 페이지
├── css/                    # 스타일시트
│   ├── main.css           # 기본 스타일
│   ├── login.css          # 로그인 페이지 스타일
│   ├── student.css        # 학생 페이지 스타일
│   └── admin.css          # 관리자 페이지 스타일
├── js/                     # JavaScript 파일
│   ├── config.js          # 설정 및 환경변수
│   ├── supabase-client.js # Supabase API 클라이언트
│   ├── data.js            # 데이터 관리 레이어
│   ├── utils.js           # 유틸리티 함수
│   ├── auth.js            # 인증 관리
│   ├── lesson-plan.js     # 수업계획 관리
│   ├── student.js         # 학생 기능
│   ├── admin.js           # 관리자 기능
│   └── app.js             # 메인 애플리케이션
├── database/
│   └── schema.sql         # 데이터베이스 스키마
├── README.md              # 프로젝트 문서
├── DEPLOYMENT.md          # 배포 가이드
├── CONTRIBUTING.md        # 기여 가이드
└── SECURITY.md            # 보안 가이드
```

## 🔧 설치 및 설정

### 1. 레포지토리 클론
```bash
git clone https://github.com/faye8796/request.git
cd request
```

### 2. Supabase 프로젝트 설정
1. [Supabase](https://supabase.com)에서 새 프로젝트 생성
2. `database/schema.sql` 파일을 실행하여 데이터베이스 구조 생성
3. Supabase 프로젝트 URL과 API 키 확인

### 3. 환경 설정
`js/config.js` 파일에서 Supabase 설정 업데이트:
```javascript
const CONFIG = {
    SUPABASE: {
        URL: 'YOUR_SUPABASE_URL',
        ANON_KEY: 'YOUR_SUPABASE_ANON_KEY'
    },
    APP: {
        ADMIN_CODE: 'YOUR_ADMIN_CODE' // 관리자 인증 코드
    }
};
```

### 4. 웹 서버 실행
정적 파일 서버로 실행 (예: VS Code Live Server, Python HTTP 서버 등)

```bash
# Python 3
python -m http.server 8000

# Node.js http-server
npx http-server

# VS Code Live Server 확장 사용 (권장)
```

## 🗄️ 데이터베이스 구조

### 주요 테이블
- **user_profiles**: 사용자(학생/관리자) 정보
- **lesson_plans**: 수업계획 데이터
- **requests**: 교구 신청 내역
- **student_budgets**: 학생별 예산 배정
- **budget_settings**: 분야별 예산 설정
- **receipts**: 영수증 정보
- **system_settings**: 시스템 설정

### 데이터 관계
```
user_profiles (1) → (N) lesson_plans
user_profiles (1) → (N) requests
user_profiles (1) → (1) student_budgets
requests (1) → (N) receipts
```

## 🔑 주요 개선사항 (v2.0)

### ✅ 하드코딩된 데이터 제거
- `data.js`의 모의 데이터를 모두 제거
- 모든 데이터를 Supabase에서 실시간으로 조회
- 일관된 데이터 소스 사용으로 안정성 향상

### ✅ 에러 핸들링 개선
- 상세한 에러 로깅 시스템 구축
- 사용자 친화적인 에러 메시지 제공
- 네트워크 오류 및 타임아웃 처리

### ✅ 성능 최적화
- 병렬 데이터 조회로 로딩 시간 단축
- 불필요한 API 호출 최소화
- 효율적인 데이터 캐싱 전략

### ✅ 개발자 도구 추가
- 브라우저 콘솔에서 빠른 테스트 가능
- 개발 모드에서 상세 로깅 지원
- API 연결 상태 실시간 모니터링

## 🔧 개발 도구 사용법

브라우저 개발자 콘솔에서 다음 명령어를 사용할 수 있습니다:

```javascript
// 빠른 로그인 (개발 모드)
dev.quickLogin('student')  // 학생 로그인
dev.quickLogin('admin')    // 관리자 로그인

// API 연결 테스트
dev.testApiConnection()

// 설정 정보 출력
dev.printConfig()

// 헬스 체크
await SupabaseAPI.healthCheck()
```

## 🛡️ 보안 고려사항

- **RLS (Row Level Security)**: Supabase에서 데이터 접근 제어
- **환경변수**: 민감한 정보는 환경변수로 관리
- **입력 검증**: 클라이언트 및 서버 단에서 이중 검증
- **세션 관리**: 브라우저 기반 세션 관리 (쿠키 없음)

## 📈 모니터링 및 로깅

### 개발 모드 로깅
`config.js`에서 `DEV.ENABLE_CONSOLE_LOGS: true`로 설정하면:
- API 호출 성공/실패 로그
- 데이터 조회 결과 통계
- 에러 상세 정보 및 컨텍스트

### 운영 환경
- Supabase Dashboard에서 실시간 로그 확인
- 데이터베이스 성능 모니터링
- API 사용량 및 요청 추적

## 🚀 배포

### 정적 호스팅
- **Vercel**: `vercel --prod`
- **Netlify**: 자동 배포 설정
- **GitHub Pages**: Actions를 통한 자동 배포

### 환경 변수 설정
배포 플랫폼에서 다음 환경 변수 설정:
- `SUPABASE_URL`: Supabase 프로젝트 URL
- `SUPABASE_ANON_KEY`: Supabase 익명 키
- `DEBUG`: 디버그 모드 활성화 여부

## 🤝 기여 방법

1. 이 레포지토리를 포크합니다
2. 새 기능 브랜치를 생성합니다 (`git checkout -b feature/AmazingFeature`)
3. 변경사항을 커밋합니다 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 푸시합니다 (`git push origin feature/AmazingFeature`)
5. Pull Request를 생성합니다

## 📝 라이선스

이 프로젝트는 MIT 라이선스 하에 있습니다. 자세한 내용은 `LICENSE` 파일을 참고하세요.

## 📞 지원 및 문의

- **Issues**: GitHub Issues를 통한 버그 신고 및 기능 제안
- **Documentation**: Wiki 페이지에서 상세 문서 확인
- **Contact**: 프로젝트 관리자에게 직접 연락

## 🎯 로드맵

### 단기 목표 (v2.1)
- [ ] 실시간 알림 시스템
- [ ] 모바일 반응형 개선
- [ ] 다국어 지원 (영어, 베트남어)

### 중기 목표 (v3.0)
- [ ] 파일 첨부 기능 개선
- [ ] 승인 워크플로우 고도화
- [ ] 자동 번역 기능

### 장기 목표
- [ ] 모바일 앱 개발
- [ ] AI 기반 교구 추천
- [ ] 블록체인 기반 투명성 확보

---

**Made with ❤️ for 세종학당 교사들**
