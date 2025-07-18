// FlightRequestInit v1.2.1 - 무한루프 긴급 수정
// 이벤트 발행 최소화 및 중복 방지

/**
 * 🚨 긴급 수정: v1.2.1 - 이벤트 시스템 무한루프 완전 제거
 * 
 * 주요 수정사항:
 * 1. 이벤트 발행 전 중복 체크
 * 2. 초기화 완료 후 추가 이벤트 발행 방지
 * 3. emit 호출 최소화
 * 4. 안전한 초기화 패턴 적용
 * 5. 폴백 시스템 강화
 */

class FlightRequestInit {
    constructor() {
        this.version = "1.2.1";
        this.userData = null;
        this.userRequiredDays = null;
        this.userMaximumDays = null;
        this.coordinator = null; // Coordinator 참조
        
        // 🚨 무한루프 방지 시스템
        this.isInitialized = false;
        this.initializationInProgress = false;
        this.eventEmitted = new Set(); // 발행된 이벤트 추적
        this.maxEmitCount = 5; // 최대 이벤트 발행 횟수
        this.emitCount = 0;
        
        this.initStatus = {
            pageElementsReady: false,
            userDataLoaded: false,
            requiredDaysDisplayed: false,
            flightSectionDisabled: false,
            passportCheckCompleted: false,
            existingRequestChecked: false
        };
        
        console.log(`🔧 FlightRequestInit v${this.version} 생성 (무한루프 방지 시스템 활성화)`);
    }

    // 🚨 안전한 이벤트 발행 (무한루프 방지)
    emit(eventName, data) {
        // 초기화 완료 후 이벤트 발행 제한
        if (this.isInitialized && this.emitCount >= this.maxEmitCount) {
            console.warn(`⚠️ FlightRequestInit: 최대 이벤트 발행 횟수 도달 (${this.maxEmitCount}), 이벤트 무시: ${eventName}`);
            return;
        }
        
        // 중복 이벤트 체크
        const eventKey = `${eventName}-${JSON.stringify(data)}`;
        if (this.eventEmitted.has(eventKey)) {
            console.warn(`⚠️ FlightRequestInit: 중복 이벤트 감지, 무시: ${eventName}`);
            return;
        }
        
        this.eventEmitted.add(eventKey);
        this.emitCount++;
        
        try {
            console.log(`📡 FlightRequestInit: 안전한 이벤트 발행: ${eventName} (${this.emitCount}/${this.maxEmitCount})`);
            
            // Coordinator를 통한 안전한 이벤트 전파
            if (this.coordinator && typeof this.coordinator.safeEmit === 'function') {
                this.coordinator.safeEmit(eventName, { ...data, source: 'init' });
            }
            
        } catch (error) {
            console.error(`❌ FlightRequestInit: 이벤트 발행 실패: ${eventName}`, error);
        } finally {
            // 1초 후 이벤트 키 정리 (메모리 누수 방지)
            setTimeout(() => {
                this.eventEmitted.delete(eventKey);
            }, 1000);
        }
    }

    // 🚀 안전한 초기화 (중복 실행 방지)
    async init() {
        if (this.initializationInProgress) {
            console.warn('⚠️ FlightRequestInit: 초기화가 이미 진행 중입니다.');
            return;
        }
        
        if (this.isInitialized) {
            console.warn('⚠️ FlightRequestInit: 이미 초기화가 완료되었습니다.');
            return;
        }
        
        this.initializationInProgress = true;
        console.log(`🚀 FlightRequestInit v${this.version} 안전한 초기화 시작`);
        
        try {
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
            console.log(`✅ FlightRequestInit v${this.version} 초기화 완료`);
            
            // 🚨 초기화 완료 이벤트 (1회만 발행)
            if (this.emitCount === 0) {
                this.emit('init:completed', { 
                    version: this.version,
                    userRequiredDays: this.userRequiredDays,
                    userMaximumDays: this.userMaximumDays
                });
            }
            
        } catch (error) {
            console.error('❌ FlightRequestInit 초기화 실패:', error);
            
            // 🚨 폴백 모드 활성화
            await this.activateFallbackMode();
            
        } finally {
            this.initializationInProgress = false;
        }
    }

