-- ==========================================
-- 필수 서류 제출 불완전 데이터 정리 SQL
-- ==========================================
-- 작성일: 2025-09-10
-- 목적: 제출되지 않은/불완전한 필수 서류 레코드 안전 삭제
-- 대상: required_documents, emergency_contacts 테이블

-- ==========================================
-- 1. 현재 데이터 상태 분석
-- ==========================================

-- 1-1. 전체 데이터 현황
SELECT 
    '전체 현황' as category,
    '학생 수' as metric,
    COUNT(DISTINCT id) as count
FROM user_profiles 
WHERE role = 'student'

UNION ALL

SELECT 
    '전체 현황' as category,
    'required_documents 레코드' as metric,
    COUNT(*) as count
FROM required_documents

UNION ALL

SELECT 
    '전체 현황' as category,
    'emergency_contacts 레코드' as metric,
    COUNT(*) as count
FROM emergency_contacts;

-- 1-2. required_documents 테이블 상태 분석
SELECT 
    rd.id,
    up.name as student_name,
    rd.user_id,
    rd.created_at,
    rd.updated_at,
    rd.submission_status,
    -- 필수 필드 체크
    CASE WHEN rd.required_document_url IS NOT NULL THEN '✅' ELSE '❌' END as has_required_doc,
    CASE WHEN rd.bankbook_copy_url IS NOT NULL THEN '✅' ELSE '❌' END as has_bankbook,
    CASE WHEN (rd.salary_bank_name IS NOT NULL AND rd.salary_account_number IS NOT NULL AND rd.salary_account_holder IS NOT NULL) THEN '✅' ELSE '❌' END as has_account_info,
    -- 완전성 체크
    CASE 
        WHEN rd.required_document_url IS NULL 
         AND rd.bankbook_copy_url IS NULL 
         AND rd.salary_bank_name IS NULL 
         AND rd.salary_account_number IS NULL 
         AND rd.salary_account_holder IS NULL 
         AND (rd.submission_status IS NULL OR rd.submission_status = 'incomplete')
        THEN '🗑️ COMPLETELY_EMPTY'
        WHEN rd.required_document_url IS NULL 
         AND (rd.submission_status IS NULL OR rd.submission_status = 'incomplete')
        THEN '⚠️ NO_REQUIRED_DOC'
        ELSE '✅ HAS_DATA'
    END as data_status
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
ORDER BY up.name, rd.created_at;

-- 1-3. emergency_contacts 테이블 상태 분석
SELECT 
    ec.id,
    up.name as student_name,
    ec.user_id,
    ec.created_at,
    ec.updated_at,
    -- 기본 필드 체크
    CASE WHEN ec.blood_type IS NOT NULL THEN '✅' ELSE '❌' END as has_blood_type,
    CASE WHEN ec.local_phone IS NOT NULL THEN '✅' ELSE '❌' END as has_local_phone,
    CASE WHEN ec.domestic_phone IS NOT NULL THEN '✅' ELSE '❌' END as has_domestic_phone,
    CASE WHEN ec.local_address IS NOT NULL THEN '✅' ELSE '❌' END as has_local_address,
    CASE WHEN ec.institute_director_name IS NOT NULL THEN '✅' ELSE '❌' END as has_institute_info,
    -- 완전성 체크
    CASE 
        WHEN ec.blood_type IS NULL 
         AND ec.local_phone IS NULL 
         AND ec.domestic_phone IS NULL 
         AND ec.local_address IS NULL 
         AND ec.domestic_address IS NULL
         AND ec.institute_director_name IS NULL
         AND ec.institute_manager_name IS NULL
         AND ec.institute_helper_name IS NULL
         AND ec.local_emergency_name IS NULL
         AND ec.domestic_emergency_name IS NULL
         AND ec.university_name IS NULL
        THEN '🗑️ COMPLETELY_EMPTY'
        ELSE '✅ HAS_DATA'
    END as data_status
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
ORDER BY up.name, ec.created_at;

-- 1-4. 중복 데이터 확인
-- required_documents 중복
SELECT 
    user_id,
    up.name as student_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(rd.id::text, ', ' ORDER BY rd.created_at) as record_ids,
    MIN(rd.created_at) as first_created,
    MAX(rd.updated_at) as last_updated
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
GROUP BY user_id, up.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, student_name;

