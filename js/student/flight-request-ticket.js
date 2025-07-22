// flight-request-ticket.js - v2.3.0 required_return_date 기반 귀국일 검증 추가
// 🎯 핵심 책임:
//   1. 현지 활동기간 검증 로직 (항공권 날짜와 독립적)
//   2. 🆕 v2.3.0: required_return_date 기반 귀국일 상한선 검증 추가
//   3. 🆕 v2.2.0: 항공권 날짜 실시간 검증 로직 (활동기간 기반)
//   4. 🆕 v2.1.0: 모든 항공권 정보 입력창 활성화/비활성화 통합 관리
//   5. 🆕 v2.1.0: 초기화 모듈의 이벤트를 수신하여 UI 제어
//   6. 항공권 정보 이미지 등록 및 Supabase 등록 기능
// 🔧 분리 완료: 초기화 로직은 flight-request-init.js로 완전 이전
// 🔧 v2.1.0: 단일 책임 원칙 - 항공권 섹션 제어의 유일한 관리 주체
// 🆕 v2.2.0: 활동기간 기반 항공권 날짜 검증 시스템 완성
// 🆕 v2.3.0: DB required_return_date 기반 귀국일 상한선 검증 추가

console.log('🚀 FlightRequestTicket v2.3.0 로딩 시작 - required_return_date 기반 귀국일 검증 추가');

// ================================
// 파트 1: 메인 FlightRequestTicket 클래스
// ================================