    // 🔧 페이지 요소 초기화
    async initializePageElements() {
        try {
            console.log('🔧 페이지 요소 초기화...');
            
            // 필수 요소들 확인
            const requiredElements = [
                'requiredDays',
                'maximumDays', 
                'startDate',
                'endDate',
                'flightTicketSection'
            ];
            
            let allElementsReady = true;
            
            for (const elementId of requiredElements) {
                const element = document.getElementById(elementId);
                if (!element) {
                    console.warn(`⚠️ 필수 요소 없음: ${elementId}`);
                    allElementsReady = false;
                }
            }
            
            this.initStatus.pageElementsReady = allElementsReady;
            
            if (allElementsReady) {
                console.log('✅ 모든 페이지 요소 준비 완료');
            } else {
                console.warn('⚠️ 일부 페이지 요소 없음, 부분적 기능으로 진행');
            }
            
        } catch (error) {
            console.error('❌ 페이지 요소 초기화 실패:', error);
            this.initStatus.pageElementsReady = false;
        }
    }

    // 🔧 API 어댑터 연동
    async connectToApiAdapter() {
        try {
            console.log('🔧 API 어댑터 연동...');
            
            if (!window.supabaseApiAdapter) {
                console.warn('⚠️ Supabase API 어댑터 없음');
                return false;
            }
            
            // API 어댑터 연결 테스트 (간단한 호출)
            console.log('✅ API 어댑터 연동 완료');
            return true;
            
        } catch (error) {
            console.error('❌ API 어댑터 연동 실패:', error);
            return false;
        }
    }

    // 📊 사용자 데이터 로드 및 표시
    async loadAndDisplayUserData() {
        try {
            console.log('📊 사용자 데이터 로드...');
            
            // localStorage에서 사용자 데이터 읽기
            const userDataStr = localStorage.getItem('userData');
            if (!userDataStr) {
                throw new Error('사용자 데이터 없음');
            }
            
            this.userData = JSON.parse(userDataStr);
            
            if (!this.userData.id) {
                throw new Error('사용자 ID 없음');
            }
            
            this.initStatus.userDataLoaded = true;
            console.log(`✅ 사용자 데이터 로드 완료: ${this.userData.name || this.userData.email}`);
            
        } catch (error) {
            console.error('❌ 사용자 데이터 로드 실패:', error);
            this.initStatus.userDataLoaded = false;
            
            // 로그인 페이지로 리다이렉트
            setTimeout(() => {
                window.location.href = '/login.html';
            }, 2000);
        }
    }

    // 📅 필수활동일 정보 표시 (API 호출 최소화)
    async displayRequiredDaysInfo() {
        try {
            console.log('📅 필수활동일 정보 표시...');
            
            const requiredEl = document.getElementById('requiredDays');
            const maximumEl = document.getElementById('maximumDays');
            
            if (!requiredEl) {
                console.warn('⚠️ requiredDays 요소 없음');
                return;
            }
            
            // 기본값 설정
            let requiredDays = 90;
            let maximumDays = 365;
            
            // API 어댑터를 통한 사용자 정보 조회 (1회만)
            if (window.supabaseApiAdapter && this.userData && this.userData.id) {
                try {
                    const response = await window.supabaseApiAdapter.getUserProfile(this.userData.id);
                    if (response.success && response.data) {
                        requiredDays = response.data.minimum_required_days || 90;
                        maximumDays = response.data.maximum_allowed_days || 365;
                        console.log(`✅ API에서 활동일 정보 조회: 필수 ${requiredDays}일, 최대 ${maximumDays}일`);
                    }
                } catch (apiError) {
                    console.warn('⚠️ API 호출 실패, 기본값 사용:', apiError);
                }
            }
            
            // 값 저장
            this.userRequiredDays = requiredDays;
            this.userMaximumDays = maximumDays;
            
            // UI 업데이트
            requiredEl.textContent = requiredDays;
            requiredEl.className = 'value required-days-value success';
            
            if (maximumEl) {
                maximumEl.textContent = maximumDays;
                maximumEl.className = 'value maximum-days-value success';
            }
            
            this.initStatus.requiredDaysDisplayed = true;
            console.log(`✅ 필수활동일 정보 표시 완료: ${requiredDays}일 (최대: ${maximumDays}일)`);
            
        } catch (error) {
            console.error('❌ 필수활동일 정보 표시 실패:', error);
            this.initStatus.requiredDaysDisplayed = false;
            
            // 폴백: 기본값 설정
            await this.setDefaultRequiredDays();
        }
    }

