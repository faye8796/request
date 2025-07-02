// flight-request-ui.js - 항공권 신청 UI 관리 모듈

class FlightRequestUI {
    constructor() {
        this.api = window.flightRequestAPI;
        this.utils = window.FlightRequestUtils;
        this.elements = this.initElements();
        this.imageFile = null;
        this.ticketFile = null;
        this.receiptFile = null;
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
            
            // 모달
            ticketSubmitModal: document.getElementById('ticketSubmitModal'),
            ticketSubmitForm: document.getElementById('ticketSubmitForm'),
            ticketFile: document.getElementById('ticketFile'),
            ticketPreview: document.getElementById('ticketPreview'),
            ticketFileName: document.getElementById('ticketFileName'),
            ticketFileSize: document.getElementById('ticketFileSize'),
            
            receiptSubmitModal: document.getElementById('receiptSubmitModal'),
            receiptSubmitForm: document.getElementById('receiptSubmitForm'),
            receiptFile: document.getElementById('receiptFile'),
            receiptPreview: document.getElementById('receiptPreview'),
            receiptFileName: document.getElementById('receiptFileName'),
            receiptFileSize: document.getElementById('receiptFileSize'),
            
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
        this.elements.ticketSubmitForm.addEventListener('submit', (e) => this.handleTicketSubmit(e));
        this.elements.receiptSubmitForm.addEventListener('submit', (e) => this.handleReceiptSubmit(e));

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

        // 파일 업로드
        this.elements.ticketFile.addEventListener('change', (e) => this.handleFileUpload(e, 'ticket'));
        this.elements.receiptFile.addEventListener('change', (e) => this.handleFileUpload(e, 'receipt'));

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
                    <span class="status-badge ${statusInfo.class}\">${statusInfo.text}</span>
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
        
        // 상태별 추가 정보
        if (request.status === 'rejected' && request.rejection_reason) {
            html += `
                    <div class="info-group">
                        <label class="text-danger">반려 사유</label>
                        <p class="text-danger">${request.rejection_reason}</p>
                    </div>
            `;
        }
        
        // 직접구매 승인 후 제출 상태
        if (request.status === 'approved' && request.purchase_type === 'direct') {
            html += `
                </div>
                <div class="submission-status">
                    <h3>제출 현황</h3>
                    <div class="submission-item">
                        ${request.ticket_url ? 
                            '<svg class="status-check" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
                            '<svg class="status-waiting" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>'
                        }
                        <span>항공권 ${request.ticket_url ? '제출 완료' : '제출 대기'}</span>
                    </div>
                    <div class="submission-item">
                        ${request.receipt_url ? 
                            '<svg class="status-check" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M20 6L9 17L4 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' :
                            '<svg class="status-waiting" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/></svg>'
                        }
                        <span>영수증 ${request.receipt_url ? '제출 완료' : '제출 대기'}</span>
                    </div>
            `;
        }
        
        // 구매대행 승인 후 대기 상태
        if (request.status === 'approved' && request.purchase_type === 'agency') {
            if (!request.admin_ticket_url) {
                html += `
                </div>
                <div class="waiting-message">
                    <svg class="waiting-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2V6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M12 18V22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4.93 4.93L7.76 7.76" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16.24 16.24L19.07 19.07" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M2 12H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M18 12H22" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M4.93 19.07L7.76 16.24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M16.24 7.76L19.07 4.93" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <p>관리자가 항공권을 구매 중입니다. 잠시만 기다려주세요.</p>
                `;
            }
        }
        
        html += `
                </div>
                
                <div class="request-actions">
        `;
        
        // 상태별 액션 버튼
        if (request.status === 'pending') {
            html += `
                    <button class="btn btn-secondary" onclick="flightRequestUI.showUpdateForm()">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M11 4H4C3.46957 4 2.96086 4.21071 2.58579 4.58579C2.21071 4.96086 2 5.46957 2 6V20C2 20.5304 2.21071 21.0391 2.58579 21.4142C2.96086 21.7893 3.46957 22 4 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M18.5 2.5C18.8978 2.10217 19.4374 1.87868 20 1.87868C20.5626 1.87868 21.1022 2.10217 21.5 2.5C21.8978 2.89782 22.1213 3.43739 22.1213 4C22.1213 4.56261 21.8978 5.10218 21.5 5.5L12 15L8 16L9 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        수정하기
                    </button>
                    <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        삭제하기
                    </button>
            `;
        } else if (request.status === 'approved' && request.purchase_type === 'direct') {
            if (!request.ticket_url) {
                html += `
                    <button class="btn btn-primary" onclick="flightRequestUI.openModal('ticketSubmitModal')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 16V8C21 6.89543 20.1046 6 19 6H14L12 3H9L7 6H2C0.89543 6 0 6.89543 0 8V16C0 17.1046 0.89543 18 2 18H19C20.1046 18 21 17.1046 21 16Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 10V14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        항공권 제출
                    </button>
                `;
            }
            if (!request.receipt_url) {
                html += `
                    <button class="btn btn-warning" onclick="flightRequestUI.openModal('receiptSubmitModal')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14 2H6C5.46957 2 4.96086 2.21071 4.58579 2.58579C4.21071 2.96086 4 3.46957 4 4V20C4 20.5304 4.21071 21.0391 4.58579 21.4142C4.96086 21.7893 5.46957 22 6 22H18C18.5304 22 19.0391 21.7893 19.4142 21.4142C19.7893 21.0391 20 20.5304 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 13H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M16 17H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M10 9H9H8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        영수증 제출
                    </button>
                `;
            }
        } else if (request.status === 'approved' && request.purchase_type === 'agency' && request.admin_ticket_url) {
            html += `
                    <a href="${request.admin_ticket_url}" target="_blank" class="btn btn-success">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.4696 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M7 10L12 15L17 10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 15V3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        항공권 다운로드
                    </a>
            `;
        } else if (request.status === 'rejected') {
            html += `
                    <button class="btn btn-danger" onclick="flightRequestUI.deleteRequest('${request.id}')">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M8 6V4C8 3.46957 8.21071 2.96086 8.58579 2.58579C8.96086 2.21071 9.46957 2 10 2H14C14.5304 2 15.0391 2.21071 15.4142 2.58579C15.7893 2.96086 16 3.46957 16 4V6M19 6V20C19 20.5304 18.7893 21.0391 18.4142 21.4142C18.0391 21.7893 17.5304 22 17 22H7C6.46957 22 5.96086 21.7893 5.58579 21.4142C5.21071 21.0391 5 20.5304 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        삭제하고 재신청
                    </button>
            `;
        }
        
        html += `
                    <button class="btn btn-secondary" onclick="window.location.href='dashboard.html'">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M19 12H5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M12 19L5 12L12 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                        뒤로가기
                    </button>
                </div>
            </div>
        `;
        
        this.elements.existingRequest.innerHTML = html;
    }

