// flight-request-passport.js - v1.1.1 이미지 로딩 및 페이지 전환 문제 해결
// 🚨 핵심 수정사항 (v1.1.1):
//   1. 여권 이미지 로딩 로직 추가 - loadExistingPassportDataSafely()에 이미지 처리 추가
//   2. 페이지 전환 버그 수정 - showFlightRequestPage()에서 올바른 coordinator 메서드 호출
//   3. 여권 이미지 URL 처리 로직 강화
//   4. 기존 무한루프 해결 기능 모두 유지

class FlightRequestPassport {
    constructor(apiService, uiService) {
        this.apiService = apiService;
        this.uiService = uiService;
        
        // 여권정보 관련 상태
        this.passportData = {};
        this.passportImageFile = null;
        this.isPassportMode = false;
        this.existingPassportInfo = null;
        
        // 🚨 무한루프 방지 플래그들
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
            
            // 🚨 로그 최소화: 중요한 로그만 출력
            console.log('🔄 [여권모듈] v1.1.1 초기화 시작 (이미지 로딩 + 페이지 전환 수정)');
            
            // 이벤트 리스너 설정 (중복 방지)
            this.bindEvents();
            
            // 여권정보 로드 (안전하게)
            this.loadPassportInfoSafely();
            
            console.log('✅ [여권모듈] v1.1.1 초기화 완료');
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

    // 🚨 수정: 이벤트 리스너 중복 방지
    bindEvents() {
        try {
            if (this.eventsBinding) {
                console.warn('⚠️ [여권이벤트] 이미 바인딩됨 - 중복 방지');
                return;
            }
            
            this.eventsBinding = true;
            
            // 여권정보 폼 제출 (once 옵션으로 중복 방지)
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

            // 🔧 v1.1.1 수정: 항공권 신청 페이지로 진행 (올바른 메서드 호출)
            if (this.elements.proceedToFlightRequest) {
                this.elements.proceedToFlightRequest.addEventListener('click', () => this.showFlightRequestPage());
            }

        } catch (error) {
            console.error('❌ [여권이벤트] 설정 실패:', error);
            this.eventsBinding = false;
        }
    }

    // === 🚨 수정: 안전한 여권정보 로딩 ===

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
            if (!this.apiService) {
                console.warn('⚠️ [여권로딩] API 서비스 없음');
                this.showPassportAlert();
                return;
            }

            // 🚨 수정: 타임아웃 적용 (3초)
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('타임아웃')), 3000)
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
                this.loadExistingPassportDataSafely();
            } else {
                this.showPassportAlert();
            }
            
        } catch (error) {
            console.warn('⚠️ [여권로딩] 실패:', error.message);
            this.showPassportAlert();
        } finally {
            this.isLoading = false;
        }
    }

    // 🔧 v1.1.1 수정: 여권 이미지 로딩 로직 추가
    async loadExistingPassportDataSafely() {
        try {
            if (this.existingPassportInfo) {
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
                }
                
                // 🆕 v1.1.1: 여권 이미지 로딩 로직 추가
                if (this.existingPassportInfo.image_url && this.elements.passportPreviewImg) {
                    console.log('🖼️ [여권모듈] 기존 여권 이미지 로딩:', this.existingPassportInfo.image_url);
                    
                    // 이미지 미리보기 표시
                    this.elements.passportPreviewImg.src = this.existingPassportInfo.image_url;
                    
                    if (this.elements.passportImagePreview) {
                        this.elements.passportImagePreview.style.display = 'block';
                    }
                    
                    console.log('✅ [여권모듈] 기존 여권 이미지 로딩 완료');
                }
                
                this.isPassportMode = true;
                this.passportData = { ...this.existingPassportInfo };
            }
        } catch (error) {
            console.error('❌ [여권데이터] 로드 실패:', error);
        }
    }

    // 🚨 수정: loadExistingPassportDataAndSetMode 무한 setTimeout 방지
    async loadExistingPassportDataAndSetMode() {
        // 🚨 중요: setTimeout 제거하여 무한 호출 방지
        await this.loadExistingPassportDataSafely();
        this.updatePassportUI();
    }

    // === 여권정보 검증 (로그 최소화) ===

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

            // 🆕 여권 이미지 필수 검증 추가
            if (!this.passportImageFile && !this.existingPassportInfo?.image_url) {
                return {
                    valid: false,
                    message: '여권 사본 이미지를 업로드해주세요.'
                };
            }

            // 여권번호 형식 검증 (수정된 정규식)
            const oldPassportPattern = /^[MS][0-9]{8}$/;  // 구여권: M12345678
            const newPassportPattern = /^[MS][0-9]{3}[A-Z][0-9]{4}$/;  // 신여권: M123A4567

            if (!oldPassportPattern.test(passportNumber) && !newPassportPattern.test(passportNumber)) {
                return {
                    valid: false,
                    message: '올바른 여권번호 형식이 아닙니다. 구여권: M12345678, 신여권: M123A4567'
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

    // === 여권 이미지 관리 (로그 최소화) ===

    handlePassportImageUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
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
            
            this.passportImageFile = file;
            
            // 미리보기 표시
            const reader = new FileReader();
            reader.onload = (e) => {
                if (this.elements.passportPreviewImg) {
                    this.elements.passportPreviewImg.src = e.target.result;
                }
                if (this.elements.passportImagePreview) {
                    this.elements.passportImagePreview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
            
        } catch (error) {
            console.error('❌ [여권이미지] 업로드 실패:', error);
            this.showError('이미지 업로드 중 오류가 발생했습니다.');
        }
    }

    removePassportImage() {
        try {
            this.passportImageFile = null;
            
            if (this.elements.passportImage) {
                this.elements.passportImage.value = '';
            }
            if (this.elements.passportImagePreview) {
                this.elements.passportImagePreview.style.display = 'none';
            }
            if (this.elements.passportPreviewImg) {
                this.elements.passportPreviewImg.src = '';
            }
            
        } catch (error) {
            console.error('❌ [여권이미지] 제거 실패:', error);
        }
    }

    // === 여권정보 저장 (타임아웃 적용) ===

    async savePassportInfo() {
        try {
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
            
            // API를 통해 저장 (타임아웃 적용)
            if (!this.apiService) {
                throw new Error('API 서비스가 설정되지 않았습니다');
            }
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('저장 시간 초과')), 10000)
            );
            
            const savePromise = this.apiService.savePassportInfo(passportData, this.passportImageFile);
            
            const result = await Promise.race([savePromise, timeoutPromise]);
            
            // 상태 업데이트
            this.existingPassportInfo = passportData;
            this.passportData = passportData;
            this.isPassportMode = true;
            
            return true;
            
        } catch (error) {
            console.error('❌ [여권저장] 저장 실패:', error);
            throw error;
        }
    }

    async handlePassportSubmit(event) {
        try {
            event.preventDefault();

            // 🆕 이미지 파일 필수 검증 추가
            if (!this.passportImageFile && !this.existingPassportInfo?.image_url) {
                this.showError('여권 사본 이미지를 업로드해주세요.');
                return;
            }

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

    // === UI 업데이트 메서드들 (로그 최소화) ===

    updatePassportUI() {
        try {
            if (this.existingPassportInfo) {
                // 기존 정보가 있는 경우
                this.hidePassportAlert();
                // 🚨 수정: setTimeout 제거하여 무한 호출 방지
                this.loadExistingPassportDataSafely();
            } else {
                // 신규 입력인 경우
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
            // 페이지 전환
            const flightRequestPage = document.getElementById('flightRequestPage');
            const passportInfoPage = document.getElementById('passportInfoPage');
            
            if (flightRequestPage && passportInfoPage) {
                flightRequestPage.classList.remove('active');
                passportInfoPage.classList.add('active');
                
                // 🚨 수정: setTimeout 제거하여 무한 호출 방지
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

    // 🔧 v1.1.1 수정: 항공권 신청 페이지 전환 버그 수정
    showFlightRequestPage() {
        try {
            console.log('🔄 [여권모듈] 항공권 신청 페이지로 전환 시도...');
            
            // 1. Coordinator 인스턴스 확인 및 페이지 전환
            if (window.flightRequestCoordinator && typeof window.flightRequestCoordinator.routeToPage === 'function') {
                console.log('✅ [여권모듈] Coordinator를 통한 페이지 전환');
                window.flightRequestCoordinator.routeToPage('flight');
                return;
            }
            
            // 2. 대체 방법: 직접 페이지 전환
            const passportInfoPage = document.getElementById('passportInfoPage');
            const flightRequestPage = document.getElementById('flightRequestPage');
            
            if (passportInfoPage && flightRequestPage) {
                console.log('✅ [여권모듈] 직접 페이지 전환');
                passportInfoPage.classList.remove('active');
                passportInfoPage.style.display = 'none';
                flightRequestPage.classList.add('active');
                flightRequestPage.style.display = 'block';
                return;
            }
            
            // 3. 마지막 수단: 페이지 새로고침으로 항공권 페이지로 이동
            console.warn('⚠️ [여권모듈] 페이지 요소를 찾을 수 없음 - 새로고침');
            window.location.reload();
            
        } catch (error) {
            console.error('❌ [여권모듈] 페이지 전환 실패:', error);
            
            // 오류 발생 시 새로고침
            try {
                window.location.reload();
            } catch (reloadError) {
                console.error('❌ [여권모듈] 새로고침도 실패:', reloadError);
                this.showError('페이지 전환에 실패했습니다. 수동으로 새로고침해주세요.');
            }
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

    // === 유틸리티 메서드들 (로그 제거) ===

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
            // UI 서비스가 있다면 사용
            if (this.uiService && typeof this.uiService.showError === 'function') {
                this.uiService.showError(message);
            } else {
                // 폴백: alert 사용
                alert(message);
            }
        } catch (error) {
            console.error('❌ [여권에러] 에러 표시 실패:', error);
            alert(message); // 최후 수단
        }
    }

    showSuccess(message) {
        try {
            // UI 서비스가 있다면 사용
            if (this.uiService && typeof this.uiService.showSuccess === 'function') {
                this.uiService.showSuccess(message);
            }
        } catch (error) {
            console.error('❌ [여권성공] 성공 표시 실패:', error);
        }
    }

    // === 외부 인터페이스 메서드들 ===

    // 여권정보 완료 여부 확인
    isPassportInfoCompleted() {
        return !!(this.existingPassportInfo && this.existingPassportInfo.passport_number);
    }

    // 여권정보 유효성 확인
    isPassportInfoValid() {
        const validation = this.validatePassportInfo();
        return validation.valid;
    }

    // 여권 데이터 반환
    getPassportData() {
        return this.passportData;
    }

    // 기존 여권정보 반환
    getExistingPassportInfo() {
        return this.existingPassportInfo;
    }

    // 여권 이미지 파일 반환
    getPassportImageFile() {
        return this.passportImageFile;
    }

    // 여권 모드 상태 반환
    getPassportMode() {
        return this.isPassportMode;
    }

    // 🚨 수정: 여권정보 새로고침 (무한루프 방지)
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

    // 🚨 신규: 리소스 정리 메서드
    destroy() {
        try {
            // 이벤트 리스너 제거
            if (this.elements.passportInfoForm) {
                this.elements.passportInfoForm.removeEventListener('submit', this.handlePassportSubmit);
            }
            
            // 참조 정리
            this.passportData = null;
            this.passportImageFile = null;
            this.existingPassportInfo = null;
            this.elements = null;
            
            this.isInitialized = false;
            this.eventsBinding = false;
            
        } catch (error) {
            console.error('❌ [여권정리] 리소스 정리 실패:', error);
        }
    }
}

// 전역 인스턴스 생성용 함수
window.createFlightRequestPassport = (apiService, uiService) => {
    return new FlightRequestPassport(apiService, uiService);
};

// 전역 클래스 노출
window.FlightRequestPassport = FlightRequestPassport;

// 🚨 수정: 로그 최소화
console.log('✅ FlightRequestPassport v1.1.1 로드 완료 - 이미지 로딩 + 페이지 전환 수정');
console.log('🔧 v1.1.1 주요 수정사항:', {
    imageLoading: '여권 이미지 로딩 로직 추가 - loadExistingPassportDataSafely()에 이미지 URL 처리',
    pageTransition: '페이지 전환 버그 수정 - showFlightRequestPage()에서 coordinator 메서드 호출',
    imageDisplay: '기존 여권 이미지 자동 표시 기능',
    fallbackMethods: '페이지 전환 실패 시 대체 방법 제공',
    compatibility: '기존 무한루프 해결 기능 100% 유지',
    errorHandling: '페이지 전환 실패 시 새로고침 폴백',
    debugLogging: '페이지 전환 과정 디버깅 로그 추가'
});
