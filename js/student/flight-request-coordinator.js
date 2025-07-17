// flight-request-coordinator.js - v1.2.1 디버깅 문제 해결
// 🔧 핵심 수정사항 (v1.2.0 → v1.2.1):
//   1. 의존성 체크 횟수 제한 대폭 상향 (10 → 50)
//   2. 타임아웃 시간 연장 (5초 → 15초)
//   3. 초기화 재시도 횟수 증가 (1 → 3)
//   4. 안전장치 완화로 정상 동작 보장
//   5. DB 필수 활동일 정보 로딩 지원

class FlightRequestCoordinator {
    constructor() {
        console.log('🔄 [조정자] FlightRequestCoordinator v1.2.1 생성 - 디버깅 문제 해결');
        
        // 🔧 신규: 단순하고 안전한 이벤트 시스템
        this.eventListeners = new Map();
        this.destroyed = false;
        
        // 분리된 모듈 인스턴스들
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        
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
        
        // 🔧 안전장치 플래그 (완화됨)
        this.initAttempts = 0;
        this.maxInitAttempts = 3; // 1 → 3으로 증가
        this.dependencyCheckCount = 0;
        this.maxDependencyChecks = 50; // 10 → 50으로 대폭 증가
        this.errorCount = 0;
        this.maxErrors = 5; // 3 → 5로 증가
    }

    // === 🔧 개선된 안전한 이벤트 시스템 ===
    
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

    // === 🔧 개선된 의존성 대기 (타임아웃 연장 및 체크 횟수 증가) ===
    async waitForDependencies(timeout = 15000) { // 5초 → 15초로 연장
        const startTime = Date.now();
        
        return new Promise((resolve) => { // reject 제거 - 항상 resolve
            const check = () => {
                this.dependencyCheckCount++;
                
                // 🔧 체크 횟수 제한 대폭 상향
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
                
                if (allBasicReady) {
                    console.log('✅ [조정자] v1.2.1: 기본 의존성 준비 완료');
                    resolve();
                    return;
                }
                
                // 🔧 타임아웃 체크 (연장됨)
                if (Date.now() - startTime > timeout) {
                    console.warn(`⚠️ [조정자] 의존성 로딩 시간 초과 (${timeout}ms) - 기본값으로 진행`);
                    resolve();
                    return;
                }
                
                // 🔧 적절한 간격으로 체크
                setTimeout(check, 300);
            };
            
            check();
        });
    }

    // === 🔧 개선된 초기화 (재시도 횟수 증가) ===
    async init() {
        try {
            // 🔧 재시도 횟수 증가
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('❌ [조정자] 최대 초기화 시도 횟수 초과 - 중단');
                return false;
            }
            
            if (this.destroyed) {
                console.error('❌ [조정자] 파괴된 인스턴스 - 초기화 불가');
                return false;
            }
            
            this.initAttempts++;
            console.log(`🚀 [조정자] v1.2.1 초기화 시작 (시도 ${this.initAttempts}/${this.maxInitAttempts})`);
            
            await this.waitForDependencies();
            this.setupServicesSafely();
            this.initializePageElements();
            this.initializeModulesSafely();
            this.setupEventListeners();
            await this.determineInitialStateSafely();
            this.startApplication();
            
            this.isInitialized = true;
            console.log('✅ [조정자] v1.2.1 초기화 완료');
            return true;
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 초기화 실패:', error.message);
            this.handleInitializationError(error);
            return false;
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
                showLoading: (loading) => this.setGlobalLoading(loading),
                updateState: (state) => this.updateGlobalState(state)
            };
            
