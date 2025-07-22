// flight-request-form.js - v1.0.1 폼 제출 후 새로고침 수정
// 🎯 핵심 책임:
//   1. 기존 검증 시스템들의 결과 확인 (검증은 하지 않음)
//   2. 활동기간 검증 + 항공권 날짜 검증 통합 확인
//   3. 이미지 업로드 → DB 저장 워크플로우 관리
//   4. 폼 제출 프로세스 전체 관리
//   5. 최종 성공/실패 피드백 제공
// 🔧 원칙: 기존 검증 로직은 수정하지 않고, 결과만 확인
// 🆕 v1.0.1: 새로고침 로직 수정 - finally 블록에서 성공 상태 보호

console.log('🚀 FlightRequestFormHandler v1.0.1 로딩 시작 - 새로고침 수정');

class FlightRequestFormHandler {
    constructor() {
        console.log('🔄 [폼핸들러] FlightRequestFormHandler v1.0.1 생성');
        
        // 폼 관련 요소들
        this.form = null;
        this.submitBtn = null;
        this.imageInput = null;
        this.imagePreview = null;
        
        // 업로드 관련 상태
        this.selectedImageFile = null;
        this.uploadedImageUrl = null;
        this.isSubmitting = false;
        this.isSuccessfullySubmitted = false; // 🆕 v1.0.1: 성공 제출 플래그
        
        // API 서비스 (coordinator에서 주입)
        this.apiService = null;
        this.uiService = null;
        
        console.log('✅ [폼핸들러] FlightRequestFormHandler v1.0.1 생성 완료');
    }

    // ================================
    // 파트 1: 초기화 및 이벤트 바인딩
    // ================================

    async init(apiService, uiService) {
        try {
            console.log('🔄 [폼핸들러] 초기화 시작...');
            
            // 서비스 주입
            this.apiService = apiService;
            this.uiService = uiService;
            
            // DOM 요소 찾기
            this.findDOMElements();
            
            // 이벤트 바인딩
            this.bindEvents();
            
            // 초기 상태 설정
            this.setInitialState();
            
            console.log('✅ [폼핸들러] 초기화 완료');
            return true;
            
        } catch (error) {
            console.error('❌ [폼핸들러] 초기화 실패:', error);
            return false;
        }
    }

    findDOMElements() {
        try {
            // 폼 요소들
            this.form = document.getElementById('flightRequestForm');
            this.submitBtn = document.getElementById('submitBtn');
            
            // 이미지 업로드 요소들
            this.imageInput = document.getElementById('flightImage');
            this.imagePreview = document.getElementById('imagePreview');
            
            if (!this.form) {
                throw new Error('flightRequestForm을 찾을 수 없습니다');
            }
            
            if (!this.submitBtn) {
                throw new Error('submitBtn을 찾을 수 없습니다');
            }
            
            if (!this.imageInput) {
                throw new Error('flightImage를 찾을 수 없습니다');
            }
            
            console.log('✅ [폼핸들러] DOM 요소 찾기 완료');
            
        } catch (error) {
            console.error('❌ [폼핸들러] DOM 요소 찾기 실패:', error);
            throw error;
        }
    }

    bindEvents() {
        try {
            console.log('🔄 [폼핸들러] 이벤트 바인딩...');
            
            // 폼 제출 이벤트
            this.form.addEventListener('submit', (event) => {
                this.handleFormSubmit(event);
            });
            
            // 이미지 선택 이벤트
            this.imageInput.addEventListener('change', (event) => {
                this.handleImageSelect(event);
            });
            
            // 이미지 제거 버튼 (동적 생성되므로 위임)
            document.addEventListener('click', (event) => {
                if (event.target.id === 'removeImage' || 
                    event.target.closest('#removeImage')) {
                    this.handleImageRemove(event);
                }
            });
            
            console.log('✅ [폼핸들러] 이벤트 바인딩 완료');
            
        } catch (error) {
            console.error('❌ [폼핸들러] 이벤트 바인딩 실패:', error);
        }
    }

    setInitialState() {
        try {
            // 제출 버튼 초기 상태
            this.updateSubmitButton(false, '신청하기');
            
            // 이미지 업로드 초기 상태
            this.resetImageUpload();
            
            console.log('✅ [폼핸들러] 초기 상태 설정 완료');
            
        } catch (error) {
            console.error('❌ [폼핸들러] 초기 상태 설정 실패:', error);
        }
    }

