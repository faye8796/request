// flight-request-init.js - 항공권 신청 페이지 초기화 전용 모듈 v1.0.0
// 🎯 핵심 책임:
//   1. 항공권 신청 페이지의 초기 세팅
//   2. api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시
//   3. 항공권 정보 입력 페이지의 비활성화
// 🔧 분리 목적: flight-request-ticket.js의 초기화 로직 분리로 책임 명확화

class FlightRequestInit {
    constructor() {
        console.log('🔄 [초기화] FlightRequestInit v1.0.0 생성 시작...');
        
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
        
        // UI 요소 참조
        this.pageElements = {
            userWelcome: null,
            userDetails: null,
            requiredDays: null,
            flightInfoSection: null,
            passportAlert: null,
            existingRequest: null,
            requestForm: null
        };
        
        // 초기화 상태 추적
        this.initStatus = {
            pageElementsReady: false,
            userDataLoaded: false,
            requiredDaysDisplayed: false,
            flightSectionDisabled: false,
            passportCheckCompleted: false
        };
        
        console.log('✅ [초기화] FlightRequestInit v1.0.0 생성 완료');
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
            
            // 5. 항공권 섹션 초기 비활성화
            this.disableFlightSectionInitially();
            
            // 6. 여권정보 체크
            await this.checkPassportStatus();
            
            // 7. 기존 신청 내역 확인
            await this.checkExistingRequest();
            
            this.isInitialized = true;
            console.log('✅ [초기화] 모든 초기화 완료');
            
            return true;
            
        } catch (error) {
            console.error('❌ [초기화] 초기화 실패:', error);
            return false;
        }
    }

    // === 1. 페이지 요소 초기화 ===
    async initializePageElements() {
        try {
            console.log('🔄 [초기화] 페이지 요소 초기화...');
            
            this.pageElements = {
                userWelcome: document.getElementById('userWelcome'),
                userDetails: document.getElementById('userDetails'),
                requiredDays: document.getElementById('requiredDays'),
                flightInfoSection: document.getElementById('flightInfoSection'),
                passportAlert: document.getElementById('passportAlert'),
                existingRequest: document.getElementById('existingRequest'),
                requestForm: document.getElementById('requestForm'),
                calculatedDays: document.getElementById('calculatedDays'),
                validationStatus: document.getElementById('validationStatus')
            };
            
            // 필수 요소 존재 확인
            const requiredElements = ['userWelcome', 'userDetails', 'requiredDays', 'flightInfoSection'];
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

    // === 2. API 어댑터 연동 ===
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

    // === 3. 사용자 데이터 로드 및 표시 ===
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
            } else {
                console.warn('⚠️ [초기화] 사용자 데이터를 찾을 수 없음');
            }
            
        } catch (error) {
            console.error('❌ [초기화] 사용자 데이터 로드 실패:', error);
        }
    }

    // === 4. 페이지 헤더 업데이트 ===
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

    // === 5. 필수활동일 정보 표시 ===
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

    // === 6. 항공권 섹션 초기 비활성화 ===
    disableFlightSectionInitially() {
        try {
            console.log('🔄 [초기화] 항공권 섹션 초기 비활성화...');
            
            const flightSection = this.pageElements.flightInfoSection;
            if (flightSection) {
                // 비활성화 클래스 추가
                flightSection.classList.add('flight-section-disabled');
                flightSection.classList.remove('flight-section-enabled');
                
                console.log('✅ [초기화] 항공권 섹션 초기 비활성화 완료');
            } else {
                console.warn('⚠️ [초기화] flightInfoSection 요소를 찾을 수 없음');
            }
            
            // 전제조건 상태 메시지 생성
            this.createPrerequisiteStatusMessage();
            
            this.initStatus.flightSectionDisabled = true;
            
        } catch (error) {
            console.error('❌ [초기화] 항공권 섹션 비활성화 실패:', error);
        }
    }

    // === 7. 전제조건 상태 메시지 생성 ===
    createPrerequisiteStatusMessage() {
        try {
            const flightSection = this.pageElements.flightInfoSection;
            if (!flightSection) return;
            
            // 기존 상태 메시지 확인
            let statusElement = document.getElementById('prerequisiteStatus') ||
                               flightSection.querySelector('.prerequisite-status');
            
            // 상태 메시지 요소가 없으면 생성
            if (!statusElement) {
                statusElement = document.createElement('div');
                statusElement.id = 'prerequisiteStatus';
                statusElement.className = 'prerequisite-status pending';
                
                // 항공권 섹션 상단에 삽입
                flightSection.insertBefore(statusElement, flightSection.firstChild);
            }
            
            // 초기 메시지 설정
            statusElement.innerHTML = `
                <i data-lucide="info"></i>
                <span>항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.</span>
            `;
            
            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ [초기화] 전제조건 상태 메시지 생성 완료');
            
        } catch (error) {
            console.error('❌ [초기화] 전제조건 상태 메시지 생성 실패:', error);
        }
    }

    // === 8. 여권정보 체크 ===
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
            
        } catch (error) {
            console.error('❌ [초기화] 여권정보 체크 실패:', error);
            
            // 에러 시 보수적으로 알림 표시
            const passportAlert = this.pageElements.passportAlert;
            if (passportAlert) {
                passportAlert.style.display = 'block';
            }
        }
    }

    // === 9. 여권정보 등록 버튼 설정 ===
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

    // === 10. 기존 신청 내역 확인 ===
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
            
        } catch (error) {
            console.error('❌ [초기화] 기존 신청 내역 확인 실패:', error);
            
            // 에러 시 기본적으로 신청 폼 표시
            const requestFormEl = this.pageElements.requestForm;
            if (requestFormEl) {
                requestFormEl.style.display = 'block';
            }
        }
    }

    // === 11. 기존 신청 내역 렌더링 ===
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

    // === 유틸리티 메서드들 ===
    
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

    // === 폴백 메서드들 ===
    
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
    
    // 디버깅 정보 반환
    getDebugInfo() {
        return {
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
            apiAdapter: !!this.apiAdapter
        };
    }
}

// 전역 스코프에 노출
window.FlightRequestInit = FlightRequestInit;

console.log('✅ FlightRequestInit v1.0.0 모듈 로드 완료');
console.log('🎯 초기화 모듈 핵심 기능:', {
    responsibility: [
        '항공권 신청 페이지의 초기 세팅',
        'api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시', 
        '항공권 정보 입력 페이지의 비활성화'
    ],
    benefits: [
        '책임 분리로 코드 명확성 향상',
        'flight-request-ticket.js 파일 크기 대폭 감소',
        '초기화 문제와 검증 문제 분리로 디버깅 용이성 확보',
        '성능 최적화 - 초기화는 한 번만, 검증은 필요시에만'
    ]
});
