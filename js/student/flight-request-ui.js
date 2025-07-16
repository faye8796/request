// flight-request-ui.js - 항공권 신청 UI 관리 모듈 v8.7.6 (구문 오류 수정)
// 🔧 v8.7.6: P0 긴급 수정 - 중괄호 불균형 및 구문 오류 완전 해결
// 📝 핵심 수정사항:
//   - 중괄호 불균형 문제 완전 해결 (클래스 및 모든 메서드 정상 닫힘)
//   - 817줄 부근 구문 오류 완전 수정
//   - JavaScript 파일 정상 로딩 보장
//   - 모든 메서드의 구문 정확성 확보
//   - ESLint/JSHint 호환성 보장
// 🔧 v8.7.5: P0 긴급 수정 - 스텁 메서드들을 실제 구현으로 교체 (유지)
// 🔧 v8.7.4: P0 수정 - ensureInitialized 메서드 추가로 콘솔 오류 해결 (유지)
// 🔧 v8.7.3: 의존성 체크 로직 강화 - utils 로딩 실패 문제 해결 (유지)
// 🔧 v8.7.2: 전제조건 시스템 실제 구현 및 활동기간 범위 검증 제거 (유지)

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
        
        // 🔧 v8.4.2: 여권정보 관련 상태
        this.passportImageFile = null;
        this.isPassportMode = false;
        this.existingPassportInfo = null;
        
        // 🚀 v8.5.0: 캐싱 시스템 (Priority 3)
        this.cache = {
            userProfile: null,
            passportInfo: null,
            activityRequirements: null,
            lastUpdated: {}
        };
        
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
        
        // 🚀 v8.5.0: 에러 처리 강화 (Priority 2)
        this.errorContext = {
            lastError: null,
            retryCount: 0,
            maxRetries: 5
        };
        
        // 초기화 상태
        this.isInitialized = false;
        this.initializationPromise = this.init();
    }

    // 🚀 v8.5.0: 에러 분류 시스템 (Priority 2)
    classifyError(error) {
        const errorMessage = error.message?.toLowerCase() || '';
        
        if (error.name === 'NetworkError' || errorMessage.includes('network') || errorMessage.includes('fetch')) {
            return {
                type: 'NETWORK',
                severity: 'HIGH',
                userMessage: '네트워크 연결을 확인해주세요',
                retryable: true,
                retryDelay: 2000
            };
        }
        
        if (errorMessage.includes('unauthorized') || errorMessage.includes('authentication')) {
            return {
                type: 'AUTH',
                severity: 'HIGH',
                userMessage: '인증이 만료되었습니다. 다시 로그인해주세요',
                retryable: false,
                requiresReload: true
            };
        }
        
        if (errorMessage.includes('timeout') || errorMessage.includes('시간 초과')) {
            return {
                type: 'TIMEOUT',
                severity: 'MEDIUM',
                userMessage: '응답 시간을 초과했습니다. 잠시 후 다시 시도해주세요',
                retryable: true,
                retryDelay: 3000
            };
        }
        
        if (errorMessage.includes('api') || errorMessage.includes('server')) {
            return {
                type: 'SERVER',
                severity: 'HIGH',
                userMessage: '서버에 일시적인 문제가 있습니다',
                retryable: true,
                retryDelay: 5000
            };
        }
        
        return {
            type: 'UNKNOWN',
            severity: 'MEDIUM',
            userMessage: '알 수 없는 오류가 발생했습니다',
            retryable: true,
            retryDelay: 1000
        };
    }

    // 🚀 v8.5.0: 지수 백오프 재시도 시스템 (Priority 2)
    async executeWithRetry(operation, operationName, maxRetries = 3) {
        let lastError = null;
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [재시도] ${operationName} 시도 ${attempt}/${maxRetries}`);
                
                const result = await Promise.race([
                    operation(),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Operation timeout')), 10000)
                    )
                ]);
                
                console.log(`✅ [재시도] ${operationName} 성공 (${attempt}회 만에)`);
                return result;
                
            } catch (error) {
                lastError = error;
                const errorInfo = this.classifyError(error);
                
                console.warn(`⚠️ [재시도] ${operationName} 실패 (${attempt}/${maxRetries}):`, {
                    error: error.message,
                    type: errorInfo.type,
                    severity: errorInfo.severity,
                    retryable: errorInfo.retryable
                });
                
                // 재시도 불가능한 에러인 경우 즉시 중단
                if (!errorInfo.retryable || attempt === maxRetries) {
                    break;
                }
                
                // 지수 백오프 대기 (attempt^2 * base delay)
                const delay = Math.min(errorInfo.retryDelay * Math.pow(2, attempt - 1), 10000);
                console.log(`⏳ [재시도] ${delay}ms 대기 후 재시도...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        // 최종 실패 처리
        const finalError = this.classifyError(lastError);
        console.error(`❌ [재시도] ${operationName} 최종 실패:`, finalError);
        
        this.errorContext.lastError = finalError;
        this.errorContext.retryCount = maxRetries;
        
        throw lastError;
    }

    initElements() {
        return {
            // 로딩/컨텐츠
            loadingState: document.getElementById('loadingState'),
            mainContent: document.getElementById('mainContent'),
            passportAlert: document.getElementById('passportAlert'),
            existingRequest: document.getElementById('existingRequest'),
            requestForm: document.getElementById('requestForm'),
            
            // 🔧 v8.4.2: 여권정보 페이지 요소들
            passportInfoPage: document.getElementById('passportInfoPage'),
            passportLoadingState: document.getElementById('passportLoadingState'),
            passportForm: document.getElementById('passportForm'),
            passportInfoForm: document.getElementById('passportInfoForm'),
            passportNumber: document.getElementById('passportNumber'),
            nameEnglish: document.getElementById('nameEnglish'),
            issueDate: document.getElementById('issueDate'),
            expiryDate: document.getElementById('expiryDate'),
            expiryWarning: document.getElementById('expiryWarning'),
            passportImage: document.getElementById('passportImage'),
            passportImagePreview: document.getElementById('passportImagePreview'),
            passportPreviewImg: document.getElementById('passportPreviewImg'),
            removePassportImage: document.getElementById('removePassportImage'),
            passportSubmitBtn: document.getElementById('passportSubmitBtn'),
            passportSubmitBtnText: document.getElementById('passportSubmitBtnText'),
            passportSuccessMessage: document.getElementById('passportSuccessMessage'),
            proceedToFlightRequest: document.getElementById('proceedToFlightRequest'),
            
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
        const selectors = [
            '.form-section:has(#departureDate)',
            '[data-flight-info]',
            '#flightInfoSection',
            '.form-section:nth-child(3)',
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
            console.log('🔄 FlightRequestUI v8.7.6 초기화 시작 - 구문 오류 수정 완료...');
            
            // 🚀 v8.5.0: API 및 유틸리티 대기 (타임아웃 설정)
            await this.waitForDependenciesEnhanced();
            
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 🔧 v8.4.2: 여권정보 이벤트 리스너 설정
            this.setupPassportEventListeners();
            
            // 현지 활동기간 검증 이벤트 설정
            this.setupActivityValidationEvents();
            
            // 귀국 필수 완료일 검증 이벤트 설정
            this.setupRequiredReturnDateEvents();
            
            // 🚀 v8.2.4: 전제 조건 시스템 이벤트 설정
            this.setupPrerequisiteSystemEvents();
            
            // 🔥 v8.6.0: P2 강화된 초기 데이터 로드
            setTimeout(() => {
                this.loadInitialData();
            }, 300);
            
            console.log('✅ FlightRequestUI v8.7.6 초기화 완료 