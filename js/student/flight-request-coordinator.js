// FlightRequestCoordinator v1.6.2 - 속성명 충돌 해결
// init 메서드와 init 모듈 속성명 분리

/**
 * 🚨 긴급 수정: v1.6.2 - 속성명 충돌 해결
 * 
 * 주요 수정사항:
 * 1. 모듈 인스턴스 속성명 변경 (init → initModule)
 * 2. 메서드명과 속성명 충돌 완전 해결
 * 3. 모든 참조 업데이트
 */

class FlightRequestCoordinator {
    constructor() {
        this.version = "1.6.2";
        
        // 🔧 모듈 인스턴스 저장용 (메서드명과 분리)
        this.initModule = null;
        this.passportModule = null;
        this.ticketModule = null;
        this.apiModule = null;
        this.utilsModule = null;
        
        // 🚨 무한루프 방지 시스템
        this.eventDepthLimit = 3;
        this.processedEvents = new Set();
        this.eventCallStack = [];
        this.isInitialized = false;
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 3;
        
        // 🔧 최적화된 안전장치
        this.maxDependencyChecks = 10;
        this.dependencyTimeout = 3000;
        this.checkInterval = 100;
        
        // 📊 성능 모니터링
        this.initStartTime = Date.now();
        this.dependencies = {
            FlightRequestInit: false,
            FlightRequestTicket: false,
            FlightRequestPassport: false,
            FlightRequestApi: false,
            FlightRequestUtils: false
        };
        
        console.log(`🚀 FlightRequestCoordinator v${this.version} 생성자 실행 완료`);
    }

    // 🚨 무한루프 방지: 안전한 이벤트 발행
    safeEmit(eventName, data, source = 'coordinator') {
        const eventId = `${eventName}-${Date.now()}-${Math.random()}`;
        
        // 순환 참조 검사
        if (this.eventCallStack.length >= this.eventDepthLimit) {
            console.warn(`⚠️ 이벤트 깊이 제한 도달 (${this.eventDepthLimit}), 이벤트 무시: ${eventName}`);
            return;
        }
        
        // 중복 이벤트 검사
        const eventSignature = `${eventName}-${JSON.stringify(data)}`;
        if (this.processedEvents.has(eventSignature)) {
            console.warn(`⚠️ 중복 이벤트 감지, 무시: ${eventName}`);
            return;
        }
        
        this.eventCallStack.push(eventId);
        this.processedEvents.add(eventSignature);
        
        try {
            console.log(`📡 안전한 이벤트 발행: ${eventName} (source: ${source}, depth: ${this.eventCallStack.length})`);
            
            // 이벤트 전파 (순환 방지)
            this.propagateEventToModulesSafely(eventName, data);
            
        } catch (error) {
            console.error(`❌ 이벤트 발행 중 오류: ${eventName}`, error);
        } finally {
            // 스택 정리
            this.eventCallStack.pop();
            
            // 1초 후 처리된 이벤트에서 제거 (메모리 누수 방지)
            setTimeout(() => {
                this.processedEvents.delete(eventSignature);
            }, 1000);
        }
    }

    // 🚨 무한루프 방지: 안전한 이벤트 전파
    propagateEventToModulesSafely(eventName, data) {
        const modules = ['initModule', 'passportModule', 'ticketModule', 'apiModule', 'utilsModule'];
        
        modules.forEach(moduleName => {
            try {
                const module = this[moduleName];
                if (module && typeof module.emit === 'function') {
                    // 순환 참조 방지: 해당 모듈에서 발생한 이벤트는 다시 전파하지 않음
                    if (data && data.source === moduleName) {
                        return;
                    }
                    
                    // 이벤트 데이터에 source 정보 추가
                    const safeData = { ...data, source: 'coordinator', depth: this.eventCallStack.length };
                    module.emit(eventName, safeData);
                }
            } catch (error) {
                console.warn(`⚠️ 모듈 ${moduleName}에 이벤트 전파 실패: ${eventName}`, error);
            }
        });
    }

