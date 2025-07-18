// api-event-adapter.js - API 이벤트 어댑터
// 목적: 기존 API 코드 변경 없이 이벤트 기반 통신 지원
// 위치: js/student/api-event-adapter.js

class APIEventAdapter {
    constructor() {
        this.apiInstance = null;
        this.isReady = false;
        this.pendingRequests = [];
        this.checkAttempts = 0;
        this.maxCheckAttempts = 10; // 10초간 체크
        
        console.log('🔌 API 이벤트 어댑터 v1.0 초기화...');
        
        // 즉시 localStorage 데이터 제공
        this.setupImmediateResponses();
        
        // 백그라운드에서 API 연결 시도
        this.findExistingAPI();
        
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        console.log('✅ API 이벤트 어댑터 초기화 완료');
    }

    // === 즉시 응답 시스템 ===
    setupImmediateResponses() {
        // localStorage에서 사용자 데이터 즉시 제공
        const userData = this.getUserDataFromLocalStorage();
        
        // 즉시 사용자 프로필 이벤트 발행
        if (userData) {
            setTimeout(() => {
                window.moduleEventBus?.emit('userProfile:loaded', userData);
                console.log('⚡ localStorage 사용자 데이터 즉시 제공:', userData);
            }, 10);
        }
    }

    // === API 인스턴스 찾기 ===
    findExistingAPI() {
        const checkAPI = () => {
            // 기존 API 인스턴스 확인
            if (window.flightRequestAPI?.isInitialized) {
                this.connectToAPI(window.flightRequestAPI);
                return;
            }
            
            // 조금 더 관대한 조건으로 확인
            if (window.flightRequestAPI?.supabase) {
                console.log('⚠️ API 부분 초기화됨 - 연결 시도');
                this.connectToAPI(window.flightRequestAPI);
                return;
            }
            
            // 재시도
            this.checkAttempts++;
            if (this.checkAttempts < this.maxCheckAttempts) {
                setTimeout(checkAPI, 1000);
            } else {
                console.warn('⚠️ API 연결 타임아웃 - 폴백 모드로 동작');
                this.setupFallbackMode();
            }
        };
        
        // 즉시 첫 번째 체크
        checkAPI();
    }

    connectToAPI(apiInstance) {
        this.apiInstance = apiInstance;
        this.isReady = true;
        
        console.log('✅ API 인스턴스 연결 완료');
        
        // 대기 중인 요청들 처리
        this.processPendingRequests();
        
        // API 준비 완료 이벤트 발행
        window.moduleEventBus?.emit('api:ready', {
            instance: this.apiInstance
        });
    }

    // === 이벤트 리스너 설정 ===
    setupEventListeners() {
        if (!window.moduleEventBus) {
            console.warn('⚠️ moduleEventBus가 없음');
            return;
        }

        // 사용자 프로필 요청
        window.moduleEventBus.on('request:userProfile', async (data) => {
            try {
                let userProfile = null;
                
                if (this.isReady && this.apiInstance?.getUserProfile) {
                    // API에서 최신 데이터 가져오기
                    userProfile = await this.apiInstance.getUserProfile();
                    console.log('✅ API에서 사용자 프로필 로드 완료');
                } else {
                    // localStorage 폴백
                    userProfile = this.getUserDataFromLocalStorage();
                    console.log('⚠️ localStorage에서 사용자 프로필 제공');
                    
                    // API 준비되지 않았으면 대기열에 추가
                    if (!this.isReady) {
                        this.pendingRequests.push({
                            type: 'userProfile',
                            data: data
                        });
                    }
                }
                
                // 콜백 호출
                if (data.callback && userProfile) {
                    data.callback(userProfile);
                }
                
                // 전역 이벤트 발행
                if (userProfile) {
                    window.moduleEventBus.emit('userProfile:loaded', userProfile);
                }
                
            } catch (error) {
                console.error('❌ 사용자 프로필 요청 실패:', error);
                
                // 에러 시 localStorage 폴백
                const fallbackData = this.getUserDataFromLocalStorage();
                if (data.callback) {
                    data.callback(fallbackData);
                }
            }
        });

        // 여권 정보 요청
        window.moduleEventBus.on('request:passportInfo', async (data) => {
            try {
                let passportInfo = null;
                
                if (this.isReady && this.apiInstance?.getPassportInfo) {
                    passportInfo = await this.apiInstance.getPassportInfo();
                } else {
                    this.pendingRequests.push({
                        type: 'passportInfo',
                        data: data
                    });
                }
                
                if (data.callback) {
                    data.callback(passportInfo);
                }
                
                window.moduleEventBus.emit('passportInfo:loaded', passportInfo);
                
            } catch (error) {
                console.error('❌ 여권 정보 요청 실패:', error);
                if (data.callback) {
                    data.callback(null);
                }
            }
        });

        // 기존 항공권 신청 요청
        window.moduleEventBus.on('request:existingRequest', async (data) => {
            try {
                let existingRequest = null;
                
                if (this.isReady && this.apiInstance?.getExistingRequest) {
                    existingRequest = await this.apiInstance.getExistingRequest();
                } else {
                    this.pendingRequests.push({
                        type: 'existingRequest',
                        data: data
                    });
                }
                
                if (data.callback) {
                    data.callback(existingRequest);
                }
                
                window.moduleEventBus.emit('existingRequest:loaded', existingRequest);
                
            } catch (error) {
                console.error('❌ 기존 신청 내역 요청 실패:', error);
                if (data.callback) {
                    data.callback(null);
                }
            }
        });
    }

