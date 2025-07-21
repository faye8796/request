// flight-request-ticket.js - v2.2.0 Coordinator 재검증 시스템 연동
// 🎯 핵심 책임:
//   1. Coordinator의 재검증 결과를 수신하여 UI 제어
//   2. 🆕 v2.2.0: 독자적인 활동일 검증 제거, Coordinator 의존
//   3. 항공권 정보 이미지 등록 및 Supabase 등록 기능
// 🔧 v2.2.0: 단일 책임 원칙 - UI 제어만 담당, 검증은 Init 모듈에 위임

console.log('🚀 FlightRequestTicket v2.2.0 로딩 시작 - Coordinator 재검증 시스템 연동');

// ================================
// 파트 1: 메인 FlightRequestTicket 클래스
// ================================

class FlightRequestTicket {
    constructor(apiService, uiService, passportService) {
        console.log('🔄 [티켓모듈] FlightRequestTicket v2.2.0 생성 - Coordinator 재검증 연동');
        
        // 의존성 주입
        this.apiService = apiService;
        this.uiService = uiService;
        this.passportService = passportService;
        
        // 🆕 v2.2.0: 단순화된 상태 관리
        this.flightSectionControl = {
            isEnabled: false,
            lastStateChangeReason: 'initialization',
            lastStateChangeMessage: '초기화 중...',
            lastStateChangeTime: Date.now()
        };
        
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
        
        // 🔧 v2.2.0: 사용자별 활동 요구사항 (Coordinator에서 주입)
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
        
        // 전제 조건 시스템 관련 상태
        this.isActivityPeriodCompleted = false;
        this.isActivityPeriodValid = false;
        this.flightSectionEnabled = false;
        
        // 파일 업로드 관련
        this.ticketImageFile = null;
        this.receiptImageFile = null;
        
        console.log('✅ [티켓모듈] FlightRequestTicket v2.2.0 생성 완료');
        this.init();
    }

    // ================================
    // 파트 2: 🆕 v2.2.0 단순화된 초기화
    // ================================

    init() {
        try {
            console.log('🔄 [티켓모듈] v2.2.0 초기화 시작...');
            
            // 🔧 v2.2.0: 활동일 변경 감지 제거, UI 이벤트만 설정
            this.bindUIEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🔧 v2.2.0: 초기 상태는 비활성화
            this.setFlightSectionState(false, 'initialization', '항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.');
            
            console.log('✅ [티켓모듈] v2.2.0 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] v2.2.0 초기화 실패:', error);
        }
    }

    // === 🆕 v2.2.0: UI 이벤트만 바인딩 (활동일 변경 감지 제거) ===
    bindUIEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.2.0: UI 이벤트 바인딩...');
            
            // 🔧 v2.2.0: 활동일 입력 이벤트 제거 (Init 모듈에서 처리)
            
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
            
            // 구매방식 변경 이벤트
            const purchaseTypeInputs = document.querySelectorAll('input[name="purchaseType"]');
            purchaseTypeInputs.forEach(input => {
                input.addEventListener('change', () => {
                    this.handlePurchaseMethodChange();
                });
            });
            
            // 파일 업로드 이벤트
            const flightImageInput = document.getElementById('flightImageInput');
            const receiptImageInput = document.getElementById('receiptImageInput');
            
            if (flightImageInput) {
                flightImageInput.addEventListener('change', (e) => {
                    this.handleFlightImageUpload(e);
                });
            }
            
            if (receiptImageInput) {
                receiptImageInput.addEventListener('change', (e) => {
                    this.handleReceiptImageUpload(e);
                });
            }
            
