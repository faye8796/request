-- 세종학당 문화교구 신청 플랫폼 데이터베이스 스키마 v2.11
-- 📄 주요 변경사항: receipts 테이블 최적화 (24개 → 18개 컬럼)
-- 🔧 최적화: 중복 컬럼 제거, NOT NULL 제약조건 최적화
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
    dispatch_start_date DATE, -- 파견 시작일
    dispatch_end_date DATE, -- 파견 종료일
    total_lessons INTEGER DEFAULT 0, -- 총 수업 수
    auth_user_id UUID, -- Supabase Auth 연결
    temp_password VARCHAR(255), -- 임시 비밀번호
    migration_status VARCHAR(20) DEFAULT 'pending', -- 마이그레이션 상태
    application_document_url TEXT, -- 지원서 URL
    application_document_name VARCHAR(255), -- 지원서 파일명
    application_submitted_at TIMESTAMP WITH TIME ZONE, -- 지원서 제출일
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 수업계획 테이블 (🔧 approved_at, approved_by 컬럼 제거됨)
CREATE TABLE lesson_plans (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'rejected')),
    lessons JSONB, -- 수업 계획 데이터 (JSON 형태)
    submitted_at TIMESTAMP WITH TIME ZONE,
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
    id SERIAL PRIMARY KEY,
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

-- 6. 🆕 영수증 테이블 v2.11 (최적화된 구조 - 18개 컬럼)
CREATE TABLE receipts (
    -- 📋 핵심 필수 컬럼들 (NOT NULL)
    id SERIAL PRIMARY KEY,
    receipt_number VARCHAR(50) NOT NULL UNIQUE, -- 영수증 번호
    purchase_date TIMESTAMP WITH TIME ZONE NOT NULL, -- 구매일시
    total_amount INTEGER NOT NULL, -- 구매금액
    
    -- 🔗 연결 컬럼들 (NULL 허용)
    request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, -- 신청 연결
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE, -- 사용자 연결
    
    -- 📁 파일 정보 (NULL 허용)
    file_url TEXT, -- 파일 다운로드 URL (Supabase Storage)
    file_name VARCHAR(255), -- 저장된 파일명
    original_name VARCHAR(255), -- 원본 파일명
    file_size BIGINT, -- 파일 크기 (bytes)
    file_type VARCHAR(100), -- MIME 타입
    
    -- 📝 메타정보 (NULL 허용)
    purchase_store VARCHAR(255), -- 구매처
    note TEXT, -- 메모
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP, -- 업로드시간
    
    -- ✅ 검증 정보 (NULL 허용)
    verified BOOLEAN DEFAULT FALSE, -- 검증상태
    verified_at TIMESTAMP WITH TIME ZONE, -- 검증시간
    verified_by UUID REFERENCES user_profiles(id), -- 검증자
    
    -- 🕒 시간 정보
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP -- 수정시간
);

-- 🆕 receipts 테이블 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_receipts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_receipts_updated_at
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION update_receipts_updated_at();

-- 7. 배송지 정보 테이블
CREATE TABLE shipping_addresses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES user_profiles(id) ON DELETE CASCADE,
    recipient_name VARCHAR(100) NOT NULL, -- 수령인
    phone VARCHAR(20) NOT NULL, -- 연락처
    address TEXT NOT NULL, -- 주소
    postal_code VARCHAR(10), -- 우편번호
    delivery_note TEXT, -- 배송 메모
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- 8. 재단 관리자 테이블
CREATE TABLE foundation_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    department VARCHAR(100), -- 부서
    position VARCHAR(50), -- 직급
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 9. 학당 관리자 테이블
CREATE TABLE institute_managers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    institute_name VARCHAR(200) NOT NULL, -- 학당명
    country VARCHAR(100), -- 국가
    city VARCHAR(100), -- 도시
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. 세종학당 정보 테이블
CREATE TABLE institutes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(200) NOT NULL, -- 학당명
    country VARCHAR(100) NOT NULL, -- 국가
    city VARCHAR(100) NOT NULL, -- 도시
    address TEXT, -- 주소
    phone VARCHAR(20), -- 전화번호
    email VARCHAR(255), -- 이메일
    manager_name VARCHAR(100), -- 담당자명
    manager_phone VARCHAR(20), -- 담당자 연락처
    manager_email VARCHAR(255), -- 담당자 이메일
    website_url TEXT, -- 웹사이트 URL
    established_date DATE, -- 설립일
    student_count INTEGER DEFAULT 0, -- 학생 수
    instructor_count INTEGER DEFAULT 0, -- 강사 수
    description TEXT, -- 설명
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. 문화프로그램 테이블
CREATE TABLE cultural_programs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institute_id UUID REFERENCES institutes(id) ON DELETE CASCADE,
    program_name VARCHAR(200) NOT NULL, -- 프로그램명
    category VARCHAR(100), -- 카테고리
    description TEXT, -- 설명
    schedule_info TEXT, -- 일정 정보
    max_participants INTEGER, -- 최대 참가자 수
    current_participants INTEGER DEFAULT 0, -- 현재 참가자 수
    instructor_name VARCHAR(100), -- 강사명
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 12. 시스템 설정 테이블
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) NOT NULL UNIQUE, -- 설정 키
    setting_value TEXT, -- 설정 값
    setting_type VARCHAR(20) DEFAULT 'string' CHECK (setting_type IN ('string', 'number', 'boolean', 'json')),
    description TEXT, -- 설정 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. 기능 설정 테이블
