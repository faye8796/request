/**
 * 학생용 학당 정보 API 모듈
 * Version: 4.6.6
 * Description: 개선된 학당 정보 조회 및 JSONB 데이터 처리 API
 */

window.InstituteInfoAPI = (function() {
    'use strict';
    
    // 모듈 상태
    let isInitialized = false;
    let supabaseClient = null;
    
    /**
     * 모듈 초기화
     */
    async function initialize() {
        try {
            console.log('🔗 InstituteInfoAPI 초기화 시작 v4.6.6');
            
            // SupabaseCore 확인 및 클라이언트 확보
            if (!window.SupabaseCore) {
                throw new Error('SupabaseCore가 로드되지 않았습니다');
            }
            
            // SupabaseCore 클라이언트 확보
            supabaseClient = await window.SupabaseCore.ensureClient();
            
            if (!supabaseClient) {
                throw new Error('Supabase 클라이언트 초기화 실패');
            }
            
            isInitialized = true;
            
            console.log('✅ InstituteInfoAPI 초기화 완료 v4.6.6');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteInfoAPI 초기화 실패:', error);
            throw error;
        }
    }
    
    /**
     * 현재 사용자의 파견학당 정보 조회
     */
    async function getCurrentUserInstitute() {
        try {
            if (!isInitialized) {
                await initialize();
            }
            
            console.log('🔍 사용자 파견학당 정보 조회 중...');
            
            // 현재 로그인한 사용자 정보 가져오기
            const currentStudent = localStorage.getItem('currentStudent');
            if (!currentStudent) {
                throw new Error('로그인 정보를 찾을 수 없습니다');
            }
            
            const studentData = JSON.parse(currentStudent);
            const instituteName = studentData.sejong_institute;
            
            if (!instituteName) {
                throw new Error('파견학당이 배정되지 않았습니다');
            }
            
            console.log(`🏛️ 배정된 학당: ${instituteName}`);
            
            // institutes 테이블에서 학당 정보 조회
            const { data: instituteData, error: instituteError } = await supabaseClient
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operator,
                    address,
                    phone,
                    sns_url,
                    contact_person,
                    contact_phone,
                    local_coordinator,
                    lesson_plan,
                    desired_courses,
                    local_language_requirement,
                    support_provided,
                    safety_info_url,
                    image_url,
                    info_completed,
                    completion_percentage,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq('name_ko', instituteName)
                .eq('is_active', true)
                .single();
            
            if (instituteError) {
                console.error('❌ 학당 정보 조회 실패:', instituteError);
                throw new Error(`학당 정보 조회 실패: ${instituteError.message}`);
            }
            
            if (!instituteData) {
                throw new Error(`학당 정보를 찾을 수 없습니다: ${instituteName}`);
            }
            
            console.log('✅ 학당 정보 조회 완료:', instituteData.name_ko);
            return instituteData;
            
        } catch (error) {
            console.error('❌ 사용자 파견학당 조회 실패:', error);
            throw error;
        }
    }
    
    /**
     * 학당 이미지 URL 생성
     */
    function getInstituteImageUrl(imageUrl) {
        try {
            if (!imageUrl) {
                return null;
            }
            
            // 이미 완전한 URL인 경우
            if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
                return imageUrl;
            }
            
            // Supabase Storage URL 생성
            const { data } = supabaseClient.storage
                .from('institute-images')
                .getPublicUrl(imageUrl);
            
            return data?.publicUrl || null;
            
        } catch (error) {
            console.warn('⚠️ 이미지 URL 생성 실패:', error);
            return null;
        }
    }
    
    /**
     * 안전정보 URL 유효성 검사
     */
    async function validateSafetyInfoUrl(url) {
        try {
            if (!url) {
                return false;
            }
            
            // 기본적인 URL 형식 검사
            const urlPattern = /^https?:\/\/[^\s/$.?#].[^\s]*$/;
            if (!urlPattern.test(url)) {
                return false;
            }
            
            console.log(`🔍 안전정보 URL 확인: ${url}`);
            return true;
            
        } catch (error) {
            console.warn('⚠️ 안전정보 URL 검증 실패:', error);
            return false;
        }
    }
    
    /**
     * JSON 필드 파싱 헬퍼
     */
    function parseJsonField(jsonData, fieldName = 'JSON 데이터') {
        try {
            if (!jsonData) {
                return null;
            }
            
            // 이미 객체인 경우
            if (typeof jsonData === 'object') {
                return jsonData;
            }
            
            // 문자열인 경우 파싱
            if (typeof jsonData === 'string') {
                // 빈 문자열이나 공백만 있는 경우
                if (jsonData.trim() === '') {
                    return null;
                }
                
                try {
                    return JSON.parse(jsonData);
                } catch (parseError) {
                    // JSON 파싱 실패 시 원본 문자열 반환
                    console.warn(`⚠️ ${fieldName} JSON 파싱 실패, 문자열로 처리:`, parseError);
                    return jsonData;
                }
            }
            
            return jsonData;
            
        } catch (error) {
            console.warn(`⚠️ ${fieldName} 파싱 실패:`, error);
            return null;
        }
    }
    
    /**
     * JSONB 데이터를 테이블 표시용으로 변환
     */
    function formatJsonForTable(jsonData, fieldName = 'JSON 데이터') {
        try {
            const parsed = parseJsonField(jsonData, fieldName);
            
            if (!parsed) {
                return null;
            }
            
            // 배열인 경우
            if (Array.isArray(parsed)) {
                if (parsed.length === 0) {
                    return null;
                }
                
                // 객체 배열인 경우 테이블로 표시
                if (typeof parsed[0] === 'object') {
                    return parsed;
                }
                
                // 문자열 배열인 경우 목록으로 표시
                return parsed;
            }
            
            // 객체인 경우
            if (typeof parsed === 'object') {
                return Object.entries(parsed).map(([key, value]) => ({
                    항목: key,
                    내용: value
                }));
            }
            
            // 단순 값인 경우
            return parsed;
            
        } catch (error) {
            console.warn(`⚠️ ${fieldName} 테이블 포맷팅 실패:`, error);
            return jsonData;
        }
    }
    
    /**
     * 학당 데이터 전처리
     */
    function processInstituteData(instituteData) {
        try {
            // 기본 정보 처리
            const processed = {
                ...instituteData,
                
                // 이미지 URL 처리
                image_url: getInstituteImageUrl(instituteData.image_url),
                
                // JSON 필드 처리
                desired_courses: formatJsonForTable(instituteData.desired_courses, '희망 개설 강좌'),
                education_environment: formatJsonForTable(instituteData.education_environment, '교육 환경'),
                
                // 빈 값 처리 및 표시용 이름
                display_name: instituteData.name_ko || '학당명 없음',
                display_english_name: instituteData.name_en || 'English Name Not Available',
                display_operator: instituteData.operator || '운영기관 정보 없음',
                display_address: instituteData.address || '주소 정보 없음',
                display_phone: instituteData.phone || '연락처 정보 없음',
                display_contact: instituteData.contact_person || '담당자 정보 없음',
                display_sns: instituteData.sns_url || '정보 없음',
                display_coordinator: instituteData.local_coordinator || '정보 없음',
                display_lesson_plan: instituteData.lesson_plan || '수업 계획 정보 없음',
                display_language_req: instituteData.local_language_requirement || '정보 없음',
                display_support: instituteData.support_provided || '지원 정보 없음',
                
                // 완성도 정보
                completion_status: instituteData.info_completed ? '완료' : '미완료',
                completion_percentage: instituteData.completion_percentage || 0
            };
            
            console.log('✅ 학당 데이터 전처리 완료');
            return processed;
            
        } catch (error) {
            console.error('❌ 학당 데이터 전처리 실패:', error);
            return instituteData;
        }
    }
    
    /**
     * 에러 처리 헬퍼
     */
    function handleError(error, context = '작업') {
        const errorMessage = error.message || error.toString();
        
        // Supabase 에러 메시지 번역
        let userFriendlyMessage = errorMessage;
        
        if (errorMessage.includes('JSON')) {
            userFriendlyMessage = '데이터 형식 오류가 발생했습니다';
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
            userFriendlyMessage = '네트워크 연결을 확인해주세요';
        } else if (errorMessage.includes('permission') || errorMessage.includes('unauthorized')) {
            userFriendlyMessage = '접근 권한이 없습니다';
        } else if (errorMessage.includes('not found')) {
            userFriendlyMessage = '요청한 정보를 찾을 수 없습니다';
        } else if (errorMessage.includes('timeout')) {
            userFriendlyMessage = '요청 시간이 초과되었습니다';
        } else if (errorMessage.includes('로그인')) {
            userFriendlyMessage = '로그인이 필요합니다';
        } else if (errorMessage.includes('배정')) {
            userFriendlyMessage = '파견학당이 배정되지 않았습니다. 관리자에게 문의해주세요';
        }
        
        console.error(`❌ ${context} 실패:`, {
            originalError: errorMessage,
            userMessage: userFriendlyMessage,
            context
        });
        
        return {
            message: userFriendlyMessage,
            originalError: errorMessage,
            context
        };
    }
    
    /**
     * 연결 상태 확인
     */
    function checkConnection() {
        return isInitialized && supabaseClient !== null;
    }
    
    /**
     * 데이터 유효성 검사
     */
    function validateInstituteData(data) {
        try {
            if (!data) {
                return { isValid: false, message: '데이터가 없습니다' };
            }
            
            if (!data.name_ko) {
                return { isValid: false, message: '학당명이 없습니다' };
            }
            
            if (!data.operator) {
                return { isValid: false, message: '운영기관 정보가 없습니다' };
            }
            
            return { isValid: true, message: '유효한 데이터입니다' };
            
        } catch (error) {
            console.error('❌ 데이터 유효성 검사 실패:', error);
            return { isValid: false, message: '데이터 검증 중 오류가 발생했습니다' };
        }
    }
    
    /**
     * 모듈 정보 가져오기
     */
    function getModuleInfo() {
        return {
            name: 'InstituteInfoAPI',
            version: '4.6.6',
            initialized: isInitialized,
            hasSupabaseClient: !!supabaseClient,
            description: '개선된 학당 정보 조회 및 JSONB 데이터 처리 API'
        };
    }
    
    // 공개 API
    return {
        // 초기화
        initialize,
        
        // 데이터 조회
        getCurrentUserInstitute,
        validateSafetyInfoUrl,
        
        // 데이터 처리
        processInstituteData,
        parseJsonField,
        formatJsonForTable,
        getInstituteImageUrl,
        
        // 유효성 검사
        validateInstituteData,
        
        // 유틸리티
        handleError,
        checkConnection,
        getModuleInfo,
        
        // 상태 확인
        get isInitialized() { return isInitialized; },
        get client() { return supabaseClient; }
    };
})();

// 모듈 로드 완료 로그
console.log('📡 InstituteInfoAPI 모듈 로드 완료 - v4.6.6 (개선된 JSONB 처리)');