// flight-request-ticket.js - 항공권 신청 관리 모듈 v8.2.6 (메서드 보완 완료)
// 🔧 v8.2.6: 누락 메서드 추가 및 기능 보완
// 📝 핵심 추가사항:
//   - 최소/최대 활동일 데이터 로드 및 UI 표시
//   - 활동기간 검증 통과 시에만 항공권 정보 입력 가능
//   - 비즈니스 로직 기반 항공권 날짜 검증
//   - 귀국일 제한 날짜 검증 (2025년 12월 12일)
//   - 로딩 실패 시 '로딩중...' 표시
// 🔧 v8.2.5: 항공권 검증 로직 완전 분리 구현 (유지)
// 📝 핵심 기능:
//   - 현지 활동기간 검증 및 관리
//   - 항공권 날짜 검증 (v8.2.5 분리된 로직)
//   - 구매방식 변경 처리
//   - 항공권 이미지 업로드
//   - 단계별 네비게이션
//   - 항공권 섹션 활성화/비활성화 (전제 조건 시스템)

class FlightRequestTicket {
    constructor(apiService, uiService, passportService) {
        this.apiService = apiService;
        this.uiService = uiService;
        this.passportService = passportService;
        
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
        
        // 🔧 v8.2.6: 사용자별 활동 요구사항 관리
        this.userRequiredDays = null;
        this.userMaximumDays = null;
        this.dispatchEndDate = null; // 귀국일 제한 날짜
        this.isUserActivityRequirementsLoaded = false;
        
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
        
        this.init();
    }

    init() {
        try {
            console.log('🔄 [티켓모듈] FlightRequestTicket v8.2.6 초기화 시작...');
            
            this.bindEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🔧 v8.2.6: 사용자별 활동 요구사항 로드
            this.loadUserActivityRequirements();

            // 🔧 추가: 초기 전제 조건 체크 (페이지 로드 시 항공권 섹션 비활성화)
            setTimeout(() => {
                this.checkActivityPeriodCompletion();
                this.updateFlightSectionAvailability();
            }, 500);

            
            console.log('✅ [티켓모듈] FlightRequestTicket v8.2.6 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] 초기화 실패:', error);
        }
    }

    bindEvents() {
        try {
            console.log('🔄 [티켓모듈] 이벤트 바인딩 시작...');
            
            // 현지 활동기간 이벤트
            this.setupActivityPeriodEvents();
            
            // 항공권 날짜 이벤트
            this.setupFlightDateEvents();
            
            // 구매방식 이벤트
            this.setupPurchaseMethodEvents();
            
            // 이미지 업로드 이벤트
            this.setupImageUploadEvents();
            
            // 가격 정보 이벤트
            this.setupPriceInfoEvents();
            
            // 제출 이벤트
            this.setupSubmitEvents();
            
            console.log('✅ [티켓모듈] 이벤트 바인딩 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] 이벤트 바인딩 실패:', error);
        }
    }

    // === 🔧 v8.2.6: 사용자별 활동 요구사항 로드 ===

    async loadUserActivityRequirements() {
        try {
            console.log('🔄 [활동요구사항] v8.2.6: 사용자별 요구사항 로드 시작...');
            
            // 로딩 상태 UI 표시
            this.updateRequiredDaysUILoading();
            
            // API를 통해 사용자 프로필 및 활동 요구사항 로드
                if (this.apiService && typeof this.apiService.getUserProfile === 'function') {
                    const userProfile = await this.apiService.getUserProfile();
                
                if (userProfile) {
                    this.userRequiredDays = userProfile.minimum_required_days || null;
                    this.userMaximumDays = userProfile.maximum_allowed_days || null;
                    this.dispatchEndDate = userProfile.dispatch_end_date || '2025-12-12';
                    this.isUserActivityRequirementsLoaded = true;
                    
                    console.log('✅ [활동요구사항] v8.2.6: 로드 완료:', {
                        최소활동일: this.userRequiredDays,
                        최대활동일: this.userMaximumDays,
                        파견종료일: this.dispatchEndDate
                    });
                    
                    // UI 업데이트
                    this.updateRequiredDaysUI();
                } else {
                    console.warn('⚠️ [활동요구사항] v8.2.6: 사용자 프로필 로드 실패');
                    this.updateRequiredDaysUIError();
                }
            } else {
                console.warn('⚠️ [활동요구사항] v8.2.6: API 서비스 없음');
                this.updateRequiredDaysUIError();
            }
            
        } catch (error) {
            console.error('❌ [활동요구사항] v8.2.6: 로드 실패:', error);
            this.updateRequiredDaysUIError();
        }
    }