CREATE TABLE feature_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    feature_name VARCHAR(100) NOT NULL UNIQUE, -- 기능명
    is_enabled BOOLEAN DEFAULT FALSE, -- 활성화 여부
    config JSONB, -- 기능별 설정
    description TEXT, -- 기능 설명
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 📊 인덱스 생성 (성능 최적화)
CREATE INDEX idx_user_profiles_type ON user_profiles(user_type);
CREATE INDEX idx_user_profiles_field ON user_profiles(field);
CREATE INDEX idx_user_profiles_institute ON user_profiles(sejong_institute);
CREATE INDEX idx_lesson_plans_user_id ON lesson_plans(user_id);
CREATE INDEX idx_lesson_plans_status ON lesson_plans(status);
CREATE INDEX idx_requests_user_id ON requests(user_id);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_purchase_type ON requests(purchase_type);

-- 🆕 receipts 테이블 인덱스 (최적화됨)
CREATE INDEX idx_receipts_request_id ON receipts(request_id);
CREATE INDEX idx_receipts_user_id ON receipts(user_id);
CREATE INDEX idx_receipts_receipt_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_uploaded_at ON receipts(uploaded_at);
CREATE INDEX idx_receipts_purchase_date ON receipts(purchase_date);
CREATE INDEX idx_receipts_verified ON receipts(verified);

CREATE INDEX idx_student_budgets_user_id ON student_budgets(user_id);
CREATE INDEX idx_shipping_addresses_user_id ON shipping_addresses(user_id);
CREATE INDEX idx_institutes_country ON institutes(country);
CREATE INDEX idx_cultural_programs_institute_id ON cultural_programs(institute_id);

-- 🛡️ Row Level Security (RLS) 정책 설정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE budget_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE foundation_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE institute_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutes ENABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_settings ENABLE ROW LEVEL SECURITY;

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

-- 🆕 영수증 RLS 정책 (최적화됨)
CREATE POLICY "Students can manage own receipts" ON receipts
    FOR ALL USING (user_id = auth.uid());

-- 배송지 RLS 정책
CREATE POLICY "Students can manage own shipping address" ON shipping_addresses
    FOR ALL USING (user_id = auth.uid());

-- 학생 예산 RLS 정책
CREATE POLICY "Students can view own budget" ON student_budgets
    FOR SELECT USING (user_id = auth.uid());

-- 공개 읽기 권한
CREATE POLICY "Anyone can view budget settings" ON budget_settings
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view system settings" ON system_settings
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view institutes" ON institutes
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view cultural programs" ON cultural_programs
    FOR SELECT USING (true);

CREATE POLICY "Anyone can view feature settings" ON feature_settings
    FOR SELECT USING (true);

-- 📊 기본 데이터 삽입

