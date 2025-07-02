// flight-request-ui.js - 항공권 신청 UI 관리 모듈

class FlightRequestUI {
    constructor() {
        this.api = window.flightRequestAPI;
        this.utils = window.FlightRequestUtils;
        this.elements = this.initElements();
        this.imageFile = null;
        this.userProfile = null;
        this.existingRequest = null;
        this.init();
    }

    initElements() {
        return {
            // 로딩/컨텐츠
            loadingState: document.getElementById('loadingState'),
            mainContent: document.getElementById('mainContent'),
            passportAlert: document.getElementById('passportAlert'),
            existingRequest: document.getElementById('existingRequest'),
            requestForm: document.getElementById('requestForm'),
            
            // 폼 요소
            form: document.getElementById('flightRequestForm'),
            purchaseType: document.getElementsByName('purchaseType'),
            departureDate: document.getElementById('departureDate'),
            returnDate: document.getElementById('returnDate'),
            durationMessage: document.getElementById('durationMessage'),
            departureAirport: document.getElementById('departureAirport'),
            arrivalAirport: document.getElementById('arrivalAirport'),
            purchaseLink: document.getElementById('purchaseLink'),
            purchaseLinkGroup: document.getElementById('purchaseLinkGroup'),
            flightImage: document.getElementById('flightImage'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            removeImage: document.getElementById('removeImage'),
            submitBtn: document.getElementById('submitBtn'),
            submitBtnText: document.getElementById('submitBtnText'),
            
            // 메시지
            errorMessage: document.getElementById('errorMessage'),
            successMessage: document.getElementById('successMessage'),
            logoutBtn: document.getElementById('logoutBtn')
        };
    }

    async init() {
        try {
            // 이벤트 리스너 설정
            this.setupEventListeners();
            
            // 초기 데이터 로드
            await this.loadInitialData();
        } catch (error) {
            console.error('초기화 오류:', error);
            this.utils.showError('시스템 초기화 중 오류가 발생했습니다.');
        }
    }

    setupEventListeners() {
        // 폼 제출
        this.elements.form.addEventListener('submit', (e) => this.handleSubmit(e));

        // 구매 방식 변경
        this.elements.purchaseType.forEach(radio => {
            radio.addEventListener('change', () => this.handlePurchaseTypeChange());
        });

        // 날짜 변경
        this.elements.departureDate.addEventListener('change', () => this.validateDuration());
        this.elements.returnDate.addEventListener('change', () => this.validateDuration());

        // 이미지 업로드
        this.elements.flightImage.addEventListener('change', (e) => this.handleImageUpload(e));
        this.elements.removeImage.addEventListener('click', () => this.removeImage());

        // 로그아웃
        this.elements.logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            await this.api.supabase.auth.signOut();
            window.location.href = '../index.html';
        });

