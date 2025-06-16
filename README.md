# 🎯 세종학당 문화교구 신청 플랫폼

> **Claude AI 기반 프로젝트 관리 최적화 버전** 🤖

## 📋 개요
세종학당 문화인턴들의 교구 신청을 관리하는 웹 플랫폼입니다.

## 🚀 최신 업데이트 (2025-06-16)

### 🤖 Claude 친화적 프로젝트 구조화
- **체계적 파일 정리**: 기능별, 용도별 명확한 디렉토리 구조
- **명확한 명명 규칙**: AI가 쉽게 이해할 수 있는 파일명 체계
- **완전한 문서화**: 모든 모듈과 기능에 대한 상세 문서
- **모듈별 독립성**: 각 기능을 독립적으로 관리 및 업데이트 가능

### 🔧 기존 버그 수정 및 개선사항
- **모달 중첩 문제 해결**: 다중 모달창 중첩 이슈 완전 해결
- **API 호출 안정성**: Supabase 연결 오류 및 406 에러 대응
- **구매링크 필수 처리**: 온라인 구매 시 URL 입력 강제화
- **UX 전반 개선**: 사용자 경험 향상을 위한 인터페이스 개선

## 📊 주요 기능
- **🔐 학생 인증 시스템**: 이름 + 생년월일 기반 안전한 인증
- **📝 수업계획 작성**: 필수 제출 사항으로 교구 신청 전 완료 필요
- **🛒 교구 신청 관리**: 온라인/오프라인 구매 방식 지원
- **💰 예산 관리**: 분야별 자동 예산 배정 및 사용량 추적
- **👨‍💼 관리자 대시보드**: 승인/반려, Excel 내보내기, 통계 조회

## 🛠 기술 스택
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Icons**: Lucide Icons
- **Database**: Supabase (PostgreSQL)
- **Deployment**: GitHub Pages
- **AI Management**: Claude AI 최적화 구조

## 📁 새로운 프로젝트 구조

### 🎯 Claude 친화적 구조
```
📦 request/
├── 📋 index.html                    # 메인 HTML 파일
├── 📁 config/                       # ⚙️ 설정 파일
│   └── app-config.js               # 애플리케이션 설정 (기존 config.js)
├── 📁 src/                         # 🔧 소스 코드
│   ├── 📁 core/                    # 🏛️ 핵심 시스템
│   │   ├── core-app.js            # 메인 애플리케이션 로직
│   │   ├── core-auth.js           # 인증 시스템
│   │   ├── core-supabase.js       # 데이터베이스 연동
│   │   ├── core-admin.js          # 관리자 기능
│   │   ├── core-student.js        # 학생 기능
│   │   └── util-common.js         # 공통 유틸리티
│   ├── 📁 modules/                # 🧩 기능 모듈
│   │   ├── module-lesson-plan.js  # 수업계획 기능
│   │   └── module-lesson-plan.css # 수업계획 스타일
│   ├── 📁 fixes/                  # 🔧 버그 수정
│   │   ├── fix-api-calls.js       # API 호출 오류 수정
│   │   ├── fix-modal-overlap.css  # 모달 중첩 문제 해결
│   │   └── fix-student-validation.js # 학생 검증 수정
│   └── 📁 enhancements/           # ✨ 개선 사항
│       ├── enhancement-purchase-validation.js # 구매검증 강화
│       └── enhancement-ux.css     # UX 개선
├── 📁 css/                        # 🎨 기존 스타일시트 (호환성 유지)
├── 📁 js/                         # 📜 기존 JavaScript (호환성 유지)
├── 📁 docs/                       # 📚 문서화
│   ├── PROJECT_STRUCTURE.md       # 프로젝트 구조 가이드
│   ├── FILE_MAPPING.md            # 파일 매핑 정보
│   ├── CLAUDE_UPDATE_GUIDE.md     # Claude 업데이트 가이드
│   ├── 📁 api/                    # API 문서
│   ├── 📁 components/             # 컴포넌트 문서
│   └── 📁 updates/                # 업데이트 로그
└── 📁 database/                   # 🗃️ 데이터베이스 스키마
```

### 🔄 기존 파일 호환성
- **기존 파일 유지**: `css/`, `js/` 폴더의 모든 파일 그대로 보존
- **새로운 구조 추가**: 체계적 관리를 위한 새로운 디렉토리 구조 추가
- **점진적 마이그레이션**: 필요에 따라 단계별로 새 구조로 이전 가능

## 🤖 Claude AI 최적화 특징

### 1. **명확한 파일 역할**
- `core-`: 핵심 시스템 파일
- `module-`: 독립적 기능 모듈
- `fix-`: 버그 수정 전용
- `enhancement-`: 기능 개선 전용

