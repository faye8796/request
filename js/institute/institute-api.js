/**
 * 🔗 Institute API Module (v4.6.2) - getInstituteList 함수 추가
 * 세종학당 파견학당 정보 관리 시스템 - Supabase API 전용 모듈
 * 
 * 📋 담당 기능:
 * - institutes 테이블 CRUD 기능 (실제 DB 컬럼명 사용)
 * - user_profiles 테이블 문화인턴 조회
 * - Storage API 연동 (이미지 업로드)
 * - 15개 필드 완전 지원 + 완성도 관리
 * 
 * 🔗 의존성: SupabaseCore만 의존
 * 🚫 독립성: 기존 SupabaseAdmin/Student 모듈과 분리
 * 
 * 🔧 v4.6.2 수정사항:
 * - getInstituteList() 함수 추가 (InstituteCore 호환성)
 * - 초기화 오류 해결 완료
 */

class InstituteAPI {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        
        // 📋 실제 DB 컬럼명 매핑 (15개 주요 필드)
        this.DB_FIELDS = {
            // 기본 정보 (4개)
            name_ko: 'name_ko',                    // 학당명 (필수)
            name_en: 'name_en',                    // 영문명
            operator: 'operator',                  // 운영기관
            image_url: 'image_url',                // 학당사진
            
            // 연락처 정보 (5개)
            address: 'address',                    // 주소
            phone: 'phone',                        // 대표연락처
            sns_url: 'sns_url',                    // 홈페이지/SNS
            contact_person: 'contact_person',      // 담당자성명
            contact_phone: 'contact_phone',        // 담당자연락처
            
            // 프로그램 정보 (3개)
            local_coordinator: 'local_coordinator',      // 현지적응전담인력
            lesson_plan: 'lesson_plan',                  // 문화수업운영계획
            desired_courses: 'desired_courses',          // 희망개설강좌
            
            // 지원 정보 (3개)
            local_language_requirement: 'local_language_requirement', // 현지어구사필요수준
            support_provided: 'support_provided',                     // 학당지원사항
            safety_info_url: 'safety_info_url',                       // 파견국가안전정보
            
            // 완성도 관리 (2개)
            info_completed: 'info_completed',              // 정보 완성 여부
            completion_percentage: 'completion_percentage' // 완성 비율 (0-100)
        };
        