            // 제출 버튼 이벤트
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleSubmit();
                });
            }
            
            console.log('✅ [티켓모듈] v2.2.0: UI 이벤트 바인딩 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.2.0: UI 이벤트 바인딩 실패:', error);
        }
    }

    // ================================
    // 파트 3: 🆕 v2.2.0 Coordinator 재검증 결과 처리
    // ================================

    // === 🆕 v2.2.0: Coordinator로부터 재검증 결과 수신 ===
    handleRevalidationResult(result) {
        try {
            console.log('🔄 [티켓모듈] v2.2.0: 재검증 결과 처리:', result);
            
            if (result && result.success) {
                // 활동일수 업데이트
                if (result.days) {
                    this.ticketData.calculatedActivityDays = result.days;
                    this.updateCalculatedDaysUI(result.days);
                }
                
                // 항공권 섹션 활성화
                this.setFlightSectionState(true, 'revalidationSuccess', 
                    '현지 활동기간 검증 완료 - 항공권 정보를 입력할 수 있습니다.', 'success');
                
                this.isActivityPeriodCompleted = true;
                this.isActivityPeriodValid = true;
                
            } else {
                // 항공권 섹션 비활성화
                this.setFlightSectionState(false, 'revalidationFailed', 
                    result?.message || '활동기간을 올바르게 입력해주세요.', 'error');
                
                this.isActivityPeriodCompleted = false;
                this.isActivityPeriodValid = false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.2.0: 재검증 결과 처리 실패:', error);
            return false;
        }
    }

    // === 🆕 v2.2.0: 활동기간 변경 알림 처리 ===
    handleActivityPeriodChange(data) {
        try {
            console.log('🔄 [티켓모듈] v2.2.0: 활동기간 변경 처리:', data);
            
            // 활동기간 데이터 업데이트
            if (data.arrivalDate !== undefined) {
                this.ticketData.actualArrivalDate = data.arrivalDate;
            }
            if (data.workEndDate !== undefined) {
                this.ticketData.actualWorkEndDate = data.workEndDate;
            }
            
            // 즉시 항공권 섹션 비활성화 (재검증 대기)
            this.setFlightSectionState(false, 'activityPeriodChanged', 
                '활동기간이 변경되었습니다. 재검증 중...', 'warning');
            
            // 검증 상태 리셋
            this.isActivityPeriodCompleted = false;
            this.isActivityPeriodValid = false;
            
            return true;
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.2.0: 활동기간 변경 처리 실패:', error);
            return false;
        }
    }

    // === 🆕 v2.2.0: 통합된 항공권 섹션 상태 설정 ===
    setFlightSectionState(enabled, reason, message, type = 'info') {
        try {
            console.log(`🔄 [티켓모듈] v2.2.0: 항공권 섹션 ${enabled ? '활성화' : '비활성화'}`, {
                reason, message, type
            });
            
            // 내부 상태 업데이트
            this.flightSectionControl.isEnabled = enabled;
            this.flightSectionControl.lastStateChangeReason = reason;
            this.flightSectionControl.lastStateChangeMessage = message;
            this.flightSectionControl.lastStateChangeTime = Date.now();
            this.flightSectionEnabled = enabled;
            
            // UI 업데이트
            this.updateFlightSectionUI(enabled);
            this.toggleFlightInputFields(enabled);
            this.updateStatusMessage(message, type);
            
            console.log(`✅ [티켓모듈] v2.2.0: 항공권 섹션 ${enabled ? '활성화' : '비활성화'} 완료`);
            
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.2.0: 항공권 섹션 상태 설정 실패:`, error);
        }
    }

    // === 항공권 섹션 UI 업데이트 ===
    updateFlightSectionUI(enabled) {
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
                flightSection.setAttribute('data-last-change-reason', this.flightSectionControl.lastStateChangeReason);
                flightSection.setAttribute('data-last-change-time', this.flightSectionControl.lastStateChangeTime.toString());
            }
            
        } catch (error) {
            console.error(`❌ [티켓모듈] 항공권 섹션 UI 업데이트 실패:`, error);
        }
    }

    // === 상태 메시지 업데이트 ===
    updateStatusMessage(message, type = 'info') {
        try {
            let statusElement = document.getElementById('prerequisiteStatus') ||
                               document.querySelector('.prerequisite-status');
            
            if (!statusElement) {
                statusElement = this.createStatusElement();
            }
            
            if (statusElement) {
                statusElement.className = 'prerequisite-status ' + type;
                
                const iconMap = {
                    'success': 'check-circle',
                    'error': 'alert-circle',
                    'warning': 'alert-triangle',
                    'info': 'info'
                };
                
                statusElement.innerHTML = `
                    <div class="status-icon ${type}">
                        <i data-lucide="${iconMap[type] || 'info'}"></i>
                    </div>
                    <div class="status-message">
                        <span>${message}</span>
                    </div>
                `;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 상태 메시지 업데이트 실패:', error);
        }
    }

    // === 상태 요소 생성 ===
    createStatusElement() {
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
            
            return statusElement;
            
        } catch (error) {
            console.error('❌ [티켓모듈] 상태 요소 생성 실패:', error);
            return null;
        }
    }

    // === 계산된 활동일수 UI 업데이트 ===
    updateCalculatedDaysUI(days) {
        try {
            const calculatedEl = document.getElementById('calculatedDays');
            if (calculatedEl) {
                calculatedEl.textContent = days;
                calculatedEl.className = 'value calculated-days-value';
            }
        } catch (error) {
            console.error('❌ [티켓모듈] 활동일수 UI 업데이트 실패:', error);
        }
    }

// === 항공권 섹션 찾기 ===
findFlightInfoSection() {
    try {
        // 여러 가능한 선택자로 항공권 섹션 찾기
        const selectors = [
            '#flightInfoSection',
            '.flight-info-section',
            '.flight-section',
            '#step2',
            '[data-step="flight"]',
            '.step[data-step="2"]'
        ];
        
        for (const selector of selectors) {
            const element = document.querySelector(selector);
            if (element) {
                return element;
            }
        }
        
        // CSS4 선택자 시도 (최신 브라우저에서만 동작)
        try {
            const advancedElement = document.querySelector('section:has(#departureDate), div:has(#departureAirport)');
            if (advancedElement) {
                return advancedElement;
            }
        } catch (error) {
            // CSS4 선택자 지원하지 않는 경우 무시
        }
        
        // 폴백: departureDate 입력 필드의 부모 섹션 찾기
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

// === 항공권 입력 필드들 활성화/비활성화 ===
toggleFlightInputFields(enabled) {
    try {
        console.log(`🔄 [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'}...`);
        
        // 항공권 관련 입력 필드들
        const flightInputSelectors = [
            '#departureDate',
            '#returnDate', 
            '#departureAirport',
            '#arrivalAirport',
            '#ticketPrice',
            '#currency',
            '#priceSource',
            '#purchaseLink',
            'input[name="purchaseType"]',
            '#flightImageInput',
            '#receiptImageInput'
        ];
        
        flightInputSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                if (element) {
                    element.disabled = !enabled;
                    
                    // 스타일 적용
                    if (enabled) {
                        element.style.opacity = '1';
                        element.style.cursor = 'auto';
                        element.removeAttribute('readonly');
                    } else {
                        element.style.opacity = '0.5';
                        element.style.cursor = 'not-allowed';
                        // readonly 속성은 입력을 막지만 폼 제출은 허용
                        if (element.type !== 'radio' && element.type !== 'checkbox') {
                            element.setAttribute('readonly', 'readonly');
                        }
                    }
                }
            });
        });
        
        // 버튼들도 처리
        const flightButtons = document.querySelectorAll('.flight-section button, [data-step="flight"] button');
        flightButtons.forEach(button => {
            button.disabled = !enabled;
            button.style.opacity = enabled ? '1' : '0.5';
        });
        
        console.log(`✅ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 완료`);
        
    } catch (error) {
        console.error(`❌ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 실패:`, error);
    }
}

