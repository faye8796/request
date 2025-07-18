// FlightRequestCoordinator v1.6.0 - 무한루프 긴급 수정 PART1
// 이벤트 시스템 순환 참조 완전 제거

/**
 * 🚨 긴급 수정: v1.6.0 - 무한루프 완전 제거
 * 
 * 주요 수정사항:
 * 1. 이벤트 전파 깊이 제한 (최대 3단계)
 * 2. 처리된 이벤트 ID 추적으로 중복 방지
 * 3. emit 메서드에 순환 감지 로직 추가
 * 4. 타임아웃 안전장치 강화
 * 5. 폴백 시스템 완전 구축
 */

class FlightRequestCoordinator {
    constructor() {
        this.version = "1.6.0";
        this.init = null;
        this.passport = null;
        this.ticket = null;
        this.api = null;
        this.utils = null;
        
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
        
        console.log(`🚀 FlightRequestCoordinator v${this.version} 초기화 시작 (무한루프 방지 시스템 활성화)`);
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
        const modules = ['init', 'passport', 'ticket', 'api', 'utils'];
        
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
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let attempts = 0;
            
            const check = () => {
                attempts++;
                
                // 타임아웃 체크
                if (Date.now() - startTime > timeout) {
                    console.warn(`⚠️ 의존성 로드 타임아웃 (${timeout}ms), 폴백 모드 활성화`);
                    resolve(false); // 폴백 허용
                    return;
                }
                
                // 시도 횟수 제한
                if (attempts > this.maxDependencyChecks) {
                    console.warn(`⚠️ 의존성 체크 횟수 초과 (${this.maxDependencyChecks}회), 폴백 모드 활성화`);
                    resolve(false); // 폴백 허용
                    return;
                }
                
                // 의존성 확인
                const apiExists = window.FlightRequestApi && window.supabaseApiAdapter;
                const utilsReady = window.FlightRequestUtils;
                const passportClassReady = window.FlightRequestPassport;
                const ticketClassReady = window.FlightRequestTicket;
                const initClassReady = window.FlightRequestInit;
                
                // 의존성 상태 업데이트
                this.dependencies.FlightRequestInit = initClassReady;
                this.dependencies.FlightRequestTicket = ticketClassReady;
                this.dependencies.FlightRequestPassport = passportClassReady;
                this.dependencies.FlightRequestApi = apiExists;
                this.dependencies.FlightRequestUtils = utilsReady;
                
                const allReady = apiExists && utilsReady && passportClassReady && 
                               ticketClassReady && initClassReady;
                
                if (allReady) {
                    console.log(`✅ 모든 의존성 로드 완료 (${attempts}회 시도, ${Date.now() - startTime}ms)`);
                    resolve(true);
                    return;
                }
                
                // 부분적 성공 로깅
                if (attempts % 5 === 0) {
                    console.log(`🔄 의존성 체크 중... (${attempts}/${this.maxDependencyChecks}) - API: ${apiExists}, Utils: ${utilsReady}, Init: ${initClassReady}`);
                }
                
                setTimeout(check, this.checkInterval);
            };
            
            setTimeout(check, 100); // 초기 지연
        });
    }

    // 🚨 긴급 수정: 초기화 모듈 안전한 초기화
    async initializeInitModuleSafely() {
        if (!window.FlightRequestInit) {
            console.warn('⚠️ FlightRequestInit 클래스가 없음, 폴백 모드 활성화');
            await this.activateFallbackMode();
            return;
        }

        try {
            console.log('🔧 초기화 모듈 안전한 초기화 시작...');
            
            this.init = new window.FlightRequestInit();
            
            // 🚨 무한루프 방지: 이벤트 리스너 제한
            this.init.coordinator = this; // 참조 설정
            this.init.emit = this.createSafeEmitForModule(this.init, 'init');
            
            // 초기화 실행 (타임아웃 설정)
            const initPromise = this.init.init();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('초기화 타임아웃')), 5000);
            });
            
            await Promise.race([initPromise, timeoutPromise]);
            
            console.log('✅ 초기화 모듈 안전한 초기화 완료');
            
        } catch (error) {
            console.error('❌ 초기화 모듈 초기화 실패:', error);
            await this.activateFallbackMode();
        }
    }

    // 🚨 모듈용 안전한 emit 함수 생성
    createSafeEmitForModule(module, moduleName) {
        return (eventName, data) => {
            // 순환 참조 방지
            if (this.eventCallStack.length >= this.eventDepthLimit) {
                console.warn(`⚠️ 모듈 ${moduleName}에서 이벤트 깊이 제한 도달: ${eventName}`);
                return;
            }
            
            // 소스 정보 추가
            const safeData = { ...data, source: moduleName };
            this.safeEmit(eventName, safeData, moduleName);
        };
    }

    // 🚨 긴급 폴백 모드 활성화
    async activateFallbackMode() {
        console.log('🚨 폴백 모드 활성화 - 직접 사용자 데이터 로드');
        
        try {
            // localStorage에서 직접 사용자 데이터 읽기
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            
            // 필수 활동일 직접 계산 및 표시
            await this.displayRequiredDaysDirectly(userData);
            
            // 기본 기능 활성화
            this.enableBasicFunctionality();
            
            console.log('✅ 폴백 모드 활성화 완료');
            
        } catch (error) {
            console.error('❌ 폴백 모드 활성화 실패:', error);
            
            // 최후의 수단: 하드코딩된 기본값
            this.setHardcodedDefaults();
        }
    }

    // 📊 필수 활동일 직접 표시
    async displayRequiredDaysDirectly(userData) {
        const requiredEl = document.getElementById('requiredDays');
        const maximumEl = document.getElementById('maximumDays');
        
        if (!requiredEl) return;
        
        try {
            let requiredDays = 90; // 기본값
            let maximumDays = 365; // 기본값
            
            // API 어댑터가 있으면 직접 호출
            if (window.supabaseApiAdapter && userData.id) {
                try {
                    const response = await window.supabaseApiAdapter.getUserProfile(userData.id);
                    if (response.success && response.data) {
                        requiredDays = response.data.minimum_required_days || 90;
                        maximumDays = response.data.maximum_allowed_days || 365;
                    }
                } catch (apiError) {
                    console.warn('⚠️ API 어댑터 호출 실패, 기본값 사용:', apiError);
                }
            }
            
            // UI 업데이트
            requiredEl.textContent = requiredDays;
            requiredEl.className = 'value required-days-value success';
            
            if (maximumEl) {
                maximumEl.textContent = maximumDays;
                maximumEl.className = 'value maximum-days-value success';
            }
            
            console.log(`✅ 필수 활동일 직접 표시 완료: ${requiredDays}일 (최대: ${maximumDays}일)`);
            
        } catch (error) {
            console.error('❌ 필수 활동일 직접 표시 실패:', error);
            
            // 최후의 수단: 기본값 설정
            requiredEl.textContent = '90';
            requiredEl.className = 'value required-days-value fallback';
        }
    }

    // 🔧 기본 기능 활성화
    enableBasicFunctionality() {
        // 활동기간 입력 활성화
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            startDateInput.disabled = false;
            endDateInput.disabled = false;
            
            // 기본 이벤트 리스너 추가 (무한루프 없이)
            this.setupBasicEventListeners();
        }
        
        console.log('✅ 기본 기능 활성화 완료');
    }

    // 🔧 기본 이벤트 리스너 설정 (무한루프 방지)
    setupBasicEventListeners() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            let isProcessing = false; // 중복 처리 방지
            
            const handleDateChange = () => {
                if (isProcessing) return;
                isProcessing = true;
                
                try {
                    const startDate = startDateInput.value;
                    const endDate = endDateInput.value;
                    
                    if (startDate && endDate) {
                        // 항공권 섹션 활성화
                        const flightSection = document.getElementById('flightTicketSection');
                        if (flightSection) {
                            flightSection.style.display = 'block';
                            console.log('✅ 항공권 섹션 활성화 (폴백 모드)');
                        }
                    }
                } catch (error) {
                    console.error('❌ 날짜 변경 처리 실패:', error);
                } finally {
                    setTimeout(() => { isProcessing = false; }, 100);
                }
            };
            
            startDateInput.addEventListener('change', handleDateChange);
            endDateInput.addEventListener('change', handleDateChange);
        }
    }

    // 🚨 최후의 수단: 하드코딩된 기본값
    setHardcodedDefaults() {
        console.log('🚨 최후의 수단: 하드코딩된 기본값 설정');
        
        const requiredEl = document.getElementById('requiredDays');
        const maximumEl = document.getElementById('maximumDays');
        
        if (requiredEl) {
            requiredEl.textContent = '90';
            requiredEl.className = 'value required-days-value hardcoded';
        }
        
        if (maximumEl) {
            maximumEl.textContent = '365';
            maximumEl.className = 'value maximum-days-value hardcoded';
        }
        
        console.log('✅ 하드코딩된 기본값 설정 완료');
    }
    // 🔧 다른 모듈들 안전한 초기화
    initializeModulesSafely() {
        try {
            console.log('🔧 나머지 모듈들 안전한 초기화...');
            
            // Passport 모듈
            if (window.FlightRequestPassport) {
                this.passport = new window.FlightRequestPassport();
                this.passport.coordinator = this;
                this.passport.emit = this.createSafeEmitForModule(this.passport, 'passport');
            }
            
            // Ticket 모듈
            if (window.FlightRequestTicket) {
                this.ticket = new window.FlightRequestTicket();
                this.ticket.coordinator = this;
                this.ticket.emit = this.createSafeEmitForModule(this.ticket, 'ticket');
            }
            
            // API 모듈
            if (window.FlightRequestApi) {
                this.api = new window.FlightRequestApi();
                this.api.coordinator = this;
                this.api.emit = this.createSafeEmitForModule(this.api, 'api');
            }
            
            // Utils 모듈
            if (window.FlightRequestUtils) {
                this.utils = new window.FlightRequestUtils();
                this.utils.coordinator = this;
                this.utils.emit = this.createSafeEmitForModule(this.utils, 'utils');
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
                fallbackMode: !this.init
            });
            
        } catch (error) {
            console.error('❌ 애플리케이션 시작 실패:', error);
        }
    }

    // 🔧 모듈 접근자 (안전한)
    getModule(moduleName) {
        const moduleMap = {
            'init': this.init,
            'passport': this.passport,
            'ticket': this.ticket,
            'api': this.api,
            'utils': this.utils
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

// 🌐 글로벌 인스턴스 생성 및 등록
console.log('🌐 FlightRequestCoordinator 글로벌 등록...');

if (typeof window !== 'undefined') {
    // 기존 인스턴스가 있으면 정리
    if (window.flightRequestCoordinator) {
        console.log('🔄 기존 Coordinator 인스턴스 정리');
        window.flightRequestCoordinator = null;
    }
    
    window.FlightRequestCoordinator = FlightRequestCoordinator;
    window.flightRequestCoordinator = new FlightRequestCoordinator();
    
    // 🚀 즉시 초기화 시작
    window.flightRequestCoordinator.init().catch(error => {
        console.error('🚨 Coordinator 초기화 최종 실패:', error);
    });
    
    console.log('✅ FlightRequestCoordinator 글로벌 등록 완료');
}
