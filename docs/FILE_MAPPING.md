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

### 📁 src/modules/ (기능 모듈)
- `js/lesson-plan.js` → `src/modules/module-lesson-plan.js`

### 📁 src/fixes/ (버그 수정)
- `js/api-fix.js` → `src/fixes/fix-api-calls.js`
- `js/student-validation-fix.js` → `src/fixes/fix-student-validation.js`

### 📁 src/enhancements/ (개선 사항)
- `js/purchase-validation.js` → `src/enhancements/enhancement-purchase-validation.js`

## 🎯 Claude 업데이트 권장사항

**분리된 구조 유지하기**: 현재의 분리된 파일 구조를 그대로 유지하는 것을 권장합니다.

### 이유:
1. **모듈별 독립성**: 각 기능을 독립적으로 수정/업데이트 가능
2. **롤백 용이성**: 문제 발생 시 특정 기능만 쉽게 되돌릴 수 있음  
3. **버그 추적**: 문제의 원인을 빠르게 파악 가능
4. **선택적 로드**: 필요에 따라 특정 기능만 로드 가능
5. **Claude 이해도**: 각 파일의 명확한 역할로 AI가 더 정확한 업데이트 수행

### Claude 업데이트 시 장점:
- 🎯 **명확한 파일 역할**: 파일명만 봐도 기능을 이해
- 🔧 **독립적 수정**: 특정 기능만 안전하게 업데이트  
- 📝 **체계적 문서화**: 각 모듈별 명확한 문서 존재
- 🚀 **빠른 개발**: 원하는 기능을 빠르게 찾아 수정 가능
