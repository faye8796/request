// 🚀 Supabase Core v1.0.0 - 항공권 시스템 전용 최소 구현
// 세종학당 문화인턴 지원 시스템 - 경량화된 Supabase 클라이언트
// config.js의 window.SupabaseAPI 의존성 해결 + 항공권 시스템 전용 기능

/**
 * SupabaseCore - 최소한의 핵심 기능만 제공
 * 
 * 🎯 목적:
 * - config.js의 waitForModulesReady가 기대하는 window.SupabaseAPI 제공
 * - 항공권 시스템에 필요한 최소한의 기능만 포함
 * - 기존 무거운 supabase-client.js 의존성 제거
 * 
 * 📦 포함 기능:
 * - Supabase 클라이언트 초기화
 * - 기본 인증 관리
 * - 데이터베이스 기본 CRUD
 * - 파일 업로드 기본 기능
 * - 오류 처리 및 재시도 로직
 * 
 * 🚫 제외 기능:
 * - 교구신청 관련 기능들
 * - 수업계획 관련 기능들
 * - 관리자 대시보드 기능들
 * - 통계 및 리포트 기능들
 */

class SupabaseCore {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.user = null;
        this.userType = null;

        // 모듈 상태 (config.js 호환성용)
        this._moduleStatus = {
            initialized: false,
            coreReady: false
        };
    }

    // ===================
    // 🔧 초기화 시스템
    // ===================

    /**
     * Supabase 클라이언트 초기화
     */
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        try {
            console.log('🚀 SupabaseCore 초기화 시작...');

            // CONFIG 확인
            if (!window.CONFIG || !window.CONFIG.SUPABASE) {
                throw new Error('CONFIG가 로드되지 않았습니다.');
            }

            const { URL, ANON_KEY } = window.CONFIG.SUPABASE;
            
            // Supabase 클라이언트 생성
            if (!window.supabase) {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다.');
            }

            this.client = window.supabase.createClient(URL, ANON_KEY);
            
            // 현재 세션 확인
            const { data: { session }, error } = await this.client.auth.getSession();
            if (error) {
                console.warn('세션 확인 중 오류:', error.message);
            }
            
            this.user = session?.user || null;
            this.userType = session?.user ? 'student' : null; // 기본값

            this.isInitialized = true;
            this._moduleStatus.initialized = true;
            this._moduleStatus.coreReady = true;

            console.log('✅ SupabaseCore 초기화 완료');
            console.log('👤 현재 사용자:', this.user ? this.user.email : '없음');

            return true;

        } catch (error) {
            console.error('❌ SupabaseCore 초기화 실패:', error);
            this.initPromise = null; // 재시도 가능하도록
            throw error;
        }
    }

    /**
     * 초기화 상태 확인 및 대기
     */
    async ensureInitialized() {
        if (!this.isInitialized) {
            await this.init();
        }
        
        if (!this.isInitialized) {
            throw new Error('SupabaseCore 초기화에 실패했습니다.');
        }
    }

    /**
     * Supabase 클라이언트 반환
     */
    getClient() {
        if (!this.isInitialized) {
            throw new Error('SupabaseCore가 초기화되지 않았습니다. init()을 먼저 호출하세요.');
        }
        return this.client;
    }

    // ===================
    // 👤 인증 관리
    // ===================

    /**
     * 현재 사용자 정보 반환
     */
    getCurrentUser() {
        return this.user;
    }

    /**
     * 현재 사용자 타입 반환
     */
    getCurrentUserType() {
        return this.userType;
    }

    /**
     * 사용자 정보 설정 (외부에서 인증 완료 후 호출)
     */
    setCurrentUser(user, userType = 'student') {
        this.user = user;
        this.userType = userType;
        console.log('👤 사용자 정보 설정됨:', { user: user?.email || user?.name, userType });
    }

    /**
     * 로그아웃
     */
    async logout() {
        if (this.client) {
            await this.client.auth.signOut();
        }
        this.user = null;
        this.userType = null;
        console.log('👋 로그아웃 완료');
    }

    // ===================
    // 🗄️ 데이터베이스 기본 기능
    // ===================

    /**
     * 안전한 API 호출 래퍼
     */
    async safeApiCall(operation, apiFunction, maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await this.ensureInitialized();
                
                console.log(`🔄 ${operation} 시도 ${attempt}/${maxRetries}`);
                const result = await apiFunction();
                
                if (result.error) {
                    throw new Error(result.error.message || result.error);
                }
                
                console.log(`✅ ${operation} 성공`);
                return { success: true, data: result.data };

            } catch (error) {
                console.warn(`⚠️ ${operation} 실패 (시도 ${attempt}/${maxRetries}):`, error.message);
                
                if (attempt === maxRetries) {
                    console.error(`❌ ${operation} 최종 실패:`, error);
                    return { success: false, error: error.message };
                }
                
                // 재시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
            }
        }
    }

    /**
     * 테이블에서 데이터 조회
     */
    async select(table, columns = '*', filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 조회`,
            async () => {
                let query = this.client.from(table).select(columns);
                
                // 필터 적용
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                
                return await query;
            }
        );
    }

    /**
     * 테이블에 데이터 삽입
     */
    async insert(table, data) {
        return await this.safeApiCall(
            `${table} 데이터 삽입`,
            async () => {
                return await this.client.from(table).insert(data).select();
            }
        );
    }

    /**
     * 테이블의 데이터 업데이트
     */
    async update(table, data, filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 업데이트`,
            async () => {
                let query = this.client.from(table).update(data);
                
                // 필터 적용
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                
                return await query.select();
            }
        );
    }

    /**
     * 테이블에서 데이터 삭제
     */
    async delete(table, filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 삭제`,
            async () => {
                let query = this.client.from(table).delete();
                
                // 필터 적용
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                
                return await query;
            }
        );
    }

    /**
     * Upsert (삽입 또는 업데이트)
     */
    async upsert(table, data, onConflict = null) {
        return await this.safeApiCall(
            `${table} 데이터 upsert`,
            async () => {
                let query = this.client.from(table).upsert(data);
                
                if (onConflict) {
                    query = query.onConflict(onConflict);
                }
                
                return await query.select();
            }
        );
    }

    // ===================
    // 📁 파일 업로드 기본 기능
    // ===================

    /**
     * 파일 업로드
     */
    async uploadFile(bucket, path, file, options = {}) {
        return await this.safeApiCall(
            `파일 업로드 (${bucket}/${path})`,
            async () => {
                return await this.client.storage
                    .from(bucket)
                    .upload(path, file, {
                        cacheControl: '3600',
                        upsert: options.upsert || false,
                        ...options
                    });
            }
        );
    }

    /**
     * 파일 다운로드 URL 생성
     */
    async getFileUrl(bucket, path) {
        try {
            await this.ensureInitialized();
            
            const { data } = this.client.storage
                .from(bucket)
                .getPublicUrl(path);
                
            return { success: true, url: data.publicUrl };
        } catch (error) {
            console.error(`파일 URL 생성 실패 (${bucket}/${path}):`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 파일 삭제
     */
    async deleteFile(bucket, path) {
        return await this.safeApiCall(
            `파일 삭제 (${bucket}/${path})`,
            async () => {
                return await this.client.storage
                    .from(bucket)
                    .remove([path]);
            }
        );
    }

    // ===================
    // 🔧 유틸리티 함수들
    // ===================

    /**
     * 연결 테스트
     */
    async testConnection() {
        try {
            await this.ensureInitialized();
            
            const testResult = await this.select('system_settings', 'setting_key', {});
            return { 
                success: true, 
                message: `연결 성공 (${testResult.data?.length || 0}개 설정 조회)` 
            };
        } catch (error) {
            return { 
                success: false, 
                message: `연결 실패: ${error.message}` 
            };
        }
    }

    /**
     * 오류 메시지 포맷팅
     */
    getErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.error?.message) return error.error.message;
        return '알 수 없는 오류가 발생했습니다.';
    }

    /**
     * 재시도 로직
     */
    async withRetry(operation, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                if (attempt === maxRetries) {
                    throw error;
                }
                
                console.warn(`재시도 ${attempt}/${maxRetries}:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    // ===================
    // 📊 상태 및 디버깅
    // ===================

    /**
     * 초기화 상태 반환
     */
    getStatus() {
        return {
            initialized: this.isInitialized,
            hasClient: !!this.client,
            hasUser: !!this.user,
            userType: this.userType,
            moduleStatus: this._moduleStatus
        };
    }

    /**
     * 디버깅 정보 출력
     */
    debug() {
        console.group('🔍 SupabaseCore 상태');
        console.log('초기화:', this.isInitialized);
        console.log('클라이언트:', !!this.client);
        console.log('사용자:', this.user);
        console.log('사용자 타입:', this.userType);
        console.log('모듈 상태:', this._moduleStatus);
        console.groupEnd();
    }
}

