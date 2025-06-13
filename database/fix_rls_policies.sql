-- Supabase RLS 정책 수정 - 자체 인증 시스템 지원
-- 기존 정책들을 삭제하고 공개 액세스 정책으로 변경

-- 기존 RLS 정책 삭제
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Students can manage own lesson plans" ON lesson_plans;
DROP POLICY IF EXISTS "Students can manage own requests" ON requests;
DROP POLICY IF EXISTS "Students can manage own receipts" ON receipts;
DROP POLICY IF EXISTS "Students can view own budget" ON student_budgets;
DROP POLICY IF EXISTS "Anyone can view budget settings" ON budget_settings;
DROP POLICY IF EXISTS "Anyone can view system settings" ON system_settings;

-- 새로운 공개 액세스 정책 생성 (자체 인증 시스템 지원)
-- 사용자 프로필
CREATE POLICY "Public access for user_profiles" ON user_profiles
    FOR ALL USING (true);

-- 수업계획
CREATE POLICY "Public access for lesson_plans" ON lesson_plans
    FOR ALL USING (true);

-- 예산 설정
CREATE POLICY "Public access for budget_settings" ON budget_settings
    FOR ALL USING (true);

-- 학생 예산
CREATE POLICY "Public access for student_budgets" ON student_budgets
    FOR ALL USING (true);

-- 교구 신청
CREATE POLICY "Public access for requests" ON requests
    FOR ALL USING (true);

-- 영수증
CREATE POLICY "Public access for receipts" ON receipts
    FOR ALL USING (true);

-- 시스템 설정
CREATE POLICY "Public access for system_settings" ON system_settings
    FOR ALL USING (true);

-- 또는 RLS를 완전히 비활성화 (더 간단한 방법)
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE lesson_plans DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE budget_settings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE student_budgets DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE receipts DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE system_settings DISABLE ROW LEVEL SECURITY;