### 2. **모듈별 독립성**
- 각 기능을 독립적으로 수정 가능
- 의존성 최소화로 안전한 업데이트
- 롤백 및 버전 관리 용이

### 3. **완전한 문서화**
- 모든 모듈에 대한 상세 설명
- 업데이트 가이드 및 체크리스트
- Claude가 프로젝트를 쉽게 이해할 수 있는 구조

## 🚀 빠른 시작

### 1. 개발 환경 설정
```bash
git clone https://github.com/faye8796/request.git
cd request
```

### 2. 로컬 서버 실행
```bash
# Python 3
python -m http.server 8000

# Node.js
npx serve

# PHP
php -S localhost:8000
```

### 3. 브라우저에서 접속
```
http://localhost:8000
```

## 🔧 Claude 업데이트 가이드

### 새로운 기능 추가
```bash
📁 src/modules/module-[기능명].js   # JavaScript 로직
📁 src/modules/module-[기능명].css  # 스타일시트
📁 docs/components/[기능명].md      # 문서화
```

### 버그 수정
```bash
📁 src/fixes/fix-[문제설명].js      # 수정 로직
📁 docs/updates/fix-[날짜]-[문제].md # 수정 로그
```

### 기능 개선
```bash
📁 src/enhancements/enhancement-[내용].js  # 개선 로직
📁 docs/updates/enhancement-[날짜]-[내용].md # 개선 로그
```

## 🔍 개발자 도구

### 브라우저 콘솔 명령어
```javascript
// 시스템 상태 확인
checkSystemHealth()

// 디버그 정보 표시
showDebugInfo()

// 앱 정보 확인
showAppInfo()

// 개발용 빠른 로그인
dev.quickLogin('student')  // 학생 로그인
dev.quickLogin('admin')    // 관리자 로그인
```

### 설정 확인
```javascript
// 현재 설정 출력
dev.printConfig()

// API 연결 테스트
dev.testApiConnection()
```

## 📚 관련 문서

### 🎯 필수 문서
- [`📋 PROJECT_STRUCTURE.md`](PROJECT_STRUCTURE.md) - 전체 프로젝트 구조
- [`🗺️ FILE_MAPPING.md`](docs/FILE_MAPPING.md) - 파일 매핑 가이드
- [`🤖 CLAUDE_UPDATE_GUIDE.md`](docs/CLAUDE_UPDATE_GUIDE.md) - Claude 업데이트 가이드

### 📖 기술 문서
- [`🚀 DEPLOYMENT.md`](DEPLOYMENT.md) - 배포 가이드
- [`🔒 SECURITY.md`](SECURITY.md) - 보안 정책
- [`🧪 TESTING.md`](TESTING.md) - 테스트 가이드
- [`🤝 CONTRIBUTING.md`](CONTRIBUTING.md) - 기여 가이드

## 🎊 프로젝트 상태

### ✅ 완료된 개선사항
- [x] 모달 중첩 문제 해결
- [x] API 호출 안정성 확보
- [x] 구매링크 검증 강화
- [x] UX 전반적 개선
- [x] Claude 친화적 구조화
- [x] 완전한 문서화

### 🔄 현재 진행 중
- [ ] 성능 최적화
- [ ] 모바일 반응형 개선
- [ ] 접근성 향상
- [ ] 추가 기능 모듈 개발

## 🤝 기여 및 관리

### Claude AI 기반 관리
이 프로젝트는 Claude AI가 효율적으로 관리할 수 있도록 최적화되었습니다.

- **체계적 구조**: AI가 쉽게 이해할 수 있는 파일 조직
- **명확한 문서**: 모든 변경사항의 완전한 기록
- **모듈화**: 독립적이고 안전한 업데이트 가능
- **자동화 친화적**: CI/CD 및 자동 배포 준비

### 기여 방법
1. **이슈 리포트**: 버그나 개선사항 발견 시 GitHub Issues 사용
2. **풀 리퀘스트**: [CLAUDE_UPDATE_GUIDE.md](docs/CLAUDE_UPDATE_GUIDE.md) 참조
3. **문서 개선**: 문서화 개선 제안 환영

## 📞 지원

- **📋 기술 문제**: GitHub Issues
- **📖 사용법**: [문서](docs/) 참조
- **🚨 긴급 문제**: 시스템 관리자 연락

---

**📅 마지막 업데이트**: 2025년 6월 16일  
**🔖 버전**: 2.0.0 (Claude Optimized)  
**🤖 개발**: Claude AI Assistant  
**🎯 특징**: AI 친화적 프로젝트 구조 최적화

> 💡 **Claude Tip**: 이 프로젝트는 AI가 효율적으로 관리할 수 있도록 설계되었습니다. 모든 업데이트는 [`docs/CLAUDE_UPDATE_GUIDE.md`](docs/CLAUDE_UPDATE_GUIDE.md)를 참조하세요.