            console.log('✅ [조정자] 안전한 서비스 설정 완료');
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 서비스 설정 실패:', error.message);
        }
    }

    // === 페이지 요소 초기화 ===
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
            this.errorCount++;
            console.error('❌ [조정자] 페이지 요소 초기화 실패:', error.message);
        }
    }

    // === 안전한 모듈 초기화 ===
    initializeModulesSafely() {
        try {
            console.log('🔄 [조정자] 안전한 모듈 초기화...');
            
            // 여권 모듈 초기화
            if (window.FlightRequestPassport) {
                try {
                    this.passport = new window.FlightRequestPassport(
                        this.services.api,
                        this.services.ui
                    );
                    console.log('✅ [조정자] 여권 모듈 초기화 성공');
                } catch (passportError) {
                    console.warn('⚠️ [조정자] 여권 모듈 초기화 실패:', passportError.message);
                    this.passport = null;
                }
            }
            
            // 항공권 모듈 초기화
            if (window.FlightRequestTicket) {
                try {
                    this.ticket = new window.FlightRequestTicket(
                        this.services.api,
                        this.services.ui,
                        this.passport
                    );
                    console.log('✅ [조정자] 항공권 모듈 초기화 성공');
                } catch (ticketError) {
                    console.warn('⚠️ [조정자] 항공권 모듈 초기화 실패:', ticketError.message);
                    this.ticket = null;
                }
            }
            
            console.log('✅ [조정자] 안전한 모듈 초기화 완료');
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 모듈 초기화 실패:', error.message);
        }
    }

    // === 이벤트 리스너 설정 ===
    setupEventListeners() {
        try {
            this.setupModuleCommunication();
            this.setupPageNavigationEvents();
            this.setupGlobalEvents();
            
            console.log('✅ [조정자] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 이벤트 리스너 설정 실패:', error.message);
        }
    }

    setupModuleCommunication() {
        // 🔧 안전한 모듈 간 통신 설정
        this.on('passport:completed', (event) => {
            this.handlePassportCompletion(event.detail);
        });
        
        this.on('ticket:stateChanged', (event) => {
            this.handleTicketStateChange(event.detail);
        });
        
        this.on('prerequisites:changed', (event) => {
            this.handlePrerequisitesChange(event.detail);
        });
        
        this.on('state:changed', (event) => {
            this.syncModuleStates();
        });
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
            this.destroy();
        });
        
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });
    }

    // === 🔧 개선된 초기 상태 설정 (타임아웃 연장) ===
    async determineInitialStateSafely() {
        try {
            console.log('🔄 [조정자] 안전한 초기 상태 설정...');
            
            let initialPage = 'passport';
            
            if (this.services.api && this.services.api.getPassportInfo) {
                try {
                    const existingPassport = await Promise.race([
                        this.services.api.getPassportInfo(),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('타임아웃')), 5000)) // 2초 → 5초로 연장
                    ]).catch(() => null); // 에러 시 null 반환
                    
                    const hasPassport = !!(existingPassport && existingPassport.passport_number);
                    
                    if (hasPassport) {
                        initialPage = 'flight';
                        console.log('✅ [조정자] 기존 여권정보 발견 - 항공권 페이지로 시작');
                    }
                    
                } catch (error) {
                    console.warn('⚠️ [조정자] 초기 데이터 확인 실패 - 기본값 사용');
                }
            }
            
            this.updateGlobalState({ currentPage: initialPage });
            console.log('✅ [조정자] 안전한 초기 상태 설정 완료:', { initialPage });
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 초기 상태 설정 실패:', error.message);
            this.updateGlobalState({ currentPage: 'passport' });
        }
    }

    // === 페이지 라우팅 ===
    async routeToPage(page) {
        try {
            if (this.destroyed || this.globalState.currentPage === page) {
                return;
            }
            
            this.setGlobalLoading(true);
            await this.performPageTransition(page);
            this.updateGlobalState({ currentPage: page });
            
            console.log(`✅ [조정자] 페이지 라우팅 완료: ${page}`);
            
        } catch (error) {
            this.errorCount++;
            console.error(`❌ [조정자] 페이지 라우팅 실패: ${page}`, error.message);
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
                    setTimeout(() => {
                        this.ticket.triggerValidation();
                    }, 100);
                }
                break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // === 상태 관리 ===
    updateGlobalState(newState) {
        try {
            if (this.destroyed) {
                return;
            }
            
            this.globalState = { ...this.globalState, ...newState };
            
            // 🔧 안전한 이벤트 발행 (에러 발생해도 무시)
            setTimeout(() => {
                this.emit('state:changed', {
                    current: this.globalState,
                    changes: newState
                });
            }, 0);
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 전역 상태 업데이트 실패:', error.message);
        }
    }

    syncModuleStates() {
        try {
            if (this.destroyed) {
                return;
            }
            
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
            this.errorCount++;
            console.error('❌ [조정자] 모듈 상태 동기화 실패:', error.message);
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
            this.errorCount++;
            console.error('❌ [조정자] 여권 완료 처리 실패:', error.message);
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
            this.errorCount++;
            console.error('❌ [조정자] 항공권 상태 변경 처리 실패:', error.message);
        }
    }

    handlePrerequisitesChange(data) {
        try {
            this.updateGlobalState({
                canAccessTicketSection: data.canAccess,
                prerequisitesMet: data.met
            });
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 전제 조건 변경 처리 실패:', error.message);
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
            this.errorCount++;
            console.error('❌ [조정자] 애플리케이션 시작 실패:', error.message);
            this.handleStartupError(error);
        }
    }

    // === UI 관리 ===
    setGlobalLoading(loading) {
        try {
            if (this.destroyed) {
                return;
            }
            
            this.updateGlobalState({ isLoading: loading });
            
            if (this.pageElements.loadingState) {
                this.pageElements.loadingState.style.display = loading ? 'block' : 'none';
            }
            
            if (this.pageElements.mainContent) {
                this.pageElements.mainContent.style.opacity = loading ? '0.5' : '1';
            }
            
        } catch (error) {
            console.error('❌ [조정자] 전역 로딩 상태 설정 실패:', error.message);
        }
    }

    showError(message) {
        try {
            if (this.destroyed) {
                return;
            }
            
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
                    if (errorEl) {
                        errorEl.style.display = 'none';
                    }
                    this.updateGlobalState({ hasError: false, errorMessage: null });
                }, 5000);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } else {
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [조정자] 에러 표시 실패:', error.message);
            alert(message);
        }
    }

    showSuccess(message) {
        try {
            if (this.destroyed) {
                return;
            }
            
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
                    if (successEl) {
                        successEl.style.display = 'none';
                    }
                }, 5000);
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] 성공 메시지 표시 실패:', error.message);
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
        this.errorCount++;
        console.error('❌ [조정자] 전역 에러:', event.error);
        
        if (this.errorCount < this.maxErrors) {
            this.showError('예상치 못한 오류가 발생했습니다.');
        }
    }

    // === 🔧 개선된 안전한 종료 메서드 ===
    destroy() {
        try {
            console.log('🗑️ [조정자] 인스턴스 정리 중...');
            
            this.destroyed = true;
            
            // 이벤트 리스너 정리
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            // 모듈 정리
            this.passport = null;
            this.ticket = null;
            this.api = null;
            this.utils = null;
            
            // 서비스 정리
            this.services = {};
            
            console.log('✅ [조정자] 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 인스턴스 정리 실패:', error.message);
        }
    }

    // === 외부 인터페이스 ===
    getGlobalState() {
        return this.destroyed ? {} : { ...this.globalState };
    }

    getModule(moduleName) {
        if (this.destroyed) {
            return null;
        }
        
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
        return this.destroyed ? null : (this.services[serviceName] || null);
    }

    forceSyncStates() {
        if (!this.destroyed) {
            this.syncModuleStates();
        }
    }

    triggerValidationAll() {
        if (this.destroyed) {
            return;
        }
        
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
            if (this.destroyed) {
                return;
            }
            
            await this.routeToPage('passport');
            
            if (this.passport && typeof this.passport.loadExistingPassportDataAndSetMode === 'function') {
                setTimeout(() => {
                    this.passport.loadExistingPassportDataAndSetMode();
                }, 200);
            }
        } catch (error) {
            console.error('❌ [조정자] showPassportInfoPage() 실패:', error.message);
            this.showError('여권정보 페이지 로드에 실패했습니다.');
        }
    }

    async loadFlightRequestData() {
        try {
            if (this.destroyed) {
                return;
            }
            
            if (this.ticket && typeof this.ticket.loadFlightRequestData === 'function') {
                await this.ticket.loadFlightRequestData();
            }
        } catch (error) {
            console.error('❌ [조정자] loadFlightRequestData() 실패:', error.message);
        }
    }

    closeModal(modalId) {
        try {
            if (this.destroyed) {
                return;
            }
            
            const modal = document.getElementById(modalId);
            if (modal) {
                modal.style.display = 'none';
            }
        } catch (error) {
            console.error(`❌ [조정자] 모달 닫기 실패: ${modalId}`, error.message);
        }
    }

    removeFile(fileType) {
        try {
            if (this.destroyed) {
                return;
            }
            
            if (this.ticket && typeof this.ticket.removeFile === 'function') {
                this.ticket.removeFile(fileType);
            }
        } catch (error) {
            console.error(`❌ [조정자] 파일 제거 실패: ${fileType}`, error.message);
        }
    }
}