        this.STORAGE_BUCKET = 'institute-images';
        this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        this.ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        
        console.log('🔗 InstituteAPI 모듈 초기화됨 (v4.6.2 - getInstituteList 함수 추가)');
    }

    /**
     * 🚀 API 모듈 초기화
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 InstituteAPI 초기화 시작...');
            
            // SupabaseCore 의존성 체크
            if (!window.SupabaseCore || typeof window.SupabaseCore.ensureClient !== 'function') {
                throw new Error('SupabaseCore 모듈이 로드되지 않았습니다');
            }
            
            // Supabase 클라이언트 초기화
            this.supabase = await window.SupabaseCore.ensureClient();
            if (!this.supabase) {
                throw new Error('Supabase 클라이언트를 가져올 수 없습니다');
            }
            
            // 연결 테스트
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ InstituteAPI 초기화 완료 (v4.6.2)');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteAPI 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 🔌 연결 테스트
     */
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('institutes')
                .select('id, completion_percentage')
                .limit(1);
                
            if (error) throw error;
            console.log('✅ institutes 테이블 연결 확인 (완성도 컬럼 포함)');
            
        } catch (error) {
            console.error('❌ 연결 테스트 실패:', error);
            throw error;
        }
    }

    /**
     * 📋 기본 학당 목록 조회 (InstituteCore 호환용)
     * - InstituteCore에서 기본 데이터 로딩용으로 사용
     * - 간단한 기본 정보만 반환 (성능 최적화)
     * @returns {Promise<Array>}
     */
    async getInstituteList() {
        if (!this.initialized) await this.initialize();
        
        try {
            console.log('🔄 기본 학당 목록 조회 중...');
            
            const { data, error } = await this.supabase
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operator,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq('is_active', true)
                .order('name_ko', { ascending: true });
            
            if (error) {
                console.error('❌ 기본 학당 목록 조회 실패:', error);
                throw error;
            }
            
            console.log(`✅ ${data.length}개 학당 기본 목록 조회 완료`);
            return data || [];
            
        } catch (error) {
            console.error('❌ getInstituteList 실패:', error);
            return [];
        }
    }

    /**
     * 📋 카드 표시용 최적화된 학당 정보 조회
     * - 단순한 별도 조회 방식으로 안정성 확보
     * - 초기 로딩 성능 최적화
     * @param {Object} options - 조회 옵션
     * @returns {Promise<Array>}
     */
    async getInstituteCardData(options = {}) {
        if (!this.initialized) await this.initialize();
        
        try {
            console.log('🔄 학당 카드 데이터 조회 중...');
            
            // 1. 학당 기본 정보 조회
            let query = this.supabase
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operator,
                    image_url,
                    info_completed,
                    completion_percentage,
                    created_at,
                    updated_at
                `)
                .order('name_ko', { ascending: true });
            
            // 필터링 옵션
            if (options.search) {
                query = query.or(`name_ko.ilike.%${options.search}%,name_en.ilike.%${options.search}%`);
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            const { data: instituteData, error: instituteError } = await query;
            if (instituteError) throw instituteError;
            
            // 2. 각 학당의 배치된 문화인턴 수 조회 (최적화)
            const cardData = [];
            for (const institute of instituteData) {
                // 간단한 COUNT 쿼리로 성능 최적화
                const { data: internCount, error: countError } = await this.supabase
                    .from('user_profiles')
                    .select('id', { count: 'exact', head: true })
                    .eq('sejong_institute', institute.id.toString())
                    .eq('user_type', 'student');
                
                if (countError) {
                    console.warn(`⚠️ 인턴 수 조회 실패 (${institute.name_ko}):`, countError);
                }
                
                const internCountNumber = countError ? 0 : (internCount?.length || 0);
                
                cardData.push({
                    id: institute.id,
                    name_ko: institute.name_ko,
                    name_en: institute.name_en,
                    operator: institute.operator,
                    image_url: institute.image_url,
                    info_completed: institute.info_completed,
                    completion_percentage: institute.completion_percentage,
                    assigned_intern_count: internCountNumber,
                    last_updated: institute.updated_at,
                    status_text: this.getCompletionStatusText(institute.completion_percentage)
                });
            }
            
            console.log(`✅ ${cardData.length}개 학당 카드 데이터 조회 완료`);
            return cardData;
            
        } catch (error) {
            console.error('❌ getInstituteCardData 실패:', error);
            return [];
        }
    }

    /**
     * 📊 완성도에 따른 상태 텍스트 생성
     * @param {number} percentage - 완성 비율
     * @returns {string}
     */
    getCompletionStatusText(percentage) {
        if (percentage >= 100) return '완성';
        if (percentage >= 75) return '거의 완성';
        if (percentage >= 50) return '진행 중';
        if (percentage >= 25) return '시작됨';
        return '미시작';
    }

    /**
     * 🔍 학당 상세 정보 조회 (15개 필드 전체)
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Object|null>}
     */
    async getInstituteById(instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId) {
            console.warn('⚠️ 학당 ID가 필요합니다');
            return null;
        }
        
        try {
            console.log(`🔄 학당 상세 정보 조회: ${instituteId}`);
            
            const { data, error } = await this.supabase
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operator,
                    image_url,
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
                    info_completed,
                    completion_percentage,
                    is_active,
                    created_at,
                    updated_at
                `)
                .eq('id', instituteId)
                .single();
            
            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn(`⚠️ 학당을 찾을 수 없습니다: ${instituteId}`);
                    return null;
                }
                throw error;
            }
            
            console.log(`✅ 학당 상세 정보 조회 완료: ${data.name_ko} (완성도: ${data.completion_percentage}%)`);
            return data;
            
        } catch (error) {
            console.error(`❌ getInstituteById 실패 (${instituteId}):`, error);
            return null;
        }
    }

    /**
     * 📝 학당 정보 업데이트 (자동 완성도 계산)
     * @param {string} instituteId - 학당 ID
     * @param {Object} updateData - 업데이트할 데이터
     * @returns {Promise<Object>}
     */
    async updateInstitute(instituteId, updateData) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId || !updateData) {
            console.warn('⚠️ 학당 ID와 업데이트 데이터가 필요합니다');
            return { success: false, error: '필수 매개변수가 누락되었습니다' };
        }
        
        try {
            console.log(`🔄 학당 정보 업데이트: ${instituteId}`);
            
            // 업데이트 가능한 필드만 필터링 (실제 DB 컬럼명 사용)
            const allowedFields = Object.values(this.DB_FIELDS);
            const filteredData = {};
            
            for (const [key, value] of Object.entries(updateData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    filteredData[key] = value;
                }
            }
            
            // updated_at 자동 설정
            filteredData.updated_at = new Date().toISOString();
            
            const { data, error } = await this.supabase
                .from('institutes')
                .update(filteredData)
                .eq('id', instituteId)
                .select()
                .single();
            
            if (error) {
                console.error('❌ 학당 정보 업데이트 실패:', error);
                throw error;
            }
            
            console.log(`✅ 학당 정보 업데이트 완료: ${data.name_ko} (완성도: ${data.completion_percentage}%)`);
            
            return {
                success: true,
                data: data,
                completion: {
                    completed: data.info_completed,
                    percentage: data.completion_percentage,
                    status_text: this.getCompletionStatusText(data.completion_percentage)
                }
            };
            
        } catch (error) {
            console.error(`❌ updateInstitute 실패 (${instituteId}):`, error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * ➕ 새 학당 생성
     * @param {Object} instituteData - 학당 데이터
     * @returns {Promise<Object|null>}
     */
    async createInstitute(instituteData) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteData || !instituteData.name_ko) {
            console.warn('⚠️ 학당명(한국어)은 필수입니다');
            return null;
        }
        
        try {
            console.log(`🔄 새 학당 생성: ${instituteData.name_ko}`);
            
            // 필드 필터링 (실제 DB 컬럼명 사용)
            const allowedFields = Object.values(this.DB_FIELDS);
            const filteredData = {};
            
            for (const [key, value] of Object.entries(instituteData)) {
                if (allowedFields.includes(key) && value !== undefined) {
                    filteredData[key] = value;
                }
            }
            
            // 생성/수정 시간 설정
            const now = new Date().toISOString();
            filteredData.created_at = now;
            filteredData.updated_at = now;
            filteredData.is_active = true;
            
            const { data, error } = await this.supabase
                .from('institutes')
                .insert(filteredData)
                .select()
                .single();
            
            if (error) {
                console.error('❌ 새 학당 생성 실패:', error);
                throw error;
            }
            
            console.log(`✅ 새 학당 생성 완료: ${data.name_ko} (ID: ${data.id}, 완성도: ${data.completion_percentage}%)`);
            return data;
            
        } catch (error) {
            console.error('❌ createInstitute 실패:', error);
            return null;
        }
    }

    /**
     * 👥 문화인턴 목록 조회 (수정된 타입 캐스팅)
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Array>}
     */
    async getCulturalInternsByInstitute(instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId) return [];
        
        try {
            console.log(`🔄 문화인턴 목록 조회: ${instituteId}`);
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(`
                    id,
                    full_name,
                    email,
                    phone,
                    sejong_institute,
                    institution,
                    major,
                    grade,
                    status,
                    created_at
                `)
                .eq('sejong_institute', instituteId.toString()) // UUID를 문자열로 변환
                .eq('user_type', 'student')
                .order('full_name', { ascending: true });
            
            if (error) {
                console.error('❌ 문화인턴 목록 조회 실패:', error);
                return [];
            }
            
            console.log(`✅ ${data.length}명의 문화인턴 조회 완료`);
            return data || [];
            
        } catch (error) {
            console.error(`❌ getCulturalInternsByInstitute 실패 (${instituteId}):`, error);
            return [];
        }
    }

    /**
     * 📊 대시보드용 통계 정보
     * @returns {Promise<Object>}
     */
    async getDashboardStatistics() {
        if (!this.initialized) await this.initialize();
        
        try {
            console.log('🔄 대시보드 통계 조회 중...');
            
            // 학당 통계
            const { data: instituteStats, error: instituteError } = await this.supabase
                .from('institutes')
                .select(`
                    id,
                    info_completed,
                    completion_percentage
                `);
            
            if (instituteError) throw instituteError;
            
            // 인턴 통계 (타입 캐스팅 문제 해결)
            const { data: internStats, error: internError } = await this.supabase
                .from('user_profiles')
                .select('sejong_institute', { count: 'exact' })
                .eq('user_type', 'student')
                .not('sejong_institute', 'is', null);
            
            if (internError) throw internError;
            
            // 통계 계산
            const totalInstitutes = instituteStats.length;
            const completedInstitutes = instituteStats.filter(inst => inst.info_completed).length;
            const assignedInterns = internStats.length;
            const avgCompletion = totalInstitutes > 0 
                ? Math.round(instituteStats.reduce((sum, inst) => sum + (inst.completion_percentage || 0), 0) / totalInstitutes)
                : 0;
            
            const stats = {
                total_institutes: totalInstitutes,
                completed_institutes: completedInstitutes,
                completion_rate: totalInstitutes > 0 ? Math.round((completedInstitutes / totalInstitutes) * 100) : 0,
                assigned_interns: assignedInterns,
                average_completion: avgCompletion,
                nearly_completed: instituteStats.filter(inst => inst.completion_percentage >= 75).length,
                in_progress: instituteStats.filter(inst => inst.completion_percentage >= 25 && inst.completion_percentage < 75).length,
                barely_started: instituteStats.filter(inst => inst.completion_percentage < 25).length,
                generated_at: new Date().toISOString()
            };
            
            console.log('✅ 대시보드 통계 조회 완료:', stats);
            return stats;
            
        } catch (error) {
            console.error('❌ getDashboardStatistics 실패:', error);
            return {};
        }
    }

    /**
     * 🔍 학당 검색 (카드 표시용)
     * @param {Object} searchParams - 검색 조건
     * @returns {Promise<Array>}
     */
    async searchInstitutes(searchParams = {}) {
        if (!this.initialized) await this.initialize();
        
        try {
            console.log('🔍 학당 검색:', searchParams);
            
            let query = this.supabase
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operator,
                    image_url,
                    info_completed,
                    completion_percentage,
                    updated_at
                `);
            
            // 검색 조건 적용
            if (searchParams.keyword) {
                query = query.or(`
                    name_ko.ilike.%${searchParams.keyword}%,
                    name_en.ilike.%${searchParams.keyword}%,
                    operator.ilike.%${searchParams.keyword}%
                `);
            }
            
            if (searchParams.completed !== undefined) {
                query = query.eq('info_completed', searchParams.completed);
            }
            
            if (searchParams.minCompletion !== undefined) {
                query = query.gte('completion_percentage', searchParams.minCompletion);
            }
            
            // 정렬
            const orderBy = searchParams.orderBy || 'name_ko';
            const ascending = searchParams.ascending !== false;
            query = query.order(orderBy, { ascending });
            
            // 페이징
            if (searchParams.limit) {
                query = query.limit(searchParams.limit);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ 학당 검색 실패:', error);
                throw error;
            }
            
            console.log(`✅ ${data.length}개 학당 검색 완료`);
            return data || [];
            
        } catch (error) {
            console.error('❌ searchInstitutes 실패:', error);
            return [];
        }
    }

    /**
     * 📸 이미지 업로드 (Storage API)
     * @param {File} file - 업로드할 파일
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<string|null>}
     */
    async uploadInstituteImage(file, instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!file || !instituteId) {
            console.warn('⚠️ 파일과 학당 ID가 필요합니다');
            return null;
        }
        
        try {
            // 파일 검증
            if (!this.ALLOWED_FILE_TYPES.includes(file.type)) {
                throw new Error('지원하지 않는 파일 형식입니다. (JPG, PNG, WebP만 허용)');
            }
            
            if (file.size > this.MAX_FILE_SIZE) {
                throw new Error('파일 크기가 너무 큽니다. (최대 5MB)');
            }
            
            console.log(`🔄 이미지 업로드 시작: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)}MB)`);
            
            // 파일명 생성 (중복 방지)
            const fileExt = file.name.split('.').pop();
            const fileName = `${instituteId}_${Date.now()}.${fileExt}`;
            const filePath = `institutes/${fileName}`;
            
            const { data, error } = await this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) {
                console.error('❌ 이미지 업로드 실패:', error);
                throw error;
            }
            
            // 공개 URL 생성
            const { data: urlData } = this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .getPublicUrl(filePath);
            
            const imageUrl = urlData.publicUrl;
            console.log(`✅ 이미지 업로드 완료: ${imageUrl}`);
            
            return imageUrl;
            
        } catch (error) {
            console.error('❌ uploadInstituteImage 실패:', error);
            return null;
        }
    }

    /**
     * 📊 API 모듈 상태 (v4.6.2)
     */
    getAPIStatus() {
        return {
            initialized: this.initialized,
            supabase_connected: !!this.supabase,
            supported_fields: Object.keys(this.DB_FIELDS).length,
            storage_bucket: this.STORAGE_BUCKET,
            module_version: '4.6.2',
            database_integration: 'completion tracking enabled',
            type_casting: 'UUID ↔ VARCHAR fixed',
            compatibility: 'InstituteCore getInstituteList() supported'
        };
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteAPI = new InstituteAPI();

console.log('🔗 InstituteAPI 모듈 로드 완료 (v4.6.2) - getInstituteList 함수 추가로 초기화 오류 해결');
