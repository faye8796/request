// flight-request-coordinator.js - 통합 조정자 모듈 v1.0.1
// 🚀 Phase 3: 분리된 passport와 ticket 모듈들을 통합 관리하고 전체 플로우를 조정
// 📝 핵심 역할:
//   - 모듈 간 통신 중재 및 상태 동기화
//   - 전체 페이지 라우팅 및 단계별 네비게이션
//   - 이벤트 버스 시스템을 통한 느슨한 결합 구현
//   - 전역 상태 관리 및 데이터 통합
//   - 최종 제출 플로우 통합 관리
//   - 애플리케이션 라이프사이클 관리
// 🔧 v1.0.1 수정사항:
//   - 초기화 오류 및 무한 루프 방지 코드 추가
//   - API 존재 여부 검증 강화
//   - 중복 인스턴스 생성 방지

class FlightRequestCoordinator {
    constructor() {
        // 분리된 모듈 인스턴스들
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        
        // 이벤트 버스 시스템
        this.eventBus = new EventTarget();
        
        // 전역 상태 관리
        this.globalState = {
            // 현재 페이지/단계
            currentPage: 'passport', // 'passport' | 'flight'
            currentStep: 1,
            
            // 모듈 상태
            isPassportCompleted: false,
            isPassportValid: false,
            isTicketCompleted: false,
            isTicketValid: false,
            
            // 데이터 상태
            passportData: null,
            ticketData: null,
            
            // UI 상태
            isLoading: false,
            hasError: false,
            errorMessage: null,
            
            // 전제 조건 상태
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
        
        // 초기화 시도 횟수 (무한 루프 방지)
        this.initAttempts = 0;
        this.maxInitAttempts = 3;
        
        console.log('🔄 [조정자] FlightRequestCoordinator v1.0.1 생성됨');
    }

    // === 애플리케이션 초기화 ===

    async init() {
        try {
            // 무한 루프 방지
            if (this.initAttempts >= this.maxInitAttempts) {
                console.error('❌ [조정자] 최대 초기화 시도 횟수 초과');
                this.showError('페이지 로딩에 실패했습니다. 새로고침해주세요.');
                return;
            }
            
            this.initAttempts++;
            
            console.log(`🚀 [조정자] FlightRequestCoordinator v1.0.1 초기화 시작... (시도 ${this.initAttempts}/${this.maxInitAttempts})`);
            
            // 1. 의존성 대기
            await this.waitForDependencies();
            
            // 2. 서비스 설정
            this.setupServices();
            
            // 3. 페이지 요소 초기화
            this.initializePageElements();
            
            // 4. 모듈 초기화
            await this.initializeModules();
            
            // 5. 이벤트 시스템 설정
            this.setupEventListeners();
            
            // 6. 초기 상태 설정
            await this.determineInitialState();
            
            // 7. 애플리케이션 시작
            this.startApplication();
            
            this.isInitialized = true;
            this.initAttempts = 0; // 성공 시 리셋
            console.log('✅ [조정자] FlightRequestCoordinator v1.0.1 초기화 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 초기화 실패:', error);
            this.handleInitializationError(error);
            // throw 제거 - 오류를 다시 던지지 않음 (무한 루프 방지)
        }
    }

    async waitForDependencies(timeout = 15000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                const apiExists = !!window.flightRequestAPI;
                const apiInitialized = window.flightRequestAPI?.isInitialized;
                // 🔧 HOTFIX: window.utilsReady 플래그 확인 (utils v8.2.8과 일치)
                const utilsReady = window.utilsReady === true;
                const passportClassReady = !!window.FlightRequestPassport;
                const ticketClassReady = !!window.FlightRequestTicket;
                
                // API 메서드 존재 여부도 확인
                const apiMethodsReady = !!(
                    window.flightRequestAPI?.loadPassportInfo &&
                    window.flightRequestAPI?.loadExistingFlightRequest
                );
                
                console.log('🔍 [조정자] 의존성 상태:', {
                    apiExists,
                    apiInitialized,
                    apiMethodsReady,
                    utilsReady,
                    passportClassReady,
                    ticketClassReady,
                    elapsed: Date.now() - startTime
                });
                
                if (apiExists && apiInitialized && apiMethodsReady && utilsReady && 
                    passportClassReady && ticketClassReady) {
                    console.log('✅ [조정자] 모든 의존성 준비 완료');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error(`의존성 로딩 시간 초과 (${timeout}ms)`));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    setupServices() {
        try {
            console.log('🔄 [조정자] 서비스 설정 시작...');
            
            // API 서비스 설정
            this.api = window.flightRequestAPI;
            this.services.api = this.api;
            
            // Utils 서비스 설정
            this.utils = window.FlightRequestUtils || window.flightRequestUtils;
            this.services.utils = this.utils;
            
            // UI 서비스 설정 (자체 UI 관리 메서드들)
            this.services.ui = {
                showError: (message) => this.showError(message),
                showSuccess: (message) => this.showSuccess(message),
                showLoading: (loading) => this.setGlobalLoading(loading),
                updateState: (state) => this.updateGlobalState(state)
            };
            
            console.log('✅ [조정자] 서비스 설정 완료:', {
                api: !!this.services.api,
                utils: !!this.services.utils,
                ui: !!this.services.ui
            });
            
        } catch (error) {
            console.error('❌ [조정자] 서비스 설정 실패:', error);
            throw error;
        }
    }

    initializePageElements() {
        try {
            console.log('🔄 [조정자] 페이지 요소 초기화...');
            
            this.pageElements = {
                passportPage: document.getElementById('passportInfoPage'),
                flightPage: document.getElementById('flightRequestPage'),
                loadingState: document.getElementById('loadingState'),
                mainContent: document.getElementById('mainContent'),
                
                // 네비게이션 요소들
                passportAlert: document.getElementById('passportAlert'),
                existingRequest: document.getElementById('existingRequest'),
                requestForm: document.getElementById('requestForm')
            };
            
            console.log('✅ [조정자] 페이지 요소 초기화 완료:', {
                passportPage: !!this.pageElements.passportPage,
                flightPage: !!this.pageElements.flightPage,
                loadingState: !!this.pageElements.loadingState,
                mainContent: !!this.pageElements.mainContent
            });
            
        } catch (error) {
            console.error('❌ [조정자] 페이지 요소 초기화 실패:', error);
        }
    }

    async initializeModules() {
        try {
            console.log('🔄 [조정자] 모듈 초기화 시작...');
            
            // 여권정보 모듈 초기화
            this.passport = new window.FlightRequestPassport(
                this.services.api,
                this.services.ui
            );
            
            // 항공권 신청 모듈 초기화
            this.ticket = new window.FlightRequestTicket(
                this.services.api,
                this.services.ui,
                this.passport // passport 서비스를 ticket에 전달
            );
            
            console.log('✅ [조정자] 모듈 초기화 완료:', {
                passport: !!this.passport,
                ticket: !!this.ticket
            });
            
        } catch (error) {
            console.error('❌ [조정자] 모듈 초기화 실패:', error);
            throw error;
        }
    }

    // === 이벤트 시스템 ===

    setupEventListeners() {
        try {
            console.log('🔄 [조정자] 이벤트 리스너 설정 시작...');
            
            // 모듈 간 통신 이벤트
            this.setupModuleCommunication();
            
            // 상태 변경 이벤트
            this.setupStateChangeEvents();
            
            // 페이지 네비게이션 이벤트
            this.setupPageNavigationEvents();
            
            // 전역 이벤트
            this.setupGlobalEvents();
            
            console.log('✅ [조정자] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 이벤트 리스너 설정 실패:', error);
        }
    }

    setupModuleCommunication() {
        // 여권 모듈에서 완료 이벤트 수신
        this.eventBus.addEventListener('passport:completed', (event) => {
            console.log('📨 [조정자] 여권 완료 이벤트 수신:', event.detail);
            this.handlePassportCompletion(event.detail);
        });
        
        // 항공권 모듈에서 상태 변경 이벤트 수신
        this.eventBus.addEventListener('ticket:stateChanged', (event) => {
            console.log('📨 [조정자] 항공권 상태 변경 이벤트 수신:', event.detail);
            this.handleTicketStateChange(event.detail);
        });
        
        // 전제 조건 변경 이벤트 수신
        this.eventBus.addEventListener('prerequisites:changed', (event) => {
            console.log('📨 [조정자] 전제 조건 변경 이벤트 수신:', event.detail);
            this.handlePrerequisitesChange(event.detail);
        });
    }

    setupStateChangeEvents() {
        // 전역 상태 변경 감지
        this.eventBus.addEventListener('state:changed', (event) => {
            console.log('📨 [조정자] 전역 상태 변경:', event.detail);
            this.syncModuleStates();
        });
    }

    setupPageNavigationEvents() {
        // 여권정보 페이지로 이동 버튼
        const passportAlertBtn = document.querySelector('[data-action="show-passport-page"]');
        if (passportAlertBtn) {
            passportAlertBtn.addEventListener('click', () => {
                this.routeToPage('passport');
            });
        }
        
        // 항공권 신청 페이지로 이동 버튼
        const proceedBtn = document.getElementById('proceedToFlightRequest');
        if (proceedBtn) {
            proceedBtn.addEventListener('click', () => {
                this.routeToPage('flight');
            });
        }
    }

    setupGlobalEvents() {
        // 윈도우 언로드 이벤트
        window.addEventListener('beforeunload', () => {
            this.handleBeforeUnload();
        });
        
        // 에러 처리
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event);
        });
    }

    // === 이벤트 발행/구독 시스템 ===

    emit(eventName, data) {
        try {
            const event = new CustomEvent(eventName, { detail: data });
            this.eventBus.dispatchEvent(event);
            console.log(`📤 [조정자] 이벤트 발행: ${eventName}`, data);
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 발행 실패: ${eventName}`, error);
        }
    }

    on(eventName, handler) {
        try {
            this.eventBus.addEventListener(eventName, handler);
            console.log(`📥 [조정자] 이벤트 구독: ${eventName}`);
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 구독 실패: ${eventName}`, error);
        }
    }

    off(eventName, handler) {
        try {
            this.eventBus.removeEventListener(eventName, handler);
            console.log(`📤 [조정자] 이벤트 구독 해제: ${eventName}`);
        } catch (error) {
            console.error(`❌ [조정자] 이벤트 구독 해제 실패: ${eventName}`, error);
        }
    }

    // === 페이지 라우팅 ===

    async routeToPage(page) {
        try {
            console.log(`🔄 [조정자] 페이지 라우팅: ${this.globalState.currentPage} → ${page}`);
            
            // 현재 페이지와 같은 경우 무시
            if (this.globalState.currentPage === page) {
                console.log(`⚠️ [조정자] 이미 ${page} 페이지에 있음`);
                return;
            }
            
            // 로딩 상태 설정
            this.setGlobalLoading(true);
            
            // 페이지 전환 가능성 검증
            const canRoute = await this.validatePageTransition(page);
            if (!canRoute.allowed) {
                this.showError(canRoute.message);
                this.setGlobalLoading(false);
                return;
            }
            
            // 실제 페이지 전환
            await this.performPageTransition(page);
            
            // 상태 업데이트
            this.updateGlobalState({ currentPage: page });
            
            // 이벤트 발행
            this.emit('page:changed', { 
                from: this.globalState.currentPage, 
                to: page 
            });
            
            console.log(`✅ [조정자] 페이지 라우팅 완료: ${page}`);
            
        } catch (error) {
            console.error(`❌ [조정자] 페이지 라우팅 실패: ${page}`, error);
            this.showError('페이지 전환 중 오류가 발생했습니다.');
        } finally {
            this.setGlobalLoading(false);
        }
    }

    async validatePageTransition(targetPage) {
        switch (targetPage) {
            case 'passport':
                // 여권정보 페이지는 항상 접근 가능
                return { allowed: true };
                
            case 'flight':
                // 항공권 페이지는 여권정보 완료 후에만 접근 가능
                const passportCompleted = this.passport?.isPassportInfoCompleted();
                const passportValid = this.passport?.isPassportInfoValid();
                
                if (!passportCompleted) {
                    return { 
                        allowed: false, 
                        message: '먼저 여권정보를 입력해주세요.' 
                    };
                }
                
                if (!passportValid) {
                    return { 
                        allowed: false, 
                        message: '여권정보가 올바르지 않습니다. 다시 확인해주세요.' 
                    };
                }
                
                return { allowed: true };
                
            default:
                return { 
                    allowed: false, 
                    message: '알 수 없는 페이지입니다.' 
                };
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
        
        // 전환 애니메이션 대기
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // === 상태 관리 ===

    updateGlobalState(newState) {
        try {
            const previousState = { ...this.globalState };
            this.globalState = { ...this.globalState, ...newState };
            
            console.log('🔄 [조정자] 전역 상태 업데이트:', {
                previous: previousState,
                current: this.globalState,
                changes: newState
            });
            
            // 상태 변경 이벤트 발행
            this.emit('state:changed', {
                previous: previousState,
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
                const passportCompleted = this.passport.isPassportInfoCompleted();
                const passportValid = this.passport.isPassportInfoValid();
                const passportData = this.passport.getPassportData();
                
                this.updateGlobalState({
                    isPassportCompleted: passportCompleted,
                    isPassportValid: passportValid,
                    passportData: passportData
                });
            }
            
            // 항공권 모듈 상태 동기화
            if (this.ticket) {
                const ticketData = this.ticket.getTicketData();
                const prerequisiteStatus = this.ticket.getPrerequisiteStatus();
                
                this.updateGlobalState({
                    ticketData: ticketData,
                    canAccessTicketSection: prerequisiteStatus.flightSectionEnabled,
                    prerequisitesMet: prerequisiteStatus.isActivityPeriodCompleted && 
                                      prerequisiteStatus.isActivityPeriodValid
                });
            }
            
            console.log('✅ [조정자] 모듈 상태 동기화 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 모듈 상태 동기화 실패:', error);
        }
    }

    // === 모듈 간 통신 핸들러 ===

    handlePassportCompletion(data) {
        try {
            console.log('🔄 [조정자] 여권 완료 처리:', data);
            
            // 전역 상태 업데이트
            this.updateGlobalState({
                isPassportCompleted: true,
                isPassportValid: data.valid,
                passportData: data.passportData
            });
            
            // 여권 완료 시 항공권 페이지 접근 허용 알림
            if (data.valid) {
                this.showSuccess('여권정보가 저장되었습니다. 이제 항공권 신청을 진행할 수 있습니다.');
                
                // 자동으로 항공권 페이지로 이동하도록 제안
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
            console.log('🔄 [조정자] 항공권 상태 변경 처리:', data);
            
            // 전역 상태 업데이트
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
            console.log('🔄 [조정자] 전제 조건 변경 처리:', data);
            
            // 전역 상태 업데이트
            this.updateGlobalState({
                canAccessTicketSection: data.canAccess,
                prerequisitesMet: data.met
            });
            
        } catch (error) {
            console.error('❌ [조정자] 전제 조건 변경 처리 실패:', error);
        }
    }

    // === 초기 상태 결정 ===

    async determineInitialState() {
        try {
            console.log('🔄 [조정자] 초기 상태 결정 시작...');
            
            // API 존재 여부 확인
            if (!this.services.api || typeof this.services.api.loadPassportInfo !== 'function') {
                console.error('❌ [조정자] API 서비스가 초기화되지 않음');
                // 기본 상태로 설정하고 종료
                this.updateGlobalState({ currentPage: 'passport' });
                return;
            }
            
            // 기존 여권정보 확인 (안전하게)
            let existingPassport = null;
            let hasPassport = false;
            
            try {
                existingPassport = await this.services.api.loadPassportInfo();
                hasPassport = !!(existingPassport && existingPassport.passport_number);
            } catch (apiError) {
                console.warn('⚠️ [조정자] 여권정보 로드 실패, 기본값 사용:', apiError);
                // API 오류 시 기본값 사용
            }
            
            // 기존 항공권 신청 확인 (안전하게)
            let existingTicket = null;
            let hasTicketRequest = false;
            
            try {
                existingTicket = await this.services.api.loadExistingFlightRequest();
                hasTicketRequest = !!existingTicket;
            } catch (apiError) {
                console.warn('⚠️ [조정자] 항공권 신청 정보 로드 실패, 기본값 사용:', apiError);
            }
            
            console.log('📊 [조정자] 초기 데이터 상태:', {
                hasPassport,
                hasTicketRequest,
                passportData: existingPassport,
                ticketData: existingTicket
            });
            
            // 초기 페이지 결정
            let initialPage = 'passport';
            if (hasPassport && !hasTicketRequest) {
                initialPage = 'flight';
            } else if (hasTicketRequest) {
                // 기존 신청이 있으면 상태에 따라 결정
                if (existingTicket.status === 'pending' || existingTicket.status === 'approved') {
                    // 이미 신청 완료된 경우 기존 신청 표시
                    this.showExistingRequest(existingTicket);
                    return;
                }
            }
            
            // 초기 상태 설정
            this.updateGlobalState({
                currentPage: initialPage,
                isPassportCompleted: hasPassport,
                isPassportValid: hasPassport,
                passportData: existingPassport,
                ticketData: existingTicket
            });
            
            console.log('✅ [조정자] 초기 상태 결정 완료:', {
                initialPage,
                hasPassport,
                hasTicketRequest
            });
            
        } catch (error) {
            console.error('❌ [조정자] 초기 상태 결정 실패:', error);
            // 기본적으로 여권 페이지로 시작
            this.updateGlobalState({ currentPage: 'passport' });
            // 오류를 다시 던지지 않음 (무한 루프 방지)
        }
    }

    // === 애플리케이션 시작 ===

    startApplication() {
        try {
            console.log('🚀 [조정자] 애플리케이션 시작...');
            
            // 초기 페이지로 라우팅
            this.routeToPage(this.globalState.currentPage);
            
            // 상태 동기화
            this.syncModuleStates();
            
            // 로딩 완료
            this.setGlobalLoading(false);
            
            console.log('✅ [조정자] 애플리케이션 시작 완료');
            
        } catch (error) {
            console.error('❌ [조정자] 애플리케이션 시작 실패:', error);
            this.handleStartupError(error);
        }
    }

    // === 최종 제출 관리 ===

    async handleFinalSubmit() {
        try {
            console.log('🔄 [조정자] 최종 제출 처리 시작...');
            
            this.setGlobalLoading(true);
            
            // 1. 모든 모듈의 검증
            const validationResults = await this.validateAllSteps();
            if (!validationResults.valid) {
                this.showError(validationResults.message);
                this.setGlobalLoading(false);
                return;
            }
            
            // 2. 통합 데이터 수집
            const submitData = this.collectSubmissionData();
            
            // 3. API를 통한 제출
            const result = await this.services.api.submitCompleteFlightRequest(submitData);
            
            // 4. 성공 처리
            this.showSuccess('항공권 신청이 성공적으로 제출되었습니다!');
            this.emit('submission:completed', { result });
            
            // 5. 페이지 새로고침
            setTimeout(() => {
                window.location.reload();
            }, 2000);
            
            console.log('✅ [조정자] 최종 제출 완료:', result);
            
        } catch (error) {
            console.error('❌ [조정자] 최종 제출 실패:', error);
            this.showError('제출 중 오류가 발생했습니다.');
        } finally {
            this.setGlobalLoading(false);
        }
    }

    async validateAllSteps() {
        // 여권 검증
        if (!this.passport?.isPassportInfoCompleted()) {
            return { valid: false, message: '여권정보를 완성해주세요.' };
        }
        
        if (!this.passport?.isPassportInfoValid()) {
            return { valid: false, message: '여권정보가 올바르지 않습니다.' };
        }
        
        // 항공권 검증
        const ticketData = this.ticket?.getTicketData();
        if (!ticketData?.actualArrivalDate || !ticketData?.actualWorkEndDate) {
            return { valid: false, message: '현지 활동기간을 입력해주세요.' };
        }
        
        if (!ticketData?.departureDate || !ticketData?.returnDate) {
            return { valid: false, message: '항공권 날짜를 입력해주세요.' };
        }
        
        return { valid: true };
    }

    collectSubmissionData() {
        const passportData = this.passport?.getPassportData();
        const ticketData = this.ticket?.getTicketData();
        
        return {
            passport: passportData,
            ticket: ticketData,
            timestamp: new Date().toISOString()
        };
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
            
            console.log('🔄 [조정자] 전역 로딩 상태:', loading);
            
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
            
            // 에러 메시지 UI 표시
            const errorEl = document.getElementById('errorMessage');
            if (errorEl) {
                errorEl.innerHTML = `
                    <div class="error-content">
                        <i data-lucide="alert-circle"></i>
                        <span>${message}</span>
                    </div>
                `;
                errorEl.style.display = 'block';
                
                // 5초 후 자동 숨김
                setTimeout(() => {
                    errorEl.style.display = 'none';
                    this.updateGlobalState({ hasError: false, errorMessage: null });
                }, 5000);
                
                // 아이콘 초기화
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            } else {
                // 폴백: alert 사용
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [조정자] 에러 표시 실패:', error);
            alert(message); // 최후 수단
        }
    }

    showSuccess(message) {
        try {
            console.log('✅ [조정자] 성공:', message);
            
            // 성공 메시지 UI 표시
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

    showExistingRequest(requestData) {
        try {
            console.log('🔄 [조정자] 기존 신청 표시:', requestData);
            
            const existingEl = this.pageElements.existingRequest;
            const formEl = this.pageElements.requestForm;
            
            if (existingEl && requestData) {
                existingEl.innerHTML = `
                    <div class="existing-request-content">
                        <h3>기존 항공권 신청</h3>
                        <p>상태: ${requestData.status}</p>
                        <p>신청일: ${new Date(requestData.created_at).toLocaleDateString()}</p>
                        <p>현지 활동기간: ${requestData.actual_arrival_date} ~ ${requestData.actual_work_end_date}</p>
                        <p>항공편: ${requestData.departure_date} ~ ${requestData.return_date}</p>
                    </div>
                `;
                existingEl.style.display = 'block';
                
                // 중복 신청 방지
                if (formEl) {
                    formEl.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('❌ [조정자] 기존 신청 표시 실패:', error);
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
        // 변경사항이 있으면 확인 메시지 표시
        if (this.hasUnsavedChanges()) {
            return '변경사항이 저장되지 않았습니다. 정말 떠나시겠습니까?';
        }
    }

    hasUnsavedChanges() {
        // 각 모듈에서 변경사항 확인
        // 실제 구현 시 모듈별 상태 확인 로직 추가
        return false;
    }

    // === 외부 인터페이스 ===

    // 현재 전역 상태 반환
    getGlobalState() {
        return { ...this.globalState };
    }

    // 특정 모듈 인스턴스 반환
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

    // 서비스 인스턴스 반환
    getService(serviceName) {
        return this.services[serviceName] || null;
    }

    // 수동으로 상태 동기화 트리거
    forceSyncStates() {
        this.syncModuleStates();
    }

    // 수동으로 모든 검증 트리거
    triggerValidationAll() {
        if (this.passport && typeof this.passport.validatePassportInfo === 'function') {
            this.passport.validatePassportInfo();
        }
        
        if (this.ticket && typeof this.ticket.triggerValidation === 'function') {
            this.ticket.triggerValidation();
        }
    }
}

// 애플리케이션 시작점
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🚀 [조정자] DOM 로드 완료 - FlightRequestCoordinator 시작...');
        
        // 이미 인스턴스가 있는지 확인 (중복 생성 방지)
        if (window.flightRequestCoordinator) {
            console.warn('⚠️ [조정자] 이미 초기화된 인스턴스가 있습니다.');
            return;
        }
        
        // 전역 조정자 인스턴스 생성
        window.flightRequestCoordinator = new FlightRequestCoordinator();
        
        // 초기화
        await window.flightRequestCoordinator.init();
        
        console.log('✅ [조정자] FlightRequestCoordinator 완전 초기화 완료');
        
    } catch (error) {
        console.error('❌ [조정자] FlightRequestCoordinator 초기화 실패:', error);
        
        // 에러 상황에서도 기본 알림 표시
        if (!window.flightRequestCoordinator || !window.flightRequestCoordinator.isInitialized) {
            alert('시스템 초기화 중 오류가 발생했습니다. 페이지를 새로고침해주세요.');
        }
    }
});

// 전역 스코프에 클래스 노출
window.FlightRequestCoordinator = FlightRequestCoordinator;

console.log('✅ FlightRequestCoordinator v1.0.1 모듈 로드 완료 - Phase 3 통합 조정자');
console.log('🔧 v1.0.1 수정사항:', {
    fixes: [
        '초기화 시도 횟수 제한 (최대 3회)',
        'determineInitialState API 존재 여부 검증',
        'API 메서드 준비 상태 확인 강화',
        '중복 인스턴스 생성 방지',
        '오류 발생 시 안전한 기본값 처리'
    ],
    improvements: [
        '무한 루프 방지 코드 추가',
        'API 로드 실패 시 graceful degradation',
        '에러 재전파 제거로 안정성 향상'
    ]
});
console.log('🚀 Phase 3 핵심 기능:', {
    모듈통합관리: 'passport와 ticket 모듈 통합 조정',
    이벤트버스시스템: '모듈 간 느슨한 결합 통신',
    페이지라우팅: '단계별 페이지 전환 관리',
    전역상태관리: '애플리케이션 전체 상태 통합',
    최종제출관리: '모든 단계 검증 및 통합 제출',
    에러처리: '전역 에러 처리 및 사용자 피드백',
    라이프사이클관리: '초기화부터 완료까지 전체 플로우'
});
