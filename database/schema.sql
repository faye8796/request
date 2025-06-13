-- 세종학당 문화교구 신청 플랫폼 데이터베이스 스키마
-- Supabase PostgreSQL 기반

-- UUID 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. 사용자 프로필 테이블
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('student', 'admin')),
    field VARCHAR(50), -- 전공 분야
    sejong_institute VARCHAR(100), -- 소속 세종학당
    birth_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 수업계획 테이블
CREATE TABLE lesson_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    lessons JSONB, -- 수업 계획 데이터 (JSON 형태)
    submitted_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by UUID REFERENCES user_profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 예산 설정 테이블
CREATE TABLE budget_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    field VARCHAR(50) NOT NULL UNIQUE, -- 전공 분야
    per_lesson_amount INTEGER NOT NULL DEFAULT 0, -- 회당 지원금
    max_budget_limit INTEGER NOT NULL DEFAULT 0, -- 최대 예산 상한
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 학생 예산 배정 테이블
CREATE TABLE student_budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    field VARCHAR(50) NOT NULL, -- 전공 분야
    allocated_budget INTEGER NOT NULL DEFAULT 0, -- 배정된 예산
    used_budget INTEGER NOT NULL DEFAULT 0, -- 사용된 예산
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 5. 교구 신청 테이블
CREATE TABLE requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL, -- 교구명
    purpose TEXT NOT NULL, -- 사용 목적
    price INTEGER NOT NULL, -- 가격
    purchase_type VARCHAR(20) NOT NULL DEFAULT 'online' CHECK (purchase_type IN ('online', 'offline')),
    purchase_link TEXT, -- 구매 링크
    is_bundle BOOLEAN DEFAULT false, -- 묶음 여부
    bundle_info JSONB, -- 묶음 구매 정보
    shipping_address TEXT, -- 배송지
    notes TEXT, -- 비고
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'purchased', 'completed')),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    reviewed_by UUID REFERENCES user_profiles(id),
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 영수증 테이블
CREATE TABLE receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    receipt_number VARCHAR(50) NOT NULL UNIQUE, -- 영수증 번호
    image_path TEXT NOT NULL, -- 영수증 이미지 (Base64 또는 URL)
    purchase_date TIMESTAMP WITH TIME ZONE, -- 구매 일시
    store_name VARCHAR(255), -- 구매처
    total_amount INTEGER DEFAULT 0, -- 총 금액
    notes TEXT, -- 비고
    verified BOOLEAN DEFAULT false, -- 검증 여부
    verified_at TIMESTAMP WITH TIME ZONE,
    verified_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 시스템 설정 테이블
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE, -- 설정 키
    setting_value TEXT, -- 설정 값
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT, -- 설정 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_field ON user_profiles(field);
CREATE INDEX idx_lesson_plans_user_id ON lesson_plans(user_id);
CREATE INDEX idx_lesson_plans_status ON lesson_plans(status);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_purchase_type ON requests(purchase_type);
CREATE INDEX idx_receipts_request_id ON receipts(request_id);
CREATE INDEX idx_receipts_verified ON receipts(verified);
CREATE INDEX idx_student_budgets_user_id ON student_budgets(user_id);

-- Row Level Security (RLS) 정책 설정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- 사용자 프로필 RLS 정책
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (id = auth.uid());

-- 수업계획 RLS 정책
CREATE POLICY "Students can manage own lesson plans" ON lesson_plans
    FOR ALL USING (user_id = auth.uid());

-- 교구 신청 RLS 정책
CREATE POLICY "Students can manage own requests" ON requests
    FOR ALL USING (user_id = auth.uid());

-- 영수증 RLS 정책
CREATE POLICY "Students can manage own receipts" ON receipts
    FOR ALL USING (user_id = auth.uid());

-- 학생 예산 RLS 정책
CREATE POLICY "Students can view own budget" ON student_budgets
    FOR SELECT USING (user_id = auth.uid());

-- 예산 설정 읽기 권한 (모든 사용자)
CREATE POLICY "Anyone can view budget settings" ON budget_settings
    FOR SELECT USING (true);

-- 시스템 설정 읽기 권한 (모든 사용자)
CREATE POLICY "Anyone can view system settings" ON system_settings
    FOR SELECT USING (true);

-- 기본 데이터 삽입

-- 예산 설정 기본값
INSERT INTO budget_settings (field, per_lesson_amount, max_budget_limit) VALUES
('한국어교육', 15000, 400000),
('전통문화예술', 25000, 600000),
('K-Pop 문화', 10000, 300000),
('한국현대문화', 18000, 450000),
('전통음악', 30000, 750000),
('한국미술', 22000, 550000),
('한국요리문화', 35000, 800000);

-- 시스템 설정 기본값
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('test_mode', 'false', 'boolean', '테스트 모드 (수업계획 편집 제한 해제)'),
('ignore_deadline', 'false', 'boolean', '마감일 무시 모드'),
('lesson_plan_deadline', '2025-12-31', 'string', '수업계획 수정 마감일'),
('lesson_plan_time', '23:59', 'string', '수업계획 수정 마감 시간'),
('notice_message', '', 'string', '사용자에게 표시할 공지사항');

-- 트리거 함수 생성 (updated_at 자동 업데이트)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 모든 테이블에 updated_at 트리거 적용
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lesson_plans_updated_at BEFORE UPDATE ON lesson_plans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_budget_settings_updated_at BEFORE UPDATE ON budget_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_student_budgets_updated_at BEFORE UPDATE ON student_budgets 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_requests_updated_at BEFORE UPDATE ON requests 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_receipts_updated_at BEFORE UPDATE ON receipts 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (개발/테스트용)
-- 관리자 계정
INSERT INTO user_profiles (email, name, user_type) VALUES
('admin@sejong.or.kr', '관리자', 'admin');

-- 샘플 학생 데이터 (테스트용)
INSERT INTO user_profiles (email, name, user_type, field, sejong_institute, birth_date) VALUES
('student1@example.com', '김민수', 'student', '한국어교육', '하노이 세종학당', '1995-03-15'),
('student2@example.com', '이영희', 'student', '전통문화예술', '방콕 세종학당', '1994-07-22'),
('student3@example.com', '박철수', 'student', 'K-Pop 문화', '마닐라 세종학당', '1996-11-08');

-- 권한 설정 (Supabase에서 실행)
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 스토리지 버킷 생성 (영수증 이미지용 - Supabase 대시보드에서 수동 생성)
-- 버킷명: receipts
-- 공개 액세스: false
-- 파일 크기 제한: 5MB
-- 허용 파일 타입: image/*

COMMENT ON TABLE user_profiles IS '사용자 프로필 정보';
COMMENT ON TABLE lesson_plans IS '수업 계획 및 승인 정보';
COMMENT ON TABLE budget_settings IS '분야별 예산 설정';
COMMENT ON TABLE student_budgets IS '학생별 예산 배정 및 사용 현황';
COMMENT ON TABLE requests IS '교구 신청 내역';
COMMENT ON TABLE receipts IS '영수증 정보';
COMMENT ON TABLE system_settings IS '시스템 설정 정보';
