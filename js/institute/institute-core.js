/**
 * 🏛️ Institute Core Module (v4.8.0) - Field Name Consistency Fix
 * 세종학당 파견학당 정보 관리 시스템 - 핵심 기능 모듈
 * 
 * 📋 담당 기능:
 * - 학당 데이터 관리 (CRUD)
 * - 문화인턴 배정 관리
 * - 학당 상태 관리
 * - 핵심 비즈니스 로직
 * 
 * 🔗 의존성: SupabaseCore, Utils, Config, Auth (기본 요소만)
 * 🚫 독립성: js/admin/ 모듈들과 완전 분리
 * 
 * 🔧 v4.8.0 수정사항:
 * - INSTITUTE_FIELDS 필드명을 실제 DB 컬럼명과 일치하도록 수정
 * - cultural_program_plan → lesson_plan
 * - institute_support → support_provided
 * - 기타 필드명 일관성 개선
 */

class InstituteCore {
    constructor() {
        this.instituteData = new Map(); // 학당 데이터 캐시
        this.culturalInterns = new Map(); // 문화인턴 데이터 캐시
        this.initialized = false;
        
        // 📋 17개 필드 정의 (실제 DB 컬럼명 사용)
        this.INSTITUTE_FIELDS = {
            basic: ['name_ko', 'name_en', 'operator', 'image_url'],
            contact: ['address', 'phone', 'sns_url', 'contact_person', 'contact_phone', 'local_coordinator', 'local_coordinator_phone'],
            program: ['dispatch_period', 'lesson_plan', 'desired_courses', 'education_environment'],
            support: ['local_language_requirement', 'support_provided', 'safety_info_url']
        };
        
        this.REQUIRED_FIELDS = ['name_ko']; // 필수 필드
        this.VALIDATION_RULES = this.initValidationRules();
        
        console.log('🏛️ InstituteCore 모듈 초기화됨 (v4.8.0)');
    }

    /**
     * 🚀 모듈 초기화
     * @returns {Promise<boolean>}
     */
    async initialize() {
        if (this.initialized) return true;
        
        try {
            // 필수 의존성 체크
            if (!window.SupabaseCore || !window.Utils || !window.CONFIG) {
                throw new Error('필수 의존성 모듈이 로드되지 않았습니다');
            }
            
            console.log('🔄 InstituteCore 초기화 시작... (v4.8.0)');
            
            // 기본 데이터 로드
            await this.loadBasicData();
            
            this.initialized = true;
            console.log('✅ InstituteCore 초기화 완료 (v4.8.0)');
            return true;
            
        } catch (error) {
            console.error('❌ InstituteCore 초기화 실패:', error);
            return false;
        }
    }

    /**
     * 📊 기본 데이터 로드
     */
    async loadBasicData() {
        try {
            // 학당 목록 기본 로드 (이름과 ID만)
            const institutes = await window.InstituteAPI.getInstituteList();
            for (const institute of institutes) {
                this.instituteData.set(institute.id, {
                    id: institute.id,
                    name_ko: institute.name_ko,
                    name_en: institute.name_en,
                    cached_at: Date.now(),
                    full_loaded: false
                });
            }
            
            console.log(`📋 ${institutes.length}개 학당 기본 정보 로드 완료`);
            
        } catch (error) {
            console.error('❌ 기본 데이터 로드 실패:', error);
            throw error;
        }
    }

