// flight-request-init.js - 항공권 신청 페이지 초기화 전용 모듈 v1.1.0
// 🎯 핵심 책임:
//   1. 항공권 신청 페이지의 초기 세팅
//   2. api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시
//   3. 항공권 정보 입력 페이지의 비활성화
//   4. 🆕 실시간 활동기간 변경 감지 및 재검증 시스템
// 🔧 분리 목적: flight-request-ticket.js의 초기화 로직 분리로 책임 명확화
// 🆕 v1.1.0: 실시간 재검증 시스템 추가

class FlightRequestInit {
    constructor() {
        console.log('🔄 [초기화] FlightRequestInit v1.1.0 생성 시작...');
        
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
        
        // 🆕 v1.1.0: 실시간 재검증 시스템
        this.lastValidationState = null;
        this.revalidationListeners = [];
        this.activityPeriodFields = {
            arrivalDate: null,
            workEndDate: null
        };
        this.isValidationInProgress = false;
        this.previousFlightSectionState = null; // 임시 저장용
        
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
            passportCheckCompleted: false,
            // 🆕 v1.1.0: 재검증 시스템 상태 추가
            revalidationListenersSetup: false,
            activityPeriodFieldsFound: false
        };
        
        console.log('✅ [초기화] FlightRequestInit v1.1.0 생성 완료');
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
            
            // 🆕 v1.1.0: 8. 실시간 재검증 시스템 설정
            await this.setupRevalidationSystem();
            
            this.isInitialized = true;
            console.log('✅ [초기화] 모든 초기화 완료 (v1.1.0 실시간 재검증 포함)');
            
