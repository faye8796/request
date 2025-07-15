// flight-request-ui.js - 항공권 신청 UI 관리 모듈 v8.2.5
// 🔧 v8.2.5: 검증 메시지 구분 개선 - 항공권 날짜 vs 활동기간 검증 분리
// 📝 변경사항:
//   - 항공권 날짜 검증(10일 이내 귀국) vs 활동기간 검증(최대 활동일) 명확히 구분
//   - 정상 조건 만족 시 해당 검증 메시지 완전 숨김
//   - 각 검증별 독립적인 UI 요소로 표시
//   - 사용자 혼란 방지를 위한 메시지 구분
// 🚀 v8.2.4: 전제 조건 시스템 구현 및 메시지 시스템 개선 (기존 기능 유지)

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
            console.log('🔄 FlightRequestUI v8.2.5 초기화 시작 - 검증 메시지 구분 개선...');
            
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
            
            console.log('✅ FlightRequestUI v8.2.5 초기화 완료 - 검증 메시지 구분 개선');
            
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

    // 🔧 v8.2.5: 귀국일 제약사항 검증 - 검증 구분 개선
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
            
            // 🔧 v8.2.5: 필수 귀국일을 초과한 경우에만 에러 표시 (검증 구분 개선)
            if (returnD > requiredD) {
                validation = {
                    valid: false,
                    message: '모든 문화인턴은 12월 12일까지 귀국을 완료해야합니다',
                    code: 'REQUIRED_RETURN_DATE_EXCEEDED',
                    category: 'mandatory_return_date' // 🔧 검증 카테고리 추가
                };
            } else {
                // 🔧 v8.2.5: 정상 범위에서는 메시지 숨김 (성공 메시지 제거 정책)
                validation = {
                    valid: true,
                    message: '', // 성공 시 메시지 없음
                    hideMessage: true,
                    category: 'mandatory_return_date' // 🔧 검증 카테고리 추가
                };
            }
            
            this.updateReturnDateConstraintUI(validation);
            
            return validation;
            
        } catch (error) {
            console.error('❌ [귀국일검증] 제약사항 검증 실패:', error);
            return { valid: false, message: '검증 중 오류가 발생했습니다.', category: 'mandatory_return_date' };
        }
    }

    // 🔧 v8.2.5: 귀국일 제약사항 UI 업데이트 - 검증 구분 개선
    updateReturnDateConstraintUI(validation) {
        const constraintElement = this.elements.returnDateConstraintInfo || 
                                 document.querySelector('.return-date-constraint-info');
        
        if (!constraintElement) {
            // 🔧 v8.2.5: 정상 범위에서는 요소 생성하지 않음
            if (validation.hideMessage) {
                return;
            }
            this.createReturnDateConstraintElement();
            return;
        }

        constraintElement.className = 'return-date-constraint-info';
        
        // 🔧 v8.2.5: 정상 범위에서는 메시지 숨김 (검증 구분 개선)
        if (validation.hideMessage || validation.valid) {
            constraintElement.style.display = 'none';
            
            if (this.elements.returnDate) {
                this.elements.returnDate.style.borderColor = '';
            }
            
            console.log('✅ [귀국일검증] v8.2.5: 필수 귀국일 조건 만족 - 메시지 숨김');
            return;
        }
        
        if (!validation.valid) {
            constraintElement.classList.add('constraint-error');
            constraintElement.innerHTML = `
                <i data-lucide="alert-circle"></i>
                <span class="constraint-message"><strong>필수 귀국일 초과:</strong> ${validation.message}</span>
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
            
            console.log('❌ [귀국일검증] v8.2.5: 필수 귀국일 조건 위반 - 경고 표시');
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
        
        const returnDateContainer = this.elements.returnDate