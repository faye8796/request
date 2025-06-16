# 📋 Claude 친화적 파일 매핑 가이드

> 기존 파일을 새로운 구조에 어떻게 매핑했는지 설명하는 문서

## 🔄 파일 이동 및 리네이밍 매핑

### 📁 config/ (설정 파일)
- `js/config.js` → `config/app-config.js`

### 📁 src/core/ (핵심 시스템)
- `js/app.js` → `src/core/core-app.js`
- `js/admin.js` → `src/core/core-admin.js` 
- `js/student.js` → `src/core/core-student.js`
- `js/auth.js` → `src/core/core-auth.js`
- `js/supabase-client.js` → `src/core/core-supabase.js`
- `js/utils.js` → `src/core/util-common.js`
- `css/main.css` → `src/core/core-main.css`
- `css/admin.css` → `src/core/core-admin.css`
- `css/student.css` → `src/core/core-student.css`
- `css/login.css` → `src/core/core-login.css`

### 📁 src/modules/ (기능 모듈)
- `js/lesson-plan.js` → `src/modules/module-lesson-plan.js`
- `css/lesson-plan.css` → `src/modules/module-lesson-plan.css`

### 📁 src/fixes/ (버그 수정)
- `js/api-fix.js` → `src/fixes/fix-api-calls.js`
- `js/student-validation-fix.js` → `src/fixes/fix-student-validation.js`
- `css/modal-fix.css` → `src/fixes/fix-modal-overlap.css`

### 📁 src/enhancements/ (개선 사항)
- `js/purchase-validation.js` → `src/enhancements/enhancement-purchase-validation.js`
- `css/ux-enhancement.css` → `src/enhancements/enhancement-ux.css`

## 🎯 Claude 업데이트 시 참고사항

### 1. 새로운 기능 추가
- **경로**: `src/modules/module-[기능명].js/css`
- **명명**: module-접두사 사용
- **의존성**: core 파일들에 의존 가능

### 2. 버그 수정
- **경로**: `src/fixes/fix-[문제설명].js/css`
- **명명**: fix-접두사 사용
- **문서화**: 어떤 문제를 해결하는지 명시

### 3. 개선 사항
- **경로**: `src/enhancements/enhancement-[개선내용].js/css`
- **명명**: enhancement-접두사 사용
- **문서화**: 어떤 개선을 제공하는지 명시

### 4. 핵심 시스템 수정
- **경로**: `src/core/core-[모듈명].js/css`
- **주의**: 다른 모듈들이 의존하므로 신중하게 수정
- **테스트**: 수정 후 전체 시스템 동작 확인 필요

## 📝 HTML 파일 수정 필요사항

`index.html`에서 스크립트 및 스타일시트 경로를 새로운 구조에 맞게 업데이트해야 합니다:

```html
<!-- 설정 파일 -->
<script src="config/app-config.js"></script>

<!-- 핵심 시스템 CSS -->
<link rel="stylesheet" href="src/core/core-main.css">
<link rel="stylesheet" href="src/core/core-login.css">
<link rel="stylesheet" href="src/core/core-admin.css">
<link rel="stylesheet" href="src/core/core-student.css">

<!-- 핵심 시스템 JS -->
<script src="src/core/util-common.js"></script>
<script src="src/core/core-supabase.js"></script>
<script src="src/core/core-auth.js"></script>

<!-- 기능 모듈 -->
<link rel="stylesheet" href="src/modules/module-lesson-plan.css">
<script src="src/modules/module-lesson-plan.js"></script>

<!-- 수정 사항 -->
<link rel="stylesheet" href="src/fixes/fix-modal-overlap.css">
<script src="src/fixes/fix-api-calls.js"></script>
<script src="src/fixes/fix-student-validation.js"></script>

<!-- 개선 사항 -->
<link rel="stylesheet" href="src/enhancements/enhancement-ux.css">
<script src="src/enhancements/enhancement-purchase-validation.js"></script>

<!-- 핵심 애플리케이션 (마지막에 로드) -->
<script src="src/core/core-student.js"></script>
<script src="src/core/core-admin.js"></script>
<script src="src/core/core-app.js"></script>
```

## 🔗 의존성 순서

1. **설정**: `config/app-config.js`
2. **유틸리티**: `src/core/util-common.js`
3. **데이터베이스**: `src/core/core-supabase.js`
4. **인증**: `src/core/core-auth.js`
5. **기능 모듈**: `src/modules/`
6. **수정사항**: `src/fixes/`
7. **개선사항**: `src/enhancements/`
8. **핵심 앱**: `src/core/core-student.js`, `src/core/core-admin.js`
9. **메인 앱**: `src/core/core-app.js` (마지막)