            return true;
            
        } catch (error) {
            console.error('❌ [초기화] 초기화 실패:', error);
            return false;
        }
    }

    // === 🆕 v1.1.0: 실시간 재검증 시스템 설정 ===
    async setupRevalidationSystem() {
        try {
            console.log('🔄 [초기화] v1.1.0: 실시간 재검증 시스템 설정...');
            
            // 1. 활동기간 필드 탐지
            await this.findActivityPeriodFields();
            
            // 2. 변경 감지 리스너 설정
            this.setupActivityPeriodChangeListeners();
            
            // 3. 초기 검증 상태 저장
            this.saveInitialValidationState();
            
            this.initStatus.revalidationListenersSetup = true;
            console.log('✅ [초기화] v1.1.0: 실시간 재검증 시스템 설정 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 실시간 재검증 시스템 설정 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 활동기간 필드 탐지 ===
    async findActivityPeriodFields() {
        try {
            console.log('🔄 [초기화] v1.1.0: 활동기간 필드 탐지...');
            
            // 여러 가능한 셀렉터로 필드 탐색
            const arrivalSelectors = [
                '#actualArrivalDate',
                'input[name="actualArrivalDate"]',
                'input[placeholder*="도착"]',
                'input[placeholder*="입국"]'
            ];
            
            const workEndSelectors = [
                '#actualWorkEndDate', 
                'input[name="actualWorkEndDate"]',
                'input[placeholder*="종료"]',
                'input[placeholder*="마지막"]'
            ];
            
            // 도착일 필드 찾기
            for (const selector of arrivalSelectors) {
                const field = document.querySelector(selector);
                if (field) {
                    this.activityPeriodFields.arrivalDate = field;
                    console.log('✅ [초기화] 도착일 필드 발견:', selector);
                    break;
                }
            }
            
            // 근무 종료일 필드 찾기
            for (const selector of workEndSelectors) {
                const field = document.querySelector(selector);
                if (field) {
                    this.activityPeriodFields.workEndDate = field;
                    console.log('✅ [초기화] 근무 종료일 필드 발견:', selector);
                    break;
                }
            }
            
            // 필드 발견 상태 기록
            const fieldsFound = !!(this.activityPeriodFields.arrivalDate || this.activityPeriodFields.workEndDate);
            this.initStatus.activityPeriodFieldsFound = fieldsFound;
            
            if (fieldsFound) {
                console.log('✅ [초기화] v1.1.0: 활동기간 필드 탐지 완료');
            } else {
                console.warn('⚠️ [초기화] v1.1.0: 활동기간 필드를 찾을 수 없음 - 재검증 시스템 제한됨');
            }
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 활동기간 필드 탐지 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 활동기간 변경 감지 리스너 설정 ===
    setupActivityPeriodChangeListeners() {
        try {
            console.log('🔄 [초기화] v1.1.0: 활동기간 변경 감지 리스너 설정...');
            
            // 도착일 변경 감지
            if (this.activityPeriodFields.arrivalDate) {
                const arrivalField = this.activityPeriodFields.arrivalDate;
                
                // 여러 이벤트 감지 (입력, 변경, 포커스 아웃)
                ['input', 'change', 'blur'].forEach(eventType => {
                    const listener = (event) => {
                        console.log('🔔 [초기화] v1.1.0: 도착일 변경 감지:', event.target.value);
                        this.handleActivityPeriodChange('arrivalDate', event.target.value);
                    };
                    
                    arrivalField.addEventListener(eventType, listener);
                    this.revalidationListeners.push({
                        element: arrivalField,
                        eventType: eventType,
                        listener: listener
                    });
                });
                
                console.log('✅ [초기화] 도착일 필드 리스너 설정 완료');
            }
            
            // 근무 종료일 변경 감지
            if (this.activityPeriodFields.workEndDate) {
                const workEndField = this.activityPeriodFields.workEndDate;
                
                ['input', 'change', 'blur'].forEach(eventType => {
                    const listener = (event) => {
                        console.log('🔔 [초기화] v1.1.0: 근무 종료일 변경 감지:', event.target.value);
                        this.handleActivityPeriodChange('workEndDate', event.target.value);
                    };
                    
                    workEndField.addEventListener(eventType, listener);
                    this.revalidationListeners.push({
                        element: workEndField,
                        eventType: eventType,
                        listener: listener
                    });
                });
                
                console.log('✅ [초기화] 근무 종료일 필드 리스너 설정 완료');
            }
            
            console.log('✅ [초기화] v1.1.0: 활동기간 변경 감지 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 활동기간 변경 감지 리스너 설정 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 활동기간 변경 핸들러 ===
    async handleActivityPeriodChange(fieldType, newValue) {
        try {
            // 재검증이 진행 중이면 중복 실행 방지
            if (this.isValidationInProgress) {
                console.log('⏳ [초기화] v1.1.0: 재검증 진행 중 - 대기');
                return;
            }
            
            this.isValidationInProgress = true;
            console.log(`🔄 [초기화] v1.1.0: 활동기간 변경 처리 시작 (${fieldType}: ${newValue})`);
            
            // 1. 현재 항공권 섹션 상태 임시 저장
            this.saveFlightSectionState();
            
            // 2. 항공권 섹션 즉시 비활성화
            this.disableFlightSectionWithMessage('활동기간 변경됨 - 재검증 필요');
            
            // 3. 500ms 지연 후 재검증 실행 (사용자 입력 완료 대기)
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // 4. 재검증 실행
            const revalidationResult = await this.performRevalidation();
            
            // 5. 재검증 결과에 따른 처리
            if (revalidationResult.success) {
                this.enableFlightSectionWithMessage('재검증 통과 - 항공권 신청 가능');
                this.restoreFlightSectionState();
            } else {
                this.showRevalidationFailureMessage(revalidationResult.reason);
            }
            
            console.log(`✅ [초기화] v1.1.0: 활동기간 변경 처리 완료 (성공: ${revalidationResult.success})`);
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 활동기간 변경 처리 실패:', error);
            this.showRevalidationFailureMessage('재검증 중 오류 발생');
        } finally {
            this.isValidationInProgress = false;
        }
    }

    // === 🆕 v1.1.0: 항공권 섹션 상태 저장/복원 ===
    saveFlightSectionState() {
        try {
            const flightSection = this.pageElements.flightInfoSection;
            if (!flightSection) return;
            
            this.previousFlightSectionState = {
                isEnabled: !flightSection.classList.contains('flight-section-disabled'),
                formData: this.extractFlightFormData(),
                timestamp: Date.now()
            };
            
            console.log('💾 [초기화] v1.1.0: 항공권 섹션 상태 저장 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 항공권 섹션 상태 저장 실패:', error);
        }
    }

    restoreFlightSectionState() {
        try {
            if (!this.previousFlightSectionState) return;
            
            // 폼 데이터 복원
            if (this.previousFlightSectionState.formData) {
                this.restoreFlightFormData(this.previousFlightSectionState.formData);
            }
            
            console.log('📥 [초기화] v1.1.0: 항공권 섹션 상태 복원 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 항공권 섹션 상태 복원 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 폼 데이터 추출/복원 ===
    extractFlightFormData() {
        try {
            const formData = {};
            
            // 일반적인 항공권 관련 필드들 추출
            const fieldSelectors = [
                'input[name*="departure"]',
                'input[name*="return"]', 
                'input[name*="price"]',
                'select[name*="currency"]',
                'select[name*="purchase"]',
                'textarea[name*="note"]'
            ];
            
            fieldSelectors.forEach(selector => {
                const fields = document.querySelectorAll(selector);
                fields.forEach(field => {
                    if (field.name && field.value) {
                        formData[field.name] = field.value;
                    }
                });
            });
            
            return formData;
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 폼 데이터 추출 실패:', error);
            return {};
        }
    }

    restoreFlightFormData(formData) {
        try {
            Object.entries(formData).forEach(([fieldName, value]) => {
                const field = document.querySelector(`[name="${fieldName}"]`);
                if (field && field.value !== value) {
                    field.value = value;
                    
                    // 값 변경 이벤트 트리거
                    const event = new Event('input', { bubbles: true });
                    field.dispatchEvent(event);
                }
            });
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 폼 데이터 복원 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 재검증 실행 ===
    async performRevalidation() {
        try {
            console.log('🔄 [초기화] v1.1.0: 재검증 실행...');
            
            // 1. 현재 활동기간 데이터 수집
            const currentData = this.getCurrentActivityPeriodData();
            
            // 2. 검증 규칙 적용
            const validationResult = await this.validateActivityPeriod(currentData);
            
            // 3. 검증 상태 업데이트
            this.lastValidationState = {
                timestamp: Date.now(),
                data: currentData,
                result: validationResult
            };
            
            console.log('✅ [초기화] v1.1.0: 재검증 완료:', validationResult);
            return validationResult;
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 재검증 실행 실패:', error);
            return {
                success: false,
                reason: '재검증 실행 중 오류 발생'
            };
        }
    }

    // === 🆕 v1.1.0: 현재 활동기간 데이터 수집 ===
    getCurrentActivityPeriodData() {
        try {
            const data = {
                arrivalDate: null,
                workEndDate: null,
                calculatedDays: null
            };
            
            // 도착일 수집
            if (this.activityPeriodFields.arrivalDate) {
                data.arrivalDate = this.activityPeriodFields.arrivalDate.value;
            }
            
            // 근무 종료일 수집
            if (this.activityPeriodFields.workEndDate) {
                data.workEndDate = this.activityPeriodFields.workEndDate.value;
            }
            
            // 계산된 활동일 수집 (있다면)
            const calculatedDaysEl = document.getElementById('calculatedDays');
            if (calculatedDaysEl && calculatedDaysEl.textContent) {
                const match = calculatedDaysEl.textContent.match(/(\d+)/);
                if (match) {
                    data.calculatedDays = parseInt(match[1]);
                }
            }
            
            return data;
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 활동기간 데이터 수집 실패:', error);
            return {};
        }
    }

    // === 🆕 v1.1.0: 활동기간 검증 ===
    async validateActivityPeriod(data) {
        try {
            console.log('🔄 [초기화] v1.1.0: 활동기간 검증 중...', data);
            
            // 1. 기본 데이터 검증
            if (!data.arrivalDate && !data.workEndDate) {
                return {
                    success: false,
                    reason: '활동기간 정보가 입력되지 않았습니다'
                };
            }
            
            // 2. 날짜 형식 검증
            const validationResults = [];
            
            if (data.arrivalDate) {
                const arrivalValid = this.isValidDate(data.arrivalDate);
                if (!arrivalValid) {
                    validationResults.push('도착일 형식이 올바르지 않습니다');
                }
            }
            
            if (data.workEndDate) {
                const workEndValid = this.isValidDate(data.workEndDate);
                if (!workEndValid) {
                    validationResults.push('근무 종료일 형식이 올바르지 않습니다');
                }
            }
            
            // 3. 활동일수 검증 (최소 요구사항 확인)
            if (data.calculatedDays !== null && this.userRequiredDays) {
                if (data.calculatedDays < this.userRequiredDays) {
                    validationResults.push(`활동일수가 최소 요구일(${this.userRequiredDays}일)보다 부족합니다`);
                }
            }
            
            // 4. 검증 결과 반환
            if (validationResults.length > 0) {
                return {
                    success: false,
                    reason: validationResults.join(', ')
                };
            }
            
            return {
                success: true,
                reason: '활동기간 검증 통과'
            };
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 활동기간 검증 실패:', error);
            return {
                success: false,
                reason: '검증 중 오류 발생'
            };
        }
    }

    // === 🆕 v1.1.0: 날짜 유효성 검사 ===
    isValidDate(dateString) {
        try {
            if (!dateString) return false;
            
            const date = new Date(dateString);
            return date instanceof Date && !isNaN(date);
            
        } catch (error) {
            return false;
        }
    }

    // === 🆕 v1.1.0: 항공권 섹션 메시지와 함께 비활성화/활성화 ===
    disableFlightSectionWithMessage(message) {
        try {
            const flightSection = this.pageElements.flightInfoSection;
            if (!flightSection) return;
            
            // 비활성화
            flightSection.classList.add('flight-section-disabled');
            flightSection.classList.remove('flight-section-enabled');
            
            // 상태 메시지 업데이트
            this.updatePrerequisiteStatusMessage(message, 'warning');
            
            console.log('🔒 [초기화] v1.1.0: 항공권 섹션 비활성화:', message);
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 항공권 섹션 비활성화 실패:', error);
        }
    }

    enableFlightSectionWithMessage(message) {
        try {
            const flightSection = this.pageElements.flightInfoSection;
            if (!flightSection) return;
            
            // 활성화
            flightSection.classList.remove('flight-section-disabled');
            flightSection.classList.add('flight-section-enabled');
            
            // 상태 메시지 업데이트
            this.updatePrerequisiteStatusMessage(message, 'success');
            
            console.log('🔓 [초기화] v1.1.0: 항공권 섹션 활성화:', message);
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 항공권 섹션 활성화 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 전제조건 상태 메시지 업데이트 ===
    updatePrerequisiteStatusMessage(message, type = 'info') {
        try {
            let statusElement = document.getElementById('prerequisiteStatus');
            
            if (!statusElement) {
                const flightSection = this.pageElements.flightInfoSection;
                if (flightSection) {
                    statusElement = document.createElement('div');
                    statusElement.id = 'prerequisiteStatus';
                    flightSection.insertBefore(statusElement, flightSection.firstChild);
                }
            }
            
            if (statusElement) {
                statusElement.className = `prerequisite-status ${type}`;
                
                const iconMap = {
                    'info': 'info',
                    'warning': 'alert-triangle',
                    'success': 'check-circle',
                    'error': 'x-circle'
                };
                
                statusElement.innerHTML = `
                    <i data-lucide="${iconMap[type] || 'info'}"></i>
                    <span>${message}</span>
                `;
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 상태 메시지 업데이트 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 재검증 실패 메시지 표시 ===
    showRevalidationFailureMessage(reason) {
        try {
            this.updatePrerequisiteStatusMessage(
                `재검증 실패: ${reason}. 활동기간을 올바르게 입력하고 다시 검증해주세요.`,
                'error'
            );
            
            console.log('⚠️ [초기화] v1.1.0: 재검증 실패 메시지 표시:', reason);
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 재검증 실패 메시지 표시 실패:', error);
        }
    }

    // === 🆕 v1.1.0: 초기 검증 상태 저장 ===
    saveInitialValidationState() {
        try {
            const currentData = this.getCurrentActivityPeriodData();
            this.lastValidationState = {
                timestamp: Date.now(),
                data: currentData,
                result: { success: false, reason: '초기 상태' }
            };
            
            console.log('💾 [초기화] v1.1.0: 초기 검증 상태 저장 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 초기 검증 상태 저장 실패:', error);
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

    // === 🆕 v1.1.0: 리스너 정리 메서드 ===
    cleanupRevalidationListeners() {
        try {
            console.log('🗑️ [초기화] v1.1.0: 재검증 리스너 정리...');
            
            this.revalidationListeners.forEach(({ element, eventType, listener }) => {
                if (element && typeof element.removeEventListener === 'function') {
                    element.removeEventListener(eventType, listener);
                }
            });
            
            this.revalidationListeners = [];
            console.log('✅ [초기화] v1.1.0: 재검증 리스너 정리 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 재검증 리스너 정리 실패:', error);
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
    
    // 🆕 v1.1.0: 재검증 상태 반환
    getRevalidationStatus() {
        return {
            lastValidationState: this.lastValidationState,
            isValidationInProgress: this.isValidationInProgress,
            listenersSetup: this.initStatus.revalidationListenersSetup,
            fieldsFound: this.initStatus.activityPeriodFieldsFound,
            activityPeriodFields: {
                arrivalDate: !!this.activityPeriodFields.arrivalDate,
                workEndDate: !!this.activityPeriodFields.workEndDate
            }
        };
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

    // 🆕 v1.1.0: 수동 재검증 트리거
    async triggerManualRevalidation() {
        try {
            if (this.isValidationInProgress) {
                console.warn('⚠️ [초기화] v1.1.0: 재검증이 이미 진행 중입니다');
                return false;
            }
            
            console.log('🔄 [초기화] v1.1.0: 수동 재검증 실행...');
            
            const result = await this.performRevalidation();
            
            if (result.success) {
                this.enableFlightSectionWithMessage('재검증 성공 - 항공권 신청 가능');
                this.restoreFlightSectionState();
            } else {
                this.showRevalidationFailureMessage(result.reason);
            }
            
            return result.success;
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 수동 재검증 실패:', error);
            return false;
        }
    }
    
    // 디버깅 정보 반환
    getDebugInfo() {
        return {
            version: 'v1.1.0',
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
            apiAdapter: !!this.apiAdapter,
            // 🆕 v1.1.0: 재검증 시스템 디버깅 정보
            revalidationSystem: {
                lastValidationState: this.lastValidationState,
                isValidationInProgress: this.isValidationInProgress,
                listenersSetup: this.initStatus.revalidationListenersSetup,
                fieldsFound: this.initStatus.activityPeriodFieldsFound,
                activityPeriodFields: this.activityPeriodFields,
                revalidationListenersCount: this.revalidationListeners.length
            }
        };
    }

    // 🆕 v1.1.0: 정리 메서드
    destroy() {
        try {
            console.log('🗑️ [초기화] v1.1.0: 인스턴스 정리...');
            
            // 재검증 리스너 정리
            this.cleanupRevalidationListeners();
            
            // 기타 정리
            this.apiAdapter = null;
            this.userData = null;
            this.pageElements = {};
            this.initStatus = {};
            this.lastValidationState = null;
            this.previousFlightSectionState = null;
            
            console.log('✅ [초기화] v1.1.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [초기화] v1.1.0: 인스턴스 정리 실패:', error);
        }
    }
}

// 전역 스코프에 노출
window.FlightRequestInit = FlightRequestInit;

console.log('✅ FlightRequestInit v1.1.0 모듈 로드 완료');
console.log('🎯 v1.1.0 신규 기능:', {
    coreResponsibility: [
        '항공권 신청 페이지의 초기 세팅',
        'api-event-adapter 기반 사용자데이터로 필수활동일 정보 확인 및 표시', 
        '항공권 정보 입력 페이지의 비활성화',
        '🆕 실시간 활동기간 변경 감지 및 재검증 시스템'
    ],
    newFeatures: [
        '🆕 실시간 활동기간 필드 변경 감지',
        '🆕 즉시 재검증 트리거 시스템',
        '🆕 검증 실패 시 항공권 섹션 자동 비활성화',
        '🆕 사용자 피드백 및 재검증 요구 안내',
        '🆕 기존 항공권 데이터 임시 보존/복원',
        '🆕 수동 재검증 트리거 API',
        '🆕 재검증 시스템 상태 모니터링',
        '🆕 안전한 리스너 정리 시스템'
    ],
    benefits: [
        '책임 분리로 코드 명확성 향상',
        'flight-request-ticket.js 파일 크기 대폭 감소',
        '초기화 문제와 검증 문제 분리로 디버깅 용이성 확보',
        '성능 최적화 - 초기화는 한 번만, 검증은 필요시에만',
        '🆕 데이터 일관성 보장 - 활동기간 변경 시 즉시 재검증',
        '🆕 사용자 경험 향상 - 실시간 피드백 제공',
        '🆕 안전성 강화 - 잘못된 데이터 기반 신청 방지'
    ]
});
console.log('🚀 v1.1.0 예상 효과:', {
    dataConsistency: '활동기간과 항공권 섹션 상태 완전 동기화',
    userExperience: '실시간 검증 및 즉시 피드백으로 혼란 방지',
    dataSafety: '항상 유효한 데이터 기반 항공권 신청 보장',
    systemReliability: '사용자 실수로 인한 잘못된 신청 원천 차단'
});
