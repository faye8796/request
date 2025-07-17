// flight-request-passport-fix.js - 여권정보 수정 페이지 여권 사본 데이터 로드 및 미리보기 기능 수정 v1.2.0
// 🔧 핵심 수정사항:
//   1. 여권 사본 이미지 URL 로드 기능 추가
//   2. 이미지 미리보기 기능 개선
//   3. 파일 업로드 상태 관리 강화
//   4. 기존 이미지 삭제 및 재업로드 기능 추가

class FlightRequestPassportFixed {
    constructor(apiService, uiService) {
        this.apiService = apiService;
        this.uiService = uiService;
        
        // 여권정보 관련 상태
        this.passportData = {};
        this.passportImageFile = null;
        this.isPassportMode = false;
        this.existingPassportInfo = null;
        
        // 🔧 추가: 기존 이미지 정보
        this.existingImageUrl = null;
        this.hasExistingImage = false;
        
        // 안전장치 플래그들
        this.isInitialized = false;
        this.isLoading = false;
        this.loadAttempts = 0;
        this.maxLoadAttempts = 2;
        this.eventsBinding = false;
        
        // DOM 요소들 초기화
        this.elements = this.initPassportElements();
        
        // 초기화 (한 번만)
        if (!this.isInitialized) {
            this.init();
        }
    }

    init() {
        try {
            if (this.isInitialized) {
                console.warn('⚠️ [여권모듈] 이미 초기화됨 - 중복 초기화 방지');
                return;
            }
            
            this.isInitialized = true;
            
            console.log('🔄 [여권모듈] v1.2.0 초기화 시작 (여권 사본 로드 기능 추가)');
            
            // 이벤트 리스너 설정
            this.bindEvents();
            
            // 여권정보 로드
            this.loadPassportInfoSafely();
            
            console.log('✅ [여권모듈] v1.2.0 초기화 완료');
        } catch (error) {
            console.error('❌ [여권모듈] 초기화 실패:', error);
            this.isInitialized = false;
        }
    }

    initPassportElements() {
        return {
            // 여권정보 페이지 요소들
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
            
            // 알림 요소들
            passportAlert: document.getElementById('passportAlert')
        };
    }

    bindEvents() {
        try {
            if (this.eventsBinding) {
                console.warn('⚠️ [여권이벤트] 이미 바인딩됨 - 중복 방지');
                return;
            }
            
            this.eventsBinding = true;
            
            // 여권정보 폼 제출
            if (this.elements.passportInfoForm) {
                this.elements.passportInfoForm.addEventListener('submit', (e) => this.handlePassportSubmit(e));
            }

            // 여권 만료일 검증
            if (this.elements.expiryDate) {
                this.elements.expiryDate.addEventListener('change', () => this.validateExpiryDate());
                this.elements.expiryDate.addEventListener('blur', () => this.validateExpiryDate());
            }

            // 여권 이미지 업로드
            if (this.elements.passportImage) {
                this.elements.passportImage.addEventListener('change', (e) => this.handlePassportImageUpload(e));
            }
            
            // 여권 이미지 제거
            if (this.elements.removePassportImage) {
                this.elements.removePassportImage.addEventListener('click', () => this.removePassportImage());
            }

            // 항공권 신청 페이지로 진행
            if (this.elements.proceedToFlightRequest) {
                this.elements.proceedToFlightRequest.addEventListener('click', () => this.showFlightRequestPage());
            }

            console.log('✅ [여권이벤트] 이벤트 바인딩 완료');
        } catch (error) {
            console.error('❌ [여권이벤트] 설정 실패:', error);
            this.eventsBinding = false;
        }
    }

    // === 🔧 수정: 여권정보 로딩 - 이미지 URL 포함 ===