// === 사용자 요구사항 설정 ===
setUserRequirements(requirements) {
    try {
        console.log('🔄 [사용자요구사항] 설정:', requirements);
        
        this.userRequirements = {
            ...this.userRequirements,
            ...requirements,
            isLoaded: true
        };
        
        console.log('✅ [사용자요구사항] 설정 완료:', this.userRequirements);
        
    } catch (error) {
        console.error('❌ [사용자요구사항] 설정 실패:', error);
    }
}

// === 재검증 상태 설정 (v2.2.0 추가) ===
setRevalidationStatus(status) {
    try {
        console.log('🔄 [티켓모듈] v2.2.0: 재검증 상태 설정:', status);
        
        // 재검증 진행 중이면 UI에 표시
        if (status && status.isValidationInProgress) {
            this.updateStatusMessage('활동기간을 검증하고 있습니다...', 'info');
        }
        
    } catch (error) {
        console.error('❌ [티켓모듈] v2.2.0: 재검증 상태 설정 실패:', error);
    }
}

// === 🔧 v2.2.0: 전역 재검증 결과 처리 (Coordinator 호환성) ===
handleGlobalRevalidationResult(result) {
    return this.handleRevalidationResult(result);
}
// === 항공권 날짜 변경 처리 ===
handleFlightDateChange(type) {
    try {
        console.log(`🔄 [항공권날짜] ${type} 날짜 변경 처리...`);
        
        // 항공권 날짜 검증
        this.validateFlightDatesOnly();
        
    } catch (error) {
        console.error(`❌ [항공권날짜] ${type} 날짜 변경 처리 실패:`, error);
    }
}

