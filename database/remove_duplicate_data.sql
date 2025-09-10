-- ==========================================
-- 필수 서류 관리 시스템 중복 데이터 제거 SQL
-- ==========================================
-- 작성일: 2025-09-10
-- 목적: required_documents, emergency_contacts 테이블의 중복 데이터 제거
-- 원칙: 각 사용자당 최신 데이터 1개만 유지

-- ==========================================
-- 1. 현재 중복 상황 분석
-- ==========================================

-- 1-1. required_documents 테이블 중복 확인
SELECT 
    user_id,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM required_documents 
GROUP BY user_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, user_id;

-- 1-2. emergency_contacts 테이블 중복 확인  
SELECT 
    user_id,
    COUNT(*) as duplicate_count,
    MIN(created_at) as first_created,
    MAX(created_at) as last_created,
    MAX(updated_at) as last_updated
FROM emergency_contacts 
GROUP BY user_id 
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, user_id;

-- 1-3. 전체 중복 현황 요약
SELECT 
    'required_documents' as table_name,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(*) as total_records,
    COUNT(*) - COUNT(DISTINCT user_id) as duplicate_records
FROM required_documents
UNION ALL
SELECT 
    'emergency_contacts' as table_name,
    COUNT(DISTINCT user_id) as total_users,
    COUNT(*) as total_records,
    COUNT(*) - COUNT(DISTINCT user_id) as duplicate_records
FROM emergency_contacts;

-- ==========================================
-- 2. 안전한 중복 제거 실행 (단계별)
-- ==========================================

-- 🚨 주의: 아래 작업은 데이터를 영구적으로 삭제합니다.
-- 반드시 백업 후 실행하세요!

-- ==========================================
-- 2-1. required_documents 테이블 중복 제거
-- ==========================================

-- Step 1: 유지할 레코드 식별 (최신 updated_at 기준)
CREATE TEMPORARY TABLE temp_keep_required_docs AS
SELECT DISTINCT ON (user_id) 
    id,
    user_id,
    created_at,
    updated_at
FROM required_documents
ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC;

-- Step 2: 유지할 레코드 확인
SELECT 
    COUNT(*) as records_to_keep,
    COUNT(DISTINCT user_id) as unique_users
FROM temp_keep_required_docs;

-- Step 3: 삭제할 레코드 확인 (실제 삭제 전 확인)
SELECT 
    rd.id,
    rd.user_id,
    up.name as student_name,
    rd.created_at,
    rd.updated_at,
    'WILL_BE_DELETED' as status
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
WHERE rd.id NOT IN (SELECT id FROM temp_keep_required_docs)
ORDER BY rd.user_id, rd.created_at;

-- Step 4: 중복 레코드 삭제 실행
DELETE FROM required_documents 
WHERE id NOT IN (SELECT id FROM temp_keep_required_docs);

-- Step 5: 임시 테이블 정리
DROP TABLE temp_keep_required_docs;

-- ==========================================
-- 2-2. emergency_contacts 테이블 중복 제거
-- ==========================================

-- Step 1: 유지할 레코드 식별 (최신 updated_at 기준)
CREATE TEMPORARY TABLE temp_keep_emergency_contacts AS
SELECT DISTINCT ON (user_id) 
    id,
    user_id,
    created_at,
    updated_at
FROM emergency_contacts
ORDER BY user_id, updated_at DESC NULLS LAST, created_at DESC;

-- Step 2: 유지할 레코드 확인
SELECT 
    COUNT(*) as records_to_keep,
    COUNT(DISTINCT user_id) as unique_users
FROM temp_keep_emergency_contacts;

-- Step 3: 삭제할 레코드 확인 (실제 삭제 전 확인)
SELECT 
    ec.id,
    ec.user_id,
    up.name as student_name,
    ec.created_at,
    ec.updated_at,
    'WILL_BE_DELETED' as status
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
WHERE ec.id NOT IN (SELECT id FROM temp_keep_emergency_contacts)
ORDER BY ec.user_id, ec.created_at;

-- Step 4: 중복 레코드 삭제 실행
DELETE FROM emergency_contacts 
WHERE id NOT IN (SELECT id FROM temp_keep_emergency_contacts);

-- Step 5: 임시 테이블 정리
DROP TABLE temp_keep_emergency_contacts;

-- ==========================================
-- 3. 중복 제거 후 검증
-- ==========================================

-- 3-1. 중복 제거 결과 확인
SELECT 
    'required_documents' as table_name,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT user_id) THEN '✅ OK'
        ELSE '❌ STILL_DUPLICATED'
    END as status
FROM required_documents
UNION ALL
SELECT 
    'emergency_contacts' as table_name,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) as total_records,
    CASE 
        WHEN COUNT(*) = COUNT(DISTINCT user_id) THEN '✅ OK'
        ELSE '❌ STILL_DUPLICATED'
    END as status
