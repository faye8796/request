# 📁 js/ 디렉토리 제거 안내

이 디렉토리의 모든 파일들이 새로운 모듈러 구조로 이전되었습니다.

## 🔄 파일 이전 매핑

| 기존 위치 | 새 위치 |
|-----------|----------|
| `js/admin.js` | `src/core/core-admin.js` |
| `js/student.js` | `src/core/core-student.js` |
| `js/auth.js` | `src/core/core-auth.js` |
| `js/app.js` | `src/core/core-app.js` |
| `js/supabase-client.js` | `src/core/core-supabase.js` |
| `js/utils.js` | `src/core/util-common.js` |
| `js/config.js` | `config/app-config.js` |
| `js/lesson-plan.js` | `src/modules/module-lesson-plan.js` |
| `js/purchase-validation.js` | `src/modules/module-purchase-validation.js` |
| `js/api-fix.js` | `src/fixes/fix-api-improvements.js` |
| `js/student-validation-fix.js` | `src/fixes/fix-student-validation.js` |

## ✅ 완료된 작업

- [x] 모든 파일이 새로운 구조로 이전됨
- [x] index.html의 스크립트 경로 업데이트됨
- [x] Claude 친화적 모듈러 구조 완성
- [x] 불필요한 중복 파일 제거됨

## 📋 새로운 구조 가이드

자세한 내용은 다음 문서들을 참조하세요:
- [`docs/CLAUDE_UPDATE_GUIDE.md`](../docs/CLAUDE_UPDATE_GUIDE.md)
- [`PROJECT_STRUCTURE.md`](../PROJECT_STRUCTURE.md)

이 파일은 정리 작업 완료 후 제거될 예정입니다.