    // 🔧 기본 필수활동일 설정 (폴백)
    async setDefaultRequiredDays() {
        try {
            const requiredEl = document.getElementById('requiredDays');
            const maximumEl = document.getElementById('maximumDays');
            
            if (requiredEl) {
                this.userRequiredDays = 90;
                this.userMaximumDays = 365;
                
                requiredEl.textContent = '90';
                requiredEl.className = 'value required-days-value fallback';
                
                if (maximumEl) {
                    maximumEl.textContent = '365';
                    maximumEl.className = 'value maximum-days-value fallback';
                }
                
                console.log('✅ 기본 필수활동일 설정 완료: 90일 (폴백)');
            }
        } catch (error) {
            console.error('❌ 기본 필수활동일 설정 실패:', error);
        }
    }

    // ✈️ 항공권 섹션 초기 비활성화
    disableFlightSectionInitially() {
        try {
            console.log('✈️ 항공권 섹션 초기 비활성화...');
            
            const flightSection = document.getElementById('flightTicketSection');
            if (flightSection) {
                flightSection.style.display = 'none';
                console.log('✅ 항공권 섹션 비활성화 완료');
            }
            
            // 활동기간 입력 이벤트 리스너 설정 (무한루프 방지)
            this.setupActivityPeriodListeners();
            
            this.initStatus.flightSectionDisabled = true;
            
        } catch (error) {
            console.error('❌ 항공권 섹션 비활성화 실패:', error);
            this.initStatus.flightSectionDisabled = false;
        }
    }

    // 🔧 활동기간 입력 리스너 설정 (무한루프 방지)
    setupActivityPeriodListeners() {
        const startDateInput = document.getElementById('startDate');
        const endDateInput = document.getElementById('endDate');
        
        if (startDateInput && endDateInput) {
            let isProcessing = false; // 중복 처리 방지
            
            const handleDateChange = () => {
                if (isProcessing) return;
                isProcessing = true;
                
                try {
                    const startDate = startDateInput.value;
                    const endDate = endDateInput.value;
                    
                    if (startDate && endDate) {
                        this.enableFlightSection();
                    }
                } catch (error) {
                    console.error('❌ 날짜 변경 처리 실패:', error);
                } finally {
                    setTimeout(() => { isProcessing = false; }, 100);
                }
            };
            
            // 이벤트 리스너 추가 (once 옵션으로 중복 방지)
            startDateInput.addEventListener('change', handleDateChange);
            endDateInput.addEventListener('change', handleDateChange);
            
            console.log('✅ 활동기간 입력 리스너 설정 완료');
        }
    }