    // === 대기 중인 요청 처리 ===
    processPendingRequests() {
        if (this.pendingRequests.length === 0) return;
        
        console.log(`🔄 대기 중인 요청 ${this.pendingRequests.length}개 처리 시작...`);
        
        const requests = [...this.pendingRequests];
        this.pendingRequests = [];
        
        requests.forEach(request => {
            // 각 요청 재발행
            setTimeout(() => {
                window.moduleEventBus?.emit(`request:${request.type}`, request.data);
            }, 100);
        });
        
        console.log('✅ 대기 중인 요청 처리 완료');
    }

    // === localStorage 데이터 관리 ===
    getUserDataFromLocalStorage() {
        try {
            const userData = localStorage.getItem('currentStudent');
            if (userData) {
                const parsed = JSON.parse(userData);
                
                // 기본값과 함께 반환
                return {
                    id: parsed.id,
                    name: parsed.name,
                    email: parsed.email,
                    sejong_institute: parsed.sejong_institute,
                    field: parsed.field,
                    minimum_required_days: parsed.minimum_required_days || 90,
                    maximum_allowed_days: parsed.maximum_allowed_days || 120,
                    dispatch_end_date: parsed.dispatch_end_date || '2025-12-12',
                    dispatch_duration: parsed.dispatch_duration,
                    birth_date: parsed.birth_date,
                    dispatch_start_date: parsed.dispatch_start_date,
                    ...parsed
                };
            }
        } catch (error) {
            console.warn('⚠️ localStorage 데이터 파싱 실패:', error);
        }
        
        // 완전 폴백 데이터
        return {
            minimum_required_days: 90,
            maximum_allowed_days: 120,
            dispatch_end_date: '2025-12-12',
            name: '사용자',
            sejong_institute: '세종학당'
        };
    }

    // === 폴백 모드 ===
    setupFallbackMode() {
        console.log('🛡️ API 폴백 모드 설정 중...');
        
        // localStorage 기반 응답만 제공
        window.moduleEventBus?.on('request:userProfile', (data) => {
            const fallbackData = this.getUserDataFromLocalStorage();
            if (data.callback) {
                data.callback(fallbackData);
            }
            window.moduleEventBus?.emit('userProfile:loaded', fallbackData);
        });
        
        // 다른 요청들은 null 응답
        ['passportInfo', 'existingRequest'].forEach(type => {
            window.moduleEventBus?.on(`request:${type}`, (data) => {
                if (data.callback) {
                    data.callback(null);
                }
            });
        });
        
        console.log('✅ API 폴백 모드 설정 완료');
    }

    // === 수동 API 연결 시도 ===
    async forceAPIConnection() {
        try {
            if (window.flightRequestAPI) {
                if (window.flightRequestAPI.ensureInitialized) {
                    await window.flightRequestAPI.ensureInitialized();
                }
                
                this.connectToAPI(window.flightRequestAPI);
                return true;
            }
        } catch (error) {
            console.error('❌ 수동 API 연결 실패:', error);
        }
        return false;
    }

    // === 상태 정보 ===
    getStatus() {
        return {
            version: 'v1.0',
            isReady: this.isReady,
            hasAPI: !!this.apiInstance,
            checkAttempts: this.checkAttempts,
            pendingRequests: this.pendingRequests.length,
            apiStatus: this.apiInstance?.getStatus?.() || null
        };
    }
}

// === 즉시 어댑터 생성 ===
function createAPIEventAdapter() {
    try {
        console.log('🔌 API 이벤트 어댑터 생성 시작...');
        
        // 기존 인스턴스 확인
        if (window.apiEventAdapter) {
            console.log('⚠️ 기존 어댑터 인스턴스 존재 - 재사용');
            return window.apiEventAdapter;
        }
        
        // 새 인스턴스 생성
        window.apiEventAdapter = new APIEventAdapter();
        
        console.log('✅ API 이벤트 어댑터 생성 완료');
        return window.apiEventAdapter;
        
    } catch (error) {
        console.error('❌ API 이벤트 어댑터 생성 실패:', error);
        return null;
    }
}

// === 즉시 실행 ===
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createAPIEventAdapter, 50);
    });
} else {
    setTimeout(createAPIEventAdapter, 50);
}

// 전역 클래스 노출
window.APIEventAdapter = APIEventAdapter;

console.log('🔌 API 이벤트 어댑터 모듈 로드 완료');
console.log('🎯 어댑터 특징:', {
    즉시응답: 'localStorage 데이터 즉시 제공',
    백그라운드연결: 'API 연결을 백그라운드에서 시도',
    폴백지원: 'API 실패 시 기본 데이터로 동작',
    호환성: '기존 API 코드 변경 없이 이벤트 지원'
});