    // 🔧 의존성 대기 (타임아웃 강화)
    async waitForDependencies(timeout = 3000) {
        return new Promise((resolve) => {
            const startTime = Date.now();
            let checkCount = 0;
            
            const checkDependencies = () => {
                checkCount++;
                const elapsed = Date.now() - startTime;
                
                // 타임아웃 체크
                if (elapsed > timeout || checkCount > this.maxDependencyChecks) {
                    console.warn(`⚠️ 의존성 대기 타임아웃 (${elapsed}ms, ${checkCount}회)`);
                    resolve(false);
                    return;
                }
                
                // 의존성 확인
                const apiExists = !!window.supabaseApiAdapter;
                const utilsReady = !!window.FlightRequestUtils;
                const passportClassReady = !!window.FlightRequestPassport;
                const ticketClassReady = !!window.FlightRequestTicket;
                const initClassReady = !!window.FlightRequestInit;
                
                // 종속성 상태 업데이트
                this.dependencies.FlightRequestInit = initClassReady;
                this.dependencies.FlightRequestTicket = ticketClassReady;
                this.dependencies.FlightRequestPassport = passportClassReady;
                this.dependencies.FlightRequestApi = apiExists;
                this.dependencies.FlightRequestUtils = utilsReady;
                
                const basicReady = apiExists && utilsReady;
                const moduleClassesReady = passportClassReady && ticketClassReady && initClassReady;
                const allDependenciesReady = basicReady && moduleClassesReady;
                
                if (allDependenciesReady) {
                    console.log(`✅ 모든 의존성 준비 완료 (${elapsed}ms, ${checkCount}회)`);
                    resolve(true);
                    return;
                }
                
                if (basicReady) {
                    console.log(`🔄 기본 의존성 준비됨, 모듈 클래스 대기 중... (${elapsed}ms)`);
                } else {
                    console.log(`🔄 기본 의존성 대기 중... (${elapsed}ms)`);
                }
                
                setTimeout(checkDependencies, this.checkInterval);
            };
            
            // 즉시 첫 체크 시작
            checkDependencies();
        });
    }

    // 🔧 폴백 모드 활성화
    async activateFallbackMode() {
        console.log('🚨 폴백 모드 활성화');
        
        try {
            // 기본 UI 활성화
            const app = document.getElementById('app');
            if (app) app.style.display = 'block';
            
            // 기본 메시지 표시
            const messageEl = document.getElementById('systemMessage');
            if (messageEl) {
                messageEl.innerHTML = `
                    <div class="alert alert-info">
                        <strong>시스템 초기화 중</strong><br>
                        일부 고급 기능이 제한될 수 있습니다.
                    </div>
                `;
                messageEl.style.display = 'block';
            }
            
            // 기본 필수활동일 표시
            const requiredEl = document.getElementById('requiredDays');
            if (requiredEl && requiredEl.textContent === '로딩중...') {
                requiredEl.textContent = '90';
                requiredEl.className = 'value required-days-value fallback';
            }
            
            console.log('✅ 폴백 모드 활성화 완료');
            
        } catch (error) {
            console.error('❌ 폴백 모드 활성화 실패:', error);
        }
    }

    // 🔧 모듈별 안전한 emit 함수 생성
    createSafeEmitForModule(module, moduleName) {
        return (eventName, data) => {
            // 순환 참조 방지: 모듈에서 발생한 이벤트에 source 정보 추가
            const safeData = { ...data, source: moduleName };
            this.safeEmit(eventName, safeData, moduleName);
        };
    }

