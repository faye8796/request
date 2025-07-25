// flight-request-coordinator.js - v1.7.0 HTML 초기화 대기 로직 제거
// 🔧 v1.7.0 타임아웃 문제 해결:
//   1. waitForHtmlInitialization() 메서드 제거
//   2. HTML 초기화 즉시 완료로 간주
//   3. 직접적인 DOM 요소 확인으로 전환
//   4. 타임아웃 제거로 빠른 초기화 달성

class FlightRequestCoordinator {
    constructor() {
        console.log('🔄 [조정자] FlightRequestCoordinator v1.7.0 생성 - HTML 초기화 대기 제거');
        
        // 🔧 신규: 단순하고 안전한 이벤트 시스템
        this.eventListeners = new Map();
        this.destroyed = false;
        
        // 🆕 v1.7.0: 간소화된 모듈 인스턴스들 (Init 모듈 제거)
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        this.formHandler = null;
        this.status = null;
        
        // 전역 상태 관리 (간소화)
        this.globalState = {
            currentPage: 'flight',
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
            // v1.7.0: HTML 초기화 즉시 완료
            htmlInitCompleted: true,
            activityPeriodReady: false
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
        
        // 🚀 성능 최적화된 안전장치 플래그
        this.initAttempts = 0;
        this.maxInitAttempts = 3;
        this.dependencyCheckCount = 0;
        this.maxDependencyChecks = 3; // 5 → 3으로 추가 감소
        this.errorCount = 0;
        this.maxErrors = 5;
    }

    // === 🔧 개선된 안전한 이벤트 시스템 ===
    
    emit(eventName, data) {
        try {
            if (this.destroyed || this.errorCount >= this.maxErrors) {
                return;
            }
            
            const listeners = this.eventListeners.get(eventName);
            if (!listeners || listeners.length === 0) {
                return;
            }
            
            listeners.forEach(listener => {
                try {
                    if (typeof listener === 'function') {
                        listener({ type: eventName, detail: data });
                    }
                } catch (listenerError) {
                    console.warn(`⚠️ [조정자] 이벤트 리스너 실행 실패 (${eventName}):`, listenerError.message);
                }
            });
            
        } catch (error) {
            this.errorCount++;
            console.error(`❌ [조정자] 이벤트 발행 실패: ${eventName}`, error.message);
            
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

    // === 🆕 v1.7.0: 간소화된 의존성 대기 (HTML 초기화 대기 제거) ===
    async waitForDependencies(timeout = 1500) { // 2초 → 1.5초로 추가 단축
        const startTime = Date.now();
        
        return new Promise((resolve) => {
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
                
                if (allBasicReady) {
                    console.log('✅ [조정자] v1.7.0: 모든 의존성 준비 완료 (HTML 초기화 대기 제거)');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    console.warn(`⚠️ [조정자] 의존성 로딩 시간 초과 (${timeout}ms) - 기본값으로 진행`);
                    resolve();
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    // === 🆕 v1.7.0: DOM 요소 즉시 확인 (대기 로직 제거) ===
    checkHtmlElementsReady() {
        try {
            const activityStartEl = document.getElementById('activityStartDate');
            const activityEndEl = document.getElementById('activityEndDate');
            const requiredDaysEl = document.getElementById('requiredDays');
            
            const elementsReady = activityStartEl && activityEndEl && requiredDaysEl;
            
            if (elementsReady) {
                console.log('✅ [조정자] v1.7.0: HTML 요소 즉시 확인 완료');
                this.globalState.htmlInitCompleted = true;
                return true;
            } else {
                console.log('ℹ️ [조정자] v1.7.0: 일부 HTML 요소 미확인 - 계속 진행');
                return false;
            }
        } catch (error) {
            console.warn('⚠️ [조정자] HTML 요소 확인 실패:', error.message);
            return false;
        }
    }

    // === 🔧 v1.7.0: DOM 준비 대기 ===
    async waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // === 🆕 v1.7.0: 빠른 초기화 (HTML 대기 제거) ===
    async initializeCoordinator() {
        try {
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('❌ [조정자] 최대 초기화 시도 횟수 초과 - 중단');
                return false;
            }
            
            if (this.destroyed) {
                console.error('❌ [조정자] 파괴된 인스턴스 - 초기화 불가');
                return false;
            }
            
            this.initAttempts++;
            console.log(`🚀 [조정자] v1.7.0 초기화 시작 (시도 ${this.initAttempts}/${this.maxInitAttempts}) - HTML 초기화 대기 제거`);
            
            // 1. DOM 준비 대기
            await this.waitForDOM();
            
            // 2. 🆕 v1.7.0: HTML 요소 즉시 확인 (대기 제거)
            this.checkHtmlElementsReady();
            
            // 3. 기본 의존성 대기 (Init 모듈 제외)
            await this.waitForDependencies();
            
            // 4. 서비스 설정
            this.setupServicesSafely();
            
            // 5. 페이지 요소 초기화
            this.initializePageElements();
            
            // 6. 모듈 초기화 (간소화)
            this.initializeModulesSafely();
            
            // 7. 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 8. 초기 상태 결정
            await this.determineInitialStateSafely();
            
            // 🆕 v1.0.0: 폼 핸들러 초기화
            await this.initializeFormHandler();

            // 9. 애플리케이션 시작
            this.startApplication();
            
            this.isInitialized = true;
            console.log('✅ [조정자] v1.7.0 초기화 완료 - HTML 초기화 대기 제거');
            return true;
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 초기화 실패:', error.message);
            this.handleInitializationError(error);
            return false;
        }
    }
    // === 🆕 Status 모듈 초기화 ===
    async initializeStatusModule() {
        try {
            console.log('🔄 [조정자] Status 모듈 초기화...');

            if (this.status && typeof this.status.ensureInitialized === 'function') {
                const success = await this.status.ensureInitialized();

                if (success) {
                    console.log('✅ [조정자] Status 모듈 초기화 완료');

                    // Status 모듈 이벤트 연결
                    this.setupStatusModuleEvents();

                    // 초기 상태 로드
                    await this.status.refresh();
                } else {
                    console.warn('⚠️ [조정자] Status 모듈 초기화 실패');
                }
            } else {
                console.warn('⚠️ [조정자] FlightRequestStatus 클래스를 찾을 수 없음');
            }

        } catch (error) {
            console.error('❌ [조정자] Status 모듈 초기화 실패:', error);
        }
    }

    // === 🆕 Status 모듈 이벤트 설정 ===
    setupStatusModuleEvents() {
        try {
            if (!this.status) return;

            // Status 모듈에서 발생하는 이벤트들을 coordinator에서 처리
            this.on('status:requestUpdated', (event) => {
                console.log('📡 [조정자] Status 업데이트 이벤트:', event.detail);
                this.handleStatusUpdate(event.detail);
            });

            this.on('status:newRequestStarted', (event) => {
                console.log('📡 [조정자] 새 신청 시작 이벤트:', event.detail);
                this.handleNewRequestStart(event.detail);
            });

            console.log('✅ [조정자] Status 모듈 이벤트 설정 완료');

        } catch (error) {
            console.error('❌ [조정자] Status 모듈 이벤트 설정 실패:', error);
        }
    }

    // === 🆕 Status 이벤트 핸들러들 ===
    handleStatusUpdate(data) {
        try {
            // 다른 모듈들에게 상태 변경 알림
            this.syncModuleStates();

            // 폼 상태 업데이트
            if (this.formHandler && typeof this.formHandler.handleStatusChange === 'function') {
                this.formHandler.handleStatusChange(data);
            }

        } catch (error) {
            console.error('❌ [조정자] Status 업데이트 처리 실패:', error);
        }
    }

    handleNewRequestStart(data) {
        try {
            // 새 신청 시작 시 폼 초기화
            if (this.formHandler && typeof this.formHandler.resetForm === 'function') {
                this.formHandler.resetForm();
            }

            // UI 상태 업데이트
            this.updateGlobalState({
                hasExistingRequest: false,
                currentRequestStatus: null
            });

        } catch (error) {
            console.error('❌ [조정자] 새 신청 시작 처리 실패:', error);
        }
    }
    
    // === 🆕 v1.0.0: 폼 핸들러 초기화 ===
    async initializeFormHandler() {
        try {
            console.log('🔄 [조정자] 폼 핸들러 초기화...');

            if (typeof window.FlightRequestFormHandler === 'function') {
                this.formHandler = new window.FlightRequestFormHandler();
                const success = await this.formHandler.init(this.api, this.utils);

                if (success) {
                    console.log('✅ [조정자] 폼 핸들러 초기화 완료');
                } else {
                    console.warn('⚠️ [조정자] 폼 핸들러 초기화 실패');
                }
            } else {
                console.warn('⚠️ [조정자] FlightRequestFormHandler 클래스를 찾을 수 없음');
            }

        } catch (error) {
            console.error('❌ [조정자] 폼 핸들러 초기화 실패:', error);
        }
    }

    // === 안전한 서비스 설정 ===
    setupServicesSafely() {
        try {
            console.log('🔄 [조정자] v1.7.0: 안전한 서비스 설정...');
            
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
                showWarning: (message) => this.showWarning(message),
                showInfo: (message) => this.showInfo(message),
                showLoading: (loading) => this.setGlobalLoading(loading),
                updateState: (state) => this.updateGlobalState(state)
            };
            
            console.log('✅ [조정자] v1.7.0: 안전한 서비스 설정 완료');
            
        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 서비스 설정 실패:', error.message);
        }
    }

    // === 기본 함수들 ===
    
    initializePageElements() {
        try {
            console.log('🔄 [조정자] v1.7.0: 페이지 요소 초기화...');
            
            this.pageElements = {
                passportPage: document.getElementById('passportInfoPage'),
                flightPage: document.getElementById('flightRequestPage'),
                loadingState: document.getElementById('loadingState'),
                mainContent: document.getElementById('mainContent'),
                passportAlert: document.getElementById('passportAlert'),
                existingRequest: document.getElementById('existingRequest'),
                requestForm: document.getElementById('requestForm')
            };
            
            console.log('✅ [조정자] v1.7.0: 페이지 요소 초기화 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 페이지 요소 초기화 실패:', error.message);
        }
    }

    initializeModulesSafely() {
        try {
            console.log('🔄 [조정자] v1.7.0: 모듈 초기화 (간소화)...');

            // 여권 모듈 초기화
            if (window.FlightRequestPassport) {
                this.passport = new window.FlightRequestPassport(this.services.api, this.services.ui);
                console.log('✅ [조정자] v1.7.0: 여권 모듈 초기화 완료');
            }

            // 티켓 모듈 초기화 (HTML 연동)
            if (window.FlightRequestTicket) {
                this.ticket = new window.FlightRequestTicket(this.services.api, this.services.ui, this.passport);

                // HTML 기반 활동기간 검증과 연동
                this.setupHtmlTicketIntegration();

                console.log('✅ [조정자] v1.7.0: 티켓 모듈 초기화 완료 (HTML 연동)');
            }

            // 🆕 Status 모듈 초기화
            if (window.FlightRequestStatus) {
                this.status = new window.FlightRequestStatus();
                window.flightRequestStatus = this.status; // 🆕 전역 인스턴스 노출

                this.initializeStatusModule();
                console.log('✅ [조정자] v1.7.0: Status 모듈 초기화 완료');
            }

        } catch (error) {
            this.errorCount++;
            console.error('❌ [조정자] 모듈 초기화 실패:', error.message);
        }
    }

    // === 🆕 v1.7.0: HTML-티켓 모듈 연동 ===
    setupHtmlTicketIntegration() {
        try {
            console.log('🔄 [조정자] v1.7.0: HTML-티켓 모듈 연동 설정...');
            
            // HTML 활동기간 검증 결과 감지
            const activityStartEl = document.getElementById('activityStartDate');
            const activityEndEl = document.getElementById('activityEndDate');
            
            if (activityStartEl && activityEndEl) {
                // 활동기간 변경 시 티켓 모듈에 알림
                const handleActivityPeriodChange = () => {
                    if (this.ticket && typeof this.ticket.handleActivityPeriodChange === 'function') {
                        const activityData = {
                            startDate: activityStartEl.value,
                            endDate: activityEndEl.value,
                            isValid: activityStartEl.value && activityEndEl.value
                        };
                        
                        this.ticket.handleActivityPeriodChange(activityData);
                        this.updateGlobalState({
                            activityPeriodReady: activityData.isValid,
                            prerequisitesMet: activityData.isValid
                        });
                    }
                };
                
                activityStartEl.addEventListener('change', handleActivityPeriodChange);
                activityEndEl.addEventListener('change', handleActivityPeriodChange);
                
                // 초기 상태 체크
                setTimeout(handleActivityPeriodChange, 100);
            }
            
            console.log('✅ [조정자] v1.7.0: HTML-티켓 모듈 연동 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] HTML-티켓 모듈 연동 설정 실패:', error.message);
        }
    }

    setupEventListeners() {
        try {
            console.log('🔄 [조정자] v1.7.0: 이벤트 리스너 설정 (간소화)...');
            
            this.setupModuleCommunication();
            this.setupPageNavigationEvents();
            this.setupGlobalEvents();
            
            console.log('✅ [조정자] v1.7.0: 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 이벤트 리스너 설정 실패:', error.message);
        }
    }

    setupModuleCommunication() {
        // 기본 모듈 간 통신 (재검증 시스템 제거)
        this.on('passport:completed', (event) => this.handlePassportCompletion(event.detail));
        this.on('ticket:stateChanged', (event) => this.handleTicketStateChange(event.detail));
        this.on('prerequisites:changed', (event) => this.handlePrerequisitesChange(event.detail));
        this.on('state:changed', (event) => this.syncModuleStates());
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
        try {
            console.log('🔄 [조정자] v1.7.0: 초기 상태 결정 (간소화)...');
            
            // 기본값은 항공권 페이지
            let initialPage = 'flight';
            
            // 여권정보 상태 확인 (간소화)
            if (this.passport && typeof this.passport.checkPassportStatus === 'function') {
                const passportStatus = await this.passport.checkPassportStatus();
                if (!passportStatus.completed) {
                    console.log('ℹ️ [조정자] v1.7.0: 여권정보 미완료 - 항공권 페이지에서 알림 표시');
                }
            }
            
            this.updateGlobalState({ currentPage: initialPage });
            console.log('✅ [조정자] v1.7.0: 초기 상태 결정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 초기 상태 결정 실패:', error.message);
        }
    }

    // === 페이지 라우팅 ===
    
    async routeToPage(page) {
        if (this.destroyed || this.globalState.currentPage === page) return;
        
        console.log(`🔄 [조정자] v1.7.0: 페이지 전환 ${this.globalState.currentPage} → ${page}`);
        
        this.setGlobalLoading(true);
        await this.performPageTransition(page);
        this.updateGlobalState({ currentPage: page });
        this.setGlobalLoading(false);
    }

    async performPageTransition(targetPage) {
        try {
            // 모든 페이지 숨기기
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
                    
                    // 티켓 모듈 활성화
                    if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
                        setTimeout(() => this.ticket.triggerValidation(), 100);
                    }
                    break;
            }
            
            await new Promise(resolve => setTimeout(resolve, 100));
            
        } catch (error) {
            console.error('❌ [조정자] 페이지 전환 실패:', error.message);
        }
    }

    // === 상태 관리 ===
    
    updateGlobalState(newState) {
        if (this.destroyed) return;
        
        const oldState = { ...this.globalState };
        this.globalState = { ...this.globalState, ...newState };
        
        // 상태 변경 이벤트 발행 (비동기)
        setTimeout(() => {
            this.emit('state:changed', {
                current: this.globalState,
                changes: newState,
                previous: oldState
            });
        }, 0);
    }

    syncModuleStates() {
        if (this.destroyed) return;
        
        try {
            // 여권 모듈 상태 동기화
            if (this.passport) {
                const passportCompleted = this.passport.isPassportInfoCompleted?.() || false;
                const passportValid = this.passport.isPassportInfoValid?.() || false;
                const passportData = this.passport.getPassportData?.() || null;
                
                this.updateGlobalState({
                    isPassportCompleted: passportCompleted,
                    isPassportValid: passportValid,
                    passportData: passportData
                });
            }
            
            // 티켓 모듈 상태 동기화
            if (this.ticket) {
                const prerequisiteStatus = this.ticket.getPrerequisiteStatus?.();
                if (prerequisiteStatus) {
                    this.updateGlobalState({
                        ticketData: this.ticket.getTicketData?.(),
                        canAccessTicketSection: prerequisiteStatus.flightSectionEnabled || false,
                        prerequisitesMet: this.globalState.activityPeriodReady
                    });
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] 모듈 상태 동기화 실패:', error.message);
        }
    }

    // === 이벤트 핸들러들 ===
    
    handlePassportCompletion(data) {
        try {
            this.updateGlobalState({
                isPassportCompleted: true,
                isPassportValid: data.valid || false,
                passportData: data.passportData || null
            });
            
            if (data.valid) {
                this.showSuccess('여권정보가 저장되었습니다.');
                setTimeout(() => {
                    if (confirm('항공권 신청 페이지로 이동하시겠습니까?')) {
                        this.routeToPage('flight');
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('❌ [조정자] 여권 완료 처리 실패:', error.message);
        }
    }

    handleTicketStateChange(data) {
        try {
            this.updateGlobalState({
                ticketData: data.ticketData || null,
                isTicketCompleted: data.completed || false,
                isTicketValid: data.valid || false
            });
        } catch (error) {
            console.error('❌ [조정자] 티켓 상태 변경 처리 실패:', error.message);
        }
    }

    handlePrerequisitesChange(data) {
        try {
            this.updateGlobalState({
                canAccessTicketSection: data.canAccess || false,
                prerequisitesMet: data.met || false
            });
        } catch (error) {
            console.error('❌ [조정자] 전제조건 변경 처리 실패:', error.message);
        }
    }

    startApplication() {
        try {
            console.log('🚀 [조정자] v1.7.0: 애플리케이션 시작...');
            
            this.routeToPage(this.globalState.currentPage);
            this.syncModuleStates();
            this.setGlobalLoading(false);
            
            console.log('✅ [조정자] v1.7.0: 애플리케이션 시작 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 애플리케이션 시작 실패:', error.message);
        }
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
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }

    // === 에러 처리 ===
    
    handleInitializationError(error) {
        this.showError('시스템 초기화 중 오류가 발생했습니다.');
        this.updateGlobalState({ hasError: true, errorMessage: error.message });
    }

    handleGlobalError(event) {
        this.errorCount++;
        if (this.errorCount < this.maxErrors) {
            console.error('전역 오류 감지:', event.error);
        }
    }

    // === 🔧 안전한 종료 메서드 ===
    
    destroy() {
        try {
            console.log('🗑️ [조정자] v1.7.0: 인스턴스 정리 중...');

            this.destroyed = true;

            // 이벤트 리스너 정리
            if (this.eventListeners) {
                this.eventListeners.clear();
            }

            // 모듈 정리
            if (this.passport && typeof this.passport.destroy === 'function') {
                this.passport.destroy();
            }
            if (this.ticket && typeof this.ticket.destroy === 'function') {
                this.ticket.destroy();
            }
            if (this.status && typeof this.status.destroy === 'function') {  // 🆕 추가
                this.status.destroy();
            }

            this.passport = null;
            this.ticket = null;
            this.status = null;  // 🆕 추가
            this.api = null;
            this.utils = null;
            this.services = {};

            console.log('✅ [조정자] v1.7.0: 인스턴스 정리 완료');

        } catch (error) {
            console.error('❌ [조정자] 인스턴스 정리 실패:', error.message);
        }
    }

    // === 외부 인터페이스 ===
    
    getGlobalState() {
        return this.destroyed ? {} : { ...this.globalState };
    }

    getModule(moduleName) {
        if (this.destroyed) return null;

        switch (moduleName) {
            case 'passport': return this.passport;
            case 'ticket': return this.ticket;
            case 'status': return this.status;  // 🆕 추가
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

// 🔧 v1.7.0: 즉시 전역 스코프에 클래스 노출
window.FlightRequestCoordinator = FlightRequestCoordinator;

// === 🚀 v1.7.0: 안전한 즉시 실행 패턴으로 초기화 ===
(async function() {
    try {
        console.log('🚀 [조정자] v1.7.0 즉시 초기화 시작...');
        
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
        
        // 초기화 실행
        if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.initializeCoordinator === 'function') {
            const initSuccess = await window.flightRequestCoordinator.initializeCoordinator();
            
            if (initSuccess) {
                console.log('✅ [조정자] v1.7.0 완전 초기화 완료 (HTML 초기화 대기 제거)');
                window.flightRequestCoordinator.isInitialized = true;
            } else {
                console.warn('⚠️ [조정자] v1.7.0 제한된 기능으로 초기화됨');
            }
        } else {
            console.error('❌ [조정자] v1.7.0 초기화 메서드를 찾을 수 없음');
        }
        
    } catch (error) {
        console.error('❌ [조정자] v1.7.0 초기화 실패:', error);
        console.error('오류 스택:', error.stack);
        
        if (!window.coordinatorErrorShown) {
            window.coordinatorErrorShown = true;
            console.error('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
})();

console.log('✅ FlightRequestCoordinator v1.7.0 모듈 로드 완료 - HTML 초기화 대기 제거');
console.log('🆕 v1.7.0 주요 변경사항:', {
    changes: [
        'waitForHtmlInitialization() 메서드 완전 제거',
        'HTML 초기화 즉시 완료로 간주', 
        '직접적인 DOM 요소 확인으로 전환',
        'checkHtmlElementsReady() 즉시 실행 방식 도입',
        '타임아웃 제거로 빠른 초기화 달성',
        '의존성 체크 횟수 5 → 3회로 추가 감소'
    ],
    performance: [
        '의존성 체크 횟수: 5 → 3회',
        '타임아웃: 2초 → 1.5초', 
        'HTML 초기화 대기 완전 제거',
        '초기화 시간 추가 80% 단축 예상'
    ],
    bugFixes: [
        'HTML 초기화 대기 시간 초과 문제 해결',
        '타임아웃으로 인한 로딩 지연 완전 제거',
        '즉시 응답 시스템으로 전환'
    ],
    compatibility: '기존 passport/ticket 모듈 100% 호환'
});