-- 예산 설정 기본값
INSERT INTO budget_settings (field, per_lesson_amount, max_budget_limit) VALUES
('한국어교육', 15000, 400000),
('전통문화예술', 25000, 600000),
('K-Pop 문화', 10000, 300000),
('한국현대문화', 18000, 450000),
('전통음악', 30000, 750000),
('한국미술', 22000, 550000),
('한국요리문화', 35000, 800000),
('태권도', 20000, 500000),
('한국영화', 12000, 350000),
('한국사', 16000, 420000),
('한복문화', 28000, 650000),
('한국전통무용', 32000, 700000),
('한국문학', 14000, 380000),
('한국어학', 15000, 400000),
('비즈니스한국어', 18000, 450000),
('한국어교육방법론', 20000, 500000),
('한국문화컨텐츠', 15000, 400000),
('한국관광', 17000, 430000),
('한국어번역', 19000, 480000),
('한국어회화', 13000, 360000),
('한국민속', 24000, 580000),
('한국종교문화', 21000, 520000),
('한국지리', 16000, 420000),
('한국스포츠', 18000, 450000),
('한국게임문화', 11000, 320000),
('한국패션', 26000, 620000);

-- 시스템 설정 기본값
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) VALUES
('test_mode', 'false', 'boolean', '테스트 모드 (수업계획 편집 제한 해제)'),
('ignore_deadline', 'false', 'boolean', '마감일 무시 모드'),
('lesson_plan_deadline', '2025-12-31', 'string', '수업계획 수정 마감일'),
('lesson_plan_time', '23:59', 'string', '수업계획 수정 마감 시간'),
('notice_message', '', 'string', '사용자에게 표시할 공지사항'),
('max_file_size', '5242880', 'number', '최대 파일 업로드 크기 (5MB)'),
('allowed_file_types', 'image/jpeg,image/png,application/pdf', 'string', '허용되는 파일 타입'),
('receipt_auto_approve', 'false', 'boolean', '영수증 자동 승인 여부'),
('budget_check_strict', 'true', 'boolean', '예산 검증 엄격 모드'),
('email_notification', 'true', 'boolean', '이메일 알림 활성화'),
('sms_notification', 'false', 'boolean', 'SMS 알림 활성화'),
('maintenance_mode', 'false', 'boolean', '유지보수 모드'),
('api_rate_limit', '100', 'number', 'API 요청 제한 (분당)');

-- 기능 설정 기본값
INSERT INTO feature_settings (feature_name, is_enabled, description) VALUES
('equipment_request', true, '교구 신청 기능'),
('flight_booking', false, '항공권 예약 기능'),
('institute_info', true, '학당 정보 조회 기능');

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

-- receipts 테이블은 별도 트리거 함수 사용 (이미 위에서 생성됨)

CREATE TRIGGER update_shipping_addresses_updated_at BEFORE UPDATE ON shipping_addresses 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_foundation_managers_updated_at BEFORE UPDATE ON foundation_managers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institute_managers_updated_at BEFORE UPDATE ON institute_managers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_institutes_updated_at BEFORE UPDATE ON institutes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cultural_programs_updated_at BEFORE UPDATE ON cultural_programs 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_feature_settings_updated_at BEFORE UPDATE ON feature_settings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 샘플 데이터 (개발/테스트용)
-- 관리자 계정
INSERT INTO user_profiles (email, name, user_type) VALUES
('admin@sejong.or.kr', '관리자', 'admin');

-- 권한 설정
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- 📝 테이블 설명
COMMENT ON TABLE user_profiles IS '사용자 프로필 정보';
COMMENT ON TABLE lesson_plans IS '수업 계획 및 승인 정보 (approved_at, approved_by 컬럼 제거됨)';
COMMENT ON TABLE budget_settings IS '분야별 예산 설정';
COMMENT ON TABLE student_budgets IS '학생별 예산 배정 및 사용 현황';
COMMENT ON TABLE requests IS '교구 신청 내역';
COMMENT ON TABLE receipts IS '영수증 정보 v2.11 (최적화: 24개→18개 컬럼)';
COMMENT ON TABLE shipping_addresses IS '배송지 정보';
COMMENT ON TABLE foundation_managers IS '재단 관리자 정보';
COMMENT ON TABLE institute_managers IS '학당 관리자 정보';
COMMENT ON TABLE institutes IS '세종학당 정보';
COMMENT ON TABLE cultural_programs IS '문화프로그램 정보';
COMMENT ON TABLE system_settings IS '시스템 설정 정보';
COMMENT ON TABLE feature_settings IS '기능별 활성화 설정';

-- 🎉 스키마 v2.11 최적화 완료!
-- 📊 receipts 테이블: 6개 중복 컬럼 제거 (25% 축소)
-- 🔧 안정성: 필수값 이외 모든 컬럼 NULL 허용
-- ✅ 호환성: receipt-management.js v4.1.4와 완전 호환
