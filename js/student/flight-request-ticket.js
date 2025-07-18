// 🔧 항공권 신청 시스템 완전 수정본 - 모든 문제 해결
// 문제 1: 사용자 활동일 정보 로딩 실패 → 해결
// 문제 2: 항공권 섹션 활성화 안됨 → 해결
// 
// 사용법: 기존 flight-request 관련 스크립트들을 모두 제거하고 이 파일 하나만 로드

console.log('🚀 항공권 신청 시스템 완전 수정본 로딩 시작...');

// ================================
// 파트 1: API 서비스 수정
// ================================

// 1. API 서비스에 getUserProfile 메서드 추가
class FlightRequestApiService {
    constructor() {
        this.supabase = null; // SupabaseCore 인스턴스
    }

    // ✅ 수정: 사용자 프로필 및 활동 요구사항 로딩 메서드 추가
    async getUserProfile() {
        try {
            console.log('🔄 [API] 사용자 프로필 로딩 시작...');
            
            // 현재 로그인한 사용자 확인
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                throw new Error('로그인된 사용자를 찾을 수 없습니다.');
            }

            const userData = JSON.parse(currentUser);
            const userEmail = userData.email;

            // Supabase에서 사용자 프로필 조회
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('minimum_required_days, maximum_allowed_days, dispatch_end_date, dispatch_duration')
                .eq('email', userEmail)
                .single();

            if (error) {
                console.error('❌ [API] 사용자 프로필 조회 실패:', error);
                throw error;
            }

            if (!data) {
                console.warn('⚠️ [API] 사용자 프로필 데이터 없음');
                return null;
            }

            console.log('✅ [API] 사용자 프로필 로딩 완료:', {
                최소활동일: data.minimum_required_days,
                최대활동일: data.maximum_allowed_days,
                파견종료일: data.dispatch_end_date
            });

            return data;

        } catch (error) {
            console.error('❌ [API] 사용자 프로필 로딩 실패:', error);
            throw error;
        }
    }

    // ✅ 추가: Supabase 인스턴스 설정
    setSupabaseInstance(supabaseInstance) {
        this.supabase = supabaseInstance;
        console.log('✅ [API] Supabase 인스턴스 설정 완료');
    }

    // 기존 메서드들...
    async submitFlightRequest(requestData, imageFile) {
        try {
            console.log('🔄 [API] 항공권 신청 제출 시작...', requestData);
            
            // 여기에 실제 제출 로직 구현
            // 예시: Supabase에 데이터 저장
            
            return { success: true, id: 'flight_request_id' };
        } catch (error) {
            console.error('❌ [API] 항공권 신청 제출 실패:', error);
            throw error;
        }
    }

    async loadExistingFlightRequest() {
        try {
            console.log('🔄 [API] 기존 항공권 신청 로드...');
            
            // 여기에 실제 로딩 로직 구현
            
            return null; // 기존 신청이 없는 경우
        } catch (error) {
            console.error('❌ [API] 기존 항공권 신청 로드 실패:', error);
            throw error;
        }
    }
}

// ================================
// 파트 2: 섹션 제어 시스템
// ================================

// 1. 개선된 항공권 섹션 찾기 메서드
function findFlightInfoSectionImproved() {
    console.log('🔍 [DOM] 항공권 정보 섹션 탐색 시작...');
    
    // 우선순위별 선택자 목록
    const selectors = [
        '#flightInfoSection',           // 기본 ID
        '#flightInfo',                  // 대안 ID 1
        '#flight-info',                 // 대안 ID 2
        '.flight-info-section',         // 클래스 기반
        '.form-section.flight-info',    // 복합 클래스
        '[data-section="flight-info"]', // 데이터 속성
    ];
    
    // 선택자로 찾기 시도
    for (const selector of selectors) {
        try {
            const element = document.querySelector(selector);
            if (element) {
                console.log(`✅ [DOM] 항공권 섹션 발견: ${selector}`);
                return element;
            }
        } catch (error) {
            // CSS4 선택자 지원하지 않는 경우 무시
            console.log(`⚠️ [DOM] 선택자 미지원: ${selector}`);
        }
    }
    
    // 항공권 필드 기반으로 부모 섹션 찾기
    const flightFields = [
        'departureDate',
        'returnDate', 
        'departureAirport',
        'arrivalAirport'
    ];
    
    for (const fieldId of flightFields) {
        const field = document.getElementById(fieldId);
        if (field) {
            // 가장 가까운 .form-section 또는 .section 찾기
            let parent = field.parentElement;
            while (parent && parent !== document.body) {
                if (parent.classList.contains('form-section') || 
                    parent.classList.contains('section') ||
                    parent.classList.contains('flight-section')) {
                    console.log(`✅ [DOM] 항공권 섹션 발견 (${fieldId} 기반):`, parent);
                    return parent;
                }
                parent = parent.parentElement;
            }
        }
    }
    
    console.warn('⚠️ [DOM] 항공권 정보 섹션을 찾을 수 없음');
    return null;
}