    // ================================
    // 파트 2: 핵심 검증 확인 메서드들
    // ================================

    // 🎯 활동기간 검증 결과 확인 (검증은 하지 않음)
    checkActivityPeriodValidation() {
        try {
            console.log('🔍 [검증확인] 활동기간 검증 상태 확인...');
            
            // 방법 1: 전역 ActivityPeriodValidation 객체 확인
            if (window.ActivityPeriodValidation?.getState) {
                const state = window.ActivityPeriodValidation.getState();
                console.log('📊 [검증확인] ActivityPeriodValidation 상태:', state);
                return state.isValidated === true;
            }
            
            // 방법 2: 전역 ValidationState 변수 확인
            if (typeof ValidationState !== 'undefined' && ValidationState.isValidated !== undefined) {
                console.log('📊 [검증확인] ValidationState:', ValidationState.isValidated);
                return ValidationState.isValidated === true;
            }
            
            // 방법 3: HTML 요소 상태로 확인 (폴백)
            const validationStatus = document.getElementById('validationStatus');
            if (validationStatus?.classList.contains('success')) {
                console.log('📊 [검증확인] HTML 요소 상태로 확인: 성공');
                return true;
            }
            
            console.warn('⚠️ [검증확인] 활동기간 검증 상태를 확인할 수 없음');
            return false;
            
        } catch (error) {
            console.error('❌ [검증확인] 활동기간 검증 상태 확인 실패:', error);
            return false;
        }
    }

    // 🎯 항공권 날짜 검증 결과 확인 (검증은 하지 않음)  
    checkFlightDateValidation() {
        try {
            console.log('🔍 [검증확인] 항공권 날짜 검증 상태 확인...');
            
            // 방법 1: coordinator의 ticket 모듈 확인
            const coordinator = window.flightRequestCoordinator;
            if (coordinator?.ticket?.getFlightDateValidationStatus) {
                const validation = coordinator.ticket.getFlightDateValidationStatus();
                console.log('📊 [검증확인] 항공권 날짜 검증 상태:', validation);
                
                return validation.overallValid === true &&
                       validation.departureValid === true &&
                       validation.returnValid === true;
            }
            
            // 방법 2: 직접 ticket 객체 확인
            if (window.flightRequestTicket?.getFlightDateValidationStatus) {
                const validation = window.flightRequestTicket.getFlightDateValidationStatus();
                console.log('📊 [검증확인] 직접 ticket 검증 상태:', validation);
                return validation.overallValid === true;
            }
            
            // 방법 3: HTML 요소 상태로 확인 (폴백)
            const departureError = document.getElementById('departureDateError');
            const returnError = document.getElementById('returnDateError');
            const departureDateInput = document.getElementById('departureDate');
            const returnDateInput = document.getElementById('returnDate');
            
            if (departureDateInput?.value && returnDateInput?.value) {
                const departureValid = !departureError || departureError.style.display === 'none';
                const returnValid = !returnError || returnError.style.display === 'none';
                
                console.log('📊 [검증확인] HTML 요소로 확인:', { departureValid, returnValid });
                return departureValid && returnValid;
            }
            
            console.warn('⚠️ [검증확인] 항공권 날짜 검증 상태를 확인할 수 없음');
            return false;
            
        } catch (error) {
            console.error('❌ [검증확인] 항공권 날짜 검증 상태 확인 실패:', error);
            return false;
        }
    }

    // 🎯 모든 필수 입력 확인
    checkRequiredInputs() {
        try {
            console.log('🔍 [입력확인] 필수 입력 항목 확인...');
            
            const requiredInputs = [
                { id: 'actualArrivalDate', name: '현지 도착일' },
                { id: 'actualWorkEndDate', name: '학당 근무 종료일' },
                { id: 'departureDate', name: '출국일' },
                { id: 'returnDate', name: '귀국일' },
                { id: 'departureAirport', name: '출국 공항' },
                { id: 'arrivalAirport', name: '도착 공항' },
                { id: 'ticketPrice', name: '항공권 가격' },
                { id: 'currency', name: '통화' },
                { id: 'priceSource', name: '가격 정보 출처' }
            ];
            
            const missingInputs = [];
            
            for (const input of requiredInputs) {
                const element = document.getElementById(input.id);
                if (!element || !element.value.trim()) {
                    missingInputs.push(input.name);
                }
            }
            
            // 구매