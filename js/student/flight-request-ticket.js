// flight-request-ticket.js - v3.0.0 완전한 통합 버전
// 🎯 PART1 + PART2 올바른 통합본
// 📌 사용법: 이 파일을 flight-request-ticket.js로 복사해서 사용하세요

// flight-request-ticket.js - v3.0.0 이미지 업로드 및 폼 제출 기능 추가
// 🎯 핵심 책임:
//   1. 현지 활동기간 검증 로직 (항공권 날짜와 독립적)
//   2. required_return_date 기반 귀국일 상한선 검증
//   3. 항공권 날짜 실시간 검증 로직 (활동기간 기반)
//   4. 모든 항공권 정보 입력창 활성화/비활성화 통합 관리
//   5. 초기화 모듈의 이벤트를 수신하여 UI 제어
//   6. 🆕 v3.0.0: 이미지 업로드 및 폼 제출 통합 시스템
//   7. 🆕 v3.0.0: 항공권 정보 이미지 등록 및 Supabase 저장 완성
// 🔧 분리 완료: 초기화 로직은 flight-request-init.js로 완전 이전
// 🔧 v2.1.0: 단일 책임 원칙 - 항공권 섹션 제어의 유일한 관리 주체
// 🆕 v2.2.0: 활동기간 기반 항공권 날짜 검증 시스템 완성
// 🆕 v2.3.0: DB required_return_date 기반 귀국일 상한선 검증 추가
// 🆕 v3.0.0: 이미지 업로드, 폼 제출, 데이터베이스 저장 완전 구현

console.log('🚀 FlightRequestTicket v3.0.0 로딩 시작 - 이미지 업로드 및 폼 제출 기능 추가');

// ================================
// 파트 1: 메인 FlightRequestTicket 클래스
// ================================

class FlightRequestTicket {
    constructor(apiService, uiService, passportService) {
        console.log('🔄 [티켓모듈] FlightRequestTicket v3.0.0 생성 - 이미지 업로드 및 폼 제출 시스템');
        
        // 의존성 주입 (초기화 모듈에서 주입)
        this.apiService = apiService;
        this.uiService = uiService;
        this.passportService = passportService;
        
        // 🆕 v2.1.0: 통합 항공권 섹션 제어 상태
        this.flightSectionControl = {
            isEnabled: false,
            lastStateChangeReason: 'initialization',
            lastStateChangeMessage: '초기화 중...',
            lastStateChangeTime: Date.now(),
            stateHistory: [],
            pendingStateChange: null
        };
        
        // 🆕 v2.1.0: 이벤트 시스템
        this.eventListeners = new Map();
        this.isEventSystemSetup = false;
        
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
        
        // 🆕 v2.2.0: 항공권 날짜 검증 관련 상태
        this.flightDateValidation = {
            departureValid: false,
            returnValid: false,
            lastValidationTime: null,
            validationErrors: {
                departure: null,
                return: null
            },
            validationRanges: {
                departure: { min: null, max: null },
                return: { min: null, max: null }
            }
        };
        
        // 🔧 v2.3.0: 사용자별 활동 요구사항 (required_return_date 추가)
        this.userRequirements = {
            userRequiredDays: null,
            userMaximumDays: null,
            dispatchEndDate: null,
            requiredReturnDate: null, // 🆕 v2.3.0: DB 저장된 필수 귀국일
            isLoaded: false
        };
        
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
        this.flightDateValidationTimer = null; // 🆕 v2.2.0
        
        // 전제 조건 시스템 관련 상태
        this.isActivityPeriodCompleted = false;
        this.isActivityPeriodValid = false;
        this.flightSectionEnabled = false;
        
        // 🆕 v3.0.0: 파일 업로드 관련 상태 확장
        this.ticketImageFile = null;
        this.receiptImageFile = null;
        this.uploadedFiles = {
            ticketImage: null,    // Supabase Storage URL
            receiptImage: null    // Supabase Storage URL
        };
        this.uploadInProgress = {
            ticketImage: false,
            receiptImage: false
        };
        
        // 🆕 v3.0.0: 폼 제출 관련 상태
        this.submissionInProgress = false;
        this.submissionAttempts = 0;
        this.maxSubmissionAttempts = 3;
        
        console.log('✅ [티켓모듈] FlightRequestTicket v3.0.0 생성 완료');
        this.init();
    }

    // ================================
    // 파트 2: 🆕 v3.0.0 통합 초기화 + 이미지 업로드 시스템
    // ================================

