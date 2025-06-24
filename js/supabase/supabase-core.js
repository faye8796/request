// 🚀 Supabase 핵심 공통 기능 모듈 v4.2.2
// 초기화, 에러 처리, 유틸리티 함수들
// 모든 Supabase 모듈의 기반이 되는 핵심 기능들
// 🔧 v4.2.2: setCurrentUser 함수 추가 (admin.html 인증 오류 수정)

const SupabaseCore = {
    // Supabase 클라이언트
    supabase: null,
    
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 🆕 v4.2.1 초기화 상태 추적
    _initialized: false,
    _initializing: false,

    // 🔧 v4.2.1 강화된 초기화
    async init() {
        if (this._initialized) {
            console.log('✅ SupabaseCore 이미 초기화됨');
            return true;
        }
        
        if (this._initializing) {
            console.log('⏳ SupabaseCore 초기화 진행 중, 대기...');
            // 최대 5초 대기
            for (let i = 0; i < 50; i++) {
                if (this._initialized) return true;
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            console.warn('⚠️ SupabaseCore 초기화 대기 타임아웃');
            return false;
        }

        this._initializing = true;

        try {
            console.log('🚀 SupabaseCore 초기화 중...');
            
            // CONFIG 로드 대기 (더 안전하게)
            if (!window.CONFIG) {
                console.log('⏳ CONFIG 로드 대기 중...');
                let configWaitCount = 0;
                while (!window.CONFIG && configWaitCount < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    configWaitCount++;
                }
                
                if (!window.CONFIG) {
                    throw new Error('CONFIG 로드 타임아웃');
                }
            }
            
            // Supabase 라이브러리 로드 대기
            if (!window.supabase) {
                console.log('⏳ Supabase 라이브러리 로드 대기 중...');
                let supabaseWaitCount = 0;
                while (!window.supabase && supabaseWaitCount < 30) {
                    await new Promise(resolve => setTimeout(resolve, 100));
                    supabaseWaitCount++;
                }
                
                if (!window.supabase) {
                    throw new Error('Supabase 라이브러리 로드 타임아웃');
                }
            }
            
            // 설정 검증
            if (!CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                throw new Error('Supabase 설정이 올바르지 않습니다.');
            }
            
            // Supabase 클라이언트 생성
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );
            
            this._initialized = true;
            this._initializing = false;
            
            console.log('✅ SupabaseCore 초기화 완료');
            return true;
            
        } catch (error) {
            this._initializing = false;
            console.error('❌ SupabaseCore 초기화 실패:', error);
            return false;
        }
    },

    // 클라이언트 getter
    get client() {
        return this.supabase;
    },

    // 🔧 v4.2.1 강화된 클라이언트 확보 함수
    async ensureClient() {
        if (!this.supabase || !this._initialized) {
            console.log('🔄 SupabaseCore 클라이언트 확보 중...');
            const initSuccess = await this.init();
            if (!initSuccess) {
                throw new Error('SupabaseCore 초기화 실패');
            }
        }
        return this.supabase;
    },

    // 🔧 v4.2.1 강화된 안전한 API 호출 래퍼
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            // 클라이언트 확보
            await this.ensureClient();
            
            const result = await apiFunction();
            
            if (result.error) {
                console.error(`❌ ${operation} 오류:`, result.error);
                return { 
                    success: false, 
                    message: this.getErrorMessage(result.error), 
                    error: result.error 
                };
            }
            
            console.log(`✅ ${operation} 성공`);
            return { success: true, data: result.data };
            
        } catch (error) {
            console.error(`❌ ${operation} 예외:`, error);
            return { 
                success: false, 
                message: this.getErrorMessage(error), 
                error: error 
            };
        }
    },

    // 🔧 v4.2.1 - 에러 메시지 처리 강화
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            // 컬럼 존재하지 않음 오류 처리
            if (error.message.includes('has no field') || error.code === '42703') {
                return '데이터베이스 구조 오류: 존재하지 않는 컬럼을 참조했습니다.';
            }
            if (error.message.includes('PGRST116')) {
                return '요청하신 데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied')) {
                return '접근 권한이 없습니다.';
            }
            if (error.message.includes('duplicate key')) {
                return '이미 존재하는 데이터입니다.';
            }
            if (error.message.includes('not null')) {
                return '필수 정보가 누락되었습니다.';
            }
            if (error.message.includes('timeout') || error.message.includes('타임아웃')) {
                return '요청 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다.';
    },

    // ===================
    // 유틸리티 함수들
    // ===================
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
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    // ===================
    // 🆕 v4.2.2 사용자 관리 함수들
    // ===================
    
    /**
     * 현재 사용자 설정
     * @param {Object} user - 사용자 객체
     * @param {string} userType - 사용자 타입 ('admin', 'student', etc.)
     */
    setCurrentUser(user, userType) {
        this.currentUser = user;
        this.currentUserType = userType;
        
        // 세션 저장
        if (user && userType) {
            try {
                const sessionData = {
                    user: user,
                    userType: userType,
                    timestamp: new Date().toISOString()
                };
                
                if (userType === 'admin') {
                    sessionStorage.setItem('adminSession', JSON.stringify(sessionData));
                } else {
                    sessionStorage.setItem('userSession', JSON.stringify(sessionData));
                }
                
                console.log(`✅ ${userType} 사용자 설정 완료:`, user.name || user.email);
            } catch (error) {
                console.warn('세션 저장 실패:', error);
            }
        }
    },

    /**
     * 현재 사용자 정보 반환
     * @returns {Object|null} 현재 사용자 객체
     */
    getCurrentUser() {
        return this.currentUser;
    },

    /**
     * 현재 사용자 타입 반환
     * @returns {string|null} 현재 사용자 타입
     */
    getCurrentUserType() {
        return this.currentUserType;
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        try {
            sessionStorage.removeItem('userSession');
            sessionStorage.removeItem('adminSession');
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
        console.log('✅ 로그아웃 완료');
    },

    // 🔧 v4.2.1 강화된 연결 테스트
    async testConnection() {
        console.log('🔗 SupabaseCore 연결 테스트 시작...');
        
        return await this.safeApiCall('연결 테스트', async () => {
            return await this.supabase
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    },

    // 🆕 v4.2.1 상태 확인 함수
    getStatus() {
        return {
            initialized: this._initialized,
            initializing: this._initializing,
            hasClient: !!this.supabase,
            hasUser: !!this.currentUser,
            userType: this.currentUserType
        };
    }
};

// 🔧 v4.2.1 개선된 자동 초기화
(async () => {
    console.log('🚀 SupabaseCore v4.2.2 자동 초기화 시작...');
    
    // CONFIG 로드 대기 (더 여유있게)
    let waitCount = 0;
    const maxWaitCount = 60; // 6초
    
    while (!window.CONFIG && waitCount < maxWaitCount) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
        
        // 2초마다 진행 상황 로그
        if (waitCount % 20 === 0) {
            console.log(`⏳ CONFIG 로드 대기 중... ${waitCount}/${maxWaitCount}`);
        }
    }
    
    if (window.CONFIG) {
        const initSuccess = await SupabaseCore.init();
        if (initSuccess) {
            console.log('✅ SupabaseCore v4.2.2 자동 초기화 완료');
        } else {
            console.warn('⚠️ SupabaseCore v4.2.2 자동 초기화 실패');
        }
    } else {
        console.warn('⚠️ CONFIG 로드 타임아웃 - SupabaseCore 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseCore = SupabaseCore;

// 🆕 개발자 도구 지원
if (typeof window !== 'undefined') {
    window.SupabaseCoreDebug = {
        getStatus: () => SupabaseCore.getStatus(),
        forceInit: () => SupabaseCore.init(),
        testConnection: () => SupabaseCore.testConnection(),
        getCurrentUser: () => SupabaseCore.getCurrentUser(),
        getCurrentUserType: () => SupabaseCore.getCurrentUserType()
    };
}

console.log('🚀 SupabaseCore v4.2.2 loaded - 사용자 관리 함수 추가 완료');