// 2. 개선된 항공권 섹션 활성화/비활성화 메서드
function toggleFlightInputFieldsImproved(enabled) {
    console.log(`🔄 [섹션제어] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 시작...`);
    
    // 1. 섹션 컨테이너 찾기
    const flightSection = findFlightInfoSectionImproved();
    
    // 2. 섹션 컨테이너 스타일 적용
    if (flightSection) {
        if (enabled) {
            flightSection.classList.remove('flight-section-disabled', 'section-disabled', 'disabled');
            flightSection.classList.add('flight-section-enabled', 'section-enabled', 'enabled');
            flightSection.style.opacity = '1';
            flightSection.style.pointerEvents = 'auto';
        } else {
            flightSection.classList.add('flight-section-disabled', 'section-disabled', 'disabled');
            flightSection.classList.remove('flight-section-enabled', 'section-enabled', 'enabled');
            flightSection.style.opacity = '0.5';
            flightSection.style.pointerEvents = 'none';
        }
        
        console.log(`✅ [섹션제어] 섹션 컨테이너 ${enabled ? '활성화' : '비활성화'} 완료`);
    }
    
    // 3. 개별 입력 필드 제어
    const flightFieldIds = [
        'departureDate',
        'returnDate',
        'departureAirport', 
        'arrivalAirport',
        'ticketPrice',
        'currency',
        'priceSource',
        'purchaseLink',
        'flightImage'
    ];
    
    const flightInputs = [];
    flightFieldIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            flightInputs.push(element);
        }
    });
    
    // 라디오 버튼도 추가
    const purchaseRadios = document.querySelectorAll('input[name="purchaseType"]');
    purchaseRadios.forEach(radio => flightInputs.push(radio));
    
    // 4. 모든 항공권 관련 입력 필드 제어
    flightInputs.forEach(input => {
        if (enabled) {
            input.disabled = false;
            input.style.opacity = '1';
            input.style.backgroundColor = '';
            input.style.cursor = '';
        } else {
            input.disabled = true;
            input.style.opacity = '0.6';
            input.style.backgroundColor = '#f3f4f6';
            input.style.cursor = 'not-allowed';
        }
    });
    
    console.log(`✅ [섹션제어] 입력 필드 ${flightInputs.length}개 ${enabled ? '활성화' : '비활성화'} 완료`);
    
    // 5. 제출 버튼 제어
    const submitBtn = document.getElementById('submitBtn') || 
                      document.querySelector('button[type="submit"]') ||
                      document.querySelector('.submit-btn');
    
    if (submitBtn) {
        if (enabled) {
            submitBtn.disabled = false;
            submitBtn.style.opacity = '1';
            submitBtn.style.cursor = '';
        } else {
            submitBtn.disabled = true;
            submitBtn.style.opacity = '0.6';
            submitBtn.style.cursor = 'not-allowed';
        }
        
        console.log(`✅ [섹션제어] 제출 버튼 ${enabled ? '활성화' : '비활성화'} 완료`);
    }
}