    init() {
        try {
            console.log('🔄 [티켓모듈] v3.0.0 통합 초기화 시작...');
            
            // 🆕 v2.1.0: 이벤트 시스템 설정 (최우선)
            this.setupEventSystem();
            
            // 기존 초기화
            this.bindEvents();
            this.setupStepNavigation();
            this.loadTicketInfo();
            
            // 🆕 v2.1.0: 초기 항공권 섹션 상태 설정
            this.setInitialFlightSectionState();
            
            // 🆕 v2.2.0: 항공권 날짜 검증 시스템 초기화
            this.initFlightDateValidation();
            
            // 🆕 v3.0.0: 이미지 업로드 시스템 초기화
            this.setupImageUploadEvents();
            
            // 🆕 v3.0.0: 폼 제출 시스템 초기화
            this.setupFormSubmitEvents();
            
            console.log('✅ [티켓모듈] v3.0.0 통합 초기화 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] v3.0.0 초기화 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 이미지 업로드 이벤트 설정 ===
    setupImageUploadEvents() {
        try {
            console.log('🔄 [이미지업로드] v3.0.0: 이미지 업로드 이벤트 설정...');
            
            // 항공권 이미지 업로드 이벤트
            const flightImageInput = document.getElementById('flightImage');
            if (flightImageInput) {
                flightImageInput.addEventListener('change', (event) => {
                    this.handleImageUpload(event, 'ticketImage');
                });
            }
            
            // 영수증 이미지 업로드 이벤트 (선택사항)
            const receiptImageInput = document.getElementById('receiptImage');
            if (receiptImageInput) {
                receiptImageInput.addEventListener('change', (event) => {
                    this.handleImageUpload(event, 'receiptImage');
                });
            }
            
            console.log('✅ [이미지업로드] v3.0.0: 이미지 업로드 이벤트 설정 완료');
            
        } catch (error) {
            console.error('❌ [이미지업로드] v3.0.0: 이미지 업로드 이벤트 설정 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 이미지 파일 업로드 핸들러 ===
    async handleImageUpload(event, imageType) {
        try {
            console.log(`🔄 [이미지핸들러] v3.0.0: ${imageType} 이미지 업로드 처리...`);
            
            const file = event.target.files[0];
            if (!file) {
                console.log(`⚠️ [이미지핸들러] v3.0.0: ${imageType} 파일이 선택되지 않음`);
                return;
            }
            
            // 파일 검증
            const validation = this.validateImageFile(file, imageType);
            if (!validation.valid) {
                this.showImageError(imageType, validation.message);
                event.target.value = ''; // 입력 초기화
                return;
            }
            
            // 파일 저장
            if (imageType === 'ticketImage') {
                this.ticketImageFile = file;
            } else if (imageType === 'receiptImage') {
                this.receiptImageFile = file;
            }
            
            // 미리보기 표시
            this.showImagePreview(file, imageType);
            
            // 성공 피드백
            this.showImageSuccess(imageType, `${file.name} 파일이 선택되었습니다.`);
            
            // 이벤트 발행
            this.emitEvent('imageSelected', {
                imageType: imageType,
                fileName: file.name,
                fileSize: file.size,
                timestamp: Date.now()
            });
            
            console.log(`✅ [이미지핸들러] v3.0.0: ${imageType} 이미지 업로드 처리 완료`);
            
        } catch (error) {
            console.error(`❌ [이미지핸들러] v3.0.0: ${imageType} 이미지 업로드 처리 실패:`, error);
            this.showImageError(imageType, '이미지 처리 중 오류가 발생했습니다.');
        }
    }

    // === 🆕 v3.0.0: 이미지 파일 검증 ===
    validateImageFile(file, imageType) {
        try {
            // 파일 크기 검증 (5MB 제한)
            const maxSize = 5 * 1024 * 1024; // 5MB
            if (file.size > maxSize) {
                return {
                    valid: false,
                    message: '파일 크기는 5MB 이하여야 합니다.'
                };
            }
            
            // 파일 형식 검증
            const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
            if (!allowedTypes.includes(file.type)) {
                return {
                    valid: false,
                    message: 'JPG, PNG, WEBP 형식의 이미지만 업로드 가능합니다.'
                };
            }
            
            // 항공권 이미지 필수 검증
            if (imageType === 'ticketImage') {
                // 추가 검증 로직이 필요하면 여기에 추가
                if (file.size < 1024) { // 1KB 미만
                    return {
                        valid: false,
                        message: '파일이 너무 작습니다. 올바른 항공권 이미지를 업로드해주세요.'
                    };
                }
            }
            
            return {
                valid: true,
                message: '파일 검증 완료'
            };
            
        } catch (error) {
            console.error('❌ [파일검증] v3.0.0: 이미지 파일 검증 실패:', error);
            return {
                valid: false,
                message: '파일 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 이미지 미리보기 표시 ===
    showImagePreview(file, imageType) {
        try {
            console.log(`🔄 [미리보기] v3.0.0: ${imageType} 미리보기 표시...`);
            
            const previewElementId = imageType === 'ticketImage' ? 'flightImagePreview' : 'receiptImagePreview';
            const previewElement = document.getElementById(previewElementId);
            
            if (!previewElement) {
                console.warn(`⚠️ [미리보기] v3.0.0: ${previewElementId} 요소를 찾을 수 없음`);
                return;
            }
            
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    previewElement.innerHTML = `
                        <div class="image-preview-container">
                            <img src="${e.target.result}" alt="${imageType} 미리보기" class="preview-image" />
                            <div class="image-info">
                                <span class="file-name">${file.name}</span>
                                <span class="file-size">${this.formatFileSize(file.size)}</span>
                            </div>
                            <button type="button" class="remove-image-btn" onclick="flightRequestTicket.removeImage('${imageType}')">
                                <i data-lucide="x"></i>
                                제거
                            </button>
                        </div>
                    `;
                    
                    // Lucide 아이콘 새로고침
                    if (typeof lucide !== 'undefined') {
                        lucide.createIcons();
                    }
                    
                    previewElement.style.display = 'block';
                    
                    console.log(`✅ [미리보기] v3.0.0: ${imageType} 미리보기 표시 완료`);
                    
                } catch (error) {
                    console.error(`❌ [미리보기] v3.0.0: ${imageType} 미리보기 렌더링 실패:`, error);
                }
            };
            
            reader.onerror = () => {
                console.error(`❌ [미리보기] v3.0.0: ${imageType} 파일 읽기 실패`);
                this.showImageError(imageType, '이미지 파일을 읽을 수 없습니다.');
            };
            
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error(`❌ [미리보기] v3.0.0: ${imageType} 미리보기 표시 실패:`, error);
        }
    }

    // === 🆕 v3.0.0: 이미지 제거 ===
    removeImage(imageType) {
        try {
            console.log(`🔄 [이미지제거] v3.0.0: ${imageType} 이미지 제거...`);
            
            // 파일 데이터 제거
            if (imageType === 'ticketImage') {
                this.ticketImageFile = null;
                const inputElement = document.getElementById('flightImage');
                if (inputElement) inputElement.value = '';
            } else if (imageType === 'receiptImage') {
                this.receiptImageFile = null;
                const inputElement = document.getElementById('receiptImage');
                if (inputElement) inputElement.value = '';
            }
            
            // 미리보기 제거
            const previewElementId = imageType === 'ticketImage' ? 'flightImagePreview' : 'receiptImagePreview';
            const previewElement = document.getElementById(previewElementId);
            if (previewElement) {
                previewElement.innerHTML = '';
                previewElement.style.display = 'none';
            }
            
            // 오류 메시지 제거
            this.clearImageMessage(imageType);
            
            // 이벤트 발행
            this.emitEvent('imageRemoved', {
                imageType: imageType,
                timestamp: Date.now()
            });
            
            console.log(`✅ [이미지제거] v3.0.0: ${imageType} 이미지 제거 완료`);
            
        } catch (error) {
            console.error(`❌ [이미지제거] v3.0.0: ${imageType} 이미지 제거 실패:`, error);
        }
    }

    // === 🆕 v3.0.0: 이미지 오류 메시지 표시 ===
    showImageError(imageType, message) {
        try {
            const errorElementId = imageType === 'ticketImage' ? 'flightImageError' : 'receiptImageError';
            const errorElement = document.getElementById(errorElementId);
            
            if (errorElement) {
                errorElement.innerHTML = `
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                `;
                errorElement.className = 'image-upload-error-message';
                errorElement.style.display = 'flex';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
        } catch (error) {
            console.error(`❌ [이미지오류표시] v3.0.0: ${imageType} 오류 표시 실패:`, error);
        }
    }

    // === 🆕 v3.0.0: 이미지 성공 메시지 표시 ===
    showImageSuccess(imageType, message) {
        try {
            const successElementId = imageType === 'ticketImage' ? 'flightImageSuccess' : 'receiptImageSuccess';
            const successElement = document.getElementById(successElementId);
            
            if (successElement) {
                successElement.innerHTML = `
                    <i data-lucide="check-circle"></i>
                    <span>${message}</span>
                `;
                successElement.className = 'image-upload-success-message';
                successElement.style.display = 'flex';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // 3초 후 자동 숨김
                setTimeout(() => {
                    if (successElement) {
                        successElement.style.display = 'none';
                    }
                }, 3000);
            }
            
        } catch (error) {
            console.error(`❌ [이미지성공표시] v3.0.0: ${imageType} 성공 표시 실패:`, error);
        }
    }

    // === 🆕 v3.0.0: 이미지 메시지 제거 ===
    clearImageMessage(imageType) {
        try {
            const errorElementId = imageType === 'ticketImage' ? 'flightImageError' : 'receiptImageError';
            const successElementId = imageType === 'ticketImage' ? 'flightImageSuccess' : 'receiptImageSuccess';
            
            const errorElement = document.getElementById(errorElementId);
            const successElement = document.getElementById(successElementId);
            
            if (errorElement) {
                errorElement.style.display = 'none';
                errorElement.innerHTML = '';
            }
            
            if (successElement) {
                successElement.style.display = 'none';
                successElement.innerHTML = '';
            }
            
        } catch (error) {
            console.error(`❌ [메시지제거] v3.0.0: ${imageType} 메시지 제거 실패:`, error);
        }
    }

    // === 🆕 v3.0.0: 파일 크기 포맷팅 헬퍼 ===
    formatFileSize(bytes) {
        try {
            if (bytes === 0) return '0 Bytes';
            
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            
        } catch (error) {
            console.error('❌ [파일크기포맷] v3.0.0: 파일 크기 포맷팅 실패:', error);
            return 'Unknown';
        }
    }

    // ================================
    // 파트 3: 🆕 v3.0.0 폼 제출 시스템
    // ================================

    // === 🆕 v3.0.0: 폼 제출 이벤트 설정 ===
    setupFormSubmitEvents() {
        try {
            console.log('🔄 [폼제출] v3.0.0: 폼 제출 이벤트 설정...');
            
            // 메인 폼 제출 이벤트
            const flightRequestForm = document.getElementById('flightRequestForm');
            if (flightRequestForm) {
                flightRequestForm.addEventListener('submit', (event) => {
                    this.handleFormSubmit(event);
                });
            }
            
            // 제출 버튼 클릭 이벤트 (추가 보안)
            const submitBtn = document.getElementById('submitBtn');
            if (submitBtn) {
                submitBtn.addEventListener('click', (event) => {
                    if (!flightRequestForm) {
                        event.preventDefault();
                        this.handleFormSubmit(event);
                    }
                });
            }
            
            console.log('✅ [폼제출] v3.0.0: 폼 제출 이벤트 설정 완료');
            
        } catch (error) {
            console.error('❌ [폼제출] v3.0.0: 폼 제출 이벤트 설정 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 통합 폼 제출 핸들러 ===
    async handleFormSubmit(event) {
        try {
            console.log('🔄 [폼제출핸들러] v3.0.0: 폼 제출 처리 시작...');
            
            // 기본 폼 제출 방지
            event.preventDefault();
            
            // 중복 제출 방지
            if (this.submissionInProgress) {
                console.log('⚠️ [폼제출핸들러] v3.0.0: 이미 제출 진행 중 - 무시');
                return;
            }
            
            // 제출 시도 횟수 확인
            if (this.submissionAttempts >= this.maxSubmissionAttempts) {
                this.showSubmissionError('제출 시도 횟수를 초과했습니다. 페이지를 새로고침 후 다시 시도해주세요.');
                return;
            }
            
            this.submissionInProgress = true;
            this.submissionAttempts++;
            
            // UI 업데이트 (로딩 상태)
            this.updateSubmissionUI('loading');
            
            // 전체 데이터 검증
            const validationResult = this.validateAllDataForSubmission();
            if (!validationResult.valid) {
                this.showSubmissionError(validationResult.message);
                this.submissionInProgress = false;
                this.updateSubmissionUI('idle');
                return;
            }
            
            // 제출 프로세스 실행
            const result = await this.submitFlightRequestData();
            
            if (result.success) {
                this.showSubmissionSuccess(result.message);
                this.updateSubmissionUI('success');
                
                // 성공 후 처리
                this.handleSubmissionSuccess(result.data);
                
            } else {
                this.showSubmissionError(result.message);
                this.updateSubmissionUI('error');
            }
            
        } catch (error) {
            console.error('❌ [폼제출핸들러] v3.0.0: 폼 제출 처리 실패:', error);
            this.showSubmissionError('제출 중 예상치 못한 오류가 발생했습니다.');
            this.updateSubmissionUI('error');
        } finally {
            this.submissionInProgress = false;
        }
    }

    // === 🆕 v3.0.0: 제출용 전체 데이터 검증 ===
    validateAllDataForSubmission() {
        try {
            console.log('🔄 [제출검증] v3.0.0: 제출용 전체 데이터 검증...');
            
            // 활동기간 검증
            const activityValidation = this.validateActivityPeriod();
            if (!activityValidation.valid) {
                return {
                    valid: false,
                    message: `활동기간 오류: ${activityValidation.message}`
                };
            }
            
            // 항공권 날짜 검증 (활동기간 + required_return_date 기반)
            const flightDateValidation = this.validateFlightDatesWithActivity();
            if (!flightDateValidation.valid) {
                return {
                    valid: false,
                    message: `항공권 날짜 오류: ${flightDateValidation.message}`
                };
            }
            
            // 항공권 정보 검증
            const flightInfoValidation = this.validateFlightInfo();
            if (!flightInfoValidation.valid) {
                return {
                    valid: false,
                    message: `항공권 정보 오류: ${flightInfoValidation.message}`
                };
            }
            
            // 가격 정보 검증
            const priceValidation = this.validatePriceInfo();
            if (!priceValidation.valid) {
                return {
                    valid: false,
                    message: `가격 정보 오류: ${priceValidation.message}`
                };
            }
            
            // 필수 파일 검증
            if (!this.ticketImageFile) {
                return {
                    valid: false,
                    message: '항공권 이미지를 업로드해주세요.'
                };
            }
            
            // 구매 방식 검증
            const purchaseMethod = document.querySelector('input[name="purchaseMethod"]:checked');
            if (!purchaseMethod) {
                return {
                    valid: false,
                    message: '구매 방식을 선택해주세요.'
                };
            }
            
            console.log('✅ [제출검증] v3.0.0: 제출용 전체 데이터 검증 완료');
            return {
                valid: true,
                message: '모든 데이터 검증 완료'
            };
            
        } catch (error) {
            console.error('❌ [제출검증] v3.0.0: 제출용 전체 데이터 검증 실패:', error);
            return {
                valid: false,
                message: '데이터 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 항공권 정보 검증 ===
    validateFlightInfo() {
        try {
            const departureAirport = document.getElementById('departureAirport')?.value?.trim();
            const arrivalAirport = document.getElementById('arrivalAirport')?.value?.trim();
            const airline = document.getElementById('airline')?.value?.trim();
            
            if (!departureAirport) {
                return {
                    valid: false,
                    message: '출발 공항을 입력해주세요.'
                };
            }
            
            if (!arrivalAirport) {
                return {
                    valid: false,
                    message: '도착 공항을 입력해주세요.'
                };
            }
            
            if (!airline) {
                return {
                    valid: false,
                    message: '항공사를 입력해주세요.'
                };
            }
            
            return {
                valid: true,
                message: '항공권 정보 검증 완료'
            };
            
        } catch (error) {
            console.error('❌ [항공권정보검증] v3.0.0: 검증 실패:', error);
            return {
                valid: false,
                message: '항공권 정보 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 가격 정보 검증 ===
    validatePriceInfo() {
        try {
            const ticketPrice = document.getElementById('ticketPrice')?.value?.trim();
            const currency = document.getElementById('currency')?.value?.trim();
            
            if (!ticketPrice) {
                return {
                    valid: false,
                    message: '항공권 가격을 입력해주세요.'
                };
            }
            
            const priceNumber = parseFloat(ticketPrice);
            if (isNaN(priceNumber) || priceNumber <= 0) {
                return {
                    valid: false,
                    message: '올바른 가격을 입력해주세요.'
                };
            }
            
            if (!currency) {
                return {
                    valid: false,
                    message: '통화를 선택해주세요.'
                };
            }
            
            return {
                valid: true,
                message: '가격 정보 검증 완료'
            };
            
        } catch (error) {
            console.error('❌ [가격정보검증] v3.0.0: 검증 실패:', error);
            return {
                valid: false,
                message: '가격 정보 검증 중 오류가 발생했습니다.'
            };
        }
    }

    // ================================
    // 파트 4: 🆕 v3.0.0 데이터베이스 저장 및 파일 업로드
    // ================================

    // === 🆕 v3.0.0: 통합 데이터 제출 로직 ===
    async submitFlightRequestData() {
        try {
            console.log('🔄 [데이터제출] v3.0.0: 항공권 신청 데이터 제출 시작...');
            
            // 1단계: 이미지 파일 업로드
            const imageUploadResult = await this.uploadImagesToStorage();
            if (!imageUploadResult.success) {
                return {
                    success: false,
                    message: `이미지 업로드 실패: ${imageUploadResult.message}`
                };
            }
            
            // 2단계: 폼 데이터 수집
            const formData = this.collectFormData();
            if (!formData) {
                return {
                    success: false,
                    message: '폼 데이터 수집 실패'
                };
            }
            
            // 3단계: 업로드된 이미지 URL 추가
            formData.flight_ticket_image_url = imageUploadResult.data.ticketImageUrl;
            if (imageUploadResult.data.receiptImageUrl) {
                formData.receipt_image_url = imageUploadResult.data.receiptImageUrl;
            }
            
            // 4단계: 데이터베이스 저장
            const saveResult = await this.saveToDatabase(formData);
            if (!saveResult.success) {
                return {
                    success: false,
                    message: `데이터베이스 저장 실패: ${saveResult.message}`
                };
            }
            
            console.log('✅ [데이터제출] v3.0.0: 항공권 신청 데이터 제출 완료');
            return {
                success: true,
                message: '항공권 신청이 성공적으로 완료되었습니다.',
                data: saveResult.data
            };
            
        } catch (error) {
            console.error('❌ [데이터제출] v3.0.0: 항공권 신청 데이터 제출 실패:', error);
            return {
                success: false,
                message: '제출 중 예상치 못한 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 이미지 Supabase Storage 업로드 ===
    async uploadImagesToStorage() {
        try {
            console.log('🔄 [이미지업로드] v3.0.0: Supabase Storage 업로드 시작...');
            
            const uploadResults = {
                ticketImageUrl: null,
                receiptImageUrl: null
            };
            
            // 항공권 이미지 업로드 (필수)
            if (this.ticketImageFile) {
                this.uploadInProgress.ticketImage = true;
                
                const ticketResult = await this.uploadFileToSupabase(
                    this.ticketImageFile, 
                    'flight-tickets', 
                    'ticketImage'
                );
                
                this.uploadInProgress.ticketImage = false;
                
                if (!ticketResult.success) {
                    return {
                        success: false,
                        message: `항공권 이미지 업로드 실패: ${ticketResult.message}`
                    };
                }
                
                uploadResults.ticketImageUrl = ticketResult.data.publicUrl;
                this.uploadedFiles.ticketImage = ticketResult.data.publicUrl;
            } else {
                return {
                    success: false,
                    message: '항공권 이미지가 선택되지 않았습니다.'
                };
            }
            
            // 영수증 이미지 업로드 (선택사항)
            if (this.receiptImageFile) {
                this.uploadInProgress.receiptImage = true;
                
                const receiptResult = await this.uploadFileToSupabase(
                    this.receiptImageFile, 
                    'flight-receipts', 
                    'receiptImage'
                );
                
                this.uploadInProgress.receiptImage = false;
                
                if (receiptResult.success) {
                    uploadResults.receiptImageUrl = receiptResult.data.publicUrl;
                    this.uploadedFiles.receiptImage = receiptResult.data.publicUrl;
                } else {
                    console.warn('⚠️ [이미지업로드] v3.0.0: 영수증 이미지 업로드 실패 (선택사항):', receiptResult.message);
                }
            }
            
            console.log('✅ [이미지업로드] v3.0.0: Supabase Storage 업로드 완료');
            return {
                success: true,
                message: '이미지 업로드 완료',
                data: uploadResults
            };
            
        } catch (error) {
            console.error('❌ [이미지업로드] v3.0.0: Supabase Storage 업로드 실패:', error);
            
            // 업로드 진행 상태 초기화
            this.uploadInProgress.ticketImage = false;
            this.uploadInProgress.receiptImage = false;
            
            return {
                success: false,
                message: '이미지 업로드 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 개별 파일 Supabase 업로드 ===
    async uploadFileToSupabase(file, bucket, fileType) {
        try {
            if (!this.apiService || !this.apiService.uploadFile) {
                throw new Error('API 서비스를 사용할 수 없습니다.');
            }
            
            // 고유 파일명 생성
            const timestamp = Date.now();
            const randomString = Math.random().toString(36).substring(2, 15);
            const fileExtension = file.name.split('.').pop();
            const fileName = `${fileType}_${timestamp}_${randomString}.${fileExtension}`;
            
            console.log(`🔄 [파일업로드] v3.0.0: ${fileType} 파일 업로드 중... (${fileName})`);
            
            // API 서비스를 통한 파일 업로드
            const result = await this.apiService.uploadFile(file, bucket, fileName);
            
            if (result.success) {
                console.log(`✅ [파일업로드] v3.0.0: ${fileType} 파일 업로드 완료`);
                return {
                    success: true,
                    message: '파일 업로드 완료',
                    data: {
                        publicUrl: result.data.publicUrl,
                        fileName: fileName,
                        bucket: bucket
                    }
                };
            } else {
                throw new Error(result.message || '파일 업로드 실패');
            }
            
        } catch (error) {
            console.error(`❌ [파일업로드] v3.0.0: ${fileType} 파일 업로드 실패:`, error);
            return {
                success: false,
                message: error.message || '파일 업로드 중 오류가 발생했습니다.'
            };
        }
    }

    // === 🆕 v3.0.0: 폼 데이터 수집 ===
    collectFormData() {
        try {
            console.log('🔄 [데이터수집] v3.0.0: 폼 데이터 수집 시작...');
            
            // 사용자 ID (로컬 스토리지에서 가져오기)
            const userData = JSON.parse(localStorage.getItem('userData') || '{}');
            const userId = userData.id;
            
            if (!userId) {
                throw new Error('사용자 정보를 찾을 수 없습니다.');
            }
            
            // 구매 방식
            const purchaseMethod = document.querySelector('input[name="purchaseMethod"]:checked')?.value;
            
            const formData = {
                user_id: userId,
                
                // 활동기간
                actual_arrival_date: document.getElementById('actualArrivalDate')?.value,
                actual_work_end_date: document.getElementById('actualWorkEndDate')?.value,
                actual_activity_days: this.ticketData.calculatedActivityDays,
                
                // 항공권 날짜
                departure_date: document.getElementById('departureDate')?.value,
                return_date: document.getElementById('returnDate')?.value,
                departure_time: document.getElementById('departureTime')?.value,
                return_time: document.getElementById('returnTime')?.value,
                
                // 공항 정보
                departure_airport: document.getElementById('departureAirport')?.value?.trim(),
                return_airport: document.getElementById('arrivalAirport')?.value?.trim(),
                
                // 항공사 정보
                airline: document.getElementById('airline')?.value?.trim(),
                
                // 가격 정보
                total_price: parseFloat(document.getElementById('ticketPrice')?.value || 0),
                currency: document.getElementById('currency')?.value,
                price_source: document.getElementById('priceSource')?.value?.trim(),
                
                // 구매 방식
                purchase_method: purchaseMethod,
                purchase_link: document.getElementById('purchaseLink')?.value?.trim(),
                
                // 메타데이터
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                
                // 상태 정보
                status: 'submitted',
                is_validated: false
            };
            
            console.log('✅ [데이터수집] v3.0.0: 폼 데이터 수집 완료');
            return formData;
            
        } catch (error) {
            console.error('❌ [데이터수집] v3.0.0: 폼 데이터 수집 실패:', error);
            return null;
        }
    }

    // === 🆕 v3.0.0: 데이터베이스 저장 ===
    async saveToDatabase(formData) {
        try {
            console.log('🔄 [DB저장] v3.0.0: 데이터베이스 저장 시작...');
            
            if (!this.apiService || !this.apiService.insertData) {
                throw new Error('API 서비스를 사용할 수 없습니다.');
            }
            
            // flight_requests 테이블에 데이터 저장
            const result = await this.apiService.insertData('flight_requests', formData);
            
            if (result.success) {
                console.log('✅ [DB저장] v3.0.0: 데이터베이스 저장 완료');
                return {
                    success: true,
                    message: '데이터가 성공적으로 저장되었습니다.',
                    data: result.data
                };
            } else {
                throw new Error(result.message || '데이터베이스 저장 실패');
            }
            
        } catch (error) {
            console.error('❌ [DB저장] v3.0.0: 데이터베이스 저장 실패:', error);
            return {
                success: false,
                message: error.message || '데이터베이스 저장 중 오류가 발생했습니다.'
            };
        }
    }

    // ================================
    // 파트 5: 🆕 v3.0.0 제출 UI 및 피드백 시스템
    // ================================

    // === 🆕 v3.0.0: 제출 UI 상태 업데이트 ===
    updateSubmissionUI(status) {
        try {
            const submitBtn = document.getElementById('submitBtn');
            const loadingIndicator = document.getElementById('submissionLoading');
            
            if (!submitBtn) return;
            
            switch (status) {
                case 'loading':
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `
                        <i data-lucide="loader-2" class="animate-spin"></i>
                        제출 중...
                    `;
                    submitBtn.classList.add('loading');
                    
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'flex';
                    }
                    break;
                    
                case 'success':
                    submitBtn.disabled = true;
                    submitBtn.innerHTML = `
                        <i data-lucide="check"></i>
                        제출 완료
                    `;
                    submitBtn.classList.remove('loading');
                    submitBtn.classList.add('success');
                    
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    break;
                    
                case 'error':
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `
                        <i data-lucide="send"></i>
                        다시 제출
                    `;
                    submitBtn.classList.remove('loading', 'success');
                    submitBtn.classList.add('error');
                    
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    break;
                    
                case 'idle':
                default:
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = `
                        <i data-lucide="send"></i>
                        항공권 신청 제출
                    `;
                    submitBtn.classList.remove('loading', 'success', 'error');
                    
                    if (loadingIndicator) {
                        loadingIndicator.style.display = 'none';
                    }
                    break;
            }
            
            // Lucide 아이콘 새로고침
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
        } catch (error) {
            console.error('❌ [제출UI] v3.0.0: 제출 UI 업데이트 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 제출 성공 메시지 표시 ===
    showSubmissionSuccess(message) {
        try {
            console.log('🎉 [제출성공] v3.0.0: 제출 성공 처리');
            
            const successElement = document.getElementById('submissionSuccess');
            if (successElement) {
                successElement.innerHTML = `
                    <div class="submission-success-content">
                        <i data-lucide="check-circle"></i>
                        <h3>항공권 신청 완료!</h3>
                        <p>${message}</p>
                        <div class="success-actions">
                            <button type="button" onclick="location.href='/student'" class="btn-primary">
                                <i data-lucide="home"></i>
                                메인으로 돌아가기
                            </button>
                            <button type="button" onclick="window.print()" class="btn-secondary">
                                <i data-lucide="printer"></i>
                                신청서 출력
                            </button>
                        </div>
                    </div>
                `;
                successElement.className = 'submission-success-message';
                successElement.style.display = 'block';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
            }
            
            // 폼 숨기기
            const formElement = document.getElementById('flightRequestForm');
            if (formElement) {
                formElement.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ [제출성공] v3.0.0: 제출 성공 메시지 표시 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 제출 실패 메시지 표시 ===
    showSubmissionError(message) {
        try {
            console.log('❌ [제출실패] v3.0.0: 제출 실패 처리:', message);
            
            const errorElement = document.getElementById('submissionError');
            if (errorElement) {
                errorElement.innerHTML = `
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                `;
                errorElement.className = 'submission-error-message';
                errorElement.style.display = 'flex';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // 5초 후 자동 숨김
                setTimeout(() => {
                    if (errorElement) {
                        errorElement.style.display = 'none';
                    }
                }, 5000);
            }
            
            // 페이지 상단으로 스크롤
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
        } catch (error) {
            console.error('❌ [제출실패] v3.0.0: 제출 실패 메시지 표시 실패:', error);
        }
    }

    // === 🆕 v3.0.0: 제출 성공 후 처리 ===
    handleSubmissionSuccess(submissionData) {
        try {
            console.log('🎉 [제출성공처리] v3.0.0: 제출 성공 후 처리...');
            
            // 로컬 상태 업데이트
            this.submissionAttempts = 0;
            this.submissionInProgress = false;
            
            // 이벤트 발행
            this.emitEvent('submissionCompleted', {
                success: true,
                data: submissionData,
                timestamp: Date.now()
            });
            
            // 조정자에게 알림
            if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.handleSubmissionCompleted === 'function') {
                window.flightRequestCoordinator.handleSubmissionCompleted({
                    success: true,
                    data: submissionData
                });
            }
            
            console.log('✅ [제출성공처리] v3.0.0: 제출 성공 후 처리 완료');
            
        } catch (error) {
            console.error('❌ [제출성공처리] v3.0.0: 제출 성공 후 처리 실패:', error);
        }
    }

    // ================================
    // 파트 6: 기존 v2.3.0 메서드들 유지 (검증 로직)
    // ================================

    // === 🆕 v2.2.0: 항공권 날짜 검증 시스템 초기화 ===
    initFlightDateValidation() {
        try {
            console.log('🔄 [항공권검증] v2.3.0: 날짜 검증 시스템 초기화...');
            
            // 검증 UI 요소 생성
            this.createFlightDateValidationUI();
            
            // 검증 이벤트 리스너 추가
            this.setupFlightDateValidationEvents();
            
            console.log('✅ [항공권검증] v2.3.0: 날짜 검증 시스템 초기화 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증] v2.3.0: 날짜 검증 시스템 초기화 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 UI 생성 ===
    createFlightDateValidationUI() {
        try {
            console.log('🔄 [항공권검증UI] v2.3.0: 검증 UI 요소 생성...');
            
            // 출국일 오류 메시지 영역 생성
            const departureDateInput = document.getElementById('departureDate');
            if (departureDateInput && !document.getElementById('departureDateError')) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'departureDateError';
                errorDiv.className = 'flight-date-error-message';
                errorDiv.style.display = 'none';
                departureDateInput.parentNode.insertBefore(errorDiv, departureDateInput.nextSibling);
            }
            
            // 귀국일 오류 메시지 영역 생성
            const returnDateInput = document.getElementById('returnDate');
            if (returnDateInput && !document.getElementById('returnDateError')) {
                const errorDiv = document.createElement('div');
                errorDiv.id = 'returnDateError';
                errorDiv.className = 'flight-date-error-message';
                errorDiv.style.display = 'none';
                returnDateInput.parentNode.insertBefore(errorDiv, returnDateInput.nextSibling);
            }
            
            // CSS 스타일 추가
            this.addFlightDateValidationStyles();
            
            console.log('✅ [항공권검증UI] v2.3.0: 검증 UI 요소 생성 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증UI] v2.3.0: 검증 UI 요소 생성 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 스타일 추가 ===
    addFlightDateValidationStyles() {
        try {
            const styleId = 'flightDateValidationStyles';
            if (document.getElementById(styleId)) return;
            
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
                .flight-date-error-message, .image-upload-error-message, .submission-error-message {
                    color: #dc3545;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    padding: 0.5rem;
                    background-color: #f8d7da;
                    border: 1px solid #f5c6cb;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .image-upload-success-message, .submission-success-message {
                    color: #155724;
                    font-size: 0.875rem;
                    margin-top: 0.25rem;
                    padding: 0.5rem;
                    background-color: #d4edda;
                    border: 1px solid #c3e6cb;
                    border-radius: 0.375rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                .submission-success-message {
                    padding: 2rem;
                    text-align: center;
                    background: linear-gradient(135deg, #d4edda 0%, #c3e6cb 100%);
                }
                
                .submission-success-content h3 {
                    margin: 1rem 0;
                    color: #155724;
                    font-size: 1.5rem;
                }
                
                .success-actions {
                    margin-top: 1.5rem;
                    display: flex;
                    gap: 1rem;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                
                .flight-date-input-error {
                    border-color: #dc3545 !important;
                    box-shadow: 0 0 0 0.2rem rgba(220, 53, 69, 0.25) !important;
                }
                
                .flight-date-input-valid {
                    border-color: #28a745 !important;
                    box-shadow: 0 0 0 0.2rem rgba(40, 167, 69, 0.25) !important;
                }
                
                .image-preview-container {
                    position: relative;
                    display: inline-block;
                    margin: 0.5rem 0;
                }
                
                .preview-image {
                    max-width: 200px;
                    max-height: 150px;
                    border-radius: 0.375rem;
                    border: 1px solid #dee2e6;
                }
                
                .image-info {
                    display: flex;
                    flex-direction: column;
                    margin: 0.5rem 0;
                    font-size: 0.875rem;
                    color: #6c757d;
                }
                
                .remove-image-btn {
                    background: #dc3545;
                    color: white;
                    border: none;
                    padding: 0.25rem 0.5rem;
                    border-radius: 0.25rem;
                    font-size: 0.75rem;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    gap: 0.25rem;
                    margin-top: 0.5rem;
                }
                
                .remove-image-btn:hover {
                    background: #c82333;
                }
                
                #submitBtn.loading {
                    background: #6c757d;
                    cursor: wait;
                }
                
                #submitBtn.success {
                    background: #28a745;
                }
                
                #submitBtn.error {
                    background: #dc3545;
                }
                
                .animate-spin {
                    animation: spin 1s linear infinite;
                }
                
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
            
        } catch (error) {
            console.error('❌ [항공권검증스타일] v2.3.0: 스타일 추가 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 항공권 날짜 검증 이벤트 설정 ===
    setupFlightDateValidationEvents() {
        try {
            console.log('🔄 [항공권검증이벤트] v2.3.0: 검증 이벤트 설정...');
            
            // 출국일 검증 이벤트
            const departureDateInput = document.getElementById('departureDate');
            if (departureDateInput) {
                departureDateInput.addEventListener('input', () => {
                    this.debouncedFlightDateValidation('departure');
                });
                departureDateInput.addEventListener('change', () => {
                    this.validateFlightDateImmediate('departure');
                });
                departureDateInput.addEventListener('blur', () => {
                    this.validateFlightDateImmediate('departure');
                });
            }
            
            // 귀국일 검증 이벤트
            const returnDateInput = document.getElementById('returnDate');
            if (returnDateInput) {
                returnDateInput.addEventListener('input', () => {
                    this.debouncedFlightDateValidation('return');
                });
                returnDateInput.addEventListener('change', () => {
                    this.validateFlightDateImmediate('return');
                });
                returnDateInput.addEventListener('blur', () => {
                    this.validateFlightDateImmediate('return');
                });
            }
            
            console.log('✅ [항공권검증이벤트] v2.3.0: 검증 이벤트 설정 완료');
            
        } catch (error) {
            console.error('❌ [항공권검증이벤트] v2.3.0: 검증 이벤트 설정 실패:', error);
        }
    }

    // ================================
    // 파트 7: 기존 검증 로직들 유지
    // ================================

    // === 🆕 v2.2.0: 디바운스된 항공권 날짜 검증 ===
    debouncedFlightDateValidation(dateType) {
        try {
            if (this.flightDateValidationTimer) {
                clearTimeout(this.flightDateValidationTimer);
            }
            
            this.flightDateValidationTimer = setTimeout(() => {
                this.validateFlightDateImmediate(dateType);
            }, 300);
            
        } catch (error) {
            console.error(`❌ [디바운스검증] v2.3.0: ${dateType} 검증 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 즉시 항공권 날짜 검증 ===
    validateFlightDateImmediate(dateType) {
        try {
            console.log(`🔄 [즉시검증] v2.3.0: ${dateType} 날짜 검증...`);
            
            // 활동기간 데이터 확인
            if (!this.ticketData.actualArrivalDate || !this.ticketData.actualWorkEndDate) {
                console.log('⚠️ [즉시검증] v2.3.0: 활동기간 데이터 없음 - 검증 스킵');
                return;
            }
            
            if (dateType === 'departure') {
                this.validateDepartureDate();
            } else if (dateType === 'return') {
                this.validateReturnDate();
            }
            
            // 전체 검증 상태 업데이트
            this.updateOverallFlightDateValidation();
            
        } catch (error) {
            console.error(`❌ [즉시검증] v2.3.0: ${dateType} 검증 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 출국일 검증 ===
    validateDepartureDate() {
        try {
            const departureDateInput = document.getElementById('departureDate');
            const departureDateError = document.getElementById('departureDateError');
            
            if (!departureDateInput || !departureDateError) return;
            
            const departureDate = departureDateInput.value;
            if (!departureDate) {
                this.clearValidationMessage('departure');
                return;
            }
            
            const departure = new Date(departureDate);
            const arrival = new Date(this.ticketData.actualArrivalDate);
            
            // 검증 범위 계산: (현지 도착일 -2일) < 출국일 < 현지 도착일
            const minDepartureDate = new Date(arrival);
            minDepartureDate.setDate(arrival.getDate() - 2);
            const maxDepartureDate = arrival;
            
            // 검증 범위 저장
            this.flightDateValidation.validationRanges.departure = {
                min: minDepartureDate,
                max: maxDepartureDate
            };
            
            // 검증 수행
            if (departure <= minDepartureDate) {
                this.showValidationError('departure', 
                    `출국일은 현지 도착일(${this.formatDate(arrival)}) 2일 전인 ${this.formatDate(minDepartureDate)} 이후여야 합니다.`);
                this.flightDateValidation.departureValid = false;
            } else if (departure >= maxDepartureDate) {
                this.showValidationError('departure', 
                    `출국일은 현지 도착일(${this.formatDate(arrival)}) 이전이어야 합니다.`);
                this.flightDateValidation.departureValid = false;
            } else {
                this.clearValidationMessage('departure');
                this.flightDateValidation.departureValid = true;
            }
            
            // ticketData 업데이트
            this.ticketData.departureDate = departureDate;
            
            console.log(`✅ [출국일검증] v2.3.0: 검증 완료 - ${this.flightDateValidation.departureValid ? '유효' : '무효'}`);
            
        } catch (error) {
            console.error('❌ [출국일검증] v2.3.0: 검증 실패:', error);
            this.flightDateValidation.departureValid = false;
        }
    }

    // === 🔧 v2.3.0: 귀국일 검증 (required_return_date 추가) ===
    validateReturnDate() {
        try {
            const returnDateInput = document.getElementById('returnDate');
            const returnDateError = document.getElementById('returnDateError');
            
            if (!returnDateInput || !returnDateError) return;
            
            const returnDate = returnDateInput.value;
            if (!returnDate) {
                this.clearValidationMessage('return');
                return;
            }
            
            const returnD = new Date(returnDate);
            const workEnd = new Date(this.ticketData.actualWorkEndDate);
            
            // 🆕 v2.3.0: required_return_date 검증 (우선순위 1)
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                
                if (returnD > requiredReturnDate) {
                    this.showValidationError('return', 
                        `귀국일은 필수 귀국일(${this.formatDate(requiredReturnDate)}) 이전이어야 합니다.`);
                    this.flightDateValidation.returnValid = false;
                    this.ticketData.returnDate = returnDate;
                    return; // 가장 제한적인 조건이므로 여기서 종료
                }
            }
            
            // 기존 검증 범위 계산: 학당 근무 종료일 < 귀국일 < (학당 근무 종료일 +10일)
            const minReturnDate = workEnd;
            const maxReturnDate = new Date(workEnd);
            maxReturnDate.setDate(workEnd.getDate() + 10);
            
            // 🔧 v2.3.0: required_return_date와 기존 범위 중 더 제한적인 것 선택
            let effectiveMaxReturnDate = maxReturnDate;
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (requiredReturnDate < maxReturnDate) {
                    effectiveMaxReturnDate = requiredReturnDate;
                }
            }
            
            // 검증 범위 저장 (효과적인 최대 날짜로 업데이트)
            this.flightDateValidation.validationRanges.return = {
                min: minReturnDate,
                max: effectiveMaxReturnDate
            };
            
            // 검증 수행
            if (returnD <= minReturnDate) {
                this.showValidationError('return', 
                    `귀국일은 학당 근무 종료일(${this.formatDate(workEnd)}) 이후여야 합니다.`);
                this.flightDateValidation.returnValid = false;
            } else if (returnD > effectiveMaxReturnDate) {
                // 🆕 v2.3.0: 어떤 제한조건에 의해 거부되었는지 명확히 표시
                if (this.userRequirements.requiredReturnDate && effectiveMaxReturnDate.getTime() === new Date(this.userRequirements.requiredReturnDate).getTime()) {
                    this.showValidationError('return', 
                        `귀국일은 필수 귀국일(${this.formatDate(effectiveMaxReturnDate)}) 이전이어야 합니다.`);
                } else {
                    this.showValidationError('return', 
                        `귀국일은 학당 근무 종료일(${this.formatDate(workEnd)}) 10일 이내인 ${this.formatDate(effectiveMaxReturnDate)} 이전이어야 합니다.`);
                }
                this.flightDateValidation.returnValid = false;
            } else {
                this.clearValidationMessage('return');
                this.flightDateValidation.returnValid = true;
            }
            
            // ticketData 업데이트
            this.ticketData.returnDate = returnDate;
            
            console.log(`✅ [귀국일검증] v2.3.0: 검증 완료 - ${this.flightDateValidation.returnValid ? '유효' : '무효'}`);
            
        } catch (error) {
            console.error('❌ [귀국일검증] v2.3.0: 검증 실패:', error);
            this.flightDateValidation.returnValid = false;
        }
    }

    // === 🆕 v2.2.0: 검증 오류 메시지 표시 ===
    showValidationError(dateType, message) {
        try {
            const inputElement = document.getElementById(dateType === 'departure' ? 'departureDate' : 'returnDate');
            const errorElement = document.getElementById(dateType === 'departure' ? 'departureDateError' : 'returnDateError');
            
            if (inputElement && errorElement) {
                // 입력 필드 스타일 업데이트
                inputElement.classList.remove('flight-date-input-valid');
                inputElement.classList.add('flight-date-input-error');
                
                // 오류 메시지 표시
                errorElement.innerHTML = `
                    <i data-lucide="alert-circle"></i>
                    <span>${message}</span>
                `;
                errorElement.style.display = 'flex';
                
                // Lucide 아이콘 새로고침
                if (typeof lucide !== 'undefined') {
                    lucide.createIcons();
                }
                
                // 검증 오류 저장
                this.flightDateValidation.validationErrors[dateType] = message;
            }
            
        } catch (error) {
            console.error(`❌ [검증오류표시] v2.3.0: ${dateType} 오류 표시 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 검증 메시지 제거 (조용한 성공) ===
    clearValidationMessage(dateType) {
        try {
            const inputElement = document.getElementById(dateType === 'departure' ? 'departureDate' : 'returnDate');
            const errorElement = document.getElementById(dateType === 'departure' ? 'departureDateError' : 'returnDateError');
            
            if (inputElement && errorElement) {
                // 입력 필드 스타일 업데이트 (조용한 성공)
                inputElement.classList.remove('flight-date-input-error');
                // 성공 스타일도 추가하지 않음 (조용한 성공)
                
                // 오류 메시지 숨김
                errorElement.style.display = 'none';
                errorElement.innerHTML = '';
                
                // 검증 오류 제거
                this.flightDateValidation.validationErrors[dateType] = null;
            }
            
        } catch (error) {
            console.error(`❌ [검증메시지제거] v2.3.0: ${dateType} 메시지 제거 실패:`, error);
        }
    }

    // === 🆕 v2.2.0: 전체 항공권 날짜 검증 상태 업데이트 ===
    updateOverallFlightDateValidation() {
        try {
            this.flightDateValidation.lastValidationTime = Date.now();
            
            // 전체 검증 상태 확인
            const overallValid = this.flightDateValidation.departureValid && 
                               this.flightDateValidation.returnValid;
            
            // 검증 결과 이벤트 발행
            this.emitEvent('flightDateValidationUpdated', {
                departureValid: this.flightDateValidation.departureValid,
                returnValid: this.flightDateValidation.returnValid,
                overallValid: overallValid,
                validationErrors: this.flightDateValidation.validationErrors,
                validationRanges: this.flightDateValidation.validationRanges,
                timestamp: this.flightDateValidation.lastValidationTime
            });
            
            console.log(`✅ [전체검증상태] v2.3.0: 업데이트 완료 - ${overallValid ? '전체 유효' : '일부 무효'}`);
            
        } catch (error) {
            console.error('❌ [전체검증상태] v2.3.0: 업데이트 실패:', error);
        }
    }

    // === 🆕 v2.2.0: 날짜 포맷 헬퍼 ===
    formatDate(date) {
        try {
            if (!date) return '';
            
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            
            return `${year}-${month}-${day}`;
            
        } catch (error) {
            console.error('❌ [날짜포맷] v2.3.0: 포맷 실패:', error);
            return '';
        }
    }

    // ================================
    // 파트 8: 기존 메서드들 유지 (이벤트 시스템 등)
    // ================================

    // === 🆕 v2.1.0: 이벤트 시스템 설정 ===
    setupEventSystem() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 이벤트 시스템 설정...');
            
            // 1. 초기화 모듈 이벤트 구독
            this.subscribeToInitModuleEvents();
            
            // 2. 조정자 이벤트 구독
            this.subscribeToCoordinatorEvents();
            
            // 3. 전역 이벤트 시스템 연결
            this.connectToGlobalEventSystem();
            
            this.isEventSystemSetup = true;
            console.log('✅ [티켓모듈] v2.1.0: 이벤트 시스템 설정 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 이벤트 시스템 설정 실패:', error);
        }
    }

    subscribeToInitModuleEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독...');
            
            this.onEvent('flightSectionStateChangeRequest', (data) => {
                this.handleFlightSectionStateChangeRequest(data);
            });
            
            this.onEvent('revalidationCompleted', (data) => {
                this.handleRevalidationCompleted(data);
            });
            
            this.onEvent('activityPeriodChanged', (data) => {
                this.handleActivityPeriodChanged(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기화 모듈 이벤트 구독 실패:', error);
        }
    }

    subscribeToCoordinatorEvents() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 조정자 이벤트 구독...');
            
            this.onEvent('coordinator:stateChanged', (data) => {
                this.handleCoordinatorStateChanged(data);
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 구독 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 이벤트 구독 실패:', error);
        }
    }

    connectToGlobalEventSystem() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결...');
            
            if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.on === 'function') {
                window.flightRequestCoordinator.on('init:flightSectionStateChangeRequest', (event) => {
                    this.handleFlightSectionStateChangeRequest(event.detail);
                });
                
                console.log('✅ [티켓모듈] v2.1.0: 조정자 이벤트 시스템 연결 완료');
            }
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 전역 이벤트 시스템 연결 실패:', error);
        }
    }

    // === 이벤트 헬퍼 메서드 ===
    onEvent(eventName, handler) {
        try {
            if (!this.eventListeners.has(eventName)) {
                this.eventListeners.set(eventName, []);
            }
            this.eventListeners.get(eventName).push(handler);
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 이벤트 구독 실패 (${eventName}):`, error);
        }
    }

    emitEvent(eventName, data) {
        try {
            const listeners = this.eventListeners.get(eventName) || [];
            listeners.forEach(handler => {
                try {
                    handler(data);
                } catch (error) {
                    console.warn(`⚠️ [티켓모듈] v2.1.0: 이벤트 핸들러 실행 실패 (${eventName}):`, error);
                }
            });
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 이벤트 발행 실패 (${eventName}):`, error);
        }
    }

    // ================================
    // 파트 9: 기존 메서드들 및 외부 인터페이스
    // ================================

    // === 기존 메서드들 (간소화된 버전만 포함) ===
    bindEvents() {
        try {
            console.log('🔄 [이벤트바인딩] 이벤트 리스너 설정...');
            
            // 활동기간 입력 필드 이벤트
            const arrivalDateEl = document.getElementById('actualArrivalDate');
            const workEndDateEl = document.getElementById('actualWorkEndDate');
            
            if (arrivalDateEl) {
                arrivalDateEl.addEventListener('change', () => {
                    this.handleActivityDateChange('arrival');
                });
                arrivalDateEl.addEventListener('input', () => {
                    this.debouncedActivityValidationWithLoading();
                });
            }
            
            if (workEndDateEl) {
                workEndDateEl.addEventListener('change', () => {
                    this.handleActivityDateChange('workEnd');
                });
                workEndDateEl.addEventListener('input', () => {
                    this.debouncedActivityValidationWithLoading();
                });
            }
            
            console.log('✅ [이벤트바인딩] 이벤트 리스너 설정 완료');
            
        } catch (error) {
            console.error('❌ [이벤트바인딩] 이벤트 리스너 설정 실패:', error);
        }
    }

    handleActivityDateChange(type) {
        try {
            console.log(`🔄 [활동기간] v2.3.0: ${type} 날짜 변경 처리...`);
            
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            
            if (type === 'arrival') {
                this.ticketData.actualArrivalDate = document.getElementById('actualArrivalDate')?.value;
            } else if (type === 'workEnd') {
                this.ticketData.actualWorkEndDate = document.getElementById('actualWorkEndDate')?.value;
            }
            
            setTimeout(() => {
                this.revalidateFlightDatesOnActivityChange();
            }, 100);
            
            this.emitEvent('activityDateChanged', {
                type: type,
                timestamp: Date.now()
            });
            
        } catch (error) {
            console.error(`❌ [활동기간] v2.3.0: ${type} 날짜 변경 처리 실패:`, error);
        }
    }

    calculateAndShowActivityDaysImmediate() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (arrivalDate && workEndDate) {
                const start = new Date(arrivalDate);
                const end = new Date(workEndDate);
                const diffTime = Math.abs(end - start);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                
                this.ticketData.calculatedActivityDays = diffDays;
                
                const calculatedEl = document.getElementById('calculatedDays');
                if (calculatedEl) {
                    calculatedEl.textContent = diffDays;
                    calculatedEl.className = 'value calculated-days-value';
                }
            }
            
        } catch (error) {
            console.error('❌ [활동일수] 즉시 계산 실패:', error);
        }
    }

    debouncedActivityValidationWithLoading() {
        try {
            if (this.validationDebounceTimer) {
                clearTimeout(this.validationDebounceTimer);
            }
            
            this.validationDebounceTimer = setTimeout(() => {
                this.validateActivityPeriodWithUI();
            }, 500);
            
        } catch (error) {
            console.error('❌ [디바운스검증] 실패:', error);
        }
    }

    validateActivityPeriodWithUI() {
        try {
            const validation = this.validateActivityPeriod();
            
            if (validation.valid) {
                this.isActivityPeriodCompleted = true;
                this.isActivityPeriodValid = true;
                
                this.emitEvent('flightSectionStateChangeRequest', {
                    action: 'enable',
                    reason: 'activityPeriodValidated',
                    message: '현지 활동기간 검증 완료 - 항공권 정보를 입력할 수 있습니다.',
                    type: 'success',
                    validationResult: validation
                });
                
            } else {
                this.isActivityPeriodCompleted = false;
                this.isActivityPeriodValid = false;
                
                this.emitEvent('flightSectionStateChangeRequest', {
                    action: 'disable',
                    reason: 'activityPeriodInvalid',
                    message: validation.message || '활동기간을 올바르게 입력해주세요.',
                    type: 'error',
                    validationResult: validation
                });
            }
            
        } catch (error) {
            console.error('❌ [UI검증] 활동기간 검증 실패:', error);
        }
    }

    validateActivityPeriod() {
        try {
            const arrivalDate = document.getElementById('actualArrivalDate')?.value;
            const workEndDate = document.getElementById('actualWorkEndDate')?.value;
            
            if (!arrivalDate || !workEndDate) {
                return {
                    valid: false,
                    message: '현지 도착일과 근무 종료일을 모두 입력해주세요.',
                    code: 'MISSING_DATES'
                };
            }
            
            const start = new Date(arrivalDate);
            const end = new Date(workEndDate);
            
            if (start >= end) {
                return {
                    valid: false,
                    message: '근무 종료일은 도착일보다 늦어야 합니다.',
                    code: 'INVALID_DATE_ORDER'
                };
            }
            
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            
            if (this.userRequirements.userRequiredDays && diffDays < this.userRequirements.userRequiredDays) {
                return {
                    valid: false,
                    message: `최소 ${this.userRequirements.userRequiredDays}일 이상 활동해야 합니다. (현재: ${diffDays}일)`,
                    code: 'INSUFFICIENT_DAYS'
                };
            }
            
            if (this.userRequirements.userMaximumDays && diffDays > this.userRequirements.userMaximumDays) {
                return {
                    valid: false,
                    message: `최대 ${this.userRequirements.userMaximumDays}일까지 활동 가능합니다. (현재: ${diffDays}일)`,
                    code: 'EXCEEDED_DAYS'
                };
            }
            
            return {
                valid: true,
                message: '활동기간이 올바르게 설정되었습니다.',
                days: diffDays,
                code: 'VALID'
            };
            
        } catch (error) {
            console.error('❌ [활동기간검증] 실패:', error);
            return {
                valid: false,
                message: '활동기간 검증 중 오류가 발생했습니다.',
                code: 'VALIDATION_ERROR'
            };
        }
    }

    // === 🔧 v2.3.0: 활동기간 기반 항공권 날짜 검증 (required_return_date 추가) ===
    validateFlightDatesWithActivity() {
        try {
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            
            if (!departureDate || !returnDate) {
                return {
                    valid: false,
                    message: '출국일과 귀국일을 모두 입력해주세요.'
                };
            }
            
            if (!this.ticketData.actualArrivalDate || !this.ticketData.actualWorkEndDate) {
                return {
                    valid: false,
                    message: '현지 활동기간을 먼저 입력해주세요.'
                };
            }
            
            const departure = new Date(departureDate);
            const returnD = new Date(returnDate);
            
            if (departure >= returnD) {
                return {
                    valid: false,
                    message: '귀국일은 출국일보다 늦어야 합니다.'
                };
            }
            
            // 🆕 v2.3.0: required_return_date 우선 검증
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (returnD > requiredReturnDate) {
                    return {
                        valid: false,
                        message: `귀국일은 필수 귀국일 ${this.formatDate(requiredReturnDate)} 이전이어야 합니다.`
                    };
                }
            }
            
            const arrival = new Date(this.ticketData.actualArrivalDate);
            const workEnd = new Date(this.ticketData.actualWorkEndDate);
            
            // 출국일 범위 검증
            const minDepartureDate = new Date(arrival);
            minDepartureDate.setDate(arrival.getDate() - 2);
            
            if (departure <= minDepartureDate || departure >= arrival) {
                return {
                    valid: false,
                    message: `출국일은 현지 도착일 2일 전인 ${this.formatDate(minDepartureDate)} 이후부터 ${this.formatDate(arrival)} 이전이어야 합니다.`
                };
            }
            
            // 귀국일 범위 검증 (기존 + required_return_date 통합)
            const maxReturnDateBasic = new Date(workEnd);
            maxReturnDateBasic.setDate(workEnd.getDate() + 10);
            
            let effectiveMaxReturnDate = maxReturnDateBasic;
            if (this.userRequirements.requiredReturnDate) {
                const requiredReturnDate = new Date(this.userRequirements.requiredReturnDate);
                if (requiredReturnDate < maxReturnDateBasic) {
                    effectiveMaxReturnDate = requiredReturnDate;
                }
            }
            
            if (returnD <= workEnd || returnD > effectiveMaxReturnDate) {
                return {
                    valid: false,
                    message: `귀국일은 학당 근무 종료일 ${this.formatDate(workEnd)} 이후부터 ${this.formatDate(effectiveMaxReturnDate)} 이전이어야 합니다.`
                };
            }
            
            return {
                valid: true,
                message: '항공권 날짜가 올바르게 설정되었습니다.'
            };
            
        } catch (error) {
            console.error('❌ [항공권날짜검증] v2.3.0: 검증 실패:', error);
            return {
                valid: false,
                message: '항공권 날짜 검증 중 오류가 발생했습니다.'
            };
        }
    }

    revalidateFlightDatesOnActivityChange() {
        try {
            console.log('🔄 [재검증] v2.3.0: 활동기간 변경으로 항공권 날짜 재검증...');
            
            const departureDate = document.getElementById('departureDate')?.value;
            const returnDate = document.getElementById('returnDate')?.value;
            
            if (departureDate) {
                this.validateFlightDateImmediate('departure');
            }
            
            if (returnDate) {
                this.validateFlightDateImmediate('return');
            }
            
            console.log('✅ [재검증] v2.3.0: 항공권 날짜 재검증 완료');
            
        } catch (error) {
            console.error('❌ [재검증] v2.3.0: 항공권 날짜 재검증 실패:', error);
        }
    }

    // ================================
    // 파트 10: 외부 인터페이스 및 유틸리티
    // ================================

    setupStepNavigation() {
        console.log('✅ [티켓모듈] 단계별 네비게이션 설정 완료');
    }

    async loadTicketInfo() {
        try {
            if (this.apiService && this.apiService.loadExistingFlightRequest) {
                const existingRequest = await this.apiService.loadExistingFlightRequest();
                if (existingRequest) {
                    this.populateFormWithExistingData(existingRequest);
                }
            }
            
            console.log('✅ [티켓모듈] 기존 항공권 정보 로드 완료');
        } catch (error) {
            console.error('❌ [티켓모듈] 기존 항공권 정보 로드 실패:', error);
        }
    }

    populateFormWithExistingData(data) {
        try {
            if (data.actualArrivalDate) {
                const arrivalEl = document.getElementById('actualArrivalDate');
                if (arrivalEl) arrivalEl.value = data.actualArrivalDate;
                this.ticketData.actualArrivalDate = data.actualArrivalDate;
            }
            
            if (data.actualWorkEndDate) {
                const workEndEl = document.getElementById('actualWorkEndDate');
                if (workEndEl) workEndEl.value = data.actualWorkEndDate;
                this.ticketData.actualWorkEndDate = data.actualWorkEndDate;
            }
            
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            
        } catch (error) {
            console.error('❌ [폼채우기] 기존 데이터 채우기 실패:', error);
        }
    }

    setInitialFlightSectionState() {
        try {
            console.log('🔄 [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정...');
            
            this.disableFlightSectionUnified({
                action: 'disable',
                reason: 'initialization',
                message: '항공권 정보를 입력하려면 먼저 현지 활동기간을 입력해주세요.',
                type: 'info'
            });
            
            console.log('✅ [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 초기 항공권 섹션 상태 설정 실패:', error);
        }
    }

    enableFlightSectionUnified(data) {
        try {
            console.log('🔓 [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화:', data);
            
            this.flightSectionControl.isEnabled = true;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            this.updateFlightSectionUI(true, data);
            this.toggleFlightInputFields(true);
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 활성화 실패:', error);
        }
    }

    disableFlightSectionUnified(data) {
        try {
            console.log('🔒 [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화:', data);
            
            this.flightSectionControl.isEnabled = false;
            this.flightSectionControl.lastStateChangeReason = data.reason || 'unknown';
            this.flightSectionControl.lastStateChangeMessage = data.message || '항공권 섹션 비활성화됨';
            this.flightSectionControl.lastStateChangeTime = Date.now();
            
            this.updateFlightSectionUI(false, data);
            this.toggleFlightInputFields(false);
            
            console.log('✅ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 통합 항공권 섹션 비활성화 실패:', error);
        }
    }

    findFlightInfoSection() {
        try {
            const selectors = [
                '#flightInfoSection',
                '.flight-info-section',
                '.flight-section',
                '#step2',
                '[data-step="flight"]'
            ];
            
            for (const selector of selectors) {
                const element = document.querySelector(selector);
                if (element) {
                    return element;
                }
            }
            
            const departureDateEl = document.getElementById('departureDate');
            if (departureDateEl) {
                let parent = departureDateEl.parentElement;
                while (parent && parent !== document.body) {
                    if (parent.tagName === 'SECTION' || 
                        parent.classList.contains('section') ||
                        parent.classList.contains('step')) {
                        return parent;
                    }
                    parent = parent.parentElement;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('❌ [항공권섹션] 섹션 찾기 실패:', error);
            return null;
        }
    }

    updateFlightSectionUI(enabled, data) {
        try {
            const flightSection = this.findFlightInfoSection();
            
            if (flightSection) {
                if (enabled) {
                    flightSection.classList.remove('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.add('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '1';
                    flightSection.style.pointerEvents = 'auto';
                    flightSection.style.filter = 'none';
                    flightSection.style.backgroundColor = '';
                } else {
                    flightSection.classList.add('flight-section-disabled', 'section-disabled', 'disabled');
                    flightSection.classList.remove('flight-section-enabled', 'section-enabled', 'enabled');
                    flightSection.style.opacity = '0.5';
                    flightSection.style.pointerEvents = 'none';
                    flightSection.style.filter = 'grayscale(50%)';
                    flightSection.style.backgroundColor = '#f9fafb';
                }
                
                flightSection.setAttribute('data-enabled', enabled.toString());
                flightSection.setAttribute('data-last-change-reason', data.reason || 'unknown');
                flightSection.setAttribute('data-last-change-time', Date.now().toString());
            }
            
        } catch (error) {
            console.error(`❌ [티켓모듈] v2.1.0: 항공권 섹션 UI ${enabled ? '활성화' : '비활성화'} 실패:`, error);
        }
    }

    toggleFlightInputFields(enabled) {
        try {
            console.log(`🔄 [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'}...`);
            
            const flightInputSelectors = [
                '#departureDate',
                '#returnDate', 
                '#departureAirport',
                '#arrivalAirport',
                '#ticketPrice',
                '#currency',
                '#priceSource',
                '#purchaseLink',
                'input[name="purchaseType"]'
            ];
            
            flightInputSelectors.forEach(selector => {
                const elements = document.querySelectorAll(selector);
                elements.forEach(element => {
                    if (element) {
                        element.disabled = !enabled;
                        element.style.opacity = enabled ? '1' : '0.5';
                        element.style.cursor = enabled ? 'auto' : 'not-allowed';
                    }
                });
            });
            
            console.log(`✅ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 완료`);
            
        } catch (error) {
            console.error(`❌ [입력필드] 항공권 입력 필드 ${enabled ? '활성화' : '비활성화'} 실패:`, error);
        }
    }

    setUserRequirements(requirements) {
        try {
            console.log('🔄 [사용자요구사항] v2.3.0 설정:', requirements);
            
            this.userRequirements = {
                ...this.userRequirements,
                ...requirements,
                isLoaded: true
            };
            
            if (requirements.requiredReturnDate) {
                console.log('🔄 [사용자요구사항] v2.3.0: required_return_date 설정으로 항공권 날짜 재검증 트리거');
                setTimeout(() => {
                    this.revalidateFlightDatesOnActivityChange();
                }, 100);
            }
            
            console.log('✅ [사용자요구사항] v2.3.0 설정 완료:', this.userRequirements);
            
        } catch (error) {
            console.error('❌ [사용자요구사항] v2.3.0 설정 실패:', error);
        }
    }

    // === 간소화된 이벤트 핸들러들 ===
    handleFlightSectionStateChangeRequest(data) {
        try {
            if (data.action === 'enable') {
                this.enableFlightSectionUnified(data);
            } else if (data.action === 'disable') {
                this.disableFlightSectionUnified(data);
            }
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 항공권 섹션 상태 변경 요청 처리 실패:', error);
        }
    }

    handleRevalidationCompleted(data) {
        try {
            if (data.success && data.result) {
                this.emitEvent('validationSuccess', {
                    result: data.result,
                    timestamp: Date.now()
                });
            } else {
                this.emitEvent('validationFailed', {
                    result: data.result,
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 재검증 완료 처리 실패:', error);
        }
    }

    handleActivityPeriodChanged(data) {
        try {
            this.resetValidationState();
            
            this.emitEvent('activityPeriodUpdated', {
                fieldType: data.fieldType,
                newValue: data.newValue,
                timestamp: data.timestamp || Date.now()
            });
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 활동기간 변경 처리 실패:', error);
        }
    }

    handleCoordinatorStateChanged(data) {
        try {
            if (data.current && data.current.flightSectionState) {
                const coordinatorFlightState = data.current.flightSectionState;
                
                if (coordinatorFlightState !== this.getFlightSectionState()) {
                    this.syncWithCoordinatorState(coordinatorFlightState);
                }
            }
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 상태 변경 처리 실패:', error);
        }
    }

    resetValidationState() {
        try {
            this.isActivityPeriodCompleted = false;
            this.isActivityPeriodValid = false;
            this.stepCompleted.activityPeriod = false;
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 검증 상태 리셋 실패:', error);
        }
    }

    syncWithCoordinatorState(coordinatorFlightState) {
        try {
            const shouldEnable = coordinatorFlightState === 'enabled';
            
            if (shouldEnable !== this.flightSectionControl.isEnabled) {
                const syncData = {
                    action: shouldEnable ? 'enable' : 'disable',
                    reason: 'coordinatorSync',
                    message: `조정자 상태와 동기화 (${coordinatorFlightState})`,
                    type: 'info'
                };
                
                if (shouldEnable) {
                    this.enableFlightSectionUnified(syncData);
                } else {
                    this.disableFlightSectionUnified(syncData);
                }
            }
        } catch (error) {
            console.error('❌ [티켓모듈] v2.1.0: 조정자 상태 동기화 실패:', error);
        }
    }

    getFlightSectionState() {
        if (this.flightSectionControl.isEnabled) {
            return 'enabled';
        } else {
            return 'disabled';
        }
    }

    // ================================
    // 파트 11: 외부 인터페이스 및 디버깅
    // ================================

    triggerValidation() {
        try {
            this.calculateAndShowActivityDaysImmediate();
            this.debouncedActivityValidationWithLoading();
            console.log('✅ [외부인터페이스] v3.0.0: 검증 트리거 완료');
        } catch (error) {
            console.error('❌ [외부인터페이스] v3.0.0: 검증 트리거 실패:', error);
        }
    }

    getTicketData() {
        return { ...this.ticketData };
    }

    getPrerequisiteStatus() {
        return {
            isActivityPeriodCompleted: this.isActivityPeriodCompleted,
            isActivityPeriodValid: this.isActivityPeriodValid,
            flightSectionEnabled: this.flightSectionControl.isEnabled,
            flightSectionControlStatus: this.getFlightSectionControlStatus()
        };
    }

    getFlightSectionControlStatus() {
        return {
            ...this.flightSectionControl,
            currentState: this.getFlightSectionState(),
            eventSystemSetup: this.isEventSystemSetup
        };
    }

    getEventSystemStatus() {
        return {
            isEventSystemSetup: this.isEventSystemSetup,
            eventListenersCount: this.eventListeners.size,
            registeredEvents: Array.from(this.eventListeners.keys())
        };
    }

    // === 🆕 v3.0.0: 확장된 디버깅 정보 ===
    getDebugInfo() {
        return {
            version: '3.0.0',
            ticketData: this.ticketData,
            userRequirements: this.userRequirements,
            prerequisiteStatus: this.getPrerequisiteStatus(),
            flightSectionControl: this.flightSectionControl,
            flightDateValidation: this.flightDateValidation,
            eventSystemStatus: this.getEventSystemStatus(),
            fileUploadStatus: {
                ticketImageFile: !!this.ticketImageFile,
                receiptImageFile: !!this.receiptImageFile,
                uploadedFiles: this.uploadedFiles,
                uploadInProgress: this.uploadInProgress
            },
            submissionStatus: {
                submissionInProgress: this.submissionInProgress,
                submissionAttempts: this.submissionAttempts,
                maxSubmissionAttempts: this.maxSubmissionAttempts
            },
            hasApiService: !!this.apiService,
            hasUiService: !!this.uiService,
            hasPassportService: !!this.passportService
        };
    }

    destroy() {
        try {
            console.log('🗑️ [티켓모듈] v3.0.0: 인스턴스 정리...');
            
            if (this.eventListeners) {
                this.eventListeners.clear();
            }
            
            // 타이머 정리
            if (this.validationDebounceTimer) {
                clearTimeout(this.validationDebounceTimer);
            }
            if (this.returnValidationDebounceTimer) {
                clearTimeout(this.returnValidationDebounceTimer);
            }
            if (this.flightDateValidationTimer) {
                clearTimeout(this.flightDateValidationTimer);
            }
            
            // 상태 정리
            this.flightSectionControl = null;
            this.ticketData = null;
            this.userRequirements = null;
            this.flightDateValidation = null;
            this.ticketImageFile = null;
            this.receiptImageFile = null;
            this.uploadedFiles = null;
            this.uploadInProgress = null;
            
            console.log('✅ [티켓모듈] v3.0.0: 인스턴스 정리 완료');
            
        } catch (error) {
            console.error('❌ [티켓모듈] v3.0.0: 인스턴스 정리 실패:', error);
        }
    }
}

// ================================
// 전역 스코프 노출
// ================================

// 전역 스코프에 클래스 노출
window.FlightRequestTicket = FlightRequestTicket;

// 🆕 v3.0.0: 전역 인스턴스 참조 (removeImage 메서드 접근용)
window.flightRequestTicket = null;

console.log('✅ FlightRequestTicket v3.0.0 모듈 로드 완료 - 이미지 업로드 및 폼 제출 기능 추가');
console.log('🎯 v3.0.0 핵심 신규 기능:', {
    newFeatures: [
        '🆕 이미지 업로드 시스템: 파일 선택, 검증, 미리보기, Supabase Storage 업로드',
        '🆕 폼 제출 시스템: 통합 데이터 수집, 검증, 데이터베이스 저장',
        '🆕 파일 업로드 → DB 저장 순서 처리 완성',
        '🆕 실시간 제출 UI 피드백: 로딩, 성공, 실패 상태 표시',
        '🆕 중복 제출 방지 및 재시도 제한 시스템',
        '🆕 통합 검증 시스템: 활동기간 + 항공권 + 파일 + 가격정보',
        '🆕 성공/실패 피드백 및 후속 처리 자동화',
        '🆕 이미지 미리보기 및 제거 기능'
    ],
    improvements: [
        '기존 v2.3.0 검증 로직과 완전 통합',
        'API 서비스 기반 파일 업로드 및 데이터 저장',
        '사용자 경험 최적화: 실시간 피드백 제공',
        '오류 처리 강화: 상세한 오류 메시지 및 복구 옵션',
        '확장 가능한 아키텍처: 추가 기능 확장 용이',
        '메모리 관리 최적화: 인스턴스 정리 및 리소스 해제'
    ]
});
console.log('🚀 v3.0.0 예상 효과:', {
    userExperience: '완전한 항공권 신청 프로세스 구현으로 사용자 편의성 극대화',
    dataIntegrity: '3단계 검증 + 파일 업로드 + DB 저장으로 데이터 무결성 보장',
    systemStability: '오류 처리 및 복구 시스템으로 안정성 확보',
    operationalReadiness: '실제 운영 환경에서 바로 사용 가능한 완성도 달성'
});