    // 🔧 초기화 모듈 안전한 실행
    async initializeInitModuleSafely() {
        try {
            console.log('🔧 초기화 모듈 안전한 실행...');
            
            if (window.FlightRequestInit) {
                this.initModule = new window.FlightRequestInit();
                this.initModule.coordinator = this;
                this.initModule.emit = this.createSafeEmitForModule(this.initModule, 'initModule');
                
                // 초기화 모듈 실행 (비동기)
                if (typeof this.initModule.init === 'function') {
                    await this.initModule.init();
                    console.log('✅ 초기화 모듈 실행 완료');
                } else {
                    console.warn('⚠️ 초기화 모듈의 init 메서드가 없습니다');
                }
            } else {
                console.warn('⚠️ FlightRequestInit 클래스가 없습니다, 폴백 모드로 진행');
                await this.activateFallbackMode();
            }
            
        } catch (error) {
            console.error('❌ 초기화 모듈 실행 실패:', error);
            await this.activateFallbackMode();
        }
    }

    // 🔧 다른 모듈들 안전한 초기화
    initializeModulesSafely() {
        try {
            console.log('🔧 나머지 모듈들 안전한 초기화...');
            
            // Passport 모듈
            if (window.FlightRequestPassport) {
                this.passportModule = new window.FlightRequestPassport();
                this.passportModule.coordinator = this;
                this.passportModule.emit = this.createSafeEmitForModule(this.passportModule, 'passportModule');
            }
            
            // Ticket 모듈
            if (window.FlightRequestTicket) {
                this.ticketModule = new window.FlightRequestTicket();
                this.ticketModule.coordinator = this;
                this.ticketModule.emit = this.createSafeEmitForModule(this.ticketModule, 'ticketModule');
            }
            
            // API 모듈
            if (window.FlightRequestApi) {
                this.apiModule = new window.FlightRequestApi();
                this.apiModule.coordinator = this;
                this.apiModule.emit = this.createSafeEmitForModule(this.apiModule, 'apiModule');
            }
            
            // Utils 모듈
            if (window.FlightRequestUtils) {
                this.utilsModule = new window.FlightRequestUtils();
                this.utilsModule.coordinator = this;
                this.utilsModule.emit = this.createSafeEmitForModule(this.utilsModule, 'utilsModule');
            }
            
            console.log('✅ 나머지 모듈들 안전한 초기화 완료');
            
        } catch (error) {
            console.error('❌ 모듈 초기화 중 오류:', error);
        }
    }

    // 🔧 이벤트 리스너 설정 (무한루프 방지)
    setupEventListeners() {
        console.log('🔧 안전한 이벤트 리스너 설정...');
        
        // 글로벌 에러 핸들러
        window.addEventListener('error', (event) => {
            if (event.message && event.message.includes('Maximum call stack')) {
                console.error('🚨 무한루프 감지! 시스템 리셋');
                this.emergencyReset();
            }
        });
        
        // 중복 방지를 위한 이벤트 위임
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        document.addEventListener('change', this.handleGlobalChange.bind(this));
    }

    // 🚨 긴급 리셋
    emergencyReset() {
        console.log('🚨 긴급 리셋 실행');
        
        // 이벤트 스택 초기화
        this.eventCallStack = [];
        this.processedEvents.clear();
        
        // 폴백 모드 활성화
        this.activateFallbackMode();
    }

    // 🔧 글로벌 클릭 핸들러 (중복 방지)
    handleGlobalClick(event) {
        // 이벤트 전파 제한
        if (this.eventCallStack.length > 0) {
            return; // 다른 이벤트 처리 중이면 무시
        }
        
        // 특정 요소들만 처리
        const target = event.target;
        if (target.matches('.flight-upload-btn, .submit-btn, .validation-btn')) {
            this.safeEmit('click', { target: target }, 'global');
        }
    }

    // 🔧 글로벌 변경 핸들러 (중복 방지)
    handleGlobalChange(event) {
        // 이벤트 전파 제한
        if (this.eventCallStack.length > 0) {
            return; // 다른 이벤트 처리 중이면 무시
        }
        
        // 특정 요소들만 처리
        const target = event.target;
        if (target.matches('#startDate, #endDate, #purchaseMethod')) {
            this.safeEmit('change', { target: target }, 'global');
        }
    }

