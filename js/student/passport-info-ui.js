// passport-info-ui.js - 여권정보 UI 관리 모듈 v8.2.0 (통합 구조 적응)

class PassportInfoUI {
    constructor() {
        this.api = window.passportAPI;
        this.elements = this.initElements();
        this.imageFile = null;
        this.existingImageUrl = null;
        // 자동 초기화 제거 - 외부에서 호출
    }

    initElements() {
        return {
            // 새로운 통합 구조에 맞는 선택자
            loadingState: document.getElementById('passportLoadingState'),
            passportForm: document.getElementById('passportForm'),
            form: document.getElementById('passportInfoForm'),
            passportNumber: document.getElementById('passportNumber'),
            nameEnglish: document.getElementById('nameEnglish'),
            issueDate: document.getElementById('issueDate'),
            expiryDate: document.getElementById('expiryDate'),
            expiryWarning: document.getElementById('expiryWarning'),
            passportImage: document.getElementById('passportImage'),
            imagePreview: document.getElementById('passportImagePreview'),
            previewImg: document.getElementById('passportPreviewImg'),
            removeImage: document.getElementById('removePassportImage'),
            submitBtn: document.getElementById('passportSubmitBtn'),
            submitBtnText: document.getElementById('passportSubmitBtnText'),
            
            // 통합 구조 추가 요소들
            successMessage: document.getElementById('passportSuccessMessage'),
            proceedBtn: document.getElementById('proceedToFlightRequest'),
            
            // 에러 메시지는 flight-request 페이지의 것을 사용
            errorMessage: document.getElementById('errorMessage')
        };
    }

    async init() {
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 초기 데이터 로드
        await this.loadExistingData();
    }

    setupEventListeners() {
        // DOM 요소 안전성 체크
        if (this.elements.form) {
            this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        if (this.elements.passportImage) {
            this.elements.passportImage.addEventListener('change', (e) => this.handleImageUpload(e));
        }
        
        if (this.elements.removeImage) {
            this.elements.removeImage.addEventListener('click', () => this.removeImage());
        }

        if (this.elements.expiryDate) {
            this.elements.expiryDate.addEventListener('change', () => this.validateExpiryDate());
        }

        // 영문 이름 대문자 변환
        if (this.elements.nameEnglish) {
            this.elements.nameEnglish.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        // 여권번호 대문자 변환
        if (this.elements.passportNumber) {
            this.elements.passportNumber.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase();
            });
        }

        // 항공권 신청 진행 버튼
        if (this.elements.proceedBtn) {
            this.elements.proceedBtn.addEventListener('click', () => {
                if (typeof window.showFlightRequestPage === 'function') {
                    window.showFlightRequestPage();
                }
            });
        }
    }