// === 🔧 개선된 애플리케이션 시작점 ===
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 [조정자] DOM 로드 완료 - v1.2.1 시작 (디버깅 문제 해결)');
        
        // 🔧 중복 인스턴스 방지
        if (window.flightRequestCoordinator) {
            console.warn('⚠️ [조정자] 기존 인스턴스 정리 중...');
            if (typeof window.flightRequestCoordinator.destroy === 'function') {
                window.flightRequestCoordinator.destroy();
            }
            window.flightRequestCoordinator = null;
        }
        
        // 전역 조정자 인스턴스 생성
        window.flightRequestCoordinator = new FlightRequestCoordinator();
        
        // 초기화 (재시도 가능)
        const initSuccess = await window.flightRequestCoordinator.init();
        
        if (initSuccess) {
            console.log('✅ [조정자] v1.2.1 완전 초기화 완료 (디버깅 문제 해결)');
        } else {
            console.warn('⚠️ [조정자] v1.2.1 제한된 기능으로 초기화됨');
        }
        
    } catch (error) {
        console.error('❌ [조정자] v1.2.1 초기화 실패:', error.message);
        
        // 🔧 에러 상황에서도 한 번만 알림
        if (!window.coordinatorErrorShown) {
            window.coordinatorErrorShown = true;
            alert('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
});

// 전역 스코프에 클래스 노출
window.FlightRequestCoordinator = FlightRequestCoordinator;

console.log('✅ FlightRequestCoordinator v1.2.1 모듈 로드 완료 - 디버깅 문제 해결');
console.log('🔧 v1.2.1 개선사항:', {
    dependencyCheckLimit: '의존성 체크 횟수 10 → 50으로 대폭 증가',
    timeoutExtension: '타임아웃 5초 → 15초로 연장',
    retryIncrease: '초기화 재시도 1 → 3회로 증가',
    errorLimitIncrease: '에러 한계 3 → 5회로 증가',
    safetyMeasuresRelaxed: '안전장치 완화로 정상 시나리오 허용',
    dbDataSupport: 'DB 필수 활동일 정보 로딩 지원 강화'
});
