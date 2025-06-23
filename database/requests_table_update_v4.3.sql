-- 📋 requests 테이블 구조 업데이트 v4.3 (교구 신청 타입별 최적화)
-- 🗑️ 사용하지 않는 컬럼 제거: bundle_info, shipping_address, notes
-- 🔧 컬럼명 변경: purchase_link → link
-- ➕ 새 컬럼 추가: store_info, account_id, account_pw
-- 🎯 4가지 신청 타입별 맞춤 컬럼 구조 완성

-- 실행 전 백업 권장!
-- 실행 방법: Supabase Dashboard → SQL Editor에서 실행

BEGIN;

-- 1. 사용하지 않는 컬럼들 제거
ALTER TABLE requests 
DROP COLUMN IF EXISTS bundle_info,
DROP COLUMN IF EXISTS shipping_address, 
DROP COLUMN IF EXISTS notes;

-- 2. 컬럼명 변경: purchase_link → link
ALTER TABLE requests 
RENAME COLUMN purchase_link TO link;

-- 3. 새 컬럼들 추가
ALTER TABLE requests 
ADD COLUMN store_info TEXT NULL,           -- 오프라인 구매처 정보
ADD COLUMN account_id VARCHAR(255) NULL,   -- 온라인 묶음구매 계정 아이디
ADD COLUMN account_pw VARCHAR(255) NULL;   -- 온라인 묶음구매 계정 비밀번호

-- 4. 컬럼 코멘트 추가 (문서화)
COMMENT ON COLUMN requests.link IS '온라인 구매 링크 (온라인 신청시 필수)';
COMMENT ON COLUMN requests.store_info IS '오프라인 구매처 정보 (오프라인 신청시 선택)';
COMMENT ON COLUMN requests.account_id IS '온라인 묶음구매 사이트 계정 아이디 (온라인 묶음시 필수)';
COMMENT ON COLUMN requests.account_pw IS '온라인 묶음구매 사이트 계정 비밀번호 (온라인 묶음시 필수)';

-- 5. 신청 타입별 사용 컬럼 정리
COMMENT ON TABLE requests IS '교구 신청 테이블 v4.3 - 4가지 타입별 최적화:
1. 온라인 단일: link(필수)
2. 온라인 묶음: link(필수) + account_id(필수) + account_pw(필수)  
3. 오프라인 단일: store_info(선택)
4. 오프라인 묶음: store_info(선택)
타입 구분: is_bundle + purchase_type 조합';

-- 6. 인덱스 추가 (성능 최적화)
CREATE INDEX IF NOT EXISTS idx_requests_is_bundle ON requests(is_bundle);
CREATE INDEX IF NOT EXISTS idx_requests_combo_type ON requests(is_bundle, purchase_type);

COMMIT;

-- 📊 마이그레이션 완료 후 확인 쿼리
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns 
-- WHERE table_name = 'requests' ORDER BY ordinal_position;

-- 🎯 각 타입별 데이터 확인 쿼리
-- SELECT 
--   CASE 
--     WHEN is_bundle = false AND purchase_type = 'online' THEN '온라인 단일'
--     WHEN is_bundle = true AND purchase_type = 'online' THEN '온라인 묶음'
--     WHEN is_bundle = false AND purchase_type = 'offline' THEN '오프라인 단일'  
--     WHEN is_bundle = true AND purchase_type = 'offline' THEN '오프라인 묶음'
--   END as 신청타입,
--   link, store_info, account_id, account_pw
-- FROM requests;

-- ✅ v4.3 업데이트 완료!
-- 📋 4가지 교구 신청 타입별 최적화된 컬럼 구조
-- 🗑️ 불필요한 컬럼 3개 제거로 테이블 경량화
-- 🔧 명확한 컬럼명과 타입별 필수/선택 구분