        // 오늘 날짜로 최소값 설정
        const today = new Date().toISOString().split('T')[0];
        this.elements.departureDate.min = today;
        this.elements.returnDate.min = today;
    }

    async loadInitialData() {
        try {
            this.showLoading(true);

            // 사용자 프로필 가져오기
            this.userProfile = await this.api.getUserProfile();
            
            // 여권정보 확인
            const passportInfo = await this.api.checkPassportInfo();
            
            if (!passportInfo) {
                // 여권정보가 없으면 알림 표시
                this.showPassportAlert();
            } else {
                // 기존 신청 확인
                this.existingRequest = await this.api.getExistingRequest();
                
                if (this.existingRequest) {
                    if (this.existingRequest.status === 'rejected') {
                        // 반려된 경우 수정 폼 표시
                        this.showRequestForm(true);
                        this.populateForm(this.existingRequest);
                    } else {
                        // 기존 신청 내역 표시
                        this.showExistingRequest();
                    }
                } else {
                    // 새 신청 폼 표시
                    this.showRequestForm(false);
                }
            }
        } catch (error) {
            console.error('초기 데이터 로드 실패:', error);
            this.utils.showError('데이터를 불러오는 중 오류가 발생했습니다.');
        } finally {
            this.showLoading(false);
        }
    }

    showLoading(show) {
        this.elements.loadingState.style.display = show ? 'flex' : 'none';
        this.elements.mainContent.style.display = show ? 'none' : 'block';
    }

    showPassportAlert() {
        this.elements.passportAlert.style.display = 'flex';
        this.elements.requestForm.style.display = 'none';
        this.elements.existingRequest.style.display = 'none';
    }

    showRequestForm(isUpdate) {
        this.elements.passportAlert.style.display = 'none';
        this.elements.requestForm.style.display = 'block';
        this.elements.existingRequest.style.display = 'none';
        
        if (isUpdate) {
            this.elements.submitBtnText.textContent = '수정하기';
        } else {
            this.elements.submitBtnText.textContent = '신청하기';
        }
    }

    showExistingRequest() {
        this.elements.passportAlert.style.display = 'none';
        this.elements.requestForm.style.display = 'none';
        this.elements.existingRequest.style.display = 'block';
        
        // 기존 신청 내역 렌더링
        this.renderExistingRequest();
    }

    renderExistingRequest() {
        const request = this.existingRequest;
        const statusInfo = this.utils.getStatusInfo(request.status);
        
        let html = `
            <div class="request-status-card">
                <div class="request-header">
                    <h2>항공권 신청 현황</h2>
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                </div>
                
                <div class="request-info">
                    <div class="info-group">
                        <label>구매 방식</label>
                        <p>${this.utils.getPurchaseTypeText(request.purchase_type)}</p>
                    </div>
                    <div class="info-group">
                        <label>여행 기간</label>
                        <p>${this.utils.formatDate(request.departure_date)} ~ ${this.utils.formatDate(request.return_date)}</p>
                    </div>
                    <div class="info-group">
                        <label>경로</label>
                        <p>${request.departure_airport} → ${request.arrival_airport}</p>
                    </div>
                    <div class="info-group">
                        <label>신청일</label>
                        <p>${this.utils.formatDateTime(request.created_at)}</p>
                    </div>
        `;
        
        if (request.status === 'rejected' && request.rejection_reason) {
            html += `
                    <div class="info-group">
                        <label class="text-danger">반려 사유</label>
                        <p class="text-danger">${request.rejection_reason}</p>
                    </div>
            `;
        }
        
        html += `
                </div>
                
                <div class="request-actions">
        `;
        
        if (request.status === 'pending') {
            html += `
                    <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'">
                        뒤로가기
                    </button>
            `;
        } else if (request.status === 'rejected') {
            html += `
                    <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                        삭제하고 재신청
                    </button>
            `;
        }
        
        html += `
                </div>
            </div>
        `;
        
        this.elements.existingRequest.innerHTML = html;
    }

    populateForm(request) {
        // 구매 방식
        const purchaseTypeRadio = Array.from(this.elements.purchaseType)
            .find(radio => radio.value === request.purchase_type);
        if (purchaseTypeRadio) purchaseTypeRadio.checked = true;
        
        // 날짜
        this.elements.departureDate.value = request.departure_date;
        this.elements.returnDate.value = request.return_date;
        
        // 공항
        this.elements.departureAirport.value = request.departure_airport;
        this.elements.arrivalAirport.value = request.arrival_airport;
        
        // 구매 링크
        if (request.purchase_link) {
            this.elements.purchaseLink.value = request.purchase_link;
        }
        
        // 구매 방식에 따른 UI 업데이트
        this.handlePurchaseTypeChange();
        
        // 파견 기간 검증
        this.validateDuration();
    }

    handlePurchaseTypeChange() {
        const selectedType = Array.from(this.elements.purchaseType)
            .find(radio => radio.checked)?.value;
        
        if (selectedType === 'direct') {
            this.elements.purchaseLinkGroup.style.display = 'block';
        } else {
            this.elements.purchaseLinkGroup.style.display = 'none';
            this.elements.purchaseLink.value = '';
        }
    }

    validateDuration() {
        const departureDate = this.elements.departureDate.value;
        const returnDate = this.elements.returnDate.value;
        
        if (!departureDate || !returnDate) {
            this.elements.durationMessage.textContent = '';
            return true;
        }
        
        const dateValidation = this.utils.validateDates(departureDate, returnDate);
        if (!dateValidation.valid) {
            this.elements.durationMessage.textContent = dateValidation.message;
            this.elements.durationMessage.style.color = '#dc3545';
            return false;
        }
        
        const duration = this.utils.calculateDuration(departureDate, returnDate);
        const dispatchDuration = this.userProfile?.dispatch_duration || 90;
        const durationValidation = this.utils.validateDispatchDuration(duration, dispatchDuration);
        
        if (!durationValidation.valid) {
            this.elements.durationMessage.textContent = durationValidation.message;
            this.elements.durationMessage.style.color = '#dc3545';
            return false;
        }
        
        this.elements.durationMessage.textContent = `파견 기간: ${duration}일`;
        this.elements.durationMessage.style.color = '#28a745';
        return true;
    }

    handleImageUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.utils.showError('JPG, PNG 형식의 이미지만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.utils.showError('파일 크기는 5MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        this.imageFile = file;

        // 미리보기 표시
        const reader = new FileReader();
        reader.onload = (e) => {
            this.elements.previewImg.src = e.target.result;
            this.elements.imagePreview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }

    removeImage() {
        this.imageFile = null;
        this.elements.flightImage.value = '';
        this.elements.imagePreview.style.display = 'none';
        this.elements.previewImg.src = '';
    }

    async handleSubmit(event) {
        event.preventDefault();

        // 날짜 및 기간 검증
        if (!this.validateDuration()) {
            return;
        }

        // 이미지 확인 (새 신청 또는 이미지 변경 시 필수)
        const isUpdate = this.existingRequest && this.existingRequest.status === 'rejected';
        if (!isUpdate && !this.imageFile) {
            this.utils.showError('항공권 정보 이미지를 업로드해주세요.');
            return;
        }

        try {
            this.setLoading(true);

            const selectedType = Array.from(this.elements.purchaseType)
                .find(radio => radio.checked)?.value;

            const requestData = {
                purchase_type: selectedType,
                departure_date: this.elements.departureDate.value,
                return_date: this.elements.returnDate.value,
                departure_airport: this.elements.departureAirport.value.trim(),
                arrival_airport: this.elements.arrivalAirport.value.trim(),
                purchase_link: selectedType === 'direct' ? this.elements.purchaseLink.value.trim() : null
            };

            let result;
            if (isUpdate) {
                requestData.version = this.existingRequest.version;
                result = await this.api.updateFlightRequest(
                    this.existingRequest.id,
                    requestData,
                    this.imageFile
                );
                this.utils.showSuccess('항공권 신청이 성공적으로 수정되었습니다.');
            } else {
                result = await this.api.createFlightRequest(requestData, this.imageFile);
                this.utils.showSuccess('항공권 신청이 성공적으로 접수되었습니다.');
            }

            // 3초 후 메인 페이지로 이동
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 3000);

        } catch (error) {
            console.error('신청 실패:', error);
            this.utils.showError(error.message || '신청 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteRequest(requestId) {
        if (!confirm('정말로 반려된 신청을 삭제하고 다시 신청하시겠습니까?')) {
            return;
        }

        try {
            this.setLoading(true);
            await this.api.deleteFlightRequest(requestId);
            
            // 페이지 새로고침
            window.location.reload();
        } catch (error) {
            console.error('삭제 실패:', error);
            this.utils.showError('신청 삭제 중 오류가 발생했습니다.');
            this.setLoading(false);
        }
    }

    setLoading(loading) {
        this.elements.submitBtn.disabled = loading;
        const isUpdate = this.existingRequest && this.existingRequest.status === 'rejected';
        this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
            (isUpdate ? '수정하기' : '신청하기');
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
        window.flightRequestUI = new FlightRequestUI();
    });
});