-- emergency_contacts 중복
SELECT 
    user_id,
    up.name as student_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(ec.id::text, ', ' ORDER BY ec.created_at) as record_ids,
    MIN(ec.created_at) as first_created,
    MAX(ec.updated_at) as last_updated
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
GROUP BY user_id, up.name
HAVING COUNT(*) > 1
ORDER BY duplicate_count DESC, student_name;

-- ==========================================
-- 2. 삭제 대상 식별 (실행 전 확인용)
-- ==========================================

-- 2-1. 삭제할 required_documents 레코드 확인
SELECT 
    '삭제 예정 - COMPLETELY_EMPTY' as deletion_type,
    rd.id,
    up.name as student_name,
    rd.created_at,
    rd.updated_at,
    'ALL_FIELDS_NULL' as reason
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
WHERE rd.required_document_url IS NULL 
  AND rd.bankbook_copy_url IS NULL 
  AND rd.salary_bank_name IS NULL 
  AND rd.salary_account_number IS NULL 
  AND rd.salary_account_holder IS NULL 
  AND (rd.submission_status IS NULL OR rd.submission_status = 'incomplete')

UNION ALL

-- 중복 중에서 빈 레코드 (더 안전한 접근)
SELECT 
    '삭제 예정 - DUPLICATE_EMPTY' as deletion_type,
    rd.id,
    up.name as student_name,
    rd.created_at,
    rd.updated_at,
    'DUPLICATE_AND_EMPTY' as reason
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
WHERE rd.user_id IN (
    SELECT user_id 
    FROM required_documents 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
)
AND rd.required_document_url IS NULL 
AND rd.bankbook_copy_url IS NULL 
AND rd.salary_bank_name IS NULL 
AND rd.salary_account_number IS NULL 
AND rd.salary_account_holder IS NULL

ORDER BY student_name, created_at;

-- 2-2. 삭제할 emergency_contacts 레코드 확인
SELECT 
    '삭제 예정 - COMPLETELY_EMPTY' as deletion_type,
    ec.id,
    up.name as student_name,
    ec.created_at,
    ec.updated_at,
    'ALL_FIELDS_NULL' as reason
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
WHERE ec.blood_type IS NULL 
  AND ec.local_phone IS NULL 
  AND ec.domestic_phone IS NULL 
  AND ec.local_address IS NULL 
  AND ec.domestic_address IS NULL
  AND ec.institute_director_name IS NULL
  AND ec.institute_manager_name IS NULL
  AND ec.institute_helper_name IS NULL
  AND ec.local_emergency_name IS NULL
  AND ec.domestic_emergency_name IS NULL
  AND ec.university_name IS NULL

UNION ALL

-- 중복 중에서 빈 레코드
SELECT 
    '삭제 예정 - DUPLICATE_EMPTY' as deletion_type,
    ec.id,
    up.name as student_name,
    ec.created_at,
    ec.updated_at,
    'DUPLICATE_AND_EMPTY' as reason
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
WHERE ec.user_id IN (
    SELECT user_id 
    FROM emergency_contacts 
    GROUP BY user_id 
    HAVING COUNT(*) > 1
)
AND ec.blood_type IS NULL 
AND ec.local_phone IS NULL 
AND ec.domestic_phone IS NULL 
AND ec.local_address IS NULL 
AND ec.domestic_address IS NULL
AND ec.institute_director_name IS NULL
AND ec.institute_manager_name IS NULL

ORDER BY student_name, created_at;

-- ==========================================
-- 3. 안전한 단계별 데이터 삭제
-- ==========================================

-- 🚨 주의: 실제 삭제가 실행됩니다. 반드시 백업 후 실행!

-- 3-1. required_documents 불완전 레코드 삭제
-- Step 1: 완전히 비어있는 레코드 삭제
WITH empty_records AS (
    SELECT id 
    FROM required_documents 
    WHERE required_document_url IS NULL 
      AND bankbook_copy_url IS NULL 
      AND salary_bank_name IS NULL 
      AND salary_account_number IS NULL 
      AND salary_account_holder IS NULL 
      AND (submission_status IS NULL OR submission_status = 'incomplete')
)
DELETE FROM required_documents 
WHERE id IN (SELECT id FROM empty_records);