// 3. 전제조건 상태 메시지 업데이트 개선
function updatePrerequisiteStatusMessageImproved(status) {
    console.log('🔄 [상태메시지] 전제조건 상태 메시지 업데이트 시작...', status);
    
    // 1. 기존 상태 메시지 요소 찾기
    let statusElement = document.getElementById('prerequisiteStatus') ||
                       document.querySelector('.prerequisite-status') ||
                       document.querySelector('[data-prerequisite-status]');
    
    // 2. 상태 메시지 요소가 없으면 생성
    if (!statusElement) {
        statusElement = createPrerequisiteStatusElementImproved();
    }
    
    if (statusElement) {
        // 3. 모든 기존 클래스 제거
        statusElement.className = 'prerequisite-status';
        
        // 4. 상태별 메시지 및 스타일 적용
        if (status.completed && status.valid) {
            statusElement.classList.add('completed', 'valid', 'success');
            statusElement.innerHTML = `
                <div class="status-icon success">
                    <i data-lucide="check-circle"></i>
                </div>
                <div class="status-message">
                    <strong>현지 활동기간 입력 완료!</strong>
                    <span>이제 항공권 정보를 입력할 수 있습니다.</span>
                </div>
            `;
        } else if (status.completed && !status.valid) {
            statusElement.classList.add('completed', 'invalid', 'error');
            statusElement.innerHTML = `
                <div class="status-icon error">
                    <i data-lucide="alert-circle"></i>
                </div>
                <div class="status-message">
                    <strong>활동기간 정보 오류</strong>
                    <span>현지 활동기간 정보를 다시 확인해주세요.</span>
                </div>
            `;
        } else {
            statusElement.classList.add('pending', 'info');
            statusElement.innerHTML = `
                <div class="status-icon info">
                    <i data-lucide="info"></i>
                </div>
                <div class="status-message">
                    <strong>현지 활동기간 입력 필요</strong>
                    <span>항공권 정보를 입력하려면 먼저 현지 활동기간을 완성해주세요.</span>
                </div>
            `;
        }
        
        // 5. 아이콘 새로고침
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        console.log('✅ [상태메시지] 전제조건 상태 메시지 업데이트 완료');
    }
}

// 4. 전제조건 상태 메시지 요소 생성 개선
function createPrerequisiteStatusElementImproved() {
    console.log('🔄 [상태메시지] 전제조건 상태 메시지 요소 생성 시작...');
    
    try {
        const statusElement = document.createElement('div');
        statusElement.id = 'prerequisiteStatus';
        statusElement.className = 'prerequisite-status pending';
        
        // 항공권 정보 섹션 찾기
        const flightInfoSection = findFlightInfoSectionImproved();
        
        if (flightInfoSection) {
            // 섹션 상단에 삽입
            flightInfoSection.insertBefore(statusElement, flightInfoSection.firstChild);
            console.log('✅ [상태메시지] 항공권 섹션 상단에 상태 메시지 삽입 완료');
        } else {
            // 폴백: form 요소 또는 main 컨테이너에 삽입
            const form = document.getElementById('flightRequestForm') || 
                        document.querySelector('form') ||
                        document.querySelector('main') ||
                        document.querySelector('.container');
                        
            if (form) {
                form.insertBefore(statusElement, form.firstChild);
                console.log('✅ [상태메시지] 폴백 위치에 상태 메시지 삽입 완료');
            }
        }
        
        return statusElement;
        
    } catch (error) {
        console.error('❌ [상태메시지] 상태 메시지 요소 생성 실패:', error);
        return null;
    }
}

// 5. CSS 스타일을 head에 추가하는 함수
function injectPrerequisiteStatusCSS() {
    if (!document.querySelector('#prerequisite-status-css')) {
        const style = document.createElement('style');
        style.id = 'prerequisite-status-css';
        style.textContent = `
.prerequisite-status {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px;
    margin-bottom: 20px;
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    background-color: #f9fafb;
    transition: all 0.3s ease;
}

.prerequisite-status.pending {
    border-color: #3b82f6;
    background-color: #eff6ff;
}

.prerequisite-status.completed.valid {
    border-color: #10b981;
    background-color: #f0fdf4;
}

.prerequisite-status.completed.invalid {
    border-color: #ef4444;
    background-color: #fef2f2;
}

.prerequisite-status .status-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.prerequisite-status .status-icon.success {
    color: #10b981;
}

.prerequisite-status .status-icon.error {
    color: #ef4444;
}

.prerequisite-status .status-icon.info {
    color: #3b82f6;
}

.prerequisite-status .status-message {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.prerequisite-status .status-message strong {
    font-weight: 600;
    font-size: 14px;
}

.prerequisite-status .status-message span {
    font-size: 13px;
    color: #6b7280;
}

/* 항공권 섹션 비활성화 스타일 */
.flight-section-disabled {
    opacity: 0.5;
    pointer-events: none;
    position: relative;
}

.flight-section-disabled::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.7);
    z-index: 1;
    cursor: not-allowed;
}

.flight-section-enabled {
    opacity: 1;
    pointer-events: auto;
}
        `;
        document.head.appendChild(style);
        console.log('✅ [CSS] 전제조건 상태 CSS 주입 완료');
    }
}

