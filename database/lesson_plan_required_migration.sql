-- 수업계획 필수 제출 강화 마이그레이션
-- 2025-06-13: 수업계획을 필수 제출 사항으로 명확화

-- 기존 lesson_plans 테이블의 코멘트 업데이트
COMMENT ON TABLE lesson_plans IS '수업 계획 및 승인 정보 - 필수 제출 사항';

-- 각 컬럼에 대한 명확한 설명 추가
COMMENT ON COLUMN lesson_plans.status IS '수업계획 상태: draft(임시저장), submitted(제출완료-필수), approved(승인됨), rejected(반려됨)';
COMMENT ON COLUMN lesson_plans.lessons IS '수업 계획 데이터 (JSON 형태) - 모든 수업의 주제와 내용 필수 입력';
COMMENT ON COLUMN lesson_plans.submitted_at IS '수업계획 제출 일시 - 교구 신청을 위한 필수 단계';
COMMENT ON COLUMN lesson_plans.approved_at IS '수업계획 승인 일시 - 승인 후 예산 배정 및 교구 신청 가능';
COMMENT ON COLUMN lesson_plans.rejection_reason IS '수업계획 반려 사유 - 반려 시 학생에게 표시';

-- student_budgets 테이블 코멘트도 업데이트
COMMENT ON TABLE student_budgets IS '학생별 예산 배정 및 사용 현황 - 수업계획 승인 후 자동 생성';
COMMENT ON COLUMN student_budgets.allocated_budget IS '배정된 예산 - 수업계획 승인 시 총 수업 횟수 × 회당 지원금으로 계산';

-- requests 테이블 코멘트 업데이트  
COMMENT ON TABLE requests IS '교구 신청 내역 - 수업계획 승인 후에만 신청 가능';

-- 수업계획 제출의 필수성을 강조하는 시스템 설정 업데이트
UPDATE system_settings 
SET setting_value = '수업계획은 교구 신청을 위한 필수 제출 사항입니다. 모든 수업의 주제와 내용을 구체적으로 작성하고 완료 제출해야 관리자 승인을 받을 수 있습니다.',
    description = '수업계획 필수성 안내 메시지'
WHERE setting_key = 'notice_message';

-- 새로운 시스템 설정 추가: 수업계획 필수 여부
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES ('lesson_plan_required', 'true', 'boolean', '수업계획 제출 필수 여부 - 교구 신청을 위한 필수 조건')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = 'true', 
    description = '수업계획 제출 필수 여부 - 교구 신청을 위한 필수 조건';

-- 수업계획 검증을 위한 함수 생성
CREATE OR REPLACE FUNCTION validate_lesson_plan_completion(plan_data JSONB)
RETURNS BOOLEAN AS $$
DECLARE
    lesson JSONB;
    total_lessons INTEGER;
    completed_lessons INTEGER := 0;
BEGIN
    -- 기본 정보 확인
    IF plan_data IS NULL OR 
       plan_data->>'startDate' IS NULL OR 
       plan_data->>'endDate' IS NULL OR 
       plan_data->>'totalLessons' IS NULL OR 
       plan_data->>'overallGoals' IS NULL OR 
       TRIM(plan_data->>'overallGoals') = '' THEN
        RETURN FALSE;
    END IF;
    
    -- 총 수업 횟수 확인
    total_lessons := (plan_data->>'totalLessons')::INTEGER;
    
    -- 각 수업의 주제와 내용 확인
    FOR lesson IN SELECT * FROM jsonb_array_elements(plan_data->'lessons') LOOP
        IF lesson->>'topic' IS NOT NULL AND TRIM(lesson->>'topic') != '' AND
           lesson->>'content' IS NOT NULL AND TRIM(lesson->>'content') != '' THEN
            completed_lessons := completed_lessons + 1;
        END IF;
    END LOOP;
    
    -- 모든 수업이 완료되었는지 확인
    RETURN completed_lessons = total_lessons;
