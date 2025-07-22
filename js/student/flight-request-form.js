// flight-request-form.js - v1.0.0 폼 제출 및 검증 통합 관리자
// 🎯 핵심 책임:
//   1. 기존 검증 시스템들의 결과 확인 (검증은 하지 않음)
//   2. 활동기간 검증 + 항공권 날짜 검증 통합 확인
//   3. 이미지 업로드 → DB 저장 워크플로우 관리
//   4. 폼 제출 프로세스 전체 관리
//   5. 최종 성공/실패 피드백 제공
// 🔧 원칙: 기존 검증 로직은 수정하지 않고, 결과만 확인

console.log('🚀 FlightRequestFormHandler v1.0.0 로딩 시작');

class FlightRequestFormHandler {
    constructor() {
        console.log('🔄 [폼핸들러] FlightRequestFormHandler v1.0.0 생성');
        
        // 폼 관련 요소들
        this.form = null;
        this.submitBtn = null;
        this.imageInput = null;
        this.imagePreview = null;
        
        // 업로드 관련 상태
        this.selectedImageFile = null;
        this.uploadedImageUrl = null;
        this.isSubmitting = false;
        
        // API 서비스 (coordinator에서 주입)
        this.apiService = null;
        this.uiService = null;
        
        console.log('✅ [폼핸들러] FlightRequestFormHandler v1.0.0 생성 완료');
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
            
            // 구매 방식 확인
            const purchaseType = document.querySelector('input[name="purchaseType"]:checked');
            if (!purchaseType) {
                missingInputs.push('구매 방식');
            }
            
            // 이미지 파일 확인
            if (!this.selectedImageFile) {
                missingInputs.push('항공권 정보 이미지');
            }
            
            if (missingInputs.length > 0) {
                console.warn('⚠️ [입력확인] 누락된 필수 입력:', missingInputs);
                return {
                    valid: false,
                    missingInputs: missingInputs,
                    message: `다음 항목을 입력해주세요: ${missingInputs.join(', ')}`
                };
            }
            
            console.log('✅ [입력확인] 모든 필수 입력 완료');
            return {
                valid: true,
                message: '모든 필수 입력이 완료되었습니다'
            };
            
        } catch (error) {
            console.error('❌ [입력확인] 필수 입력 확인 실패:', error);
            return {
                valid: false,
                message: '입력 확인 중 오류가 발생했습니다'
            };
        }
    }

    // ================================
    // 파트 3: 폼 제출 메인 로직
    // ================================

    async handleFormSubmit(event) {
        try {
            event.preventDefault();
            
            console.log('🚀 [폼제출] 항공권 신청 제출 시작...');
            
            // 이미 제출 중인지 확인
            if (this.isSubmitting) {
                console.warn('⚠️ [폼제출] 이미 제출 중입니다');
                return;
            }
            
            this.isSubmitting = true;
            this.updateSubmitButton(true, '제출 중...');
            
            // 1단계: 활동기간 검증 확인
            console.log('🔍 [폼제출] 1단계: 활동기간 검증 확인...');
            const activityValid = this.checkActivityPeriodValidation();
            if (!activityValid) {
                this.showValidationError('활동기간 검증이 완료되지 않았습니다. 현지 도착일과 학당 근무 종료일을 올바르게 입력해주세요.');
                return;
            }
            console.log('✅ [폼제출] 활동기간 검증 통과');
            
            // 2단계: 항공권 날짜 검증 확인
            console.log('🔍 [폼제출] 2단계: 항공권 날짜 검증 확인...');
            const flightDatesValid = this.checkFlightDateValidation();
            if (!flightDatesValid) {
                this.showValidationError('항공권 날짜 검증이 완료되지 않았습니다. 출국일과 귀국일을 올바르게 입력해주세요.');
                return;
            }
            console.log('✅ [폼제출] 항공권 날짜 검증 통과');
            
            // 3단계: 필수 입력 확인
            console.log('🔍 [폼제출] 3단계: 필수 입력 확인...');
            const inputCheck = this.checkRequiredInputs();
            if (!inputCheck.valid) {
                this.showValidationError(inputCheck.message);
                return;
            }
            console.log('✅ [폼제출] 필수 입력 확인 통과');
            
            // 4단계: 이미지 업로드
            console.log('🔍 [폼제출] 4단계: 이미지 업로드...');
            this.updateSubmitButton(true, '이미지 업로드 중...');
            const imageUploadResult = await this.uploadImage();
            if (!imageUploadResult.success) {
                this.showValidationError(`이미지 업로드 실패: ${imageUploadResult.error}`);
                return;
            }
            console.log('✅ [폼제출] 이미지 업로드 완료:', imageUploadResult.url);
            
            // 5단계: 데이터베이스 저장
            console.log('🔍 [폼제출] 5단계: 데이터베이스 저장...');
            this.updateSubmitButton(true, '데이터 저장 중...');
            const saveResult = await this.saveFlightRequest(imageUploadResult.url);
            if (!saveResult.success) {
                this.showValidationError(`저장 실패: ${saveResult.error}`);
                return;
            }
            console.log('✅ [폼제출] 데이터베이스 저장 완료');
            
            // 6단계: 성공 처리
            console.log('🎉 [폼제출] 항공권 신청 제출 완료!');
            this.showSuccessMessage('항공권 신청이 성공적으로 제출되었습니다!');
            this.updateSubmitButton(false, '제출 완료');
            
            // 🆕 여기에 추가!
            this.isSuccessfullySubmitted = true;
            console.log('⏰ [폼제출] 2초 후 페이지 새로고침 예정...');

            setTimeout(() => {
                console.log('🔄 [폼제출] 페이지 새로고침 실행');
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('❌ [폼제출] 항공권 신청 제출 실패:', error);
            this.showValidationError('제출 중 오류가 발생했습니다. 다시 시도해주세요.');
            
        } finally {
            if (!this.isSuccessfullySubmitted) { // 성공하지 않은 경우만
                this.isSubmitting = false;
                if (!this.submitBtn.textContent.includes('완료')) {
                    this.updateSubmitButton(false, '신청하기');
                }
            }
        }
    }

    // ================================
    // 파트 4: 이미지 업로드 관리
    // ================================

    handleImageSelect(event) {
        try {
            const file = event.target.files[0];
            if (!file) {
                this.resetImageUpload();
                return;
            }
            
            console.log('🖼️ [이미지] 파일 선택:', file.name, file.size);
            
            // 파일 유효성 검사
            const validation = this.validateImageFile(file);
            if (!validation.valid) {
                this.showValidationError(validation.message);
                this.resetImageUpload();
                return;
            }
            
            // 파일 저장
            this.selectedImageFile = file;
            
            // 미리보기 표시
            this.showImagePreview(file);
            
            console.log('✅ [이미지] 파일 선택 완료');
            
        } catch (error) {
            console.error('❌ [이미지] 파일 선택 실패:', error);
            this.resetImageUpload();
        }
    }

    validateImageFile(file) {
        try {
            // 파일 크기 확인 (5MB)
            const maxSize = 5 * 1024 * 1024;
            if (file.size > maxSize) {
                return {
                    valid: false,
                    message: '파일 크기는 5MB 이하여야 합니다.'
                };
            }
            
            // 파일 타입 확인
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            if (!allowedTypes.includes(file.type)) {
                return {
                    valid: false,
                    message: 'JPG, PNG, GIF 형식의 이미지만 업로드 가능합니다.'
                };
            }
            
            return {
                valid: true,
                message: '파일이 유효합니다.'
            };
            
        } catch (error) {
            console.error('❌ [이미지검증] 파일 검증 실패:', error);
            return {
                valid: false,
                message: '파일 검증 중 오류가 발생했습니다.'
            };
        }
    }

    showImagePreview(file) {
        try {
            if (!this.imagePreview) return;
            
            const reader = new FileReader();
            reader.onload = (e) => {
                this.imagePreview.innerHTML = `
                    <img id="previewImg" src="${e.target.result}" alt="항공권 정보 이미지" style="max-width: 100%; height: auto;">
                    <button type="button" id="removeImage" class="remove-image">
                        <i data-lucide="x"></i>
                    </button>
                `;
                this.imagePreview.style.display = 'block';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('❌ [이미지미리보기] 미리보기 표시 실패:', error);
        }
    }

    handleImageRemove(event) {
        try {
            event.preventDefault();
            console.log('🗑️ [이미지] 이미지 제거');
            
            this.resetImageUpload();
            
        } catch (error) {
            console.error('❌ [이미지] 이미지 제거 실패:', error);
        }
    }

    resetImageUpload() {
        try {
            this.selectedImageFile = null;
            this.uploadedImageUrl = null;
            
            if (this.imageInput) {
                this.imageInput.value = '';
            }
            
            if (this.imagePreview) {
                this.imagePreview.style.display = 'none';
                this.imagePreview.innerHTML = '';
            }
            
        } catch (error) {
            console.error('❌ [이미지리셋] 이미지 업로드 리셋 실패:', error);
        }
    }

    async uploadImage() {
        try {
            if (!this.selectedImageFile) {
                return {
                    success: false,
                    error: '업로드할 이미지가 없습니다.'
                };
            }
            
            if (!this.apiService?.uploadFlightImage) {
                return {
                    success: false,
                    error: 'API 서비스를 사용할 수 없습니다.'
                };
            }
            
            console.log('📤 [이미지업로드] 시작:', this.selectedImageFile.name);
            
            const result = await this.apiService.uploadFlightImage(this.selectedImageFile);
            
            if (result.success) {
                this.uploadedImageUrl = result.url;
                console.log('✅ [이미지업로드] 성공:', result.url);
                return {
                    success: true,
                    url: result.url
                };
            } else {
                console.error('❌ [이미지업로드] 실패:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('❌ [이미지업로드] 예외 발생:', error);
            return {
                success: false,
                error: '이미지 업로드 중 오류가 발생했습니다.'
            };
        }
    }

    // ================================
    // 파트 5: 데이터베이스 저장
    // ================================

    async saveFlightRequest(imageUrl) {
        try {
            if (!this.apiService?.saveFlightRequest) {
                return {
                    success: false,
                    error: 'API 서비스를 사용할 수 없습니다.'
                };
            }
            
            // 폼 데이터 수집
            const formData = this.collectFormData(imageUrl);
            
            console.log('💾 [데이터저장] 시작:', formData);
            
            const result = await this.apiService.saveFlightRequest(formData);
            
            if (result.success) {
                console.log('✅ [데이터저장] 성공');
                return {
                    success: true,
                    data: result.data
                };
            } else {
                console.error('❌ [데이터저장] 실패:', result.error);
                return {
                    success: false,
                    error: result.error
                };
            }
            
        } catch (error) {
            console.error('❌ [데이터저장] 예외 발생:', error);
            return {
                success: false,
                error: '데이터 저장 중 오류가 발생했습니다.'
            };
        }
    }

    collectFormData(imageUrl) {
        try {
            // 구매 방식
            const purchaseType = document.querySelector('input[name="purchaseType"]:checked')?.value;
            
            // 구매 링크 (구매 대행인 경우)
            const purchaseLink = document.getElementById('purchaseLink')?.value || '';
            
            const formData = {
                // 활동 기간 (user_profiles 업데이트용)
                actualArrivalDate: document.getElementById('actualArrivalDate')?.value,
                actualWorkEndDate: document.getElementById('actualWorkEndDate')?.value,

                // 구매 방식
                purchaseMethod: purchaseType, // API에서 purchase_type으로 변환됨
                purchaseLink: purchaseLink,

                // 항공권 정보
                departureDate: document.getElementById('departureDate')?.value,
                returnDate: document.getElementById('returnDate')?.value,
                departureAirport: document.getElementById('departureAirport')?.value,
                returnAirport: document.getElementById('arrivalAirport')?.value, // HTML ID 주의

                // 가격 정보
                totalPrice: parseFloat(document.getElementById('ticketPrice')?.value) || 0, // API에서 ticket_price로 변환됨
                currency: document.getElementById('currency')?.value,
                priceSource: document.getElementById('priceSource')?.value,

                // 이미지
                flightImageUrl: imageUrl,

                // 메타데이터
                status: 'pending',
                submittedAt: new Date().toISOString()
            };
            
            console.log('📋 [데이터수집] 폼 데이터 수집 완료:', formData);
            return formData;
            
        } catch (error) {
            console.error('❌ [데이터수집] 폼 데이터 수집 실패:', error);
            throw error;
        }
    }

    // ================================
    // 파트 6: UI 업데이트 및 피드백
    // ================================

    updateSubmitButton(isLoading, text) {
        try {
            if (!this.submitBtn) return;
            
            this.submitBtn.disabled = isLoading;
            this.submitBtn.style.opacity = isLoading ? '0.7' : '1';
            this.submitBtn.style.cursor = isLoading ? 'not-allowed' : 'pointer';
            
            // 버튼 텍스트 업데이트
            const textElement = this.submitBtn.querySelector('#submitBtnText') || this.submitBtn;
            textElement.textContent = text;
            
            // 로딩 중일 때 아이콘 변경
            const iconElement = this.submitBtn.querySelector('i[data-lucide]');
            if (iconElement) {
                if (isLoading) {
                    iconElement.setAttribute('data-lucide', 'loader-2');
                    iconElement.style.animation = 'spin 1s linear infinite';
                } else {
                    iconElement.setAttribute('data-lucide', 'send');
                    iconElement.style.animation = '';
                }
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error('❌ [UI업데이트] 제출 버튼 업데이트 실패:', error);
        }
    }

    showValidationError(message) {
        try {
            console.error('🚨 [검증오류]', message);
            
            // 오류 메시지 표시
            this.showMessage(message, 'error');
            
            // 제출 상태 리셋
            this.isSubmitting = false;
            this.updateSubmitButton(false, '신청하기');
            
        } catch (error) {
            console.error('❌ [UI업데이트] 검증 오류 표시 실패:', error);
        }
    }

    showSuccessMessage(message) {
        try {
            console.log('🎉 [성공메시지]', message);
            
            // 성공 메시지 표시
            this.showMessage(message, 'success');
            
        } catch (error) {
            console.error('❌ [UI업데이트] 성공 메시지 표시 실패:', error);
        }
    }

    showMessage(message, type = 'info') {
        try {
            // 기존 메시지 제거
            const existingMessage = document.querySelector('.form-message');
            if (existingMessage) {
                existingMessage.remove();
            }
            
            // 새 메시지 생성
            const messageDiv = document.createElement('div');
            messageDiv.className = `form-message alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'}`;
            messageDiv.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                max-width: 400px;
                padding: 15px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                background: white;
                border-left: 4px solid ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'};
            `;
            
            messageDiv.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i data-lucide="${type === 'error' ? 'alert-circle' : type === 'success' ? 'check-circle' : 'info'}" 
                       style="color: ${type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#007bff'}; flex-shrink: 0;"></i>
                    <span style="color: #333;">${message}</span>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="margin-left: auto; background: none; border: none; font-size: 18px; cursor: pointer; color: #666;">×</button>
                </div>
            `;
            
            document.body.appendChild(messageDiv);
            
            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 자동 제거 (오류는 더 오래 표시)
            const autoRemoveTime = type === 'error' ? 8000 : type === 'success' ? 5000 : 3000;
            setTimeout(() => {
                if (messageDiv.parentNode) {
                    messageDiv.remove();
                }
            }, autoRemoveTime);
            
        } catch (error) {
            console.error('❌ [메시지표시] 메시지 표시 실패:', error);
            // 폴백: alert 사용
            alert(message);
        }
    }

    // ================================
    // 파트 7: 외부 인터페이스 및 디버깅
    // ================================

    // 외부에서 호출 가능한 메서드들
    getFormData() {
        try {
            return this.collectFormData(this.uploadedImageUrl);
        } catch (error) {
            console.error('❌ [외부인터페이스] 폼 데이터 가져오기 실패:', error);
            return null;
        }
    }

    getValidationStatus() {
        return {
            activityPeriodValid: this.checkActivityPeriodValidation(),
            flightDatesValid: this.checkFlightDateValidation(),
            requiredInputsValid: this.checkRequiredInputs().valid,
            imageSelected: !!this.selectedImageFile,
            isSubmitting: this.isSubmitting
        };
    }

    triggerValidation() {
        try {
            console.log('🔍 [외부인터페이스] 수동 검증 트리거');
            
            const status = this.getValidationStatus();
            console.log('📊 [외부인터페이스] 현재 검증 상태:', status);
            
            return status;
            
        } catch (error) {
            console.error('❌ [외부인터페이스] 수동 검증 트리거 실패:', error);
            return null;
        }
    }

    // 디버깅 정보
    getDebugInfo() {
        return {
            version: '1.0.0',
            isInitialized: !!(this.form && this.submitBtn),
            hasApiService: !!this.apiService,
            hasUiService: !!this.uiService,
            selectedImageFile: this.selectedImageFile ? {
                name: this.selectedImageFile.name,
                size: this.selectedImageFile.size,
                type: this.selectedImageFile.type
            } : null,
            uploadedImageUrl: this.uploadedImageUrl,
            isSubmitting: this.isSubmitting,
            validationStatus: this.getValidationStatus(),
            domElements: {
                form: !!this.form,
                submitBtn: !!this.submitBtn,
                imageInput: !!this.imageInput,
                imagePreview: !!this.imagePreview
            }
        };
    }

    // 인스턴스 정리
    destroy() {
        try {
            console.log('🗑️ [폼핸들러] 인스턴스 정리...');
            
            // 이벤트 리스너 제거
            if (this.form) {
                this.form.removeEventListener('submit', this.handleFormSubmit);
            }
            
            if (this.imageInput) {
                this.imageInput.removeEventListener('change', this.handleImageSelect);
            }
            
            // 참조 정리
            this.form = null;
            this.submitBtn = null;
            this.imageInput = null;
            this.imagePreview = null;
            this.selectedImageFile = null;
            this.uploadedImageUrl = null;
            this.apiService = null;
            this.uiService = null;
            
            console.log('✅ [폼핸들러] 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [폼핸들러] 인스턴스 정리 실패:', error);
        }
    }
}

// ================================
// 전역 스코프 노출
// ================================

window.FlightRequestFormHandler = FlightRequestFormHandler;

console.log('✅ FlightRequestFormHandler v1.0.0 모듈 로드 완료');
console.log('🎯 v1.0.0 핵심 기능:', {
    features: [
        '🎯 기존 검증 시스템 결과 확인 (활동기간 + 항공권 날짜)',
        '📋 모든 필수 입력 확인',
        '🖼️ 이미지 업로드 관리 (선택, 미리보기, 검증, 업로드)',
        '💾 통합 폼 제출 워크플로우 (검증 → 업로드 → 저장)',
        '🎨 실시간 UI 피드백 (진행 상태, 성공/실패 메시지)',
        '🔧 외부 인터페이스 제공 (수동 검증, 디버깅)',
        '⚡ 이벤트 기반 아키텍처 (기존 시스템과 완벽 연동)'
    ],
    principles: [
        '기존 검증 로직 수정 금지 - 결과만 확인',
        '책임 분리 - 각 모듈은 자신의 역할만 담당',
        '확장 가능 - 새로운 검증이 추가되어도 쉽게 연동',
        '사용자 친화적 - 명확한 피드백과 진행 상태 표시'
    ]
});
