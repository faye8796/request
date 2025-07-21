// flight-request-coordinator.js - v1.5.3 Init 모듈 이벤트 연동 완성
// 🔧 v1.5.3 핵심 수정사항:
//   1. Init 모듈과 양방향 연결 설정
//   2. Init 모듈의 이벤트 직접 수신
//   3. Ticket 모듈의 재검증 결과 전달 수정
//   4. 전체 이벤트 플로우 완성

class FlightRequestCoordinator {
    constructor() {
        console.log('🔄 [조정자] FlightRequestCoordinator v1.5.3 생성 - Init 이벤트 연동 완성');
        
        // 🔧 신규: 단순하고 안전한 이벤트 시스템
        this.eventListeners = new Map();
        this.destroyed = false;
        
        // 🆕 v1.4.0: 분리된 모듈 인스턴스들 (FlightRequestInit 추가)
        this.init = null;         // 초기화 전용 모듈 (v1.5.0: 재검증 시스템 포함)
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        
        // 전역 상태 관리
        this.globalState = {
            currentPage: 'flight',  // 🔧 v1.5.1: 기본값 flight로 변경
            currentStep: 1,
            isPassportCompleted: false,
            isPassportValid: false,
            isTicketCompleted: false,
            isTicketValid: false,
            passportData: null,
            ticketData: null,
            isLoading: false,
            hasError: false,
            errorMessage: null,
            canAccessTicketSection: false,
            prerequisitesMet: false,
            // v1.4.0: 초기화 상태
            isInitModuleReady: false,
            initializationCompleted: false,
            // 🆕 v1.5.0: 재검증 시스템 상태 추가
            revalidationInProgress: false,
            lastRevalidationResult: null,
            activityPeriodValidationState: 'pending', // pending, valid, invalid
            flightSectionState: 'disabled' // disabled, enabled, validating
        };
        
        // 통합 서비스들
        this.services = {
            api: null,
            ui: null,
            utils: null
        };
        
        // 페이지 요소들
        this.pageElements = {
            passportPage: null,
            flightPage: null,
            loadingState: null,
            mainContent: null
        };
        
        // 초기화 상태
        this.isInitialized = false;
        this.initializationPromise = null;
        
        // 🚀 성능 최적화된 안전장치 플래그 (v1.3.0 유지)
        this.initAttempts = 0;
        this.maxInitAttempts = 3;
        this.dependencyCheckCount = 0;
        this.maxDependencyChecks = 10; // 50 → 10으로 대폭 감소 (5배 빠름)
        this.errorCount = 0;
        this.maxErrors = 5;
        
        // 🆕 v1.5.0: 재검증 시스템 관리
        this.revalidationState = {
            isListening: false,
            lastValidationTimestamp: null,
            revalidationCount: 0,
            maxRevalidationsPerMinute: 10 // 과도한 재검증 방지
        };
    }

    // === 🔧 개선된 안전한 이벤트 시스템 (v1.3.0 유지) ===
    
    emit(eventName, data) {
        try {
            // 🔧 파괴된 인스턴스나 에러 과다 발생 시 중단
            if (this.destroyed || this.errorCount >= this.maxErrors) {
                return;
            }
            
            const listeners = this.eventListeners.get(eventName);
            if (!listeners || listeners.length === 0) {
                return;
            }
            
            // 🔧 안전한 리스너 실행 (에러 발생해도 중단하지 않음)
            listeners.forEach(listener => {
                try {
                    if (typeof listener === 'function') {
                        listener({ type: eventName, detail: data });
                    }
                } catch (listenerError) {
                    console.warn(`⚠️ [조정자] 이벤트 리스너 실행 실패 (${eventName}):`, listenerError.message);
                    // 🔧 중요: 리스너 에러는 무시하고 계속 진행
                }
            });
            
        } catch (error) {
            this.errorCount++;
            console.error(`❌ [조정자] 이벤트 발행 실패: ${eventName}`, error.message);
            
            // 🔧 중요: 에러 발생해도 재시도하지 않음 (무한루프 방지)
            if (this.errorCount >= this.maxErrors) {
                console.error('❌ [조정자] 최대 에러 횟수 초과 - 이벤트 시스템 비활성화');
                this.destroy();
            }
        }
    }

    // 🆕 v1.5.3: 안전한 이벤트 발행 (Init 모듈 호환성)
    safeEmit(eventName, data) {
        return this.emit(eventName, data);
    }

    on(eventName, handler) {
        try {
            if (this.destroyed || typeof handler !== 'function') {
                return;
            }
            
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            
            this.eventListeners.get(eventName).push(handler);
        } catch (error) {
            console.warn(`⚠️ [조정자] 이벤트 구독 실패: ${eventName}`, error.message);
        }
    }

