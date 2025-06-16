# 수업계획 상태 관리 및 예산 시스템 개선 가이드

## 🚨 문제 상황 분석

### 1. 수업계획 재제출 상태 문제
- **문제**: 학생이 승인받은 수업계획을 수정하여 재제출할 때, 관리자 대시보드에서 여전히 "승인됨" 상태로 표시
- **원인**: `calculateApprovalStatus` 함수에서 `approved_at`과 `approved_by` 조건이 `status` 조건보다 우선 실행
- **결과**: 수정된 수업계획이 승인 대기 상태임에도 불구하고 관리자가 승인 처리할 수 없음

### 2. 예산 배정 시스템 한계
- **현재 방식**: 수업계획 승인 시점의 예산 설정으로 고정 배정
- **문제점**: 예산 설정 변경 시 기존 학생들에게 적용되지 않아 형평성 문제 발생

## ✅ 해결방안 구현

### 1. 수업계획 상태 관리 수정 (`js/supabase-client.js`)

#### 변경사항:
- **`saveLessonPlan` 함수 개선**: 재제출 시 승인 정보 자동 초기화
- **`getAllLessonPlans` 함수 개선**: 상태 판별 로직 수정 (status 우선)
- **`approveLessonPlan`/`rejectLessonPlan` 함수 개선**: 승인/반려 시 관련 필드 적절히 처리

#### 핵심 로직:
```javascript
// 재제출 감지 및 승인 정보 초기화
const isReSubmission = existingResult.data && 
                      existingResult.data.length > 0 && 
                      existingResult.data[0].approved_at && 
                      !isDraft;

if (isReSubmission) {
    lessonPlanData.approved_at = null;
    lessonPlanData.approved_by = null;
    lessonPlanData.rejection_reason = null;
}
```

### 2. 예산 재계산 시스템 추가 (`js/budget-recalculation-addon.js`)

#### 새로운 기능:
- **`recalculateStudentBudgets`**: 분야별 학생 예산 자동 재계산
- **`getFieldBudgetStatus`**: 분야별 예산 현황 조회 및 통계
- **향상된 `updateFieldBudgetSettings`**: 예산 설정 변경 시 자동 재계산 실행

#### 작동 방식:
1. 관리자가 예산 설정 변경
2. 확인 대화상자로 재계산 동의 확인
3. 해당 분야 모든 학생의 예산 자동 재계산
4. 사용 예산이 새 배정을 초과할 경우 적절히 조정
5. 상세한 재계산 결과 보고

### 3. 관리자 대시보드 기능 강화 (`js/admin-budget-enhancement.js`)

#### 개선사항:
- **확인 대화상자**: 예산 변경 시 영향받는 학생들에 대한 명확한 안내
- **상세 결과 표시**: 재계산된 학생 수와 분야별 통계 제공
- **분야별 현황 조회**: 각 분야의 예산 사용 현황과 학생별 상세 정보

## 🔄 적용 절차

### 1. 파일 통합 방법

#### Option A: 개별 파일 추가 (권장)
1. `js/budget-recalculation-addon.js` - 새 파일로 추가
2. `js/admin-budget-enhancement.js` - 새 파일로 추가
3. `js/supabase-client.js` - 기존 파일 대체
4. HTML에서 새 파일들 로드:
```html
<script src="js/budget-recalculation-addon.js"></script>
<script src="js/admin-budget-enhancement.js"></script>
```

#### Option B: 기존 파일 수정
1. `js/supabase-client.js`의 기존 함수들을 수정된 버전으로 교체
2. `js/admin.js`의 `handleBudgetSettingsSubmit` 함수를 개선된 버전으로 교체

### 2. 데이터베이스 마이그레이션

현재 스키마는 수정 없이 사용 가능하지만, 선택적으로 다음 개선사항 적용 가능:

```sql
-- 예산 재계산 이력 추가 (선택사항)
ALTER TABLE student_budgets 
ADD COLUMN recalculated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN recalculation_reason TEXT;

-- 수업계획 수정 이력 추가 (선택사항)
ALTER TABLE lesson_plans 
ADD COLUMN modification_count INTEGER DEFAULT 0,
ADD COLUMN last_modified_at TIMESTAMP WITH TIME ZONE;
```

## 📊 예상 효과

### 1. 수업계획 관리 개선
- ✅ 재제출된 수업계획이 관리자 대시보드에서 정확한 상태로 표시
- ✅ 승인 프로세스의 명확성 및 일관성 확보
- ✅ 수정 이력 추적 가능

### 2. 예산 관리 개선
- ✅ 예산 설정 변경 시 모든 학생에게 공정한 적용
- ✅ 실시간 예산 현황 모니터링 가능
- ✅ 분야별 예산 사용률 통계 제공
- ✅ 관리자의 예산 관리 효율성 향상

### 3. 사용자 경험 개선
- ✅ 명확한 상태 표시로 혼란 최소화
- ✅ 투명한 예산 배정 프로세스
- ✅ 상세한 피드백 및 안내 메시지

## 🧪 테스트 시나리오

### 수업계획 상태 테스트:
1. 학생이 수업계획 제출 → 상태: "제출완료"
2. 관리자가 승인 → 상태: "승인됨"  
3. 학생이 수정하여 재제출 → 상태: "제출완료" (승인됨 아님)
4. 관리자 대시보드에서 "대기 중"으로 표시되는지 확인
5. 관리자가 재승인 가능한지 확인

### 예산 재계산 테스트:
1. 특정 분야 예산 설정 변경 (예: 회당 15,000원 → 25,000원)
2. 확인 대화상자에서 재계산 동의
3. 해당 분야 학생들의 예산이 자동으로 업데이트되는지 확인
4. 사용 예산이 새 배정을 초과하는 경우 적절히 처리되는지 확인
5. 재계산 결과 메시지가 정확히 표시되는지 확인

## ⚠️ 주의사항

1. **백업 필수**: 수정 전 반드시 데이터베이스 백업
2. **점진적 적용**: 테스트 환경에서 충분한 검증 후 프로덕션 적용
3. **사용자 안내**: 예산 재계산 기능 도입 시 관리자 및 학생들에게 사전 안내
4. **모니터링**: 적용 후 시스템 로그 및 사용자 피드백 모니터링

## 📞 추가 지원

문제 발생 시 다음 정보와 함께 문의:
- 브라우저 콘솔 에러 메시지
- 수행한 작업의 단계별 설명  
- 예상 결과와 실제 결과의 차이점
- 관련 사용자 ID 및 타임스탬프