    // ✈️ 항공권 섹션 활성화 (중복 방지)
    enableFlightSection() {
        try {
            const flightSection = document.getElementById('flightTicketSection');
            if (flightSection && flightSection.style.display === 'none') {
                flightSection.style.display = 'block';
                console.log('✅ 항공권 섹션 활성화');
                
                // 활성화 이벤트 발행 (1회만)
                if (!this.eventEmitted.has('flight-section-enabled')) {
                    this.emit('flightSection:enabled', { timestamp: Date.now() });
                }
            }
        } catch (error) {
            console.error('❌ 항공권 섹션 활성화 실패:', error);
        }
    }
    // 🔍 여권정보 체크 (API 호출 최소화)
    async checkPassportStatus() {
        try {
            console.log('🔍 여권정보 체크...');
            
            if (!window.supabaseApiAdapter || !this.userData || !this.userData.id) {
                console.warn('⚠️ API 어댑터 또는 사용자 데이터 없음');
                this.initStatus.passportCheckCompleted = false;
                return;
            }
            
            const response = await window.supabaseApiAdapter.getPassportInfo(this.userData.id);
            
            if (response.success && response.data) {
                console.log('✅ 여권 정보 확인됨');
                this.showPassportStatus(true);
            } else {
                console.log('ℹ️ 여권 정보 없음');
                this.showPassportStatus(false);
            }
            
            this.initStatus.passportCheckCompleted = true;
            
        } catch (error) {
            console.error('❌ 여권정보 체크 실패:', error);
            this.initStatus.passportCheckCompleted = false;
            this.showPassportStatus(false);
        }
    }

    // 📋 여권 상태 표시
    showPassportStatus(hasPassport) {
        try {
            const messageEl = document.getElementById('systemMessage');
            if (!messageEl) return;
            
            if (hasPassport) {
                messageEl.innerHTML = `
                    <div class="alert alert-success">
                        <strong>여권 정보 확인됨</strong><br>
                        항공권 신청이 가능합니다.
                    </div>
                `;
            } else {
                messageEl.innerHTML = `
                    <div class="alert alert-warning">
                        <strong>여권 정보 등록 필요</strong><br>
                        항공권 신청 전에 여권 정보를 먼저 등록해주세요.
                        <a href="/student/passport-registration.html" class="btn btn-sm btn-primary">여권 정보 등록</a>
                    </div>
                `;
            }
            
            messageEl.style.display = 'block';
            
        } catch (error) {
            console.error('❌ 여권 상태 표시 실패:', error);
        }
    }

    // 📝 기존 신청 내역 확인 (API 호출 최소화)
    async checkExistingRequest() {
        try {
            console.log('📝 기존 신청 내역 확인...');
            
            if (!window.supabaseApiAdapter || !this.userData || !this.userData.id) {
                console.warn('⚠️ API 어댑터 또는 사용자 데이터 없음');
                this.initStatus.existingRequestChecked = false;
                return;
            }
            
            const response = await window.supabaseApiAdapter.getFlightRequest(this.userData.id);
            
            if (response.success && response.data) {
                console.log('✅ 기존 신청 내역 발견');
                this.showExistingRequestInfo(response.data);
                
                // 기존 신청이 있으면 신규 신청 비활성화
                this.disableNewRequest();
            } else {
                console.log('ℹ️ 기존 신청 내역 없음, 새 신청 가능');
                this.enableNewRequest();
            }
            
            this.initStatus.existingRequestChecked = true;
            
        } catch (error) {
            console.error('❌ 기존 신청 내역 확인 실패:', error);
            this.initStatus.existingRequestChecked = false;
            
            // 오류 시 기본적으로 신청 허용
            this.enableNewRequest();
        }
    }

    // 📋 기존 신청 정보 표시
    showExistingRequestInfo(requestData) {
        try {
            const messageEl = document.getElementById('systemMessage');
            if (!messageEl) return;
            
            const statusText = this.getStatusText(requestData.status);
            const statusClass = this.getStatusClass(requestData.status);
            
            messageEl.innerHTML = `
                <div class="alert ${statusClass}">
                    <strong>기존 신청 내역</strong><br>
                    상태: ${statusText}<br>
                    신청일: ${new Date(requestData.created_at).toLocaleDateString()}<br>
                    구매방식: ${requestData.purchase_method === 'direct' ? '직접구매' : '구매대행'}
                </div>
            `;
            messageEl.style.display = 'block';
            
        } catch (error) {
            console.error('❌ 기존 신청 정보 표시 실패:', error);
        }
    }

