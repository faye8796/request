// passport-info-ui.js - 여권정보 UI 관리 모듈

class PassportUI {
    constructor() {
        this.api = window.passportAPI;
        this.elements = this.initElements();
        this.imageFile = null;
        this.existingImageUrl = null;
        this.init();
    }

    initElements() {
        return {
            loadingState: document.getElementById('loadingState'),
            passportForm: document.getElementById('passportForm'),
            form: document.getElementById('passportInfoForm'),
            passportNumber: document.getElementById('passportNumber'),
            nameEnglish: document.getElementById('nameEnglish'),
            issueDate: document.getElementById('issueDate'),
            expiryDate: document.getElementById('expiryDate'),
            expiryWarning: document.getElementById('expiryWarning'),
            passportImage: document.getElementById('passportImage'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            removeImage: document.getElementById('removeImage'),
            submitBtn: document.getElementById('submitBtn'),
            submitBtnText: document.getElementById('submitBtnText'),
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage'),
            logoutBtn: document.getElementById('logoutBtn')
        };
    }

    async init() {
        // 이벤트 리스너 설정
        this.setupEventListeners();
        
        // 초기 데이터 로드
        await this.loadExistingData();
    }

    setupEventListeners() {
        // 폼 제출
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // 이미지 업로드
        this.elements.passportImage.addEventListener('change', (e) => this.handleImageUpload(e));
        
        // 이미지 제거
        this.elements.removeImage.addEventListener('click', () => this.removeImage());

        // 만료일 검증
        this.elements.expiryDate.addEventListener('change', () => this.validateExpiryDate());

        // 영문 이름 대문자 변환
        this.elements.nameEnglish.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // 여권번호 대문자 변환
        this.elements.passportNumber.addEventListener('input', (e) => {
            e.target.value = e.target.value.toUpperCase();
        });

        // 로그아웃
        this.elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.api.supabase.auth.signOut();
            window.location.href = '../index.html';
        });
    }

    async loadExistingData() {
        try {
            this.showLoading(true);
            const passportInfo = await this.api.getPassportInfo();

            if (passportInfo) {
                // 기존 정보 폼에 채우기
                this.elements.passportNumber.value = passportInfo.passport_number || '';
                this.elements.nameEnglish.value = passportInfo.name_english || '';
                this.elements.issueDate.value = passportInfo.issue_date || '';
                this.elements.expiryDate.value = passportInfo.expiry_date || '';

                // 기존 이미지가 있으면 미리보기 표시
                if (passportInfo.image_url) {
                    this.existingImageUrl = passportInfo.image_url;
                    this.showImagePreview(passportInfo.image_url);
                }

                // 버튼 텍스트 변경
                this.elements.submitBtnText.textContent = '수정하기';

                // 만료일 검증
                if (passportInfo.expiry_date) {
                    this.validateExpiryDate();
                }
            }
        } catch (error) {
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
        this.elements.previewImg.src = src;
        this.elements.imagePreview.style.display = 'block';
    }

    removeImage() {
        this.imageFile = null;
        this.existingImageUrl = null;
        this.elements.passportImage.value = '';
        this.elements.imagePreview.style.display = 'none';
        this.elements.previewImg.src = '';
    }

    validateExpiryDate() {
        const expiryDate = this.elements.expiryDate.value;
        if (!expiryDate) return;

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
        const validation = this.api.validateExpiryDate(this.elements.expiryDate.value);
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
                passport_number: this.elements.passportNumber.value.trim(),
                name_english: this.elements.nameEnglish.value.trim(),
                issue_date: this.elements.issueDate.value,
                expiry_date: this.elements.expiryDate.value
            };

            const result = await this.api.savePassportInfo(passportData, this.imageFile);

            if (result.isUpdate) {
                this.showSuccess('여권정보가 성공적으로 수정되었습니다.');
            } else {
                this.showSuccess('여권정보가 성공적으로 등록되었습니다.');
            }

            // 3초 후 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);

        } catch (error) {
            console.error('저장 실패:', error);
            this.showError(error.message || '저장 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    showLoading(show) {
        this.elements.loadingState.style.display = show ? 'flex' : 'none';
        this.elements.passportForm.style.display = show ? 'none' : 'block';
    }

    setLoading(loading) {
        this.elements.submitBtn.disabled = loading;
        this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
            (this.existingImageUrl ? '수정하기' : '저장하기');
    }

    showError(message) {
        this.elements.errorMessage.textContent = message;
        this.elements.errorMessage.style.display = 'block';
        this.elements.successMessage.style.display = 'none';
        
        // 5초 후 자동 숨김
        setTimeout(() => {
            this.elements.errorMessage.style.display = 'none';
        }, 5000);
    }

    showSuccess(message) {
        this.elements.successMessage.textContent = message;
        this.elements.successMessage.style.display = 'block';
        this.elements.errorMessage.style.display = 'none';
    }
}

// 페이지 로드 시 초기화
document.addEventListener('DOMContentLoaded', () => {
    // 인증 체크
    window.supabase.auth.getUser().then(({ data: { user }, error }) => {
        if (!user) {
            window.location.href = '../index.html';
            return;
        }
        
        // UI 초기화
        new PassportUI();
    });
});