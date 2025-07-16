// flight-request-passport.js - 여권정보 관리 모듈 v1.0.0
// 🆕 Phase 1: flight-request-ui.js에서 여권정보 관련 기능 분리
// 📝 분리된 기능들:
//   - 여권정보 로딩/저장/검증
//   - 여권 이미지 업로드/제거
//   - 여권 만료일 검증
//   - 여권정보 UI 업데이트
//   - 여권 관련 이벤트 핸들러

class FlightRequestPassport {
    constructor(apiService, uiService) {
        this.apiService = apiService;
        this.uiService = uiService;
        
        // 여권정보 관련 상태
        this.passportData = {};
        this.passportImageFile = null;
        this.isPassportMode = false;
        this.existingPassportInfo = null;
        
        // DOM 요소들 초기화
        this.elements = this.initPassportElements();
        
        // 초기화
        this.init();
    }

    init() {
        try {
            console.log('🔄 [여권모듈] FlightRequestPassport v1.0.0 초기화 시작...');
            
            // 이벤트 리스너 설정
            this.bindEvents();
            
            // 여권정보 로드
            this.loadPassportInfo();
            
            console.log('✅ [여권모듈] FlightRequestPassport v1.0.0 초기화 완료');
        } catch (error) {
            console.error('❌ [여권모듈] 초기화 실패:', error);
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
            console.log('🔄 [여권이벤트] 여권정보 이벤트 리스너 설정 시작...');
            
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

            console.log('✅ [여권이벤트] 여권정보 이벤트 리스너 설정 완료');
        } catch (error) {
            console.error('❌ [여권이벤트] 이벤트 리스너 설정 실패:', error);
        }
    }

    // === 여권정보 로딩 및 관리 ===

    async loadPassportInfo() {
        try {
            console.log('🔄 [여권로딩] 여권정보 로딩 시작...');
            
            if (!this.apiService) {
                console.warn('⚠️ [여권로딩] API 서비스가 설정되지 않음');
                return;
            }

            // API를 통해 기존 여권정보 로드
            this.existingPassportInfo = await this.apiService.loadPassportInfo();
            
            if (this.existingPassportInfo) {
                console.log('✅ [여권로딩] 기존 여권정보 발견');
                this.loadExistingPassportDataAndSetMode();
            } else {
                console.log('⚠️ [여권로딩] 여권정보 없음 - 신규 입력 모드');
                this.showPassportAlert();
            }
            
        } catch (error) {
            console.error('❌ [여권로딩] 여권정보 로딩 실패:', error);
            this.showPassportAlert();
        }
    }

