-- Supabase Auth 마이그레이션 전략
-- 기존 사용자 경험을 유지하면서 보안 강화

-- 1. Auth 사용자 생성 함수
CREATE OR REPLACE FUNCTION create_auth_user_from_profile(
    profile_id UUID,
    profile_name TEXT,
    profile_birth_date DATE
) RETURNS TEXT AS $$
DECLARE
    generated_email TEXT;
    generated_password TEXT;
    auth_user_id UUID;
BEGIN
    -- 기존 사용자 정보로 이메일과 임시 비밀번호 생성
    generated_email := lower(replace(profile_name, ' ', '')) || '_' || 
                      to_char(profile_birth_date, 'YYYYMMDD') || '@sejong.temp';
    generated_password := encode(gen_random_bytes(12), 'base64');
    
    -- Supabase Auth에 사용자 생성 (관리자 API 사용)
    -- 실제로는 Supabase 관리 API 또는 서버 함수를 통해 수행
    
    -- user_profiles 테이블에 auth_user_id 연결
    UPDATE user_profiles 
    SET auth_user_id = auth_user_id,
        temp_password = generated_password,
        migration_status = 'auth_created'
    WHERE id = profile_id;
    
    RETURN generated_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 기존 user_profiles 테이블에 컬럼 추가
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS auth_user_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS temp_password TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS migration_status TEXT DEFAULT 'legacy';

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_user_profiles_auth_user_id ON user_profiles(auth_user_id);

-- 3. RLS 정책 (Auth 기반)
-- 기존 정책 삭제는 이미 완료되었으므로 새로운 정책 생성

-- user_profiles 정책
CREATE POLICY "Users can view own profile via auth" ON user_profiles
    FOR SELECT USING (
        auth.uid() = auth_user_id OR 
        (auth_user_id IS NULL AND user_type = 'student') -- 마이그레이션 중인 사용자
    );

CREATE POLICY "Users can update own profile via auth" ON user_profiles
    FOR UPDATE USING (auth.uid() = auth_user_id);

-- lesson_plans 정책  
CREATE POLICY "Students can manage own lesson plans via auth" ON lesson_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = lesson_plans.user_id 
            AND user_profiles.auth_user_id = auth.uid()
        )
    );

-- requests 정책
CREATE POLICY "Students can manage own requests via auth" ON requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles 
            WHERE user_profiles.id = requests.user_id 
            AND user_profiles.auth_user_id = auth.uid()
        )
    );

-- 관리자 정책 (모든 테이블)
CREATE POLICY "Admins can access all data" ON user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles admin_profile 
            WHERE admin_profile.auth_user_id = auth.uid() 
            AND admin_profile.user_type = 'admin'
        )
    );

CREATE POLICY "Admins can manage all lesson plans" ON lesson_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles admin_profile 
            WHERE admin_profile.auth_user_id = auth.uid() 
            AND admin_profile.user_type = 'admin'
        )
    );

CREATE POLICY "Admins can manage all requests" ON requests
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_profiles admin_profile 
            WHERE admin_profile.auth_user_id = auth.uid() 
            AND admin_profile.user_type = 'admin'
        )
    );

-- 4. 마이그레이션 지원 뷰
CREATE OR REPLACE VIEW student_auth_migration AS
SELECT 
    id,
    name,
    birth_date,
    field,
    auth_user_id,
    temp_password,
    migration_status,
    CASE 
        WHEN auth_user_id IS NOT NULL THEN 'migrated'
        ELSE 'pending'
    END as migration_status_computed
FROM user_profiles 
WHERE user_type = 'student';

COMMENT ON VIEW student_auth_migration IS '학생 Auth 마이그레이션 현황 조회용 뷰';
