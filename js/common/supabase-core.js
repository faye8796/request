// 🚀 Supabase Core v1.0.1 - 항공권 시스템 전용 개선된 최소 구현
// 세종학당 문화인턴 지원 시스템 - 경량화된 Supabase 클라이언트
// config.js의 window.SupabaseAPI 의존성 해결 + 항공권 시스템 전용 기능

/**
 * SupabaseCore v1.0.1 - 최소한의 핵심 기능만 제공
 * 
 * 🎯 목적:
 * - config.js의 waitForModulesReady가 기대하는 window.SupabaseAPI 제공
 * - 항공권 시스템에 필요한 최소한의 기능만 포함
 * - 기존 무거운 supabase-client.js 의존성 제거
 * 
 * 🔧 v1.0.1 개선사항:
 * - 즉시 초기화: DOMContentLoaded 대기 제거
 * - 호환성 레이어: 기존 방식과 새 방식 모두 지원
 * - 강화된 대기 로직: Promise 기반 초기화 메커니즘
 * - 오류 처리 개선: 실패 시 재시도 및 폴백
 * 
 * 📦 포함 기능:
 * - Supabase 클라이언트 초기화
 * - 기본 인증 관리
 * - 데이터베이스 기본 CRUD
 * - 파일 업로드 기본 기능
 * - 오류 처리 및 재시도 로직
 */

class SupabaseCore {
    constructor() {
        this.client = null;
        this.isInitialized = false;
        this.initPromise = null;
        this.user = null;
        this.userType = null;

        // 🔧 v1.0.1: 초기화 상태 추적 강화
        this._initializationState = {
            started: false,
            completed: false,
            failed: false,
            error: null,
            attempts: 0,
            maxAttempts: 3
        };

        // 모듈 상태 (config.js 호환성용)
        this._moduleStatus = {
            initialized: false,
            coreReady: false
        };

        // 🆕 v1.0.1: 즉시 초기화 시작
        this.startInitialization();
    }

    // ===================
    // 🔧 v1.0.1: 개선된 초기화 시스템
    // ===================

    /**
     * 즉시 초기화 시작 (비동기)
     */
    startInitialization() {
        console.log('🚀 SupabaseCore v1.0.1 즉시 초기화 시작...');
        
        // 비동기로 초기화 시작 (블로킹하지 않음)
        setTimeout(() => {
            this.init().catch(error => {
                console.error('❌ SupabaseCore 초기 초기화 실패:', error);
                // 재시도 스케줄링
                this.scheduleRetry();
            });
        }, 100); // 100ms 후 시작 (스크립트 로딩 완료 보장)
    }

    /**
     * 재시도 스케줄링
     */
    scheduleRetry() {
        const state = this._initializationState;
        
        if (state.attempts < state.maxAttempts && !state.completed) {
            const delay = Math.min(1000 * Math.pow(2, state.attempts), 5000); // 지수 백오프, 최대 5초
            
            console.log(`🔄 SupabaseCore 재시도 예약: ${delay}ms 후 (${state.attempts + 1}/${state.maxAttempts})`);
            
            setTimeout(() => {
                this.init().catch(error => {
                    console.warn(`⚠️ SupabaseCore 재시도 ${state.attempts} 실패:`, error);
                    this.scheduleRetry();
                });
            }, delay);
        } else {
            console.error('❌ SupabaseCore 최대 재시도 횟수 초과');
            state.failed = true;
        }
    }

    /**
     * Supabase 클라이언트 초기화
     */
    async init() {
        if (this.initPromise) return this.initPromise;
        
        this.initPromise = this._doInitialize();
        return this.initPromise;
    }

    async _doInitialize() {
        const state = this._initializationState;
        
        if (state.completed) {
            console.log('✅ SupabaseCore 이미 초기화 완료');
            return true;
        }

        state.attempts++;
        state.started = true;

        try {
            console.log(`🚀 SupabaseCore 초기화 시도 ${state.attempts}/${state.maxAttempts}...`);

            // 1. CONFIG 대기 (강화된 로직)
            const configReady = await this.waitForConfig();
            if (!configReady) {
                throw new Error('CONFIG 로드 타임아웃');
            }

            // 2. Supabase 라이브러리 대기
            const supabaseReady = await this.waitForSupabaseLibrary();
            if (!supabaseReady) {
                throw new Error('Supabase 라이브러리 로드 타임아웃');
            }

            // 3. 클라이언트 생성
            const { URL, ANON_KEY } = window.CONFIG.SUPABASE;
            this.client = window.supabase.createClient(URL, ANON_KEY);
            
            // 4. 클라이언트 검증
            if (!this.client || !this.client.from) {
                throw new Error('Supabase 클라이언트 생성 실패');
            }

            // 5. 현재 세션 확인 (옵션)
            try {
                const { data: { session }, error } = await this.client.auth.getSession();
                if (error) {
                    console.warn('세션 확인 중 오류:', error.message);
                } else {
                    this.user = session?.user || null;
                    this.userType = session?.user ? 'student' : null;
                }
            } catch (sessionError) {
                console.warn('세션 확인 건너뜀:', sessionError.message);
            }

            // 6. 상태 업데이트
            this.isInitialized = true;
            state.completed = true;
            this._moduleStatus.initialized = true;
            this._moduleStatus.coreReady = true;

            console.log('✅ SupabaseCore v1.0.1 초기화 완료');
            console.log('👤 현재 사용자:', this.user ? this.user.email : '없음');

            // 7. 초기화 완료 이벤트 발생
            this.notifyInitializationComplete();

            return true;

        } catch (error) {
            console.error(`❌ SupabaseCore 초기화 실패 (시도 ${state.attempts}):`, error);
            state.error = error;
            
            // 최종 실패가 아니면 재시도 허용
            if (state.attempts < state.maxAttempts) {
                this.initPromise = null; // 재시도 가능하도록
                throw error;
            } else {
                state.failed = true;
                throw new Error(`SupabaseCore 최종 초기화 실패: ${error.message}`);
            }
        }
    }