    async loadExistingPassportDataAndSetMode() {
        try {
            console.log('🔄 [여권데이터] 기존 여권정보 로드 및 모드 설정');
            
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
                
                this.isPassportMode = true;
                this.passportData = { ...this.existingPassportInfo };
                
                console.log('✅ [여권데이터] 기존 데이터 로드 완료');
            }
        } catch (error) {
            console.error('❌ [여권데이터] 로드 실패:', error);
        }
    }

    // === 여권정보 검증 ===

    validatePassportInfo() {
        try {
            console.log('🔄 [여권검증] 여권정보 검증 시작...');
            
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
            
            // 여권번호 형식 검증 (기본적인 검증)
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
            
            console.log('✅ [여권검증] 여권정보 검증 완료');
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

    // === 여권 이미지 관리 ===

    handlePassportImageUpload(event) {
        try {
            const file = event.target.files[0];
            if (!file) return;
            
            console.log('🔄 [여권이미지] 이미지 업로드 처리:', file.name);
            
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
            
            console.log('✅ [여권이미지] 업로드 준비 완료:', file.name);
            
        } catch (error) {
            console.error('❌ [여권이미지] 업로드 실패:', error);
            this.showError('이미지 업로드 중 오류가 발생했습니다.');
        }
    }

    removePassportImage() {
        try {
            console.log('🗑️ [여권이미지] 이미지 제거');
            
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
            
            console.log('✅ [여권이미지] 제거 완료');
            
        } catch (error) {
            console.error('❌ [여권이미지] 제거 실패:', error);
        }
    }

    // === 여권정보 저장 ===

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
            
            // API를 통해 저장
            if (!this.apiService) {
                throw new Error('API 서비스가 설정되지 않았습니다');
            }
            
            const result = await this.apiService.savePassportInfo(passportData, this.passportImageFile);
            
            console.log('✅ [여권저장] 여권정보 저장 완료:', result);
            
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
            console.log('🔄 [여권제출] 여권정보 제출 처리 시작...');
            
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
            console.log('🔄 [여권UI] 여권정보 UI 업데이트');
            
            if (this.existingPassportInfo) {
                // 기존 정보가 있는 경우
                this.hidePassportAlert();
                this.loadExistingPassportDataAndSetMode();
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
            console.log('🔄 [여권알림] 여권정보 알림 표시');
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
            console.log('🔄 [여권알림] 여권정보 알림 숨김');
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
            console.log('🔄 [여권페이지] 여권정보 페이지 표시 시작...');
            
            // 페이지 전환
            const flightRequestPage = document.getElementById('flightRequestPage');
            const passportInfoPage = document.getElementById('passportInfoPage');
            
            if (flightRequestPage && passportInfoPage) {
                flightRequestPage.classList.remove('active');
                passportInfoPage.classList.add('active');
                
                console.log('✅ [여권페이지] 페이지 전환 완료');
                
                // 기존 여권정보가 있다면 로드
                setTimeout(async () => {
                    await this.loadExistingPassportDataAndSetMode();
                }, 100);
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
                
                console.log('✅ [여권성공] 성공 메시지 표시');
            }
        } catch (error) {
            console.error('❌ [여권성공] 메시지 표시 실패:', error);
        }
    }

    // === 유틸리티 메서드들 ===

    setLoading(loading) {
        try {
            console.log('🔄 [여권로딩] 로딩 상태:', loading);
            
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
            console.error('❌ [여권에러]:', message);
            
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
            console.log('✅ [여권성공]:', message);
            
            // UI 서비스가 있다면 사용
            if (this.uiService && typeof this.uiService.showSuccess === 'function') {
                this.uiService.showSuccess(message);
            } else {
                // 간단한 성공 표시
                console.log('성공:', message);
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

    // 여권정보 새로고침
    async refreshPassportInfo() {
        try {
            console.log('🔄 [여권새로고침] 여권정보 새로고침 시작...');
            await this.loadPassportInfo();
            this.updatePassportUI();
            console.log('✅ [여권새로고침] 여권정보 새로고침 완료');
        } catch (error) {
            console.error('❌ [여권새로고침] 새로고침 실패:', error);
        }
    }
}

// 전역 인스턴스 생성용 함수
window.createFlightRequestPassport = (apiService, uiService) => {
    return new FlightRequestPassport(apiService, uiService);
};

// 전역 클래스 노출
window.FlightRequestPassport = FlightRequestPassport;

console.log('✅ FlightRequestPassport v1.0.0 모듈 로드 완료');
console.log('🆕 Phase 1 분리 완료: 여권정보 관리 모듈', {
    분리된기능: [
        '여권정보 로딩/저장/검증',
        '여권 이미지 업로드/제거',
        '여권 만료일 검증',
        '여권정보 UI 업데이트',
        '여권 관련 이벤트 핸들러'
    ],
    독립성: {
        API의존성: 'apiService 인터페이스를 통한 느슨한 결합',
        UI의존성: 'uiService 인터페이스를 통한 에러/성공 표시',
        DOM독립성: '자체 DOM 요소 관리 시스템',
        상태관리: '독립적인 여권정보 상태 관리'
    },
    외부인터페이스: [
        'isPassportInfoCompleted()',
        'isPassportInfoValid()',
        'getPassportData()',
        'getExistingPassportInfo()',
        'refreshPassportInfo()'
    ]
});
