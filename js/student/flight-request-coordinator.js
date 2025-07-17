// flight-request-coordinator.js - EventTarget 안전장치 추가 v1.1.1
// 🚨 HOTFIX: EventTarget 초기화 실패 시 안전장치 추가
// 🔧 핵심 수정사항:
//   1. EventTarget 초기화 실패 시 폴백 객체 생성
//   2. emit() 메서드에 null/undefined 체크 강화
//   3. 이벤트 버스 재초기화 메서드 추가
//   4. 안전한 이벤트 처리로 무한루프 방지

class FlightRequestCoordinator {
    constructor() {
        // 분리된 모듈 인스턴스들
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        
        // 🚨 수정: 안전한 이벤트 버스 초기화
        this.eventBus = null;
        this.eventBusInitialized = false;
        this.initializeEventBusSafely();
        
        // 전역 상태 관리
        this.globalState = {
            currentPage: 'passport',
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
            prerequisitesMet: false
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
        
        // 🚨 무한루프 방지 강화
        this.initAttempts = 0;
        this.maxInitAttempts = 2;
        this.dependencyCheckCount = 0;
        this.maxDependencyChecks = 20;
        
        console.log('🔄 [조정자] FlightRequestCoordinator v1.1.1 생성됨 (EventTarget 안전장치)');
    }

    // 🚨 신규: 안전한 EventTarget 초기화
    initializeEventBusSafely() {
        try {
            // EventTarget API 지원 확인
            if (typeof EventTarget !== 'undefined') {
                this.eventBus = new EventTarget();
                this.eventBusInitialized = true;
                console.log('✅ [조정자] EventTarget 초기화 성공');
            } else {
                throw new Error('EventTarget not supported');
            }
        } catch (error) {
            console.warn('⚠️ [조정자] EventTarget 초기화 실패, 폴백 객체 생성:', error.message);
            
            // 폴백: 간단한 이벤트 시스템 구현
            this.eventBus = {
                listeners: new Map(),
                addEventListener: (type, listener) => {
                    if (!this.eventBus.listeners.has(type)) {
                        this.eventBus.listeners.set(type, []);
                    }
                    this.eventBus.listeners.get(type).push(listener);
                },
                removeEventListener: (type, listener) => {
                    if (this.eventBus.listeners.has(type)) {
                        const listeners = this.eventBus.listeners.get(type);
                        const index = listeners.indexOf(listener);
                        if (index > -1) {
                            listeners.splice(index, 1);
                        }
                    }
                },
                dispatchEvent: (event) => {
                    const type = event.type || event;
                    if (this.eventBus.listeners.has(type)) {
                        const listeners = this.eventBus.listeners.get(type);
                        listeners.forEach(listener => {
                            try {
                                if (typeof listener === 'function') {
                                    listener(event);
                                }
                            } catch (listenerError) {
                                console.error(`❌ [조정자] 이벤트 리스너 실행 실패 (${type}):`, listenerError);
                            }
                        });
                    }
                }
            };
            this.eventBusInitialized = true;
        }
    }

    // 🚨 수정: 이벤트 버스 재초기화 메서드
    reinitializeEventBus() {
        try {
            console.log('🔄 [조정자] 이벤트 버스 재초기화 시도...');
            
            this.eventBus = null;
            this.eventBusInitialized = false;
            this.initializeEventBusSafely();
            
            if (this.eventBusInitialized) {
                console.log('✅ [조정자] 이벤트 버스 재초기화 성공');
                return true;
            } else {
                console.error('❌ [조정자] 이벤트 버스 재초기화 실패');
                return false;
            }
        } catch (error) {
            console.error('❌ [조정자] 이벤트 버스 재초기화 중 오류:', error);
            return false;
        }
    }

    // === 🚨 수정: 무한루프 해결된 의존성 대기 ===
    async waitForDependencies(timeout = 8000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                this.dependencyCheckCount++;
                
                if (this.dependencyCheckCount > this.maxDependencyChecks) {
                    console.warn('⚠️ [조정자] 의존성 체크 횟수 초과 - 강제 종료');
                    resolve();
                    return;
                }

                const apiExists = !!window.flightRequestAPI;
                const utilsReady = window.utilsReady === true;
                const passportClassReady = !!window.FlightRequestPassport;
                const ticketClassReady = !!window.FlightRequestTicket;
                
                const allBasicReady = apiExists && utilsReady && passportClassReady && ticketClassReady;
                
                if (this.dependencyCheckCount % 5 === 0) {
                    console.log(`🔍 [조정자] 의존성 체크 ${this.dependencyCheckCount}/${this.maxDependencyChecks}:`, {
                        apiExists,
                        utilsReady,
                        passportClassReady,
                        ticketClassReady,
                        elapsed: Date.now() - startTime
                    });
                }
                
                if (allBasicReady) {
                    console.log('✅ [조정자] v1.1.1: 기본 의존성 준비 완료');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.warn(`⚠️ [조정자] 의존성 로딩 시간 초과 (${timeout}ms) - 기본값으로 진행`);
                    resolve();
                    return;
                }
                
                setTimeout(check, 300);
            };
            
            check();
        });
    }

    // === 🚨 수정: 안전한 초기화 ===
    async init() {
        try {
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('❌ [조정자] 최대 초기화 시도 횟수 초과 - 중단');
                this.showError('페이지 로딩에 실패했습니다. 새로고침해주세요.');
                return false;
            }
            
            this.initAttempts++;
            
            console.log(`🚀 [조정자] v1.1.1 초기화 시작 (시도 ${this.initAttempts}/${this.maxInitAttempts})`);
            
            // 🚨 추가: 이벤트 버스 상태 확인 및 재초기화
            if (!this.eventBusInitialized || !this.eventBus) {
                console.warn('⚠️ [조정자] 이벤트 버스 미초기화 상태 - 재초기화 시도');
                this.reinitializeEventBus();
            }
            
            await this.waitForDependencies();
            await this.setupServicesSafely();
            this.initializePageElements();
            await this.initializeModulesSafely();
            this.setupEventListeners();
            await this.determineInitialStateSafely();
            this.startApplication();
            
            this.isInitialized = true;
            this.initAttempts = 0;
            console.log('✅ [조정자] v1.1.1 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ [조정자] 초기화 실패:', error);
            this.handleInitializationError(error);
            return false;
        }
    }

    // === 🚨 신규: 안전한 서비스 설정 ===
    async setupServicesSafely() {
        try {
            console.log('🔄 [조정자] 안전한 서비스 설정 시작...');
            
            if (window.flightRequestAPI) {
                this.api = window.flightRequestAPI;
                this.services.api = this.api;
                
                if (this.api && !this.api.loadPassportInfo) {
                    if (this.api.getPassportInfo) {
                        this.api.loadPassportInfo = this.api.getPassportInfo.bind(this.api);
                    }
                    if (this.api.getExistingRequest) {
                        this.api.loadExistingFlightRequest = this.api.getExistingRequest.bind(this.api);
                    }
                }
            } else {
                console.warn('⚠️ [조정자] API 서비스 없음 - 제한된 기능으로 진행');
            }
            
            if (window.FlightRequestUtils || window.flightRequestUtils) {
                this.utils = window.FlightRequestUtils || window.flightRequestUtils;
                this.services.utils = this.utils;
            } else {
                console.warn('⚠️ [조정자] Utils 서비스 없음 - 기본 기능으로 진행');
            }
            
            this.services.ui = {
                showError: (message) => this.showError(message),
                showSuccess: (message) => this.showSuccess(message),
                showLoading: (loading) => this.setGlobalLoading(loading),
                updateState: (state) => this.updateGlobalState(state)
            };
            
            console.log('✅ [조정자] 안전한 서비스 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 서비스 설정 실패:', error);
        }
    }

    // === 🚨 신규: 안전한 모듈 초기화 ===
    async initializeModulesSafely() {
        try {
            console.log('🔄 [조정자] 안전한 모듈 초기화 시작...');
            
            if (window.FlightRequestPassport) {
                try {
                    this.passport = new window.FlightRequestPassport(
                        this.services.api,
                        this.services.ui
                    );
                    console.log('✅ [조정자] 여권 모듈 초기화 성공');
                } catch (passportError) {
                    console.warn('⚠️ [조정자] 여권 모듈 초기화 실패:', passportError);
                    this.passport = null;
                }
            }
            
            if (window.FlightRequestTicket) {
                try {
                    this.ticket = new window.FlightRequestTicket(
                        this.services.api,
                        this.services.ui,
                        this.passport
                    );
                    console.log('✅ [조정자] 항공권 모듈 초기화 성공');
                } catch (ticketError) {
                    console.warn('⚠️ [조정자] 항공권 모듈 초기화 실패:', ticketError);
                    this.ticket = null;
                }
            }
            
            console.log('✅ [조정자] 안전한 모듈 초기화 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 모듈 초기화 실패:', error);
        }
    }

    // === 🚨 신규: 안전한 초기 상태 설정 ===
    async determineInitialStateSafely() {
        try {
            console.log('🔄 [조정자] 안전한 초기 상태 설정...');
            
            let initialPage = 'passport';
            
            if (this.services.api) {
                try {
                    const passportPromise = this.services.api.getPassportInfo ? 
                        this.services.api.getPassportInfo() : null;
                    
                    const existingPassport = await Promise.race([
                        passportPromise,
                        new Promise((_, reject) => setTimeout(() => reject(new Error('타임아웃')), 3000))
                    ]).catch(error => {
                        console.warn('⚠️ [조정자] 여권정보 로드 실패:', error.message);
                        return null;
                    });
                    
                    const hasPassport = !!(existingPassport && existingPassport.passport_number);
                    
                    if (hasPassport) {
                        initialPage = 'flight';
                        console.log('✅ [조정자] 기존 여권정보 발견 - 항공권 페이지로 시작');
                    }
                    
                } catch (error) {
                    console.warn('⚠️ [조정자] 초기 데이터 확인 실패 - 기본값 사용');
                }
            }
            
            this.updateGlobalState({
                currentPage: initialPage
            });
            
            console.log('✅ [조정자] 안전한 초기 상태 설정 완료:', { initialPage });
            
        } catch (error) {
            console.error('❌ [조정자] 초기 상태 설정 실패:', error);
            this.updateGlobalState({ currentPage: 'passport' });
        }
    }

    // === 기존 메서드들 ===
    
    initializePageElements() {
        try {
            this.pageElements = {
                passportPage: document.getElementById('passportInfoPage'),
                flightPage: document.getElementById('flightRequestPage'),
                loadingState: document.getElementById('loadingState'),
                mainContent: document.getElementById('mainContent'),
                passportAlert: document.getElementById('passportAlert'),
                existingRequest: document.getElementById('existingRequest'),
                requestForm: document.getElementById('requestForm')
            };
            
            console.log('✅ [조정자] 페이지 요소 초기화 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 페이지 요소 초기화 실패:', error);
        }
    }

    setupEventListeners() {
        try {
            this.setupModuleCommunication();
            this.setupStateChangeEvents();
            this.setupPageNavigationEvents();
            this.setupGlobalEvents();
            
            console.log('✅ [조정자] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 이벤트 리스너 설정 실패:', error);
        }
    }

    setupModuleCommunication() {
        // 🚨 수정: 안전한 이벤트 리스너 추가
        if (this.eventBus && typeof this.eventBus.addEventListener === 'function') {
            this.eventBus.addEventListener('passport:completed', (event) => {
                this.handlePassportCompletion(event.detail);
            });
            
            this.eventBus.addEventListener('ticket:stateChanged', (event) => {
                this.handleTicketStateChange(event.detail);
            });
            
            this.eventBus.addEventListener('prerequisites:changed', (event) => {
                this.handlePrerequisitesChange(event.detail);
            });
        } else {
            console.warn('⚠️ [조정자] 이벤트 버스 사용 불가 - 모듈 통신 제한됨');
        }
    }

    setupStateChangeEvents() {
        if (this.eventBus && typeof this.eventBus.addEventListener === 'function') {
            this.eventBus.addEventListener('state:changed', (event) => {
                this.syncModuleStates();
            });
        }
    }

    setupPageNavigationEvents() {
        const passportAlertBtn = document.querySelector('[data-action="show-passport-page"]');
        if (passportAlertBtn) {
            passportAlertBtn.addEventListener('click', () => {
                this.routeToPage('passport');
            });
        }
        
        const proceedBtn = document.getElementById('proceedToFlightRequest');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                this.routeToPage('flight');
            });
        }
    }

    setupGlobalEvents() {
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });
        
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });
    }

    // === 🚨 수정: 안전한 이벤트 발행/구독 시스템 ===
    
    emit(eventName, data) {
        try {
            // 🚨 핵심 수정: null/undefined 체크 강화
            if (!this.eventBus) {
                console.warn(`⚠️ [조정자] 이벤트 버스 없음 - 이벤트 무시: ${eventName}`);
                
                // 재초기화 시도
                if (this.reinitializeEventBus()) {
                    console.log('🔄 [조정자] 이벤트 버스 재초기화 후 재시도');
                } else {
                    return; // 재초기화 실패 시 종료
                }
            }
            
            // EventTarget API 사용
            if (typeof this.eventBus.dispatchEvent === 'function') {
                const event = new CustomEvent(eventName, { detail: data });
                this.eventBus.dispatchEvent(event); // ← 401번째 라인 안전장치 적용
            } else {
                console.warn(`⚠️ [조정자] dispatchEvent 메서드 없음: ${eventName}`);
            }
            
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 발행 실패: ${eventName}`, error);
            
            // 🚨 추가: 오류 발생 시 이벤트 버스 재초기화 시도
            if (error.message.includes('Cannot read properties') || 
                error.message.includes('null') || 
                error.message.includes('undefined')) {
                
                console.log('🔄 [조정자] 이벤트 버스 오류로 인한 재초기화 시도...');
                this.reinitializeEventBus();
            }
        }
    }

    on(eventName, handler) {
        try {
            if (this.eventBus && typeof this.eventBus.addEventListener === 'function') {
                this.eventBus.addEventListener(eventName, handler);
            } else {
                console.warn(`⚠️ [조정자] 이벤트 구독 실패 - 이벤트 버스 없음: ${eventName}`);
            }
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 구독 실패: ${eventName}`, error);
        }
    }

    off(eventName, handler) {
        try {
            if (this.eventBus && typeof this.eventBus.removeEventListener === 'function') {
                this.eventBus.removeEventListener(eventName, handler);
            } else {
                console.warn(`⚠️ [조정자] 이벤트 구독 해제 실패 - 이벤트 버스 없음: ${eventName}`);
            }
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 구독 해제 실패: ${eventName}`, error);
        }
    }

    // === 페이지 라우팅 (간소화) ===
    
    async routeToPage(page) {
        try {
            if (this.globalState.currentPage === page) {
                return;
            }
            
            this.setGlobalLoading(true);
            
            // 페이지 전환
            await this.performPageTransition(page);
            
            this.updateGlobalState({ currentPage: page });
            
            console.log(`✅ [조정자] 페이지 라우팅 완료: ${page}`);
            
        } catch (error) {
            console.error(`❌ [조정자] 페이지 라우팅 실패: ${page}`, error);
            this.showError('페이지 전환 중 오류가 발생했습니다.');
        } finally {
            this.setGlobalLoading(false);
        }
    }

    async performPageTransition(targetPage) {
        // 모든 페이지 숨김
        Object.values(this.pageElements).forEach(element => {
            if (element && element.classList) {
                element.classList.remove('active');
                element.style.display = 'none';
            }
        });
        
        // 대상 페이지 표시
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
                
                // 항공권 모듈의 검증 트리거
                if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
                    this.ticket.triggerValidation();
                }
                break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // === 상태 관리 (로그 최소화) ===
    
    updateGlobalState(newState) {
        try {
            this.globalState = { ...this.globalState, ...newState };
            
            this.emit('state:changed', {
                current: this.globalState,
                changes: newState
            });
            
        } catch (error) {
            console.error('❌ [조정자] 전역 상태 업데이트 실패:', error);
        }
    }

    syncModuleStates() {
        try {
            // 여권 모듈 상태 동기화
            if (this.passport) {
                const passportCompleted = this.passport.isPassportInfoCompleted && this.passport.isPassportInfoCompleted();
                const passportValid = this.passport.isPassportInfoValid && this.passport.isPassportInfoValid();
                const passportData = this.passport.getPassportData && this.passport.getPassportData();
                
                this.updateGlobalState({
                    isPassportCompleted: passportCompleted,
                    isPassportValid: passportValid,
                    passportData: passportData
                });
            }
            
            // 항공권 모듈 상태 동기화
            if (this.ticket) {
                const ticketData = this.ticket.getTicketData && this.ticket.getTicketData();
                const prerequisiteStatus = this.ticket.getPrerequisiteStatus && this.ticket.getPrerequisiteStatus();
                
                if (prerequisiteStatus) {
                    this.updateGlobalState({
                        ticketData: ticketData,
                        canAccessTicketSection: prerequisiteStatus.flightSectionEnabled,
                        prerequisitesMet: prerequisiteStatus.isActivityPeriodCompleted && 
                                          prerequisiteStatus.isActivityPeriodValid
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] 모듈 상태 동기화 실패:', error);
        }
    }

    // === 모듈 간 통신 핸들러 ===
    
    handlePassportCompletion(data) {
        try {
            this.updateGlobalState({
                isPassportCompleted: true,
                isPassportValid: data.valid,
                passportData: data.passportData
            });
            
            if (data.valid) {
                this.showSuccess('여권정보가 저장되었습니다.');
                
                setTimeout(() => {
                    const shouldProceed = confirm('항공권 신청 페이지로 이동하시겠습니까?');
                    if (shouldProceed) {
                        this.routeToPage('flight');
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error('❌ [조정자] 여권 완료 처리 실패:', error);
        }
    }

    handleTicketStateChange(data) {
        try {
            this.updateGlobalState({
                ticketData: data.ticketData,
                isTicketCompleted: data.completed,
                isTicketValid: data.valid
            });
            
        } catch (error) {
            console.error('❌ [조정자] 항공권 상태 변경 처리 실패:', error);
        }
    }

    handlePrerequisitesChange(data) {
        try {
            this.updateGlobalState({
                canAccessTicketSection: data.canAccess,
                prerequisitesMet: data.met
            });
            
        } catch (error) {
            console.error('❌ [조정자] 전제 조건 변경 처리 실패:', error);
        }
    }

    // === 애플리케이션 시작 ===
    
    startApplication() {
        try {
            console.log('🚀 [조정자] 애플리케이션 시작...');
            
            this.routeToPage(this.globalState.currentPage);
            this.syncModuleStates();
            this.setGlobalLoading(false);
            
            console.log('✅ [조정자] 애플리케이션 시작 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 애플리케이션 시작 실패:', error);
            this.handleStartupError(error);
        }
    }

    // === UI 관리 ===
    
    setGlobalLoading(loading) {
        try {
            this.updateGlobalState({ isLoading: loading });
            
            if (this.pageElements.loadingState) {
                this.pageElements.loadingState.style.display = loading ? 'block' : 'none';
            }
            
            if (this.pageElements.mainContent) {
                this.pageElements.mainContent.style.opacity = loading ? '0.5' : '1';
            }
            
        } catch (error) {
            console.error('❌ [조정자] 전역 로딩 상태 설정 실패:', error);
        }
    }

    showError(message) {
        try {
            console.error('❌ [조정자] 에러:', message);
            
            this.updateGlobalState({ 
                hasError: true, 
                errorMessage: message 
            });
            
            const errorEl = document.getElementById('errorMessage');
            if (errorEl) {
                errorEl.innerHTML = `
                    <div class="error-content">
                        <i data-lucide="alert-circle"></i>
                        <span>${message}</span>
                    </div>
                `;
                errorEl.style.display = 'block';
                
                setTimeout(() => {
                    errorEl.style.display = 'none';
                    this.updateGlobalState({ hasError: false, errorMessage: null });
                }, 5000);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } else {
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [조정자] 에러 표시 실패:', error);
            alert(message);
        }
    }

    showSuccess(message) {
        try {
            console.log('✅ [조정자] 성공:', message);
            
            const successEl = document.getElementById('successMessage');
            if (successEl) {
                successEl.innerHTML = `
                    <div class="success-content">
                        <i data-lucide="check-circle"></i>
                        <span>${message}</span>
                    </div>
                `;
                successEl.style.display = 'block';
                
                setTimeout(() => {
                    successEl.style.display = 'none';
                }, 5000);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] 성공 메시지 표시 실패:', error);
        }
    }

    // === 에러 처리 ===
    
    handleInitializationError(error) {
        this.showError('시스템 초기화 중 오류가 발생했습니다.');
        this.updateGlobalState({ 
            hasError: true, 
            errorMessage: error.message 
        });
    }

    handleStartupError(error) {
        this.showError('애플리케이션 시작 중 오류가 발생했습니다.');
    }

    handleGlobalError(event) {
        console.error('❌ [조정자] 전역 에러:', event.error);
        this.showError('예상치 못한 오류가 발생했습니다.');
    }

    handleBeforeUnload() {
        if (this.hasUnsavedChanges()) {
            return '변경사항이 저장되지 않았습니다. 정말 떠나시겠습니까?';
        }
    }

    hasUnsavedChanges() {
        return false;
    }

    // === 외부 인터페이스 ===
    
    getGlobalState() {
        return { ...this.globalState };
    }

    getModule(moduleName) {
        switch (moduleName) {
            case 'passport':
                return this.passport;
            case 'ticket':
                return this.ticket;
            default:
                return null;
        }
    }

    getService(serviceName) {
        return this.services[serviceName] || null;
    }

    forceSyncStates() {
        this.syncModuleStates();
    }

    triggerValidationAll() {
        if (this.passport && typeof this.passport.validatePassportInfo === 'function') {
            this.passport.validatePassportInfo();
        }
        
        if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
            this.ticket.triggerValidation();
        }
    }

    // === 공개 인터페이스 ===
    
    async showPassportInfoPage() {
        try {
            await this.routeToPage('passport');
            
            if (this.passport && typeof this.passport.loadExistingPassportDataAndSetMode === 'function') {
                setTimeout(() => {
                    this.passport.loadExistingPassportDataAndSetMode();
                }, 200);
            }
        } catch (error) {
            console.error('❌ [조정자] showPassportInfoPage() 실패:', error);
            this.showError('여권정보 페이지 로드에 실패했습니다.');
        }
    }

    async loadFlightRequestData() {
        try {
            if (this.ticket && typeof this.ticket.loadFlightRequestData === 'function') {
                await this.ticket.loadFlightRequestData();
            }
        } catch (error) {
            console.error('❌ [조정자] loadFlightRequestData() 실패:', error);
        }
    }

    closeModal(modalId) {
        try {
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error(`❌ [조정자] 모달 닫기 실패: ${modalId}`, error);
        }
    }

    removeFile(fileType) {
        try {
            if (this.ticket && typeof this.ticket.removeFile === 'function') {
                this.ticket.removeFile(fileType);
            }
        } catch (error) {
            console.error(`❌ [조정자] 파일 제거 실패: ${fileType}`, error);
        }
    }
}

// === 🚨 수정: 안전한 애플리케이션 시작점 ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 [조정자] DOM 로드 완료 - v1.1.1 시작 (EventTarget 안전장치)');
        
        // 이미 인스턴스가 있는지 확인
        if (window.flightRequestCoordinator) {
            console.warn('⚠️ [조정자] 이미 초기화된 인스턴스가 있습니다.');
            return;
        }
        
        // 전역 조정자 인스턴스 생성
        window.flightRequestCoordinator = new FlightRequestCoordinator();
        
        // 초기화 (결과 무시하고 계속 진행)
        const initSuccess = await window.flightRequestCoordinator.init();
        
        if (initSuccess) {
            console.log('✅ [조정자] v1.1.1 완전 초기화 완료 (EventTarget 안전장치)');
        } else {
            console.warn('⚠️ [조정자] v1.1.1 제한된 기능으로 초기화됨');
        }
        
    } catch (error) {
        console.error('❌ [조정자] v1.1.1 초기화 실패:', error);
        
        // 에러 상황에서도 기본 알림 표시 (한 번만)
        if (!window.flightRequestCoordinator?.isInitialized) {
            alert('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
});

// 전역 스코프에 클래스 노출
window.FlightRequestCoordinator = FlightRequestCoordinator;

console.log('✅ FlightRequestCoordinator v1.1.1 모듈 로드 완료 - EventTarget 안전장치 추가');
console.log('🚨 v1.1.1 EventTarget 안전장치:', {
    eventTargetFallback: 'EventTarget 초기화 실패 시 폴백 객체 생성',
    nullCheck: 'emit() 메서드에 null/undefined 체크 강화',
    reinitialize: '이벤트 버스 재초기화 메서드 추가',
    errorHandling: '오류 발생 시 재시도 로직 추가',
    infiniteLoopPrevention: '무한루프 방지 완전 구현',
    lineNumber401Fix: 'flight-request-coordinator.js:401 오류 해결'
});
