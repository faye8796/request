// flight-request-ui.js - 항공권 신청 UI 관리 모듈 v8.2.5
// 🔧 v8.2.5: 항공권 검증 로직 수정 - 불필요한 활동기간 검증 제거
// 📝 변경사항:
//   - validateAllDates(): 항공권 검증에서 활동기간 최소/최대 검증 제거
//   - 항공권 검증은 순수하게 날짜 관계만 확인하도록 변경
//   - 활동기간 검증은 validateActivityPeriod()에서 별도 수행
//   - 중복 검증 로직 제거하여 명확성 향상
// 🚀 v8.2.4: 전제 조건 시스템 구현 및 메시지 시스템 개선
// 📝 변경사항:
//   - 현지 활동기간 완료 전까지 항공권 정보 섹션 비활성화
//   - 성공 메시지 제거, 실패 시에만 구체적 경고 표시
//   - 2일/10일 제약 검증 강화 (출국일/귀국일)
//   - 실시간 조건부 UI 활성화/비활성화

class FlightRequestUI {
    constructor() {
        this.api = null;
        this.utils = null;
        this.elements = this.initElements();
        this.imageFile = null;
        this.ticketFile = null;
        this.receiptFile = null;
        this.userProfile = null;
        this.existingRequest = null;
        
        // 현지 활동기간 관련 상태
        this.activityValidationEnabled = false;
        this.validationDebounceTimer = null;
        
        // 귀국 필수 완료일 관련 상태
        this.requiredReturnInfo = null;
        this.hasRequiredReturnDate = false;
        
        // 사용자별 최소/최대 체류일 관리
        this.userRequiredDays = null;
        this.userMaximumDays = null;
        this.isUserActivityRequirementsLoaded = false;
        
        // 🚀 v8.2.4: 전제 조건 시스템 관련 상태
        this.isActivityPeriodCompleted = false;
        this.isActivityPeriodValid = false;
        this.flightSectionEnabled = false;
        
        // 초기화 상태
        this.isInitialized = false;
        this.initializationPromise = this.init();
    }

    initElements() {
        return {
            // 로딩/컨텐츠
            loadingState: document.getElementById('loadingState'),
            mainContent: document.getElementById('mainContent'),
            passportAlert: document.getElementById('passportAlert'),
            existingRequest: document.getElementById('existingRequest'),
            requestForm: document.getElementById('requestForm'),
            
            // 항공권 신청 폼 요소
            form: document.getElementById('flightRequestForm'),
            purchaseType: document.getElementsByName('purchaseType'),
            departureDate: document.getElementById('departureDate'),
            returnDate: document.getElementById('returnDate'),
            durationMessage: document.getElementById('durationMessage'),
            
            // 현지 활동기간 요소들
            actualArrivalDate: document.getElementById('actualArrivalDate'),
            actualWorkEndDate: document.getElementById('actualWorkEndDate'),
            calculatedDays: document.getElementById('calculatedDays'),
            requiredDays: document.getElementById('requiredDays'),
            validationStatus: document.getElementById('validationStatus'),
            maximumValidationStatus: document.getElementById('maximumValidationStatus'),
            
            // 🚀 v8.2.4: 항공권 정보 섹션 (전제 조건 시스템용)
            flightInfoSection: this.findFlightInfoSection(),
            
            // 귀국 필수 완료일 관련 요소들
            requiredReturnDateInfo: document.getElementById('requiredReturnDateInfo'),
            requiredReturnDateWarning: document.getElementById('requiredReturnDateWarning'),
            returnDateConstraintInfo: document.getElementById('returnDateConstraintInfo'),
            
            departureAirport: document.getElementById('departureAirport'),
            arrivalAirport: document.getElementById('arrivalAirport'),
            purchaseLink: document.getElementById('purchaseLink'),
            purchaseLinkGroup: document.getElementById('purchaseLinkGroup'),
            flightImage: document.getElementById('flightImage'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            removeImage: document.getElementById('removeImage'),
            submitBtn: document.getElementById('submitBtn'),
            submitBtnText: document.getElementById('submitBtnText'),
            
            // 가격 정보 관련 요소들
            ticketPrice: document.getElementById('ticketPrice'),
            currency: document.getElementById('currency'),
            priceSource: document.getElementById('priceSource'),
            
            // 메시지
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage')
        };
    }

    // 🚀 v8.2.4: 항공권 정보 섹션 찾기
    findFlightInfoSection() {
        // 여러 가능한 셀렉터로 항공권 정보 섹션 찾기
        const selectors = [
            '.form-section:has(#departureDate)',
            '[data-flight-info]',
            '#flightInfoSection',
            '.form-section:nth-child(3)', // 3단계 섹션
            '.form-section:contains("항공권 정보")'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                // 구문 에러 무시하고 계속
            }
        }
        
        // 마지막 대안: departure_date 필드의 상위 섹션 찾기
        const departureElement = document.getElementById('departureDate');
        if (departureElement) {
            let parent = departureElement.parentElement;
            while (parent && !parent.classList.contains('form-section')) {
                parent = parent.parentElement;
            }
            return parent;
        }
        
        return null;
    }