    /**
     * 🔍 학당 상세 정보 조회
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Object|null>}
     */
    async getInstituteDetails(instituteId) {
        if (!instituteId) {
            console.warn('⚠️ 학당 ID가 제공되지 않았습니다');
            return null;
        }

        try {
            // 캐시 확인
            const cached = this.instituteData.get(instituteId);
            if (cached && cached.full_loaded && this.isCacheValid(cached.cached_at)) {
                console.log(`📋 캐시에서 학당 정보 반환: ${cached.name_ko}`);
                return cached;
            }

            // API에서 전체 데이터 로드
            console.log(`🔄 학당 상세 정보 로드 중: ${instituteId}`);
            const instituteDetails = await window.InstituteAPI.getInstituteById(instituteId);
            
            if (!instituteDetails) {
                console.warn(`⚠️ 학당을 찾을 수 없습니다: ${instituteId}`);
                return null;
            }

            // 검증 및 정규화
            const normalizedData = this.normalizeInstituteData(instituteDetails);
            
            // 캐시 업데이트
            this.instituteData.set(instituteId, {
                ...normalizedData,
                cached_at: Date.now(),
                full_loaded: true
            });

            console.log(`✅ 학당 상세 정보 로드 완료: ${normalizedData.name_ko}`);
            return normalizedData;

        } catch (error) {
            console.error(`❌ 학당 상세 정보 조회 실패 (${instituteId}):`, error);
            return null;
        }
    }

    /**
     * 📝 학당 정보 업데이트
     * @param {string} instituteId - 학당 ID
     * @param {Object} updateData - 업데이트할 데이터
     * @returns {Promise<boolean>}
     */
    async updateInstituteInfo(instituteId, updateData) {
        if (!instituteId || !updateData) {
            console.warn('⚠️ 학당 ID 또는 업데이트 데이터가 누락되었습니다');
            return false;
        }

        try {
            console.log(`🔄 학당 정보 업데이트 시작: ${instituteId}`);
            
            // 데이터 검증
            const validationResult = window.InstituteValidation.validateInstituteData(updateData);
            if (!validationResult.isValid) {
                console.error('❌ 데이터 검증 실패:', validationResult.errors);
                throw new Error(`데이터 검증 실패: ${validationResult.errors.join(', ')}`);
            }

            // 데이터 정규화
            const normalizedData = this.normalizeInstituteData(updateData);
            
            // API 호출
            const updated = await window.InstituteAPI.updateInstitute(instituteId, normalizedData);
            
            if (updated) {
                // 캐시 업데이트
                const existing = this.instituteData.get(instituteId) || {};
                this.instituteData.set(instituteId, {
                    ...existing,
                    ...normalizedData,
                    updated_at: new Date().toISOString(),
                    cached_at: Date.now()
                });
                
                console.log(`✅ 학당 정보 업데이트 완료: ${instituteId}`);
                return true;
            }
            
            throw new Error('API 업데이트 실패');

        } catch (error) {
            console.error(`❌ 학당 정보 업데이트 실패 (${instituteId}):`, error);
            return false;
        }
    }

    /**
     * 👥 문화인턴 배정 관리
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Array>}
     */
    async getCulturalInternsForInstitute(instituteId) {
        if (!instituteId) return [];

        try {
            // 캐시 확인
            const cacheKey = `interns_${instituteId}`;
            const cached = this.culturalInterns.get(cacheKey);
            if (cached && this.isCacheValid(cached.cached_at)) {
                return cached.data;
            }

            console.log(`🔄 문화인턴 목록 조회 중: ${instituteId}`);
            const interns = await window.InstituteAPI.getCulturalInternsByInstitute(instituteId);
            
            // 캐시 저장
            this.culturalInterns.set(cacheKey, {
                data: interns,
                cached_at: Date.now()
            });

            console.log(`✅ ${interns.length}명의 문화인턴 정보 로드 완료`);
            return interns;

        } catch (error) {
            console.error(`❌ 문화인턴 조회 실패 (${instituteId}):`, error);
            return [];
        }
    }

    /**
     * 🔄 문화인턴 배정
     * @param {string} internId - 문화인턴 ID
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<boolean>}
     */
    async assignCulturalIntern(internId, instituteId) {
        if (!internId || !instituteId) {
            console.warn('⚠️ 문화인턴 ID 또는 학당 ID가 누락되었습니다');
            return false;
        }

        try {
            console.log(`🔄 문화인턴 배정: ${internId} → ${instituteId}`);
            
            const success = await window.InstituteAPI.assignInternToInstitute(internId, instituteId);
            
            if (success) {
                // 관련 캐시 무효화
                this.invalidateInternsCache(instituteId);
                console.log(`✅ 문화인턴 배정 완료: ${internId} → ${instituteId}`);
                return true;
            }
            
            throw new Error('API 배정 실패');

        } catch (error) {
            console.error(`❌ 문화인턴 배정 실패 (${internId} → ${instituteId}):`, error);
            return false;
        }
    }

