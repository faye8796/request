/**
 * 학생용 학당 정보 API 모듈
 * Version: 4.6.4
 * Description: 학당 정보 조회 및 Supabase 연동 전용 API
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
            console.log('🔗 InstituteInfoAPI 초기화 시작');
            
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
            
            console.log('✅ InstituteInfoAPI 초기화 완료');
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
                    *
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
                return [];
            }
            
            // 이미 객체인 경우
            if (typeof jsonData === 'object') {
                return Array.isArray(jsonData) ? jsonData : [jsonData];
            }
            
            // 문자열인 경우 파싱
            if (typeof jsonData === 'string') {
                const parsed = JSON.parse(jsonData);
                return Array.isArray(parsed) ? parsed : [parsed];
            }
            
            return [];
            
        } catch (error) {
            console.warn(`⚠️ ${fieldName} 파싱 실패:`, error);
            return [];
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
                desired_course: parseJsonField(instituteData.desired_course, '희망 과정'),
                education_environment: parseJsonField(instituteData.education_environment, '교육 환경'),
                
                // 빈 값 처리
                display_name: instituteData.name_ko || '학당명 없음',
                display_operator: instituteData.operator || '운영기관 정보 없음',
                display_address: instituteData.address || '주소 정보 없음'
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
        } else if (errorMessage.includes('network')) {
            userFriendlyMessage = '네트워크 연결을 확인해주세요';
        } else if (errorMessage.includes('permission')) {
            userFriendlyMessage = '접근 권한이 없습니다';
        } else if (errorMessage.includes('not found')) {
            userFriendlyMessage = '요청한 정보를 찾을 수 없습니다';
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
     * 모듈 정보 가져오기
     */
    function getModuleInfo() {
        return {
            name: 'InstituteInfoAPI',
            version: '4.6.4',
            initialized: isInitialized,
            hasSupabaseClient: !!supabaseClient,
            description: '학당 정보 조회 전용 API 모듈'
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
        getInstituteImageUrl,
        
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
console.log('📡 InstituteInfoAPI 모듈 로드 완료 - v4.6.4 (SupabaseCore 연동)');