    // 🔧 v8.2.6: 필수 활동일 UI 업데이트
    updateRequiredDaysUI() {
        try {
            console.log('🔄 [활동요구사항UI] v8.2.6: 필수 활동일 UI 업데이트 시작...');
            
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl && this.userRequiredDays) {
                requiredDaysEl.textContent = this.userRequiredDays;
                requiredDaysEl.className = 'value success';
                requiredDaysEl.style.color = '#059669';
                requiredDaysEl.style.fontWeight = '600';
                
                console.log('✅ [활동요구사항UI] v8.2.6: 필수 활동일 UI 업데이트 완료:', this.userRequiredDays);
            } else {
                console.warn('⚠️ [활동요구사항UI] v8.2.6: requiredDays 요소 또는 데이터 없음');
                this.updateRequiredDaysUIError();
            }
            
        } catch (error) {
            console.error('❌ [활동요구사항UI] v8.2.6: 업데이트 실패:', error);
            this.updateRequiredDaysUIError();
        }
    }

    // 🔧 v8.2.6: 로딩 상태 UI 표시
    updateRequiredDaysUILoading() {
        try {
            console.log('🔄 [활동요구사항UI] v8.2.6: 로딩 상태 표시...');
            
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl) {
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.className = 'value loading';
                requiredDaysEl.style.color = '#6b7280';
                requiredDaysEl.style.fontWeight = '400';
                
                console.log('✅ [활동요구사항UI] v8.2.6: 로딩 상태 표시 완료');
            }
            
        } catch (error) {
            console.error('❌ [활동요구사항UI] v8.2.6: 로딩 상태 표시 실패:', error);
        }
    }

    // 🔧 v8.2.6: 에러 상태 UI 표시
    updateRequiredDaysUIError() {
        try {
            console.log('🔄 [활동요구사항UI] v8.2.6: 에러 상태 표시...');
            
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl) {
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.className = 'value error';
                requiredDaysEl.style.color = '#dc2626';
                requiredDaysEl.style.fontWeight = '400';
                
                console.log('✅ [활동요구사항UI] v8.2.6: 에러 상태 표시 완료');
            }
            
        } catch (error) {
            console.error('❌ [활동요구사항UI] v8.2.6: 에러 상태 표시 실패:', error);
        }
    }

    // === 현지 활동기간 관리 ===

    setupActivityPeriodEvents() {
        const arrivalElement = document.getElementById('actualArrivalDate');
        const workEndElement = document.getElementById('actualWorkEndDate');
        
        [arrivalElement, workEndElement].forEach(element => {
            if (element) {
                // 🔧 추가: 즉시 활동일 계산 표시
                element.addEventListener('input', () => {
                    // 즉시 활동일 계산
                    this.calculateAndShowActivityDaysImmediate();
                    // 로딩 UI 표시 후 검증 시작
                    this.debouncedActivityValidationWithLoading();
                });
                
            }
        });
        
        console.log('✅ [티켓모듈] 현지 활동기간 이벤트 설정 완료');
    }

    debouncedActivityValidation() {
        if (this.validationDebounceTimer) {
            clearTimeout(this.validationDebounceTimer);
        }

        this.validationDebounceTimer = setTimeout(() => {

            // 1. 검증 실행하고 결과 저장
            const activityValidation = this.validateActivityPeriod();
               
            // 2. 완료 상태 확인 (validateActivityPeriod 재호출 없이)
            const completionStatus = this.checkActivityPeriodCompletionDirect(activityValidation);
           
            // 3. 항공권 섹션 업데이트
            this.updateFlightSectionAvailabilityDirect(completionStatus);

        }, 100);
    }
    

    // 🔧 추가: 로딩 UI가 포함된 검증 메서드
    debouncedActivityValidationWithLoading() {
        if (this.validationDebounceTimer) {
            clearTimeout(this.validationDebounceTimer);
        }

        // 즉시 로딩 상태 표시
        const arrivalDate = document.getElementById('actualArrivalDate')?.value;
        const workEndDate = document.getElementById('actualWorkEndDate')?.value;
    
        if (arrivalDate && workEndDate) {
            this.updateActivityValidationUILoading();
        }
    
        this.validationDebounceTimer = setTimeout(() => {
            // 1번만 실행하고 결과 재사용
            const activityValidation = this.validateActivityPeriod();
            const completionStatus = this.checkActivityPeriodCompletionDirect(activityValidation);
            this.updateFlightSectionAvailabilityDirect(completionStatus);
        }, 100);
    }

    // 🔧 v8.2.6: 현지 활동기간 검증 - 활동기간 범위 검증 포함
    validateActivityPeriod() {
        try {
            console.log('🔄 [활동기간검증] v8.2.6: 현지 활동기간 검증 시작...');
            
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            const arrivalDate = arrivalDateEl?.value;
            const workEndDate = workEndDateEl?.value;

         
            console.log('📋 [활동기간검증] v8.2.6: 입력된 날짜:', {
                현지도착일: arrivalDate,
                학당근무종료일: workEndDate,
                둘다입력됨: !!(arrivalDate && workEndDate)
            });
            
            // 둘 다 입력되지 않은 경우 UI 초기화
            if (!arrivalDate || !workEndDate) {
                this.updateCalculatedActivityDays(0);
                this.updateActivityValidationUI({
                    valid: false,
                    message: '현지 도착일과 학당 근무 종료일을 모두 입력해주세요.',
                    activityDays: 0
                });
                return { valid: false, activityDays: 0 };
            }
            
            // 실시간 활동일 계산
            let activityDays = 0;
            try {
                if (this.uiService?.utils && typeof this.uiService.utils.calculateActivityDays === 'function') {
                    activityDays = this.uiService.utils.calculateActivityDays(arrivalDate, workEndDate);
                } else {
                    // utils가 없는 경우 직접 계산
                    const arrival = new Date(arrivalDate);
                    const workEnd = new Date(workEndDate);
                    if (arrival < workEnd) {
                        activityDays = Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
                    }
                }
                
                console.log('📊 [활동기간검증] v8.2.6: 활동일 계산 완료:', {
                    현지도착일: arrivalDate,
                    학당근무종료일: workEndDate,
                    계산된활동일: activityDays
                });
                
            } catch (calcError) {
                console.error('❌ [활동기간검증] v8.2.6: 활동일 계산 실패:', calcError);
                activityDays = 0;
            }
            
            // UI에 계산된 활동일 즉시 반영
            this.updateCalculatedActivityDays(activityDays);
            
            // 🔧 v8.2.6: 활동기간 범위 검증 추가
            let validation = { 
                valid: activityDays > 0, 
                activityDays: activityDays,
                message: activityDays > 0 ? 
                    `현지 활동기간: ${activityDays}일` : 
                    '활동기간을 계산할 수 없습니다.'
            };
            
            // 최소/최대 활동일 범위 검증
            if (activityDays > 0 && this.isUserActivityRequirementsLoaded) {
                if (this.userRequiredDays && activityDays < this.userRequiredDays) {
                    validation.valid = false;
                    validation.message = `활동기간이 너무 짧습니다. 최소 ${this.userRequiredDays}일이 필요합니다.`;
                } else if (this.userMaximumDays && activityDays > this.userMaximumDays) {
                    validation.valid = false;
                    validation.message = `활동기간이 너무 깁니다. 최대 ${this.userMaximumDays}일까지 허용됩니다.`;
                }
            }
            
            console.log('✅ [활동기간검증] v8.2.6: 현지 활동기간 검증 완료:', {
                검증결과: validation.valid,
                활동일: validation.activityDays,
                범위검증: '✅ 포함'
            });
            
            // UI 업데이트
            this.updateActivityValidationUI(validation);
            
            // 데이터 저장
            this.ticketData.actualArrivalDate = arrivalDate;
            this.ticketData.actualWorkEndDate = workEndDate;
            this.ticketData.calculatedActivityDays = activityDays;
            
            return validation;
            
        } catch (error) {
            console.error('❌ [활동기간검증] v8.2.6: 현지 활동기간 검증 실패:', error);
            
            const errorValidation = {
                valid: false,
                activityDays: 0,
                message: '활동기간 검증 중 오류가 발생했습니다.'
            };
            
            this.updateActivityValidationUI(errorValidation);
            return errorValidation;
        }
    }

    updateCalculatedActivityDays(activityDays) {
        try {
            console.log('🔄 [활동기간UI] 계산된 활동일 UI 업데이트:', activityDays);
            
            const calculatedDaysEl = document.getElementById('calculatedDays');
            if (calculatedDaysEl) {
                if (activityDays > 0) {
                    calculatedDaysEl.textContent = activityDays;
                    calculatedDaysEl.style.color = '#059669';
                    calculatedDaysEl.style.fontWeight = '600';
                    calculatedDaysEl.className = 'value success';
                } else {
                    calculatedDaysEl.textContent = '-';
                    calculatedDaysEl.style.color = '#6b7280';
                    calculatedDaysEl.style.fontWeight = '400';
                    calculatedDaysEl.className = 'value';
                }
                
                console.log('✅ [활동기간UI] calculatedDays 요소 업데이트 완료:', {
                    표시값: calculatedDaysEl.textContent,
                    색상: calculatedDaysEl.style.color
                });
            } else {
                console.warn('⚠️ [활동기간UI] calculatedDays 요소를 찾을 수 없음');
            }
            
        } catch (error) {
            console.error('❌ [활동기간UI] 계산된 활동일 UI 업데이트 실패:', error);
        }
    }

    // 🔧 추가: 즉시 활동일 계산 및 표시
    calculateAndShowActivityDaysImmediate() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
        
            if (arrivalDate && workEndDate) {
                // 즉시 활동일 계산
                const arrival = new Date(arrivalDate);
                const workEnd = new Date(workEndDate);
                let activityDays = 0;
                
                if (arrival < workEnd) {
                    activityDays = Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
                }
                
                // 즉시 UI 업데이트
                this.updateCalculatedActivityDays(activityDays);
                
                console.log('⚡ [즉시계산] 활동일 즉시 표시:', activityDays);
            }
            
        } catch (error) {
            console.error('❌ [즉시계산] 실패:', error);
        }
    }

    updateActivityValidationUI(validation) {
        try {
            console.log('🔄 [활동기간UI] 검증 결과 UI 업데이트:', validation);
            
            const validationStatusEl = document.getElementById('validationStatus');
            if (validationStatusEl) {
                if (validation.valid) {
                    // 성공 상태
                    validationStatusEl.className = 'validation-status valid';
                    validationStatusEl.innerHTML = 
                        `<i data-lucide="check-circle"></i>${validation.message || '활동기간이 유효합니다'}`;
                    validationStatusEl.style.color = '#059669';
                    validationStatusEl.style.backgroundColor = '#f0fdf4';
                    validationStatusEl.style.border = '1px solid #bbf7d0';
                } else {
                    // 실패 상태
                    validationStatusEl.className = 'validation-status invalid';
                    validationStatusEl.innerHTML = 
                        `<i data-lucide="x-circle"></i>${validation.message || '활동기간이 유효하지 않습니다'}`;
                    validationStatusEl.style.color = '#dc2626';
                    validationStatusEl.style.backgroundColor = '#fef2f2';
                    validationStatusEl.style.border = '1px solid #fecaca';
                }
                
                validationStatusEl.style.display = 'flex';
                validationStatusEl.style.alignItems = 'center';
                validationStatusEl.style.gap = '8px';
                validationStatusEl.style.padding = '12px';
                validationStatusEl.style.borderRadius = '6px';
                validationStatusEl.style.marginTop = '8px';
                
                console.log('✅ [활동기간UI] validationStatus 요소 업데이트 완료');
            } else {
                console.warn('⚠️ [활동기간UI] validationStatus 요소를 찾을 수 없음');
            }
            
            // 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('❌ [활동기간UI] 검증 결과 UI 업데이트 실패:', error);
        }
    }

    // 🔧 추가: 활동기간 검증 로딩 상태 UI
    updateActivityValidationUILoading() {
        try {
            console.log('🔄 [활동기간UI] 검증 로딩 상태 표시...');
            
            const validationStatusEl = document.getElementById('validationStatus');
            if (validationStatusEl) {
                validationStatusEl.className = 'validation-status loading';
                validationStatusEl.innerHTML = 
                    `<i data-lucide="loader-2"></i>활동일 체크중...`;
                validationStatusEl.style.color = '#6b7280';
                validationStatusEl.style.backgroundColor = '#f9fafb';
                validationStatusEl.style.border = '1px solid #e5e7eb';
                validationStatusEl.style.display = 'flex';
                validationStatusEl.style.alignItems = 'center';
                validationStatusEl.style.gap = '8px';
                validationStatusEl.style.padding = '12px';
                validationStatusEl.style.borderRadius = '6px';
                validationStatusEl.style.marginTop = '8px';
            
                // 로딩 아이콘 애니메이션
                const icon = validationStatusEl.querySelector('i');
                if (icon) {
                    icon.style.animation = 'spin 1s linear infinite';
                }
                
                // 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            console.log('✅ [활동기간UI] 검증 로딩 상태 표시 완료');
            
        } catch (error) {
            console.error('❌ [활동기간UI] 로딩 상태 표시 실패:', error);
        }
    }


    // === 🔧 v8.2.6: 전제 조건 시스템 강화 ===

    checkActivityPeriodCompletion() {
        try {
            console.log('🔄 [전제조건] v8.2.6: 현지 활동기간 완료 여부 확인 시작...');
            
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            // 완료 조건 - 두 날짜가 모두 입력되어야 함
            const completed = !!(arrivalDate && workEndDate);
            
            // 유효성 조건 - 활동기간 검증 통과
            let valid = false;
            if (completed) {
                const activityValidation = this.validateActivityPeriod();
                valid = activityValidation.valid;
            }
            
            // 상태 업데이트
            this.isActivityPeriodCompleted = completed;
            this.isActivityPeriodValid = valid;
            
            console.log('✅ [전제조건] v8.2.6: 현지 활동기간 완료 여부 확인 완료:', {
                현지도착일: arrivalDate,
                학당근무종료일: workEndDate,
                완료여부: completed,
                유효여부: valid,
                상태업데이트: '✅ 완료'
            });
            
            return { completed, valid };
            
        } catch (error) {
            console.error('❌ [전제조건] v8.2.6: 현지 활동기간 완료 여부 확인 실패:', error);
            
            // 오류 시 보수적으로 미완료 처리
            this.isActivityPeriodCompleted = false;
            this.isActivityPeriodValid = false;
            
            return { completed: false, valid: false };
        }
    }

    // 🔧 추가: 검증 결과를 받아서 완료 상태만 확인 (재검증 없음)
    checkActivityPeriodCompletionDirect(activityValidation) {
        try {
            console.log('🔄 [전제조건] 직접 완료 여부 확인...');
        
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
        
            // 완료 조건 - 두 날짜가 모두 입력되어야 함
            const completed = !!(arrivalDate && workEndDate);
        
            // 유효성 조건 - 전달받은 검증 결과 사용
            const valid = completed && activityValidation && activityValidation.valid;
        
            // 상태 업데이트
            this.isActivityPeriodCompleted = completed;
            this.isActivityPeriodValid = valid;
        
            console.log('✅ [전제조건] 직접 완료 여부 확인 완료:', { completed, valid });
        
            return { completed, valid };
        
        } catch (error) {
            console.error('❌ [전제조건] 직접 완료 여부 확인 실패:', error);
            return { completed: false, valid: false };
        }
    }


    updateFlightSectionAvailability() {
        try {
            console.log('🔄 [전제조건] v8.2.6: 항공권 섹션 가용성 업데이트 시작...');
            
            // 현재 상태 확인
            const status = this.checkActivityPeriodCompletion();
            const shouldEnable = status.completed && status.valid;
            
            // 항공권 섹션 상태 업데이트
            this.flightSectionEnabled = shouldEnable;
            
            console.log('📊 [전제조건] v8.2.6: 항공권 섹션 활성화 조건:', {
                현지활동기간완료: status.completed,
                현지활동기간유효: status.valid,
                항공권섹션활성화: shouldEnable
            });
            
            // UI 요소 상태 변경
            this.toggleFlightInputFields(shouldEnable);
            
            // 상태 메시지 업데이트
            this.updatePrerequisiteStatusMessage(status);
            
            console.log('✅ [전제조건] v8.2.6: 항공권 섹션 가용성 업데이트 완료:', {
                항공권섹션상태: shouldEnable ? '활성화' : '비활성화',
                실제UI변경: '✅ 완료'
            });
            
        } catch (error) {
            console.error('❌ [전제조건] v8.2.6: 항공권 섹션 가용성 업데이트 실패:', error);
            
            // 오류 시 보수적으로 비활성화
            this.flightSectionEnabled = false;
            this.toggleFlightInputFields(false);
        }
    }

    // 중복 호출 방지용 직접 업데이트 메서드
    updateFlightSectionAvailabilityDirect(status) {
        try {
            const shouldEnable = status.completed && status.valid;
            this.flightSectionEnabled = shouldEnable;
        
            this.toggleFlightInputFields(shouldEnable);
            this.updatePrerequisiteStatusMessage(status);
        
            console.log('✅ [전제조건] 직접 업데이트 완료:', shouldEnable);
        } catch (error) {
            console.error('❌ [전제조건] 직접 업데이트 실패:', error);
        }
    }

    toggleFlightInputFields(enabled) {
        console.log('🔄 [전제조건] 항공권 입력 필드:', enabled ? '활성화' : '비활성화');
    
        const flightSection = document.getElementById('flightInfoSection');
    
        if (flightSection) {
            if (enabled) {
                flightSection.classList.remove('flight-section-disabled');
                flightSection.classList.add('flight-section-enabled');
            } else {
                flightSection.classList.add('flight-section-disabled');
                flightSection.classList.remove('flight-section-enabled');
            }
        }
        
        console.log('✅ [전제조건] 항공권 입력 필드 상태 변경 완료');
    }

    findFlightInfoSection() {
        const selectors = [
            '.form-section:has(#departureDate)',
            '[data-flight-info]',
            '#flightInfoSection',
            '.form-section:nth-child(3)'
        ];
        
        for (const selector of selectors) {
            try {
                const element = document.querySelector(selector);
                if (element) return element;
            } catch (error) {
                // 구문 에러 무시하고 계속
            }
        }
        
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

    updatePrerequisiteStatusMessage(status) {
        try {
            // 상태 메시지 요소 찾기
            let statusElement = document.getElementById('prerequisiteStatus') ||
                               document.querySelector('.prerequisite-status') ||
                               document.querySelector('[data-prerequisite-status]');
            
            // 상태 메시지 요소가 없으면 생성
            if (!statusElement) {
                statusElement = this.createPrerequisiteStatusElement();
            }
            
            if (statusElement) {
                if (status.completed && status.valid) {
                    // 완료 상태
                    statusElement.className = 'prerequisite-status completed';
                    statusElement.innerHTML = `
                        <i data-lucide="check-circle"></i>
                        <span>현지 활동기간 입력이 완료되었습니다. 항공권 정보를 입력해주세요.</span>
                    `;
                    statusElement.style.color = '#059669';
                    statusElement.style.backgroundColor = '#f0fdf4';
                    statusElement.style.border = '1px solid #bbf7d0';
                } else if (status.completed && !status.valid) {
                    // 입력됐지만 유효하지 않음
                    statusElement.className = 'prerequisite-status invalid';
                    statusElement.innerHTML = `
                        <i data-lucide="alert-circle"></i>
                        <span>현지 활동기간 정보가 올바르지 않습니다. 날짜를 다시 확인해주세요.</span>
                    `;
                    statusElement.style.color = '#dc2626';
                    statusElement.style.backgroundColor = '#fef2f2';
                    statusElement.style.border = '1px solid #fecaca';
                } else {
                    // 미완료 상태
                    statusElement.className = 'prerequisite-status pending';
                    statusElement.innerHTML = `
                        <i data-lucide="info"></i>
                        <span>항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.</span>
                    `;
                    statusElement.style.color = '#d97706';
                    statusElement.style.backgroundColor = '#fffbeb';
                    statusElement.style.border = '1px solid #fed7aa';
                }
                
                statusElement.style.display = 'flex';
                statusElement.style.alignItems = 'center';
                statusElement.style.gap = '8px';
                statusElement.style.padding = '12px 16px';
                statusElement.style.borderRadius = '8px';
                statusElement.style.marginBottom = '16px';
                statusElement.style.fontSize = '14px';
                statusElement.style.fontWeight = '500';
                
                // 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            console.log('✅ [전제조건] v8.2.6: 전제조건 상태 메시지 업데이트 완료:', {
                완료상태: status.completed,
                유효상태: status.valid,
                메시지표시: !!statusElement
            });
            
        } catch (error) {
            console.error('❌ [전제조건] v8.2.6: 전제조건 상태 메시지 업데이트 실패:', error);
        }
    }

    createPrerequisiteStatusElement() {
        try {
            const statusElement = document.createElement('div');
            statusElement.id = 'prerequisiteStatus';
            statusElement.className = 'prerequisite-status';
            
            // 항공권 정보 섹션 상단에 삽입
            const flightInfoSection = this.findFlightInfoSection();
            if (flightInfoSection) {
                flightInfoSection.insertBefore(
                    statusElement, 
                    flightInfoSection.firstChild
                );
                
                console.log('✅ [전제조건] v8.2.6: 전제조건 상태 메시지 요소 생성 완료');
                return statusElement;
            } else {
                console.warn('⚠️ [전제조건] v8.2.6: 항공권 정보 섹션을 찾을 수 없어 상태 메시지 요소 생성 실패');
                return null;
            }
            
        } catch (error) {
            console.error('❌ [전제조건] v8.2.6: 전제조건 상태 메시지 요소 생성 실패:', error);
            return null;
        }
    }

    // === 🔧 v8.2.6: 항공권 날짜 검증 강화 ===

    setupFlightDateEvents() {
        const departureEl = document.getElementById('departureDate');
        const returnEl = document.getElementById('returnDate');
        
        [departureEl, returnEl].forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.validateFlightDatesEnhanced();
                    this.updateDurationMessage();
                });
            }
        });
        
        // 최소 날짜 설정 (오늘 이후)
        const today = new Date().toISOString().split('T')[0];
        if (departureEl) departureEl.min = today;
        if (returnEl) returnEl.min = today;
        
        console.log('✅ [티켓모듈] v8.2.6: 항공권 날짜 이벤트 설정 완료');
    }

    // 🔧 v8.2.6: 강화된 항공권 날짜 검증 (비즈니스 로직 적용)
    validateFlightDatesEnhanced() {
        try {
            console.log('🔄 [항공권검증] v8.2.6: 강화된 항공권 날짜 검증 시작...');
            
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (!departureDate || !returnDate || !arrivalDate || !workEndDate) {
                return true; // 입력되지 않은 경우는 통과
            }
            
            // 날짜 객체 생성
            const departure = new Date(departureDate);
            const returnFlight = new Date(returnDate);
            const arrival = new Date(arrivalDate);
            const workEnd = new Date(workEndDate);
            
            // 🔧 v8.2.6: 비즈니스 로직 적용
            
            // 1. 출국일-2 < 출국일 < 현지 도착일
            const twoDaysBeforeDeparture = new Date(departure);
            twoDaysBeforeDeparture.setDate(twoDaysBeforeDeparture.getDate() - 2);
            
            if (departure >= arrival) {
                this.showError('출국일은 현지 도착일보다 이전이어야 합니다.');
                return false;
            }
            
            const daysBetweenDepartureAndArrival = Math.ceil((arrival - departure) / (1000 * 60 * 60 * 24));
            if (daysBetweenDepartureAndArrival >= 2) {
                this.showError('현지 도착일은 출국일로부터 2일 이내여야 합니다.');
                return false;
            }
            
            // 2. 활동종료일 < 귀국일 < 활동종료일 + 10
            if (returnFlight <= workEnd) {
                this.showError('귀국일은 학당 근무 종료일보다 이후여야 합니다.');
                return false;
            }
            
            const tenDaysAfterWorkEnd = new Date(workEnd);
            tenDaysAfterWorkEnd.setDate(tenDaysAfterWorkEnd.getDate() + 10);
            
            if (returnFlight >= tenDaysAfterWorkEnd) {
                this.showError('귀국일은 학당 근무 종료일로부터 10일 이내여야 합니다.');
                return false;
            }
            
            // 3. 귀국일 < 2025년 12월 12일 (파견 종료일)
            const maxReturnDate = new Date(this.dispatchEndDate || '2025-12-12');
            if (returnFlight >= maxReturnDate) {
                this.showError(`귀국일은 ${this.dispatchEndDate || '2025년 12월 12일'}보다 이전이어야 합니다.`);
                return false;
            }
            
            console.log('✅ [항공권검증] v8.2.6: 강화된 항공권 날짜 검증 완료:', {
                출국일: departureDate,
                귀국일: returnDate,
                현지도착일: arrivalDate,
                학당근무종료일: workEndDate,
                파견종료일: this.dispatchEndDate,
                모든검증통과: true
            });
            
            // 데이터 저장
            this.ticketData.departureDate = departureDate;
            this.ticketData.returnDate = returnDate;
            
            return true;
            
        } catch (error) {
            console.error('❌ [항공권검증] v8.2.6: 강화된 날짜 검증 실패:', error);
            this.showError('날짜 검증 중 오류가 발생했습니다.');
            return false;
        }
    }

    // 기존 validateFlightDatesOnly 메서드 유지 (하위 호환성)
    validateFlightDatesOnly() {
        return this.validateFlightDatesEnhanced();
    }

    updateDurationMessage() {
        try {
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            const messageEl = document.getElementById('durationMessage');
            
            if (departureDate && returnDate && messageEl) {
                const departure = new Date(departureDate);
                const returnFlight = new Date(returnDate);
                const days = Math.ceil((returnFlight - departure) / (1000 * 60 * 60 * 24));
                
                messageEl.textContent = `체류 기간: ${days}일`;
                messageEl.style.color = days > 0 ? '#059669' : '#dc2626';
                
                console.log('✅ [티켓모듈] v8.2.6: 체류 기간 메시지 업데이트:', `${days}일`);
            }
        } catch (error) {
            console.error('❌ [티켓모듈] v8.2.6: 체류 기간 메시지 업데이트 실패:', error);
        }
    }

    // === 구매방식 관리 ===

    setupPurchaseMethodEvents() {
        const purchaseTypeRadios = document.querySelectorAll('input[name="purchaseType"]');
        
        purchaseTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.handlePurchaseMethodChange();
            });
        });
        
        console.log('✅ [티켓모듈] 구매방식 이벤트 설정 완료');
    }

    handlePurchaseMethodChange() {
        try {
            console.log('🔄 [구매방식] 구매 방식 변경 처리');
            
            const purchaseType = document.querySelector('input[name="purchaseType"]:checked')?.value;
            const linkGroup = document.getElementById('purchaseLinkGroup');
            
            if (linkGroup) {
                linkGroup.style.display = purchaseType === 'agency' ? 'block' : 'none';
            }
            
            // 데이터 저장
            this.ticketData.purchaseType = purchaseType;
            
            console.log('✅ [구매방식] 구매 방식 변경 완료:', purchaseType);
            
        } catch (error) {
            console.error('❌ [구매방식] 변경 처리 실패:', error);
        }
    }

    // === 이미지 업로드 관리 ===

    setupImageUploadEvents() {
        const flightImageEl = document.getElementById('flightImage');
        const removeImageEl = document.getElementById('removeImage');
        
        if (flightImageEl) {
            flightImageEl.addEventListener('change', (e) => {
                this.handleTicketImageUpload(e);
            });
        }
        
        if (removeImageEl) {
            removeImageEl.addEventListener('click', () => {
                this.removeTicketImage();
            });
        }
        
        console.log('✅ [티켓모듈] 이미지 업로드 이벤트 설정 완료');
    }

    handleTicketImageUpload(event) {
        try {
            console.log('🔄 [이미지업로드] 항공권 이미지 업로드 처리');
            
            const file = event.target.files[0];
            if (!file) return;
            
            // 파일 크기 검증 (5MB)
            if (file.size > 5 * 1024 * 1024) {
                this.showError('파일 크기는 5MB 이하여야 합니다.');
                event.target.value = '';
                return;
            }
            
            // 파일 형식 검증
            if (!file.type.startsWith('image/')) {
                this.showError('이미지 파일만 업로드 가능합니다.');
                event.target.value = '';
                return;
            }
            
            this.ticketImageFile = file;
            
            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                const previewImg = document.getElementById('previewImg');
                const imagePreview = document.getElementById('imagePreview');
                
                if (previewImg) {
                    previewImg.src = e.target.result;
                }
                if (imagePreview) {
                    imagePreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
            
            console.log('✅ [이미지업로드] 항공권 이미지 업로드 준비 완료:', file.name);
            
        } catch (error) {
            console.error('❌ [이미지업로드] 처리 실패:', error);
            this.showError('이미지 업로드 중 오류가 발생했습니다.');
        }
    }

    removeTicketImage() {
        try {
            console.log('🗑️ [이미지제거] 항공권 이미지 제거');
            
            this.ticketImageFile = null;
            
            const flightImageEl = document.getElementById('flightImage');
            const imagePreviewEl = document.getElementById('imagePreview');
            const previewImgEl = document.getElementById('previewImg');
            
            if (flightImageEl) {
                flightImageEl.value = '';
            }
            if (imagePreviewEl) {
                imagePreviewEl.style.display = 'none';
            }
            if (previewImgEl) {
                previewImgEl.src = '';
            }
            
            console.log('✅ [이미지제거] 제거 완료');
            
        } catch (error) {
            console.error('❌ [이미지제거] 제거 실패:', error);
        }
    }

    // === 가격 정보 관리 ===

    setupPriceInfoEvents() {
        const priceElements = [
            document.getElementById('ticketPrice'),
            document.getElementById('currency'),
            document.getElementById('priceSource')
        ];
        
        priceElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.updateFlightPriceInfo();
                });
            }
        });
        
        console.log('✅ [티켓모듈] 가격 정보 이벤트 설정 완료');
    }

    updateFlightPriceInfo() {
        try {
            const ticketPrice = document.getElementById('ticketPrice')?.value;
            const currency = document.getElementById('currency')?.value;
            const priceSource = document.getElementById('priceSource')?.value;
            
            // 데이터 저장
            this.ticketData.ticketPrice = ticketPrice ? parseInt(ticketPrice) : null;
            this.ticketData.currency = currency;
            this.ticketData.priceSource = priceSource;
            
            console.log('✅ [가격정보] 가격 정보 업데이트:', {
                가격: this.ticketData.ticketPrice,
                통화: this.ticketData.currency,
                출처: this.ticketData.priceSource
            });
            
        } catch (error) {
            console.error('❌ [가격정보] 업데이트 실패:', error);
        }
    }

    validatePriceFields() {
        try {
            const price = document.getElementById('ticketPrice')?.value;
            const currency = document.getElementById('currency')?.value;
            const source = document.getElementById('priceSource')?.value;
            
            if (!price || !currency || !source) {
                this.showError('가격 정보를 모두 입력해주세요.');
                return false;
            }
            
            if (parseInt(price) <= 0) {
                this.showError('올바른 가격을 입력해주세요.');
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('❌ [가격검증] 실패:', error);
            return false;
        }
    }

    // === 단계별 네비게이션 ===

    setupStepNavigation() {
        console.log('🔄 [단계네비] 단계별 네비게이션 설정');
        
        // 단계별 완료 상태 체크 이벤트 설정
        this.setupStepCompletionChecks();
        
        console.log('✅ [단계네비] 단계별 네비게이션 설정 완료');
    }

    setupStepCompletionChecks() {
        // 1단계: 현지 활동기간
        const activityElements = [
            document.getElementById('actualArrivalDate'),
            document.getElementById('actualWorkEndDate')
        ];
        
        activityElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.checkStepCompletion(1);
                });
            }
        });
        
        // 2단계: 구매방식
        const purchaseTypeRadios = document.querySelectorAll('input[name="purchaseType"]');
        purchaseTypeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                this.checkStepCompletion(2);
            });
        });
        
        // 3단계: 항공권 정보
        const flightElements = [
            document.getElementById('departureDate'),
            document.getElementById('returnDate'),
            document.getElementById('departureAirport'),
            document.getElementById('arrivalAirport')
        ];
        
        flightElements.forEach(element => {
            if (element) {
                element.addEventListener('change', () => {
                    this.checkStepCompletion(3);
                });
            }
        });
        
        // 4단계: 이미지 업로드
        const imageElement = document.getElementById('flightImage');
        if (imageElement) {
            imageElement.addEventListener('change', () => {
                this.checkStepCompletion(4);
            });
        }
    }

    checkStepCompletion(step) {
        try {
            let completed = false;
            
            switch (step) {
                case 1: // 현지 활동기간
                    const arrivalDate = document.getElementById('actualArrivalDate')?.value;
                    const workEndDate = document.getElementById('actualWorkEndDate')?.value;
                    completed = !!(arrivalDate && workEndDate);
                    this.stepCompleted.activityPeriod = completed;
                    break;
                    
                case 2: // 구매방식
                    const purchaseType = document.querySelector('input[name="purchaseType"]:checked');
                    completed = !!purchaseType;
                    this.stepCompleted.purchaseMethod = completed;
                    break;
                    
                case 3: // 항공권 정보
                    const departureDate = document.getElementById('departureDate')?.value;
                    const returnDate = document.getElementById('returnDate')?.value;
                    const departureAirport = document.getElementById('departureAirport')?.value;
                    const arrivalAirport = document.getElementById('arrivalAirport')?.value;
                    completed = !!(departureDate && returnDate && departureAirport && arrivalAirport);
                    this.stepCompleted.flightInfo = completed;
                    break;
                    
                case 4: // 이미지 업로드
                    completed = !!this.ticketImageFile;
                    this.stepCompleted.imageUpload = completed;
                    break;
            }
            
            console.log(`✅ [단계네비] ${step}단계 완료 상태 업데이트:`, completed);
            
        } catch (error) {
            console.error(`❌ [단계네비] ${step}단계 완료 상태 확인 실패:`, error);
        }
    }

    // === 제출 관리 ===

    setupSubmitEvents() {
        const form = document.getElementById('flightRequestForm');
        
        if (form) {
            form.addEventListener('submit', (e) => {
                this.handleTicketSubmit(e);
            });
        }
        
        console.log('✅ [티켓모듈] 제출 이벤트 설정 완료');
    }

    async handleTicketSubmit(event) {
        try {
            event.preventDefault();
            console.log('🔄 [제출] v8.2.6: 항공권 신청 제출 처리 시작...');
            
            this.setLoading(true);
            
            // 1. 현지 활동기간 검증
            const activityValidation = this.validateActivityPeriod();
            if (!activityValidation.valid) {
                this.showError('현지 활동기간을 올바르게 입력해주세요.');
                this.setLoading(false);
                return;
            }
            
            // 2. 항공권 날짜 검증
            if (!this.validateFlightDatesEnhanced()) {
                this.setLoading(false);
                return;
            }
            
            // 3. 가격 필드 검증
            if (!this.validatePriceFields()) {
                this.setLoading(false);
                return;
            }
            
            // 4. 필수 파일 확인
            if (!this.ticketImageFile) {
                this.showError('항공권 정보 이미지를 업로드해주세요.');
                this.setLoading(false);
                return;
            }
            
            // 5. 폼 데이터 수집
            const form = document.getElementById('flightRequestForm');
            const formData = new FormData(form);
            const requestData = {
                // 현지 활동기간
                actual_arrival_date: formData.get('actualArrivalDate'),
                actual_work_end_date: formData.get('actualWorkEndDate'),
                
                // 항공권 정보
                departure_date: formData.get('departureDate'),
                return_date: formData.get('returnDate'),
                departure_airport: formData.get('departureAirport'),
                arrival_airport: formData.get('arrivalAirport'),
                
                // 가격 정보
                ticket_price: parseInt(formData.get('ticketPrice')),
                currency: formData.get('currency'),
                price_source: formData.get('priceSource'),
                
                // 구매 방식
                purchase_type: formData.get('purchaseType'),
                purchase_link: formData.get('purchaseLink') || null
            };
            
            // 6. API를 통해 제출
            if (this.apiService && typeof this.apiService.submitFlightRequest === 'function') {
                const result = await this.apiService.submitFlightRequest(requestData, this.ticketImageFile);
                console.log('✅ [제출] v8.2.6: 항공권 신청 제출 완료:', result);
                
                // 7. 성공 처리
                this.showSuccess('항공권 신청이 성공적으로 제출되었습니다!');
                
                // 8. 페이지 새로고침하여 새로운 상태 반영
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } else {
                throw new Error('API 서비스가 준비되지 않았습니다.');
            }
            
        } catch (error) {
            console.error('❌ [제출] v8.2.6: 처리 실패:', error);
            this.showError('항공권 신청 제출 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    // === 데이터 로딩 ===

    async loadTicketInfo() {
        try {
            console.log('🔄 [티켓모듈] 기존 항공권 정보 로드 시작...');
            
            // API를 통해 기존 항공권 신청 내역 확인
            if (this.apiService && typeof this.apiService.loadExistingFlightRequest === 'function') {
                const existingRequest = await this.apiService.loadExistingFlightRequest();
                
                if (existingRequest) {
                    console.log('✅ [티켓모듈] 기존 항공권 신청 발견:', existingRequest.status);
                    this.populateExistingData(existingRequest);
                }
            }
            
            console.log('✅ [티켓모듈] 항공권 정보 로드 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 항공권 정보 로드 실패:', error);
        }
    }

    populateExistingData(requestData) {
        try {
            console.log('🔄 [티켓모듈] 기존 데이터로 폼 채우기...');
            
            // 현지 활동기간
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            if (arrivalDateEl && requestData.actual_arrival_date) {
                arrivalDateEl.value = requestData.actual_arrival_date;
            }
            if (workEndDateEl && requestData.actual_work_end_date) {
                workEndDateEl.value = requestData.actual_work_end_date;
            }
            
            // 항공권 정보
            const departureEl = document.getElementById('departureDate');
            const returnEl = document.getElementById('returnDate');
            const departureAirportEl = document.getElementById('departureAirport');
            const arrivalAirportEl = document.getElementById('arrivalAirport');
            
            if (departureEl && requestData.departure_date) {
                departureEl.value = requestData.departure_date;
            }
            if (returnEl && requestData.return_date) {
                returnEl.value = requestData.return_date;
            }
            if (departureAirportEl && requestData.departure_airport) {
                departureAirportEl.value = requestData.departure_airport;
            }
            if (arrivalAirportEl && requestData.arrival_airport) {
                arrivalAirportEl.value = requestData.arrival_airport;
            }
            
            // 가격 정보
            const priceEl = document.getElementById('ticketPrice');
            const currencyEl = document.getElementById('currency');
            const sourceEl = document.getElementById('priceSource');
            
            if (priceEl && requestData.ticket_price) {
                priceEl.value = requestData.ticket_price;
            }
            if (currencyEl && requestData.currency) {
                currencyEl.value = requestData.currency;
            }
            if (sourceEl && requestData.price_source) {
                sourceEl.value = requestData.price_source;
            }
            
            // 구매 방식
            if (requestData.purchase_type) {
                const purchaseRadio = document.querySelector(`input[name="purchaseType"][value="${requestData.purchase_type}"]`);
                if (purchaseRadio) {
                    purchaseRadio.checked = true;
                    this.handlePurchaseMethodChange();
                }
            }
            
            const purchaseLinkEl = document.getElementById('purchaseLink');
            if (purchaseLinkEl && requestData.purchase_link) {
                purchaseLinkEl.value = requestData.purchase_link;
            }
            
            console.log('✅ [티켓모듈] 기존 데이터로 폼 채우기 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] 기존 데이터 채우기 실패:', error);
        }
    }

    // === 유틸리티 메서드들 ===

    showError(message) {
        try {
            console.error('❌ [티켓모듈]:', message);
            
            // UI에 에러 메시지 표시
            if (this.uiService && typeof this.uiService.showError === 'function') {
                this.uiService.showError(message);
            } else {
                // 폴백: alert 사용
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 에러 표시 실패:', error);
        }
    }

    showSuccess(message) {
        try {
            console.log('✅ [티켓모듈]:', message);
            
            // UI에 성공 메시지 표시
            if (this.uiService && typeof this.uiService.showSuccess === 'function') {
                this.uiService.showSuccess(message);
            } else {
                // 폴백: alert 사용
                alert(message);
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 성공 메시지 표시 실패:', error);
        }
    }

    setLoading(loading) {
        try {
            console.log('🔄 [티켓모듈] 로딩 상태:', loading);
            
            const submitBtn = document.getElementById('submitBtn');
            const submitBtnText = document.getElementById('submitBtnText');
            
            if (submitBtn) {
                submitBtn.disabled = loading;
            }
            if (submitBtnText) {
                submitBtnText.textContent = loading ? '제출 중...' : '신청하기';
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] 로딩 상태 설정 실패:', error);
        }
    }

    // === 외부 인터페이스 ===

    // 현재 티켓 데이터 반환
    getTicketData() {
        return { ...this.ticketData };
    }

    // 단계 완료 상태 반환
    getStepCompletionStatus() {
        return { ...this.stepCompleted };
    }

    // 전제 조건 상태 반환
    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionEnabled
        };
    }

    // 🔧 v8.2.6: 사용자 활동 요구사항 반환
    getUserActivityRequirements() {
        return {
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays,
            dispatchEndDate: this.dispatchEndDate,
            isLoaded: this.isUserActivityRequirementsLoaded
        };
    }

    // 수동으로 검증 트리거
    triggerValidation() {
        this.validateActivityPeriod();
        this.validateFlightDatesEnhanced();
        this.checkActivityPeriodCompletion();
        this.updateFlightSectionAvailability();
    }

    // 🔧 v8.2.6: 사용자 활동 요구사항 새로고침
    async refreshUserActivityRequirements() {
        try {
            console.log('🔄 [새로고침] v8.2.6: 사용자 활동 요구사항 새로고침 시작...');
            
            this.isUserActivityRequirementsLoaded = false;
            await this.loadUserActivityRequirements();
            
            // 활동기간 재검증
            this.validateActivityPeriod();
            this.checkActivityPeriodCompletion();
            this.updateFlightSectionAvailability();
            
            console.log('✅ [새로고침] v8.2.6: 사용자 활동 요구사항 새로고침 완료');
            
        } catch (error) {
            console.error('❌ [새로고침] v8.2.6: 새로고침 실패:', error);
        }
    }

    // 🔧 v8.2.6: 디버깅용 상태 정보 반환
    getDebugInfo() {
        return {
            ticketData: this.ticketData,
            stepCompleted: this.stepCompleted,
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays,
            dispatchEndDate: this.dispatchEndDate,
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionEnabled,
            isUserActivityRequirementsLoaded: this.isUserActivityRequirementsLoaded
        };
    }
}

// 전역 스코프에 노출
window.FlightRequestTicket = FlightRequestTicket;

console.log('✅ FlightRequestTicket v8.2.6 모듈 로드 완료 - 메서드 보완 완료');
console.log('🔧 v8.2.6 핵심 추가사항:', {
    userActivityRequirements: {
        title: '사용자별 활동 요구사항 관리',
        features: [
            '최소/최대 활동일 데이터 로드',
            '필수 활동일 UI 표시',
            '로딩 실패 시 로딩중... 표시',
            '파견 종료일 관리'
        ]
    },
    prerequisiteSystem: {
        title: '활동기간 기반 항공권 섹션 제어',
        features: [
            '활동기간 검증 통과 시에만 항공권 정보 입력 가능',
            '실시간 전제조건 상태 확인',
            'UI 활성화/비활성화 제어'
        ]
    },
    enhancedFlightValidation: {
        title: '강화된 항공권 날짜 검증',
        businessLogic: [
            '출국일-2 < 출국일 < 현지 도착일',
            '활동종료일 < 귀국일 < 활동종료일 + 10',
            '귀국일 < 2025년 12월 12일 (파견 종료일)'
        ],
        validation: [
            '출국일과 현지 도착일 간격 2일 이내',
            '귀국일과 활동종료일 간격 10일 이내',
            '파견 종료일 이전 귀국 필수'
        ]
    },
    activityPeriodValidation: {
        title: '활동기간 범위 검증 복원',
        features: [
            '최소/최대 활동일 범위 검증',
            '실시간 활동일 계산',
            '검증 결과 UI 업데이트'
        ]
    },
    newMethods: {
        loadUserActivityRequirements: '사용자별 활동 요구사항 로드',
        updateRequiredDaysUI: '필수 활동일 UI 업데이트',
        updateRequiredDaysUILoading: '로딩 상태 UI 표시',
        updateRequiredDaysUIError: '에러 상태 UI 표시',
        validateFlightDatesEnhanced: '강화된 항공권 날짜 검증',
        getUserActivityRequirements: '사용자 활동 요구사항 반환',
        refreshUserActivityRequirements: '활동 요구사항 새로고침',
        getDebugInfo: '디버깅용 상태 정보 반환'
    },
    compatibility: {
        v825: '기존 검증 로직 분리 구조 유지',
        v824: '전제조건 시스템 완전 호환',
        v823: '코드 정리 및 최적화 유지',
        prerequisiteSystem: '항공권 섹션 활성화/비활성화 시스템 유지',
        stepNavigation: '단계별 네비게이션 시스템 유지',
        imageUpload: '이미지 업로드 시스템 유지'
    }
});
console.log('📋 v8.2.6 비즈니스 로직 세부사항:', {
    flightDateConstraints: {
        departureToArrival: '출국일 → 현지도착일: 2일 이내',
        workEndToReturn: '활동종료일 → 귀국일: 10일 이내',
        returnToDispatchEnd: '귀국일 → 파견종료일: 이전 필수'
    },
    activityPeriodConstraints: {
        minimumDays: 'DB에서 로드된 최소 활동일',
        maximumDays: 'DB에서 로드된 최대 활동일',
        loadingFallback: '로딩 실패 시 로딩중... 표시'
    },
    prerequisiteFlow: {
        step1: '활동기간 입력 → 검증',
        step2: '검증 통과 → 항공권 섹션 활성화',
        step3: '항공권 정보 입력 → 비즈니스 로직 검증',
        step4: '모든 검증 통과 → 제출 가능'
    }
});