-- Step 2: 중복 중에서 빈 레코드만 삭제 (데이터가 있는 레코드는 보존)
WITH duplicate_empty_records AS (
    SELECT rd.id
    FROM required_documents rd
    WHERE rd.user_id IN (
        SELECT user_id 
        FROM required_documents 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    )
    AND rd.required_document_url IS NULL 
    AND rd.bankbook_copy_url IS NULL 
    AND rd.salary_bank_name IS NULL 
    AND rd.salary_account_number IS NULL 
    AND rd.salary_account_holder IS NULL
    -- 같은 user_id에 데이터가 있는 다른 레코드가 있는 경우만
    AND EXISTS (
        SELECT 1 
        FROM required_documents rd2 
        WHERE rd2.user_id = rd.user_id 
        AND rd2.id != rd.id
        AND (rd2.required_document_url IS NOT NULL 
         OR rd2.bankbook_copy_url IS NOT NULL 
         OR rd2.salary_bank_name IS NOT NULL)
    )
)
DELETE FROM required_documents 
WHERE id IN (SELECT id FROM duplicate_empty_records);

-- 3-2. emergency_contacts 불완전 레코드 삭제
-- Step 1: 완전히 비어있는 레코드 삭제
WITH empty_emergency_records AS (
    SELECT id 
    FROM emergency_contacts 
    WHERE blood_type IS NULL 
      AND local_phone IS NULL 
      AND domestic_phone IS NULL 
      AND local_address IS NULL 
      AND domestic_address IS NULL
      AND institute_director_name IS NULL
      AND institute_manager_name IS NULL
      AND institute_helper_name IS NULL
      AND local_emergency_name IS NULL
      AND domestic_emergency_name IS NULL
      AND university_name IS NULL
)
DELETE FROM emergency_contacts 
WHERE id IN (SELECT id FROM empty_emergency_records);

-- Step 2: 중복 중에서 빈 레코드만 삭제
WITH duplicate_empty_emergency AS (
    SELECT ec.id
    FROM emergency_contacts ec
    WHERE ec.user_id IN (
        SELECT user_id 
        FROM emergency_contacts 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    )
    AND ec.blood_type IS NULL 
    AND ec.local_phone IS NULL 
    AND ec.domestic_phone IS NULL 
    AND ec.local_address IS NULL 
    AND ec.domestic_address IS NULL
    AND ec.institute_director_name IS NULL
    AND ec.institute_manager_name IS NULL
    -- 같은 user_id에 데이터가 있는 다른 레코드가 있는 경우만
    AND EXISTS (
        SELECT 1 
        FROM emergency_contacts ec2 
        WHERE ec2.user_id = ec.user_id 
        AND ec2.id != ec.id
        AND (ec2.blood_type IS NOT NULL 
         OR ec2.local_phone IS NOT NULL 
         OR ec2.institute_director_name IS NOT NULL)
    )
)
DELETE FROM emergency_contacts 
WHERE id IN (SELECT id FROM duplicate_empty_emergency);

-- ==========================================
-- 4. 남은 중복 데이터 정리 (최신 데이터만 유지)
-- ==========================================

-- 4-1. required_documents 중복 정리 (최신 updated_at 기준)
WITH ranked_required_docs AS (
    SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY 
                CASE WHEN required_document_url IS NOT NULL THEN 1 ELSE 2 END, -- 필수서류 있는 것 우선
                updated_at DESC NULLS LAST,
                created_at DESC
        ) as rn
    FROM required_documents
),
docs_to_delete AS (
    SELECT id 
    FROM ranked_required_docs 
    WHERE rn > 1
)
DELETE FROM required_documents 
WHERE id IN (SELECT id FROM docs_to_delete);

-- 4-2. emergency_contacts 중복 정리 (최신 updated_at 기준)
WITH ranked_emergency_contacts AS (
    SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (
            PARTITION BY user_id 
            ORDER BY 
                CASE WHEN blood_type IS NOT NULL THEN 1 ELSE 2 END, -- 기본정보 있는 것 우선
                updated_at DESC NULLS LAST,
                created_at DESC
        ) as rn
    FROM emergency_contacts
),
contacts_to_delete AS (
    SELECT id 
    FROM ranked_emergency_contacts 
    WHERE rn > 1
)
DELETE FROM emergency_contacts 
WHERE id IN (SELECT id FROM contacts_to_delete);