FROM emergency_contacts;

-- 3-2. 뷰 테이블 동작 확인
SELECT 
    student_name,
    COUNT(*) as view_record_count
FROM v_student_required_documents_summary
GROUP BY student_name, user_id
HAVING COUNT(*) > 1
ORDER BY view_record_count DESC;

-- 3-3. 김채연 학생 특별 확인
SELECT 
    up.name as student_name,
    up.id as user_id,
    rd.id as req_doc_id,
    ec.id as emergency_contact_id,
    rd.created_at as req_doc_created,
    ec.created_at as emergency_created
FROM user_profiles up
LEFT JOIN required_documents rd ON up.id = rd.user_id
LEFT JOIN emergency_contacts ec ON up.id = ec.user_id
WHERE up.name = '김채연'
ORDER BY up.name;

-- ==========================================
-- 4. 향후 중복 방지 제약 조건 추가
-- ==========================================

-- 4-1. required_documents 테이블에 unique 제약 조건 추가
-- (기존 중복이 제거된 후에만 실행 가능)
DO $$ 
BEGIN
    -- 중복이 없는지 먼저 확인
    IF (SELECT COUNT(*) FROM (
        SELECT user_id FROM required_documents 
        GROUP BY user_id HAVING COUNT(*) > 1
    ) duplicates) = 0 THEN
        -- 중복이 없으면 unique 제약 조건 추가
        ALTER TABLE required_documents 
        ADD CONSTRAINT required_documents_user_id_unique 
        UNIQUE (user_id);
        RAISE NOTICE '✅ required_documents unique 제약 조건 추가 완료';
    ELSE
        RAISE NOTICE '❌ 아직 중복 데이터가 존재하여 unique 제약 조건을 추가할 수 없습니다';
    END IF;
END $$;

-- 4-2. emergency_contacts 테이블에 unique 제약 조건 추가  
DO $$ 
BEGIN
    -- 중복이 없는지 먼저 확인
    IF (SELECT COUNT(*) FROM (
        SELECT user_id FROM emergency_contacts 
        GROUP BY user_id HAVING COUNT(*) > 1
    ) duplicates) = 0 THEN
        -- 중복이 없으면 unique 제약 조건 추가
        ALTER TABLE emergency_contacts 
        ADD CONSTRAINT emergency_contacts_user_id_unique 
        UNIQUE (user_id);
        RAISE NOTICE '✅ emergency_contacts unique 제약 조건 추가 완료';
    ELSE
        RAISE NOTICE '❌ 아직 중복 데이터가 존재하여 unique 제약 조건을 추가할 수 없습니다';
    END IF;
END $$;

-- ==========================================
-- 5. 실행 결과 요약 리포트
-- ==========================================

SELECT 
    '====== 중복 제거 작업 완료 리포트 ======' as report_title;

SELECT 
    table_name,
    unique_users,
    total_records,
    CASE 
        WHEN total_records = unique_users THEN '✅ 중복 제거 완료'
        ELSE '❌ 중복 잔존'
    END as cleanup_status
FROM (
    SELECT 
        'required_documents' as table_name,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_records
    FROM required_documents
    UNION ALL
    SELECT 
        'emergency_contacts' as table_name,
        COUNT(DISTINCT user_id) as unique_users,
        COUNT(*) as total_records
    FROM emergency_contacts
) summary;

-- 김채연 학생 최종 확인
SELECT 
    '김채연 학생 최종 상태:' as check_title,
    COUNT(*) as total_view_records
FROM v_student_required_documents_summary 
WHERE student_name = '김채연';

-- ==========================================
-- 📋 실행 가이드
-- ==========================================

/*
🔧 실행 순서:

1. 백업 생성 (필수!)
   - pg_dump 또는 Supabase 백업 기능 사용

2. 분석 쿼리 실행 (섹션 1)
   - 현재 중복 상황 파악

3. 단계별 중복 제거 (섹션 2)
   - 2-1: required_documents 중복 제거
   - 2-2: emergency_contacts 중복 제거

4. 검증 (섹션 3)
   - 중복 제거 결과 확인
   - 뷰 테이블 정상 동작 확인

5. 제약 조건 추가 (섹션 4)
   - 향후 중복 방지

⚠️ 주의사항:
- 반드시 백업 후 실행
- 단계별로 결과 확인 후 다음 단계 진행
- 운영 시간 외에 실행 권장
- 작업 전후 v_student_required_documents_summary 뷰 동작 확인

✅ 예상 결과:
- 김채연 학생: 3개 → 1개 레코드
- 다른 중복 학생들: 최신 데이터 1개만 유지
- 뷰 테이블 정상 동작
- 향후 중복 방지 제약 조건 적용
*/