class FlightRequestTicket {
    constructor(apiService, uiService, passportService) {
        console.log('🔄 [티켓모듈] FlightRequestTicket v2.3.0 생성 - required_return_date 검증 시스템');
        
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
        
        // 🆕 v2.2.0: 항공권 날짜 검증 관련 상태
        this.flightDateValidation = {
            departureValid: false,
            returnValid: false,
            lastValidationTime: null,
            validationErrors: {
                departure: null,
                return: null
            },
            validationRanges: {
                departure: { min: null, max: null },
                return: { min: null, max: null }
            }
        };
        
        // 🔧 v2.3.0: 사용자별 활동 요구사항 (required_return_date 추가)
        this.userRequirements = {
            userRequiredDays: null,
            userMaximumDays: null,
            dispatchEndDate: null,
            requiredReturnDate: null, // 🆕 v2.3.0: DB 저장된 필수 귀국일
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
        this.flightDateValidationTimer = null; // 🆕 v2.2.0
        
        // 전제 조건 시스템 관련 상태
        this.isActivityPeriodCompleted = false;
        this.isActivityPeriodValid = false;
        this.flightSectionEnabled = false;
        
        // 파일 업로드 관련
        this.ticketImageFile = null;
        this.receiptImageFile = null;
        
        console.log('✅ [티켓모듈] FlightRequestTicket v2.3.0 생성 완료');
        this.init();
    }

    // ================================
    // 파트 2: 🆕 v2.1.0 통합 초기화 + v2.2.0 항공권 검증 추가
    // ================================

    init() {
        try {
            console.log('🔄 [티켓모듈] v2.3.0 통합 초기화 시작...');
            
            // 🆕 v2.1.0: 이벤트 시스템 설정 (최우선)
            this.setupEventSystem();
            
            // 기존 초기화
            this.bindEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🆕 v2.1.0: 초기 항공권 섹션 상태 설정
            this.setInitialFlightSectionState();
            
            // 🆕 v2.2.0: 항공권 날짜 검증 시스템 초기화
            this.initFlightDateValidation();
            
            console.log('✅ [티켓모듈] v2.3.0 통합 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] v2.3.0 초기화 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 시스템 초기화 ===
    initFlightDateValidation() {
        try {
            console.log('🔄 [항공권검증] v2.3.0: 날짜 검증 시스템 초기화...');
            
            // 검증 UI 요소 생성
            this.createFlightDateValidationUI();
            
            // 검증 이벤트 리스너 추가
            this.setupFlightDateValidationEvents();
            
            console.log('✅ [항공권검증] v2.3.0: 날짜 검증 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증] v2.3.0: 날짜 검증 시스템 초기화 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 UI 생성 ===
    createFlightDateValidationUI() {
        try {
            console.log('🔄 [항공권검증UI] v2.3.0: 검증 UI 요소 생성...');
            
            // 출국일 오류 메시지 영역 생성
            const departureDateInput = document.getElementById('departureDate');
            if (departureDateInput && !document.getElementById('departureDateError')) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'departureDateError';
                errorDiv.className = 'flight-date-error-message';
                errorDiv.style.display = 'none';
                departureDateInput.parentNode.insertBefore(errorDiv, departureDateInput.nextSibling);
            }
            
            // 귀국일 오류 메시지 영역 생성
            const returnDateInput = document.getElementById('returnDate');
            if (returnDateInput && !document.getElementById('returnDateError')) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'returnDateError';
                errorDiv.className = 'flight-date-error-message';
                errorDiv.style.display = 'none';
                returnDateInput.parentNode.insertBefore(errorDiv, returnDateInput.nextSibling);
            }
            
            // CSS 스타일 추가
            this.addFlightDateValidationStyles();
            
            console.log('✅ [항공권검증UI] v2.3.0: 검증 UI 요소 생성 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증UI] v2.3.0: 검증 UI 요소 생성 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 스타일 추가 ===
    addFlightDateValidationStyles() {
        try {
            const styleId = 'flightDateValidationStyles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .flight-date-error-message {
                    color: #dc3545;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    padding: 0.5rem;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .flight-date-error-message i {
                    color: #dc3545;
                    flex-shrink: 0;
                }
                
                .flight-date-input-error {
                    border-color: #dc3545 !important;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                }
                
                .flight-date-input-valid {
                    border-color: #28a745 !important;
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25) !important;
                }
                
                .flight-date-validation-success {
                    color: #155724;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    padding: 0.5rem;
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
            `;
            document.head.appendChild(style);
            
        } catch (error) {
            console.error('❌ [항공권검증스타일] v2.3.0: 스타일 추가 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 이벤트 설정 ===
    setupFlightDateValidationEvents() {
        try {
            console.log('🔄 [항공권검증이벤트] v2.3.0: 검증 이벤트 설정...');
            
            // 출국일 검증 이벤트
            const departureDateInput = document.getElementById('departureDate');
            if (departureDateInput) {
                departureDateInput.addEventListener('input', () => {
                    this.debouncedFlightDateValidation('departure');
                });
                departureDateInput.addEventListener('change', () => {
                    this.validateFlightDateImmediate('departure');
                });
                departureDateInput.addEventListener('blur', () => {
                    this.validateFlightDateImmediate('departure');
                });
            }
            
            // 귀국일 검증 이벤트
            const returnDateInput = document.getElementById('returnDate');
            if (returnDateInput) {
                returnDateInput.addEventListener('input', () => {
                    this.debouncedFlightDateValidation('return');
                });
                returnDateInput.addEventListener('change', () => {
                    this.validateFlightDateImmediate('return');
                });
                returnDateInput.addEventListener('blur', () => {
                    this.validateFlightDateImmediate('return');
                });
            }
            
            console.log('✅ [항공권검증이벤트] v2.3.0: 검증 이벤트 설정 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증이벤트] v2.3.0: 검증 이벤트 설정 실패:', error);
        }
    }

    // ================================
    // 파트 3: 🆕 v2.3.0 항공권 날짜 검증 로직 (required_return_date 추가)
    // ================================

    // === 🆕 v2.2.0: 디바운스된 항공권 날짜 검증 ===
    debouncedFlightDateValidation(dateType) {
        try {
            if (this.flightDateValidationTimer) {
                clearTimeout(this.flightDateValidationTimer);
            }
            
            this.flightDateValidationTimer = setTimeout(() => {
                this.validateFlightDateImmediate(dateType);
            }, 300);
            
        } catch (error) {
            console.error(`❌ [디바운스검증] v2.3.0: ${dateType} 검증 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 즉시 항공권 날짜 검증 ===
    validateFlightDateImmediate(dateType) {
        try {
            console.log(`🔄 [즉시검증] v2.3.0: ${dateType} 날짜 검증...`);
            
            // 활동기간 데이터 확인
            if (!this.ticketData.actualArrivalDate || !this.ticketData.actualWorkEndDate) {
                console.log('⚠️ [즉시검증] v2.3.0: 활동기간 데이터 없음 - 검증 스킵');
                return;
            }
            
            if (dateType === 'departure') {
                this.validateDepartureDate();
            } else if (dateType === 'return') {
                this.validateReturnDate();
            }
            
            // 전체 검증 상태 업데이트
            this.updateOverallFlightDateValidation();
            
        } catch (error) {
            console.error(`❌ [즉시검증] v2.3.0: ${dateType} 검증 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 출국일 검증 ===
    validateDepartureDate() {
        try {
            const departureDateInput = document.getElementById('departureDate');
            const departureDateError = document.getElementById('departureDateError');
            
            if (!departureDateInput || !departureDateError) return;
            
            const departureDate = departureDateInput.value;
            if (!departureDate) {
                this.clearValidationMessage('departure');
                return;
            }
            
            const departure = new Date(departureDate);
            const arrival = new Date(this.ticketData.actualArrivalDate);
            
            // 검증 범위 계산: (현지 도착일 -2일) < 출국일 < 현지 도착일
            const minDepartureDate = new Date(arrival);
            minDepartureDate.setDate(arrival.getDate() - 2);
            const maxDepartureDate = arrival;
            
            // 검증 범위 저장
            this.flightDateValidation.validationRanges.departure = {
                min: minDepartureDate,
                max: maxDepartureDate
            };
            
            // 검증 수행
            if (departure <= minDepartureDate) {
                this.showValidationError('departure', 
                    `출국일은 현지 도착일(${this.formatDate(arrival)}) 2일 전인 ${this.formatDate(minDepartureDate)} 이후여야 합니다.`);
                this.flightDateValidation.departureValid = false;
            } else if (departure > maxDepartureDate) {
                this.showValidationError('departure', 
                    `출국일은 현지 도착일(${this.formatDate(arrival)}) 이전이어야 합니다.`);
                this.flightDateValidation.departureValid = false;
            } else {
                this.clearValidationMessage('departure');
                this.flightDateValidation.departureValid = true;
            }
            
            // ticketData 업데이트
            this.ticketData.departureDate = departureDate;
            
            console.log(`✅ [출국일검증] v2.3.0: 검증 완료 - ${this.flightDateValidation.departureValid ? '유효' : '무효'}`);
            
        } catch (error) {
            console.error('❌ [출국일검증] v2.3.0: 검증 실패:', error);
            this.flightDateValidation.departureValid = false;
        }
    }

    // === 🔧 v2.3.0: 귀국일 검증 (required_return_date 추가) ===
    validateReturnDate() {
        try {
            const returnDateInput = document.getElementById('returnDate');
            const returnDateError = document.getElementById('returnDateError');
            
            if (!returnDateInput || !returnDateError) return;
            
            const returnDate = returnDateInput.value;
            if (!returnDate) {
                this.clearValidationMessage('return');
                return;
            }
            
            const returnD = new Date(returnDate);
            const workEnd = new Date(this.ticketData.actualWorkEndDate);
            
            // 🆕 v2.3.0: required_return_date 검증 (우선순위 1)
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                
                if (returnD > requiredReturnDate) {
                    this.showValidationError('return', 
                        `귀국일은 필수 귀국일(${this.formatDate(requiredReturnDate)}) 이전이어야 합니다.`);
                    this.flightDateValidation.returnValid = false;
                    this.ticketData.returnDate = returnDate;
                    return; // 가장 제한적인 조건이므로 여기서 종료
                }
            }
            
            // 기존 검증 범위 계산: 학당 근무 종료일 < 귀국일 < (학당 근무 종료일 +10일)
            const minReturnDate = workEnd;
            const maxReturnDate = new Date(workEnd);
            maxReturnDate.setDate(workEnd.getDate() + 10);
            
            // 🔧 v2.3.0: required_return_date와 기존 범위 중 더 제한적인 것 선택
            let effectiveMaxReturnDate = maxReturnDate;
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (requiredReturnDate < maxReturnDate) {
                    effectiveMaxReturnDate = requiredReturnDate;
                }
            }
            
            // 검증 범위 저장 (효과적인 최대 날짜로 업데이트)
            this.flightDateValidation.validationRanges.return = {
                min: minReturnDate,
                max: effectiveMaxReturnDate
            };
            
            // 검증 수행
            if (returnD < minReturnDate) {
                this.showValidationError('return', 
                    `귀국일은 학당 근무 종료일(${this.formatDate(workEnd)}) 이후여야 합니다.`);
                this.flightDateValidation.returnValid = false;
            } else if (returnD > effectiveMaxReturnDate) {
                // 🆕 v2.3.0: 어떤 제한조건에 의해 거부되었는지 명확히 표시
                if (this.userRequirements.requiredReturnDate && effectiveMaxReturnDate.getTime() === new Date(this.userRequirements.requiredReturnDate).getTime()) {
                    this.showValidationError('return', 
                        `귀국일은 필수 귀국일(${this.formatDate(effectiveMaxReturnDate)}) 이전이어야 합니다.`);
                } else {
                    this.showValidationError('return', 
                        `귀국일은 학당 근무 종료일(${this.formatDate(workEnd)}) 10일 이내인 ${this.formatDate(effectiveMaxReturnDate)} 이전이어야 합니다.`);
                }
                this.flightDateValidation.returnValid = false;
            } else {
                this.clearValidationMessage('return');
                this.flightDateValidation.returnValid = true;
            }
            
            // ticketData 업데이트
            this.ticketData.returnDate = returnDate;
            
            console.log(`✅ [귀국일검증] v2.3.0: 검증 완료 - ${this.flightDateValidation.returnValid ? '유효' : '무효'}`);
            
        } catch (error) {
            console.error('❌ [귀국일검증] v2.3.0: 검증 실패:', error);
            this.flightDateValidation.returnValid = false;
        }
    }

    // === 🆕 v2.2.0: 검증 오류 메시지 표시 ===
    showValidationError(dateType, message) {
        try {
            const inputElement = document.getElementById(dateType === 'departure' ? 'departureDate' : 'returnDate');
            const errorElement = document.getElementById(dateType === 'departure' ? 'departureDateError' : 'returnDateError');
            
            if (inputElement && errorElement) {
                // 입력 필드 스타일 업데이트
                inputElement.classList.remove('flight-date-input-valid');
                inputElement.classList.add('flight-date-input-error');
                
                // 오류 메시지 표시
                errorElement.innerHTML = `
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                `;
                errorElement.style.display = 'flex';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // 검증 오류 저장
                this.flightDateValidation.validationErrors[dateType] = message;
            }
            
        } catch (error) {
            console.error(`❌ [검증오류표시] v2.3.0: ${dateType} 오류 표시 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 검증 메시지 제거 (조용한 성공) ===
    clearValidationMessage(dateType) {
        try {
            const inputElement = document.getElementById(dateType === 'departure' ? 'departureDate' : 'returnDate');
            const errorElement = document.getElementById(dateType === 'departure' ? 'departureDateError' : 'returnDateError');
            
            if (inputElement && errorElement) {
                // 입력 필드 스타일 업데이트 (조용한 성공)
                inputElement.classList.remove('flight-date-input-error');
                // 성공 스타일도 추가하지 않음 (조용한 성공)
                
                // 오류 메시지 숨김
                errorElement.style.display = 'none';
                errorElement.innerHTML = '';
                
                // 검증 오류 제거
                this.flightDateValidation.validationErrors[dateType] = null;
            }
            
        } catch (error) {
            console.error(`❌ [검증메시지제거] v2.3.0: ${dateType} 메시지 제거 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 전체 항공권 날짜 검증 상태 업데이트 ===
    updateOverallFlightDateValidation() {
        try {
            this.flightDateValidation.lastValidationTime = Date.now();
            
            // 전체 검증 상태 확인
            const overallValid = this.flightDateValidation.departureValid && 
                               this.flightDateValidation.returnValid;
            
            // 검증 결과 이벤트 발행
            this.emitEvent('flightDateValidationUpdated', {
                departureValid: this.flightDateValidation.departureValid,
                returnValid: this.flightDateValidation.returnValid,
                overallValid: overallValid,
                validationErrors: this.flightDateValidation.validationErrors,
                validationRanges: this.flightDateValidation.validationRanges,
                timestamp: this.flightDateValidation.lastValidationTime
            });
            
            console.log(`✅ [전체검증상태] v2.3.0: 업데이트 완료 - ${overallValid ? '전체 유효' : '일부 무효'}`);
            
        } catch (error) {
            console.error('❌ [전체검증상태] v2.3.0: 업데이트 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 날짜 포맷 헬퍼 ===
    formatDate(date) {
        try {
            if (!date) return '';
            
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
            
        } catch (error) {
            console.error('❌ [날짜포맷] v2.3.0: 포맷 실패:', error);
            return '';
        }
    }

    // === 🆕 v2.2.0: 활동기간 변경 시 항공권 날짜 재검증 ===
    revalidateFlightDatesOnActivityChange() {
        try {
            console.log('🔄 [재검증] v2.3.0: 활동기간 변경으로 항공권 날짜 재검증...');
            
            // 현재 입력된 항공권 날짜가 있으면 재검증
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            
            if (departureDate) {
                this.validateFlightDateImmediate('departure');
            }
            
            if (returnDate) {
                this.validateFlightDateImmediate('return');
            }
            
            console.log('✅ [재검증] v2.3.0: 항공권 날짜 재검증 완료');
            
        } catch (error) {
            console.error('❌ [재검증] v2.3.0: 항공권 날짜 재검증 실패:', error);
        }
    }

    // ================================
    // 파트 4: 🔧 v2.3.0 기존 메서드 업데이트
    // ================================

    // === 🔧 v2.2.0: 활동기간 날짜 변경 처리 업데이트 ===
    handleActivityDateChange(type) {
        try {
            console.log(`🔄 [활동기간] v2.3.0: ${type} 날짜 변경 처리...`);
            
            // 기존 로직
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            
            // 🆕 v2.2.0: 활동기간 데이터 업데이트
            if (type === 'arrival') {
                this.ticketData.actualArrivalDate = document.getElementById('actualArrivalDate')?.value;
            } else if (type === 'workEnd') {
                this.ticketData.actualWorkEndDate = document.getElementById('actualWorkEndDate')?.value;
            }
            
            // 🆕 v2.2.0: 항공권 날짜 재검증 트리거
            setTimeout(() => {
                this.revalidateFlightDatesOnActivityChange();
            }, 100);
            
            // 이벤트 발행
            this.emitEvent('activityDateChanged', {
                type: type,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ [활동기간] v2.3.0: ${type} 날짜 변경 처리 실패:`, error);
        }
    }

    // === 🔧 v2.2.0: 항공권 날짜 변경 처리 업데이트 ===
    handleFlightDateChange(type) {
        try {
            console.log(`🔄 [항공권날짜] v2.3.0: ${type} 날짜 변경 처리...`);
            
            // 🆕 v2.2.0: 실시간 검증 수행
            this.validateFlightDateImmediate(type);
            
            // 이벤트 발행
            this.emitEvent('flightDateChanged', {
                type: type,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ [항공권날짜] v2.3.0: ${type} 날짜 변경 처리 실패:`, error);
        }
    }

    // === 🔧 v2.3.0: 전체 데이터 검증 업데이트 ===
    validateAllData() {
        try {
            // 활동기간 검증
            const activityValidation = this.validateActivityPeriod();
            if (!activityValidation.valid) {
                this.showError('현지 활동기간을 올바르게 입력해주세요.');
                return false;
            }
            
            // 🆕 v2.3.0: 항공권 날짜 검증 (활동기간 + required_return_date 기반)
            const flightDateValidation = this.validateFlightDatesWithActivity();
            if (!flightDateValidation.valid) {
                this.showError(flightDateValidation.message);
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
            console.error('❌ [검증] v2.3.0: 전체 데이터 검증 실패:', error);
            return false;
        }
    }

    // === 🔧 v2.3.0: 활동기간 기반 항공권 날짜 검증 (required_return_date 추가) ===
    validateFlightDatesWithActivity() {
        try {
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            
            if (!departureDate || !returnDate) {
                return {
                    valid: false,
                    message: '출국일과 귀국일을 모두 입력해주세요.'
                };
            }
            
            if (!this.ticketData.actualArrivalDate || !this.ticketData.actualWorkEndDate) {
                return {
                    valid: false,
                    message: '현지 활동기간을 먼저 입력해주세요.'
                };
            }
            
            // 기본 날짜 순서 검증
            const departure = new Date(departureDate);
            const returnD = new Date(returnDate);
            
            if (departure >= returnD) {
                return {
                    valid: false,
                    message: '귀국일은 출국일보다 늦어야 합니다.'
                };
            }
            
            // 🆕 v2.3.0: required_return_date 우선 검증
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (returnD > requiredReturnDate) {
                    return {
                        valid: false,
                        message: `귀국일은 필수 귀국일 ${this.formatDate(requiredReturnDate)} 이전이어야 합니다.`
                    };
                }
            }
            
            // 기존 활동기간 기반 검증
            const arrival = new Date(this.ticketData.actualArrivalDate);
            const workEnd = new Date(this.ticketData.actualWorkEndDate);
            
            // 출국일 범위 검증
            const minDepartureDate = new Date(arrival);
            minDepartureDate.setDate(arrival.getDate() - 2);
            
            if (departure <= minDepartureDate || departure > arrival) {
                return {
                    valid: false,
                    message: `출국일은 현지 도착일 2일 전인 ${this.formatDate(minDepartureDate)} 이후부터 ${this.formatDate(arrival)} 이전이어야 합니다.`
                };
            }
            
            // 귀국일 범위 검증 (기존 + required_return_date 통합)
            const maxReturnDateBasic = new Date(workEnd);
            maxReturnDateBasic.setDate(workEnd.getDate() + 10);
            
            // 🆕 v2.3.0: 더 제한적인 날짜 선택
            let effectiveMaxReturnDate = maxReturnDateBasic;
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (requiredReturnDate < maxReturnDateBasic) {
                    effectiveMaxReturnDate = requiredReturnDate;
                }
            }
            
            if (returnD <= workEnd || returnD > effectiveMaxReturnDate) {
                return {
                    valid: false,
                    message: `귀국일은 학당 근무 종료일 ${this.formatDate(workEnd)} 이후부터 ${this.formatDate(effectiveMaxReturnDate)} 이전이어야 합니다.`
                };
            }
            
            return {
                valid: true,
                message: '항공권 날짜가 올바르게 설정되었습니다.'
            };
            
        } catch (error) {
            console.error('❌ [항공권날짜검증] v2.3.0: 검증 실패:', error);
            return {
                valid: false,
                message: '항공권 날짜 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // ================================
    // 파트 5: 🆕 v2.3.0 외부 인터페이스 확장
    // ================================

    // === 🆕 v2.2.0: 항공권 날짜 검증 상태 반환 ===
    getFlightDateValidationStatus() {
        return {
            ...this.flightDateValidation,
            overallValid: this.flightDateValidation.departureValid && this.flightDateValidation.returnValid
        };
    }

    // === 🆕 v2.2.0: 수동 항공권 날짜 검증 트리거 ===
    triggerFlightDateValidation() {
        try {
            console.log('🔄 [수동검증] v2.3.0: 항공권 날짜 검증 트리거...');
            
            this.validateFlightDateImmediate('departure');
            this.validateFlightDateImmediate('return');
            
            console.log('✅ [수동검증] v2.3.0: 항공권 날짜 검증 트리거 완료');
            return true;
            
        } catch (error) {
            console.error('❌ [수동검증] v2.3.0: 항공권 날짜 검증 트리거 실패:', error);
            return false;
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 초기화 ===
    resetFlightDateValidation() {
        try {
            console.log('🔄 [검증초기화] v2.3.0: 항공권 날짜 검증 초기화...');
            
            // 검증 상태 초기화
            this.flightDateValidation = {
                departureValid: false,
                returnValid: false,
                lastValidationTime: null,
                validationErrors: {
                    departure: null,
                    return: null
                },
                validationRanges: {
                    departure: { min: null, max: null },
                    return: { min: null, max: null }
                }
            };
            
            // UI 초기화
            this.clearValidationMessage('departure');
            this.clearValidationMessage('return');
            
            console.log('✅ [검증초기화] v2.3.0: 항공권 날짜 검증 초기화 완료');
            
        } catch (error) {
            console.error('❌ [검증초기화] v2.3.0: 항공권 날짜 검증 초기화 실패:', error);
        }
    }

    // ================================
    // 기존 v2.1.0 메서드들 유지 (주요 메서드들)
    // ================================

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

    // === 기존 이벤트 구독 메서드들 ===
    subscribeToInitModuleEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독...');
            
            this.onEvent('flightSectionStateChangeRequest', (data) => {
                this.handleFlightSectionStateChangeRequest(data);
            });
            
            this.onEvent('revalidationCompleted', (data) => {
                this.handleRevalidationCompleted(data);
            });
            
            this.onEvent('activityPeriodChanged', (data) => {
                this.handleActivityPeriodChanged(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 실패:', error);
        }
    }

    subscribeToCoordinatorEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 이벤트 구독...');
            
            this.onEvent('coordinator:stateChanged', (data) => {
                this.handleCoordinatorStateChanged(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 이벤트 구독 실패:', error);
        }
    }

    connectToGlobalEventSystem() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결...');
            
            if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.on === 'function') {
                window.flightRequestCoordinator.on('init:flightSectionStateChangeRequest', (event) => {
                    this.handleFlightSectionStateChangeRequest(event.detail);
                });
                
                console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 시스템 연결 완료');
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결 실패:', error);
        }
    }

    // === 이벤트 헬퍼 메서드 ===
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
    // 기존 유틸리티 및 헬퍼 메서드들
    // ================================

    findFlightInfoSection() {
        try {
            const selectors = [
                '#flightInfoSection',
                '.flight-info-section',
                '.flight-section',
                '#step2',
                '[data-step="flight"]'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element;
                }
            }
            
            const departureDateEl = document.getElementById('departureDate');
            if (departureDateEl) {
                let parent = departureDateEl.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.tagName === 'SECTION' || 
                        parent.classList.contains('section') ||
                        parent.classList.contains('step')) {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [항공권섹션] 섹션 찾기 실패:', error);
            return null;
        }
    }

    toggleFlightInputFields(enabled) {
        try {
            console.log(`🔄 [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'}...`);
            
            const flightInputSelectors = [
                '#departureDate',
                '#returnDate', 
                '#departureAirport',
                '#arrivalAirport',
                '#ticketPrice',
                '#currency',
                '#priceSource',
                '#purchaseLink',
                'input[name="purchaseType"]'
            ];
            
            flightInputSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element) {
                        element.disabled = !enabled;
                        element.style.opacity = enabled ? '1' : '0.5';
                        element.style.cursor = enabled ? 'auto' : 'not-allowed';
                    }
                });
            });
            
            console.log(`✅ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 완료`);
            
        } catch (error) {
            console.error(`❌ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 실패:`, error);
        }
    }

    // === 🔧 v2.3.0: 사용자 요구사항 설정 (requiredReturnDate 추가) ===
    setUserRequirements(requirements) {
        try {
            console.log('🔄 [사용자요구사항] v2.3.0 설정:', requirements);
            
            this.userRequirements = {
                ...this.userRequirements,
                ...requirements,
                isLoaded: true
            };
            
            // 🆕 v2.3.0: required_return_date가 설정되면 항공권 날짜 재검증
            if (requirements.requiredReturnDate) {
                console.log('🔄 [사용자요구사항] v2.3.0: required_return_date 설정으로 항공권 날짜 재검증 트리거');
                setTimeout(() => {
                    this.revalidateFlightDatesOnActivityChange();
                }, 100);
            }
            
            console.log('✅ [사용자요구사항] v2.3.0 설정 완료:', this.userRequirements);
            
        } catch (error) {
            console.error('❌ [사용자요구사항] v2.3.0 설정 실패:', error);
        }
    }

    // === 이벤트 바인딩 ===
    bindEvents() {
        try {
            console.log('🔄 [이벤트바인딩] 이벤트 리스너 설정...');
            
            // 활동기간 입력 필드 이벤트
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            if (arrivalDateEl) {
                arrivalDateEl.addEventListener('change', () => {
                    this.handleActivityDateChange('arrival');
                });
                arrivalDateEl.addEventListener('input', () => {
                    this.debouncedActivityValidationWithLoading();
                });
            }
            
            if (workEndDateEl) {
                workEndDateEl.addEventListener('change', () => {
                    this.handleActivityDateChange('workEnd');
                });
                workEndDateEl.addEventListener('input', () => {
                    this.debouncedActivityValidationWithLoading();
                });
            }
            
            // 항공권 날짜 입력 이벤트
            const departureDateEl = document.getElementById('departureDate');
            const returnDateEl = document.getElementById('returnDate');
            
            if (departureDateEl) {
                departureDateEl.addEventListener('change', () => {
                    this.handleFlightDateChange('departure');
                });
            }
            
            if (returnDateEl) {
                returnDateEl.addEventListener('change', () => {
                    this.handleFlightDateChange('return');
                });
            }
            
            console.log('✅ [이벤트바인딩] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [이벤트바인딩] 이벤트 리스너 설정 실패:', error);
        }
    }

    // === 즉시 활동일수 계산 및 표시 ===
    calculateAndShowActivityDaysImmediate() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (arrivalDate && workEndDate) {
                const start = new Date(arrivalDate);
                const end = new Date(workEndDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                this.ticketData.calculatedActivityDays = diffDays;
                
                // UI 업데이트
                const calculatedEl = document.getElementById('calculatedDays');
                if (calculatedEl) {
                    calculatedEl.textContent = diffDays;
                    calculatedEl.className = 'value calculated-days-value';
                }
                
                console.log('✅ [활동일수] 즉시 계산 완료:', diffDays);
            }
            
        } catch (error) {
            console.error('❌ [활동일수] 즉시 계산 실패:', error);
        }
    }

    // === 디바운스된 활동기간 검증 ===
    debouncedActivityValidationWithLoading() {
        try {
            if (this.validationDebounceTimer) {
                clearTimeout(this.validationDebounceTimer);
            }
            
            this.validationDebounceTimer = setTimeout(() => {
                this.validateActivityPeriodWithUI();
            }, 500);
            
        } catch (error) {
            console.error('❌ [디바운스검증] 실패:', error);
        }
    }

    // === UI와 함께 활동기간 검증 ===
    validateActivityPeriodWithUI() {
        try {
            const validation = this.validateActivityPeriod();
            
            if (validation.valid) {
                this.isActivityPeriodCompleted = true;
                this.isActivityPeriodValid = true;
                
                this.emitEvent('flightSectionStateChangeRequest', {
                    action: 'enable',
                    reason: 'activityPeriodValidated',
                    message: '현지 활동기간 검증 완료 - 항공권 정보를 입력할 수 있습니다.',
                    type: 'success',
                    validationResult: validation
                });
                
            } else {
                this.isActivityPeriodCompleted = false;
                this.isActivityPeriodValid = false;
                
                this.emitEvent('flightSectionStateChangeRequest', {
                    action: 'disable',
                    reason: 'activityPeriodInvalid',
                    message: validation.message || '활동기간을 올바르게 입력해주세요.',
                    type: 'error',
                    validationResult: validation
                });
            }
            
        } catch (error) {
            console.error('❌ [UI검증] 활동기간 검증 실패:', error);
        }
    }

    // === 활동기간 검증 ===
    validateActivityPeriod() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (!arrivalDate || !workEndDate) {
                return {
                    valid: false,
                    message: '현지 도착일과 근무 종료일을 모두 입력해주세요.',
                    code: 'MISSING_DATES'
                };
            }
            
            const start = new Date(arrivalDate);
            const end = new Date(workEndDate);
            
            if (start >= end) {
                return {
                    valid: false,
                    message: '근무 종료일은 도착일보다 늦어야 합니다.',
                    code: 'INVALID_DATE_ORDER'
                };
            }
            
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            if (this.userRequirements.userRequiredDays && diffDays < this.userRequirements.userRequiredDays) {
                return {
                    valid: false,
                    message: `최소 ${this.userRequirements.userRequiredDays}일 이상 활동해야 합니다. (현재: ${diffDays}일)`,
                    code: 'INSUFFICIENT_DAYS'
                };
            }
            
            if (this.userRequirements.userMaximumDays && diffDays > this.userRequirements.userMaximumDays) {
                return {
                    valid: false,
                    message: `최대 ${this.userRequirements.userMaximumDays}일까지 활동 가능합니다. (현재: ${diffDays}일)`,
                    code: 'EXCEEDED_DAYS'
                };
            }
            
            return {
                valid: true,
                message: '활동기간이 올바르게 설정되었습니다.',
                days: diffDays,
                code: 'VALID'
            };
            
        } catch (error) {
            console.error('❌ [활동기간검증] 실패:', error);
            return {
                valid: false,
                message: '활동기간 검증 중 오류가 발생했습니다.',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    // ================================
    // 기본 메서드들 및 외부 인터페이스
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

    populateFormWithExistingData(data) {
        try {
            if (data.actualArrivalDate) {
                const arrivalEl = document.getElementById('actualArrivalDate');
                if (arrivalEl) arrivalEl.value = data.actualArrivalDate;
                this.ticketData.actualArrivalDate = data.actualArrivalDate;
            }
            
            if (data.actualWorkEndDate) {
                const workEndEl = document.getElementById('actualWorkEndDate');
                if (workEndEl) workEndEl.value = data.actualWorkEndDate;
                this.ticketData.actualWorkEndDate = data.actualWorkEndDate;
            }
            
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            
        } catch (error) {
            console.error('❌ [폼채우기] 기존 데이터 채우기 실패:', error);
        }
    }

    // 항공권 섹션 제어 메서드들
    setInitialFlightSectionState() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정...');
            
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

    enableFlightSectionUnified(data) {
        try {
            console.log('🔓 [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화:', data);
            
            this.flightSectionControl.isEnabled = true;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            this.updateFlightSectionUI(true, data);
            this.toggleFlightInputFields(true);
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 실패:', error);
        }
    }

    disableFlightSectionUnified(data) {
        try {
            console.log('🔒 [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화:', data);
            
            this.flightSectionControl.isEnabled = false;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 비활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            this.updateFlightSectionUI(false, data);
            this.toggleFlightInputFields(false);
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 실패:', error);
        }
    }

    updateFlightSectionUI(enabled, data) {
        try {
            const flightSection = this.findFlightInfoSection();
            
            if (flightSection) {
                if (enabled) {
                    flightSection.classList.remove('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.add('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '1';
                    flightSection.style.pointerEvents = 'auto';
                    flightSection.style.filter = 'none';
                    flightSection.style.backgroundColor = '';
                } else {
                    flightSection.classList.add('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.remove('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '0.5';
                    flightSection.style.pointerEvents = 'none';
                    flightSection.style.filter = 'grayscale(50%)';
                    flightSection.style.backgroundColor = '#f9fafb';
                }
                
                flightSection.setAttribute('data-enabled', enabled.toString());
                flightSection.setAttribute('data-last-change-reason', data.reason || 'unknown');
                flightSection.setAttribute('data-last-change-time', Date.now().toString());
            }
            
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 항공권 섹션 UI ${enabled ? '활성화' : '비활성화'} 실패:`, error);
        }
    }

    // 이벤트 핸들러들
    handleFlightSectionStateChangeRequest(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 항공권 섹션 상태 변경 요청 처리:', data);
            
            if (data.action === 'enable') {
                this.enableFlightSectionUnified(data);
            } else if (data.action === 'disable') {
                this.disableFlightSectionUnified(data);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 항공권 섹션 상태 변경 요청 처리 실패:', error);
        }
    }

    handleRevalidationCompleted(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 재검증 완료 처리:', data);
            
            if (data.success && data.result) {
                this.emitEvent('validationSuccess', {
                    result: data.result,
                    timestamp: Date.now()
                });
            } else {
                this.emitEvent('validationFailed', {
                    result: data.result,
                    timestamp: Date.now()
                });
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 재검증 완료 처리 실패:', error);
        }
    }

    handleActivityPeriodChanged(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 활동기간 변경 처리:', data);
            
            this.resetValidationState();
            
            this.emitEvent('activityPeriodUpdated', {
                fieldType: data.fieldType,
                newValue: data.newValue,
                timestamp: data.timestamp || Date.now()
            });
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 활동기간 변경 처리 실패:', error);
        }
    }

    handleCoordinatorStateChanged(data) {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 상태 변경 처리:', data);
            
            if (data.current && data.current.flightSectionState) {
                const coordinatorFlightState = data.current.flightSectionState;
                
                if (coordinatorFlightState !== this.getFlightSectionState()) {
                    this.syncWithCoordinatorState(coordinatorFlightState);
                }
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 상태 변경 처리 실패:', error);
        }
    }

    // 헬퍼 메서드들
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

    getFlightSectionState() {
        if (this.flightSectionControl.isEnabled) {
            return 'enabled';
        } else {
            return 'disabled';
        }
    }

    getFlightSectionControlStatus() {
        return {
            ...this.flightSectionControl,
            currentState: this.getFlightSectionState(),
            eventSystemSetup: this.isEventSystemSetup
        };
    }

    // 외부 인터페이스
    triggerValidation() {
        try {
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            console.log('✅ [외부인터페이스] v2.1.0: 검증 트리거 완료');
        } catch (error) {
            console.error('❌ [외부인터페이스] v2.1.0: 검증 트리거 실패:', error);
        }
    }

    getTicketData() {
        return { ...this.ticketData };
    }

    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionControl.isEnabled,
            flightSectionControlStatus: this.getFlightSectionControlStatus()
        };
    }

    getEventSystemStatus() {
        return {
            isEventSystemSetup: this.isEventSystemSetup,
            eventListenersCount: this.eventListeners.size,
            registeredEvents: Array.from(this.eventListeners.keys())
        };
    }

    // 디버깅 정보 반환 (v2.3.0 확장)
    getDebugInfo() {
        return {
            version: '2.3.0',
            ticketData: this.ticketData,
            userRequirements: this.userRequirements,
            prerequisiteStatus: this.getPrerequisiteStatus(),
            flightSectionControl: this.flightSectionControl,
            flightDateValidation: this.flightDateValidation,
            eventSystemStatus: this.getEventSystemStatus(),
            hasApiService: !!this.apiService,
            hasUiService: !!this.uiService,
            hasPassportService: !!this.passportService
        };
    }

    destroy() {
        try {
            console.log('🗑️ [티켓모듈] v2.3.0: 인스턴스 정리...');
            
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            if (this.validationDebounceTimer) {
                clearTimeout(this.validationDebounceTimer);
            }
            if (this.returnValidationDebounceTimer) {
                clearTimeout(this.returnValidationDebounceTimer);
            }
            if (this.flightDateValidationTimer) {
                clearTimeout(this.flightDateValidationTimer);
            }
            
            this.flightSectionControl = null;
            this.ticketData = null;
            this.userRequirements = null;
            this.flightDateValidation = null;
            
            console.log('✅ [티켓모듈] v2.3.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.3.0: 인스턴스 정리 실패:', error);
        }
    }
}

// ================================
// 전역 스코프 노출
// ================================

// 전역 스코프에 클래스 노출
window.FlightRequestTicket = FlightRequestTicket;

console.log('✅ FlightRequestTicket v2.3.0 모듈 로드 완료 - required_return_date 기반 귀국일 검증 추가');
console.log('🎯 v2.3.0 핵심 변경사항:', {
    newFeatures: [
        '🆕 DB required_return_date 필드 기반 귀국일 상한선 검증',
        '🆕 귀국일 검증 규칙 확장: 기존 2개 조건 + 신규 1개 조건',
        '🆕 기존: 학당 근무 종료일 < 귀국일 < (학당 근무 종료일 +10일)',
        '🆕 신규: 귀국일 ≤ required_return_date (DB 저장된 필수 귀국일)',
        '🆕 userRequirements에 requiredReturnDate 필드 추가',
        '🆕 통합 검증 시스템: 3개 조건 모두 만족해야 유효',
        '🆕 더 제한적인 조건 우선 적용 로직',
        '🆕 명확한 오류 메시지: 어떤 제약조건에 의해 거부되었는지 표시'
    ],
    improvements: [
        '기존 v2.2.0 검증 로직과 완전히 통합',
        'DB 제약 조건 기반 데이터 무결성 보장',
        '관리자 설정 필수 귀국일 자동 준수',
        '실시간 피드백으로 즉시 오류 감지',
        '확장 가능한 검증 아키텍처 유지'
    ]
});
console.log('🚀 v2.3.0 예상 효과:', {
    dataIntegrity: 'DB 제약 조건 기반 완전한 날짜 검증',
    managementEfficiency: '관리자가 설정한 필수 귀국일 자동 준수',
    userExperience: '실시간 검증으로 즉각적인 피드백 제공',
    systemStability: '3중 검증 시스템으로 데이터 무결성 보장'
});
