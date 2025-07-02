// flight-request-ui.js - 항공권 신청 UI 관리

// 전역 변수
let currentRequest = null;
let userProfile = null;
let isEditMode = false;

// 초기화 함수
async function initializeFlightRequest() {
    try {
        showLoading('flightStatusContainer');
        
        // 사용자 프로필 로드
        const profileResult = await flightRequestAPI.getUserProfile();
        if (profileResult.success) {
            userProfile = profileResult.data;
            // 파견 기간 표시
            if (userProfile.dispatch_duration) {
                document.getElementById('dispatchDuration').textContent = userProfile.dispatch_duration;
            }
        }

        // 현재 신청 현황 로드
        await loadFlightStatus();
        
        // 이벤트 리스너 설정
        setupEventListeners();
        
    } catch (error) {
        console.error('초기화 오류:', error);
        showError('flightStatusContainer', '데이터를 불러오는 중 오류가 발생했습니다.');
    }
}

// 신청 현황 로드
async function loadFlightStatus() {
    const result = await flightRequestAPI.getMyFlightRequest();
    
    if (result.success) {
        currentRequest = result.data;
        
        if (currentRequest) {
            // 신청 내역이 있는 경우
            renderFlightStatus(currentRequest);
            
            // 상태에 따라 폼 표시 여부 결정
            if (currentRequest.status === 'rejected') {
                // 반려된 경우 수정 가능
                showFlightForm(true);
                fillFormData(currentRequest);
            } else {
                // 그 외의 경우 폼 숨김
                hideFlightForm();
            }
        } else {
            // 신청 내역이 없는 경우
            renderNoRequest();
            showFlightForm(false);
        }
    } else {
        showError('flightStatusContainer', '신청 현황을 불러올 수 없습니다.');
    }
}

// 신청 현황 렌더링
function renderFlightStatus(request) {
    const container = document.getElementById('flightStatusContainer');
    const { 
        statusUtils, 
        purchaseTypeUtils, 
        dateUtils, 
        airportUtils 
    } = window.flightRequestUtils;
    
    const statusClass = statusUtils.getStatusBadgeClass(request.status);
    const statusText = statusUtils.getStatusText(request.status);
    const statusIcon = statusUtils.getStatusIcon(request.status);
    const purchaseTypeText = purchaseTypeUtils.getPurchaseTypeText(request.purchase_type);
    const purchaseTypeIcon = purchaseTypeUtils.getPurchaseTypeIcon(request.purchase_type);
    
    // 날짜 계산
    const days = dateUtils.getDaysBetween(request.departure_date, request.return_date);
    
    let html = `
        <div class="status-card">
            <div class="status-header">
                <h3>
                    <i data-lucide="${statusIcon}" class="icon"></i>
                    현재 신청 상태
                </h3>
                <span class="badge ${statusClass}">${statusText}</span>
            </div>
            
            <div class="status-content">
                <div class="info-grid">
                    <div class="info-item">
                        <label>구매 방식</label>
                        <span>
                            <i data-lucide="${purchaseTypeIcon}" class="icon"></i>
                            ${purchaseTypeText}
                        </span>
                    </div>
                    <div class="info-item">
                        <label>출국일</label>
                        <span>${formatDate(request.departure_date)}</span>
                    </div>
                    <div class="info-item">
                        <label>귀국일</label>
                        <span>${formatDate(request.return_date)}</span>
                    </div>
                    <div class="info-item">
                        <label>체류 기간</label>
                        <span>${days}일</span>
                    </div>
                    <div class="info-item">
                        <label>출발 공항</label>
                        <span>${airportUtils.formatAirport(request.departure_airport)}</span>
                    </div>
                    <div class="info-item">
                        <label>도착 공항</label>
                        <span>${request.arrival_airport}</span>
                    </div>
                </div>
    `;
    
    // 상태별 추가 정보
    if (request.status === 'rejected' && request.rejection_reason) {
        html += `
            <div class="rejection-info">
                <i data-lucide="alert-circle" class="icon"></i>
                <div>
                    <strong>반려 사유:</strong>
                    <p>${request.rejection_reason}</p>
                </div>
            </div>
        `;
    }
    
    // 구매대행이고 승인된 경우 관리자 항공권 다운로드
    if (request.purchase_type === 'agency' && request.status === 'approved' && request.admin_ticket_url) {
        html += `
            <div class="download-section">
                <h4>항공권 다운로드</h4>
                <a href="${request.admin_ticket_url}" class="btn btn-primary" download>
                    <i data-lucide="download" class="icon"></i>
                    항공권 다운로드
                </a>
            </div>
        `;
    }
    
    // 직접구매이고 승인된 경우 영수증/항공권 업로드
    if (request.purchase_type === 'direct' && request.status === 'approved') {
        html += renderDirectPurchaseUpload(request);
    }
    
    // 액션 버튼
    html += `
            <div class="status-actions">
    `;
    
    if (request.status === 'pending') {
        html += `
                <button class="btn btn-danger" onclick="cancelFlightRequest('${request.id}')">
                    <i data-lucide="x" class="icon"></i>
                    신청 취소
                </button>
        `;
    } else if (request.status === 'rejected') {
        html += `
                <button class="btn btn-primary" onclick="editFlightRequest()">
                    <i data-lucide="edit" class="icon"></i>
                    수정하여 재제출
                </button>
                <button class="btn btn-danger" onclick="deleteFlightRequest('${request.id}')">
                    <i data-lucide="trash-2" class="icon"></i>
                    신청서 삭제
                </button>
        `;
    }
    
    html += `
            </div>
        </div>
    </div>
    `;
    
    container.innerHTML = html;
    lucide.createIcons();
}

