// flight-request-init.js - v1.2.0 이벤트 기반 재검증 시스템
// 🎯 핵심 책임:
//   1. 항공권 신청 페이지의 초기 세팅
//   2. api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시
//   3. 🔧 v1.2.0: UI 직접 제어 제거, 이벤트 발행으로 변경
//   4. 실시간 활동기간 변경 감지 및 재검증 시스템 (이벤트 기반)
// 🔧 분리 목적: flight-request-ticket.js의 초기화 로직 분리로 책임 명확화
// 🆕 v1.2.0: 단일 책임 원칙 적용 - UI 제어 로직 완전 제거

class FlightRequestInit {
    constructor() {
        console.log('🔄 [초기화] FlightRequestInit v1.2.0 생성 시작 - 이벤트 기반 시스템...');
        
        // 초기화 상태 관리
        this.isInitialized = false;
        this.initializationAttempts = 0;
        this.maxInitAttempts = 3;
        
        // 사용자 데이터 관리
        this.userData = null;
        this.userRequiredDays = null;
        this.userMaximumDays = null;
        this.dispatchEndDate = null;
        this.isUserDataLoaded = false;
        
        // API 어댑터 연동
        this.apiAdapter = null;
        
        // 🔧 v1.2.0: 이벤트 시스템으로 변경
        this.eventBus = {
            listeners: new Map(),
            emit: (eventName, data) => {
                try {
                    const listeners = this.eventBus.listeners.get(eventName) || [];
                    listeners.forEach(callback => {
                        try {
                            callback(data);
                        } catch (error) {
                            console.warn(`⚠️ [초기화] 이벤트 리스너 실행 실패 (${eventName}):`, error);
                        }
                    });
                    
                    // 전역 조정자에게도 이벤트 발행
                    if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.emit === 'function') {
                        window.flightRequestCoordinator.emit(`init:${eventName}`, data);
                    }
                } catch (error) {
                    console.error(`❌ [초기화] 이벤트 발행 실패 (${eventName}):`, error);
                }
            },
            on: (eventName, callback) => {
                if (!this.eventBus.listeners.has(eventName)) {
                    this.eventBus.listeners.set(eventName, []);
                }
                this.eventBus.listeners.get(eventName).push(callback);
            }
        };
        
        // 🆕 v1.2.0: 실시간 재검증 시스템 (이벤트 기반)
        this.lastValidationState = null;
        this.revalidationListeners = [];
        this.activityPeriodFields = {
            arrivalDate: null,
            workEndDate: null
        };
        this.isValidationInProgress = false;
        
        // UI 요소 참조 (읽기 전용)
        this.pageElements = {
            userWelcome: null,
            userDetails: null,
            requiredDays: null,
            passportAlert: null,
            existingRequest: null,
            requestForm: null
        };
        
        // 초기화 상태 추적
        this.initStatus = {
            pageElementsReady: false,
            userDataLoaded: false,
            requiredDaysDisplayed: false,
            passportCheckCompleted: false,
            revalidationListenersSetup: false,
            activityPeriodFieldsFound: false
        };
        