// ===================
// 🌐 전역 인스턴스 및 호환성
// ===================

// 싱글톤 인스턴스 생성
const supabaseCore = new SupabaseCore();

// config.js 호환성을 위한 window.SupabaseAPI 제공
window.SupabaseAPI = {
    // 필수 메서드들 (config.js가 기대하는 것들)
    _moduleStatus: supabaseCore._moduleStatus,
    
    async init() {
        return await supabaseCore.init();
    },
    
    getCurrentUser() {
        return supabaseCore.getCurrentUser();
    },
    
    async testConnection() {
        return await supabaseCore.testConnection();
    },

    // SupabaseCore 인스턴스 접근
    core: supabaseCore,
    
    // 기본 API 메서드들
    getClient() {
        return supabaseCore.getClient();
    },
    
    async ensureInitialized() {
        await supabaseCore.ensureInitialized();
    },
    
    setCurrentUser(user, userType) {
        supabaseCore.setCurrentUser(user, userType);
    },
    
    async logout() {
        await supabaseCore.logout();
    }
};

// 모듈로도 export
export { supabaseCore };
export default supabaseCore;

// ===================
// 🚀 자동 초기화
// ===================

// DOM 로드 완료 후 자동 초기화
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 SupabaseCore 자동 초기화 시작...');
    
    try {
        // CONFIG 로드 대기 (최대 5초)
        let waitCount = 0;
        while (!window.CONFIG && waitCount < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            waitCount++;
        }
        
        if (window.CONFIG) {
            const success = await supabaseCore.init();
            if (success) {
                console.log('✅ SupabaseCore 자동 초기화 완료');
            } else {
                console.warn('⚠️ SupabaseCore 자동 초기화 실패');
            }
        } else {
            console.warn('⚠️ CONFIG 로드 타임아웃 - 수동 초기화 필요');
        }
    } catch (error) {
        console.error('❌ SupabaseCore 자동 초기화 오류:', error);
    }
});

console.log('🎯 SupabaseCore v1.0.0 로드 완료 - 항공권 시스템 전용 경량화 버전');