    off(eventName, handler) {
        try {
            if (this.destroyed) {
                return;
            }
            
            const listeners = this.eventListeners.get(eventName);
            if (!listeners) {
                return;
            }
            
            const index = listeners.indexOf(handler);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        } catch (error) {
            console.warn(`⚠️ [조정자] 이벤트 구독 해제 실패: ${eventName}`, error.message);
        }
    }

    // === 🆕 v1.4.0: 초기화 모듈 포함 의존성 대기 ===
    async waitForDependencies(timeout = 3000) { // 15초 → 3초로 대폭 단축 (5배 빠름)
        const startTime = Date.now();
        
        return new Promise((resolve) => { // reject 제거 - 항상 resolve
            const check = () => {
                this.dependencyCheckCount++;
                
                // 🚀 체크 횟수 제한 최적화 (50 → 10)
                if (this.dependencyCheckCount > this.maxDependencyChecks) {
                    console.warn('⚠️ [조정자] 의존성 체크 횟수 초과 - 강제 종료');
                    resolve();
                    return;
                }

                const apiExists = !!window.flightRequestAPI;
                const utilsReady = window.utilsReady === true;
                const passportClassReady = !!window.FlightRequestPassport;
                const ticketClassReady = !!window.FlightRequestTicket;
                // v1.4.0: FlightRequestInit 클래스 확인 추가
                const initClassReady = !!window.FlightRequestInit;
                
                const allBasicReady = apiExists && utilsReady && passportClassReady && 
                                     ticketClassReady && initClassReady;
                
                if (allBasicReady) {
                    console.log('✅ [조정자] v1.5.3: 모든 의존성 준비 완료 (Init 이벤트 연동)');
                    resolve();
                    return;
                }
                
                // 🚀 타임아웃 체크 (대폭 단축)
                if (Date.now() - startTime > timeout) {
                    console.warn(`⚠️ [조정자] 의존성 로딩 시간 초과 (${timeout}ms) - 기본값으로 진행`);
                    resolve();
                    return;
                }
                
                // 🚀 체크 간격 최적화 (300ms → 100ms로 단축)
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // === 🔧 v1.5.1: DOM 준비 대기 ===
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // === 🆕 v1.5.0: 재검증 시스템 통합 초기화 ===
    async initializeCoordinator() {
        try {
            // 🔧 재시도 횟수 유지
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('❌ [조정자] 최대 초기화 시도 횟수 초과 - 중단');
                return false;
            }
            
            if (this.destroyed) {
                console.error('❌ [조정자] 파괴된 인스턴스 - 초기화 불가');
                return false;
            }
            
            this.initAttempts++;
            console.log(`🚀 [조정자] v1.5.3 초기화 시작 (시도 ${this.initAttempts}/${this.maxInitAttempts}) - Init 이벤트 연동`);
            
            // 🔧 v1.5.1: DOM 준비 대기
            await this.waitForDOM();
            
            await this.waitForDependencies();
            this.setupServicesSafely();
            this.initializePageElements();
            
            // v1.4.0: 초기화 모듈 우선 실행
            await this.initializeInitModuleSafely();
            
            // 🆕 v1.5.0: 재검증 시스템 설정
            await this.setupRevalidationSystemIntegration();
            
            this.initializeModulesSafely();
            this.setupEventListeners();
            await this.determineInitialStateSafely();
            this.startApplication();
            
            this.isInitialized = true;
            console.log('✅ [조정자] v1.5.3 초기화 완료 - Init 이벤트 연동 완성');
            return true;
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 초기화 실패:', error.message);
            this.handleInitializationError(error);
            return false;
        }
    }

    // === 🆕 v1.5.3: 재검증 시스템 통합 설정 (수정) ===
    async setupRevalidationSystemIntegration() {
        try {
            console.log('🔄 [조정자] v1.5.3: 재검증 시스템 통합 설정...');
            
            if (!this.init) {
                console.warn('⚠️ [조정자] v1.5.3: 초기화 모듈이 없어 재검증 시스템 설정 제한됨');
                return;
            }
            
            // 🆕 v1.5.3: Init 모듈과 양방향 연결 설정
            if (typeof this.init.setCoordinator === 'function') {
                this.init.setCoordinator(this);
                console.log('✅ [조정자] v1.5.3: Init 모듈과 양방향 연결 설정 완료');
            }
            
            // 1. 초기화 모듈의 재검증 상태 확인
            if (typeof this.init.getRevalidationStatus === 'function') {
                const revalidationStatus = this.init.getRevalidationStatus();
                if (revalidationStatus && revalidationStatus.listenersSetup) {
                    console.log('✅ [조정자] v1.5.3: 초기화 모듈 재검증 리스너 확인됨');
                    this.revalidationState.isListening = true;
                }
            }
            
            // 2. 재검증 이벤트 리스너 설정
            this.setupRevalidationEventListeners();
            
            // 3. 전역 상태 동기화
            this.syncRevalidationState();
            
            console.log('✅ [조정자] v1.5.3: 재검증 시스템 통합 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 시스템 통합 설정 실패:', error);
        }
    }

    // === 🆕 v1.5.3: 재검증 이벤트 리스너 설정 (수정) ===
    setupRevalidationEventListeners() {
        try {
            console.log('🔄 [조정자] v1.5.3: 재검증 이벤트 리스너 설정...');
            
            // 초기화 모듈의 재검증 이벤트 감지
            this.on('init:revalidationStarted', (event) => {
                this.handleRevalidationStarted(event.detail);
            });
            
            this.on('init:revalidationCompleted', (event) => {
                this.handleRevalidationCompleted(event.detail);
            });
            
            this.on('init:activityPeriodChanged', (event) => {
                this.handleActivityPeriodChanged(event.detail);
            });
            
            this.on('init:flightSectionStateChanged', (event) => {
                this.handleFlightSectionStateChanged(event.detail);
            });
            
            // 🆕 v1.5.3: 초기화 완료 이벤트
            this.on('init:completed', (event) => {
                this.handleInitCompleted(event.detail);
            });
            
            console.log('✅ [조정자] v1.5.3: 재검증 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 이벤트 리스너 설정 실패:', error);
        }
    }

    // === 🆕 v1.5.0: 재검증 상태 폴링 시작 ===
    startRevalidationStatePolling() {
        try {
            // 30초마다 재검증 상태 동기화
            this.revalidationPollingInterval = setInterval(() => {
                if (!this.destroyed && this.init) {
                    this.syncRevalidationState();
                }
            }, 30000);
            
            console.log('✅ [조정자] v1.5.3: 재검증 상태 폴링 시작');
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 상태 폴링 시작 실패:', error);
        }
    }

    // === 🆕 v1.5.0: 재검증 상태 동기화 ===
    syncRevalidationState() {
        try {
            if (!this.init || this.destroyed) return;
            
            if (typeof this.init.getRevalidationStatus !== 'function') return;
            
            const revalidationStatus = this.init.getRevalidationStatus();
            if (!revalidationStatus) return;
            
            // 전역 상태 업데이트
            const newState = {
                revalidationInProgress: revalidationStatus.isValidationInProgress,
                lastRevalidationResult: revalidationStatus.lastValidationState?.result,
                activityPeriodValidationState: this.determineValidationState(revalidationStatus.lastValidationState),
                flightSectionState: this.determineFlightSectionState(revalidationStatus)
            };
            
            // 상태가 실제로 변경된 경우만 업데이트
            const hasChanges = Object.entries(newState).some(([key, value]) => 
                JSON.stringify(this.globalState[key]) !== JSON.stringify(value)
            );
            
            if (hasChanges) {
                this.updateGlobalState(newState);
                console.log('🔄 [조정자] v1.5.3: 재검증 상태 동기화 완료', newState);
            }
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 상태 동기화 실패:', error);
        }
    }

    // === 🆕 v1.5.0: 검증 상태 판단 ===
    determineValidationState(lastValidationState) {
        try {
            if (!lastValidationState || !lastValidationState.result) {
                return 'pending';
            }
            
            return lastValidationState.result.success ? 'valid' : 'invalid';
            
        } catch (error) {
            return 'pending';
        }
    }

    // === 🆕 v1.5.0: 항공권 섹션 상태 판단 ===
    determineFlightSectionState(revalidationStatus) {
        try {
            if (revalidationStatus.isValidationInProgress) {
                return 'validating';
            }
            
            if (revalidationStatus.lastValidationState?.result?.success) {
                return 'enabled';
            }
            
            return 'disabled';
            
        } catch (error) {
            return 'disabled';
        }
    }

    // === 🆕 v1.5.0: 재검증 이벤트 핸들러들 ===
    handleRevalidationStarted(data) {
        try {
            console.log('🔄 [조정자] v1.5.3: 재검증 시작 감지', data);
            
            this.updateGlobalState({
                revalidationInProgress: true,
                flightSectionState: 'validating'
            });
            
            // 사용자에게 재검증 진행 중 표시
            this.showInfo('활동기간 정보를 재검증하고 있습니다...');
            
            // 재검증 횟수 추적
            this.revalidationState.revalidationCount++;
            this.revalidationState.lastValidationTimestamp = Date.now();
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 시작 처리 실패:', error);
        }
    }

    // 🆕 v1.5.3: 재검증 완료 핸들러 (수정)
    handleRevalidationCompleted(data) {
        try {
            console.log('✅ [조정자] v1.5.3: 재검증 완료 감지', data);
            
            const newState = {
                revalidationInProgress: false,
                lastRevalidationResult: data.result,
                activityPeriodValidationState: data.result?.success ? 'valid' : 'invalid',
                flightSectionState: data.result?.success ? 'enabled' : 'disabled'
            };
            
            this.updateGlobalState(newState);
            
            // 사용자 피드백
            if (data.result?.success) {
                this.showSuccess('활동기간 재검증 완료 - 항공권 신청이 가능합니다');
            } else {
                this.showWarning(`재검증 실패: ${data.result?.message || '알 수 없는 오류'}`);
            }
            
            // 🆕 v1.5.3: 티켓 모듈에 재검증 결과 전파 (메서드명 수정)
            if (this.ticket && typeof this.ticket.handleRevalidationResult === 'function') {
                this.ticket.handleRevalidationResult(data.result);
            }
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 완료 처리 실패:', error);
        }
    }

    // 🆕 v1.5.3: 활동기간 변경 핸들러 (수정)
    handleActivityPeriodChanged(data) {
        try {
            console.log('🔔 [조정자] v1.5.3: 활동기간 변경 감지', data);
            
            // 즉시 상태 리셋
            this.updateGlobalState({
                activityPeriodValidationState: 'pending',
                flightSectionState: 'disabled',
                prerequisitesMet: false
            });
            
            // 🆕 v1.5.3: 티켓 모듈에 활동기간 변경 알림
            if (this.ticket && typeof this.ticket.handleActivityPeriodChange === 'function') {
                this.ticket.handleActivityPeriodChange(data);
            }
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 활동기간 변경 처리 실패:', error);
        }
    }

    handleFlightSectionStateChanged(data) {
        try {
            console.log('🔄 [조정자] v1.5.3: 항공권 섹션 상태 변경 감지', data);
            
            this.updateGlobalState({
                flightSectionState: data.state,
                canAccessTicketSection: data.state === 'enabled'
            });
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 항공권 섹션 상태 변경 처리 실패:', error);
        }
    }

    // 🆕 v1.5.3: Init 완료 핸들러
    handleInitCompleted(data) {
        try {
            console.log('✅ [조정자] v1.5.3: Init 모듈 초기화 완료', data);
            
            // 사용자 요구사항 티켓 모듈에 전달
            if (data.userRequiredDays && data.userMaximumDays && this.ticket) {
                if (typeof this.ticket.setUserRequirements === 'function') {
                    this.ticket.setUserRequirements({
                        userRequiredDays: data.userRequiredDays,
                        userMaximumDays: data.userMaximumDays
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: Init 완료 처리 실패:', error);
        }
    }

    // === v1.4.0: 초기화 모듈 전용 초기화 (유지) ===
    async initializeInitModuleSafely() {
        try {
            console.log('🔄 [조정자] v1.5.3: 초기화 모듈 초기화...');
            
            if (window.FlightRequestInit) {
                try {
                    this.init = new window.FlightRequestInit();
                    
                    // 🆕 v1.5.3: 초기화 전에 Coordinator 연결
                    if (typeof this.init.setCoordinator === 'function') {
                        this.init.setCoordinator(this);
                    }
                    
                    // 초기화 모듈 실행
                    await this.init.init();
                    
                    this.globalState.isInitModuleReady = true;
                    this.globalState.initializationCompleted = true;
                    console.log('✅ [조정자] v1.5.3: 초기화 모듈 초기화 성공');
                    
                    // 초기화 모듈의 사용자 데이터를 전역 상태에 반영
                    if (typeof this.init.getUserData === 'function') {
                        const userData = this.init.getUserData();
                        if (userData) {
                            this.globalState.userData = userData;
                        }
                    }
                    
                    // 사용자 요구사항 가져오기
                    if (typeof this.init.getUserRequirements === 'function') {
                        const requirements = this.init.getUserRequirements();
                        if (requirements) {
                            this.globalState.userRequirements = requirements;
                        }
                    }
                    
                    // 🆕 v1.5.0: 재검증 상태 초기 동기화
                    this.syncRevalidationState();
                    
                } catch (initError) {
                    console.warn('⚠️ [조정자] v1.5.3: 초기화 모듈 초기화 실패:', initError.message);
                    this.init = null;
                    this.globalState.isInitModuleReady = false;
                }
            } else {
                console.warn('⚠️ [조정자] v1.5.3: FlightRequestInit 클래스를 찾을 수 없음');
                this.globalState.isInitModuleReady = false;
            }
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] v1.5.3: 초기화 모듈 초기화 실패:', error.message);
            this.init = null;
            this.globalState.isInitModuleReady = false;
        }
    }

    // === 안전한 서비스 설정 ===
    setupServicesSafely() {
        try {
            console.log('🔄 [조정자] 안전한 서비스 설정...');
            
            // API 서비스 설정
            if (window.flightRequestAPI) {
                this.api = window.flightRequestAPI;
                this.services.api = this.api;
                
                // 호환성을 위한 메서드 별칭 추가
                if (this.api && !this.api.loadPassportInfo) {
                    if (this.api.getPassportInfo) {
                        this.api.loadPassportInfo = this.api.getPassportInfo.bind(this.api);
                    }
                    if (this.api.getExistingRequest) {
                        this.api.loadExistingFlightRequest = this.api.getExistingRequest.bind(this.api);
                    }
                }
            }
            
            // Utils 서비스 설정
            if (window.FlightRequestUtils || window.flightRequestUtils) {
                this.utils = window.FlightRequestUtils || window.flightRequestUtils;
                this.services.utils = this.utils;
            }
            
            // UI 서비스 설정
            this.services.ui = {
                showError: (message) => this.showError(message),
                showSuccess: (message) => this.showSuccess(message),
                showWarning: (message) => this.showWarning(message), // 🆕 v1.5.0 추가
                showInfo: (message) => this.showInfo(message), // 🆕 v1.5.0 추가
                showLoading: (loading) => this.setGlobalLoading(loading),
                updateState: (state) => this.updateGlobalState(state)
            };
            
            console.log('✅ [조정자] 안전한 서비스 설정 완료');
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 서비스 설정 실패:', error.message);
        }
    }

    // === 기본 함수들 (생략된 부분 요약) ===
    
    initializePageElements() {
        // 페이지 요소 초기화
        this.pageElements = {
            passportPage: document.getElementById('passportInfoPage'),
            flightPage: document.getElementById('flightRequestPage'),
            loadingState: document.getElementById('loadingState'),
            mainContent: document.getElementById('mainContent'),
            passportAlert: document.getElementById('passportAlert'),
            existingRequest: document.getElementById('existingRequest'),
            requestForm: document.getElementById('requestForm')
        };
    }

    // 🆕 v1.5.3: 모듈 초기화 (수정)
    initializeModulesSafely() {
        // 여권 및 티켓 모듈 초기화 (재검증 연동 포함)
        if (window.FlightRequestPassport) {
            this.passport = new window.FlightRequestPassport(this.services.api, this.services.ui);
        }
        
        if (window.FlightRequestTicket) {
            this.ticket = new window.FlightRequestTicket(this.services.api, this.services.ui, this.passport);
            
            // 🆕 v1.5.3: 초기화 모듈의 사용자 요구사항 전달
            if (this.init && this.ticket) {
                if (typeof this.init.getUserRequirements === 'function') {
                    const userRequirements = this.init.getUserRequirements();
                    if (userRequirements && typeof this.ticket.setUserRequirements === 'function') {
                        this.ticket.setUserRequirements(userRequirements);
                    }
                }
                
                if (typeof this.init.getRevalidationStatus === 'function') {
                    const revalidationStatus = this.init.getRevalidationStatus();
                    if (revalidationStatus && typeof this.ticket.setRevalidationStatus === 'function') {
                        this.ticket.setRevalidationStatus(revalidationStatus);
                    }
                }
            }
        }
    }

    setupEventListeners() {
        this.setupModuleCommunication();
        this.setupPageNavigationEvents();
        this.setupGlobalEvents();
    }

    setupModuleCommunication() {
        // 기존 이벤트 + 재검증 이벤트
        this.on('passport:completed', (event) => this.handlePassportCompletion(event.detail));
        this.on('ticket:stateChanged', (event) => this.handleTicketStateChange(event.detail));
        this.on('prerequisites:changed', (event) => this.handlePrerequisitesChange(event.detail));
        this.on('state:changed', (event) => this.syncModuleStates());
        this.on('init:completed', (event) => this.handleInitCompletion(event.detail));
        this.on('revalidation:triggered', (event) => this.handleRevalidationTriggered(event.detail));
        this.on('revalidation:completed', (event) => this.handleGlobalRevalidationCompleted(event.detail));
    }

    setupPageNavigationEvents() {
        // 페이지 네비게이션 이벤트 설정
        const passportAlertBtn = document.querySelector('[data-action="show-passport-page"]');
        if (passportAlertBtn) {
            passportAlertBtn.addEventListener('click', () => this.routeToPage('passport'));
        }
        
        const proceedBtn = document.getElementById('proceedToFlightRequest');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => this.routeToPage('flight'));
        }
    }

    setupGlobalEvents() {
        window.addEventListener('beforeunload', () => this.destroy());
        window.addEventListener('error', (event) => this.handleGlobalError(event));
    }

    async determineInitialStateSafely() {
        // 초기 상태 결정 (여권정보 체크 등)
        let initialPage = 'flight';
        
        if (this.init) {
            if (typeof this.init.getInitStatus === 'function') {
                const initStatus = this.init.getInitStatus();
                if (initStatus && initStatus.passportCheckCompleted) {
                    console.log('✅ [조정자] v1.5.3: 초기화 모듈에서 여권정보 체크 완료');
                }
            }
        }
        
        this.updateGlobalState({ currentPage: initialPage });
    }

    async routeToPage(page) {
        if (this.destroyed || this.globalState.currentPage === page) return;
        
        this.setGlobalLoading(true);
        await this.performPageTransition(page);
        this.updateGlobalState({ currentPage: page });
        this.setGlobalLoading(false);
    }

    async performPageTransition(targetPage) {
        // 페이지 전환 로직
        Object.values(this.pageElements).forEach(element => {
            if (element && element.classList) {
                element.classList.remove('active');
                element.style.display = 'none';
            }
        });
        
        switch (targetPage) {
            case 'passport':
                if (this.pageElements.passportPage) {
                    this.pageElements.passportPage.classList.add('active');
                    this.pageElements.passportPage.style.display = 'block';
                }
                break;
            case 'flight':
                if (this.pageElements.flightPage) {
                    this.pageElements.flightPage.classList.add('active');
                    this.pageElements.flightPage.style.display = 'block';
                }
                if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
                    setTimeout(() => this.ticket.triggerValidation(), 100);
                }
                break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    updateGlobalState(newState) {
        if (this.destroyed) return;
        
        this.globalState = { ...this.globalState, ...newState };
        
        setTimeout(() => {
            this.emit('state:changed', {
                current: this.globalState,
                changes: newState
            });
        }, 0);
    }

    syncModuleStates() {
        if (this.destroyed) return;
        
        // 초기화 모듈 상태 동기화
        if (this.init) {
            const initStatus = this.init.getInitStatus && this.init.getInitStatus();
            const userData = this.init.getUserData && this.init.getUserData();
            const userRequirements = this.init.getUserRequirements && this.init.getUserRequirements();
            
            if (initStatus || userData || userRequirements) {
                this.updateGlobalState({
                    initStatus: initStatus,
                    userData: userData,
                    userRequirements: userRequirements,
                    isInitModuleReady: this.globalState.isInitModuleReady
                });
            }
            
            // 재검증 상태 동기화
            this.syncRevalidationState();
        }
        
        // 여권/티켓 모듈 상태 동기화
        if (this.passport) {
            this.updateGlobalState({
                isPassportCompleted: this.passport.isPassportInfoCompleted?.(),
                isPassportValid: this.passport.isPassportInfoValid?.(),
                passportData: this.passport.getPassportData?.()
            });
        }
        
        if (this.ticket) {
            const prerequisiteStatus = this.ticket.getPrerequisiteStatus?.();
            if (prerequisiteStatus) {
                this.updateGlobalState({
                    ticketData: this.ticket.getTicketData?.(),
                    canAccessTicketSection: prerequisiteStatus.flightSectionEnabled,
                    prerequisitesMet: prerequisiteStatus.isActivityPeriodCompleted && prerequisiteStatus.isActivityPeriodValid
                });
            }
        }
    }

    // === 이벤트 핸들러들 ===
    
    handleInitCompletion(data) {
        this.updateGlobalState({
            initializationCompleted: true,
            isInitModuleReady: true
        });
        this.syncModuleStates();
    }

    handleRevalidationTriggered(data) {
        const now = Date.now();
        const timeSinceLastValidation = now - (this.revalidationState.lastValidationTimestamp || 0);
        
        if (timeSinceLastValidation < 5000) {
            console.warn('⚠️ [조정자] v1.5.3: 재검증 요청이 너무 빈번함 - 무시');
            return;
        }
        
        this.updateGlobalState({
            revalidationInProgress: true,
            flightSectionState: 'validating'
        });
        
        this.revalidationState.lastValidationTimestamp = now;
    }

    handleGlobalRevalidationCompleted(data) {
        this.updateGlobalState({
            revalidationInProgress: false,
            lastRevalidationResult: data.result,
            activityPeriodValidationState: data.result?.success ? 'valid' : 'invalid',
            flightSectionState: data.result?.success ? 'enabled' : 'disabled'
        });
        
        if (this.ticket && typeof this.ticket.handleGlobalRevalidationResult === 'function') {
            this.ticket.handleGlobalRevalidationResult(data.result);
        }
    }

    handlePassportCompletion(data) {
        this.updateGlobalState({
            isPassportCompleted: true,
            isPassportValid: data.valid,
            passportData: data.passportData
        });
        
        if (data.valid) {
            this.showSuccess('여권정보가 저장되었습니다.');
            setTimeout(() => {
                if (confirm('항공권 신청 페이지로 이동하시겠습니까?')) {
                    this.routeToPage('flight');
                }
            }, 1000);
        }
    }

    handleTicketStateChange(data) {
        this.updateGlobalState({
            ticketData: data.ticketData,
            isTicketCompleted: data.completed,
            isTicketValid: data.valid
        });
    }

    handlePrerequisitesChange(data) {
        this.updateGlobalState({
            canAccessTicketSection: data.canAccess,
            prerequisitesMet: data.met
        });
    }

    startApplication() {
        this.routeToPage(this.globalState.currentPage);
        this.syncModuleStates();
        this.setGlobalLoading(false);
    }

    // === UI 관리 ===
    
    setGlobalLoading(loading) {
        if (this.destroyed) return;
        
        this.updateGlobalState({ isLoading: loading });
        
        if (this.pageElements.loadingState) {
            this.pageElements.loadingState.style.display = loading ? 'block' : 'none';
        }
        
        if (this.pageElements.mainContent) {
            this.pageElements.mainContent.style.opacity = loading ? '0.5' : '1';
        }
    }

    showError(message) {
        if (this.destroyed) return;
        
        this.updateGlobalState({ hasError: true, errorMessage: message });
        this.showMessage(message, 'error');
    }

    showSuccess(message) {
        if (this.destroyed) return;
        this.showMessage(message, 'success');
    }

    showWarning(message) {
        if (this.destroyed) return;
        this.showMessage(message, 'warning');
    }

    showInfo(message) {
        if (this.destroyed) return;
        this.showMessage(message, 'info');
    }

    showMessage(message, type = 'info') {
        const iconMap = {
            'error': 'alert-circle',
            'success': 'check-circle',
            'warning': 'alert-triangle',
            'info': 'info'
        };
        
        const messageEl = document.getElementById(`${type}Message`) || document.getElementById('globalMessage');
        
        if (messageEl) {
            messageEl.innerHTML = `
                <div class="${type}-content">
                    <i data-lucide="${iconMap[type] || 'info'}"></i>
                    <span>${message}</span>
                </div>
            `;
            messageEl.className = `message ${type}`;
            messageEl.style.display = 'block';
            
            const hideDelay = type === 'error' ? 8000 : 5000;
            setTimeout(() => {
                if (messageEl) {
                    messageEl.style.display = 'none';
                }
                if (type === 'error') {
                    this.updateGlobalState({ hasError: false, errorMessage: null });
                }
            }, hideDelay);
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        } else {
            alert(`${type.toUpperCase()}: ${message}`);
        }
    }

    // === 에러 처리 ===
    
    handleInitializationError(error) {
        this.showError('시스템 초기화 중 오류가 발생했습니다.');
        this.updateGlobalState({ hasError: true, errorMessage: error.message });
    }

    handleStartupError(error) {
        this.showError('애플리케이션 시작 중 오류가 발생했습니다.');
    }

    handleGlobalError(event) {
        this.errorCount++;
        if (this.errorCount < this.maxErrors) {
            this.showError('예상치 못한 오류가 발생했습니다.');
        }
    }

    // === 🔧 안전한 종료 메서드 ===
    
    destroy() {
        try {
            console.log('🗑️ [조정자] v1.5.3: 인스턴스 정리 중...');
            
            this.destroyed = true;
            
            // 재검증 상태 폴링 정리
            if (this.revalidationPollingInterval) {
                clearInterval(this.revalidationPollingInterval);
                this.revalidationPollingInterval = null;
            }
            
            // 이벤트 리스너 정리
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            // 초기화 모듈 정리 (재검증 리스너 포함)
            if (this.init && typeof this.init.destroy === 'function') {
                this.init.destroy();
            }
            this.init = null;
            
            this.passport = null;
            this.ticket = null;
            this.api = null;
            this.utils = null;
            this.services = {};
            this.revalidationState = {};
            
            console.log('✅ [조정자] v1.5.3: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 인스턴스 정리 실패:', error.message);
        }
    }

    // === 🆕 v1.5.0: 재검증 시스템 공개 인터페이스 ===
    
    async triggerManualRevalidation() {
        try {
            if (this.destroyed) return false;
            
            if (this.init && typeof this.init.triggerManualRevalidation === 'function') {
                const result = await this.init.triggerManualRevalidation();
                this.syncRevalidationState();
                return result;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 수동 재검증 실패:', error.message);
            return false;
        }
    }
    
    getRevalidationStatus() {
        try {
            if (this.destroyed || !this.init) return null;
            
            if (typeof this.init.getRevalidationStatus !== 'function') return null;
            
            const initRevalidationStatus = this.init.getRevalidationStatus();
            
            return {
                ...initRevalidationStatus,
                globalState: {
                    revalidationInProgress: this.globalState.revalidationInProgress,
                    lastRevalidationResult: this.globalState.lastRevalidationResult,
                    activityPeriodValidationState: this.globalState.activityPeriodValidationState,
                    flightSectionState: this.globalState.flightSectionState
                },
                coordinatorState: this.revalidationState
            };
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 재검증 상태 조회 실패:', error.message);
            return null;
        }
    }

    // === 외부 인터페이스 ===
    
    getGlobalState() {
        return this.destroyed ? {} : { ...this.globalState };
    }

    getModule(moduleName) {
        if (this.destroyed) return null;
        
        switch (moduleName) {
            case 'init': return this.init;
            case 'passport': return this.passport;
            case 'ticket': return this.ticket;
            default: return null;
        }
    }

    getService(serviceName) {
        return this.destroyed ? null : (this.services[serviceName] || null);
    }

    forceSyncStates() {
        if (!this.destroyed) this.syncModuleStates();
    }

    triggerValidationAll() {
        if (this.destroyed) return;
        
        if (this.passport && typeof this.passport.validatePassportInfo === 'function') {
            this.passport.validatePassportInfo();
        }
        
        if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
            this.ticket.triggerValidation();
        }
    }

    getInitModule() {
        return this.destroyed ? null : this.init;
    }

    async refreshInitialization() {
        try {
            if (this.destroyed) return false;
            
            if (this.init && typeof this.init.refreshRequiredDaysInfo === 'function') {
                await this.init.refreshRequiredDaysInfo();
                this.syncModuleStates();
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ [조정자] v1.5.3: 초기화 새로고침 실패:', error.message);
            return false;
        }
    }

    async showPassportInfoPage() {
        try {
            if (this.destroyed) return;
            
            await this.routeToPage('passport');
            
            if (this.passport && typeof this.passport.loadExistingPassportDataAndSetMode === 'function') {
                setTimeout(() => this.passport.loadExistingPassportDataAndSetMode(), 200);
            }
        } catch (error) {
            console.error('❌ [조정자] showPassportInfoPage() 실패:', error.message);
            this.showError('여권정보 페이지 로드에 실패했습니다.');
        }
    }

    async loadFlightRequestData() {
        try {
            if (this.destroyed) return;
            
            if (this.ticket && typeof this.ticket.loadFlightRequestData === 'function') {
                await this.ticket.loadFlightRequestData();
            }
        } catch (error) {
            console.error('❌ [조정자] loadFlightRequestData() 실패:', error.message);
        }
    }

    closeModal(modalId) {
        try {
            if (this.destroyed) return;
            
            const modal = document.getElementById(modalId);
            if (modal) modal.style.display = 'none';
        } catch (error) {
            console.error(`❌ [조정자] 모달 닫기 실패: ${modalId}`, error.message);
        }
    }

    removeFile(fileType) {
        try {
            if (this.destroyed) return;
            
            if (this.ticket && typeof this.ticket.removeFile === 'function') {
                this.ticket.removeFile(fileType);
            }
        } catch (error) {
            console.error(`❌ [조정자] 파일 제거 실패: ${fileType}`, error.message);
        }
    }
}

// 🔧 v1.5.3: 즉시 전역 스코프에 클래스 노출
window.FlightRequestCoordinator = FlightRequestCoordinator;

// === 🚀 v1.5.3: 안전한 즉시 실행 패턴으로 초기화 ===
(async function() {
    try {
        console.log('🚀 [조정자] v1.5.3 즉시 초기화 시작...');
        
        // 중복 인스턴스 방지
        if (window.flightRequestCoordinator) {
            console.warn('⚠️ [조정자] 기존 인스턴스 정리 중...');
            if (typeof window.flightRequestCoordinator.destroy === 'function') {
                window.flightRequestCoordinator.destroy();
            }
            window.flightRequestCoordinator = null;
        }
        
        // 전역 조정자 인스턴스 생성
        window.flightRequestCoordinator = new FlightRequestCoordinator();
        
        // 🔧 v1.5.3: 메서드 존재 여부 확인 후 초기화
        if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.initializeCoordinator === 'function') {
            const initSuccess = await window.flightRequestCoordinator.initializeCoordinator();
            
            if (initSuccess) {
                console.log('✅ [조정자] v1.5.3 완전 초기화 완료 (Init 이벤트 연동 완성)');
                // 초기화 완료 플래그 설정
                window.flightRequestCoordinator.isInitialized = true;
            } else {
                console.warn('⚠️ [조정자] v1.5.3 제한된 기능으로 초기화됨');
            }
        } else {
            console.error('❌ [조정자] v1.5.3 초기화 메서드를 찾을 수 없음');
        }
        
    } catch (error) {
        console.error('❌ [조정자] v1.5.3 초기화 실패:', error);
        console.error('오류 스택:', error.stack);
        
        if (!window.coordinatorErrorShown) {
            window.coordinatorErrorShown = true;
            // 🔧 v1.5.3: 콘솔로만 오류 표시 (사용자 경험 개선)
            console.error('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
})();

console.log('✅ FlightRequestCoordinator v1.5.3 모듈 로드 완료 - Init 이벤트 연동 완성');
console.log('🆕 v1.5.3 핵심 수정 사항:', {
    fixes: [
        'Init 모듈과 양방향 연결 설정 (setCoordinator)',
        'Init 모듈의 이벤트 직접 수신 구현',
        'Ticket 모듈 메서드명 수정 (handleRevalidationResult)',
        '전체 이벤트 플로우 완성',
        '사용자 요구사항 전달 개선'
    ],
    eventFlow: [
        'Init: 활동일 변경 감지 → emit(activityPeriodChanged)',
        'Init: 검증 수행 → emit(revalidationCompleted)',
        'Coordinator: 이벤트 수신 → 상태 관리',
        'Coordinator: Ticket.handleRevalidationResult() 호출',
        'Ticket: UI 업데이트 완료'
    ],
    compatibility: 'v1.5.2 기능 100% 유지 + 이벤트 연동 완성'
});