    /**
     * CONFIG 로드 대기
     */
    async waitForConfig(timeoutMs = 10000) {
        console.log('⏳ CONFIG 로드 대기 중...');
        
        const startTime = Date.now();
        while (!window.CONFIG && (Date.now() - startTime) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const success = !!window.CONFIG;
        if (success) {
            console.log('✅ CONFIG 로드 완료');
        } else {
            console.error('❌ CONFIG 로드 타임아웃');
        }
        
        return success;
    }

    /**
     * Supabase 라이브러리 로드 대기
     */
    async waitForSupabaseLibrary(timeoutMs = 10000) {
        console.log('⏳ Supabase 라이브러리 로드 대기 중...');
        
        const startTime = Date.now();
        while (!window.supabase?.createClient && (Date.now() - startTime) < timeoutMs) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        const success = !!(window.supabase?.createClient);
        if (success) {
            console.log('✅ Supabase 라이브러리 로드 완료');
        } else {
            console.error('❌ Supabase 라이브러리 로드 타임아웃');
        }
        
        return success;
    }

    /**
     * 초기화 완료 알림
     */
    notifyInitializationComplete() {
        // 커스텀 이벤트 발생
        try {
            const event = new CustomEvent('supabaseCoreReady', {
                detail: { core: this }
            });
            window.dispatchEvent(event);
        } catch (error) {
            console.warn('초기화 완료 이벤트 발생 실패:', error);
        }
    }

    /**
     * 초기화 상태 확인 및 대기
     */
    async ensureInitialized() {
        if (this.isInitialized) {
            return true;
        }

        console.log('⏳ SupabaseCore 초기화 대기 중...');
        
        // 현재 초기화 중이면 대기
        if (this.initPromise) {
            try {
                await this.initPromise;
                return this.isInitialized;
            } catch (error) {
                console.warn('기존 초기화 실패, 새로 시도:', error.message);
            }
        }

        // 새로 초기화 시도
        try {
            await this.init();
            return this.isInitialized;
        } catch (error) {
            console.error('SupabaseCore 초기화 최종 실패:', error);
            return false;
        }
    }

    /**
     * Supabase 클라이언트 반환
     */
    getClient() {
        if (!this.isInitialized) {
            throw new Error('SupabaseCore가 초기화되지 않았습니다. ensureInitialized()를 먼저 호출하세요.');
        }
        return this.client;
    }

    // ===================
    // 👤 인증 관리
    // ===================

    getCurrentUser() {
        return this.user;
    }

    getCurrentUserType() {
        return this.userType;
    }

    setCurrentUser(user, userType = 'student') {
        this.user = user;
        this.userType = userType;
        console.log('👤 사용자 정보 설정됨:', { user: user?.email || user?.name, userType });
    }

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
                const initialized = await this.ensureInitialized();
                if (!initialized) {
                    throw new Error('SupabaseCore 초기화 실패');
                }
                
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

    // 데이터베이스 기본 CRUD 메서드들 (기존과 동일)
    async select(table, columns = '*', filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 조회`,
            async () => {
                let query = this.client.from(table).select(columns);
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                return await query;
            }
        );
    }

    async insert(table, data) {
        return await this.safeApiCall(
            `${table} 데이터 삽입`,
            async () => {
                return await this.client.from(table).insert(data).select();
            }
        );
    }

    async update(table, data, filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 업데이트`,
            async () => {
                let query = this.client.from(table).update(data);
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                return await query.select();
            }
        );
    }

    async delete(table, filters = {}) {
        return await this.safeApiCall(
            `${table} 데이터 삭제`,
            async () => {
                let query = this.client.from(table).delete();
                Object.entries(filters).forEach(([key, value]) => {
                    query = query.eq(key, value);
                });
                return await query;
            }
        );
    }

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

