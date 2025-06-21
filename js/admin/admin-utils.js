// 관리자 유틸리티 모듈 (admin-utils.js)
AdminManager.Utils = {
    // 초기화
    init() {
        console.log('🔧 Utils 모듈 초기화');
        return true;
    },

    // HTML 이스케이프
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // 날짜 문자열 생성 (파일명용)
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    },

    // 결과 없음 HTML 생성
    createNoResultsHTML(searchTerm = '') {
        const message = searchTerm ? 
            `'${searchTerm}'에 대한 검색 결과가 없습니다.` : 
            '신청 내역이 없습니다.';
            
        return `
            <div class="no-results">
                ${Utils.createIcon('search', 'no-results-icon')}
                <p>${message}</p>
            </div>
        `;
    },

    // 영수증 관리 함수들
    currentViewingReceipt: null,

    // 영수증 보기 모달 표시
    async showViewReceiptModal(requestId) {
        try {
            const receipt = await SupabaseAPI.getReceiptByRequestId(requestId);
            if (!receipt) {
                Utils.showToast('영수증을 찾을 수 없습니다.', 'error');
                return;
            }

            // 영수증 보기 모달이 없으면 생성
            this.createViewReceiptModal();

            const modal = Utils.$('#viewReceiptModal');

            // 영수증 정보 표시
            Utils.$('#viewReceiptItemName').textContent = receipt.item_name || '-';
            Utils.$('#viewReceiptStudentName').textContent = receipt.student_name || '-';
            Utils.$('#viewReceiptItemPrice').textContent = Utils.formatPrice(receipt.total_amount || 0);
            Utils.$('#viewReceiptPurchaseDate').textContent = receipt.purchase_date ? 
                new Date(receipt.purchase_date).toLocaleString('ko-KR') : '-';
            Utils.$('#viewReceiptStore').textContent = receipt.store_name || '-';
            Utils.$('#viewReceiptNote').textContent = receipt.notes || '-';
            Utils.$('#viewReceiptSubmittedDate').textContent = receipt.created_at ? 
                new Date(receipt.created_at).toLocaleString('ko-KR') : '-';
            
            // 이미지 표시
            const receiptImage = Utils.$('#viewReceiptImage');
            receiptImage.src = receipt.image_path || '';

            // 현재 보고 있는 영수증 정보 저장 (다운로드용)
            this.currentViewingReceipt = {
                image: receipt.image_path,
                fileName: `receipt_${receipt.receipt_number}.jpg`
            };

            modal.classList.add('active');
        } catch (error) {
            console.error('Error showing receipt modal:', error);
            Utils.showToast('영수증을 불러오는 중 오류가 발생했습니다.', 'error');
        }
    },

    // 영수증 보기 모달 숨김
    hideViewReceiptModal() {
        const modal = Utils.$('#viewReceiptModal');
        if (modal) {
            modal.classList.remove('active');
            this.currentViewingReceipt = null;
        }
    },

    // 영수증 이미지 다운로드
    downloadReceiptImage() {
        if (!this.currentViewingReceipt) return;

        try {
            const link = document.createElement('a');
            link.href = this.currentViewingReceipt.image;
            link.download = this.currentViewingReceipt.fileName;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            Utils.showToast('영수증 이미지가 다운로드되었습니다.', 'success');
        } catch (error) {
            Utils.showToast('이미지 다운로드 중 오류가 발생했습니다.', 'error');
            console.error('Download error:', error);
        }
    },

    // 영수증 보기 모달 생성
    createViewReceiptModal() {
        if (!document.getElementById('viewReceiptModal')) {
            const modalHTML = `
                <div id="viewReceiptModal" class="modal">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>영수증 상세보기</h3>
                            <button class="close-btn" onclick="AdminManager.Utils.hideViewReceiptModal()">&times;</button>
                        </div>
                        <div class="receipt-details">
                            <div class="receipt-info-grid">
                                <div class="receipt-info-item">
                                    <span class="label">상품명:</span>
                                    <span id="viewReceiptItemName" class="value">-</span>
                                </div>
                                <div class="receipt-info-item">
                                    <span class="label">학생명:</span>
                                    <span id="viewReceiptStudentName" class="value">-</span>
                                </div>
                                <div class="receipt-info-item">
                                    <span class="label">금액:</span>
                                    <span id="viewReceiptItemPrice" class="value">-</span>
                                </div>
                                <div class="receipt-info-item">
                                    <span class="label">구매일:</span>
                                    <span id="viewReceiptPurchaseDate" class="value">-</span>
                                </div>
                                <div class="receipt-info-item">
                                    <span class="label">구매처:</span>
                                    <span id="viewReceiptStore" class="value">-</span>
                                </div>
                                <div class="receipt-info-item">
                                    <span class="label">제출일:</span>
                                    <span id="viewReceiptSubmittedDate" class="value">-</span>
                                </div>
                            </div>
                            
                            <div class="receipt-note">
                                <span class="label">메모:</span>
                                <p id="viewReceiptNote">-</p>
                            </div>
                            
                            <div class="receipt-image-container">
                                <img id="viewReceiptImage" src="" alt="영수증 이미지" class="receipt-image">
                            </div>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" id="viewReceiptCloseBtn" class="btn secondary" onclick="AdminManager.Utils.hideViewReceiptModal()">닫기</button>
                            <button type="button" id="downloadReceiptBtn" class="btn primary" onclick="AdminManager.Utils.downloadReceiptImage()">
                                <i data-lucide="download"></i> 다운로드
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHTML);
        }
    },

    // 아이템 액션 관련 유틸리티
    createActionButtons(status, purchaseMethod) {
        switch(status) {
            case 'pending':
                return `
                    <button class="btn small approve" data-action="approve">
                        ${Utils.createIcon('check')} 승인
                    </button>
                    <button class="btn small reject" data-action="reject">
                        ${Utils.createIcon('x')} 반려
                    </button>
                `;
            case 'approved':
                // 오프라인 구매의 경우 영수증 제출 후에만 구매완료 처리 가능
                if (purchaseMethod === 'offline') {
                    return `
                        <span class="offline-notice">
                            ${Utils.createIcon('info')} 영수증 제출 후 자동 구매완료
                        </span>
                    `;
                } else {
                    return `
                        <button class="btn small purchase" data-action="purchase">
                            ${Utils.createIcon('shopping-cart')} 구매완료
                        </button>
                    `;
                }
            default:
                return '';
        }
    },

    // 아이템 카드 HTML 생성
    createItemCardHTML(application) {
        const statusClass = SupabaseAPI.getStatusClass(application.status);
        const statusText = SupabaseAPI.getStatusText(application.status);
        const purchaseMethodText = SupabaseAPI.getPurchaseMethodText(application.purchase_type);
        const purchaseMethodClass = SupabaseAPI.getPurchaseMethodClass(application.purchase_type);
        
        // 영수증 관련 표시
        let receiptInfo = '';
        if (application.purchase_type === 'offline') {
            if (application.status === 'purchased') {
                receiptInfo = `
                    <div class="receipt-info submitted">
                        <div class="receipt-info-header">
                            <span class="receipt-status submitted">
                                ${Utils.createIcon('check-circle')} 영수증 제출완료
                            </span>
                            <button class="btn small secondary view-receipt-btn" 
                                    data-request-id="${application.id}">
                                ${Utils.createIcon('eye')} 영수증 보기
                            </button>
                        </div>
                        <div class="receipt-details-summary">
                            <small>제출일: ${new Date(application.updated_at).toLocaleString('ko-KR')}</small>
                        </div>
                    </div>
                `;
            } else if (application.status === 'approved') {
                receiptInfo = `
                    <div class="receipt-info pending">
                        <span class="receipt-pending">
                            ${Utils.createIcon('clock')} 영수증 제출 대기 중
                        </span>
                        <small class="receipt-help-text">학생이 영수증을 제출하면 자동으로 구매완료 처리됩니다.</small>
                    </div>
                `;
            }
        }
        
        return `
            <div class="admin-item-card" data-request-id="${application.id}">
                <div class="admin-item-header">
                    <div class="admin-item-info">
                        <div class="item-title-row">
                            <h4>${this.escapeHtml(application.item_name)}</h4>
                            <div class="item-badges">
                                <span class="purchase-method-badge ${purchaseMethodClass}">
                                    ${Utils.createIcon(application.purchase_type === 'offline' ? 'store' : 'shopping-cart')} ${purchaseMethodText}
                                </span>
                                ${application.is_bundle ? '<span class="type-badge bundle">묶음</span>' : '<span class="type-badge single">단일</span>'}
                            </div>
                        </div>
                        <p class="purpose">${this.escapeHtml(application.purpose)}</p>
                        <div class="admin-item-details">
                            <span><strong>가격:</strong> ${Utils.formatPrice(application.price)}</span>
                            ${application.purchase_link ? `
                                <span>
                                    <strong>${application.purchase_type === 'offline' ? '참고 링크:' : '구매 링크:'}</strong> 
                                    <a href="${this.escapeHtml(application.purchase_link)}" target="_blank" rel="noopener noreferrer">
                                        링크 보기 ${Utils.createIcon('external-link')}
                                    </a>
                                </span>
                            ` : ''}
                        </div>
                        ${receiptInfo}
                    </div>
                    
                    <div class="admin-item-actions">
                        ${this.createActionButtons(application.status, application.purchase_type)}
                        <span class="admin-status-badge status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${application.rejection_reason ? `
                    <div class="admin-rejection-reason">
                        <div class="reason-label">반려 사유</div>
                        <div class="reason-text">${this.escapeHtml(application.rejection_reason)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 신청 카드 생성
    createApplicationCard(application) {
        const card = Utils.createElement('div', 'admin-application-card');
        
        const submittedDate = Utils.formatDate(application.created_at);
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(application.user_profiles.name)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                        <p class="institute-info">${application.user_profiles.sejong_institute} • ${application.user_profiles.field}</p>
                    </div>
                    <span class="item-count">총 1개 항목</span>
                </div>
            </div>
            
            <div class="admin-application-body">
                ${this.createItemCardHTML(application)}
            </div>
        `;
        
        return card;
    },

    // 새로고침 함수 (다른 모듈에서 호출 가능)
    async refresh() {
        console.log('🔄 Utils 모듈 새로고침 (추가 작업 없음)');
        // Utils 모듈은 상태가 없으므로 별도 새로고침 작업 불필요
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminUtils = AdminManager.Utils;

console.log('🔧 AdminManager.Utils 모듈 로드 완료');