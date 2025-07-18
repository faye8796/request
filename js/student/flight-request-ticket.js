// flight-request-ticket.js - v2.1.0 통합 항공권 섹션 제어 시스템
// 🎯 핵심 책임:
//   1. 현지 활동기간 검증 로직 (항공권 날짜와 독립적)
//   2. 🆕 v2.1.0: 모든 항공권 정보 입력창 활성화/비활성화 통합 관리
//   3. 🆕 v2.1.0: 초기화 모듈의 이벤트를 수신하여 UI 제어
//   4. 항공권 정보 이미지 등록 및 Supabase 등록 기능
// 🔧 분리 완료: 초기화 로직은 flight-request-init.js로 완전 이전
// 🔧 v2.1.0: 단일 책임 원칙 - 항공권 섹션 제어의 유일한 관리 주체

console.log('🚀 FlightRequestTicket v2.1.0 로딩 시작 - 통합 항공권 섹션 제어 시스템');

// ================================
// 파트 1: 메인 FlightRequestTicket 클래스
// ================================

class FlightRequestTicket {
    constructor(apiService, uiService, passportService) {
        console.log('🔄 [티켓모듈] FlightRequestTicket v2.1.0 생성 - 통합 섹션 제어');
        
        // 의존성 주입 (초기화 모듈에서 주입)
        this.apiService = apiService;
        this.uiService = uiService;
        this.passportService = passportService;
        
        // 🆕 v2.1.0: 통합 항공권 섹션 제어 상태
        this.flightSectionControl = {
            isEnabled: false,
            lastStateChangeReason: 'initialization',
            lastStateChangeMessage: '초기화 중...',
            lastStateChangeTime: Date.now(),
            stateHistory: [],
            pendingStateChange: null
        };
        
        // 🆕 v2.1.0: 이벤트 시스템
        this.eventListeners = new Map();
        this.isEventSystemSetup = false;
        
        // 항공권 관련 데이터
        this.ticketData = {
            // 현지 활동기간
            actualArrivalDate: null,
            actualWorkEndDate: null,
            calculatedActivityDays: 0,
            
            // 항공권 정보
            departureDate: null,
            returnDate: null,
            departureAirport: null,
            arrivalAirport: null,
            
            // 가격 정보
            ticketPrice: null,
            currency: null,
            priceSource: null,
            
            // 구매 방식
            purchaseType: null,
            purchaseLink: null
        };
        
        // 🔧 v2.1.0: 사용자별 활동 요구사항 (초기화 모듈에서 주입)
        this.userRequirements = {
            userRequiredDays: null,
            userMaximumDays: null,
            dispatchEndDate: null,
            isLoaded: false
        };
        
        // 단계별 네비게이션
        this.currentStep = 1;
        this.totalSteps = 4;
        this.stepCompleted = {
            activityPeriod: false,
            purchaseMethod: false,
            flightInfo: false,
            imageUpload: false
        };
        
        // 검증 관련 상태
        this.validationDebounceTimer = null;
        this.returnValidationDebounceTimer = null;
        
        // 전제 조건 시스템 관련 상태
        this.isActivityPeriodCompleted = false;
        this.isActivityPeriodValid = false;
        this.flightSectionEnabled = false;
        
        // 파일 업로드 관련
        this.ticketImageFile = null;
        this.receiptImageFile = null;
        
        console.log('✅ [티켓모듈] FlightRequestTicket v2.1.0 생성 완료');
        this.init();
    }

    // ================================
    // 파트 2: 🆕 v2.1.0 통합 초기화
    // ================================

    init() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0 통합 초기화 시작...');
            
            // 🆕 v2.1.0: 이벤트 시스템 설정 (최우선)
            this.setupEventSystem();
            
            // 기존 초기화
            this.bindEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🆕 v2.1.0: 초기 항공권 섹션 상태 설정
            this.setInitialFlightSectionState();
            
