-- Supabase 통합 최적화를 위한 데이터베이스 마이그레이션
-- v3.0 - 실시간 알림, 파일 저장소, 시스템 모니터링 기능 추가

-- 1. 알림 시스템 테이블
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'lesson_plan_approved', 'request_status_changed', 'system_announcement' 등
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- 추가 데이터 (링크, 관련 ID 등)
    is_read BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 알림 인덱스
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- 2. 파일 저장소 테이블 (영수증, 첨부파일 등)
CREATE TABLE IF NOT EXISTS file_uploads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    related_table VARCHAR(50), -- 'receipts', 'lesson_plans', 'requests' 등
    related_id UUID, -- 관련 레코드 ID
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage 경로
    public_url TEXT, -- 공개 URL (필요시)
    file_hash VARCHAR(64), -- 중복 체크용 해시
    metadata JSONB DEFAULT '{}', -- 추가 메타데이터 (해상도, 압축 정보 등)
    is_processed BOOLEAN DEFAULT FALSE, -- 이미지 압축 등 처리 완료 여부
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 파일 업로드 인덱스
CREATE INDEX IF NOT EXISTS idx_file_uploads_user_id ON file_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_related ON file_uploads(related_table, related_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_hash ON file_uploads(file_hash);

-- 3. 시스템 로그 테이블 (보안, 성능 모니터링용)
CREATE TABLE IF NOT EXISTS system_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    level VARCHAR(20) NOT NULL, -- 'info', 'warning', 'error', 'critical'
    category VARCHAR(50) NOT NULL, -- 'auth', 'api', 'security', 'performance' 등
    event_type VARCHAR(100) NOT NULL, -- 구체적인 이벤트 타입
    user_id UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}', -- 상세 데이터
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(100), -- 요청 추적용 ID
    duration_ms INTEGER, -- 처리 시간 (밀리초)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 시스템 로그 인덱스
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_category ON system_logs(category);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at DESC);

-- 4. 실시간 활동 추적 테이블
CREATE TABLE IF NOT EXISTS user_activities (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    activity_type VARCHAR(50) NOT NULL, -- 'login', 'logout', 'page_view', 'form_submit' 등
    activity_data JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    session_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 활동 추적 인덱스
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_session ON user_activities(session_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);

-- 5. 시스템 성능 메트릭 테이블
CREATE TABLE IF NOT EXISTS system_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    metric_name VARCHAR(100) NOT NULL,
    metric_value DECIMAL(15,4) NOT NULL,
    metric_unit VARCHAR(20), -- 'ms', 'bytes', 'count' 등
    metric_tags JSONB DEFAULT '{}', -- 추가 태그 (endpoint, method 등)
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 성능 메트릭 인덱스
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_recorded_at ON system_metrics(recorded_at DESC);

-- 6. 기존 테이블 확장

-- receipts 테이블에 파일 참조 추가
ALTER TABLE receipts 
ADD COLUMN IF NOT EXISTS file_upload_id UUID REFERENCES file_uploads(id) ON DELETE SET NULL;

-- requests 테이블에 알림 관련 필드 추가
ALTER TABLE requests 
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"email": false, "realtime": true}';

-- user_profiles 테이블에 알림 설정 추가
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{
    "lesson_plan_updates": true,
    "request_status_changes": true,
    "system_announcements": true,
    "email_notifications": false
}',
ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS login_count INTEGER DEFAULT 0;

-- system_settings 테이블에 새로운 설정 추가
INSERT INTO system_settings (setting_key, setting_value, setting_type) VALUES
('realtime_notifications_enabled', 'true', 'boolean'),
('file_upload_max_size_mb', '5', 'number'),
('auto_backup_enabled', 'true', 'boolean'),
('performance_monitoring_enabled', 'true', 'boolean'),
('session_timeout_minutes', '30', 'number'),
('max_login_attempts', '5', 'number'),
('lockout_duration_minutes', '15', 'number')
ON CONFLICT (setting_key) DO NOTHING;

-- 7. 함수 및 트리거 생성

-- 알림 자동 생성 함수
CREATE OR REPLACE FUNCTION create_notification(
    p_user_id UUID,
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_data JSONB DEFAULT '{}',
    p_priority VARCHAR(20) DEFAULT 'normal'
) RETURNS UUID AS $$
DECLARE
    notification_id UUID;