    async loadExistingData() {
        try {
            this.showLoading(true);
            const passportInfo = await this.api.getPassportInfo();

            if (passportInfo) {
                // 기존 정보 폼에 채우기
                if (this.elements.passportNumber) {
                    this.elements.passportNumber.value = passportInfo.passport_number || '';
                }
                if (this.elements.nameEnglish) {
                    this.elements.nameEnglish.value = passportInfo.name_english || '';
                }
                if (this.elements.issueDate) {
                    this.elements.issueDate.value = passportInfo.issue_date || '';
                }
                if (this.elements.expiryDate) {
                    this.elements.expiryDate.value = passportInfo.expiry_date || '';
                }

                // 기존 이미지가 있으면 미리보기 표시
                if (passportInfo.image_url) {
                    this.existingImageUrl = passportInfo.image_url;
                    this.showImagePreview(passportInfo.image_url);
                }

                // 버튼 텍스트 변경
                if (this.elements.submitBtnText) {
                    this.elements.submitBtnText.textContent = '수정하기';
                }

                // 만료일 검증
                if (passportInfo.expiry_date) {
                    this.validateExpiryDate();
                }
            }
        } catch (error) {
            console.error('여권정보 로드 오류:', error);
            this.showError('여권정보를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.showError('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showError('파일 크기는 5MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        this.imageFile = file;

        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = (e) => {
            this.showImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    showImagePreview(src) {
        if (this.elements.previewImg && this.elements.imagePreview) {
            this.elements.previewImg.src = src;
            this.elements.imagePreview.style.display = 'block';
        }
    }

    removeImage() {
        this.imageFile = null;
        this.existingImageUrl = null;
        
        if (this.elements.passportImage) {
            this.elements.passportImage.value = '';
        }
        if (this.elements.imagePreview) {
            this.elements.imagePreview.style.display = 'none';
        }
        if (this.elements.previewImg) {
            this.elements.previewImg.src = '';
        }
    }

    validateExpiryDate() {
        if (!this.elements.expiryDate || !this.elements.expiryWarning) return true;
        
        const expiryDate = this.elements.expiryDate.value;
        if (!expiryDate) return true;

        const validation = this.api.validateExpiryDate(expiryDate);
        
        if (!validation.valid) {
            this.elements.expiryWarning.textContent = validation.message;
            this.elements.expiryWarning.style.display = 'block';
            this.elements.expiryWarning.style.color = '#dc3545';
            return false;
        }

        if (validation.warning) {
            this.elements.expiryWarning.textContent = validation.warning;
            this.elements.expiryWarning.style.display = 'block';
            this.elements.expiryWarning.style.color = '#ff6b00';
        } else {
            this.elements.expiryWarning.style.display = 'none';
        }

        return true;
    }

    async handleSubmit(event) {
        event.preventDefault();

        // 만료일 검증
        const validation = this.api.validateExpiryDate(this.elements.expiryDate?.value);
        if (!validation.valid) {
            this.showError(validation.message);
            return;
        }

        // 이미지 확인 (신규 등록 시 필수)
        if (!this.imageFile && !this.existingImageUrl) {
            this.showError('여권 사본을 업로드해주세요.');
            return;
        }

        try {
            this.setLoading(true);

            const passportData = {
                passport_number: this.elements.passportNumber?.value?.trim() || '',
                name_english: this.elements.nameEnglish?.value?.trim() || '',
                issue_date: this.elements.issueDate?.value || '',
                expiry_date: this.elements.expiryDate?.value || ''
            };

            const result = await this.api.savePassportInfo(passportData, this.imageFile);

            // 성공 시 성공 메시지 표시 후 항공권 신청 페이지로 안내
            this.showSuccessTransition(result.isUpdate);

        } catch (error) {
            console.error('저장 실패:', error);
            this.showError(error.message || '저장 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    showSuccessTransition(isUpdate) {
        // 폼 숨기고 성공 메시지 표시
        if (this.elements.passportForm) {
            this.elements.passportForm.style.display = 'none';
        }
        if (this.elements.successMessage) {
            this.elements.successMessage.style.display = 'block';
        }

        // 성공 메시지 업데이트
        const successTitle = this.elements.successMessage.querySelector('h3');
        if (successTitle) {
            successTitle.textContent = isUpdate ? 
                '여권정보가 성공적으로 수정되었습니다!' : 
                '여권정보가 성공적으로 등록되었습니다!';
        }

        // 자동으로 항공권 신청 페이지로 이동 (5초 후)
        setTimeout(() => {
            if (typeof window.showFlightRequestPage === 'function') {
                window.showFlightRequestPage();
            }
        }, 3000);
    }

    showLoading(show) {
        if (this.elements.loadingState) {
            this.elements.loadingState.style.display = show ? 'flex' : 'none';
        }
        if (this.elements.passportForm) {
            this.elements.passportForm.style.display = show ? 'none' : 'block';
        }
    }

    setLoading(loading) {
        if (this.elements.submitBtn) {
            this.elements.submitBtn.disabled = loading;
        }
        if (this.elements.submitBtnText) {
            this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
                (this.existingImageUrl ? '수정하기' : '저장하기');
        }
    }

    showError(message) {
        // flight-request 페이지의 에러 메시지 요소 사용
        if (this.elements.errorMessage) {
            this.elements.errorMessage.textContent = message;
            this.elements.errorMessage.style.display = 'block';
            
            // 5초 후 자동 숨김
            setTimeout(() => {
                this.elements.errorMessage.style.display = 'none';
            }, 5000);
        } else {
            // 폴백: alert 사용
            alert(message);
        }
    }

    // 🆕 외부에서 여권정보 존재 여부를 확인할 수 있는 메서드
    async checkPassportInfo() {
        try {
            const passportInfo = await this.api.getPassportInfo();
            return !!passportInfo;
        } catch (error) {
            console.error('여권정보 확인 오류:', error);
            return false;
        }
    }

    // 🆕 데이터 새로고침 메서드
    async refreshData() {
        await this.loadExistingData();
    }
}

// 더 이상 자동 초기화하지 않음 - flight-request.html에서 수동으로 초기화
// PassportInfoUI 클래스만 노출
window.PassportInfoUI = PassportInfoUI;