// 직접구매 업로드 섹션 렌더링
function renderDirectPurchaseUpload(request) {
    let html = '<div class="upload-section">';
    
    // 영수증 업로드
    if (!request.receipt_url) {
        html += `
            <div class="upload-item">
                <h4>영수증 업로드</h4>
                <p>항공권 구매 영수증을 업로드해주세요.</p>
                <input type="file" id="receiptFile" accept="image/*,.pdf" style="display: none;">
                <button class="btn btn-secondary" onclick="document.getElementById('receiptFile').click()">
                    <i data-lucide="upload" class="icon"></i>
                    영수증 선택
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="upload-item completed">
                <h4>
                    <i data-lucide="check-circle" class="icon"></i>
                    영수증 업로드 완료
                </h4>
                <a href="${request.receipt_url}" target="_blank">영수증 보기</a>
            </div>
        `;
    }
    
    // 항공권 업로드
    if (!request.ticket_url) {
        html += `
            <div class="upload-item">
                <h4>항공권 업로드</h4>
                <p>구매한 항공권을 업로드해주세요.</p>
                <input type="file" id="ticketFile" accept="image/*,.pdf" style="display: none;">
                <button class="btn btn-secondary" onclick="document.getElementById('ticketFile').click()">
                    <i data-lucide="upload" class="icon"></i>
                    항공권 선택
                </button>
            </div>
        `;
    } else {
        html += `
            <div class="upload-item completed">
                <h4>
                    <i data-lucide="check-circle" class="icon"></i>
                    항공권 업로드 완료
                </h4>
                <a href="${request.ticket_url}" target="_blank">항공권 보기</a>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

// 신청 내역 없음 렌더링
function renderNoRequest() {
    const container = document.getElementById('flightStatusContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i data-lucide="plane" class="icon"></i>
            <h3>신청 내역이 없습니다</h3>
            <p>아래 양식을 작성하여 항공권을 신청해주세요.</p>
        </div>
    `;
    lucide.createIcons();
}

// 폼 표시/숨김
function showFlightForm(isEdit = false) {
    const formSection = document.getElementById('flightFormSection');
    formSection.style.display = 'block';
    isEditMode = isEdit;
    
    if (isEdit) {
        formSection.querySelector('h2').innerHTML = `
            <i data-lucide="edit" class="icon"></i>
            항공권 신청서 수정
        `;
    }
    
    lucide.createIcons();
}

function hideFlightForm() {
    document.getElementById('flightFormSection').style.display = 'none';
}

// 폼 데이터 채우기 (수정 모드)
function fillFormData(request) {
    const form = document.getElementById('flightRequestForm');
    
    // 구매 방식
    form.querySelector(`input[name="purchaseType"][value="${request.purchase_type}"]`).checked = true;
    
    // 날짜
    form.departureDate.value = request.departure_date;
    form.returnDate.value = request.return_date;
    
    // 공항
    if (form.departureAirport.querySelector(`option[value="${request.departure_airport}"]`)) {
        form.departureAirport.value = request.departure_airport;
    } else {
        form.departureAirport.value = 'other';
        document.getElementById('departureAirportOther').value = request.departure_airport;
        document.getElementById('departureAirportOther').style.display = 'block';
    }
    
    form.arrivalAirport.value = request.arrival_airport;
    
    // 구매처 링크
    if (request.purchase_link) {
        form.purchaseLink.value = request.purchase_link;
    }
    
    // 날짜 변경 시 파견기간 재검증
    validateDates();
}

// 이벤트 리스너 설정
function setupEventListeners() {
    const form = document.getElementById('flightRequestForm');
    
    // 폼 제출
    form.addEventListener('submit', handleFormSubmit);
    
    // 출발 공항 선택
    document.getElementById('departureAirport').addEventListener('change', function(e) {
        const otherInput = document.getElementById('departureAirportOther');
        if (e.target.value === 'other') {
            otherInput.style.display = 'block';
            otherInput.required = true;
        } else {
            otherInput.style.display = 'none';
            otherInput.required = false;
            otherInput.value = '';
        }
    });
    
    // 날짜 변경 시 검증
    document.getElementById('departureDate').addEventListener('change', validateDates);
    document.getElementById('returnDate').addEventListener('change', validateDates);
    
    // 파일 선택
    document.getElementById('flightImage').addEventListener('change', handleFileSelect);
    
    // 직접구매 파일 업로드 (있는 경우)
    const receiptFile = document.getElementById('receiptFile');
    if (receiptFile) {
        receiptFile.addEventListener('change', (e) => handleReceiptUpload(e.target.files[0]));
    }
    
    const ticketFile = document.getElementById('ticketFile');
    if (ticketFile) {
        ticketFile.addEventListener('change', (e) => handleTicketUpload(e.target.files[0]));
    }
}

// 날짜 검증
function validateDates() {
    const departureDate = document.getElementById('departureDate').value;
    const returnDate = document.getElementById('returnDate').value;
    const { dateUtils, formValidation } = window.flightRequestUtils;
    
    if (!departureDate || !returnDate) return;
    
    // 과거 날짜 체크
    if (dateUtils.isPastDate(departureDate)) {
        formValidation.showError('departureDate', '출국일은 오늘 이후여야 합니다.');
        return;
    } else {
        formValidation.clearError('departureDate');
    }
    
    // 날짜 순서 체크
    if (!dateUtils.isValidDateRange(departureDate, returnDate)) {
        formValidation.showError('returnDate', '귀국일은 출국일 이후여야 합니다.');
        return;
    } else {
        formValidation.clearError('returnDate');
    }
    
    // 파견 기간 체크
    const days = dateUtils.getDaysBetween(departureDate, returnDate);
    if (!window.flightRequestUtils.validateDispatchDuration(days)) {
        formValidation.showError('returnDate', 
            `파견 기간은 90일, 100일, 112일, 120일 중 하나여야 합니다. (현재: ${days}일)`);
    } else {
        formValidation.clearError('returnDate');
    }
}

// 파일 선택 처리
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const { fileUtils, formValidation } = window.flightRequestUtils;
    
    // 파일 검증
    if (!fileUtils.validateFileSize(file)) {
        formValidation.showError('flightImage', '파일 크기는 10MB 이하여야 합니다.');
        e.target.value = '';
        return;
    }
    
    if (!fileUtils.validateFileType(file)) {
        formValidation.showError('flightImage', '이미지 파일(JPG, PNG) 또는 PDF만 업로드 가능합니다.');
        e.target.value = '';
        return;
    }
    
    formValidation.clearError('flightImage');
    
    // 미리보기 생성
    fileUtils.createImagePreview(file, (preview) => {
        if (preview) {
            const previewDiv = document.getElementById('flightImagePreview');
            previewDiv.querySelector('img').src = preview;
            previewDiv.style.display = 'block';
        }
    });
}