BEGIN
    INSERT INTO notifications (user_id, type, title, message, data, priority)
    VALUES (p_user_id, p_type, p_title, p_message, p_data, p_priority)
    RETURNING id INTO notification_id;
    
    RETURN notification_id;
END;
$$ LANGUAGE plpgsql;

-- 수업계획 상태 변경 시 알림 생성 트리거
CREATE OR REPLACE FUNCTION notify_lesson_plan_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 수업계획이 승인되었을 때
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM create_notification(
            NEW.user_id,
            'lesson_plan_approved',
            '수업계획이 승인되었습니다',
            '축하합니다! 수업계획이 승인되어 이제 교구 신청이 가능합니다.',
            json_build_object('lesson_plan_id', NEW.id)::jsonb,
            'high'
        );
    END IF;
    
    -- 수업계획이 반려되었을 때
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        PERFORM create_notification(
            NEW.user_id,
            'lesson_plan_rejected',
            '수업계획이 반려되었습니다',
            CASE 
                WHEN NEW.rejection_reason IS NOT NULL 
                THEN format('반려 사유: %s', NEW.rejection_reason)
                ELSE '수업계획을 다시 검토하여 수정해주세요.'
            END,
            json_build_object('lesson_plan_id', NEW.id, 'rejection_reason', NEW.rejection_reason)::jsonb,
            'high'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_lesson_plan_status_notification ON lesson_plans;
CREATE TRIGGER trigger_lesson_plan_status_notification
    AFTER UPDATE ON lesson_plans
    FOR EACH ROW
    EXECUTE FUNCTION notify_lesson_plan_status_change();

-- 교구 신청 상태 변경 시 알림 생성 트리거
CREATE OR REPLACE FUNCTION notify_request_status_change()
RETURNS TRIGGER AS $$
BEGIN
    -- 신청이 승인되었을 때
    IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
        PERFORM create_notification(
            NEW.user_id,
            'request_approved',
            '교구 신청이 승인되었습니다',
            format('"%s" 교구 신청이 승인되었습니다.', NEW.item_name),
            json_build_object('request_id', NEW.id, 'item_name', NEW.item_name)::jsonb,
            'normal'
        );
    END IF;
    
    -- 신청이 반려되었을 때
    IF NEW.status = 'rejected' AND OLD.status != 'rejected' THEN
        PERFORM create_notification(
            NEW.user_id,
            'request_rejected',
            '교구 신청이 반려되었습니다',
            format('"%s" 교구 신청이 반려되었습니다.', NEW.item_name),
            json_build_object('request_id', NEW.id, 'item_name', NEW.item_name, 'rejection_reason', NEW.rejection_reason)::jsonb,
            'normal'
        );
    END IF;
    
    -- 구매가 완료되었을 때
    IF NEW.status = 'purchased' AND OLD.status != 'purchased' THEN
        PERFORM create_notification(
            NEW.user_id,
            'request_purchased',
            '교구 구매가 완료되었습니다',
            format('"%s" 교구가 구매 완료되었습니다.', NEW.item_name),
            json_build_object('request_id', NEW.id, 'item_name', NEW.item_name)::jsonb,
            'normal'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS trigger_request_status_notification ON requests;
CREATE TRIGGER trigger_request_status_notification
    AFTER UPDATE ON requests
    FOR EACH ROW
    EXECUTE FUNCTION notify_request_status_change();

-- 8. 로그인 추적 함수
CREATE OR REPLACE FUNCTION track_user_login(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE user_profiles 
    SET 
        last_login_at = CURRENT_TIMESTAMP,
        login_count = COALESCE(login_count, 0) + 1,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_user_id;
    
    -- 활동 로그 기록
    INSERT INTO user_activities (user_id, activity_type, activity_data)
    VALUES (p_user_id, 'login', json_build_object('timestamp', CURRENT_TIMESTAMP)::jsonb);
END;
$$ LANGUAGE plpgsql;

-- 9. 시스템 메트릭 기록 함수
CREATE OR REPLACE FUNCTION record_metric(
    p_metric_name VARCHAR(100),
    p_metric_value DECIMAL(15,4),
    p_metric_unit VARCHAR(20) DEFAULT NULL,
    p_metric_tags JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO system_metrics (metric_name, metric_value, metric_unit, metric_tags)
    VALUES (p_metric_name, p_metric_value, p_metric_unit, p_metric_tags);
END;
$$ LANGUAGE plpgsql;

-- 10. 오래된 데이터 정리 함수 (성능 최적화)
CREATE OR REPLACE FUNCTION cleanup_old_data()
RETURNS VOID AS $$
BEGIN
    -- 3개월 이상 된 읽은 알림 삭제
    DELETE FROM notifications 
    WHERE is_read = true 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    
    -- 6개월 이상 된 시스템 로그 삭제 (critical 레벨 제외)
    DELETE FROM system_logs 
    WHERE level != 'critical' 
    AND created_at < CURRENT_TIMESTAMP - INTERVAL '6 months';
    
    -- 1년 이상 된 활동 로그 삭제
    DELETE FROM user_activities 
    WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '1 year';
    
    -- 3개월 이상 된 시스템 메트릭 삭제
    DELETE FROM system_metrics 
    WHERE recorded_at < CURRENT_TIMESTAMP - INTERVAL '3 months';
    
    -- VACUUM ANALYZE 실행
    VACUUM ANALYZE notifications, system_logs, user_activities, system_metrics;
END;
$$ LANGUAGE plpgsql;

-- 11. RLS (Row Level Security) 정책 설정

-- 알림 정책
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON notifications
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can update own notifications" ON notifications
    FOR UPDATE USING (user_id = auth.uid()::uuid);

-- 파일 업로드 정책
ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own files" ON file_uploads
    FOR SELECT USING (user_id = auth.uid()::uuid);

CREATE POLICY "Users can insert own files" ON file_uploads
    FOR INSERT WITH CHECK (user_id = auth.uid()::uuid);

-- 사용자 활동 정책 (조회만 허용)
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activities" ON user_activities
    FOR SELECT USING (user_id = auth.uid()::uuid);

-- 시스템 로그, 메트릭은 관리자만 접근 가능 (별도 관리)

-- 12. 인덱스 최적화
-- 복합 인덱스 추가로 쿼리 성능 향상
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_requests_user_status ON requests(user_id, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_user_status ON lesson_plans(user_id, status);

-- 13. 뷰 생성 (자주 사용하는 쿼리 최적화)

-- 사용자별 알림 요약 뷰
CREATE OR REPLACE VIEW user_notification_summary AS
SELECT 
    user_id,
    COUNT(*) as total_notifications,
    COUNT(*) FILTER (WHERE is_read = false) as unread_count,
    COUNT(*) FILTER (WHERE priority = 'high') as high_priority_count,
    MAX(created_at) as latest_notification_at
FROM notifications
GROUP BY user_id;

-- 사용자별 신청 현황 요약 뷰
CREATE OR REPLACE VIEW user_request_summary AS
SELECT 
    r.user_id,
    up.name as user_name,
    COUNT(*) as total_requests,
    COUNT(*) FILTER (WHERE r.status = 'pending') as pending_count,
    COUNT(*) FILTER (WHERE r.status = 'approved') as approved_count,
    COUNT(*) FILTER (WHERE r.status = 'rejected') as rejected_count,
    COUNT(*) FILTER (WHERE r.status = 'purchased') as purchased_count,
    SUM(r.price) FILTER (WHERE r.status IN ('approved', 'purchased')) as approved_amount,
    MAX(r.created_at) as latest_request_at
FROM requests r
JOIN user_profiles up ON r.user_id = up.id
GROUP BY r.user_id, up.name;

-- 14. 기본 데이터 삽입 (테스트 및 초기 설정용)

-- 시스템 공지사항 예시
INSERT INTO notifications (user_id, type, title, message, priority) 
SELECT 
    up.id,
    'system_announcement',
    '시스템 업그레이드 완료',
    '세종학당 문화교구 신청 플랫폼이 v3.0으로 업그레이드되었습니다. 실시간 알림, 파일 업로드 등 새로운 기능을 이용하실 수 있습니다.',
    'normal'
FROM user_profiles up 
WHERE up.user_type = 'student'
ON CONFLICT DO NOTHING;

-- 성공적으로 완료된 경우 메시지 출력
DO $$
BEGIN
    RAISE NOTICE '✅ 데이터베이스 마이그레이션 완료 - v3.0 통합 최적화';
    RAISE NOTICE '📊 추가된 기능: 실시간 알림, 파일 저장소, 시스템 모니터링, 성능 추적';
    RAISE NOTICE '🔒 보안: RLS 정책 적용, 로그인 추적, 활동 모니터링';
    RAISE NOTICE '⚡ 성능: 인덱스 최적화, 뷰 생성, 자동 정리 함수';
END $$;