    async init() {
        try {
            console.log('🔄 FlightRequestUI v8.2.5 초기화 시작 - 검증 로직 분리 구현...');
            
            // API 및 유틸리티 대기
            await this.waitForDependencies();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 현지 활동기간 검증 이벤트 설정
            this.setupActivityValidationEvents();
            
            // 귀국 필수 완료일 검증 이벤트 설정
            this.setupRequiredReturnDateEvents();
            
            // 🚀 v8.2.4: 전제 조건 시스템 이벤트 설정
            this.setupPrerequisiteSystemEvents();
            
            // 초기 데이터 로드
            setTimeout(() => {
                this.loadInitialData();
            }, 300);
            
            console.log('✅ FlightRequestUI v8.2.5 초기화 완료 - 검증 로직 분리 구현');
            
            this.isInitialized = true;
        } catch (error) {
            console.error('❌ FlightRequestUI 초기화 오류:', error);
            this.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    async waitForDependencies(timeout = 20000) {
        const startTime = Date.now();
        
        return new Promise((resolve, reject) => {
            const check = () => {
                const apiExists = !!window.flightRequestAPI;
                const apiInitialized = window.flightRequestAPI?.isInitialized;
                const utilsReady = !!window.FlightRequestUtils;
                
                if (apiExists && apiInitialized && utilsReady) {
                    this.api = window.flightRequestAPI;
                    this.utils = window.FlightRequestUtils;
                    console.log('✅ FlightRequestUI v8.2.5 의존성 로드 완료');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('의존성 로딩 시간 초과'));
                    return;
                }
                
                setTimeout(check, 100);
            };
            
            check();
        });
    }

    async ensureInitialized() {
        if (this.isInitialized && this.api && this.api.isInitialized) {
            return true;
        }

        if (!this.initializationPromise) {
            this.initializationPromise = this.init();
        }
        
        await this.initializationPromise;
        
        if (!this.isInitialized) {
            throw new Error('API 초기화 실패');
        }
        
        return true;
    }

    // 🚀 v8.2.4: 전제 조건 시스템 이벤트 설정
    setupPrerequisiteSystemEvents() {
        const activityElements = [
            this.elements.actualArrivalDate,
            this.elements.actualWorkEndDate
        ];

        activityElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.checkActivityPeriodCompletion();
                    this.updateFlightSectionAvailability();
                });
                
