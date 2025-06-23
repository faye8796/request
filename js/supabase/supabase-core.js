// 🚀 Supabase 핵심 공통 기능 모듈 v4.2.0
// 초기화, 에러 처리, 유틸리티 함수들
// 모든 Supabase 모듈의 기반이 되는 핵심 기능들

const SupabaseCore = {
    // Supabase 클라이언트
    supabase: null,
    
    // 현재 사용자 정보
    currentUser: null,
    currentUserType: null,

    // 초기화
    async init() {
        try {
            console.log('🚀 SupabaseCore 초기화 중...');
            
            if (!window.supabase || !CONFIG.SUPABASE.URL || !CONFIG.SUPABASE.ANON_KEY) {
                throw new Error('Supabase 설정이 올바르지 않습니다.');
            }
            
            this.supabase = window.supabase.createClient(
                CONFIG.SUPABASE.URL,
                CONFIG.SUPABASE.ANON_KEY
            );
            
            console.log('✅ SupabaseCore 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ SupabaseCore 초기화 실패:', error);
            return false;
        }
    },

    // 클라이언트 getter
    get client() {
        return this.supabase;
    },

    // 클라이언트 확보 함수
    async ensureClient() {
        if (!this.supabase) {
            await this.init();
        }
        return this.supabase;
    },

    // 안전한 API 호출 래퍼
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            if (!this.supabase) {
                await this.init();
            }
            
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

    // 🔧 v2.13 - 에러 메시지 처리 강화
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

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        try {
            sessionStorage.removeItem('userSession');
            localStorage.removeItem('currentStudent');
            localStorage.removeItem('studentSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
        console.log('✅ 로그아웃 완료');
    },

    // 연결 테스트
    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            return await this.supabase
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    }
};

// 자동 초기화
(async () => {
    // CONFIG 로드 대기
    let waitCount = 0;
    while (!window.CONFIG && waitCount < 50) {
        await new Promise(resolve => setTimeout(resolve, 100));
        waitCount++;
    }
    
    if (window.CONFIG) {
        await SupabaseCore.init();
    } else {
        console.warn('⚠️ CONFIG 로드 타임아웃 - SupabaseCore 수동 초기화 필요');
    }
})();

// 전역 접근을 위해 window 객체에 추가
window.SupabaseCore = SupabaseCore;

console.log('🚀 SupabaseCore v4.2.0 loaded - 핵심 공통 기능 모듈');