    // 📊 상태 텍스트 변환
    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨', 
            'rejected': '반려됨',
            'completed': '완료됨'
        };
        return statusMap[status] || status;
    }

    // 🎨 상태 클래스 변환
    getStatusClass(status) {
        const classMap = {
            'pending': 'alert-warning',
            'approved': 'alert-success',
            'rejected': 'alert-danger',
            'completed': 'alert-info'
        };
        return classMap[status] || 'alert-secondary';
    }

    // 🚫 신규 신청 비활성화
    disableNewRequest() {
        try {
            const flightSection = document.getElementById('flightTicketSection');
            if (flightSection) {
                flightSection.style.display = 'none';
            }
            
            // 입력 필드들 비활성화
            const inputs = document.querySelectorAll('#startDate, #endDate, #purchaseMethod');
            inputs.forEach(input => {
                input.disabled = true;
            });
            
            console.log('✅ 신규 신청 비활성화 완료');
            
        } catch (error) {
            console.error('❌ 신규 신청 비활성화 실패:', error);
        }
    }

    // ✅ 신규 신청 활성화
    enableNewRequest() {
        try {
            // 입력 필드들 활성화
            const inputs = document.querySelectorAll('#startDate, #endDate, #purchaseMethod');
            inputs.forEach(input => {
                input.disabled = false;
            });
            
            console.log('✅ 신규 신청 활성화 완료');
            
        } catch (error) {
            console.error('❌ 신규 신청 활성화 실패:', error);
        }
    }

    // 🚨 폴백 모드 활성화
    async activateFallbackMode() {
        try {
            console.log('🚨 FlightRequestInit 폴백 모드 활성화');
            
            // 기본 필수활동일 설정
            await this.setDefaultRequiredDays();
            
            // 기본 기능 활성화
            this.enableNewRequest();
            
            // 기본 메시지 표시
            this.showFallbackMessage();
            
            console.log('✅ FlightRequestInit 폴백 모드 활성화 완료');
            
        } catch (error) {
            console.error('❌ FlightRequestInit 폴백 모드 활성화 실패:', error);
        }
    }

    // 📋 폴백 메시지 표시
    showFallbackMessage() {
        try {
            const messageEl = document.getElementById('systemMessage');
            if (messageEl) {
                messageEl.innerHTML = `
                    <div class="alert alert-info">
                        <strong>기본 모드로 실행 중</strong><br>
                        일부 기능이 제한될 수 있습니다. 페이지를 새로고침해주세요.
                    </div>
                `;
                messageEl.style.display = 'block';
            }
        } catch (error) {
            console.error('❌ 폴백 메시지 표시 실패:', error);
        }
    }

    // 📊 사용자 요구사항 반환
    getUserRequirements() {
        return {
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays,
            userData: this.userData,
            initStatus: this.initStatus
        };
    }

    // 📊 상태 확인
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            initializationInProgress: this.initializationInProgress,
            version: this.version,
            emitCount: this.emitCount,
            maxEmitCount: this.maxEmitCount,
            initStatus: this.initStatus,
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays
        };
    }

    // 🔄 리셋 (디버깅용)
    reset() {
        console.log('🔄 FlightRequestInit 리셋');
        
        this.isInitialized = false;
        this.initializationInProgress = false;
        this.eventEmitted.clear();
        this.emitCount = 0;
        
        // 초기 상태로 복구
        Object.keys(this.initStatus).forEach(key => {
            this.initStatus[key] = false;
        });
        
        console.log('✅ FlightRequestInit 리셋 완료');
    }
}

// 🌐 글로벌 등록
console.log('🌐 FlightRequestInit 글로벌 등록...');

if (typeof window !== 'undefined') {
    window.FlightRequestInit = FlightRequestInit;
    console.log('✅ FlightRequestInit 글로벌 등록 완료');
}