        console.log('✅ [초기화] FlightRequestInit v1.2.0 생성 완료 - 이벤트 기반');
    }

    // === 🚀 메인 초기화 메서드 ===
    async init() {
        try {
            this.initializationAttempts++;
            console.log(`🔄 [초기화] 초기화 시작 (시도 ${this.initializationAttempts}/${this.maxInitAttempts})`);
            
            if (this.initializationAttempts > this.maxInitAttempts) {
                console.error('❌ [초기화] 최대 시도 횟수 초과');
                return false;
            }
            
            // 1. 페이지 요소 초기화
            await this.initializePageElements();
            
            // 2. API 어댑터 연동
            await this.connectToApiAdapter();
            
            // 3. 사용자 데이터 로드 및 표시
            await this.loadAndDisplayUserData();
            
            // 4. 필수활동일 정보 표시
            await this.displayRequiredDaysInfo();
            
            // 🔧 v1.2.0: 5. UI 제어 대신 초기 상태 이벤트 발행
            this.emitInitialFlightSectionState();
            
            // 6. 여권정보 체크
            await this.checkPassportStatus();
            
            // 7. 기존 신청 내역 확인
            await this.checkExistingRequest();
            
            // 🔧 v1.2.0: 8. 이벤트 기반 재검증 시스템 설정
            await this.setupEventBasedRevalidationSystem();
            
            this.isInitialized = true;
            console.log('✅ [초기화] 모든 초기화 완료 (v1.2.0 이벤트 기반)');
            
            // 초기화 완료 이벤트 발행
            this.eventBus.emit('initializationCompleted', {
                success: true,
                userData: this.userData,
                userRequirements: this.getUserRequirements()
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ [초기화] 초기화 실패:', error);
            this.eventBus.emit('initializationFailed', { error: error.message });
            return false;
        }
    }

    // === 🔧 v1.2.0: 초기 항공권 섹션 상태 이벤트 발행 ===
    emitInitialFlightSectionState() {
        try {
            console.log('🔄 [초기화] v1.2.0: 초기 항공권 섹션 상태 이벤트 발행...');
            
            // 초기에는 항상 비활성화 상태로 시작
            this.eventBus.emit('flightSectionStateChangeRequest', {
                action: 'disable',
                reason: 'initialization',
                message: '항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.',
                type: 'info'
            });
            
            console.log('✅ [초기화] v1.2.0: 초기 항공권 섹션 상태 이벤트 발행 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 초기 상태 이벤트 발행 실패:', error);
        }
    }

    // === 🔧 v1.2.0: 이벤트 기반 재검증 시스템 설정 ===
    async setupEventBasedRevalidationSystem() {
        try {
            console.log('🔄 [초기화] v1.2.0: 이벤트 기반 재검증 시스템 설정...');
            
            // 1. 활동기간 필드 탐지
            await this.findActivityPeriodFields();
            
            // 2. 이벤트 기반 변경 감지 리스너 설정
            this.setupEventBasedChangeListeners();
            
            // 3. 초기 검증 상태 저장
            this.saveInitialValidationState();
            
            this.initStatus.revalidationListenersSetup = true;
            console.log('✅ [초기화] v1.2.0: 이벤트 기반 재검증 시스템 설정 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 이벤트 기반 재검증 시스템 설정 실패:', error);
        }
    }

    // === 🔧 v1.2.0: 이벤트 기반 변경 감지 리스너 설정 ===
    setupEventBasedChangeListeners() {
        try {
            console.log('🔄 [초기화] v1.2.0: 이벤트 기반 변경 감지 리스너 설정...');
            
            // 도착일 변경 감지
            if (this.activityPeriodFields.arrivalDate) {
                const arrivalField = this.activityPeriodFields.arrivalDate;
                
                ['input', 'change', 'blur'].forEach(eventType => {
                    const listener = (event) => {
                        console.log('🔔 [초기화] v1.2.0: 도착일 변경 감지:', event.target.value);
                        this.handleActivityPeriodChangeEvent('arrivalDate', event.target.value);
                    };
                    
                    arrivalField.addEventListener(eventType, listener);
                    this.revalidationListeners.push({
                        element: arrivalField,
                        eventType: eventType,
                        listener: listener
                    });
                });
                
                console.log('✅ [초기화] 도착일 필드 이벤트 리스너 설정 완료');
            }
            
            // 근무 종료일 변경 감지
            if (this.activityPeriodFields.workEndDate) {
                const workEndField = this.activityPeriodFields.workEndDate;
                
                ['input', 'change', 'blur'].forEach(eventType => {
                    const listener = (event) => {
                        console.log('🔔 [초기화] v1.2.0: 근무 종료일 변경 감지:', event.target.value);
                        this.handleActivityPeriodChangeEvent('workEndDate', event.target.value);
                    };
                    
                    workEndField.addEventListener(eventType, listener);
                    this.revalidationListeners.push({
                        element: workEndField,
                        eventType: eventType,
                        listener: listener
                    });
                });
                
                console.log('✅ [초기화] 근무 종료일 필드 이벤트 리스너 설정 완료');
            }
            
            console.log('✅ [초기화] v1.2.0: 이벤트 기반 변경 감지 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 이벤트 기반 변경 감지 리스너 설정 실패:', error);
        }
    }

    // === 🔧 v1.2.0: 활동기간 변경 이벤트 핸들러 ===
    async handleActivityPeriodChangeEvent(fieldType, newValue) {
        try {
            // 재검증이 진행 중이면 중복 실행 방지
            if (this.isValidationInProgress) {
                console.log('⏳ [초기화] v1.2.0: 재검증 진행 중 - 대기');
                return;
            }
            
            this.isValidationInProgress = true;
            console.log(`🔄 [초기화] v1.2.0: 활동기간 변경 이벤트 처리 시작 (${fieldType}: ${newValue})`);
            
            // 1. 활동기간 변경 이벤트 발행
            this.eventBus.emit('activityPeriodChanged', {
                fieldType: fieldType,
                newValue: newValue,
                timestamp: Date.now()
            });
            
            // 2. 즉시 항공권 섹션 비활성화 요청 이벤트 발행
            this.eventBus.emit('flightSectionStateChangeRequest', {
                action: 'disable',
                reason: 'activityPeriodChanged',
                message: '활동기간 변경됨 - 재검증 필요',
                type: 'warning'
            });
            
            // 3. 500ms 지연 후 재검증 실행
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 4. 재검증 실행
            const revalidationResult = await this.performRevalidation();
            
            // 5. 재검증 결과 이벤트 발행
            if (revalidationResult.success) {
                this.eventBus.emit('flightSectionStateChangeRequest', {
                    action: 'enable',
                    reason: 'revalidationSuccess',
                    message: '재검증 통과 - 항공권 신청 가능',
                    type: 'success',
                    validationResult: revalidationResult
                });
            } else {
                this.eventBus.emit('flightSectionStateChangeRequest', {
                    action: 'disable',
                    reason: 'revalidationFailed',
                    message: `재검증 실패: ${revalidationResult.reason}`,
                    type: 'error',
                    validationResult: revalidationResult
                });
            }
            
            // 6. 재검증 완료 이벤트 발행
            this.eventBus.emit('revalidationCompleted', {
                success: revalidationResult.success,
                result: revalidationResult,
                timestamp: Date.now()
            });
            
            console.log(`✅ [초기화] v1.2.0: 활동기간 변경 이벤트 처리 완료 (성공: ${revalidationResult.success})`);
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 활동기간 변경 이벤트 처리 실패:', error);
            
            // 에러 시에도 적절한 이벤트 발행
            this.eventBus.emit('flightSectionStateChangeRequest', {
                action: 'disable',
                reason: 'revalidationError',
                message: '재검증 중 오류 발생',
                type: 'error'
            });
            
        } finally {
            this.isValidationInProgress = false;
        }
    }

    // === 🔧 v1.2.0: 기존 UI 제어 메서드들 제거 및 이벤트 발행으로 대체 ===
    
    // 🚫 제거됨: disableFlightSectionWithMessage()
    // 🚫 제거됨: enableFlightSectionWithMessage()
    // 🚫 제거됨: updatePrerequisiteStatusMessage()
    // 🚫 제거됨: createPrerequisiteStatusMessage()
    // 🚫 제거됨: saveFlightSectionState()
    // 🚫 제거됨: restoreFlightSectionState()
    // 🚫 제거됨: extractFlightFormData()
    // 🚫 제거됨: restoreFlightFormData()

    // === 활동기간 필드 탐지 (유지) ===
    async findActivityPeriodFields() {
        try {
            console.log('🔄 [초기화] v1.2.0: 활동기간 필드 탐지...');
            
            // 여러 가능한 셀렉터로 필드 탐색
            const arrivalSelectors = [
                '#actualArrivalDate',
                'input[name="actualArrivalDate"]',
                'input[placeholder*="도착"]',
                'input[placeholder*="입국"]'
            ];
            
            const workEndSelectors = [
                '#actualWorkEndDate', 
                'input[name="actualWorkEndDate"]',
                'input[placeholder*="종료"]',
                'input[placeholder*="마지막"]'
            ];
            
            // 도착일 필드 찾기
            for (const selector of arrivalSelectors) {
                const field = document.querySelector(selector);
                if (field) {
                    this.activityPeriodFields.arrivalDate = field;
                    console.log('✅ [초기화] 도착일 필드 발견:', selector);
                    break;
                }
            }
            
            // 근무 종료일 필드 찾기
            for (const selector of workEndSelectors) {
                const field = document.querySelector(selector);
                if (field) {
                    this.activityPeriodFields.workEndDate = field;
                    console.log('✅ [초기화] 근무 종료일 필드 발견:', selector);
                    break;
                }
            }
            
            // 필드 발견 상태 기록
            const fieldsFound = !!(this.activityPeriodFields.arrivalDate || this.activityPeriodFields.workEndDate);
            this.initStatus.activityPeriodFieldsFound = fieldsFound;
            
            if (fieldsFound) {
                console.log('✅ [초기화] v1.2.0: 활동기간 필드 탐지 완료');
            } else {
                console.warn('⚠️ [초기화] v1.2.0: 활동기간 필드를 찾을 수 없음 - 재검증 시스템 제한됨');
            }
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 활동기간 필드 탐지 실패:', error);
        }
    }

    // === 재검증 실행 (유지) ===
    async performRevalidation() {
        try {
            console.log('🔄 [초기화] v1.2.0: 재검증 실행...');
            
            // 1. 현재 활동기간 데이터 수집
            const currentData = this.getCurrentActivityPeriodData();
            
            // 2. 검증 규칙 적용
            const validationResult = await this.validateActivityPeriod(currentData);
            
            // 3. 검증 상태 업데이트
            this.lastValidationState = {
                timestamp: Date.now(),
                data: currentData,
                result: validationResult
            };
            
            console.log('✅ [초기화] v1.2.0: 재검증 완료:', validationResult);
            return validationResult;
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 재검증 실행 실패:', error);
            return {
                success: false,
                reason: '재검증 실행 중 오류 발생'
            };
        }
    }

    // === 현재 활동기간 데이터 수집 (유지) ===
    getCurrentActivityPeriodData() {
        try {
            const data = {
                arrivalDate: null,
                workEndDate: null,
                calculatedDays: null
            };
            
            // 도착일 수집
            if (this.activityPeriodFields.arrivalDate) {
                data.arrivalDate = this.activityPeriodFields.arrivalDate.value;
            }
            
            // 근무 종료일 수집
            if (this.activityPeriodFields.workEndDate) {
                data.workEndDate = this.activityPeriodFields.workEndDate.value;
            }
            
            // 계산된 활동일 수집 (있다면)
            const calculatedDaysEl = document.getElementById('calculatedDays');
            if (calculatedDaysEl && calculatedDaysEl.textContent) {
                const match = calculatedDaysEl.textContent.match(/(\\d+)/);
                if (match) {
                    data.calculatedDays = parseInt(match[1]);
                }
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 활동기간 데이터 수집 실패:', error);
            return {};
        }
    }

    // === 활동기간 검증 (유지) ===
    async validateActivityPeriod(data) {
        try {
            console.log('🔄 [초기화] v1.2.0: 활동기간 검증 중...', data);
            
            // 1. 기본 데이터 검증
            if (!data.arrivalDate && !data.workEndDate) {
                return {
                    success: false,
                    reason: '활동기간 정보가 입력되지 않았습니다'
                };
            }
            
            // 2. 날짜 형식 검증
            const validationResults = [];
            
            if (data.arrivalDate) {
                const arrivalValid = this.isValidDate(data.arrivalDate);
                if (!arrivalValid) {
                    validationResults.push('도착일 형식이 올바르지 않습니다');
                }
            }
            
            if (data.workEndDate) {
                const workEndValid = this.isValidDate(data.workEndDate);
                if (!workEndValid) {
                    validationResults.push('근무 종료일 형식이 올바르지 않습니다');
                }
            }
            
            // 3. 활동일수 검증 (최소 요구사항 확인)
            if (data.calculatedDays !== null && this.userRequiredDays) {
                if (data.calculatedDays < this.userRequiredDays) {
                    validationResults.push(`활동일수가 최소 요구일(${this.userRequiredDays}일)보다 부족합니다`);
                }
            }
            
            // 4. 검증 결과 반환
            if (validationResults.length > 0) {
                return {
                    success: false,
                    reason: validationResults.join(', ')
                };
            }
            
            return {
                success: true,
                reason: '활동기간 검증 통과'
            };
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 활동기간 검증 실패:', error);
            return {
                success: false,
                reason: '검증 중 오류 발생'
            };
        }
    }

    // === 날짜 유효성 검사 (유지) ===
    isValidDate(dateString) {
        try {
            if (!dateString) return false;
            
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date);
            
        } catch (error) {
            return false;
        }
    }

    // === 초기 검증 상태 저장 (유지) ===
    saveInitialValidationState() {
        try {
            const currentData = this.getCurrentActivityPeriodData();
            this.lastValidationState = {
                timestamp: Date.now(),
                data: currentData,
                result: { success: false, reason: '초기 상태' }
            };
            
            console.log('💾 [초기화] v1.2.0: 초기 검증 상태 저장 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 초기 검증 상태 저장 실패:', error);
        }
    }

    // === 1. 페이지 요소 초기화 (유지) ===
    async initializePageElements() {
        try {
            console.log('🔄 [초기화] 페이지 요소 초기화...');
            
            this.pageElements = {
                userWelcome: document.getElementById('userWelcome'),
                userDetails: document.getElementById('userDetails'),
                requiredDays: document.getElementById('requiredDays'),
                passportAlert: document.getElementById('passportAlert'),
                existingRequest: document.getElementById('existingRequest'),
                requestForm: document.getElementById('requestForm'),
                calculatedDays: document.getElementById('calculatedDays'),
                validationStatus: document.getElementById('validationStatus')
            };
            
            // 필수 요소 존재 확인
            const requiredElements = ['userWelcome', 'userDetails', 'requiredDays'];
            const missingElements = requiredElements.filter(key => !this.pageElements[key]);
            
            if (missingElements.length > 0) {
                console.warn('⚠️ [초기화] 일부 페이지 요소 누락:', missingElements);
            }
            
            this.initStatus.pageElementsReady = true;
            console.log('✅ [초기화] 페이지 요소 초기화 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 페이지 요소 초기화 실패:', error);
            throw error;
        }
    }

    // === 2. API 어댑터 연동 (유지) ===
    async connectToApiAdapter() {
        try {
            console.log('🔄 [초기화] API 어댑터 연동...');
            
            // 전역 API 어댑터 확인
            if (window.apiEventAdapter) {
                this.apiAdapter = window.apiEventAdapter;
                console.log('✅ [초기화] API 어댑터 연동 완료');
            } else {
                console.warn('⚠️ [초기화] API 어댑터를 찾을 수 없음 - 폴백 모드');
                
                // 폴백: localStorage에서 직접 읽기
                const userData = localStorage.getItem('currentStudent');
                if (userData) {
                    this.userData = JSON.parse(userData);
                    console.log('📦 [초기화] localStorage에서 사용자 데이터 로드 완료');
                }
            }
            
        } catch (error) {
            console.error('❌ [초기화] API 어댑터 연동 실패:', error);
            // 에러 발생해도 계속 진행 (폴백 모드)
        }
    }

    // === 3. 사용자 데이터 로드 및 표시 (유지) ===
    async loadAndDisplayUserData() {
        try {
            console.log('🔄 [초기화] 사용자 데이터 로드...');
            
            // API 어댑터를 통한 데이터 로드
            if (this.apiAdapter && typeof this.apiAdapter.getUserData === 'function') {
                this.userData = await this.apiAdapter.getUserData();
            }
            
            // 폴백: localStorage에서 로드
            if (!this.userData) {
                const userData = localStorage.getItem('currentStudent');
                if (userData) {
                    this.userData = JSON.parse(userData);
                }
            }
            
            if (this.userData) {
                // 사용자별 활동 요구사항 추출
                this.userRequiredDays = this.userData.minimum_required_days || null;
                this.userMaximumDays = this.userData.maximum_allowed_days || null;
                this.dispatchEndDate = this.userData.dispatch_end_date || '2025-12-12';
                
                // 페이지 헤더 업데이트
                this.updatePageHeader();
                
                this.isUserDataLoaded = true;
                console.log('✅ [초기화] 사용자 데이터 로드 완료:', {
                    이름: this.userData.name,
                    학당: this.userData.sejong_institute,
                    최소활동일: this.userRequiredDays,
                    최대활동일: this.userMaximumDays
                });
                
                // 🔧 v1.2.0: 사용자 데이터 로드 완료 이벤트 발행
                this.eventBus.emit('userDataLoaded', {
                    userData: this.userData,
                    userRequirements: this.getUserRequirements()
                });
                
            } else {
                console.warn('⚠️ [초기화] 사용자 데이터를 찾을 수 없음');
            }
            
        } catch (error) {
            console.error('❌ [초기화] 사용자 데이터 로드 실패:', error);
        }
    }

    // === 4. 페이지 헤더 업데이트 (유지) ===
    updatePageHeader() {
        try {
            if (!this.userData) return;
            
            // 사용자 환영 메시지 업데이트
            if (this.pageElements.userWelcome && this.userData.name) {
                this.pageElements.userWelcome.textContent = `${this.userData.name}님의 항공권 신청`;
            }
            
            // 상세 정보 업데이트
            if (this.pageElements.userDetails && this.userData.sejong_institute) {
                const field = this.userData.field ? ` - ${this.userData.field}` : '';
                this.pageElements.userDetails.textContent = 
                    `${this.userData.sejong_institute}${field} 파견을 위한 항공권을 신청해주세요. 왕복 항공권만 신청 가능합니다.`;
            }
            
            console.log('✅ [초기화] 페이지 헤더 업데이트 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 페이지 헤더 업데이트 실패:', error);
        }
    }

    // === 5. 필수활동일 정보 표시 (유지) ===
    async displayRequiredDaysInfo() {
        try {
            console.log('🔄 [초기화] 필수활동일 정보 표시...');
            
            const requiredDaysEl = this.pageElements.requiredDays;
            if (!requiredDaysEl) {
                console.warn('⚠️ [초기화] requiredDays 요소를 찾을 수 없음');
                return;
            }
            
            if (this.userRequiredDays) {
                // 성공 상태로 표시
                requiredDaysEl.textContent = this.userRequiredDays;
                requiredDaysEl.className = 'value required-days-value success';
                
                console.log('✅ [초기화] 필수활동일 표시 완료:', this.userRequiredDays);
            } else {
                // 로딩 실패 상태로 표시
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.className = 'value required-days-value loading';
                
                console.warn('⚠️ [초기화] 필수활동일 데이터 없음 - 로딩중 표시');
            }
            
            this.initStatus.requiredDaysDisplayed = true;
            
        } catch (error) {
            console.error('❌ [초기화] 필수활동일 정보 표시 실패:', error);
            
            // 에러 상태로 표시
            const requiredDaysEl = this.pageElements.requiredDays;
            if (requiredDaysEl) {
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.className = 'value required-days-value error';
            }
        }
    }

    // === 6. 여권정보 체크 (유지) ===
    async checkPassportStatus() {
        try {
            console.log('🔄 [초기화] 여권정보 상태 체크...');
            
            let hasPassport = false;
            
            // API 어댑터를 통한 여권정보 확인
            if (this.apiAdapter && typeof this.apiAdapter.getPassportInfo === 'function') {
                const passportInfo = await this.apiAdapter.getPassportInfo();
                hasPassport = !!(passportInfo && passportInfo.passport_number);
            }
            
            // 폴백: 직접 API 호출
            if (!hasPassport && window.flightRequestAPI && typeof window.flightRequestAPI.getPassportInfo === 'function') {
                try {
                    const passportInfo = await window.flightRequestAPI.getPassportInfo();
                    hasPassport = !!(passportInfo && passportInfo.passport_number);
                } catch (error) {
                    console.warn('⚠️ [초기화] 여권정보 API 호출 실패:', error.message);
                }
            }
            
            // 여권정보 알림 처리
            const passportAlert = this.pageElements.passportAlert;
            if (passportAlert) {
                if (hasPassport) {
                    passportAlert.style.display = 'none';
                    console.log('✅ [초기화] 여권정보 확인됨 - 알림 숨김');
                } else {
                    passportAlert.style.display = 'block';
                    console.log('⚠️ [초기화] 여권정보 없음 - 알림 표시');
                    
                    // 여권정보 등록 버튼 이벤트 설정
                    this.setupPassportRegistrationButton();
                }
            }
            
            this.initStatus.passportCheckCompleted = true;
            
            // 🔧 v1.2.0: 여권정보 상태 이벤트 발행
            this.eventBus.emit('passportStatusChecked', {
                hasPassport: hasPassport,
                passportAlert: passportAlert !== null
            });
            
        } catch (error) {
            console.error('❌ [초기화] 여권정보 체크 실패:', error);
            
            // 에러 시 보수적으로 알림 표시
            const passportAlert = this.pageElements.passportAlert;
            if (passportAlert) {
                passportAlert.style.display = 'block';
            }
        }
    }

    // === 7. 여권정보 등록 버튼 설정 (유지) ===
    setupPassportRegistrationButton() {
        try {
            const registerBtn = document.getElementById('registerPassportBtn');
            if (registerBtn) {
                registerBtn.addEventListener('click', () => {
                    // 여권정보 페이지로 이동
                    if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.showPassportInfoPage === 'function') {
                        window.flightRequestCoordinator.showPassportInfoPage();
                    } else {
                        // 폴백: 간단한 페이지 전환
                        this.showPassportInfoPage();
                    }
                });
                
                console.log('✅ [초기화] 여권정보 등록 버튼 이벤트 설정 완료');
            }
            
        } catch (error) {
            console.error('❌ [초기화] 여권정보 등록 버튼 설정 실패:', error);
        }
    }

    // === 8. 기존 신청 내역 확인 (유지) ===
    async checkExistingRequest() {
        try {
            console.log('🔄 [초기화] 기존 신청 내역 확인...');
            
            let existingRequest = null;
            
            // API 어댑터를 통한 기존 신청 확인
            if (this.apiAdapter && typeof this.apiAdapter.getExistingFlightRequest === 'function') {
                existingRequest = await this.apiAdapter.getExistingFlightRequest();
            }
            
            // 폴백: 직접 API 호출
            if (!existingRequest && window.flightRequestAPI && typeof window.flightRequestAPI.getExistingRequest === 'function') {
                try {
                    existingRequest = await window.flightRequestAPI.getExistingRequest();
                } catch (error) {
                    console.warn('⚠️ [초기화] 기존 신청 API 호출 실패:', error.message);
                }
            }
            
            // UI 업데이트
            const existingRequestEl = this.pageElements.existingRequest;
            const requestFormEl = this.pageElements.requestForm;
            
            if (existingRequest) {
                // 기존 신청 내역 표시
                if (existingRequestEl) {
                    this.renderExistingRequest(existingRequest);
                    existingRequestEl.style.display = 'block';
                }
                
                // 신청 폼 숨김
                if (requestFormEl) {
                    requestFormEl.style.display = 'none';
                }
                
                console.log('✅ [초기화] 기존 신청 내역 발견:', existingRequest.status);
            } else {
                // 기존 신청 없음 - 신청 폼 표시
                if (existingRequestEl) {
                    existingRequestEl.style.display = 'none';
                }
                
                if (requestFormEl) {
                    requestFormEl.style.display = 'block';
                }
                
                console.log('✅ [초기화] 기존 신청 없음 - 새 신청 폼 표시');
            }
            
            // 🔧 v1.2.0: 기존 신청 확인 이벤트 발행
            this.eventBus.emit('existingRequestChecked', {
                hasExistingRequest: !!existingRequest,
                existingRequest: existingRequest
            });
            
        } catch (error) {
            console.error('❌ [초기화] 기존 신청 내역 확인 실패:', error);
            
            // 에러 시 기본적으로 신청 폼 표시
            const requestFormEl = this.pageElements.requestForm;
            if (requestFormEl) {
                requestFormEl.style.display = 'block';
            }
        }
    }

    // === 기존 신청 내역 렌더링 (유지) ===
    renderExistingRequest(requestData) {
        try {
            const existingRequestEl = this.pageElements.existingRequest;
            if (!existingRequestEl) return;
            
            const statusClass = this.getStatusClass(requestData.status);
            const statusText = this.getStatusText(requestData.status);
            
            existingRequestEl.innerHTML = `
                <div class="existing-request-card">
                    <div class="card-header">
                        <h3>기존 항공권 신청 내역</h3>
                        <span class="status-badge ${statusClass}">${statusText}</span>
                    </div>
                    <div class="card-content">
                        <div class="request-details">
                            <div class="detail-row">
                                <span class="label">신청일:</span>
                                <span class="value">${this.formatDate(requestData.created_at)}</span>
                            </div>
                            ${requestData.departure_date ? `
                                <div class="detail-row">
                                    <span class="label">출국일:</span>
                                    <span class="value">${this.formatDate(requestData.departure_date)}</span>
                                </div>
                            ` : ''}
                            ${requestData.return_date ? `
                                <div class="detail-row">
                                    <span class="label">귀국일:</span>
                                    <span class="value">${this.formatDate(requestData.return_date)}</span>
                                </div>
                            ` : ''}
                            ${requestData.ticket_price ? `
                                <div class="detail-row">
                                    <span class="label">가격:</span>
                                    <span class="value">${requestData.ticket_price.toLocaleString()} ${requestData.currency || 'KRW'}</span>
                                </div>
                            ` : ''}
                        </div>
                        ${this.renderStatusActions(requestData.status)}
                    </div>
                </div>
            `;
            
            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ [초기화] 기존 신청 내역 렌더링 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 기존 신청 내역 렌더링 실패:', error);
        }
    }

    // === 유틸리티 메서드들 (유지) ===
    
    getStatusClass(status) {
        const statusMap = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'rejected': 'status-rejected',
            'completed': 'status-completed'
        };
        return statusMap[status] || 'status-unknown';
    }
    
    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'completed': '완료됨'
        };
        return statusMap[status] || '알 수 없음';
    }
    
    formatDate(dateString) {
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
        } catch (error) {
            return dateString;
        }
    }
    
    renderStatusActions(status) {
        switch (status) {
            case 'approved':
                return `
                    <div class="status-actions">
                        <button class="btn btn-primary" onclick="window.flightRequestCoordinator?.showTicketSubmitModal?.()">
                            <i data-lucide="upload"></i>
                            항공권 제출
                        </button>
                    </div>
                `;
            case 'completed':
                return `
                    <div class="status-actions">
                        <button class="btn btn-secondary" onclick="window.flightRequestCoordinator?.showReceiptSubmitModal?.()">
                            <i data-lucide="receipt"></i>
                            영수증 제출
                        </button>
                    </div>
                `;
            default:
                return '';
        }
    }

    // === 폴백 메서드들 (유지) ===
    
    showPassportInfoPage() {
        try {
            const flightPage = document.getElementById('flightRequestPage');
            const passportPage = document.getElementById('passportInfoPage');
            
            if (flightPage && passportPage) {
                flightPage.classList.remove('active');
                flightPage.style.display = 'none';
                
                passportPage.classList.add('active');
                passportPage.style.display = 'block';
            }
            
        } catch (error) {
            console.error('❌ [초기화] 여권정보 페이지 표시 실패:', error);
        }
    }

    // === 🔧 v1.2.0: 리스너 정리 메서드 ===
    cleanupRevalidationListeners() {
        try {
            console.log('🗑️ [초기화] v1.2.0: 재검증 리스너 정리...');
            
            this.revalidationListeners.forEach(({ element, eventType, listener }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(eventType, listener);
                }
            });
            
            this.revalidationListeners = [];
            console.log('✅ [초기화] v1.2.0: 재검증 리스너 정리 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 재검증 리스너 정리 실패:', error);
        }
    }

    // === 외부 인터페이스 ===
    
    // 초기화 상태 확인
    isReady() {
        return this.isInitialized;
    }
    
    // 사용자 데이터 반환
    getUserData() {
        return this.userData ? { ...this.userData } : null;
    }
    
    // 사용자 활동 요구사항 반환
    getUserRequirements() {
        return {
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays,
            dispatchEndDate: this.dispatchEndDate,
            isLoaded: this.isUserDataLoaded
        };
    }
    
    // 초기화 상태 반환
    getInitStatus() {
        return { ...this.initStatus };
    }
    
    // 페이지 요소 참조 반환
    getPageElements() {
        return { ...this.pageElements };
    }
    
    // 🔧 v1.2.0: 재검증 상태 반환 (이벤트 기반)
    getRevalidationStatus() {
        return {
            lastValidationState: this.lastValidationState,
            isValidationInProgress: this.isValidationInProgress,
            listenersSetup: this.initStatus.revalidationListenersSetup,
            fieldsFound: this.initStatus.activityPeriodFieldsFound,
            activityPeriodFields: {
                arrivalDate: !!this.activityPeriodFields.arrivalDate,
                workEndDate: !!this.activityPeriodFields.workEndDate
            }
        };
    }
    
    // 필수활동일 정보 새로고침
    async refreshRequiredDaysInfo() {
        try {
            console.log('🔄 [초기화] 필수활동일 정보 새로고침...');
            
            // 사용자 데이터 다시 로드
            await this.loadAndDisplayUserData();
            
            // 필수활동일 정보 다시 표시
            await this.displayRequiredDaysInfo();
            
            console.log('✅ [초기화] 필수활동일 정보 새로고침 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 필수활동일 정보 새로고침 실패:', error);
        }
    }

    // 🔧 v1.2.0: 수동 재검증 트리거 (이벤트 기반)
    async triggerManualRevalidation() {
        try {
            if (this.isValidationInProgress) {
                console.warn('⚠️ [초기화] v1.2.0: 재검증이 이미 진행 중입니다');
                return false;
            }
            
            console.log('🔄 [초기화] v1.2.0: 수동 재검증 실행...');
            
            // 재검증 시작 이벤트 발행
            this.eventBus.emit('manualRevalidationStarted', {
                timestamp: Date.now(),
                trigger: 'manual'
            });
            
            const result = await this.performRevalidation();
            
            // 결과에 따른 이벤트 발행
            if (result.success) {
                this.eventBus.emit('flightSectionStateChangeRequest', {
                    action: 'enable',
                    reason: 'manualRevalidationSuccess',
                    message: '재검증 성공 - 항공권 신청 가능',
                    type: 'success',
                    validationResult: result
                });
            } else {
                this.eventBus.emit('flightSectionStateChangeRequest', {
                    action: 'disable',
                    reason: 'manualRevalidationFailed',
                    message: `수동 재검증 실패: ${result.reason}`,
                    type: 'error',
                    validationResult: result
                });
            }
            
            return result.success;
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 수동 재검증 실패:', error);
            return false;
        }
    }

    // 🔧 v1.2.0: 이벤트 리스너 등록 (외부에서 이벤트 구독 가능)
    on(eventName, callback) {
        this.eventBus.on(eventName, callback);
    }

    // 🔧 v1.2.0: 이벤트 발행 (외부에서 이벤트 트리거 가능)
    emit(eventName, data) {
        this.eventBus.emit(eventName, data);
    }
    
    // 디버깅 정보 반환
    getDebugInfo() {
        return {
            version: 'v1.2.0',
            isInitialized: this.isInitialized,
            initializationAttempts: this.initializationAttempts,
            initStatus: this.initStatus,
            userData: this.userData,
            userRequirements: {
                userRequiredDays: this.userRequiredDays,
                userMaximumDays: this.userMaximumDays,
                dispatchEndDate: this.dispatchEndDate,
                isUserDataLoaded: this.isUserDataLoaded
            },
            apiAdapter: !!this.apiAdapter,
            // 🔧 v1.2.0: 이벤트 기반 재검증 시스템 디버깅 정보
            revalidationSystem: {
                lastValidationState: this.lastValidationState,
                isValidationInProgress: this.isValidationInProgress,
                listenersSetup: this.initStatus.revalidationListenersSetup,
                fieldsFound: this.initStatus.activityPeriodFieldsFound,
                activityPeriodFields: this.activityPeriodFields,
                revalidationListenersCount: this.revalidationListeners.length,
                eventListenersCount: this.eventBus.listeners.size
            }
        };
    }

    // 🔧 v1.2.0: 정리 메서드
    destroy() {
        try {
            console.log('🗑️ [초기화] v1.2.0: 인스턴스 정리...');
            
            // 재검증 리스너 정리
            this.cleanupRevalidationListeners();
            
            // 이벤트 리스너 정리
            if (this.eventBus && this.eventBus.listeners) {
                this.eventBus.listeners.clear();
            }
            
            // 기타 정리
            this.apiAdapter = null;
            this.userData = null;
            this.pageElements = {};
            this.initStatus = {};
            this.lastValidationState = null;
            
            console.log('✅ [초기화] v1.2.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.2.0: 인스턴스 정리 실패:', error);
        }
    }
}