    showUpdateForm() {
        this.showRequestForm(true);
        this.populateForm(this.existingRequest);
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

    handleFileUpload(event, type) {
        const file = event.target.files[0];
        if (!file) return;

        // 파일 유효성 검사
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            this.utils.showError('PDF, JPG, PNG 형식만 업로드 가능합니다.');
            event.target.value = '';
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.utils.showError('파일 크기는 10MB를 초과할 수 없습니다.');
            event.target.value = '';
            return;
        }

        if (type === 'ticket') {
            this.ticketFile = file;
            this.elements.ticketFileName.textContent = file.name;
            this.elements.ticketFileSize.textContent = this.utils.formatFileSize(file.size);
            this.elements.ticketPreview.style.display = 'flex';
        } else if (type === 'receipt') {
            this.receiptFile = file;
            this.elements.receiptFileName.textContent = file.name;
            this.elements.receiptFileSize.textContent = this.utils.formatFileSize(file.size);
            this.elements.receiptPreview.style.display = 'flex';
        }
    }

    removeFile(type) {
        if (type === 'ticket') {
            this.ticketFile = null;
            this.elements.ticketFile.value = '';
            this.elements.ticketPreview.style.display = 'none';
        } else if (type === 'receipt') {
            this.receiptFile = null;
            this.elements.receiptFile.value = '';
            this.elements.receiptPreview.style.display = 'none';
        }
    }

    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    }

    async handleSubmit(event) {
        event.preventDefault();

        // 날짜 및 기간 검증
        if (!this.validateDuration()) {
            return;
        }

        // 이미지 확인 (새 신청 또는 이미지 변경 시 필수)
        const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
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
                requestData.status = 'pending'; // 수정 시 pending으로 변경
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

    async handleTicketSubmit(event) {
        event.preventDefault();

        if (!this.ticketFile) {
            this.utils.showError('항공권 파일을 선택해주세요.');
            return;
        }

        try {
            this.setLoading(true);

            // 항공권 파일 업로드 및 DB 업데이트
            await this.api.submitTicket(this.existingRequest.id, this.ticketFile);
            
            this.utils.showSuccess('항공권이 성공적으로 제출되었습니다.');
            this.closeModal('ticketSubmitModal');
            
            // 데이터 새로고침
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('항공권 제출 실패:', error);
            this.utils.showError('항공권 제출 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    async handleReceiptSubmit(event) {
        event.preventDefault();

        if (!this.receiptFile) {
            this.utils.showError('영수증 파일을 선택해주세요.');
            return;
        }

        try {
            this.setLoading(true);

            // 영수증 파일 업로드 및 DB 업데이트
            await this.api.submitReceipt(this.existingRequest.id, this.receiptFile);
            
            this.utils.showSuccess('영수증이 성공적으로 제출되었습니다.');
            this.closeModal('receiptSubmitModal');
            
            // 데이터 새로고침
            setTimeout(() => {
                window.location.reload();
            }, 2000);

        } catch (error) {
            console.error('영수증 제출 실패:', error);
            this.utils.showError('영수증 제출 중 오류가 발생했습니다.');
        } finally {
            this.setLoading(false);
        }
    }

    async deleteRequest(requestId) {
        if (!confirm('정말로 신청을 삭제하시겠습니까?')) {
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
        const isUpdate = this.existingRequest && (this.existingRequest.status === 'pending' || this.existingRequest.status === 'rejected');
        this.elements.submitBtnText.textContent = loading ? '처리 중...' : 
            (isUpdate ? '수정하기' : '신청하기');
        
        // 모달 버튼도 처리
        const modalButtons = document.querySelectorAll('.modal .btn-primary');
        modalButtons.forEach(btn => {
            btn.disabled = loading;
            if (loading) {
                btn.textContent = '처리 중...';
            }
        });
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