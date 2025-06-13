# Supabase 마이그레이션 가이드

이 문서는 기존 하드코딩된 데이터 시스템에서 Supabase 연동 시스템으로 마이그레이션하는 과정을 안내합니다.

## 📋 마이그레이션 체크리스트

### ✅ 1. Supabase 프로젝트 설정
- [ ] Supabase 계정 생성 및 새 프로젝트 생성
- [ ] 프로젝트 URL 및 ANON_KEY 확인
- [ ] `database/schema.sql` 실행하여 테이블 구조 생성
- [ ] RLS(Row Level Security) 정책 활성화 확인

### ✅ 2. 환경 설정 업데이트
- [ ] `js/config.js`에서 Supabase 설정 업데이트
- [ ] 관리자 코드 설정 (`APP.ADMIN_CODE`)
- [ ] 개발 모드 설정 확인 (`DEV.DEBUG`)

### ✅ 3. 기본 데이터 마이그레이션

#### 3.1 예산 설정 마이그레이션
기존 `data.js`의 `fieldBudgetSettings`를 Supabase로 이전:

```sql
-- 예산 설정 데이터 삽입/업데이트
INSERT INTO budget_settings (field, per_lesson_amount, max_budget_limit) VALUES
('한국어교육', 15000, 400000),
('전통문화예술', 25000, 600000),
('K-Pop 문화', 10000, 300000),
('한국현대문화', 18000, 450000),
('전통음악', 30000, 750000),
('한국미술', 22000, 550000),
('한국요리문화', 35000, 800000)
ON CONFLICT (field) DO UPDATE SET
  per_lesson_amount = EXCLUDED.per_lesson_amount,
  max_budget_limit = EXCLUDED.max_budget_limit;
```

#### 3.2 시스템 설정 마이그레이션
```sql
-- 시스템 설정 초기화
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('test_mode', 'true', 'boolean', '테스트 모드 (수업계획 편집 제한 해제)'),
('ignore_deadline', 'false', 'boolean', '마감일 무시 모드'),
('lesson_plan_deadline', '2025-12-31', 'string', '수업계획 수정 마감일'),
('lesson_plan_time', '23:59', 'string', '수업계획 수정 마감 시간'),
('notice_message', '시스템이 Supabase로 업그레이드되었습니다.', 'string', '사용자에게 표시할 공지사항')
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = NOW();
```

#### 3.3 학생 데이터 마이그레이션 (선택사항)
기존 테스트 학생 데이터가 필요한 경우:

```sql
-- 샘플 학생 데이터 (개발/테스트용)
INSERT INTO user_profiles (email, name, user_type, field, sejong_institute, birth_date) VALUES
('student1@example.com', '김민수', 'student', '한국어교육', '하노이 세종학당', '1995-03-15'),
('student2@example.com', '이영희', 'student', '전통문화예술', '방콕 세종학당', '1994-07-22'),
('student3@example.com', '박철수', 'student', 'K-Pop 문화', '마닐라 세종학당', '1996-11-08')
ON CONFLICT (email) DO NOTHING;
```

### ✅ 4. 코드 업데이트 확인
- [ ] 최신 `data.js` 파일로 업데이트 (하드코딩 제거)
- [ ] 최신 `config.js` 파일로 업데이트 (개발 도구 추가)
- [ ] 최신 `supabase-client.js` 파일로 업데이트 (에러 핸들링 개선)

### ✅ 5. 기능 테스트

#### 5.1 인증 테스트
- [ ] 학생 로그인 (이름 + 생년월일)
- [ ] 관리자 로그인 (관리자 코드)
- [ ] 로그아웃 기능

#### 5.2 학생 기능 테스트
- [ ] 수업계획 작성/저장/임시저장
- [ ] 교구 신청 (온라인/오프라인)
- [ ] 예산 현황 확인
- [ ] 영수증 제출 (오프라인 구매)

#### 5.3 관리자 기능 테스트
- [ ] 수업계획 승인/반려
- [ ] 교구 신청 승인/반려
- [ ] 예산 설정 수정
- [ ] 시스템 설정 변경
- [ ] 통계 데이터 확인
- [ ] Excel 내보내기