// 전역 스코프에 노출
window.FlightRequestInit = FlightRequestInit;

console.log('✅ FlightRequestInit v1.2.0 모듈 로드 완료 - 이벤트 기반 시스템');
console.log('🔧 v1.2.0 주요 변경사항:', {
    coreResponsibility: [
        '항공권 신청 페이지의 초기 세팅',
        'api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시', 
        '🔧 UI 직접 제어 제거, 이벤트 발행으로 변경',
        '실시간 활동기간 변경 감지 및 재검증 시스템 (이벤트 기반)'
    ],
    removedFeatures: [
        '🚫 disableFlightSectionWithMessage() 제거',
        '🚫 enableFlightSectionWithMessage() 제거',
        '🚫 updatePrerequisiteStatusMessage() 제거',
        '🚫 createPrerequisiteStatusMessage() 제거',
        '🚫 saveFlightSectionState() 제거',
        '🚫 restoreFlightSectionState() 제거',
        '🚫 모든 직접적 UI 제어 로직 제거'
    ],
    newFeatures: [
        '🆕 이벤트 기반 통신 시스템',
        '🆕 flightSectionStateChangeRequest 이벤트 발행',
        '🆕 revalidationCompleted 이벤트 발행',
        '🆕 activityPeriodChanged 이벤트 발행',
        '🆕 외부 이벤트 구독 인터페이스 (on/emit)',
        '🆕 단일 책임 원칙 적용 완료'
    ],
    benefits: [
        '책임 분리 완성: 초기화 ↔ UI 제어 완전 분리',
        '이벤트 기반 통신으로 결합도 감소',
        '단일 진실 공급원 원칙 적용',
        '유지보수성 및 테스트 가능성 향상',
        'UI 제어 로직 중앙 집중화 준비 완료'
    ]
});
console.log('🚀 v1.2.0 예상 효과:', {
    architecturalClarity: '모듈 간 명확한 책임 분리',
    maintainability: '단일 수정 지점으로 유지보수성 향상',
    reliability: '이벤트 기반 통신으로 안정성 향상',
    scalability: '추후 기능 확장 시 영향 범위 최소화'
});