    async getFileUrl(bucket, path) {
        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                throw new Error('SupabaseCore 초기화 실패');
            }
            
            const { data } = this.client.storage
                .from(bucket)
                .getPublicUrl(path);
                
            return { success: true, url: data.publicUrl };
        } catch (error) {
            console.error(`파일 URL 생성 실패 (${bucket}/${path}):`, error);
            return { success: false, error: error.message };
        }
    }

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

    async testConnection() {
        try {
            const initialized = await this.ensureInitialized();
            if (!initialized) {
                return { success: false, message: 'SupabaseCore 초기화 실패' };
            }
            
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

    getErrorMessage(error) {
        if (typeof error === 'string') return error;
        if (error?.message) return error.message;
        if (error?.error?.message) return error.error.message;
        return '알 수 없는 오류가 발생했습니다.';
    }

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

    getStatus() {
        return {
            initialized: this.isInitialized,
            hasClient: !!this.client,
            hasUser: !!this.user,
            userType: this.userType,
            moduleStatus: this._moduleStatus,
            initializationState: this._initializationState
        };
    }

    debug() {
        console.group('🔍 SupabaseCore v1.0.1 상태');
        console.log('초기화:', this.isInitialized);
        console.log('클라이언트:', !!this.client);
        console.log('사용자:', this.user);
        console.log('사용자 타입:', this.userType);
        console.log('모듈 상태:', this._moduleStatus);
        console.log('초기화 상태:', this._initializationState);
        console.groupEnd();
    }
}

// ===================
// 🌐 전역 인스턴스 및 호환성 레이어
// ===================

// 싱글톤 인스턴스 생성
const supabaseCore = new SupabaseCore();

// 🔧 v1.0.1: 호환성 레이어 - 기존 방식과 새 방식 모두 지원
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

// 🆕 v1.0.1: 기존 방식 호환성 지원
window.SupabaseCore = {
    // 기존 API 유지
    _initialized: false,
    currentUser: null,
    currentUserType: null,
    
    async init() {
        const result = await supabaseCore.init();
        this._initialized = supabaseCore.isInitialized;
        return result;
    },
    
    get client() {
        return supabaseCore.client;
    },
    
    async ensureClient() {
        await supabaseCore.ensureInitialized();
        return supabaseCore.client;
    },
    
    async safeApiCall(operation, apiFunction, context = {}) {
        return await supabaseCore.safeApiCall(operation, apiFunction);
    },
    
    getErrorMessage(error) {
        return supabaseCore.getErrorMessage(error);
    },
    
    getCurrentUser() {
        return supabaseCore.getCurrentUser();
    },
    
    getCurrentUserType() {
        return supabaseCore.getCurrentUserType();
    },
    
    setCurrentUser(user, userType) {
        supabaseCore.setCurrentUser(user, userType);
        this.currentUser = user;
        this.currentUserType = userType;
    },
    
    logout() {
        supabaseCore.logout();
        this.currentUser = null;
        this.currentUserType = null;
    },
    
    async testConnection() {
        return await supabaseCore.testConnection();
    },
    
    getStatus() {
        const status = supabaseCore.getStatus();
        this._initialized = status.initialized;
        return status;
    },

    // 유틸리티 함수들
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    }
};

// 모듈로도 export
export { supabaseCore };
export default supabaseCore;

// ===================
// 🔧 v1.0.1: 개발자 도구 및 디버깅 지원
// ===================

if (typeof window !== 'undefined') {
    window.SupabaseCoreDebug = {
        getStatus: () => supabaseCore.getStatus(),
        debug: () => supabaseCore.debug(),
        forceInit: () => supabaseCore.init(),
        testConnection: () => supabaseCore.testConnection(),
        getCurrentUser: () => supabaseCore.getCurrentUser(),
        getCurrentUserType: () => supabaseCore.getCurrentUserType(),
        // 새로운 디버깅 메서드들
        checkInitialization: () => {
            console.log('🔍 초기화 상태 체크:');
            console.log('- isInitialized:', supabaseCore.isInitialized);
            console.log('- hasClient:', !!supabaseCore.client);
            console.log('- CONFIG:', !!window.CONFIG);
            console.log('- Supabase Library:', !!window.supabase?.createClient);
            console.log('- window.SupabaseAPI:', !!window.SupabaseAPI);
            console.log('- window.SupabaseCore:', !!window.SupabaseCore);
        },
        ensureInitialized: () => supabaseCore.ensureInitialized(),
        reinitialize: async () => {
            console.log('🔄 강제 재초기화 시작...');
            supabaseCore.initPromise = null;
            supabaseCore.isInitialized = false;
            supabaseCore._initializationState.completed = false;
            return await supabaseCore.init();
        }
    };
}

console.log('🎯 SupabaseCore v1.0.1 로드 완료 - 개선된 초기화 및 호환성 레이어 적용');