// === 항공권 날짜만 검증 ===
validateFlightDatesOnly() {
    try {
        const departureDate = document.getElementById('departureDate')?.value;
        const returnDate = document.getElementById('returnDate')?.value;
        
        if (!departureDate || !returnDate) {
            return {
                valid: false,
                message: '출국일과 귀국일을 모두 입력해주세요.'
            };
        }
        
        const departure = new Date(departureDate);
        const returnD = new Date(returnDate);
        
        if (departure >= returnD) {
            return {
                valid: false,
                message: '귀국일은 출국일보다 늦어야 합니다.'
            };
        }
        
        return {
            valid: true,
            message: '항공권 날짜가 올바르게 설정되었습니다.'
        };
        
    } catch (error) {
        console.error('❌ [항공권날짜검증] 실패:', error);
        return {
            valid: false,
            message: '항공권 날짜 검증 중 오류가 발생했습니다.'
        };
    }
}

    // 🚫 v2.2.0: 활동기간 검증 메서드들 제거됨
    // - validateActivityPeriod() → Init 모듈로 이전
    // - validateActivityPeriodWithUI() → 제거
    // - calculateAndShowActivityDaysImmediate() → 제거
    // - debouncedActivityValidationWithLoading() → 제거

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

    // 전체 데이터 검증 (v2.2.0: 활동기간 검증은 이미 완료된 상태)
    validateAllData() {
        try {
            // 활동기간 검증 - 이미 Coordinator에서 검증됨
            if (!this.isActivityPeriodValid) {
                this.showError('현지 활동기간이 검증되지 않았습니다.');
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
            
            // v2.2.0: 활동일 계산은 Init 모듈에서 처리
            
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
    // 🆕 v2.2.0: 단순화된 외부 인터페이스
    // ================================

    // 티켓 데이터 반환
    getTicketData() {
        return { ...this.ticketData };
    }

    // 🔧 v2.2.0: 전제조건 상태 반환 (단순화)
    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionEnabled
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

    // 디버깅 정보 반환 (v2.2.0 단순화)
    getDebugInfo() {
        return {
            version: '2.2.0',
            ticketData: this.ticketData,
            userRequirements: this.userRequirements,
            prerequisiteStatus: this.getPrerequisiteStatus(),
            flightSectionControl: this.flightSectionControl,
            hasApiService: !!this.apiService,
            hasUiService: !!this.uiService,
            hasPassportService: !!this.passportService
        };
    }

    // 🆕 v2.2.0: 정리 메서드
    destroy() {
        try {
            console.log('🗑️ [티켓모듈] v2.2.0: 인스턴스 정리...');
            
            // 상태 초기화
            this.flightSectionControl = null;
            this.ticketData = null;
            this.userRequirements = null;
            
            console.log('✅ [티켓모듈] v2.2.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.2.0: 인스턴스 정리 실패:', error);
        }
    }
}

// ================================
// 전역 스코프 노출
// ================================

// 전역 스코프에 클래스 노출
window.FlightRequestTicket = FlightRequestTicket;

console.log('✅ FlightRequestTicket v2.2.0 모듈 로드 완료 - Coordinator 재검증 시스템 연동');
console.log('🎯 v2.2.0 핵심 변경사항:', {
    responsibilities: [
        'Coordinator의 재검증 결과를 수신하여 UI 제어',
        '독자적인 활동일 검증 제거, Coordinator 의존',
        '항공권 정보 이미지 등록 및 Supabase 등록 기능'
    ],
    removedFeatures: [
        '활동일 변경 감지 이벤트 리스너',
        '독자적인 활동일 검증 로직',
        '자체 이벤트 발행 시스템',
        '복잡한 이벤트 통신 로직'
    ],
    improvements: [
        '단일 책임 원칙: UI 제어만 담당',
        'Init 모듈에 검증 로직 위임',
        'Coordinator 중심의 상태 관리',
        '코드 단순화 및 유지보수성 향상'
    ]
});