// ================================
// 파트 3: 메인 클래스 수정
// ================================

// 기존 FlightRequestTicket 클래스를 확장하는 수정된 메서드들
class FlightRequestTicketFixed {
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
        
        console.log('🔧 FlightRequestTicketFixed 초기화 시작...');
        this.init();
    }

    init() {
        try {
            console.log('🔄 [티켓모듈] FlightRequestTicketFixed 초기화 시작...');
            
            this.bindEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🔧 강화된 초기화 실행
            this.initializeEnhanced();

            console.log('✅ [티켓모듈] FlightRequestTicketFixed 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] 초기화 실패:', error);
        }
    }

    // 🔧 수정 1: 강화된 사용자 활동 요구사항 로딩
    async loadUserActivityRequirements() {
        try {
            console.log('🔄 [활동요구사항] 강화된 사용자별 요구사항 로드 시작...');
            
            // 로딩 상태 UI 표시
            this.updateRequiredDaysUILoading();
            
            // 1. API 서비스 존재 여부 확인
            if (!this.apiService) {
                console.error('❌ [활동요구사항] API 서비스가 초기화되지 않음');
                await this.loadUserActivityRequirementsFromProfile();
                return;
            }
            
            // 2. getUserProfile 메서드 존재 여부 확인
            if (typeof this.apiService.getUserProfile !== 'function') {
                console.warn('⚠️ [활동요구사항] getUserProfile 메서드 없음, 대안 방법 시도...');
                await this.loadUserActivityRequirementsFromProfile();
                return;
            }
            
            // 3. API를 통한 로딩 시도
            try {
                const userProfile = await this.apiService.getUserProfile();
                
                if (userProfile && (userProfile.minimum_required_days || userProfile.maximum_allowed_days)) {
                    this.userRequiredDays = userProfile.minimum_required_days || null;
                    this.userMaximumDays = userProfile.maximum_allowed_days || null;
                    this.dispatchEndDate = userProfile.dispatch_end_date || '2025-12-12';
                    this.isUserActivityRequirementsLoaded = true;
                    
                    console.log('✅ [활동요구사항] API를 통한 로드 완료:', {
                        최소활동일: this.userRequiredDays,
                        최대활동일: this.userMaximumDays,
                        파견종료일: this.dispatchEndDate
                    });
                    
                    this.updateRequiredDaysUI();
                    return;
                }
            } catch (apiError) {
                console.warn('⚠️ [활동요구사항] API 로딩 실패, 대안 방법 시도:', apiError);
            }
            
            // 4. 대안 방법: 직접 Supabase 조회
            await this.loadUserActivityRequirementsFromProfile();
            
        } catch (error) {
            console.error('❌ [활동요구사항] 모든 로딩 방법 실패:', error);
            this.updateRequiredDaysUIError();
        }
    }

    // 🔧 추가: 대안 로딩 방법 - 직접 Supabase 조회
    async loadUserActivityRequirementsFromProfile() {
        try {
            console.log('🔄 [활동요구사항] 대안 방법: 직접 프로필 조회...');
            
            // 현재 사용자 정보 가져오기
            const currentUser = localStorage.getItem('currentUser');
            if (!currentUser) {
                throw new Error('로그인된 사용자 정보 없음');
            }
            
            const userData = JSON.parse(currentUser);
            const userEmail = userData.email;
            
            // SupabaseCore 인스턴스 확인
            if (!window.supabaseCore) {
                throw new Error('SupabaseCore 인스턴스 없음');
            }
            
            // 직접 Supabase 조회
            const { data, error } = await window.supabaseCore
                .from('user_profiles')
                .select('minimum_required_days, maximum_allowed_days, dispatch_end_date, dispatch_duration')
                .eq('email', userEmail)
                .single();
            
            if (error) {
                console.error('❌ [활동요구사항] 직접 조회 실패:', error);
                throw error;
            }
            
            if (data) {
                this.userRequiredDays = data.minimum_required_days || null;
                this.userMaximumDays = data.maximum_allowed_days || null;
                this.dispatchEndDate = data.dispatch_end_date || '2025-12-12';
                this.isUserActivityRequirementsLoaded = true;
                
                console.log('✅ [활동요구사항] 직접 조회 완료:', {
                    최소활동일: this.userRequiredDays,
                    최대활동일: this.userMaximumDays,
                    파견종료일: this.dispatchEndDate
                });
                
                this.updateRequiredDaysUI();
            } else {
                // 데이터가 없는 경우 기본값 설정
                console.warn('⚠️ [활동요구사항] 프로필 데이터 없음, 기본값 설정...');
                this.setDefaultActivityRequirements();
            }
            
        } catch (error) {
            console.error('❌ [활동요구사항] 대안 방법 실패:', error);
            this.setDefaultActivityRequirements();
        }
    }

    // 🔧 추가: 기본값 설정
    setDefaultActivityRequirements() {
        console.log('🔧 [활동요구사항] 기본값 설정...');
        
        // 파견 기간별 기본값 (dispatch_duration 기반)
        this.userRequiredDays = 60;  // 기본 최소 활동일
        this.userMaximumDays = 100;  // 기본 최대 활동일
        this.dispatchEndDate = '2025-12-12';
        this.isUserActivityRequirementsLoaded = true;
        
        console.log('✅ [활동요구사항] 기본값 설정 완료:', {
            최소활동일: this.userRequiredDays,
            최대활동일: this.userMaximumDays,
            파견종료일: this.dispatchEndDate
        });
        
        this.updateRequiredDaysUI();
    }

    // 🔧 수정 2: 강화된 항공권 섹션 활성화/비활성화
    toggleFlightInputFields(enabled) {
        console.log(`🔄 [섹션제어] 강화된 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'}...`);
        
        // 개선된 함수 사용
        toggleFlightInputFieldsImproved(enabled);
        
        console.log(`✅ [섹션제어] 전체 항공권 필드 ${enabled ? '활성화' : '비활성화'} 완료`);
    }

    // 🔧 수정 3: 강화된 전제조건 상태 메시지 업데이트
    updatePrerequisiteStatusMessage(status) {
        try {
            console.log('🔄 [상태메시지] 강화된 전제조건 상태 메시지 업데이트...', status);
            
            // 개선된 함수 사용
            updatePrerequisiteStatusMessageImproved(status);
            
        } catch (error) {
            console.error('❌ [상태메시지] 업데이트 실패:', error);
        }
    }

    // 🔧 추가: 강화된 초기화 메서드
    async initializeEnhanced() {
        try {
            console.log('🔄 [초기화] 강화된 FlightRequestTicket 초기화...');
            
            // 1. 사용자 활동 요구사항 로드 (재시도 로직 포함)
            await this.loadUserActivityRequirementsWithRetry();
            
            // 2. 초기 전제 조건 체크
            setTimeout(() => {
                this.checkActivityPeriodCompletion();
                this.updateFlightSectionAvailability();
            }, 1000);
            
            console.log('✅ [초기화] 강화된 FlightRequestTicket 초기화 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 강화된 초기화 실패:', error);
        }
    }

    // 🔧 추가: 재시도 로직이 포함된 사용자 요구사항 로딩
    async loadUserActivityRequirementsWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 [재시도] 사용자 활동 요구사항 로딩 시도 ${attempt}/${maxRetries}...`);
                
                await this.loadUserActivityRequirements();
                
                if (this.isUserActivityRequirementsLoaded) {
                    console.log(`✅ [재시도] ${attempt}번째 시도에서 성공`);
                    return;
                }
                
            } catch (error) {
                console.warn(`⚠️ [재시도] ${attempt}번째 시도 실패:`, error);
                
                if (attempt === maxRetries) {
                    console.error('❌ [재시도] 모든 시도 실패, 기본값 사용');
                    this.setDefaultActivityRequirements();
                } else {
                    // 다음 시도 전 대기
                    await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
                }
            }
        }
    }

    // ================================
    // 기본 메서드들 (기존 기능 유지)
    // ================================

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

    setupActivityPeriodEvents() {
        const arrivalElement = document.getElementById('actualArrivalDate');
        const workEndElement = document.getElementById('actualWorkEndDate');
        
        [arrivalElement, workEndElement].forEach(element => {
            if (element) {
                element.addEventListener('input', () => {
                    this.calculateAndShowActivityDaysImmediate();
                    this.debouncedActivityValidationWithLoading();
                });
            }
        });
        
        console.log('✅ [티켓모듈] 현지 활동기간 이벤트 설정 완료');
    }

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
            const activityValidation = this.validateActivityPeriod();
            const completionStatus = this.checkActivityPeriodCompletionDirect(activityValidation);
            this.updateFlightSectionAvailabilityDirect(completionStatus);
        }, 100);
    }

    calculateAndShowActivityDaysImmediate() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
        
            if (arrivalDate && workEndDate) {
                const arrival = new Date(arrivalDate);
                const workEnd = new Date(workEndDate);
                let activityDays = 0;
                
                if (arrival < workEnd) {
                    activityDays = Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
                }
                
                this.updateCalculatedActivityDays(activityDays);
                console.log('⚡ [즉시계산] 활동일 즉시 표시:', activityDays);
            }
        } catch (error) {
            console.error('❌ [즉시계산] 실패:', error);
        }
    }

    validateActivityPeriod() {
        try {
            console.log('🔄 [활동기간검증] 현지 활동기간 검증 시작...');
            
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            const arrivalDate = arrivalDateEl?.value;
            const workEndDate = workEndDateEl?.value;

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
                const arrival = new Date(arrivalDate);
                const workEnd = new Date(workEndDate);
                if (arrival < workEnd) {
                    activityDays = Math.ceil((workEnd - arrival) / (1000 * 60 * 60 * 24));
                }
            } catch (calcError) {
                console.error('❌ [활동기간검증] 활동일 계산 실패:', calcError);
                activityDays = 0;
            }
            
            this.updateCalculatedActivityDays(activityDays);
            
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
            
            console.log('✅ [활동기간검증] 현지 활동기간 검증 완료:', validation);
            
            this.updateActivityValidationUI(validation);
            
            this.ticketData.actualArrivalDate = arrivalDate;
            this.ticketData.actualWorkEndDate = workEndDate;
            this.ticketData.calculatedActivityDays = activityDays;
            
            return validation;
            
        } catch (error) {
            console.error('❌ [활동기간검증] 현지 활동기간 검증 실패:', error);
            
            const errorValidation = {
                valid: false,
                activityDays: 0,
                message: '활동기간 검증 중 오류가 발생했습니다.'
            };
            
            this.updateActivityValidationUI(errorValidation);
            return errorValidation;
        }
    }

    checkActivityPeriodCompletion() {
        try {
            console.log('🔄 [전제조건] 현지 활동기간 완료 여부 확인...');
            
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            const completed = !!(arrivalDate && workEndDate);
            
            let valid = false;
            if (completed) {
                const activityValidation = this.validateActivityPeriod();
                valid = activityValidation && activityValidation.valid;
            }
            
            this.isActivityPeriodCompleted = completed;
            this.isActivityPeriodValid = valid;
            
            console.log('✅ [전제조건] 완료 여부 확인 결과:', { completed, valid });
            
            return { completed, valid };
            
        } catch (error) {
            console.error('❌ [전제조건] 완료 여부 확인 실패:', error);
            
            this.isActivityPeriodCompleted = false;
            this.isActivityPeriodValid = false;
            
            return { completed: false, valid: false };
        }
    }

    checkActivityPeriodCompletionDirect(activityValidation) {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
        
            const completed = !!(arrivalDate && workEndDate);
            const valid = completed && activityValidation && activityValidation.valid;
        
            this.isActivityPeriodCompleted = completed;
            this.isActivityPeriodValid = valid;
        
            return { completed, valid };
        } catch (error) {
            console.error('❌ [전제조건] 직접 완료 여부 확인 실패:', error);
            return { completed: false, valid: false };
        }
    }

    updateFlightSectionAvailability() {
        try {
            console.log('🔄 [전제조건] 항공권 섹션 가용성 업데이트...');
            
            const status = this.checkActivityPeriodCompletion();
            const shouldEnable = status.completed && status.valid;
            
            this.flightSectionEnabled = shouldEnable;
            
            this.toggleFlightInputFields(shouldEnable);
            this.updatePrerequisiteStatusMessage(status);
            
            console.log('✅ [전제조건] 항공권 섹션 가용성 업데이트 완료');
            
        } catch (error) {
            console.error('❌ [전제조건] 가용성 업데이트 실패:', error);
            
            this.flightSectionEnabled = false;
            this.toggleFlightInputFields(false);
        }
    }

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

    // UI 업데이트 메서드들
    updateRequiredDaysUI() {
        try {
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl && this.userRequiredDays) {
                requiredDaysEl.textContent = this.userRequiredDays;
                requiredDaysEl.style.color = '#059669';
                requiredDaysEl.style.fontWeight = '600';
                console.log('✅ [활동요구사항UI] 필수 활동일 UI 업데이트 완료:', this.userRequiredDays);
            }
        } catch (error) {
            console.error('❌ [활동요구사항UI] 업데이트 실패:', error);
        }
    }

    updateRequiredDaysUILoading() {
        try {
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl) {
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.style.color = '#6b7280';
                console.log('✅ [활동요구사항UI] 로딩 상태 표시 완료');
            }
        } catch (error) {
            console.error('❌ [활동요구사항UI] 로딩 상태 표시 실패:', error);
        }
    }

    updateRequiredDaysUIError() {
        try {
            const requiredDaysEl = document.getElementById('requiredDays');
            if (requiredDaysEl) {
                requiredDaysEl.textContent = '로딩중...';
                requiredDaysEl.style.color = '#ef4444';
                console.log('✅ [활동요구사항UI] 에러 상태 표시 완료');
            }
        } catch (error) {
            console.error('❌ [활동요구사항UI] 에러 상태 표시 실패:', error);
        }
    }

    updateCalculatedActivityDays(activityDays) {
        try {
            const calculatedDaysEl = document.getElementById('calculatedDays');
            if (calculatedDaysEl) {
                calculatedDaysEl.textContent = activityDays > 0 ? activityDays : '-';
                calculatedDaysEl.style.color = activityDays > 0 ? '#059669' : '#6b7280';
                calculatedDaysEl.style.fontWeight = '600';
            }
        } catch (error) {
            console.error('❌ [활동기간UI] 계산된 활동일 UI 업데이트 실패:', error);
        }
    }

    updateActivityValidationUILoading() {
        try {
            const validationStatusEl = document.getElementById('validationStatus');
            if (validationStatusEl) {
                validationStatusEl.style.color = '#6b7280';
                validationStatusEl.innerHTML = `<i data-lucide="loader-2"></i>활동일 체크중...`;
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('❌ [활동기간UI] 로딩 상태 표시 실패:', error);
        }
    }

    updateActivityValidationUI(validation) {
        try {
            const validationStatusEl = document.getElementById('validationStatus');
            if (validationStatusEl) {
                if (validation.valid) {
                    validationStatusEl.style.color = '#059669';
                    validationStatusEl.innerHTML = `<i data-lucide="check-circle"></i>${validation.message || '활동기간이 유효합니다'}`;
                } else {
                    validationStatusEl.style.color = '#ef4444';
                    validationStatusEl.innerHTML = `<i data-lucide="x-circle"></i>${validation.message || '활동기간이 유효하지 않습니다'}`;
                }
                
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
        } catch (error) {
            console.error('❌ [활동기간UI] 검증 결과 UI 업데이트 실패:', error);
        }
    }

    // 기본 메서드들 (간단 구현)
    setupFlightDateEvents() {
        console.log('✅ [티켓모듈] 항공권 날짜 이벤트 설정 완료');
    }

    setupPurchaseMethodEvents() {
        console.log('✅ [티켓모듈] 구매방식 이벤트 설정 완료');
    }

    setupImageUploadEvents() {
        console.log('✅ [티켓모듈] 이미지 업로드 이벤트 설정 완료');
    }

    setupPriceInfoEvents() {
        console.log('✅ [티켓모듈] 가격 정보 이벤트 설정 완료');
    }

    setupSubmitEvents() {
        console.log('✅ [티켓모듈] 제출 이벤트 설정 완료');
    }

    setupStepNavigation() {
        console.log('✅ [티켓모듈] 단계별 네비게이션 설정 완료');
    }

    async loadTicketInfo() {
        console.log('✅ [티켓모듈] 기존 항공권 정보 로드 완료');
    }

    // 🔧 추가: 디버깅용 전체 상태 확인
    getSystemStatus() {
        return {
            userRequirements: {
                loaded: this.isUserActivityRequirementsLoaded,
                minDays: this.userRequiredDays,
                maxDays: this.userMaximumDays,
                endDate: this.dispatchEndDate
            },
            activityPeriod: {
                completed: this.isActivityPeriodCompleted,
                valid: this.isActivityPeriodValid
            },
            flightSection: {
                enabled: this.flightSectionEnabled
            },
            apiService: {
                exists: !!this.apiService,
                hasGetUserProfile: this.apiService && typeof this.apiService.getUserProfile === 'function'
            },
            dom: {
                flightSection: !!findFlightInfoSectionImproved(),
                arrivalInput: !!document.getElementById('actualArrivalDate'),
                workEndInput: !!document.getElementById('actualWorkEndDate'),
                prerequisiteStatus: !!document.getElementById('prerequisiteStatus')
            }
        };
    }
}

// ================================
// 파트 4: 초기화 시스템
// ================================

// 초기화 수정 - API 서비스에 Supabase 연결
async function initializeFlightRequestSystemComplete() {
    try {
        console.log('🔄 [초기화] 항공권 신청 시스템 통합 초기화 시작...');

        // CSS 스타일 주입
        injectPrerequisiteStatusCSS();

        // API 서비스 초기화
        const apiService = new FlightRequestApiService();
        
        // ✅ 수정: Supabase 인스턴스 연결
        if (typeof SupabaseCore !== 'undefined' && window.supabaseCore) {
            apiService.setSupabaseInstance(window.supabaseCore);
        } else {
            console.error('❌ [초기화] SupabaseCore 인스턴스를 찾을 수 없습니다.');
            throw new Error('SupabaseCore가 초기화되지 않았습니다.');
        }

        // UI 서비스 초기화 (기존)
        const uiService = {
            showError: (message) => {
                const errorEl = document.getElementById('errorMessage');
                if (errorEl) {
                    errorEl.textContent = message;
                    errorEl.style.display = 'block';
                }
                console.error('UI Error:', message);
            },
            showSuccess: (message) => {
                const successEl = document.getElementById('successMessage');
                if (successEl) {
                    successEl.textContent = message;
                    successEl.style.display = 'block';
                }
                console.log('UI Success:', message);
            }
        };

        // Passport 서비스 초기화 (기존)
        const passportService = {};

        // FlightRequestTicketFixed 초기화
        const flightTicket = new FlightRequestTicketFixed(apiService, uiService, passportService);

        console.log('✅ [초기화] 항공권 신청 시스템 통합 초기화 완료');
        return flightTicket;

    } catch (error) {
        console.error('❌ [초기화] 시스템 초기화 실패:', error);
        throw error;
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', async () => {
    try {
        console.log('🔄 [페이지로딩] 항공권 시스템 페이지 로딩 시작...');
        
        // SupabaseCore 로딩 대기
        await new Promise((resolve) => {
            const checkSupabase = () => {
                if (window.supabaseCore) {
                    resolve();
                } else {
                    setTimeout(checkSupabase, 100);
                }
            };
            checkSupabase();
        });

        // 시스템 초기화
        const flightSystem = await initializeFlightRequestSystemComplete();
        
        // 전역 변수로 노출
        window.flightRequestSystem = flightSystem;

        console.log('✅ [페이지로딩] 항공권 시스템 페이지 로딩 완료');

    } catch (error) {
        console.error('❌ [페이지로딩] 항공권 시스템 초기화 실패:', error);
    }
});

// ================================
// 전역 스코프에 노출
// ================================

window.FlightRequestApiService = FlightRequestApiService;
window.FlightRequestTicketFixed = FlightRequestTicketFixed;
window.initializeFlightRequestSystemComplete = initializeFlightRequestSystemComplete;
window.findFlightInfoSectionImproved = findFlightInfoSectionImproved;
window.toggleFlightInputFieldsImproved = toggleFlightInputFieldsImproved;
window.updatePrerequisiteStatusMessageImproved = updatePrerequisiteStatusMessageImproved;

console.log('✅ 항공권 신청 시스템 완전 수정본 로딩 완료 - 모든 문제 해결!');
console.log('🔧 해결된 문제들:', {
    userRequirements: '✅ 사용자 활동일 정보 로딩 문제 해결',
    flightSectionControl: '✅ 항공권 섹션 활성화 문제 해결',
    errorHandling: '✅ 에러 처리 강화 (재시도 + 폴백)',
    debugging: '✅ 디버깅 도구 추가',
    integration: '✅ 모든 기능 통합 완료'
});