    // 🔧 초기 상태 안전한 결정
    async determineInitialStateSafely() {
        try {
            console.log('🔧 초기 상태 안전한 결정...');
            
            // 사용자 데이터 확인
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            if (!userData.id) {
                console.warn('⚠️ 사용자 데이터 없음, 로그인 페이지로 리다이렉트');
                window.location.href = '/login.html';
                return;
            }
            
            // 여권 정보 확인 (API 호출 없이)
            await this.checkPassportStatusSafely(userData);
            
            // 기존 신청 확인 (API 호출 없이)
            await this.checkExistingRequestSafely(userData);
            
            console.log('✅ 초기 상태 안전한 결정 완료');
            
        } catch (error) {
            console.error('❌ 초기 상태 결정 실패:', error);
            // 기본 상태로 진행
        }
    }

    // 🔧 여권 상태 안전한 확인
    async checkPassportStatusSafely(userData) {
        try {
            if (window.supabaseApiAdapter) {
                const response = await window.supabaseApiAdapter.getPassportInfo(userData.id);
                if (response.success && response.data) {
                    console.log('✅ 여권 정보 확인됨');
                    return true;
                }
            }
            
            // 여권 정보 없음 - 안내 표시
            this.showPassportRequiredMessage();
            return false;
            
        } catch (error) {
            console.warn('⚠️ 여권 정보 확인 실패, 기본값 사용:', error);
            return false;
        }
    }

    // 🔧 기존 신청 안전한 확인
    async checkExistingRequestSafely(userData) {
        try {
            if (window.supabaseApiAdapter) {
                const response = await window.supabaseApiAdapter.getFlightRequest(userData.id);
                if (response.success && response.data) {
                    console.log('✅ 기존 신청 내역 발견');
                    this.showExistingRequestInfo(response.data);
                    return true;
                }
            }
            
            console.log('ℹ️ 기존 신청 내역 없음, 새 신청 가능');
            return false;
            
        } catch (error) {
            console.warn('⚠️ 기존 신청 확인 실패, 기본값 사용:', error);
            return false;
        }
    }

    // 📋 여권 필요 메시지 표시
    showPassportRequiredMessage() {
        const messageEl = document.getElementById('systemMessage');
        if (messageEl) {
            messageEl.innerHTML = `
                <div class="alert alert-warning">
                    <strong>여권 정보 등록 필요</strong><br>
                    항공권 신청 전에 여권 정보를 먼저 등록해주세요.
                    <a href="/student/passport-registration.html" class="btn btn-sm btn-primary">여권 정보 등록</a>
                </div>
            `;
            messageEl.style.display = 'block';
        }
    }

    // 📋 기존 신청 정보 표시
    showExistingRequestInfo(requestData) {
        const messageEl = document.getElementById('systemMessage');
        if (messageEl) {
            const statusText = this.getStatusText(requestData.status);
            messageEl.innerHTML = `
                <div class="alert alert-info">
                    <strong>기존 신청 내역</strong><br>
                    상태: ${statusText}<br>
                    신청일: ${new Date(requestData.created_at).toLocaleDateString()}
                </div>
            `;
            messageEl.style.display = 'block';
        }
    }