                element.addEventListener('input', () => {
                    setTimeout(() => {
                        this.checkActivityPeriodCompletion();
                        this.updateFlightSectionAvailability();
                    }, 100);
                });
            }
        });

        console.log('✅ [전제조건] v8.2.5: 전제 조건 시스템 이벤트 설정 완료');
    }

    // 🚀 v8.2.4: 현지 활동기간 완료 여부 확인
    checkActivityPeriodCompletion() {
        const arrivalDate = this.elements.actualArrivalDate?.value;
        const workEndDate = this.elements.actualWorkEndDate?.value;
        
        // 기본 완료 조건: 현지 활동기간이 모두 입력됨
        this.isActivityPeriodCompleted = !!(arrivalDate && workEndDate);
        
        // 유효성 검증 (사용자별 요구사항이 로드된 경우에만)
        if (this.isActivityPeriodCompleted && this.isUserActivityRequirementsLoaded) {
            const validation = this.validateActivityPeriod();
            this.isActivityPeriodValid = validation.valid;
        } else {
            this.isActivityPeriodValid = false;
        }
        
        console.log('🔍 [전제조건] v8.2.5: 현지 활동기간 완료 여부 확인:', {
            완료여부: this.isActivityPeriodCompleted,
            유효여부: this.isActivityPeriodValid,
            사용자요구사항로드됨: this.isUserActivityRequirementsLoaded,
            현지도착일: arrivalDate,
            학당근무종료일: workEndDate
        });
        
        return {
            completed: this.isActivityPeriodCompleted,
            valid: this.isActivityPeriodValid
        };
    }

    // 🚀 v8.2.4: 항공권 정보 섹션 활성화/비활성화 제어
    updateFlightSectionAvailability() {
        const flightSection = this.elements.flightInfoSection;
        if (!flightSection) {
            console.warn('⚠️ [전제조건] 항공권 정보 섹션을 찾을 수 없음');
            return;
        }

        const status = this.checkActivityPeriodCompletion();
        
        // 전제 조건: 현지 활동기간이 완료되고 유효해야 함
        const shouldEnable = status.completed && status.valid;
        
        this.flightSectionEnabled = shouldEnable;
        
        if (shouldEnable) {
            // 활성화
            flightSection.classList.remove('section-disabled');
            flightSection.style.opacity = '1';
            flightSection.style.pointerEvents = 'auto';
            
            // 비활성화 안내 메시지 숨김
            this.hideFlightSectionNotice();
            
            console.log('✅ [전제조건] v8.2.5: 항공권 정보 섹션 활성화');
        } else {
            // 비활성화
            flightSection.classList.add('section-disabled');
            flightSection.style.opacity = '0.5';
            flightSection.style.pointerEvents = 'none';
            
            // 비활성화 안내 메시지 표시
            this.showFlightSectionNotice();
            
            console.log('❌ [전제조건] v8.2.5: 항공권 정보 섹션 비활성화');
        }
        
        // 항공권 입력 필드들 활성화/비활성화
        this.toggleFlightInputFields(shouldEnable);
    }

    // 🚀 v8.2.4: 항공권 입력 필드들 활성화/비활성화
    toggleFlightInputFields(enabled) {
        const flightInputs = [
            this.elements.departureDate,
            this.elements.returnDate,
            this.elements.departureAirport,
            this.elements.arrivalAirport,
            this.elements.ticketPrice,
            this.elements.currency,
            this.elements.priceSource,
            this.elements.flightImage
        ].filter(Boolean);

        flightInputs.forEach(input => {
            if (enabled) {
                input.removeAttribute('disabled');
                input.style.backgroundColor = '';
                input.style.cursor = '';
            } else {
                input.setAttribute('disabled', 'disabled');
                input.style.backgroundColor = '#f5f5f5';
                input.style.cursor = 'not-allowed';
            }
        });

        // 구매 방식 라디오 버튼들
        if (this.elements.purchaseType && this.elements.purchaseType.length > 0) {
            Array.from(this.elements.purchaseType).forEach(radio => {
                if (enabled) {
                    radio.removeAttribute('disabled');
                } else {
                    radio.setAttribute('disabled', 'disabled');
                }
            });
        }
    }

    // 🚀 v8.2.4: 항공권 섹션 비활성화 안내 메시지 표시
    showFlightSectionNotice() {
        let noticeElement = document.getElementById('flightSectionNotice');
        
        if (!noticeElement) {
            noticeElement = document.createElement('div');
            noticeElement.id = 'flightSectionNotice';
            noticeElement.className = 'prerequisite-notice';
            noticeElement.style.cssText = `
                margin: 16px 0;
                padding: 12px 16px;
                background: linear-gradient(135deg, #fef3c7 0%, #fbbf24 100%);
                border: 1px solid #f59e0b;
                border-radius: 8px;
                color: #92400e;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 8px;
            `;
            
            const flightSection = this.elements.flightInfoSection;
            if (flightSection) {
                flightSection.insertBefore(noticeElement, flightSection.firstChild);
            }
        }
        
        noticeElement.innerHTML = `
            <i data-lucide="info" style="width: 16px; height: 16px; flex-shrink: 0;"></i>
            <span><strong>현지 활동기간을 먼저 완료해주세요.</strong> 현지 도착일과 학당 근무 종료일을 모두 입력하고 유효성 검증을 통과해야 항공권 정보를 입력할 수 있습니다.</span>
        `;
        noticeElement.style.display = 'flex';
        
        // 아이콘 재초기화
        if (this.utils?.refreshIcons) {
            this.utils.refreshIcons();
        } else if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 🚀 v8.2.4: 항공권 섹션 비활성화 안내 메시지 숨김
    hideFlightSectionNotice() {
        const noticeElement = document.getElementById('flightSectionNotice');
        if (noticeElement) {
            noticeElement.style.display = 'none';
        }
    }

    // 사용자별 활동기간 요구사항 로드
    async loadUserActivityRequirements() {
        try {
            if (!this.api) {
                throw new Error('API가 초기화되지 않았습니다.');
            }

            console.log('🔄 [활동요구사항] v8.2.5: 사용자별 최소/최대 체류일 로드 시작...');

            const activityData = await this.api.getUserProfileActivityDates();
            
            if (activityData && activityData.minimum_required_days && activityData.maximum_allowed_days) {
                this.userRequiredDays = activityData.minimum_required_days;
                this.userMaximumDays = activityData.maximum_allowed_days;
                
                console.log('✅ [활동요구사항] v8.2.5: 사용자별 체류일 로드 완료:', {
                    사용자ID: this.userProfile?.id || 'unknown',
                    최소요구일: this.userRequiredDays,
                    최대허용일: this.userMaximumDays
                });
            } else {
                const requirements = await this.api.getActivityRequirements();
                if (requirements && requirements.minimumDays && requirements.maximumDays) {
                    this.userRequiredDays = requirements.minimumDays;
                    this.userMaximumDays = requirements.maximumDays;
                    
                    console.log('✅ [활동요구사항] v8.2.5: API 기본값 로드 완료:', {
                        최소요구일: this.userRequiredDays,
                        최대허용일: this.userMaximumDays,
                        데이터소스: requirements.source
                    });
                } else {
                    throw new Error('API에서 활동 요구사항을 로드할 수 없습니다.');
                }
            }

            // UI에 반영
            this.updateRequiredDaysUI();
            this.isUserActivityRequirementsLoaded = true;
            
            // 🚀 v8.2.4: 활동기간 완료 여부 재확인
            setTimeout(() => {
                this.checkActivityPeriodCompletion();
                this.updateFlightSectionAvailability();
            }, 100);
            
            return true;

        } catch (error) {
            console.error('❌ [활동요구사항] v8.2.5: 사용자 활동기간 요구사항 로드 실패:', error);
            
            this.userRequiredDays = null;
            this.userMaximumDays = null;
            
            this.updateRequiredDaysUIError(error.message);
            
            throw error;
        }
    }

    // 최소 요구일 UI 업데이트
    updateRequiredDaysUI() {
        try {
            if (!this.userRequiredDays || !this.userMaximumDays) {
                console.error('❌ [활동요구사항] 사용자별 요구사항이 로드되지 않았습니다:', {
                    userRequiredDays: this.userRequiredDays,
                    userMaximumDays: this.userMaximumDays
                });
                return;
            }
            
            // 최소 요구일 업데이트
            if (this.elements.requiredDays) {
                this.elements.requiredDays.textContent = this.userRequiredDays;
                this.elements.requiredDays.className = 'value';
                
                console.log('✅ [활동요구사항] v8.2.5: 최소 요구일 UI 업데이트 완료:', {
                    요소: '#requiredDays',
                    새값: this.userRequiredDays,
                    사용자: this.userProfile?.name || 'unknown'
                });
            }

            // 검증 시에도 사용자별 값 사용하도록 재검증
            setTimeout(() => {
                this.validateActivityPeriod();
            }, 100);

        } catch (error) {
            console.error('❌ [활동요구사항] v8.2.5: 최소/최대 요구일 UI 업데이트 실패:', error);
        }
    }

    // UI 에러 상태 표시
    updateRequiredDaysUIError(errorMessage) {
        try {
            if (this.elements.requiredDays) {
                this.elements.requiredDays.textContent = '로드 실패';
                this.elements.requiredDays.className = 'value error';
                this.elements.requiredDays.style.color = '#dc2626';
            }

            if (this.elements.validationStatus) {
                this.elements.validationStatus.className = 'validation-status invalid';
                this.elements.validationStatus.innerHTML = 
                    `<i data-lucide="x-circle"></i>활동 요구사항 로드 실패: ${errorMessage}`;
                this.elements.validationStatus.style.display = 'flex';
            }

        } catch (error) {
            console.error('❌ [활동요구사항] UI 에러 상태 표시 실패:', error);
        }
    }

    // 귀국 필수 완료일 검증 이벤트 설정
    setupRequiredReturnDateEvents() {
        if (this.elements.returnDate) {
            this.elements.returnDate.addEventListener('change', () => {
                this.validateReturnDateConstraints();
            });
            
            this.elements.returnDate.addEventListener('input', () => {
                this.debouncedReturnDateValidation();
            });
        }

        console.log('✅ [귀국일검증] v8.2.5: 귀국 필수 완료일 검증 이벤트 설정 완료');
    }

    // 디바운스된 귀국일 검증
    debouncedReturnDateValidation() {
        if (this.returnValidationDebounceTimer) {
            clearTimeout(this.returnValidationDebounceTimer);
        }

        this.returnValidationDebounceTimer = setTimeout(() => {
            this.validateReturnDateConstraints();
        }, 500);
    }

    // 🚀 v8.2.4: 귀국일 제약사항 검증 - 성공 메시지 제거 정책 적용
    async validateReturnDateConstraints() {
        if (!this.api || !this.elements.returnDate) {
            return { valid: true };
        }

        const returnDate = this.elements.returnDate.value;
        if (!returnDate) {
            this.clearReturnDateConstraintUI();
            return { valid: true };
        }

        try {
            // 필수 귀국 완료일(2025-12-12)과 비교
            const requiredReturnDate = '2025-12-12';
            const returnD = new Date(returnDate);
            const requiredD = new Date(requiredReturnDate);
            
            let validation = { valid: true };
            
            // 🚀 v8.2.4: 필수 귀국일을 초과한 경우에만 에러 표시
            if (returnD > requiredD) {
                validation = {
                    valid: false,
                    message: '모든 문화인턴은 12월 12일까지 귀국을 완료해야합니다',
                    code: 'REQUIRED_RETURN_DATE_EXCEEDED'
                };
            } else {
                // 🚀 v8.2.4: 정상 범위에서는 메시지 숨김 (성공 메시지 제거 정책)
                validation = {
                    valid: true,
                    message: '', // 성공 시 메시지 없음
                    hideMessage: true
                };
            }
            
            this.updateReturnDateConstraintUI(validation);
            
            return validation;
            
        } catch (error) {
            console.error('❌ [귀국일검증] 제약사항 검증 실패:', error);
            return { valid: false, message: '검증 중 오류가 발생했습니다.' };
        }
    }

    // 🚀 v8.2.4: 귀국일 제약사항 UI 업데이트 - 성공 메시지 제거 정책 적용
    updateReturnDateConstraintUI(validation) {
        const constraintElement = this.elements.returnDateConstraintInfo || 
                                 document.querySelector('.return-date-constraint-info');
        
        if (!constraintElement) {
            // 🚀 v8.2.4: 정상 범위에서는 요소 생성하지 않음
            if (validation.hideMessage) {
                return;
            }
            this.createReturnDateConstraintElement();
            return;
        }

        constraintElement.className = 'return-date-constraint-info';
        
        // 🚀 v8.2.4: 정상 범위에서는 메시지 숨김
        if (validation.hideMessage || validation.valid) {
            constraintElement.style.display = 'none';
            
            if (this.elements.returnDate) {
                this.elements.returnDate.style.borderColor = '';
            }
            return;
        }
        
        if (!validation.valid) {
            constraintElement.classList.add('constraint-error');
            constraintElement.innerHTML = `
                <i data-lucide="alert-circle"></i>
                <span class="constraint-message">${validation.message}</span>
            `;
            constraintElement.style.display = 'flex';
            constraintElement.style.alignItems = 'center';
            constraintElement.style.color = '#dc3545';
            constraintElement.style.backgroundColor = '#f8d7da';
            constraintElement.style.border = '1px solid #f5c6cb';
            constraintElement.style.padding = '8px 12px';
            constraintElement.style.borderRadius = '4px';
            constraintElement.style.marginTop = '4px';
            
            if (this.elements.returnDate) {
                this.elements.returnDate.style.borderColor = '#dc3545';
            }
        }
        
        if (this.utils?.refreshIcons) {
            this.utils.refreshIcons();
        } else if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    clearReturnDateConstraintUI() {
        const constraintElement = this.elements.returnDateConstraintInfo || 
                                 document.querySelector('.return-date-constraint-info');
        
        if (constraintElement) {
            constraintElement.style.display = 'none';
        }
        
        if (this.elements.returnDate) {
            this.elements.returnDate.style.borderColor = '';
        }
    }

    createReturnDateConstraintElement() {
        if (!this.elements.returnDate) return;
        
        const constraintElement = document.createElement('div');
        constraintElement.className = 'return-date-constraint-info';
        constraintElement.style.display = 'none';
        constraintElement.style.alignItems = 'center';
        constraintElement.style.gap = '8px';
        constraintElement.style.padding = '8px 12px';
        constraintElement.style.marginTop = '4px';
        constraintElement.style.borderRadius = '4px';
        constraintElement.style.fontSize = '14px';
        
        const returnDateContainer = this.elements.returnDate.parentElement;
        if (returnDateContainer) {
            returnDateContainer.appendChild(constraintElement);
            this.elements.returnDateConstraintInfo = constraintElement;
        }
    }

    // 현지 활동기간 검증 이벤트 설정
    setupActivityValidationEvents() {
        const elements = [
            this.elements.actualArrivalDate,
            this.elements.actualWorkEndDate,
            this.elements.departureDate,
            this.elements.returnDate
        ];

        elements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.debouncedActivityValidation();
                });
            }
        });

        console.log('✅ [활동기간검증] v8.2.5: 현지 활동기간 검증 이벤트 설정 완료');
    }

    // 디바운스된 활동기간 검증
    debouncedActivityValidation() {
        if (this.validationDebounceTimer) {
            clearTimeout(this.validationDebounceTimer);
        }

        this.validationDebounceTimer = setTimeout(() => {
            this.validateActivityPeriod();
        }, 300);
    }

    // 🔧 v8.2.5: 현지 활동기간 검증 메서드 (순수 활동기간만 검증)
    validateActivityPeriod() {
        if (!this.utils) {
            console.warn('⚠️ [활동기간검증] Utils가 준비되지 않음');
            return { valid: true };
        }

        if (!this.userRequiredDays || !this.userMaximumDays) {
            console.warn('⚠️ [활동기간검증] 사용자별 활동 요구사항이 로드되지 않음');
            return { valid: true };
        }

        const arrivalDate = this.elements.actualArrivalDate?.value;
        const workEndDate = this.elements.actualWorkEndDate?.value;

        console.log('🔍 [활동기간검증] v8.2.5 순수 활동기간 검증 시작:', {
            현지도착일: arrivalDate,
            학당근무종료일: workEndDate,
            사용자최소요구일: this.userRequiredDays,
            사용자최대허용일: this.userMaximumDays,
            분리된검증: '✅ 활동기간만 검증'
        });

        // 🔧 v8.2.5: 순수 활동기간 검증 (항공권 날짜와 분리)
        let validation;
        if (arrivalDate && workEndDate) {
            const activityDays = this.utils.calculateActivityDays(arrivalDate, workEndDate);
            
            const rangeValidation = this.utils.validateActivityDaysRange(
                activityDays, 
                this.userRequiredDays, 
                this.userMaximumDays
            );
            
            validation = {
                valid: rangeValidation.valid,
                errors: rangeValidation.errors,
                warnings: rangeValidation.warnings,
                activityDays: activityDays,
                exceedsMaximum: !rangeValidation.maximumCheck.valid,
                maximumCheck: rangeValidation.maximumCheck,
                minimumCheck: rangeValidation.minimumCheck,
                inValidRange: rangeValidation.inValidRange
            };
        } else {
            validation = {
                valid: false,
                errors: ['현지 도착일과 학당 근무 종료일을 모두 입력해주세요.'],
                warnings: [],
                activityDays: 0,
                exceedsMaximum: false,
                maximumCheck: null,
                minimumCheck: null,
                inValidRange: false
            };
        }

        console.log('✅ [활동기간검증] v8.2.5 순수 활동기간 검증 결과:', {
            ...validation,
            적용된최소요구일: this.userRequiredDays,
            적용된최대허용일: this.userMaximumDays,
            정상범위여부: validation.inValidRange,
            검증분리: '✅ 완료'
        });

        // UI 업데이트
        this.updateActivityValidationUI(validation);

        return validation;
    }

    // 🚀 v8.2.4: 활동기간 검증 UI 업데이트 - 성공 메시지 제거 정책 적용
    updateActivityValidationUI(validation) {
        // 계산된 활동일 표시
        if (this.elements.calculatedDays) {
            this.elements.calculatedDays.textContent = validation.activityDays > 0 ? 
                validation.activityDays : '-';
        }

        // 🚀 v8.2.4: 최대 활동일 초과 상태 - 에러인 경우에만 표시
        if (this.elements.maximumValidationStatus && validation.maximumCheck) {
            this.elements.maximumValidationStatus.className = 'maximum-validation-status';
            
            if (!validation.maximumCheck.valid) {
                this.elements.maximumValidationStatus.classList.add('invalid');
                this.elements.maximumValidationStatus.innerHTML = 
                    `<i data-lucide="x-circle"></i><strong>최대 활동일 초과:</strong> ${validation.maximumCheck.message}`;
                this.elements.maximumValidationStatus.style.display = 'flex';
                this.elements.maximumValidationStatus.style.alignItems = 'center';
                this.elements.maximumValidationStatus.style.color = '#dc3545';
                this.elements.maximumValidationStatus.style.backgroundColor = '#f8d7da';
                this.elements.maximumValidationStatus.style.border = '1px solid #f5c6cb';
                this.elements.maximumValidationStatus.style.padding = '8px 12px';
                this.elements.maximumValidationStatus.style.borderRadius = '4px';
                this.elements.maximumValidationStatus.style.marginTop = '8px';
            } else {
                // 🚀 v8.2.4: 정상이거나 경고인 경우 메시지 숨김
                this.elements.maximumValidationStatus.style.display = 'none';
            }
        }

        // 🚀 v8.2.4: 검증 상태 표시 - 성공 메시지 제거 정책 적용
        if (this.elements.validationStatus) {
            this.elements.validationStatus.className = 'validation-status';
            
            if (!validation.valid) {
                // 에러인 경우에만 표시
                this.elements.validationStatus.classList.add('invalid');
                
                const message = validation.errors.join(' / ');
                this.elements.validationStatus.innerHTML = 
                    `<i data-lucide="x-circle"></i>${message}`;
                this.elements.validationStatus.style.display = 'flex';
                this.elements.validationStatus.style.alignItems = 'center';
                this.elements.validationStatus.style.color = '#dc3545';
                this.elements.validationStatus.style.backgroundColor = '#f8d7da';
                this.elements.validationStatus.style.border = '1px solid #f5c6cb';
                this.elements.validationStatus.style.padding = '8px 12px';
                this.elements.validationStatus.style.borderRadius = '4px';
                this.elements.validationStatus.style.marginTop = '8px';
                
            } else {
                // 🚀 v8.2.4: 정상 범위인 경우 메시지 숨김 (성공 메시지 제거 정책)
                this.elements.validationStatus.style.display = 'none';
            }
            
            if (this.utils?.refreshIcons) {
                this.utils.refreshIcons();
            } else if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }

    // 초기 데이터 로드
    async loadInitialData() {
        try {
            console.log('🔄 [초기데이터] v8.2.5 초기 데이터 로드 시작 - 검증 로직 분리 적용');
            
            await this.ensureInitialized();
            
            if (!this.api) {
                throw new Error('API가 초기화되지 않았습니다.');
            }

            // 사용자 프로필 가져오기
            try {
                this.userProfile = await this.api.getUserProfile();
                console.log('✅ [초기데이터] 사용자 프로필 로드 성공:', {
                    id: this.userProfile?.id,
                    name: this.userProfile?.name,
                    dispatch_duration: this.userProfile?.dispatch_duration
                });
            } catch (error) {
                console.error('❌ [초기데이터] 사용자 프로필 로드 실패:', error);
                throw error;
            }

            // 사용자별 활동기간 요구사항 로드
            try {
                await this.loadUserActivityRequirements();
                console.log('✅ [초기데이터] 사용자별 활동기간 요구사항 로드 완료');
            } catch (error) {
                console.error('❌ [초기데이터] 사용자 활동기간 요구사항 로드 실패:', error);
                throw error;
            }

            // 여권정보 확인
            try {
                const passportExists = await this.api.checkPassportInfo();
                console.log('🔍 [초기데이터] 여권정보 존재 여부:', passportExists);
                
                if (!passportExists) {
                    console.log('❌ [초기데이터] 여권정보 없음 - 여권정보 등록 페이지로 이동');
                    this.showPassportInfoPage();
                } else {
                    console.log('✅ [초기데이터] 여권정보 확인됨 - 항공권 신청 페이지 표시');
                    this.showFlightRequestPage();
                    
                    // 항공권 신청 데이터 로드
                    setTimeout(() => {
                        this.loadFlightRequestData();
                    }, 200);
                }
            } catch (error) {
                console.error('❌ [초기데이터] 여권정보 확인 오류:', error);
                this.showFlightRequestPageWithoutData();
            }
        } catch (error) {
            console.error('❌ [초기데이터] 초기 데이터 로드 실패:', error);
            this.showError('시스템 초기화에 실패했습니다. 페이지를 새로고침하거나 관리자에게 문의해주세요.');
        }
    }

    showFlightRequestPageWithoutData() {
        console.log('🔄 [초기데이터] v8.2.5 기본 항공권 신청 페이지 표시 (데이터 없음)');
        
        this.showFlightRequestPage();
        this.showPassportAlert();
        
        console.log('✅ [초기데이터] 기본 UI 표시 완료');
    }

    setupEventListeners() {
        // DOM 요소 null 체크 강화
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // 구매 방식 변경
        if (this.elements.purchaseType && this.elements.purchaseType.length > 0) {
            this.elements.purchaseType.forEach(radio => {
                radio.addEventListener('change', () => this.handlePurchaseTypeChange());
            });
        }

        // 🔧 v8.2.5: 순수 항공권 날짜 검증으로 변경
        if (this.elements.departureDate) {
            this.elements.departureDate.addEventListener('change', () => this.validateFlightDatesOnly());
        }
        
        if (this.elements.returnDate) {
            this.elements.returnDate.addEventListener('change', () => this.validateFlightDatesOnly());
        }

        // 이미지 업로드
        if (this.elements.flightImage) {
            this.elements.flightImage.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        if (this.elements.removeImage) {
            this.elements.removeImage.addEventListener('click', () => this.removeImage());
        }

        // 오늘 날짜로 최소값 설정
        const today = new Date().toISOString().split('T')[0];
        if (this.elements.departureDate) {
            this.elements.departureDate.min = today;
        }
        if (this.elements.returnDate) {
            this.elements.returnDate.min = today;
        }
    }

    // 🔧 v8.2.5: 순수 항공권 날짜 관계 검증 (활동기간 검증 제외)
    validateFlightDatesOnly() {
        if (!this.utils) {
            console.warn('⚠️ [항공권검증] Utils가 준비되지 않음');
            return true;
        }

        const departureDate = this.elements.departureDate?.value;
        const returnDate = this.elements.returnDate?.value;
        const actualArrivalDate = this.elements.actualArrivalDate?.value;
        const actualWorkEndDate = this.elements.actualWorkEndDate?.value;

        console.log('🔍 [항공권검증] v8.2.5 순수 항공권 날짜 관계 검증 시작:', {
            출국일: departureDate,
            귀국일: returnDate,
            현지도착일: actualArrivalDate,
            학당근무종료일: actualWorkEndDate,
            분리된검증: '✅ 날짜 관계만 확인'
        });

        // 🔧 v8.2.5: 기본 항공권 날짜 검증 (활동기간 최소/최대 검증 제외)
        if (departureDate && returnDate) {
            const basicValidation = this.utils.validateDates(departureDate, returnDate);
            
            if (!basicValidation.valid) {
                if (this.elements.durationMessage) {
                    this.elements.durationMessage.textContent = basicValidation.message;
                    this.elements.durationMessage.style.color = '#dc3545';
                }
                return false;
            }

            // 파견 기간 계산 및 검증
            const departure = new Date(departureDate);
            const returnD = new Date(returnDate);
            const duration = Math.ceil((returnD - departure) / (1000 * 60 * 60 * 24));
            
            const dispatchDuration = this.userProfile?.dispatch_duration || 90;
            const durationValidation = this.utils.validateDispatchDuration(duration, dispatchDuration);
            
            if (this.elements.durationMessage) {
                if (durationValidation.valid) {
                    this.elements.durationMessage.textContent = ''; // 성공 시 메시지 없음
                } else {
                    this.elements.durationMessage.textContent = durationValidation.message;
                    this.elements.durationMessage.style.color = '#dc3545';
                }
            }
        }

        // 🔧 v8.2.5: 순수 날짜 관계 검증 (2일/10일 제약)
        if (departureDate && actualArrivalDate && actualWorkEndDate && returnDate) {
            const flightValidation = this.utils.validateFlightDatesOnly(
                departureDate, actualArrivalDate, actualWorkEndDate, returnDate
            );
            
            if (!flightValidation.valid) {
                if (this.elements.durationMessage) {
                    this.elements.durationMessage.textContent = flightValidation.errors.join(', ');
                    this.elements.durationMessage.style.color = '#dc3545';
                }
                return false;
            }
        } else if (departureDate && actualArrivalDate) {
            // 현지 도착일만 있는 경우 출국일 제약 확인
            const departure = new Date(departureDate);
            const arrival = new Date(actualArrivalDate);
            const daysDiff = Math.ceil((arrival - departure) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 2) {
                if (this.elements.durationMessage) {
                    this.elements.durationMessage.textContent = '출국일은 현지 도착일 2일 이내여야 합니다';
                    this.elements.durationMessage.style.color = '#dc3545';
                }
                return false;
            }
        } else if (returnDate && actualWorkEndDate) {
            // 학당 근무 종료일만 있는 경우 귀국일 제약 확인
            const returnD = new Date(returnDate);
            const workEnd = new Date(actualWorkEndDate);
            const daysDiff = Math.ceil((returnD - workEnd) / (1000 * 60 * 60 * 24));
            
            if (daysDiff >= 10) {
                if (this.elements.durationMessage) {
                    this.elements.durationMessage.textContent = '귀국일은 학당 근무종료일 10일 이내여야 합니다';
                    this.elements.durationMessage.style.color = '#dc3545';
                }
                return false;
            }
        }

        // 귀국일 제약사항 검증
        if (returnDate) {
            this.validateReturnDateConstraints();
        }

        console.log('✅ [항공권검증] v8.2.5 순수 항공권 날짜 관계 검증 완료');

        return true;
    }

    // 🔧 v8.2.5: 항공권 신청 제출 - 검증 로직 분리 적용
    async handleSubmit(event) {
        event.preventDefault();

        try {
            await this.ensureInitialized();

            if (!this.userRequiredDays || !this.userMaximumDays) {
                this.showError('사용자별 활동 요구사항이 로드되지 않았습니다. 페이지를 새로고침해주세요.');
                return;
            }

            // 🚀 v8.2.4: 전제 조건 확인 - 현지 활동기간 완료 및 유효성 검증
            if (!this.flightSectionEnabled) {
                this.showError('현지 활동기간을 먼저 완료하고 유효성 검증을 통과해주세요.');
                return;
            }

            // 🔧 v8.2.5: 순수 항공권 날짜 관계 검증
            if (!this.validateFlightDatesOnly()) {
                return;
            }

            // 🔧 v8.2.5: 활동기간 검증 (별도 수행)
            const hasActivityDates = this.elements.actualArrivalDate?.value && 
                                   this.elements.actualWorkEndDate?.value;
            
            if (hasActivityDates) {
                const activityValidation = this.validateActivityPeriod();
                
                if (!activityValidation.valid) {
                    const errorMessage = activityValidation.errors.join(', ');
                    this.showError(`활동기간 문제: ${errorMessage} (사용자별 요구사항: ${this.userRequiredDays}일~${this.userMaximumDays}일)`);
                    
                    if (!activityValidation.maximumCheck?.valid) {
                        console.error('❌ [제출검증] 최대 활동일 초과:', {
                            활동일: activityValidation.activityDays,
                            최대허용일: this.userMaximumDays,
                            초과일: activityValidation.activityDays - this.userMaximumDays,
                            사용자: this.userProfile?.name
                        });
                        
                        if (this.elements.actualWorkEndDate) {
                            this.elements.actualWorkEndDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            this.elements.actualWorkEndDate.focus();
                        }
                    }
                    
                    return;
                }
                
                console.log('✅ [제출검증] v8.2.5: 사용자별 활동일 범위 검증 통과:', {
                    활동일: activityValidation.activityDays,
                    최소요구일: this.userRequiredDays,
                    최대허용일: this.userMaximumDays
                });
            }

            // 가격 정보 검증
            if (!this.validatePriceFields()) {
                return;
            }

            // 이미지 확인
            const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
            if (!isUpdate && !this.imageFile) {
                this.showError('항공권 정보 이미지를 업로드해주세요.');
                return;
            }

            this.setLoading(true);

            const selectedType = Array.from(this.elements.purchaseType || [])
                .find(radio => radio.checked)?.value || 'direct';

            // 🔧 v8.2.5: 사용자별 요구사항 포함한 요청 데이터 구성
            const requestData = {
                purchase_type: selectedType,
                departure_date: this.elements.departureDate?.value || '',
                return_date: this.elements.returnDate?.value || '',
                departure_airport: this.elements.departureAirport?.value?.trim() || '',
                arrival_airport: this.elements.arrivalAirport?.value?.trim() || '',
                purchase_link: selectedType === 'agency' ? this.elements.purchaseLink?.value?.trim() || null : null,
                ticket_price: this.elements.ticketPrice?.value || '',
                currency: this.elements.currency?.value || 'KRW',
                price_source: this.elements.priceSource?.value?.trim() || '',
                actual_arrival_date: this.elements.actualArrivalDate?.value || null,
                actual_work_end_date: this.elements.actualWorkEndDate?.value || null,
                minimum_required_days: this.userRequiredDays,
                maximum_allowed_days: this.userMaximumDays
            };

            // 활동일 계산 (유효한 경우에만)
            if (requestData.actual_arrival_date && requestData.actual_work_end_date) {
                requestData.actual_work_days = this.utils.calculateActivityDays(
                    requestData.actual_arrival_date, 
                    requestData.actual_work_end_date
                );
            }

            console.log('🔍 [제출검증] v8.2.5 제출 데이터 (검증 로직 분리 적용):', {
                ...requestData,
                actual_work_days: requestData.actual_work_days,
                hasRequiredReturnDate: this.hasRequiredReturnDate,
                requiredReturnDate: this.requiredReturnInfo?.requiredDate,
                검증로직분리: '✅ 완료',
                사용자별최소요구일: this.userRequiredDays,
                사용자별최대허용일: this.userMaximumDays
            });

            let result;
            if (isUpdate) {
                requestData.version = this.existingRequest.version;
                requestData.status = 'pending';
                result = await this.api.updateFlightRequest(
                    this.existingRequest.id,
                    requestData,
                    this.imageFile
                );
                this.showSuccess('항공권 신청이 성공적으로 수정되었습니다.');
            } else {
                result = await this.api.createFlightRequest(requestData, this.imageFile);
                this.showSuccess('항공권 신청이 성공적으로 접수되었습니다.');
            }

            // 3초 후 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);

        } catch (error) {
            console.error('신청 실패:', error);
            
            if (error.message && error.message.includes('최대 활동일')) {
                this.showError(error.message);
                
                if (this.elements.actualWorkEndDate) {
                    this.elements.actualWorkEndDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.elements.actualWorkEndDate.focus();
                }
            } 
            else if (error.message && error.message.includes('귀국일 제약사항')) {
                this.showError(error.message);
                
                if (this.elements.returnDate) {
                    this.elements.returnDate.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    this.elements.returnDate.focus();
                }
            } else {
                this.showError(error.message || '신청 중 오류가 발생했습니다.');
            }
        } finally {
            this.setLoading(false);
        }
    }

    // 기본적인 UI 메서드들
    showFlightRequestPage() {
        if (typeof window.showFlightRequestPage === 'function') {
            window.showFlightRequestPage();
        }
    }
    
    showPassportInfoPage() {
        try {
            console.log('🔄 [페이지전환] v8.2.5 여권정보 페이지 표시...');
            
            const flightRequestPage = document.getElementById('flightRequestPage');
            const passportInfoPage = document.getElementById('passportInfoPage');
            
            if (flightRequestPage && passportInfoPage) {
                flightRequestPage.classList.remove('active');
                passportInfoPage.classList.add('active');
            }
            
        } catch (error) {
            console.error('❌ [페이지전환] 여권정보 페이지 표시 실패:', error);
        }
    }

    validatePriceFields() {
        const ticketPrice = this.elements.ticketPrice?.value?.trim();
        const currency = this.elements.currency?.value;
        const priceSource = this.elements.priceSource?.value?.trim();

        if (!ticketPrice) {
            this.showError('항공권 가격을 입력해주세요.');
            return false;
        }

        if (!currency) {
            this.showError('통화를 선택해주세요.');
            return false;
        }

        if (!priceSource) {
            this.showError('가격 정보 출처를 입력해주세요.');
            return false;
        }

        const priceNum = parseFloat(ticketPrice);
        if (isNaN(priceNum) || priceNum <= 0) {
            this.showError('유효한 가격을 입력해주세요.');
            return false;
        }

        return true;
    }

    // 🚀 v8.2.4: 성공 메시지 표시 (중요한 작업 완료 시에만)
    showSuccess(message) {
        console.log('✅ [성공] v8.2.5:', message);
        
        // 🚀 v8.2.4: 중요한 작업 완료인 경우에만 표시
        if (message && (message.includes('성공적으로') || message.includes('완료'))) {
            if (this.elements.successMessage) {
                this.elements.successMessage.textContent = message;
                this.elements.successMessage.style.display = 'block';
                
                this.elements.successMessage.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'center' 
                });
                
                // 3초 후 자동 숨김 (기존 5초에서 단축)
                setTimeout(() => {
                    if (this.elements.successMessage) {
                        this.elements.successMessage.style.display = 'none';
                    }
                }, 3000);
            }
        }
    }

    showError(message) {
        console.error('🚨 [오류] v8.2.5:', message);
        
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
            
            this.elements.errorMessage.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            setTimeout(() => {
                if (this.elements.errorMessage) {
                    this.elements.errorMessage.style.display = 'none';
                }
            }, 10000);
        } else {
            alert('오류: ' + message);
        }
    }

    setLoading(loading) {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = loading;
        }
        
        const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
        if (this.elements.submitBtnText) {
            this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
                (isUpdate ? '수정하기' : '신청하기');
        }
    }

    showPassportAlert() {
        if (this.elements.passportAlert) {
            this.elements.passportAlert.style.display = 'block';
        }
    }

    handlePurchaseTypeChange() {
        if (!this.elements.purchaseType || this.elements.purchaseType.length === 0) return;
        
        const selectedType = Array.from(this.elements.purchaseType)
            .find(radio => radio.checked)?.value;
        
        if (this.elements.purchaseLinkGroup) {
            if (selectedType === 'agency') {
                this.elements.purchaseLinkGroup.style.display = 'block';
            } else {
                this.elements.purchaseLinkGroup.style.display = 'none';
                if (this.elements.purchaseLink) {
                    this.elements.purchaseLink.value = '';
                }
            }
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('파일 크기는 5MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        this.imageFile = file;

        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.elements.previewImg) {
                this.elements.previewImg.src = e.target.result;
            }
            if (this.elements.imagePreview) {
                this.elements.imagePreview.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.imageFile = null;
        if (this.elements.flightImage) {
            this.elements.flightImage.value = '';
        }
        if (this.elements.imagePreview) {
            this.elements.imagePreview.style.display = 'none';
        }
        if (this.elements.previewImg) {
            this.elements.previewImg.src = '';
        }
    }

    // 간소화된 메서드들
    loadFlightRequestData() {
        console.log('🔄 [데이터로드] 항공권 신청 데이터 로드 (간소화 버전)');
    }

    handleFileUpload(event, type) {
        console.log(`파일 업로드: ${type}`, event.target.files[0]);
    }

    async handleTicketSubmit(event) {
        event.preventDefault();
        console.log('항공권 제출:', this.ticketFile);
    }

    async handleReceiptSubmit(event) {
        event.preventDefault();
        console.log('영수증 제출:', this.receiptFile);
    }
}

// 전역 스코프에 노출
window.FlightRequestUI = FlightRequestUI;

console.log('✅ FlightRequestUI v8.2.5 모듈 로드 완료 - 항공권 검증 로직 분리 및 불필요한 검증 제거');
console.log('🔧 v8.2.5 주요 수정사항:', {
    flightValidationSeparation: {
        description: '항공권 검증과 활동기간 검증 완전 분리',
        flightValidation: 'validateFlightDatesOnly() - 순수 날짜 관계만 확인',
        activityValidation: 'validateActivityPeriod() - 별도 수행',
        result: '중복 검증 제거로 논리적 구조 개선'
    },
    validationLogicSeparation: {
        before: 'validateAllDates() - 항공권과 활동기간 검증 혼재',
        after: 'validateFlightDatesOnly() + validateActivityPeriod() 분리 실행',
        benefit: '검증 책임 명확히 분리하여 유지보수성 향상',
        clarity: '각 검증의 목적과 범위 명확화'
    },
    duplicateValidationRemoval: {
        issue: '항공권 검증에서 불필요한 활동기간 최소/최대 검증 수행',
        solution: '항공권은 날짜 관계만, 활동기간은 별도 범위 검증',
        result: '100일 활동기간에 109일 체류 허용 가능',
        performance: '불필요한 검증 제거로 성능 최적화'
    },
    technicalImprovements: {
        eventListeners: 'setupEventListeners() - 검증 메서드 분리 반영',
        handleSubmit: '제출 시 분리된 검증 로직 순차 수행',
        errorHandling: '각 검증 단계별 명확한 에러 처리',
        userExperience: '검증 실패 시 해당 필드로 포커스 이동'
    },
    codeQuality: {
        readability: '검증 로직 가독성 대폭 향상',
        maintainability: '각 검증의 독립성으로 유지보수 용이',
        testability: '분리된 메서드로 단위 테스트 용이',
        debuggability: '문제 발생 시 원인 파악 용이'
    }
});