    async loadPassportInfoSafely() {
        if (this.isLoading) {
            console.warn('⚠️ [여권로딩] 이미 로딩 중 - 중복 방지');
            return;
        }
        
        if (this.loadAttempts >= this.maxLoadAttempts) {
            console.warn('⚠️ [여권로딩] 최대 시도 횟수 초과');
            return;
        }
        
        this.isLoading = true;
        this.loadAttempts++;
        
        try {
            console.log('🔄 [여권로딩] 여권정보 로드 시작 (이미지 URL 포함)...');
            
            if (!this.apiService) {
                console.warn('⚠️ [여권로딩] API 서비스 없음');
                this.showPassportAlert();
                return;
            }

            // 타임아웃 적용
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('타임아웃')), 5000)
            );
            
            const loadPromise = this.apiService.loadPassportInfo ? 
                this.apiService.loadPassportInfo() : 
                this.apiService.getPassportInfo?.();
            
            if (!loadPromise) {
                console.warn('⚠️ [여권로딩] API 메서드 없음');
                this.showPassportAlert();
                return;
            }
            
            this.existingPassportInfo = await Promise.race([loadPromise, timeoutPromise]);
            
            if (this.existingPassportInfo) {
                console.log('✅ [여권로딩] 기존 여권정보 로드 완료:', {
                    여권번호: this.existingPassportInfo.passport_number,
                    이미지URL: this.existingPassportInfo.passport_image_url
                });
                
                // 🔧 추가: 기존 이미지 URL 설정
                this.existingImageUrl = this.existingPassportInfo.passport_image_url;
                this.hasExistingImage = !!this.existingImageUrl;
                
                await this.loadExistingPassportDataSafely();
                
                // 🔧 추가: 기존 이미지 로드
                if (this.hasExistingImage) {
                    await this.loadExistingPassportImage();
                }
            } else {
                console.log('⚠️ [여권로딩] 기존 여권정보 없음');
                this.showPassportAlert();
            }
            
        } catch (error) {
            console.warn('⚠️ [여권로딩] 실패:', error.message);
            this.showPassportAlert();
        } finally {
            this.isLoading = false;
        }
    }

    // 🔧 추가: 기존 여권 이미지 로드 기능
    async loadExistingPassportImage() {
        try {
            if (!this.existingImageUrl) {
                console.log('⚠️ [여권이미지] 기존 이미지 URL 없음');
                return;
            }
            
            console.log('🔄 [여권이미지] 기존 이미지 로드 시작:', this.existingImageUrl);
            
            // 이미지 미리보기 표시
            if (this.elements.passportPreviewImg) {
                this.elements.passportPreviewImg.src = this.existingImageUrl;
                this.elements.passportPreviewImg.onerror = () => {
                    console.warn('⚠️ [여권이미지] 기존 이미지 로드 실패');
                    this.handleImageLoadError();
                };
                this.elements.passportPreviewImg.onload = () => {
                    console.log('✅ [여권이미지] 기존 이미지 로드 성공');
                    this.showImagePreview();
                };
            }
            
            // 파일 입력 필드 상태 업데이트
            this.updateFileInputState();
            
        } catch (error) {
            console.error('❌ [여권이미지] 기존 이미지 로드 실패:', error);
            this.handleImageLoadError();
        }
    }

    // 🔧 추가: 이미지 미리보기 표시
    showImagePreview() {
        try {
            if (this.elements.passportImagePreview) {
                this.elements.passportImagePreview.style.display = 'block';
            }
            
            // 업로드 라벨 숨기기
            const uploadLabel = this.elements.passportImage?.parentElement?.querySelector('.upload-label');
            if (uploadLabel) {
                uploadLabel.style.display = 'none';
            }
            
            console.log('✅ [여권이미지] 이미지 미리보기 표시 완료');
        } catch (error) {
            console.error('❌ [여권이미지] 미리보기 표시 실패:', error);
        }
    }

    // 🔧 추가: 이미지 로드 에러 처리
    handleImageLoadError() {
        try {
            this.existingImageUrl = null;
            this.hasExistingImage = false;
            
            if (this.elements.passportImagePreview) {
                this.elements.passportImagePreview.style.display = 'none';
            }
            
            if (this.elements.passportPreviewImg) {
                this.elements.passportPreviewImg.src = '';
            }
            
            // 업로드 라벨 다시 표시
            const uploadLabel = this.elements.passportImage?.parentElement?.querySelector('.upload-label');
            if (uploadLabel) {
                uploadLabel.style.display = 'block';
            }
            
            console.log('✅ [여권이미지] 이미지 로드 에러 처리 완료');
        } catch (error) {
            console.error('❌ [여권이미지] 에러 처리 실패:', error);
        }
    }

    // 🔧 추가: 파일 입력 상태 업데이트
    updateFileInputState() {
        try {
            if (this.elements.passportImage) {
                // 기존 이미지가 있으면 파일 입력 필드는 비움
                this.elements.passportImage.value = '';
                
                // 파일 입력 필드 라벨 텍스트 업데이트
                const uploadLabel = this.elements.passportImage.parentElement?.querySelector('.upload-label');
                if (uploadLabel) {
                    const uploadText = uploadLabel.querySelector('.upload-text');
                    if (uploadText) {
                        uploadText.textContent = this.hasExistingImage ? 
                            '다른 이미지로 변경하기' : 
                            '클릭하여 여권 사본 업로드';
                    }
                }
            }
            
            console.log('✅ [여권이미지] 파일 입력 상태 업데이트 완료');
        } catch (error) {
            console.error('❌ [여권이미지] 파일 입력 상태 업데이트 실패:', error);
        }
    }

    async loadExistingPassportDataSafely() {
        try {
            if (this.existingPassportInfo) {
                console.log('🔄 [여권데이터] 기존 여권 데이터 로드 시작...');
                
                // 폼에 기존 데이터 채우기
                if (this.elements.passportNumber) {
                    this.elements.passportNumber.value = this.existingPassportInfo.passport_number || '';
                }
                if (this.elements.nameEnglish) {
                    this.elements.nameEnglish.value = this.existingPassportInfo.name_english || '';
                }
                if (this.elements.issueDate) {
                    this.elements.issueDate.value = this.existingPassportInfo.issue_date || '';
                }
                if (this.elements.expiryDate) {
                    this.elements.expiryDate.value = this.existingPassportInfo.expiry_date || '';
                    // 만료일 검증 실행
                    this.validateExpiryDate();
                }
                
                this.isPassportMode = true;
                this.passportData = { ...this.existingPassportInfo };
                
                console.log('✅ [여권데이터] 기존 여권 데이터 로드 완료');
            }
        } catch (error) {
            console.error('❌ [여권데이터] 로드 실패:', error);
        }
    }

    async loadExistingPassportDataAndSetMode() {
        await this.loadExistingPassportDataSafely();
        this.updatePassportUI();
        
        // 🔧 추가: 기존 이미지 로드
        if (this.hasExistingImage) {
            await this.loadExistingPassportImage();
        }
    }

    // === 🔧 수정: 여권 이미지 업로드 처리 개선 ===

    handlePassportImageUpload(event) {
        try {
            console.log('🔄 [여권이미지] 새 이미지 업로드 처리...');
            
            const file = event.target.files[0];
            if (!file) {
                console.log('⚠️ [여권이미지] 선택된 파일 없음');
                return;
            }
            
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
            
            // 🔧 수정: 새 파일 설정
            this.passportImageFile = file;
            this.hasExistingImage = false; // 새 이미지 선택 시 기존 이미지 플래그 해제
            
            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                if (this.elements.passportPreviewImg) {
                    this.elements.passportPreviewImg.src = e.target.result;
                }
                this.showImagePreview();
            };
            reader.readAsDataURL(file);
            
            console.log('✅ [여권이미지] 새 이미지 업로드 처리 완료:', file.name);
            
        } catch (error) {
            console.error('❌ [여권이미지] 업로드 처리 실패:', error);
            this.showError('이미지 업로드 중 오류가 발생했습니다.');
        }
    }

    // 🔧 수정: 여권 이미지 제거 처리 개선
    removePassportImage() {
        try {
            console.log('🗑️ [여권이미지] 이미지 제거 처리...');
            
            // 파일 및 상태 초기화
            this.passportImageFile = null;
            this.hasExistingImage = false;
            this.existingImageUrl = null;
            
            // UI 요소 초기화
            if (this.elements.passportImage) {
                this.elements.passportImage.value = '';
            }
            if (this.elements.passportImagePreview) {
                this.elements.passportImagePreview.style.display = 'none';
            }
            if (this.elements.passportPreviewImg) {
                this.elements.passportPreviewImg.src = '';
            }
            
            // 업로드 라벨 다시 표시
            const uploadLabel = this.elements.passportImage?.parentElement?.querySelector('.upload-label');
            if (uploadLabel) {
                uploadLabel.style.display = 'block';
                
                // 텍스트 초기화
                const uploadText = uploadLabel.querySelector('.upload-text');
                if (uploadText) {
                    uploadText.textContent = '클릭하여 여권 사본 업로드';
                }
            }
            
            console.log('✅ [여권이미지] 이미지 제거 처리 완료');
            
        } catch (error) {
            console.error('❌ [여권이미지] 제거 처리 실패:', error);
        }
    }

    // === 여권정보 검증 ===

    validatePassportInfo() {
        try {
            const passportNumber = this.elements.passportNumber?.value?.trim();
            const nameEnglish = this.elements.nameEnglish?.value?.trim();
            const issueDate = this.elements.issueDate?.value;
            const expiryDate = this.elements.expiryDate?.value;
            
            // 필수 필드 검증
            if (!passportNumber || !nameEnglish || !issueDate || !expiryDate) {
                return {
                    valid: false,
                    message: '모든 필수 정보를 입력해주세요.'
                };
            }
            
            // 여권번호 형식 검증
            if (passportNumber.length < 6) {
                return {
                    valid: false,
                    message: '올바른 여권번호를 입력해주세요.'
                };
            }
            
            // 날짜 검증
            const issue = new Date(issueDate);
            const expiry = new Date(expiryDate);
            const today = new Date();
            
            if (issue >= expiry) {
                return {
                    valid: false,
                    message: '여권 만료일이 발급일보다 빨라야 합니다.'
                };
            }
            
            if (expiry <= today) {
                return {
                    valid: false,
                    message: '여권이 만료되었습니다. 갱신이 필요합니다.'
                };
            }
            
            return {
                valid: true,
                message: '여권정보가 유효합니다.'
            };
            
        } catch (error) {
            console.error('❌ [여권검증] 검증 실패:', error);
            return {
                valid: false,
                message: '여권정보 검증 중 오류가 발생했습니다.'
            };
        }
    }

    validateExpiryDate() {
        try {
            const expiryDateEl = this.elements.expiryDate;
            const warningEl = this.elements.expiryWarning;
            
            if (!expiryDateEl || !warningEl) return;
            
            const expiryDate = new Date(expiryDateEl.value);
            const today = new Date();
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(today.getMonth() + 6);
            
            // 만료일이 6개월 이내인 경우 경고
            if (expiryDate <= sixMonthsFromNow) {
                warningEl.textContent = '⚠️ 여권 만료일이 6개월 이내입니다. 갱신을 고려해주세요.';
                warningEl.style.display = 'block';
                warningEl.style.color = '#f59e0b';
            } else if (expiryDate <= today) {
                warningEl.textContent = '❌ 여권이 만료되었습니다. 반드시 갱신해주세요.';
                warningEl.style.display = 'block';
                warningEl.style.color = '#dc2626';
            } else {
                warningEl.style.display = 'none';
            }
            
        } catch (error) {
            console.error('❌ [여권검증] 만료일 검증 실패:', error);
        }
    }

    // === 🔧 수정: 여권정보 저장 - 이미지 처리 개선 ===

    async savePassportInfo() {
        try {
            console.log('🔄 [여권저장] 여권정보 저장 시작...');
            
            // 검증
            const validation = this.validatePassportInfo();
            if (!validation.valid) {
                this.showError(validation.message);
                return false;
            }
            
            // 폼 데이터 수집
            const formData = new FormData(this.elements.passportInfoForm);
            const passportData = {
                passport_number: formData.get('passportNumber'),
                name_english: formData.get('nameEnglish'),
                issue_date: formData.get('issueDate'),
                expiry_date: formData.get('expiryDate')
            };
            
            // 🔧 수정: 이미지 처리 로직 개선
            let imageToUpload = null;
            
            // 새로운 이미지 파일이 선택된 경우
            if (this.passportImageFile) {
                imageToUpload = this.passportImageFile;
                console.log('✅ [여권저장] 새 이미지 파일 업로드 예정:', this.passportImageFile.name);
            }
            // 기존 이미지가 있고 새 파일이 없는 경우
            else if (this.hasExistingImage && this.existingImageUrl) {
                console.log('✅ [여권저장] 기존 이미지 URL 유지:', this.existingImageUrl);
                passportData.passport_image_url = this.existingImageUrl;
            }
            // 이미지가 없는 경우
            else {
                console.log('⚠️ [여권저장] 업로드할 이미지 없음');
            }
            
            // API를 통해 저장
            if (!this.apiService) {
                throw new Error('API 서비스가 설정되지 않았습니다');
            }
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('저장 시간 초과')), 15000)
            );
            
            let savePromise;
            
            // 🔧 수정: 이미지 업로드 방식 개선
            if (this.apiService.savePassportInfoWithImage) {
                // 새로운 API 메서드 사용 (이미지 URL 처리 포함)
                savePromise = this.apiService.savePassportInfoWithImage(passportData, imageToUpload);
            } else {
                // 기존 API 메서드 사용
                savePromise = this.apiService.savePassportInfo(passportData, imageToUpload);
            }
            
            const result = await Promise.race([savePromise, timeoutPromise]);
            
            // 🔧 추가: 저장 결과에서 이미지 URL 업데이트
            if (result && result.passport_image_url) {
                this.existingImageUrl = result.passport_image_url;
                this.hasExistingImage = true;
                console.log('✅ [여권저장] 이미지 URL 업데이트 완료:', this.existingImageUrl);
            }
            
            // 상태 업데이트
            this.existingPassportInfo = { ...passportData, ...result };
            this.passportData = { ...this.existingPassportInfo };
            this.isPassportMode = true;
            
            console.log('✅ [여권저장] 여권정보 저장 완료');
            return true;
            
        } catch (error) {
            console.error('❌ [여권저장] 저장 실패:', error);
            throw error;
        }
    }

    async handlePassportSubmit(event) {
        try {
            event.preventDefault();
            
            this.setLoading(true);
            
            try {
                await this.savePassportInfo();
                this.showPassportSuccessMessage();
            } catch (error) {
                this.showError('여권정보 저장 중 오류가 발생했습니다.');
            }
            
        } catch (error) {
            console.error('❌ [여권제출] 처리 실패:', error);
            this.showError('여권정보 제출 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    // === UI 업데이트 메서드들 ===

    updatePassportUI() {
        try {
            if (this.existingPassportInfo) {
                this.hidePassportAlert();
                this.loadExistingPassportDataSafely();
            } else {
                this.showPassportAlert();
            }
        } catch (error) {
            console.error('❌ [여권UI] UI 업데이트 실패:', error);
        }
    }

    showPassportAlert() {
        try {
            const alertEl = this.elements.passportAlert;
            if (alertEl) {
                alertEl.style.display = 'block';
            }
        } catch (error) {
            console.error('❌ [여권알림] 표시 실패:', error);
        }
    }

    hidePassportAlert() {
        try {
            const alertEl = this.elements.passportAlert;
            if (alertEl) {
                alertEl.style.display = 'none';
            }
        } catch (error) {
            console.error('❌ [여권알림] 숨김 실패:', error);
        }
    }

    showPassportInfoPage() {
        try {
            const flightRequestPage = document.getElementById('flightRequestPage');
            const passportInfoPage = document.getElementById('passportInfoPage');
            
            if (flightRequestPage && passportInfoPage) {
                flightRequestPage.classList.remove('active');
                passportInfoPage.classList.add('active');
                
                this.loadExistingPassportDataSafely();
            } else {
                console.error('❌ [여권페이지] 페이지 요소를 찾을 수 없음');
                this.showError('여권정보 페이지를 표시할 수 없습니다.');
            }
            
        } catch (error) {
            console.error('❌ [여권페이지] 표시 실패:', error);
            this.showError('여권정보 페이지 표시 중 오류가 발생했습니다.');
        }
    }

    showFlightRequestPage() {
        try {
            if (typeof window.showFlightRequestPage === 'function') {
                window.showFlightRequestPage();
            }
        } catch (error) {
            console.error('❌ [페이지표시] 실패:', error);
        }
    }

    showPassportSuccessMessage() {
        try {
            const formEl = this.elements.passportForm;
            const successEl = this.elements.passportSuccessMessage;
            
            if (formEl && successEl) {
                formEl.style.display = 'none';
                successEl.style.display = 'block';
            }
        } catch (error) {
            console.error('❌ [여권성공] 메시지 표시 실패:', error);
        }
    }

    // === 유틸리티 메서드들 ===

    setLoading(loading) {
        try {
            if (this.elements.passportSubmitBtn) {
                this.elements.passportSubmitBtn.disabled = loading;
                if (this.elements.passportSubmitBtnText) {
                    this.elements.passportSubmitBtnText.textContent = loading ? '저장 중...' : '저장하기';
                }
            }
        } catch (error) {
            console.error('❌ [여권로딩] 상태 설정 실패:', error);
        }
    }

    showError(message) {
        try {
            if (this.uiService && typeof this.uiService.showError === 'function') {
                this.uiService.showError(message);
            } else {
                alert(message);
            }
        } catch (error) {
            console.error('❌ [여권에러] 에러 표시 실패:', error);
            alert(message);
        }
    }

    showSuccess(message) {
        try {
            if (this.uiService && typeof this.uiService.showSuccess === 'function') {
                this.uiService.showSuccess(message);
            }
        } catch (error) {
            console.error('❌ [여권성공] 성공 표시 실패:', error);
        }
    }

    // === 외부 인터페이스 메서드들 ===

    isPassportInfoCompleted() {
        return !!(this.existingPassportInfo && this.existingPassportInfo.passport_number);
    }

    isPassportInfoValid() {
        const validation = this.validatePassportInfo();
        return validation.valid;
    }

    getPassportData() {
        return this.passportData;
    }

    getExistingPassportInfo() {
        return this.existingPassportInfo;
    }

    getPassportImageFile() {
        return this.passportImageFile;
    }

    getPassportMode() {
        return this.isPassportMode;
    }

    // 🔧 추가: 기존 이미지 URL 반환
    getExistingImageUrl() {
        return this.existingImageUrl;
    }

    // 🔧 추가: 기존 이미지 존재 여부 반환
    hasExistingImageFile() {
        return this.hasExistingImage;
    }

    async refreshPassportInfo() {
        try {
            if (this.isLoading) {
                console.warn('⚠️ [여권새로고침] 이미 로딩 중 - 무시');
                return;
            }
            
            await this.loadPassportInfoSafely();
            this.updatePassportUI();
        } catch (error) {
            console.error('❌ [여권새로고침] 새로고침 실패:', error);
        }
    }

    destroy() {
        try {
            if (this.elements.passportInfoForm) {
                this.elements.passportInfoForm.removeEventListener('submit', this.handlePassportSubmit);
            }
            
            this.passportData = null;
            this.passportImageFile = null;
            this.existingPassportInfo = null;
            this.existingImageUrl = null;
            this.elements = null;
            
            this.isInitialized = false;
            this.eventsBinding = false;
            
        } catch (error) {
            console.error('❌ [여권정리] 리소스 정리 실패:', error);
        }
    }
}

// 전역 인스턴스 생성용 함수
window.createFlightRequestPassportFixed = (apiService, uiService) => {
    return new FlightRequestPassportFixed(apiService, uiService);
};

// 전역 클래스 노출
window.FlightRequestPassportFixed = FlightRequestPassportFixed;

console.log('✅ FlightRequestPassportFixed v1.2.0 로드 완료 - 여권 사본 데이터 로드 및 미리보기 기능 수정');
console.log('🔧 v1.2.0 주요 개선사항:', {
    imageUrlLoading: '여권 사본 이미지 URL 로드 기능 추가',
    imagePreview: '이미지 미리보기 기능 개선',
    fileUploadStateManagement: '파일 업로드 상태 관리 강화',
    existingImageHandling: '기존 이미지 삭제 및 재업로드 기능 추가',
    errorHandling: '이미지 로드 에러 처리 강화',
    uiStateManagement: 'UI 상태 관리 개선'
});
