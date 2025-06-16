# 🤖 Claude 프로젝트 업데이트 가이드

> Claude가 이 프로젝트를 효율적으로 관리하고 업데이트하기 위한 종합 가이드

## 🎯 프로젝트 구조 이해

### 핵심 원칙
1. **모듈 분리**: 기능별로 명확하게 분리된 구조
2. **명확한 명명**: 파일명만 봐도 역할을 알 수 있는 네이밍
3. **의존성 관리**: 모듈 간 의존관계 명확화
4. **문서화 우선**: 모든 변경사항 문서화

### 디렉토리 역할
```
📁 config/          # 설정 파일
📁 src/core/        # 핵심 시스템 (앱의 근간)
📁 src/modules/     # 기능 모듈 (독립적 기능)
📁 src/fixes/       # 버그 수정 (기존 문제 해결)
📁 src/enhancements/ # 개선 사항 (UX/기능 향상)
📁 docs/            # 문서화
```

## 🔧 업데이트 시나리오별 가이드

### 1. 새로운 기능 추가
```bash
# 경로 선택
src/modules/module-[기능명].js
src/modules/module-[기능명].css

# 문서화
docs/components/[기능명].md
```

**예시**: 새로운 알림 시스템 추가
- `src/modules/module-notification.js`
- `src/modules/module-notification.css`
- `docs/components/notification.md`

### 2. 버그 수정
```bash
# 경로 선택
src/fixes/fix-[문제설명].js
src/fixes/fix-[문제설명].css

# 업데이트 로그
docs/updates/fix-[날짜]-[문제설명].md
```

**예시**: 로그인 폼 검증 오류 수정
- `src/fixes/fix-login-validation.js`
- `docs/updates/fix-20250616-login-validation.md`

### 3. 기존 기능 개선
```bash
# 경로 선택
src/enhancements/enhancement-[개선내용].js
src/enhancements/enhancement-[개선내용].css

# 업데이트 로그
docs/updates/enhancement-[날짜]-[개선내용].md
```

**예시**: 검색 성능 개선
- `src/enhancements/enhancement-search-performance.js`
- `docs/updates/enhancement-20250616-search-performance.md`

### 4. 핵심 시스템 수정
```bash
# 경로 (신중하게 접근)
src/core/core-[모듈명].js
src/core/core-[모듈명].css

# 필수 문서화
docs/updates/core-update-[날짜]-[변경내용].md
```

**주의사항**:
- 핵심 시스템 수정 시 전체 의존성 체크 필요
- 변경 전후 테스트 필수
- 상세한 변경 로그 작성

## 📝 Claude 업데이트 체크리스트

### ✅ 업데이트 전 확인사항
- [ ] 현재 프로젝트 구조 파악 (`PROJECT_STRUCTURE.md` 확인)
- [ ] 관련 파일들의 의존성 확인 (`FILE_MAPPING.md` 참조)
- [ ] 기존 코드의 기능과 목적 이해
- [ ] 수정할 영역이 핵심 시스템인지 확인

### ✅ 업데이트 중 수행사항
- [ ] 적절한 디렉토리에 파일 생성/수정
- [ ] 명명 규칙 준수 (prefix 사용)
- [ ] 기존 파일과의 호환성 확인
- [ ] 에러 처리 및 로깅 추가

### ✅ 업데이트 후 수행사항
- [ ] 변경사항 문서화 (`docs/updates/` 에 추가)
- [ ] HTML 파일의 스크립트 경로 업데이트 (필요시)
- [ ] 의존성 맵 업데이트 (필요시)
- [ ] 테스트 및 검증

## 🔍 파일 찾기 및 수정 가이드

### 기능별 파일 위치
```javascript
// 사용자 인증 관련
'src/core/core-auth.js'

// 데이터베이스 연동
'src/core/core-supabase.js'

// 학생 기능
'src/core/core-student.js'

// 관리자 기능
'src/core/core-admin.js'

// 수업계획 기능
'src/modules/module-lesson-plan.js'

// 공통 유틸리티
'src/core/util-common.js'

// 설정
'config/app-config.js'
```

### 스타일 파일 위치
```css
/* 메인 스타일 */
css/main.css

/* 수업계획 스타일 */
css/lesson-plan.css

/* 버그 수정 스타일 */
css/modal-fix.css

/* UX 개선 스타일 */
css/ux-enhancement.css
```

## 🚀 빠른 업데이트 템플릿

### 새 기능 추가 템플릿
```javascript
// src/modules/module-[기능명].js
/**
 * [기능명] 모듈
 * 
 * @description [기능 설명]
 * @dependencies [의존하는 모듈들]
 * @author Claude AI
 * @date [날짜]
 */

const [기능명]Manager = {
    // 초기화
    init() {
        console.log('[기능명] 모듈 초기화');
        this.setupEventListeners();
    },
    
    // 이벤트 리스너 설정
    setupEventListeners() {
        // 이벤트 리스너 코드
    },
    
    // 주요 기능 메서드들
    // ...
};

// 전역 접근
window.[기능명]Manager = [기능명]Manager;
```

### 버그 수정 템플릿
```javascript
// src/fixes/fix-[문제설명].js
/**
 * [문제설명] 버그 수정
 * 
 * @problem [해결하려는 문제]
 * @solution [해결 방법]
 * @affects [영향받는 기능들]
 * @author Claude AI
 * @date [날짜]
 */

(function() {
    'use strict';
    
    // 기존 문제 해결 코드
    
    console.log('[문제설명] 버그 수정 적용됨');
})();
```

## 💡 Claude 업데이트 팁

1. **점진적 업데이트**: 한 번에 너무 많은 변경 대신 단계별 접근
2. **기존 코드 보존**: 가능한 한 기존 구조와 호환성 유지
3. **에러 처리 강화**: 모든 새 기능에 적절한 에러 처리 추가
4. **사용자 친화적**: 기술적 에러를 사용자가 이해할 수 있는 메시지로 변환
5. **성능 고려**: 새 기능이 전체 성능에 미치는 영향 최소화

## 🔗 관련 문서
- [`PROJECT_STRUCTURE.md`](../PROJECT_STRUCTURE.md) - 전체 프로젝트 구조
- [`FILE_MAPPING.md`](FILE_MAPPING.md) - 파일 매핑 가이드
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) - 기여 가이드
- [`DEPLOYMENT.md`](../DEPLOYMENT.md) - 배포 가이드
