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

    // admin-utils.js - showViewReceiptModal() 함수 수정
    async showViewReceiptModal(requestId) {
        try {
            const client = await SupabaseAPI.ensureClient();

            // 1. 먼저 requests 테이블에서 기본 정보와 관리자 영수증 확인
            const { data: requestData, error: requestError } = await client
                .from('requests')
                .select(`
                    id,
                    item_name,
                    price,
                    admin_receipt_url,
                    final_purchase_amount,
                    admin_purchase_date,
                    user_profiles:user_id (
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .eq('id', requestId)
                .single();

            if (requestError) throw requestError;

            let receiptData = null;
            let isAdminReceipt = false;

            // 2. 관리자 영수증이 있는지 확인
            if (requestData.admin_receipt_url) {
                // 관리자 영수증 데이터 구성
                receiptData = {
                    item_name: requestData.item_name,
                    student_name: requestData.user_profiles?.name || '-',
                    total_amount: requestData.final_purchase_amount || requestData.price || 0,
                    purchase_date: requestData.admin_purchase_date,
                    store_name: '관리자 구매',
                    notes: '관리자가 대신 구매한 항목입니다.',
                    image_path: requestData.admin_receipt_url,
                    created_at: requestData.admin_purchase_date
                };
                isAdminReceipt = true;
            } else {
                // 3. 관리자 영수증이 없으면 학생 영수증 조회 (최신 것만)
                const { data: studentReceipts, error: receiptError } = await client
                    .from('receipts')
                    .select(`
                        file_url,
                        uploaded_at,
                        verified,
                        purchase_store,
                        note,
                        purchase_date,
                        total_amount
                    `)
                    .eq('request_id', requestId)
                    .order('uploaded_at', { ascending: false })
                    .limit(1);

                const studentReceipt = studentReceipts && studentReceipts.length > 0 ? studentReceipts[0] : null;

                if (receiptError || !studentReceipt?.file_url) {
                    Utils.showToast('영수증을 찾을 수 없습니다.', 'error');
                    return;
                }

                // 학생 영수증 데이터 구성
                receiptData = {
                    item_name: requestData.item_name,
                    student_name: requestData.user_profiles?.name || '-',
                    total_amount: studentReceipt.total_amount || requestData.price || 0,
                    purchase_date: studentReceipt.purchase_date,
                    store_name: studentReceipt.purchase_store || '-',
                    notes: studentReceipt.note || '-',
                    image_path: studentReceipt.file_url,
                    created_at: studentReceipt.uploaded_at
                };
            }

            if (!receiptData) {
                Utils.showToast('영수증을 찾을 수 없습니다.', 'error');
                return;
            }

            // 4. 기존 모달 표시 로직 (그대로 유지)
            this.createViewReceiptModal();

            const modal = Utils.$('#viewReceiptModal');

            // 모달 제목 변경 (관리자/학생 구분)
            const modalTitle = modal.querySelector('.modal-header h3');
            modalTitle.textContent = isAdminReceipt ? '관리자 등록 영수증' : '학생 제출 영수증';

            // 영수증 정보 표시
            Utils.$('#viewReceiptItemName').textContent = receiptData.item_name || '-';
            Utils.$('#viewReceiptStudentName').textContent = receiptData.student_name || '-';
            Utils.$('#viewReceiptItemPrice').textContent = Utils.formatPrice(receiptData.total_amount || 0);
            Utils.$('#viewReceiptPurchaseDate').textContent = receiptData.purchase_date ? 
                new Date(receiptData.purchase_date).toLocaleString('ko-KR') : '-';
            Utils.$('#viewReceiptStore').textContent = receiptData.store_name || '-';
            Utils.$('#viewReceiptNote').textContent = receiptData.notes || '-';
            Utils.$('#viewReceiptSubmittedDate').textContent = receiptData.created_at ? 
                new Date(receiptData.created_at).toLocaleString('ko-KR') : '-';

            // 이미지 표시
            const receiptImage = Utils.$('#viewReceiptImage');
            receiptImage.src = receiptData.image_path || '';


            // ✅ 올바른 파일명 생성 및 PDF 여부 판단
            const getFileExtension = (url) => {
                try {
                    return url.split('.').pop().toLowerCase();
                } catch {
                    return 'jpg';
                }
            };

            const imageUrl = receiptData.image_path;
            const extension = getFileExtension(imageUrl);
            const prefix = isAdminReceipt ? 'admin' : 'student';
            const isPDF = extension === 'pdf' || imageUrl.toLowerCase().includes('.pdf');

            // 🆕 완전한 정보로 한 번만 설정
            this.currentViewingReceipt = {
                image: imageUrl,
                fileName: `receipt_${requestId}_${prefix}.${extension}`,
                isPDF: isPDF
            };

            console.log('🔍 영수증 정보 설정됨:', this.currentViewingReceipt);

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
    
    // admin-utils.js - downloadReceiptImage() 함수 개선
    downloadReceiptImage() {
        console.log('🔍 다운로드 함수 시작');

        if (!this.currentViewingReceipt) {
            console.log('❌ currentViewingReceipt가 없음');
            Utils.showToast('다운로드할 영수증 정보가 없습니다.', 'error');
            return;
        }

        try {
            const imageUrl = this.currentViewingReceipt.image;
            const fileName = this.currentViewingReceipt.fileName;

            // 🔍 디버깅: 파일 정보 출력
            console.log('=== 다운로드 디버깅 ===');
            console.log('원본 URL:', imageUrl);
            console.log('파일명:', fileName);
            console.log('currentViewingReceipt 전체:', this.currentViewingReceipt);

            // 🔍 각 조건별 체크
            const urlHasPDF = imageUrl.toLowerCase().includes('.pdf');
            const fileNameHasPDF = fileName.toLowerCase().includes('.pdf');
            const urlHasPDFWord = imageUrl.toLowerCase().includes('pdf');

            console.log('URL에 .pdf 포함:', urlHasPDF);
            console.log('파일명에 .pdf 포함:', fileNameHasPDF);
            console.log('URL에 pdf 단어 포함:', urlHasPDFWord);

            // 현재 조건
            const isPDF = urlHasPDF || fileNameHasPDF || urlHasPDFWord;

            console.log('최종 PDF 판정:', isPDF);
            console.log('========================');

            if (isPDF) {
                console.log('✅ PDF로 인식됨 - 새탭에서 열기 시도');

                // 새탭 열기 시도
                const newWindow = window.open(imageUrl, '_blank');

                if (newWindow) {
                    console.log('✅ 새탭 열기 성공');
                    Utils.showToast('새 탭에서 PDF를 열었습니다.', 'info');
                } else {
                    console.log('❌ 새탭 열기 실패 (팝업 차단?)');

                    // 팝업 차단시 대안 방법
                    try {
                        // 방법 1: 현재 탭에서 새 창으로 리디렉션 방지
                        const link = document.createElement('a');
                        link.href = imageUrl;
                        link.target = '_blank';
                        link.rel = 'noopener noreferrer';

                        // 사용자 이벤트로 인식되도록 클릭 이벤트 트리거
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        Utils.showToast('PDF를 새 탭에서 열려고 시도했습니다.', 'info');
                    } catch (linkError) {
                        console.error('링크 방식도 실패:', linkError);
                        Utils.showToast('팝업이 차단되었습니다. 브라우저 설정을 확인하세요.', 'warning');
                    }
                }
            } else {
                console.log('🖼️ 이미지로 인식됨 - 다운로드 시도');

                try {
                    // 이미지 다운로드 - 여러 방법 시도
                    this.tryImageDownload(imageUrl, fileName);
                } catch (downloadError) {
                    console.error('이미지 다운로드 실패:', downloadError);
                    Utils.showToast('다운로드에 실패했습니다.', 'error');
                }
            }

        } catch (error) {
            Utils.showToast('다운로드 중 오류가 발생했습니다.', 'error');
            console.error('Download error:', error);
        }
    },

    // 🆕 이미지 다운로드 전용 함수
    tryImageDownload(imageUrl, fileName) {
        console.log('🖼️ 이미지 다운로드 시작:', fileName);

        // 방법 1: 기본 다운로드 시도
        try {
            const link = document.createElement('a');
            link.href = imageUrl;
            link.download = fileName;

            // 현재창에서 열리는 것을 방지
            link.target = '_self'; // 또는 '_blank'

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            console.log('✅ 기본 다운로드 시도 완료');
            Utils.showToast('이미지 다운로드를 시작했습니다.', 'success');

        } catch (basicError) {
            console.error('기본 다운로드 실패:', basicError);

            // 방법 2: fetch + blob 방식
            this.fetchAndDownload(imageUrl, fileName);
        }
    },

    // 🆕 fetch + blob 다운로드
    async fetchAndDownload(imageUrl, fileName) {
        try {
            console.log('🔄 fetch 다운로드 시도');

            const response = await fetch(imageUrl);
            if (!response.ok) throw new Error('네트워크 오류');

            const blob = await response.blob();
            const blobUrl = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;

            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // 메모리 정리
            setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);

            console.log('✅ fetch 다운로드 성공');
            Utils.showToast('이미지가 다운로드되었습니다.', 'success');

        } catch (fetchError) {
            console.error('fetch 다운로드도 실패:', fetchError);

            // 최후 수단: 새탭에서 열기
            window.open(imageUrl, '_blank');
            Utils.showToast('새 탭에서 열었습니다. 우클릭하여 저장하세요.', 'info');
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