    // 📊 상태 텍스트 변환
    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료됨'
        };
        return statusMap[status] || status;
    }

    // 🚀 안전한 애플리케이션 시작
    startApplication() {
        try {
            console.log('🚀 안전한 애플리케이션 시작...');
            
            this.isInitialized = true;
            
            // 초기화 성능 측정
            const initTime = Date.now() - this.initStartTime;
            console.log(`✅ FlightRequestCoordinator v${this.version} 초기화 완료 (${initTime}ms)`);
            
            // 성공 이벤트 발행 (안전하게)
            this.safeEmit('coordinator:ready', { 
                version: this.version,
                initTime: initTime,
                fallbackMode: !this.initModule
            });
            
        } catch (error) {
            console.error('❌ 애플리케이션 시작 실패:', error);
        }
    }

    // 🔧 모듈 접근자 (안전한) - 하위 호환성 유지
    getModule(moduleName) {
        const moduleMap = {
            'init': this.initModule,
            'passport': this.passportModule,
            'ticket': this.ticketModule,
            'api': this.apiModule,
            'utils': this.utilsModule
        };
        
        return moduleMap[moduleName] || null;
    }

    // 📊 상태 확인
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            version: this.version,
            dependencies: this.dependencies,
            eventStackDepth: this.eventCallStack.length,
            processedEventsCount: this.processedEvents.size
        };
    }

    // 🚀 메인 초기화 함수
    async init() {
        try {
            this.initializationAttempts++;
            console.log(`🚀 FlightRequestCoordinator v${this.version} 초기화 시작 (시도: ${this.initializationAttempts})`);
            
            // 1. 의존성 대기 (폴백 허용)
            const dependenciesReady = await this.waitForDependencies();
            
            if (dependenciesReady) {
                // 2. 초기화 모듈 우선 실행
                await this.initializeInitModuleSafely();
                
                // 3. 나머지 모듈 초기화
                this.initializeModulesSafely();
            } else {
                console.warn('⚠️ 의존성 로드 실패, 폴백 모드로 진행');
                await this.activateFallbackMode();
            }
            
            // 4. 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 5. 초기 상태 결정
            await this.determineInitialStateSafely();
            
            // 6. 애플리케이션 시작
            this.startApplication();
            
        } catch (error) {
            console.error(`❌ FlightRequestCoordinator 초기화 실패 (시도: ${this.initializationAttempts}):`, error);
            
            if (this.initializationAttempts < this.maxInitializationAttempts) {
                console.log(`🔄 재시도 예정... (${this.initializationAttempts}/${this.maxInitializationAttempts})`);
                setTimeout(() => this.init(), 1000);
            } else {
                console.error('🚨 최대 재시도 횟수 도달, 폴백 모드 강제 활성화');
                await this.activateFallbackMode();
                this.startApplication();
            }
        }
    }
}

// 🌐 글로벌 인스턴스 생성 및 등록 (속성명 충돌 해결)
console.log('🌐 FlightRequestCoordinator 글로벌 등록 시작...');

if (typeof window !== 'undefined') {
    // 기존 인스턴스가 있으면 정리
    if (window.flightRequestCoordinator) {
        console.log('🔄 기존 Coordinator 인스턴스 정리');
        window.flightRequestCoordinator = null;
    }
    
    // 클래스 글로벌 등록
    window.FlightRequestCoordinator = FlightRequestCoordinator;
    console.log('✅ FlightRequestCoordinator 클래스 글로벌 등록 완료');
    
    // 🔧 인스턴스 생성 (속성명 충돌 해결됨)
    try {
        console.log('🔧 FlightRequestCoordinator 인스턴스 생성 시도...');
        
        const coordinator = new FlightRequestCoordinator();
        console.log('✅ 인스턴스 생성 성공');
        
        // init 메서드 검증 (이제 속성 충돌 해결됨)
        console.log('🔍 init 메서드 검증:', {
            exists: 'init' in coordinator,
            type: typeof coordinator.init,
            isFunction: typeof coordinator.init === 'function'
        });
        
        if (coordinator && typeof coordinator.init === 'function') {
            window.flightRequestCoordinator = coordinator;
            console.log('✅ 글로벌 등록 완료');
            
            // 안전한 초기화 실행
            console.log('🚀 초기화 메서드 실행 시작...');
            setTimeout(() => {
                console.log('⏰ setTimeout 콜백 실행 - init 호출');
                window.flightRequestCoordinator.init().catch(error => {
                    console.error('🚨 Coordinator 초기화 최종 실패:', error);
                });
            }, 0);
            
            console.log('✅ FlightRequestCoordinator 글로벌 등록 및 초기화 예약 완료');
            
        } else {
            console.error('🚨 FlightRequestCoordinator init 메서드 검증 실패');
        }
        
    } catch (error) {
        console.error('🚨 FlightRequestCoordinator 인스턴스 생성 실패:', error);
    }
    
} else {
    console.error('🚨 window 객체가 존재하지 않음');
}
