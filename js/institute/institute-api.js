/**
 * 🔗 Institute API Module (v4.5.1)
 * 세종학당 파견학당 정보 관리 시스템 - Supabase API 전용 모듈
 * 
 * 📋 담당 기능:
 * - institutes 테이블 CRUD 기능
 * - user_profiles 테이블 문화인턴 조회
 * - Storage API 연동 (이미지 업로드)
 * - 15개 필드 완전 지원
 * 
 * 🔗 의존성: SupabaseCore만 의존
 * 🚫 독립성: 기존 SupabaseAdmin/Student 모듈과 분리
 * 
 * 🔧 v4.5.1 수정사항:
 * - SupabaseCore.getClient() → SupabaseCore.ensureClient() 변경
 * - API 불일치 문제 해결로 D단계 시스템 초기화 오류 수정
 */

class InstituteAPI {
    constructor() {
        this.supabase = null;
        this.initialized = false;
        
        // 📋 institutes 테이블 15개 필드 매핑
        this.INSTITUTE_FIELDS = {
            // 기본 정보 (4개)
            name_ko: 'name_ko',                    // 학당명 (필수)
            name_en: 'name_en',                    // 영문명
            operating_organization: 'operating_organization', // 운영기관
            image_url: 'image_url',                // 학당사진
            
            // 연락처 정보 (5개)
            address: 'address',                    // 주소
            phone: 'phone',                        // 대표연락처
            website_sns: 'website_sns',            // 홈페이지/SNS
            manager_name: 'manager_name',          // 담당자성명
            manager_contact: 'manager_contact',    // 담당자연락처
            
            // 프로그램 정보 (3개)
            local_adaptation_staff: 'local_adaptation_staff',       // 현지적응전담인력
            cultural_program_plan: 'cultural_program_plan',         // 문화수업운영계획
            desired_courses: 'desired_courses',                     // 희망개설강좌
            
            // 지원 정보 (3개)
            local_language_requirement: 'local_language_requirement', // 현지어구사필요수준
            institute_support: 'institute_support',                   // 학당지원사항
            country_safety_info: 'country_safety_info'                // 파견국가안전정보
        };
        
        this.STORAGE_BUCKET = 'institute-images';
        this.MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
        this.ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
        
        console.log('🔗 InstituteAPI 모듈 초기화됨');
    }