    /**
     * 📊 학당 통계 정보
     * @param {string} instituteId - 학당 ID
     * @returns {Promise<Object>}
     */
    async getInstituteStats(instituteId) {
        if (!instituteId) return {};

        try {
            const stats = await window.InstituteAPI.getInstituteStatistics(instituteId);
            return {
                totalInterns: stats.intern_count || 0,
                activePrograms: stats.program_count || 0,
                completionRate: stats.completion_rate || 0,
                lastUpdated: stats.last_updated || null,
                ...stats
            };

        } catch (error) {
            console.error(`❌ 학당 통계 조회 실패 (${instituteId}):`, error);
            return {};
        }
    }

    /**
     * 🔍 학당 검색
     * @param {Object} searchParams - 검색 조건
     * @returns {Promise<Array>}
     */
    async searchInstitutes(searchParams = {}) {
        try {
            console.log('🔍 학당 검색:', searchParams);
            
            const results = await window.InstituteAPI.searchInstitutes(searchParams);
            
            // 검색 결과를 캐시에 업데이트 (기본 정보만)
            for (const institute of results) {
                const existing = this.instituteData.get(institute.id) || {};
                this.instituteData.set(institute.id, {
                    ...existing,
                    ...institute,
                    cached_at: Date.now(),
                    full_loaded: false
                });
            }

            console.log(`✅ ${results.length}개 학당 검색 완료`);
            return results;

        } catch (error) {
            console.error('❌ 학당 검색 실패:', error);
            return [];
        }
    }

    /**
     * 🗑️ 캐시 관리
     */
    clearCache() {
        this.instituteData.clear();
        this.culturalInterns.clear();
        console.log('🗑️ InstituteCore 캐시 초기화됨');
    }

    invalidateInternsCache(instituteId) {
        const cacheKey = `interns_${instituteId}`;
        this.culturalInterns.delete(cacheKey);
    }

    isCacheValid(cachedAt, maxAge = 300000) { // 5분
        return Date.now() - cachedAt < maxAge;
    }

    /**
     * 🔧 데이터 정규화
     */
    normalizeInstituteData(data) {
        const normalized = { ...data };
        
        // 필수 필드 확인
        if (!normalized.name_ko) {
            throw new Error('학당명(한국어)은 필수 항목입니다');
        }

        // 데이터 타입 정규화
        if (normalized.phone) {
            normalized.phone = String(normalized.phone).trim();
        }
        
        if (normalized.contact_phone) {
            normalized.contact_phone = String(normalized.contact_phone).trim();
        }

        return normalized;
    }

    /**
     * 📏 검증 규칙 초기화
     */
    initValidationRules() {
        return {
            name_ko: { required: true, minLength: 2, maxLength: 200 },
            name_en: { required: false, maxLength: 200 },
            phone: { required: false, pattern: /^[0-9+\-\s\(\)\.@a-zA-Z]+$/ },
            contact_phone: { required: false, pattern: /^[0-9+\-\s\(\)\.@a-zA-Z]+$/ },
            sns_url: { required: false, pattern: /^https?:\/\/.+/ }
        };
    }

    /**
     * 📋 모든 학당 목록 조회 (캐시됨)
     */
    getAllInstitutes() {
        return Array.from(this.instituteData.values())
            .sort((a, b) => a.name_ko.localeCompare(b.name_ko));
    }

    /**
     * 📊 모듈 상태 정보
     */
    getModuleStatus() {
        return {
            initialized: this.initialized,
            cached_institutes: this.instituteData.size,
            cached_interns: this.culturalInterns.size,
            module_version: '4.8.0',
            field_consistency: 'fixed',
            last_initialized: this.lastInitialized || null
        };
    }
}

// 🌐 전역 인스턴스 생성
window.InstituteCore = new InstituteCore();

console.log('🏛️ InstituteCore 모듈 로드 완료 (v4.8.0) - Field Name Consistency Fixed');