### ✅ 6. 성능 및 안정성 확인
- [ ] 브라우저 콘솔에서 `dev.testApiConnection()` 실행
- [ ] `await SupabaseAPI.healthCheck()` 실행하여 헬스 체크
- [ ] 네트워크 오류 시나리오 테스트
- [ ] 대용량 데이터 처리 확인

## 🔧 개발자 도구 활용

마이그레이션 후 다음 개발자 도구를 활용하여 시스템 상태를 확인할 수 있습니다:

```javascript
// 브라우저 개발자 콘솔에서 실행

// 1. 시스템 전체 상태 확인
await SupabaseAPI.healthCheck()

// 2. API 연결 테스트
dev.testApiConnection()

// 3. 설정 정보 확인
dev.printConfig()

// 4. 빠른 테스트 로그인
dev.quickLogin('student')  // 또는 'admin'

// 5. 예산 설정 확인
await DataManager.getAllFieldBudgetSettings()

// 6. 시스템 설정 확인
await DataManager.getSystemSettings()

// 7. 전체 통계 확인
await DataManager.getStats()
```

## 🚨 문제 해결

### 일반적인 문제들

#### 1. "Supabase client initialization failed" 오류
**원인**: Supabase URL 또는 API 키가 잘못되었거나, Supabase 라이브러리가 로드되지 않음
**해결방법**:
- `js/config.js`에서 URL과 ANON_KEY 확인
- 브라우저 네트워크 탭에서 Supabase CDN 로딩 확인
- CORS 설정 확인

#### 2. "학생 정보를 찾을 수 없습니다" 오류
**원인**: 데이터베이스에 학생 데이터가 없거나 이름/생년월일이 일치하지 않음
**해결방법**:
- Supabase 대시보드에서 `user_profiles` 테이블 확인
- 테스트 학생 데이터 삽입
- 입력한 이름과 생년월일 형식 확인

#### 3. RLS 정책 오류
**원인**: Row Level Security 정책이 올바르게 설정되지 않음
**해결방법**:
- `database/schema.sql`의 RLS 정책 부분 재실행
- Supabase 대시보드에서 정책 상태 확인

#### 4. 예산 계산 오류
**원인**: 예산 설정이 데이터베이스에 없거나 수업계획이 승인되지 않음
**해결방법**:
- `budget_settings` 테이블에 모든 분야 데이터 확인
- 수업계획 승인 상태 확인

### 디버깅 팁

1. **콘솔 로그 활성화**:
   ```javascript
   // config.js에서
   DEV: {
       DEBUG: true,
       ENABLE_CONSOLE_LOGS: true
   }
   ```

2. **단계별 확인**:
   ```javascript
   // 1단계: 클라이언트 초기화 확인
   console.log('Supabase client:', SupabaseAPI.client)
   
   // 2단계: 데이터베이스 연결 확인
   await SupabaseAPI.testConnection()
   
   // 3단계: 인증 테스트
   await DataManager.authenticateStudent('테스트이름', '1990-01-01')
   ```

3. **Supabase 대시보드 활용**:
   - Logs 탭에서 실시간 에러 확인
   - Table Editor에서 데이터 직접 확인
   - API 탭에서 API 사용량 모니터링

## 📈 마이그레이션 후 모니터링

### 성능 지표
- API 응답 시간 (목표: < 2초)
- 에러 발생률 (목표: < 1%)
- 동시 사용자 수 처리 능력

### 주요 확인 사항
- 실시간 데이터 동기화
- 예산 계산 정확성
- 파일 업로드 안정성
- 검색 기능 성능

## 🔄 롤백 계획

마이그레이션 중 문제가 발생할 경우를 대비한 롤백 절차:

1. **즉시 롤백**: 이전 `data.js` 파일 복원
2. **데이터 백업**: Supabase 데이터 JSON으로 내보내기
3. **설정 복원**: 기존 설정 파일들 복원

## 💡 추가 최적화

마이그레이션 완료 후 고려할 추가 개선사항:

1. **캐싱 전략**: 자주 조회되는 데이터 브라우저 캐싱
2. **이미지 최적화**: Supabase Storage 변환 기능 활용
3. **실시간 업데이트**: Supabase Realtime 구독 활용
4. **백업 자동화**: 정기적인 데이터 백업 설정

---

**마이그레이션 관련 문의사항이 있으면 GitHub Issues를 통해 연락 주세요.**
