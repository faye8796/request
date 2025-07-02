/**
 * 항공권 관리 UI 모듈 v5.3.0
 * 항공권 신청 관련 모든 UI 렌더링을 담당
 */

window.FlightManagementUI = (function() {
    'use strict';

    console.log('🎨 FlightManagementUI 모듈 로드 시작');

    // 항공권 신청 목록 렌더링
    function renderFlightRequests(requests) {
        const container = document.getElementById('flightApplications');
        if (!container) return;

        if (!requests || requests.length === 0) {
            container.innerHTML = '<div class="no-results">항공권 신청 내역이 없습니다.</div>';
            return;
        }

        container.innerHTML = requests.map(request => createFlightRequestCard(request)).join('');
        
        // Lucide 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    }

    // 항공권 신청 카드 생성
    function createFlightRequestCard(request) {
        const userName = request.user_profiles?.name || '알 수 없음';
        const institute = request.user_profiles?.sejong_institute || '미설정';
        const field = request.user_profiles?.field || '미설정';
        const submittedDate = formatDate(request.created_at);
        const departureDate = formatDate(request.departure_date);
        const returnDate = formatDate(request.return_date);
        const statusInfo = getStatusInfo(request.status);
        const purchaseTypeText = request.purchase_type === 'direct' ? '직접구매' : '구매대행';
        const purchaseTypeClass = request.purchase_type === 'direct' ? 'direct' : 'agency';

        return `
            <div class="flight-request-card" onclick="showDetailModal('${request.id}')">
                <div class="flight-request-header">
                    <div class="student-info">
                        <h3>${escapeHtml(userName)}</h3>
                        <p class="student-details">${escapeHtml(institute)} • ${escapeHtml(field)}</p>
                    </div>
                    <div class="request-meta">
                        <span class="purchase-type ${purchaseTypeClass}">
                            <i data-lucide="${request.purchase_type === 'direct' ? 'credit-card' : 'building'}"></i>
                            ${purchaseTypeText}
                        </span>
                        <span class="status-badge ${statusInfo.class}">
                            ${statusInfo.text}
                        </span>
                    </div>
                </div>
                
                <div class="flight-request-body">
                    <div class="flight-info">
                        <div class="flight-route">
                            <div class="airport">
                                <i data-lucide="plane-takeoff"></i>
                                <span>${escapeHtml(request.departure_airport)}</span>
                            </div>
                            <div class="route-arrow">→</div>
                            <div class="airport">
                                <i data-lucide="plane-landing"></i>
                                <span>${escapeHtml(request.arrival_airport)}</span>
                            </div>
                        </div>
                        <div class="flight-dates">
                            <span class="date-item">출국: ${departureDate}</span>
                            <span class="date-separator">•</span>
                            <span class="date-item">귀국: ${returnDate}</span>
                        </div>
                    </div>
                    
                    <div class="request-footer">
                        <span class="submission-date">
                            <i data-lucide="calendar"></i>
                            신청일: ${submittedDate}
                        </span>
                        ${request.status === 'rejected' && request.rejection_reason ? 
                            `<span class="rejection-reason">
                                <i data-lucide="alert-circle"></i>
                                ${escapeHtml(request.rejection_reason)}
                            </span>` : ''}
                    </div>
                </div>
                
                <div class="flight-request-actions">
                    <button class="btn-icon" title="상세보기">
                        <i data-lucide="eye"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // 상세 모달 렌더링
    function renderDetailModal(request) {
        const modalBody = document.getElementById('modalBody');
        const modalFooter = document.getElementById('modalFooter');
        
        if (!modalBody || !modalFooter) return;

        const userName = request.user_profiles?.name || '알 수 없음';
        const email = request.user_profiles?.email || '알 수 없음';
        const institute = request.user_profiles?.sejong_institute || '미설정';
        const field = request.user_profiles?.field || '미설정';
        const dispatchDuration = request.user_profiles?.dispatch_duration || '미설정';
        const statusInfo = getStatusInfo(request.status);
        const purchaseTypeText = request.purchase_type === 'direct' ? '직접구매' : '구매대행';

        // 모달 본문
        modalBody.innerHTML = `
            <div class="detail-section">
                <h3>학생 정보</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>이름</label>
                        <span>${escapeHtml(userName)}</span>
                    </div>
                    <div class="detail-item">
                        <label>이메일</label>
                        <span>${escapeHtml(email)}</span>
                    </div>
                    <div class="detail-item">
                        <label>파견 학당</label>
                        <span>${escapeHtml(institute)}</span>
                    </div>
                    <div class="detail-item">
                        <label>분야</label>
                        <span>${escapeHtml(field)}</span>
                    </div>
                    <div class="detail-item">
                        <label>파견 기간</label>
                        <span>${dispatchDuration}일</span>
                    </div>
                </div>
            </div>

            <div class="detail-section">
                <h3>항공편 정보</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>구매 방식</label>
                        <span>${purchaseTypeText}</span>
                    </div>
                    <div class="detail-item">
                        <label>출발 공항</label>
                        <span>${escapeHtml(request.departure_airport)}</span>
                    </div>
                    <div class="detail-item">
                        <label>도착 공항</label>
                        <span>${escapeHtml(request.arrival_airport)}</span>
                    </div>
                    <div class="detail-item">
                        <label>출국일</label>
                        <span>${formatDate(request.departure_date)}</span>
                    </div>
                    <div class="detail-item">
                        <label>귀국일</label>
                        <span>${formatDate(request.return_date)}</span>
                    </div>
                    <div class="detail-item">
                        <label>체류 기간</label>
                        <span>${calculateStayDuration(request.departure_date, request.return_date)}일</span>
                    </div>
                </div>
            </div>

            ${request.passport_info ? `
            <div class="detail-section">
                <h3>여권 정보</h3>
                <div class="detail-grid">
                    <div class="detail-item">
                        <label>영문명</label>
                        <span>${escapeHtml(request.passport_info.name_english)}</span>
                    </div>
                    <div class="detail-item">
                        <label>여권번호</label>
                        <span>${escapeHtml(request.passport_info.passport_number)}</span>
                    </div>
                    <div class="detail-item">
                        <label>발급일</label>
                        <span>${formatDate(request.passport_info.issue_date)}</span>
                    </div>
                    <div class="detail-item">
                        <label>만료일</label>
                        <span>${formatDate(request.passport_info.expiry_date)}</span>
                    </div>
                </div>
            </div>
            ` : '<div class="detail-section"><p class="no-data">여권 정보가 등록되지 않았습니다.</p></div>'}

            <div class="detail-section">
                <h3>제출 서류</h3>
                <div class="document-list">
                    ${request.flight_image_url ? 
                        `<a href="${request.flight_image_url}" target="_blank" class="document-link">
                            <i data-lucide="file-image"></i>
                            항공권 정보 이미지
                        </a>` : ''}
                    ${request.purchase_link ? 
                        `<a href="${request.purchase_link}" target="_blank" class="document-link">
                            <i data-lucide="external-link"></i>
                            구매처 링크
                        </a>` : ''}
                    ${request.receipt_url ? 
                        `<a href="${request.receipt_url}" target="_blank" class="document-link">
                            <i data-lucide="receipt"></i>
                            영수증
                        </a>` : ''}
                    ${request.ticket_url ? 
                        `<a href="${request.ticket_url}" target="_blank" class="document-link">
                            <i data-lucide="ticket"></i>
                            항공권
                        </a>` : ''}
                    ${request.admin_ticket_url ? 
                        `<a href="${request.admin_ticket_url}" target="_blank" class="document-link">
                            <i data-lucide="ticket"></i>
                            구매대행 항공권
                        </a>` : ''}
                </div>
            </div>

            <div class="detail-section">
                <h3>처리 상태</h3>
                <div class="status-info">
                    <span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>
                    ${request.rejection_reason ? 
                        `<p class="rejection-detail">반려 사유: ${escapeHtml(request.rejection_reason)}</p>` : ''}
                    <p class="timestamp">신청일: ${formatDateTime(request.created_at)}</p>
                    <p class="timestamp">최종 수정: ${formatDateTime(request.updated_at)}</p>
                </div>
            </div>
        `;

        // 모달 푸터 (액션 버튼)
        modalFooter.innerHTML = '';
        
        if (request.status === 'pending') {
            modalFooter.innerHTML = `
                <button class="btn secondary" onclick="closeDetailModal()">닫기</button>
                <button class="btn danger" onclick="rejectRequest('${request.id}')">
                    <i data-lucide="x-circle"></i>
                    반려
                </button>
                <button class="btn primary" onclick="approveRequest('${request.id}')">
                    <i data-lucide="check-circle"></i>
                    승인
                </button>
            `;
        } else if (request.status === 'approved' && request.purchase_type === 'agency' && !request.admin_ticket_url) {
            modalFooter.innerHTML = `
                <button class="btn secondary" onclick="closeDetailModal()">닫기</button>
                <button class="btn primary" onclick="showUploadTicketModal('${request.id}')">
                    <i data-lucide="upload"></i>
                    항공권 등록
                </button>
            `;
        } else {
            modalFooter.innerHTML = `
                <button class="btn primary" onclick="closeDetailModal()">닫기</button>
            `;
        }

        // Lucide 아이콘 재생성
        setTimeout(() => {
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    }

    // 상태 정보 가져오기
    function getStatusInfo(status) {
        const statusMap = {
            'pending': { text: '승인대기', class: 'pending' },
            'approved': { text: '승인됨', class: 'approved' },
            'rejected': { text: '반려됨', class: 'rejected' },
            'completed': { text: '완료', class: 'completed' }
        };
        return statusMap[status] || { text: '알 수 없음', class: '' };
    }

    // 체류 기간 계산
    function calculateStayDuration(departureDate, returnDate) {
        const departure = new Date(departureDate);
        const returnDay = new Date(returnDate);
        const diffTime = Math.abs(returnDay - departure);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    }

    // 날짜 포맷
    function formatDate(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    }

    // 날짜/시간 포맷
    function formatDateTime(dateString) {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // HTML 이스케이프
    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public API
    return {
        renderFlightRequests,
        renderDetailModal
    };

})();

console.log('✅ FlightManagementUI 모듈 로드 완료');