// 이미지 제거
function removeFlightImage() {
    document.getElementById('flightImage').value = '';
    document.getElementById('flightImagePreview').style.display = 'none';
}

// 폼 제출 처리
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const { formValidation, notificationUtils } = window.flightRequestUtils;
    
    // 기본 검증
    if (!formValidation.validateRequired(form)) {
        notificationUtils.showError('필수 항목을 모두 입력해주세요.');
        return;
    }
    
    // URL 검증
    if (form.purchaseLink.value && !formValidation.isValidUrl(form.purchaseLink.value)) {
        formValidation.showError('purchaseLink', '올바른 URL 형식이 아닙니다.');
        return;
    }
    
    // 날짜 검증
    validateDates();
    if (form.querySelector('.error')) {
        notificationUtils.showError('입력 내용을 확인해주세요.');
        return;
    }
    
    // 폼 데이터 수집
    const formData = {
        purchaseType: form.querySelector('input[name="purchaseType"]:checked').value,
        departureDate: form.departureDate.value,
        returnDate: form.returnDate.value,
        departureAirport: form.departureAirport.value === 'other' 
            ? form.departureAirportOther.value 
            : form.departureAirport.value,
        arrivalAirport: form.arrivalAirport.value,
        purchaseLink: form.purchaseLink.value,
        flightImage: form.flightImage.files[0]
    };
    
    // 제출 버튼 비활성화
    const submitButton = form.querySelector('button[type="submit"]');
    submitButton.disabled = true;
    submitButton.innerHTML = '<i data-lucide="loader-2" class="icon spin"></i> 제출 중...';
    lucide.createIcons();
    
    try {
        let result;
        
        if (isEditMode && currentRequest) {
            // 수정 모드
            formData.existingImageUrl = currentRequest.flight_image_url;
            formData.imageChanged = form.flightImage.files.length > 0;
            formData.version = currentRequest.version;
            
            result = await flightRequestAPI.updateFlightRequest(currentRequest.id, formData);
        } else {
            // 신규 제출
            result = await flightRequestAPI.submitFlightRequest(formData);
        }
        
        if (result.success) {
            notificationUtils.showSuccess(
                isEditMode ? '신청서가 수정되었습니다.' : '신청서가 제출되었습니다.'
            );
            
            // 폼 초기화 및 현황 새로고침
            form.reset();
            await loadFlightStatus();
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('제출 오류:', error);
        notificationUtils.showError(error.message || '제출 중 오류가 발생했습니다.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i data-lucide="send" class="icon"></i> 신청서 제출';
        lucide.createIcons();
    }
}

// 신청 취소
async function cancelFlightRequest(requestId) {
    if (!confirm('정말로 신청을 취소하시겠습니까?')) return;
    
    const result = await flightRequestAPI.deleteFlightRequest(requestId);
    
    if (result.success) {
        window.flightRequestUtils.notificationUtils.showSuccess('신청이 취소되었습니다.');
        await loadFlightStatus();
    } else {
        window.flightRequestUtils.notificationUtils.showError('신청 취소 중 오류가 발생했습니다.');
    }
}

// 신청서 삭제
async function deleteFlightRequest(requestId) {
    if (!confirm('신청서를 삭제하시겠습니까? 이 작업은 취소할 수 없습니다.')) return;
    
    const result = await flightRequestAPI.deleteFlightRequest(requestId);
    
    if (result.success) {
        window.flightRequestUtils.notificationUtils.showSuccess('신청서가 삭제되었습니다.');
        await loadFlightStatus();
    } else {
        window.flightRequestUtils.notificationUtils.showError('삭제 중 오류가 발생했습니다.');
    }
}

// 수정 모드 진입
function editFlightRequest() {
    showFlightForm(true);
    fillFormData(currentRequest);
    
    // 스크롤 이동
    document.getElementById('flightFormSection').scrollIntoView({ behavior: 'smooth' });
}

// 영수증 업로드 처리
async function handleReceiptUpload(file) {
    if (!file || !currentRequest) return;
    
    const { fileUtils, notificationUtils } = window.flightRequestUtils;
    
    // 파일 검증
    if (!fileUtils.validateFileSize(file) || !fileUtils.validateFileType(file)) {
        notificationUtils.showError('올바른 파일을 선택해주세요.');
        return;
    }
    
    const result = await flightRequestAPI.uploadReceipt(currentRequest.id, file);
    
    if (result.success) {
        notificationUtils.showSuccess('영수증이 업로드되었습니다.');
        await loadFlightStatus();
    } else {
        notificationUtils.showError('업로드 중 오류가 발생했습니다.');
    }
}

// 항공권 업로드 처리
async function handleTicketUpload(file) {
    if (!file || !currentRequest) return;
    
    const { fileUtils, notificationUtils } = window.flightRequestUtils;
    
    // 파일 검증
    if (!fileUtils.validateFileSize(file) || !fileUtils.validateFileType(file)) {
        notificationUtils.showError('올바른 파일을 선택해주세요.');
        return;
    }
    
    const result = await flightRequestAPI.uploadTicket(currentRequest.id, file);
    
    if (result.success) {
        notificationUtils.showSuccess('항공권이 업로드되었습니다.');
        await loadFlightStatus();
    } else {
        notificationUtils.showError('업로드 중 오류가 발생했습니다.');
    }
}

// 폼 초기화
function resetForm() {
    const form = document.getElementById('flightRequestForm');
    form.reset();
    removeFlightImage();
    
    // 에러 메시지 제거
    form.querySelectorAll('.error').forEach(el => el.classList.remove('error'));
    form.querySelectorAll('.error-message').forEach(el => el.remove());
    
    // 기타 공항 입력 숨김
    document.getElementById('departureAirportOther').style.display = 'none';
}

// 유틸리티 함수들
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const weekdays = ['일', '월', '화', '수', '목', '금', '토'];
    const weekday = weekdays[date.getDay()];
    
    return `${year}년 ${month}월 ${day}일 (${weekday})`;
}

function showLoading(containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="loading">
            <i data-lucide="loader-2" class="icon spin"></i>
            로딩 중...
        </div>
    `;
    lucide.createIcons();
}

function showError(containerId, message) {
    const container = document.getElementById(containerId);
    container.innerHTML = `
        <div class="error-message">
            <i data-lucide="alert-circle" class="icon"></i>
            ${message}
        </div>
    `;
    lucide.createIcons();
}