    /**
     * 🚀 API 모듈 초기화 (v4.5.1 수정)
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            console.log('🔄 InstituteAPI 초기화 시작...');
            
            // 🔧 v4.5.1: SupabaseCore 의존성 체크 수정
            if (!window.SupabaseCore || typeof window.SupabaseCore.ensureClient !== 'function') {
                throw new Error('SupabaseCore 모듈이 로드되지 않았습니다');
            }
            
            // 🔧 v4.5.1: ensureClient() 함수 사용 (올바른 API)
            this.supabase = await window.SupabaseCore.ensureClient();
            if (!this.supabase) {
                throw new Error('Supabase 클라이언트를 가져올 수 없습니다');
            }
            
            // 연결 테스트
            await this.testConnection();
            
            this.initialized = true;
            console.log('✅ InstituteAPI 초기화 완료 (v4.5.1)');
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
                .select('id')
                .limit(1);
                
            if (error) throw error;
            console.log('✅ institutes 테이블 연결 확인');
            
        } catch (error) {
            console.error('❌ 연결 테스트 실패:', error);
            throw error;
        }
    }

    /**
     * 📋 학당 목록 조회 (기본 정보)
     * @param {Object} options - 조회 옵션
     * @returns {Promise<Array>}
     */
    async getInstituteList(options = {}) {
        if (!this.initialized) await this.initialize();
        
        try {
            console.log('🔄 학당 목록 조회 중...');
            
            let query = this.supabase
                .from('institutes')
                .select(`
                    id,
                    name_ko,
                    name_en,
                    operating_organization,
                    image_url,
                    address,
                    phone,
                    manager_name,
                    created_at,
                    updated_at
                `)
                .order('name_ko', { ascending: true });
            
            // 필터 적용
            if (options.search) {
                query = query.or(`name_ko.ilike.%${options.search}%,name_en.ilike.%${options.search}%`);
            }
            
            if (options.limit) {
                query = query.limit(options.limit);
            }
            
            if (options.offset) {
                query = query.range(options.offset, options.offset + (options.limit || 50) - 1);
            }
            
            const { data, error } = await query;
            
            if (error) {
                console.error('❌ 학당 목록 조회 실패:', error);
                throw error;
            }
            
            console.log(`✅ ${data.length}개 학당 목록 조회 완료`);
            return data || [];
            
        } catch (error) {
            console.error('❌ getInstituteList 실패:', error);
            return [];
        }
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
                    operating_organization,
                    image_url,
                    address,
                    phone,
                    website_sns,
                    manager_name,
                    manager_contact,
                    local_adaptation_staff,
                    cultural_program_plan,
                    desired_courses,
                    local_language_requirement,
                    institute_support,
                    country_safety_info,
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
            
            console.log(`✅ 학당 상세 정보 조회 완료: ${data.name_ko}`);
            return data;
            
        } catch (error) {
            console.error(`❌ getInstituteById 실패 (${instituteId}):`, error);
            return null;
        }
    }

    /**
     * 📝 학당 정보 업데이트
     * @param {string} instituteId - 학당 ID
     * @param {Object} updateData - 업데이트할 데이터
     * @returns {Promise<boolean>}
     */
    async updateInstitute(instituteId, updateData) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId || !updateData) {
            console.warn('⚠️ 학당 ID와 업데이트 데이터가 필요합니다');
            return false;
        }
        
        try {
            console.log(`🔄 학당 정보 업데이트: ${instituteId}`);
            
            // 업데이트 가능한 필드만 필터링
            const allowedFields = Object.keys(this.INSTITUTE_FIELDS);
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
            
            console.log(`✅ 학당 정보 업데이트 완료: ${data.name_ko}`);
            return true;
            
        } catch (error) {
            console.error(`❌ updateInstitute 실패 (${instituteId}):`, error);
            return false;
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
            
            // 필드 필터링
            const allowedFields = Object.keys(this.INSTITUTE_FIELDS);
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
            
            const { data, error } = await this.supabase
                .from('institutes')
                .insert(filteredData)
                .select()
                .single();
            
            if (error) {
                console.error('❌ 새 학당 생성 실패:', error);
                throw error;
            }
            
            console.log(`✅ 새 학당 생성 완료: ${data.name_ko} (ID: ${data.id})`);
            return data;
            
        } catch (error) {
            console.error('❌ createInstitute 실패:', error);
            return null;
        }
    }

    /**
     * 🗑️ 학당 삭제
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<boolean>}
     */
    async deleteInstitute(instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId) {
            console.warn('⚠️ 학당 ID가 필요합니다');
            return false;
        }
        
        try {
            console.log(`🔄 학당 삭제: ${instituteId}`);
            
            const { error } = await this.supabase
                .from('institutes')
                .delete()
                .eq('id', instituteId);
            
            if (error) {
                console.error('❌ 학당 삭제 실패:', error);
                throw error;
            }
            
            console.log(`✅ 학당 삭제 완료: ${instituteId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ deleteInstitute 실패 (${instituteId}):`, error);
            return false;
        }
    }

    /**
     * 👥 문화인턴 목록 조회 (sejong_institute 기준)
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
                .eq('sejong_institute', instituteId)
                .eq('user_type', 'student')
                .order('full_name', { ascending: true });
            
            if (error) {
                console.error('❌ 문화인턴 목록 조회 실패:', error);
                throw error;
            }
            
            console.log(`✅ ${data.length}명의 문화인턴 조회 완료`);
            return data || [];
            
        } catch (error) {
            console.error(`❌ getCulturalInternsByInstitute 실패 (${instituteId}):`, error);
            return [];
        }
    }

    /**
     * 🔄 문화인턴 배정
     * @param {string} internId - 문화인턴 ID
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<boolean>}
     */
    async assignInternToInstitute(internId, instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!internId || !instituteId) {
            console.warn('⚠️ 문화인턴 ID와 학당 ID가 필요합니다');
            return false;
        }
        
        try {
            console.log(`🔄 문화인턴 배정: ${internId} → ${instituteId}`);
            
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update({
                    sejong_institute: instituteId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', internId)
                .eq('user_type', 'student')
                .select()
                .single();
            
            if (error) {
                console.error('❌ 문화인턴 배정 실패:', error);
                throw error;
            }
            
            console.log(`✅ 문화인턴 배정 완료: ${data.full_name} → ${instituteId}`);
            return true;
            
        } catch (error) {
            console.error(`❌ assignInternToInstitute 실패 (${internId} → ${instituteId}):`, error);
            return false;
        }
    }

    /**
     * 🔍 학당 검색
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
                    operating_organization,
                    image_url,
                    address,
                    phone,
                    manager_name,
                    created_at,
                    updated_at
                `);
            
            // 검색 조건 적용
            if (searchParams.keyword) {
                query = query.or(`
                    name_ko.ilike.%${searchParams.keyword}%,
                    name_en.ilike.%${searchParams.keyword}%,
                    operating_organization.ilike.%${searchParams.keyword}%,
                    address.ilike.%${searchParams.keyword}%
                `);
            }
            
            if (searchParams.organization) {
                query = query.ilike('operating_organization', `%${searchParams.organization}%`);
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
     * 📊 학당 통계
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Object>}
     */
    async getInstituteStatistics(instituteId) {
        if (!this.initialized) await this.initialize();
        
        if (!instituteId) return {};
        
        try {
            console.log(`🔄 학당 통계 조회: ${instituteId}`);
            
            // 문화인턴 수 조회
            const { data: internData, error: internError } = await this.supabase
                .from('user_profiles')
                .select('id', { count: 'exact' })
                .eq('sejong_institute', instituteId)
                .eq('user_type', 'student');
            
            if (internError) throw internError;
            
            // 학당 기본 정보
            const { data: instituteData, error: instituteError } = await this.supabase
                .from('institutes')
                .select('updated_at')
                .eq('id', instituteId)
                .single();
            
            if (instituteError) throw instituteError;
            
            const stats = {
                intern_count: internData?.length || 0,
                last_updated: instituteData?.updated_at || null,
                statistics_updated_at: new Date().toISOString()
            };
            
            console.log(`✅ 학당 통계 조회 완료: ${stats.intern_count}명의 문화인턴`);
            return stats;
            
        } catch (error) {
            console.error(`❌ getInstituteStatistics 실패 (${instituteId}):`, error);
            return {};
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
     * 🗑️ 이미지 삭제
     * @param {string} imageUrl - 삭제할 이미지 URL
     * @returns {Promise<boolean>}
     */
    async deleteInstituteImage(imageUrl) {
        if (!this.initialized) await this.initialize();
        
        if (!imageUrl) return false;
        
        try {
            // URL에서 파일 경로 추출
            const url = new URL(imageUrl);
            const pathSegments = url.pathname.split('/');
            const filePath = pathSegments.slice(-2).join('/'); // institutes/filename
            
            console.log(`🔄 이미지 삭제: ${filePath}`);
            
            const { error } = await this.supabase.storage
                .from(this.STORAGE_BUCKET)
                .remove([filePath]);
            
            if (error) {
                console.error('❌ 이미지 삭제 실패:', error);
                throw error;
            }
            
            console.log(`✅ 이미지 삭제 완료: ${filePath}`);
            return true;
            
        } catch (error) {
            console.error('❌ deleteInstituteImage 실패:', error);
            return false;
        }
    }

    /**
     * 📊 API 모듈 상태 (v4.5.1)
     */
    getAPIStatus() {
        return {
            initialized: this.initialized,
            supabase_connected: !!this.supabase,
            supported_fields: Object.keys(this.INSTITUTE_FIELDS).length,
            storage_bucket: this.STORAGE_BUCKET,
            module_version: '4.5.1'
        };
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteAPI = new InstituteAPI();

console.log('🔗 InstituteAPI 모듈 로드 완료 (v4.5.1) - SupabaseCore API 불일치 수정');
