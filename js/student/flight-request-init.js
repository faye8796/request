// FlightRequestInit v1.3.0 - 활동일 변경 실시간 감지 및 재검증 시스템
// 이벤트 발행 최소화 및 중복 방지

/**
 * 🚨 v1.3.0 주요 변경사항:
 * 
 * 1. 활동일 변경 실시간 감지 기능 추가
 * 2. Coordinator와 연동된 재검증 시스템
 * 3. 이벤트 기반 상태 변경 알림
 * 4. 활동일 검증 로직 추가
 */

class FlightRequestInit {
    constructor() {
        this.version = "1.3.0";
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
        
        // 🆕 v1.3.0: 활동일 관련 상태
        this.activityPeriodState = {
            actualArrivalDate: null,
            actualWorkEndDate: null,
            calculatedDays: 0,
            isValid: false,
            lastValidationResult: null,
            validationInProgress: false
        };
        
        this.initStatus = {
            pageElementsReady: false,
            userDataLoaded: false,
            requiredDaysDisplayed: false,
            flightSectionDisabled: false,
            passportCheckCompleted: false,
            existingRequestChecked: false,
            activityListenersSetup: false // 🆕 v1.3.0
        };
        
        console.log(`🔧 FlightRequestInit v${this.version} 생성 (활동일 실시간 감지 포함)`);
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
            console.log(`📡 FlightRequestInit: 안전한 이벤트 발행: ${eventName} (${this.emitCount}/${this.maxEmitCount})`, data);
            
            // Coordinator를 통한 안전한 이벤트 전파
            if (this.coordinator && typeof this.coordinator.emit === 'function') {
                this.coordinator.emit(`init:${eventName}`, { ...data, source: 'init' });
            }
            
            // 글로벌 coordinator 인스턴스를 통한 이벤트 발행 (폴백)
            if (!this.coordinator && window.flightRequestCoordinator && typeof window.flightRequestCoordinator.emit === 'function') {
                window.flightRequestCoordinator.emit(`init:${eventName}`, { ...data, source: 'init' });
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
            
            // 6. 🆕 v1.3.0: 활동일 변경 감지 리스너 설정
            this.setupActivityPeriodChangeListeners();
            
            // 7. 여권정보 체크
            await this.checkPassportStatus();
            
            // 8. 기존 신청 내역 확인
            await this.checkExistingRequest();
            
            this.isInitialized = true;
            console.log(`✅ FlightRequestInit v${this.version} 초기화 완료`);
            
            // 🚨 초기화 완료 이벤트 (1회만 발행)
            if (this.emitCount === 0) {
                this.emit('completed', { 
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
                'actualArrivalDate',  // v1.3.0: 변경
                'actualWorkEndDate',  // v1.3.0: 변경
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
            
            // window.apiEventAdapter 확인 (api-event-adapter.js가 생성하는 인스턴스)
            if (!window.apiEventAdapter && !window.supabaseApiAdapter) {
                console.warn('⚠️ API 어댑터 없음');
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
            
            // 'currentStudent' 키 사용 (api-event-adapter.js와 동일)
            const userDataStr = localStorage.getItem('currentStudent');
            if (!userDataStr) {
                console.warn('⚠️ currentStudent 키에서 데이터 없음, 이벤트 기반 로드 시도...');
                
                // 이벤트 기반 데이터 로드 시도
                if (window.moduleEventBus) {
                    return new Promise((resolve, reject) => {
                        const timeout = setTimeout(() => {
                            reject(new Error('사용자 데이터 로드 타임아웃'));
                        }, 3000);
                        
                        window.moduleEventBus.emit('request:userProfile', {
                            callback: (userData) => {
                                clearTimeout(timeout);
                                if (userData && userData.id) {
                                    this.userData = userData;
                                    this.initStatus.userDataLoaded = true;
                                    console.log(`✅ 이벤트로 사용자 데이터 로드 완료: ${userData.name || userData.email}`);
                                    resolve();
                                } else {
                                    reject(new Error('유효하지 않은 사용자 데이터'));
                                }
                            }
                        });
                    });
                }
                
                throw new Error('사용자 데이터 없음');
            }
            
            this.userData = JSON.parse(userDataStr);
            
            if (!this.userData.id) {
                throw new Error('사용자 ID 없음');
            }
            
            this.initStatus.userDataLoaded = true;
            console.log(`✅ localStorage에서 사용자 데이터 로드 완료: ${this.userData.name || this.userData.email}`);
            
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
            
            // 사용자 데이터에서 직접 가져오기 (이미 로드됨)
            if (this.userData) {
                requiredDays = this.userData.minimum_required_days || 90;
                maximumDays = this.userData.maximum_allowed_days || 365;
                console.log(`✅ 사용자 데이터에서 활동일 정보 확인: 필수 ${requiredDays}일, 최대 ${maximumDays}일`);
            }
            
            // API 어댑터를 통한 추가 확인 (선택적)
            if ((window.apiEventAdapter || window.supabaseApiAdapter) && this.userData && this.userData.id) {
                try {
                    // supabaseApiAdapter가 있으면 사용
                    if (window.supabaseApiAdapter && window.supabaseApiAdapter.getUserProfile) {
                        const response = await window.supabaseApiAdapter.getUserProfile(this.userData.id);
                        if (response.success && response.data) {
                            requiredDays = response.data.minimum_required_days || requiredDays;
                            maximumDays = response.data.maximum_allowed_days || maximumDays;
                            console.log(`✅ API에서 활동일 정보 업데이트: 필수 ${requiredDays}일, 최대 ${maximumDays}일`);
                        }
                    }
                } catch (apiError) {
                    console.warn('⚠️ API 호출 실패, 기존값 사용:', apiError);
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
            
            // 초기 상태 이벤트 발행
            this.emit('flightSectionStateChanged', {
                state: 'disabled',
                reason: 'initialization',
                message: '항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.'
            });
            
            this.initStatus.flightSectionDisabled = true;
            
        } catch (error) {
            console.error('❌ 항공권 섹션 비활성화 실패:', error);
            this.initStatus.flightSectionDisabled = false;
        }
    }

    // 🆕 v1.3.0: 활동일 변경 감지 리스너 설정
    setupActivityPeriodChangeListeners() {
        try {
            console.log('🔧 v1.3.0: 활동일 변경 감지 리스너 설정...');
            
            const arrivalDateInput = document.getElementById('actualArrivalDate');
            const workEndDateInput = document.getElementById('actualWorkEndDate');
            
            if (!arrivalDateInput || !workEndDateInput) {
                console.warn('⚠️ 활동일 입력 필드를 찾을 수 없음');
                return;
            }
            
            // 변경 핸들러
            const handleDateChange = (fieldType) => {
                console.log(`🔄 [활동일변경] ${fieldType} 필드 변경 감지`);
                
                // 즉시 변경 이벤트 발행
                this.emit('activityPeriodChanged', {
                    fieldType: fieldType,
                    arrivalDate: arrivalDateInput.value,
                    workEndDate: workEndDateInput.value,
                    timestamp: Date.now()
                });
                
                // 재검증 트리거
                this.validateActivityPeriod();
            };
            
            // 이벤트 리스너 추가
            arrivalDateInput.addEventListener('change', () => handleDateChange('arrival'));
            arrivalDateInput.addEventListener('input', () => handleDateChange('arrival'));
            
            workEndDateInput.addEventListener('change', () => handleDateChange('workEnd'));
            workEndDateInput.addEventListener('input', () => handleDateChange('workEnd'));
            
            this.initStatus.activityListenersSetup = true;
            console.log('✅ v1.3.0: 활동일 변경 감지 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ v1.3.0: 활동일 변경 감지 리스너 설정 실패:', error);
        }
    }

    // 🆕 v1.3.0: 활동일 검증
    validateActivityPeriod() {
        try {
            if (this.activityPeriodState.validationInProgress) {
                console.log('⚠️ 이미 검증이 진행 중입니다.');
                return;
            }
            
            this.activityPeriodState.validationInProgress = true;
            console.log('🔍 v1.3.0: 활동일 검증 시작...');
            
            // 재검증 시작 이벤트
            this.emit('revalidationStarted', {
                reason: 'activityPeriodChange',
                timestamp: Date.now()
            });
            
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            // 값 저장
            this.activityPeriodState.actualArrivalDate = arrivalDate;
            this.activityPeriodState.actualWorkEndDate = workEndDate;
            
            let validationResult = {
                success: false,
                reason: '',
                message: '',
                days: 0
            };
            
            if (!arrivalDate || !workEndDate) {
                validationResult.reason = 'MISSING_DATES';
                validationResult.message = '현지 도착일과 근무 종료일을 모두 입력해주세요.';
            } else {
                const start = new Date(arrivalDate);
                const end = new Date(workEndDate);
                
                if (start >= end) {
                    validationResult.reason = 'INVALID_DATE_ORDER';
                    validationResult.message = '근무 종료일은 도착일보다 늦어야 합니다.';
                } else {
                    const diffTime = Math.abs(end - start);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    
                    this.activityPeriodState.calculatedDays = diffDays;
                    validationResult.days = diffDays;
                    
                    // 필수/최대 활동일 검증
                    if (this.userRequiredDays && diffDays < this.userRequiredDays) {
                        validationResult.reason = 'INSUFFICIENT_DAYS';
                        validationResult.message = `최소 ${this.userRequiredDays}일 이상 활동해야 합니다. (현재: ${diffDays}일)`;
                    } else if (this.userMaximumDays && diffDays > this.userMaximumDays) {
                        validationResult.reason = 'EXCEEDED_DAYS';
                        validationResult.message = `최대 ${this.userMaximumDays}일까지 활동 가능합니다. (현재: ${diffDays}일)`;
                    } else {
                        validationResult.success = true;
                        validationResult.reason = 'VALID';
                        validationResult.message = '활동기간이 올바르게 설정되었습니다.';
                    }
                }
            }
            
            this.activityPeriodState.isValid = validationResult.success;
            this.activityPeriodState.lastValidationResult = validationResult;
            
            // 재검증 완료 이벤트
            this.emit('revalidationCompleted', {
                result: validationResult,
                activityDays: this.activityPeriodState.calculatedDays,
                timestamp: Date.now()
            });
            
            console.log('✅ v1.3.0: 활동일 검증 완료', validationResult);
            
        } catch (error) {
            console.error('❌ v1.3.0: 활동일 검증 실패:', error);
            
            this.emit('revalidationCompleted', {
                result: {
                    success: false,
                    reason: 'VALIDATION_ERROR',
                    message: '활동일 검증 중 오류가 발생했습니다.'
                },
                timestamp: Date.now()
            });
            
        } finally {
            this.activityPeriodState.validationInProgress = false;
        }
    }

    // 🔍 여권정보 체크 (API 호출 최소화)
    async checkPassportStatus() {
        try {
            console.log('🔍 여권정보 체크...');
            
            if ((!window.apiEventAdapter && !window.supabaseApiAdapter) || !this.userData || !this.userData.id) {
                console.warn('⚠️ API 어댑터 또는 사용자 데이터 없음');
                this.initStatus.passportCheckCompleted = false;
                return;
            }
            
            // supabaseApiAdapter 우선 사용
            if (window.supabaseApiAdapter && window.supabaseApiAdapter.getPassportInfo) {
                const response = await window.supabaseApiAdapter.getPassportInfo(this.userData.id);
                
                if (response.success && response.data) {
                    console.log('✅ 여권 정보 확인됨');
                    this.showPassportStatus(true);
                } else {
                    console.log('ℹ️ 여권 정보 없음');
                    this.showPassportStatus(false);
                }
            } else if (window.moduleEventBus) {
                // 이벤트 기반 체크
                window.moduleEventBus.emit('request:passportInfo', {
                    callback: (passportInfo) => {
                        if (passportInfo) {
                            console.log('✅ 여권 정보 확인됨 (이벤트)');
                            this.showPassportStatus(true);
                        } else {
                            console.log('ℹ️ 여권 정보 없음 (이벤트)');
                            this.showPassportStatus(false);
                        }
                    }
                });
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
            
            if ((!window.apiEventAdapter && !window.supabaseApiAdapter) || !this.userData || !this.userData.id) {
                console.warn('⚠️ API 어댑터 또는 사용자 데이터 없음');
                this.initStatus.existingRequestChecked = false;
                return;
            }
            
            // supabaseApiAdapter 우선 사용
            if (window.supabaseApiAdapter && window.supabaseApiAdapter.getFlightRequest) {
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
            } else if (window.moduleEventBus) {
                // 이벤트 기반 체크
                window.moduleEventBus.emit('request:existingRequest', {
                    callback: (existingRequest) => {
                        if (existingRequest) {
                            console.log('✅ 기존 신청 내역 발견 (이벤트)');
                            this.showExistingRequestInfo(existingRequest);
                            this.disableNewRequest();
                        } else {
                            console.log('ℹ️ 기존 신청 내역 없음 (이벤트)');
                            this.enableNewRequest();
                        }
                    }
                });
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
            const inputs = document.querySelectorAll('#actualArrivalDate, #actualWorkEndDate, #purchaseMethod');
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
            const inputs = document.querySelectorAll('#actualArrivalDate, #actualWorkEndDate, #purchaseMethod');
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

    // 🆕 v1.3.0: 재검증 관련 메서드들
    getRevalidationStatus() {
        return {
            listenersSetup: this.initStatus.activityListenersSetup,
            isValidationInProgress: this.activityPeriodState.validationInProgress,
            lastValidationState: {
                result: this.activityPeriodState.lastValidationResult,
                isValid: this.activityPeriodState.isValid,
                calculatedDays: this.activityPeriodState.calculatedDays
            }
        };
    }

    async triggerManualRevalidation() {
        console.log('🔄 v1.3.0: 수동 재검증 트리거');
        this.validateActivityPeriod();
        return true;
    }

    // 📊 사용자 요구사항 반환
    getUserRequirements() {
        return {
            userRequiredDays: this.userRequiredDays,
            userMaximumDays: this.userMaximumDays,
            userData: this.userData,
            initStatus: this.initStatus,
            activityPeriodState: this.activityPeriodState // v1.3.0 추가
        };
    }

    // 📊 초기화 상태 반환 (HTML에서 호출하는 메서드)
    getInitStatus() {
        return this.initStatus;
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
            userMaximumDays: this.userMaximumDays,
            activityPeriodState: this.activityPeriodState // v1.3.0 추가
        };
    }

    // 사용자 데이터 반환
    getUserData() {
        return this.userData;
    }

    // Coordinator 설정
    setCoordinator(coordinator) {
        this.coordinator = coordinator;
        console.log('✅ v1.3.0: Coordinator 연결 완료');
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
        
        // 활동일 상태 리셋
        this.activityPeriodState = {
            actualArrivalDate: null,
            actualWorkEndDate: null,
            calculatedDays: 0,
            isValid: false,
            lastValidationResult: null,
            validationInProgress: false
        };
        
        console.log('✅ FlightRequestInit 리셋 완료');
    }

    // 정리
    destroy() {
        console.log('🗑️ FlightRequestInit v1.3.0 정리');
        
        this.reset();
        this.coordinator = null;
        
        // 이벤트 리스너 제거 필요시 추가
    }
}

// 🌐 글로벌 등록
console.log('🌐 FlightRequestInit v1.3.0 글로벌 등록...');

if (typeof window !== 'undefined') {
    window.FlightRequestInit = FlightRequestInit;
    console.log('✅ FlightRequestInit v1.3.0 글로벌 등록 완료');
}