END;
$$ LANGUAGE plpgsql;

-- 수업계획 제출 시 검증을 위한 트리거 함수
CREATE OR REPLACE FUNCTION check_lesson_plan_before_submit()
RETURNS TRIGGER AS $$
BEGIN
    -- submitted 상태로 변경할 때만 검증
    IF NEW.status = 'submitted' AND (OLD.status IS NULL OR OLD.status != 'submitted') THEN
        IF NOT validate_lesson_plan_completion(NEW.lessons) THEN
            RAISE EXCEPTION '수업계획이 완전하지 않습니다. 모든 수업의 주제와 내용을 입력해주세요.';
        END IF;
        
        -- 제출 시간 자동 설정
        NEW.submitted_at := NOW();
    END IF;
    
    -- 승인 시 승인 시간 설정
    IF NEW.status = 'approved' AND (OLD.status IS NULL OR OLD.status != 'approved') THEN
        NEW.approved_at := NOW();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS lesson_plan_validation_trigger ON lesson_plans;

-- 새 트리거 생성
CREATE TRIGGER lesson_plan_validation_trigger
    BEFORE UPDATE ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION check_lesson_plan_before_submit();

-- 교구 신청 전 수업계획 승인 상태 확인 함수
CREATE OR REPLACE FUNCTION check_lesson_plan_approval(student_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    plan_status VARCHAR(20);
BEGIN
    SELECT status INTO plan_status 
    FROM lesson_plans 
    WHERE user_id = student_user_id 
    ORDER BY created_at DESC 
    LIMIT 1;
    
    RETURN plan_status = 'approved';
END;
$$ LANGUAGE plpgsql;

-- requests 테이블에 수업계획 승인 확인 트리거 함수
CREATE OR REPLACE FUNCTION check_lesson_plan_before_request()
RETURNS TRIGGER AS $$
BEGIN
    IF NOT check_lesson_plan_approval(NEW.user_id) THEN
        RAISE EXCEPTION '교구 신청을 위해서는 수업계획이 먼저 승인되어야 합니다.';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 기존 트리거가 있다면 삭제 후 재생성
DROP TRIGGER IF EXISTS request_lesson_plan_check_trigger ON requests;

-- 새 트리거 생성 (교구 신청 시 수업계획 승인 상태 확인)
CREATE TRIGGER request_lesson_plan_check_trigger
    BEFORE INSERT ON requests
    FOR EACH ROW
    EXECUTE FUNCTION check_lesson_plan_before_request();

-- 인덱스 최적화 (수업계획 조회 성능 향상)
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user_status ON lesson_plans(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_submitted_at ON lesson_plans(submitted_at DESC) WHERE status = 'submitted';
CREATE INDEX IF NOT EXISTS idx_lesson_plans_approved_at ON lesson_plans(approved_at DESC) WHERE status = 'approved';

-- 수업계획 통계를 위한 뷰 생성
CREATE OR REPLACE VIEW lesson_plan_stats AS
SELECT 
    COUNT(*) FILTER (WHERE status = 'draft') as draft_count,
    COUNT(*) FILTER (WHERE status = 'submitted') as submitted_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
    COUNT(*) as total_count,
    ROUND(COUNT(*) FILTER (WHERE status = 'approved') * 100.0 / NULLIF(COUNT(*) FILTER (WHERE status IN ('submitted', 'approved', 'rejected')), 0), 2) as approval_rate
FROM lesson_plans;

-- 권한 설정 업데이트
GRANT SELECT ON lesson_plan_stats TO authenticated;

-- 업데이트 완료 로그
INSERT INTO system_settings (setting_key, setting_value, setting_type, description) 
VALUES ('lesson_plan_required_migration', NOW()::TEXT, 'string', '수업계획 필수 제출 강화 마이그레이션 완료 시간')
ON CONFLICT (setting_key) DO UPDATE 
SET setting_value = NOW()::TEXT;