            console.log('✅ [티켓모듈] v2.1.0 통합 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0 초기화 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 이벤트 시스템 설정 ===
    setupEventSystem() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 이벤트 시스템 설정...');
            
            // 1. 초기화 모듈 이벤트 구독
            this.subscribeToInitModuleEvents();
            
            // 2. 조정자 이벤트 구독
            this.subscribeToCoordinatorEvents();
            
            // 3. 전역 이벤트 시스템 연결
            this.connectToGlobalEventSystem();
            
            this.isEventSystemSetup = true;
            console.log('✅ [티켓모듈] v2.1.0: 이벤트 시스템 설정 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 이벤트 시스템 설정 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 초기화 모듈 이벤트 구독 ===
    subscribeToInitModuleEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독...');
            
            // 1. 항공권 섹션 상태 변경 요청 이벤트
            this.onEvent('flightSectionStateChangeRequest', (data) => {
                this.handleFlightSectionStateChangeRequest(data);
            });
            
            // 2. 재검증 완료 이벤트
            this.onEvent('revalidationCompleted', (data) => {
                this.handleRevalidationCompleted(data);
            });
            
            // 3. 활동기간 변경 이벤트
            this.onEvent('activityPeriodChanged', (data) => {
                this.handleActivityPeriodChanged(data);
            });
            
            // 4. 사용자 데이터 로드 완료 이벤트
            this.onEvent('userDataLoaded', (data) => {
                this.handleUserDataLoaded(data);
            });
            
            // 5. 초기화 완료 이벤트
            this.onEvent('initializationCompleted', (data) => {
                this.handleInitializationCompleted(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 조정자 이벤트 구독 ===
    subscribeToCoordinatorEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 이벤트 구독...');
            
            // 조정자의 전역 상태 변경 이벤트
            this.onEvent('coordinator:stateChanged', (data) => {
                this.handleCoordinatorStateChanged(data);
            });
            
            // 조정자의 재검증 관련 이벤트
            this.onEvent('coordinator:revalidationTriggered', (data) => {
                this.handleCoordinatorRevalidation(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 이벤트 구독 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 전역 이벤트 시스템 연결 ===
    connectToGlobalEventSystem() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결...');
            
            // 조정자 이벤트 시스템과 연결
            if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.on === 'function') {
                // 조정자를 통한 초기화 모듈 이벤트 수신
                window.flightRequestCoordinator.on('init:flightSectionStateChangeRequest', (event) => {
                    this.handleFlightSectionStateChangeRequest(event.detail);
                });
                
                window.flightRequestCoordinator.on('init:revalidationCompleted', (event) => {
                    this.handleRevalidationCompleted(event.detail);
                });
                
                window.flightRequestCoordinator.on('init:activityPeriodChanged', (event) => {
                    this.handleActivityPeriodChanged(event.detail);
                });
                
                console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 시스템 연결 완료');
            }
            
            // 초기화 모듈 직접 연결 (폴백)
            if (window.flightRequestCoordinator && window.flightRequestCoordinator.getModule) {
                const initModule = window.flightRequestCoordinator.getModule('init');
                if (initModule && typeof initModule.on === 'function') {
                    initModule.on('flightSectionStateChangeRequest', (data) => {
                        this.handleFlightSectionStateChangeRequest(data);
                    });
                    
                    initModule.on('revalidationCompleted', (data) => {
                        this.handleRevalidationCompleted(data);
                    });
                    
                    console.log('✅ [티켓모듈] v2.1.0: 초기화 모듈 직접 연결 완료');
                }
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 이벤트 헬퍼 메서드 ===
    onEvent(eventName, handler) {
        try {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(handler);
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 이벤트 구독 실패 (${eventName}):`, error);
        }
    }

    emitEvent(eventName, data) {
        try {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.warn(`⚠️ [티켓모듈] v2.1.0: 이벤트 핸들러 실행 실패 (${eventName}):`, error);
                }
            });
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 이벤트 발행 실패 (${eventName}):`, error);
        }
    }

    // ================================
    // 파트 3: 🆕 v2.1.0 통합 항공권 섹션 제어 시스템
    // ================================

    // === 🆕 v2.1.0: 항공권 섹션 상태 변경 요청 처리 ===
    handleFlightSectionStateChangeRequest(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 항공권 섹션 상태 변경 요청 처리:', data);
            
            // 상태 변경 히스토리 기록
            this.recordStateChangeHistory(data);
            
            // 상태에 따른 처리
            if (data.action === 'enable') {
                this.enableFlightSectionUnified(data);
            } else if (data.action === 'disable') {
                this.disableFlightSectionUnified(data);
            } else {
                console.warn('⚠️ [티켓모듈] v2.1.0: 알 수 없는 상태 변경 액션:', data.action);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 항공권 섹션 상태 변경 요청 처리 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 통합 항공권 섹션 활성화 ===
    enableFlightSectionUnified(data) {
        try {
            console.log('🔓 [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화:', data);
            
            // 1. 내부 상태 업데이트
            this.flightSectionControl.isEnabled = true;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            // 2. UI 업데이트
            this.updateFlightSectionUI(true, data);
            
            // 3. 입력 필드 활성화
            this.toggleFlightInputFields(true);
            
            // 4. 상태 메시지 업데이트
            this.updateUnifiedStatusMessage(data);
            
            // 5. 이벤트 발행
            this.emitEvent('flightSectionEnabled', {
                reason: data.reason,
                message: data.message,
                timestamp: Date.now(),
                validationResult: data.validationResult
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 통합 항공권 섹션 비활성화 ===
    disableFlightSectionUnified(data) {
        try {
            console.log('🔒 [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화:', data);
            
            // 1. 내부 상태 업데이트
            this.flightSectionControl.isEnabled = false;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 비활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            // 2. UI 업데이트
            this.updateFlightSectionUI(false, data);
            
            // 3. 입력 필드 비활성화
            this.toggleFlightInputFields(false);
            
            // 4. 상태 메시지 업데이트
            this.updateUnifiedStatusMessage(data);
            
            // 5. 이벤트 발행
            this.emitEvent('flightSectionDisabled', {
                reason: data.reason,
                message: data.message,
                timestamp: Date.now(),
                validationResult: data.validationResult
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 통합 상태 메시지 업데이트 ===
    updateUnifiedStatusMessage(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 통합 상태 메시지 업데이트...', data);
            
            let statusElement = document.getElementById('prerequisiteStatus') ||
                               document.querySelector('.prerequisite-status');
            
            if (!statusElement) {
                statusElement = this.createUnifiedStatusElement();
            }
            
            if (statusElement) {
                // 모든 기존 클래스 제거
                statusElement.className = 'prerequisite-status';
                
                // 메시지 타입에 따른 스타일 적용
                const messageType = data.type || 'info';
                statusElement.classList.add(messageType);
                
                // 아이콘 매핑
                const iconMap = {
                    'success': 'check-circle',
                    'error': 'alert-circle',
                    'warning': 'alert-triangle',
                    'info': 'info'
                };
                
                // 상태별 메시지 렌더링
                statusElement.innerHTML = `
                    <div class="status-icon ${messageType}">
                        <i data-lucide="${iconMap[messageType] || 'info'}"></i>
                    </div>
                    <div class="status-message">
                        <strong>${this.getStatusTitle(data)}</strong>
                        <span>${data.message || '상태 메시지 없음'}</span>
                    </div>
                `;
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 상태 메시지 업데이트 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 상태 메시지 업데이트 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 상태 제목 결정 ===
    getStatusTitle(data) {
        const titleMap = {
            'initialization': '시스템 초기화',
            'activityPeriodChanged': '활동기간 변경 감지',
            'revalidationSuccess': '재검증 완료',
            'revalidationFailed': '재검증 실패',
            'manualRevalidationSuccess': '수동 재검증 성공',
            'manualRevalidationFailed': '수동 재검증 실패',
            'revalidationError': '재검증 오류'
        };
        
        return titleMap[data.reason] || '항공권 섹션 상태';
    }

    // === 🆕 v2.1.0: 통합 상태 요소 생성 ===
    createUnifiedStatusElement() {
        try {
            const statusElement = document.createElement('div');
            statusElement.id = 'prerequisiteStatus';
            statusElement.className = 'prerequisite-status info';
            
            const flightInfoSection = this.findFlightInfoSection();
            
            if (flightInfoSection) {
                flightInfoSection.insertBefore(statusElement, flightInfoSection.firstChild);
            } else {
                const form = document.getElementById('flightRequestForm') || 
                            document.querySelector('form') ||
                            document.querySelector('main') ||
                            document.querySelector('.container');
                            
                if (form) {
                    form.insertBefore(statusElement, form.firstChild);
                }
            }
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 상태 요소 생성 완료');
            return statusElement;
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 상태 요소 생성 실패:', error);
            return null;
        }
    }

    // === 🆕 v2.1.0: 항공권 섹션 UI 업데이트 ===
    updateFlightSectionUI(enabled, data) {
        try {
            console.log(`🔄 [티켓모듈] v2.1.0: 항공권 섹션 UI ${enabled ? '활성화' : '비활성화'}...`);
            
            const flightSection = this.findFlightInfoSection();
            
            if (flightSection) {
                if (enabled) {
                    flightSection.classList.remove('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.add('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '1';
                    flightSection.style.pointerEvents = 'auto';
                    
                    // 추가적인 활성화 스타일
                    flightSection.style.filter = 'none';
                    flightSection.style.backgroundColor = '';
                } else {
                    flightSection.classList.add('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.remove('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '0.5';
                    flightSection.style.pointerEvents = 'none';
                    
                    // 추가적인 비활성화 스타일
                    flightSection.style.filter = 'grayscale(50%)';
                    flightSection.style.backgroundColor = '#f9fafb';
                }
                
                // 데이터 속성으로 상태 기록
                flightSection.setAttribute('data-enabled', enabled.toString());
                flightSection.setAttribute('data-last-change-reason', data.reason || 'unknown');
                flightSection.setAttribute('data-last-change-time', Date.now().toString());
            }
            
            console.log(`✅ [티켓모듈] v2.1.0: 항공권 섹션 UI ${enabled ? '활성화' : '비활성화'} 완료`);
            
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 항공권 섹션 UI ${enabled ? '활성화' : '비활성화'} 실패:`, error);
        }
    }

    // === 🆕 v2.1.0: 상태 변경 히스토리 기록 ===
    recordStateChangeHistory(data) {
        try {
            const historyEntry = {
                timestamp: Date.now(),
                action: data.action,
                reason: data.reason,
                message: data.message,
                type: data.type,
                validationResult: data.validationResult
            };
            
            this.flightSectionControl.stateHistory.push(historyEntry);
            
            // 히스토리 크기 제한 (최대 50개)
            if (this.flightSectionControl.stateHistory.length > 50) {
                this.flightSectionControl.stateHistory.shift();
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 상태 변경 히스토리 기록 실패:', error);
        }
    }

    // === 🆕 v2.1.0: 초기 항공권 섹션 상태 설정 ===
    setInitialFlightSectionState() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정...');
            
            // 초기에는 항상 비활성화 상태로 시작
            this.disableFlightSectionUnified({
                action: 'disable',
                reason: 'initialization',
                message: '항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.',
                type: 'info'
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정 실패:', error);
        }
    }

    // ================================
    // 파트 4: 🆕 v2.1.0 이벤트 핸들러들
    // ================================

    // === 재검증 완료 처리 ===
    handleRevalidationCompleted(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 재검증 완료 처리:', data);
            
            // 재검증 결과에 따른 섹션 상태 업데이트는 이미 handleFlightSectionStateChangeRequest에서 처리됨
            // 여기서는 추가적인 로직만 처리
            
            if (data.success && data.result) {
                // 검증 성공 시 추가 작업
                this.emitEvent('validationSuccess', {
                    result: data.result,
                    timestamp: Date.now()
                });
            } else {
                // 검증 실패 시 추가 작업
                this.emitEvent('validationFailed', {
                    result: data.result,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 재검증 완료 처리 실패:', error);
        }
    }

    // === 활동기간 변경 처리 ===
    handleActivityPeriodChanged(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 활동기간 변경 처리:', data);
            
            // 활동기간이 변경되면 기존 검증 상태 리셋
            this.resetValidationState();
            
            // 이벤트 발행
            this.emitEvent('activityPeriodUpdated', {
                fieldType: data.fieldType,
                newValue: data.newValue,
                timestamp: data.timestamp || Date.now()
            });
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 활동기간 변경 처리 실패:', error);
        }
    }

    // === 사용자 데이터 로드 완료 처리 ===
    handleUserDataLoaded(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 사용자 데이터 로드 완료 처리:', data);
            
            // 사용자 요구사항 업데이트
            if (data.userRequirements) {
                this.setUserRequirements(data.userRequirements);
            }
            
            // 이벤트 발행
            this.emitEvent('userDataReady', {
                userData: data.userData,
                userRequirements: data.userRequirements,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 사용자 데이터 로드 완료 처리 실패:', error);
        }
    }

    // === 초기화 완료 처리 ===
    handleInitializationCompleted(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기화 완료 처리:', data);
            
            // 초기화 완료 후 초기 검증 트리거
            setTimeout(() => {
                this.triggerValidation();
            }, 100);
            
            // 이벤트 발행
            this.emitEvent('initializationReady', {
                success: data.success,
                userData: data.userData,
                userRequirements: data.userRequirements,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기화 완료 처리 실패:', error);
        }
    }

    // === 조정자 상태 변경 처리 ===
    handleCoordinatorStateChanged(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 상태 변경 처리:', data);
            
            // 조정자의 전역 상태와 동기화
            if (data.current && data.current.flightSectionState) {
                const coordinatorFlightState = data.current.flightSectionState;
                
                if (coordinatorFlightState !== this.getFlightSectionState()) {
                    // 조정자 상태와 불일치 시 동기화
                    this.syncWithCoordinatorState(coordinatorFlightState);
                }
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 상태 변경 처리 실패:', error);
        }
    }

    // === 조정자 재검증 처리 ===
    handleCoordinatorRevalidation(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 재검증 처리:', data);
            
            // 조정자에서 트리거된 재검증에 대한 응답
            this.emitEvent('coordinatorRevalidationReceived', {
                data: data,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 재검증 처리 실패:', error);
        }
    }

    // ================================
    // 파트 5: 🆕 v2.1.0 헬퍼 메서드들
    // ================================

    // === 검증 상태 리셋 ===
    resetValidationState() {
        try {
            this.isActivityPeriodCompleted = false;
            this.isActivityPeriodValid = false;
            this.stepCompleted.activityPeriod = false;
            
            console.log('✅ [티켓모듈] v2.1.0: 검증 상태 리셋 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 검증 상태 리셋 실패:', error);
        }
    }

    // === 조정자 상태와 동기화 ===
    syncWithCoordinatorState(coordinatorFlightState) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 상태와 동기화:', coordinatorFlightState);
            
            const shouldEnable = coordinatorFlightState === 'enabled';
            
            if (shouldEnable !== this.flightSectionControl.isEnabled) {
                const syncData = {
                    action: shouldEnable ? 'enable' : 'disable',
                    reason: 'coordinatorSync',
                    message: `조정자 상태와 동기화 (${coordinatorFlightState})`,
                    type: 'info'
                };
                
                if (shouldEnable) {
                    this.enableFlightSectionUnified(syncData);
                } else {
                    this.disableFlightSectionUnified(syncData);
                }
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 상태 동기화 실패:', error);
        }
    }

    // === 현재 항공권 섹션 상태 반환 ===
    getFlightSectionState() {
        if (this.flightSectionControl.isEnabled) {
            return 'enabled';
        } else {
            return 'disabled';
        }
    }

    // === 항공권 섹션 제어 상태 반환 ===
    getFlightSectionControlStatus() {
        return {
            ...this.flightSectionControl,
            currentState: this.getFlightSectionState(),
            eventSystemSetup: this.isEventSystemSetup
        };
    }
            } catch (error) {
                // CSS4 선택자 지원하지 않는 경우 무시
            }
        }
        
        return null;
    }

    // 🚫 v2.1.0: 기존 전제조건 상태 메시지 메서드들 제거됨
    // - updatePrerequisiteStatusMessage() → updateUnifiedStatusMessage()로 대체
    // - createPrerequisiteStatusElement() → createUnifiedStatusElement()로 대체

    // ================================
    // 기타 처리 메서드들 (기존 유지)
    // ================================

    // 구매방식 변경 처리
    handlePurchaseMethodChange() {
        try {
            const selectedMethod = document.querySelector('input[name="purchaseType"]:checked')?.value;
            
            if (selectedMethod) {
                this.ticketData.purchaseType = selectedMethod;
                this.updatePurchaseMethodUI(selectedMethod);
                console.log('✅ [구매방식] 변경 처리 완료:', selectedMethod);
            }
            
        } catch (error) {
            console.error('❌ [구매방식] 변경 처리 실패:', error);
        }
    }

    // 구매방식 UI 업데이트
    updatePurchaseMethodUI(method) {
        try {
            const linkSection = document.getElementById('purchaseLinkSection');
            
            if (linkSection) {
                if (method === 'direct') {
                    linkSection.style.display = 'block';
                } else {
                    linkSection.style.display = 'none';
                }
            }
            
        } catch (error) {
            console.error('❌ [구매방식UI] 업데이트 실패:', error);
        }
    }

    // 항공권 이미지 업로드 처리
    handleFlightImageUpload(event) {
        try {
            const file = event.target.files[0];
            
            if (file) {
                this.ticketImageFile = file;
                this.updateImagePreview('flightImagePreview', file);
                console.log('✅ [이미지] 항공권 이미지 업로드 완료:', file.name);
            }
            
        } catch (error) {
            console.error('❌ [이미지] 항공권 이미지 업로드 실패:', error);
        }
    }

    // 영수증 이미지 업로드 처리
    handleReceiptImageUpload(event) {
        try {
            const file = event.target.files[0];
            
            if (file) {
                this.receiptImageFile = file;
                this.updateImagePreview('receiptImagePreview', file);
                console.log('✅ [이미지] 영수증 이미지 업로드 완료:', file.name);
            }
            
        } catch (error) {
            console.error('❌ [이미지] 영수증 이미지 업로드 실패:', error);
        }
    }

    // 이미지 미리보기 업데이트
    updateImagePreview(previewId, file) {
        try {
            const preview = document.getElementById(previewId);
            
            if (preview && file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    preview.innerHTML = `
                        <img src="${e.target.result}" alt="미리보기" style="max-width: 200px; max-height: 200px;">
                        <p>${file.name}</p>
                    `;
                };
                reader.readAsDataURL(file);
            }
            
        } catch (error) {
            console.error('❌ [이미지] 미리보기 업데이트 실패:', error);
        }
    }

    // 가격 정보 검증
    validatePriceInfo() {
        try {
            const price = document.getElementById('ticketPrice')?.value;
            const currency = document.getElementById('currency')?.value;
            
            if (price && currency) {
                this.ticketData.ticketPrice = parseFloat(price);
                this.ticketData.currency = currency;
                
                console.log('✅ [가격검증] 가격 정보 검증 완료:', {
                    price: this.ticketData.ticketPrice,
                    currency: this.ticketData.currency
                });
                
                return true;
            }
            
            return false;
            
        } catch (error) {
            console.error('❌ [가격검증] 가격 정보 검증 실패:', error);
            return false;
        }
    }

    // 제출 처리
    async handleSubmit() {
        try {
            console.log('🔄 [제출] 항공권 신청 제출 시작...');
            
            // 전체 검증
            if (!this.validateAllData()) {
                console.warn('⚠️ [제출] 검증 실패로 제출 중단');
                return;
            }
            
            // 로딩 상태 표시
            this.setSubmitLoading(true);
            
            // API를 통한 제출
            const submitData = this.prepareSubmitData();
            const result = await this.apiService.submitFlightRequest(submitData, this.ticketImageFile);
            
            if (result.success) {
                this.showSuccess('항공권 신청이 성공적으로 제출되었습니다.');
                this.resetForm();
            } else {
                this.showError('항공권 신청 제출에 실패했습니다.');
            }
            
        } catch (error) {
            console.error('❌ [제출] 항공권 신청 제출 실패:', error);
            this.showError('항공권 신청 제출 중 오류가 발생했습니다.');
        } finally {
            this.setSubmitLoading(false);
        }
    }

    // 전체 데이터 검증
    validateAllData() {
        try {
            // 활동기간 검증
            const activityValidation = this.validateActivityPeriod();
            if (!activityValidation.valid) {
                this.showError('현지 활동기간을 올바르게 입력해주세요.');
                return false;
            }
            
            // 항공권 날짜 검증
            const flightValidation = this.validateFlightDatesOnly();
            if (!flightValidation.valid) {
                this.showError(flightValidation.message);
                return false;
            }
            
            // 가격 정보 검증
            if (!this.validatePriceInfo()) {
                this.showError('가격 정보를 올바르게 입력해주세요.');
                return false;
            }
            
            // 필수 파일 검증
            if (!this.ticketImageFile) {
                this.showError('항공권 이미지를 업로드해주세요.');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [검증] 전체 데이터 검증 실패:', error);
            return false;
        }
    }

    // 제출 데이터 준비
    prepareSubmitData() {
        return {
            // 활동기간
            actualArrivalDate: this.ticketData.actualArrivalDate,
            actualWorkEndDate: this.ticketData.actualWorkEndDate,
            calculatedActivityDays: this.ticketData.calculatedActivityDays,
            
            // 항공권 정보
            departureDate: document.getElementById('departureDate')?.value,
            returnDate: document.getElementById('returnDate')?.value,
            departureAirport: document.getElementById('departureAirport')?.value,
            arrivalAirport: document.getElementById('arrivalAirport')?.value,
            
            // 가격 정보
            ticketPrice: this.ticketData.ticketPrice,
            currency: this.ticketData.currency,
            priceSource: document.getElementById('priceSource')?.value,
            
            // 구매 방식
            purchaseType: this.ticketData.purchaseType,
            purchaseLink: document.getElementById('purchaseLink')?.value
        };
    }

    // ================================
    // 기본 메서드들 (기존 유지)
    // ================================

    setupStepNavigation() {
        console.log('✅ [티켓모듈] 단계별 네비게이션 설정 완료');
    }

    async loadTicketInfo() {
        try {
            if (this.apiService && this.apiService.loadExistingFlightRequest) {
                const existingRequest = await this.apiService.loadExistingFlightRequest();
                if (existingRequest) {
                    this.populateFormWithExistingData(existingRequest);
                }
            }
            
            console.log('✅ [티켓모듈] 기존 항공권 정보 로드 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] 기존 항공권 정보 로드 실패:', error);
        }
    }

    // 기존 데이터로 폼 채우기
    populateFormWithExistingData(data) {
        try {
            if (data.actualArrivalDate) {
                const arrivalEl = document.getElementById('actualArrivalDate');
                if (arrivalEl) arrivalEl.value = data.actualArrivalDate;
            }
            
            if (data.actualWorkEndDate) {
                const workEndEl = document.getElementById('actualWorkEndDate');
                if (workEndEl) workEndEl.value = data.actualWorkEndDate;
            }
            
            // 즉시 검증 트리거
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            
        } catch (error) {
            console.error('❌ [폼채우기] 기존 데이터 채우기 실패:', error);
        }
    }

    // 폼 리셋
    resetForm() {
        try {
            const form = document.getElementById('flightRequestForm');
            if (form) {
                form.reset();
            }
            
            this.ticketData = {
                actualArrivalDate: null,
                actualWorkEndDate: null,
                calculatedActivityDays: 0,
                departureDate: null,
                returnDate: null,
                departureAirport: null,
                arrivalAirport: null,
                ticketPrice: null,
                currency: null,
                priceSource: null,
                purchaseType: null,
                purchaseLink: null
            };
            
            this.ticketImageFile = null;
            this.receiptImageFile = null;
            
            console.log('✅ [폼리셋] 폼 리셋 완료');
            
        } catch (error) {
            console.error('❌ [폼리셋] 폼 리셋 실패:', error);
        }
    }

    // 제출 로딩 상태 설정
    setSubmitLoading(loading) {
        try {
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                if (loading) {
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = '<i data-lucide="loader-2"></i>제출 중...';
                } else {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '항공권 신청 제출';
                }
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [제출로딩] 제출 로딩 상태 설정 실패:', error);
        }
    }

    // 성공 메시지 표시
    showSuccess(message) {
        try {
            if (this.uiService && this.uiService.showSuccess) {
                this.uiService.showSuccess(message);
            } else {
                console.log('✅ [성공]', message);
                alert(message);
            }
        } catch (error) {
            console.error('❌ [성공메시지] 표시 실패:', error);
        }
    }

    // 에러 메시지 표시
    showError(message) {
        try {
            if (this.uiService && this.uiService.showError) {
                this.uiService.showError(message);
            } else {
                console.error('❌ [에러]', message);
                alert(message);
            }
        } catch (error) {
            console.error('❌ [에러메시지] 표시 실패:', error);
        }
    }

    // ================================
    // 🆕 v2.1.0: 확장된 외부 인터페이스
    // ================================

    // 검증 트리거
    triggerValidation() {
        try {
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            console.log('✅ [외부인터페이스] v2.1.0: 검증 트리거 완료');
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 검증 트리거 실패:', error);
        }
    }

    // 티켓 데이터 반환
    getTicketData() {
        return { ...this.ticketData };
    }

    // 🔧 v2.1.0: 전제조건 상태 반환 (통합 제어 시스템 반영)
    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionControl.isEnabled, // 🔧 통합 상태 반영
            flightSectionControlStatus: this.getFlightSectionControlStatus() // 🆕 추가 정보
        };
    }

    // 파일 제거
    removeFile(fileType) {
        try {
            if (fileType === 'ticket') {
                this.ticketImageFile = null;
                const preview = document.getElementById('flightImagePreview');
                if (preview) preview.innerHTML = '';
            } else if (fileType === 'receipt') {
                this.receiptImageFile = null;
                const preview = document.getElementById('receiptImagePreview');
                if (preview) preview.innerHTML = '';
            }
            
            console.log(`✅ [파일제거] ${fileType} 파일 제거 완료`);
            
        } catch (error) {
            console.error(`❌ [파일제거] ${fileType} 파일 제거 실패:`, error);
        }
    }

    // 🆕 v2.1.0: 수동 항공권 섹션 제어 (외부에서 호출 가능)
    manualEnableFlightSection(reason = 'manual', message = '수동으로 활성화됨') {
        try {
            this.enableFlightSectionUnified({
                action: 'enable',
                reason: reason,
                message: message,
                type: 'info'
            });
            return true;
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 수동 활성화 실패:', error);
            return false;
        }
    }

    manualDisableFlightSection(reason = 'manual', message = '수동으로 비활성화됨') {
        try {
            this.disableFlightSectionUnified({
                action: 'disable',
                reason: reason,
                message: message,
                type: 'info'
            });
            return true;
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 수동 비활성화 실패:', error);
            return false;
        }
    }

    // 🆕 v2.1.0: 재검증 결과 처리 (외부에서 호출 가능)
    handleRevalidationResult(result) {
        try {
            console.log('🔄 [외부인터페이스] v2.1.0: 재검증 결과 처리:', result);
            
            if (result && result.success) {
                this.enableFlightSectionUnified({
                    action: 'enable',
                    reason: 'externalRevalidationSuccess',
                    message: '외부 재검증 성공 - 항공권 신청 가능',
                    type: 'success',
                    validationResult: result
                });
            } else {
                this.disableFlightSectionUnified({
                    action: 'disable',
                    reason: 'externalRevalidationFailed',
                    message: `외부 재검증 실패: ${result?.reason || '알 수 없는 오류'}`,
                    type: 'error',
                    validationResult: result
                });
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 재검증 결과 처리 실패:', error);
            return false;
        }
    }

    // 🆕 v2.1.0: 활동기간 변경 처리 (외부에서 호출 가능)
    handleActivityPeriodChange(data) {
        try {
            console.log('🔄 [외부인터페이스] v2.1.0: 활동기간 변경 처리:', data);
            
            // 검증 상태 리셋
            this.resetValidationState();
            
            // 즉시 비활성화
            this.disableFlightSectionUnified({
                action: 'disable',
                reason: 'activityPeriodChangedExternal',
                message: '외부에서 활동기간 변경 감지 - 재검증 필요',
                type: 'warning'
            });
            
            return true;
            
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 활동기간 변경 처리 실패:', error);
            return false;
        }
    }

    // 🆕 v2.1.0: 전역 재검증 결과 처리 (조정자에서 호출)
    handleGlobalRevalidationResult(result) {
        try {
            console.log('🔄 [외부인터페이스] v2.1.0: 전역 재검증 결과 처리:', result);
            
            return this.handleRevalidationResult(result);
            
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 전역 재검증 결과 처리 실패:', error);
            return false;
        }
    }

    // 🆕 v2.1.0: 이벤트 시스템 상태 반환
    getEventSystemStatus() {
        return {
            isEventSystemSetup: this.isEventSystemSetup,
            eventListenersCount: this.eventListeners.size,
            registeredEvents: Array.from(this.eventListeners.keys())
        };
    }

    // 디버깅 정보 반환 (v2.1.0 확장)
    getDebugInfo() {
        return {
            version: '2.1.0',
            ticketData: this.ticketData,
            userRequirements: this.userRequirements,
            prerequisiteStatus: this.getPrerequisiteStatus(),
            flightSectionControl: this.flightSectionControl, // 🆕 통합 제어 상태
            eventSystemStatus: this.getEventSystemStatus(), // 🆕 이벤트 시스템 상태
            hasApiService: !!this.apiService,
            hasUiService: !!this.uiService,
            hasPassportService: !!this.passportService
        };
    }

    // 🆕 v2.1.0: 정리 메서드
    destroy() {
        try {
            console.log('🗑️ [티켓모듈] v2.1.0: 인스턴스 정리...');
            
            // 이벤트 리스너 정리
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            // 디바운스 타이머 정리
            if (this.validationDebounceTimer) {
                clearTimeout(this.validationDebounceTimer);
            }
            if (this.returnValidationDebounceTimer) {
                clearTimeout(this.returnValidationDebounceTimer);
            }
            
            // 상태 초기화
            this.flightSectionControl = null;
            this.ticketData = null;
            this.userRequirements = null;
            
            console.log('✅ [티켓모듈] v2.1.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 인스턴스 정리 실패:', error);
        }
    }
}

// ================================
// 전역 스코프 노출
// ================================

// 전역 스코프에 클래스 노출
window.FlightRequestTicket = FlightRequestTicket;

console.log('✅ FlightRequestTicket v2.1.0 모듈 로드 완료 - 통합 항공권 섹션 제어 시스템');
console.log('🎯 v2.1.0 핵심 변경사항:', {
    responsibilities: [
        '현지 활동기간 검증 로직 (항공권 날짜와 독립적)',
        '🆕 모든 항공권 정보 입력창 활성화/비활성화 통합 관리',
        '🆕 초기화 모듈의 이벤트를 수신하여 UI 제어',
        '항공권 정보 이미지 등록 및 Supabase 등록 기능'
    ],
    newFeatures: [
        '🆕 통합 항공권 섹션 제어 시스템',
        '🆕 이벤트 기반 통신 시스템',
        '🆕 flightSectionStateChangeRequest 이벤트 수신',
        '🆕 revalidationCompleted 이벤트 처리',
        '🆕 통합 상태 메시지 시스템',
        '🆕 상태 변경 히스토리 기록',
        '🆕 외부 인터페이스 확장 (수동 제어, 재검증 처리)',
        '🆕 조정자와의 상태 동기화'
    ],
    improvements: [
        '단일 책임 원칙 완성: 항공권 섹션 제어의 유일한 관리 주체',
        '이벤트 기반 통신으로 결합도 감소',
        '중복 로직 제거 및 코드 일관성 향상',
        '상태 추적 및 디버깅 용이성 확보',
        '확장 가능한 외부 인터페이스 제공'
    ]
});
console.log('🚀 v2.1.0 예상 효과:', {
    singleResponsibility: '항공권 섹션 제어 로직 완전 통합',
    maintainability: '단일 수정 지점으로 유지보수성 극대화',
    reliability: '이벤트 기반 통신으로 안정성 향상',
    scalability: '확장 가능한 아키텍처로 미래 요구사항 대응'
});