-- ==========================================
-- 5. 정리 결과 검증
-- ==========================================

-- 5-1. 정리 후 데이터 현황
SELECT 
    '정리 후 현황' as category,
    'required_documents 레코드' as metric,
    COUNT(*) as count
FROM required_documents

UNION ALL

SELECT 
    '정리 후 현황' as category,
    'emergency_contacts 레코드' as metric,
    COUNT(*) as count
FROM emergency_contacts

UNION ALL

SELECT 
    '정리 후 현황' as category,
    'required_documents 유니크 사용자' as metric,
    COUNT(DISTINCT user_id) as count
FROM required_documents

UNION ALL

SELECT 
    '정리 후 현황' as category,
    'emergency_contacts 유니크 사용자' as metric,
    COUNT(DISTINCT user_id) as count
FROM emergency_contacts;

-- 5-2. 남은 중복 확인 (없어야 정상)
SELECT 
    '중복 검사 - required_documents' as check_type,
    user_id,
    up.name as student_name,
    COUNT(*) as duplicate_count
FROM required_documents rd
LEFT JOIN user_profiles up ON rd.user_id = up.id
GROUP BY user_id, up.name
HAVING COUNT(*) > 1

UNION ALL

SELECT 
    '중복 검사 - emergency_contacts' as check_type,
    user_id,
    up.name as student_name,
    COUNT(*) as duplicate_count
FROM emergency_contacts ec
LEFT JOIN user_profiles up ON ec.user_id = up.id
GROUP BY user_id, up.name
HAVING COUNT(*) > 1

ORDER BY check_type, student_name;

-- 5-3. 김채연 학생 최종 확인
SELECT 
    '김채연 학생 최종 상태' as check_title,
    up.name as student_name,
    rd.id as req_doc_id,
    ec.id as emergency_contact_id,
    CASE WHEN rd.id IS NOT NULL THEN '✅' ELSE '❌' END as has_req_doc_record,
    CASE WHEN ec.id IS NOT NULL THEN '✅' ELSE '❌' END as has_emergency_record
FROM user_profiles up
LEFT JOIN required_documents rd ON up.id = rd.user_id
LEFT JOIN emergency_contacts ec ON up.id = ec.user_id
WHERE up.name = '김채연'
ORDER BY up.name;

-- 5-4. 뷰 테이블 동작 확인
SELECT 
    student_name,
    COUNT(*) as view_record_count,
    CASE WHEN COUNT(*) = 1 THEN '✅ 정상' ELSE '❌ 여전히 중복' END as status
FROM v_student_required_documents_summary
GROUP BY student_name, user_id
ORDER BY view_record_count DESC, student_name;

-- ==========================================
-- 📋 실행 가이드
-- ==========================================

/*
🔧 실행 순서:

1. 데이터 백업 (필수!)
   - Supabase Dashboard → Database → Backup 생성

2. 현재 상태 분석 (섹션 1)
   - 전체 현황 파악
   - 중복 및 불완전 데이터 확인

3. 삭제 대상 확인 (섹션 2)
   - 실제 삭제 전 삭제될 레코드 검토
   - 예상치 못한 데이터 삭제 방지

4. 단계별 데이터 정리 (섹션 3-4)
   - 불완전 레코드 삭제
   - 중복 레코드 정리

5. 결과 검증 (섹션 5)
   - 정리 후 상태 확인
   - 김채연 학생 특별 확인

⚠️ 주의사항:
- 반드시 백업 후 실행
- 각 단계별 결과 확인 후 다음 진행
- 의도하지 않은 데이터 삭제 주의
- 뷰 테이블 정상 동작 최종 확인

✅ 예상 결과:
- 김채연 학생: 1개 레코드만 유지
- 모든 학생: 중복 제거, 최신 데이터 보존
- 불완전 레코드: 완전 삭제
- 뷰 테이블: 정상 동작 (1:1 관계)
*/