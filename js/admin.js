// 관리자 기능 관리 모듈
const AdminManager = {
    currentSearchTerm: '',

    // 초기화
    init() {
        this.setupEventListeners();
        this.loadStatistics();
        this.loadApplications();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 검색 기능
        Utils.on('#searchInput', 'input', Utils.debounce((e) => {
            this.handleSearch(e.target.value);
        }, 300));

        // Excel 내보내기
        Utils.on('#exportBtn', 'click', () => this.handleExport());

        // 키보드 단축키
        this.setupKeyboardShortcuts();
    },

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (DataManager.currentUserType !== 'admin') return;

            // Ctrl/Cmd + F: 검색 포커스
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                Utils.$('#searchInput').focus();
            }

            // F5: 새로고침
            if (event.key === 'F5') {
                event.preventDefault();
                this.refreshData();
            }

            // Ctrl/Cmd + E: Export
            if ((event.ctrlKey || event.metaKey) && event.key === 'e') {
                event.preventDefault();
                this.handleExport();
            }
        });
    },

    // 통계 로드
    loadStatistics() {
        const stats = DataManager.getStats();
        
        Utils.$('#totalCount').textContent = stats.total;
        Utils.$('#approvedCount').textContent = stats.approved;
        Utils.$('#rejectedCount').textContent = stats.rejected;
        Utils.$('#purchasedCount').textContent = stats.purchased;
    },

    // 신청 내역 로드
    loadApplications() {
        const applications = DataManager.searchApplications(this.currentSearchTerm);
        this.renderApplications(applications);
    },

    // 신청 내역 렌더링
    renderApplications(applications) {
        const container = Utils.$('#adminApplications');
        
        if (!applications || applications.length === 0) {
            container.innerHTML = this.createNoResultsHTML();
            return;
        }

        container.innerHTML = '';
        
        applications.forEach(application => {
            const applicationCard = this.createApplicationCard(application);
            container.appendChild(applicationCard);
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 이벤트 리스너 재설정
        this.setupItemActionListeners();
    },

    // 신청 카드 생성
    createApplicationCard(application) {
        const card = Utils.createElement('div', 'admin-application-card');
        
        const submittedDate = Utils.formatDate(application.submittedAt);
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(application.studentName)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                    </div>
                    <span class="item-count">총 ${application.items.length}개 항목</span>
                </div>
            </div>
            
            <div class="admin-application-body">
                ${application.items.map(item => this.createItemCardHTML(application.studentId, item)).join('')}
            </div>
        `;
        
        return card;
    },

    // 아이템 카드 HTML 생성
    createItemCardHTML(studentId, item) {
        const statusClass = DataManager.getStatusClass(item.status);
        const statusText = DataManager.getStatusText(item.status);
        
        return `
            <div class="admin-item-card" data-student-id="${studentId}" data-item-id="${item.id}">
                <div class="admin-item-header">
                    <div class="admin-item-info">
                        <h4>${this.escapeHtml(item.name)}</h4>
                        <p class="purpose">${this.escapeHtml(item.purpose)}</p>
                        <div class="admin-item-details">
                            <span><strong>가격:</strong> ${Utils.formatPrice(item.price)}</span>
                            ${item.link ? `
                                <span>
                                    <strong>링크:</strong> 
                                    <a href="${this.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
                                        구매 링크 ${Utils.createIcon('external-link')}
                                    </a>
                                </span>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="admin-item-actions">
                        ${this.createActionButtons(item.status)}
                        <span class="admin-status-badge status-badge ${statusClass}">${statusText}</span>
                    </div>
                </div>
                
                ${item.rejectionReason ? `
                    <div class="admin-rejection-reason">
                        <div class="reason-label">반려 사유</div>
                        <div class="reason-text">${this.escapeHtml(item.rejectionReason)}</div>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 액션 버튼 생성
    createActionButtons(status) {
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
                return `
                    <button class="btn small purchase" data-action="purchase">
                        ${Utils.createIcon('shopping-cart')} 구매완료
                    </button>
                `;
            default:
                return '';
        }
    },

    // 아이템 액션 이벤트 리스너 설정
    setupItemActionListeners() {
        const actionButtons = Utils.$$('.admin-item-actions button[data-action]');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const itemCard = e.target.closest('.admin-item-card');
                const studentId = parseInt(itemCard.dataset.studentId);
                const itemId = parseInt(itemCard.dataset.itemId);
                
                this.handleItemAction(action, studentId, itemId, e.target);
            });
        });
    },

    // 아이템 액션 처리
    handleItemAction(action, studentId, itemId, buttonElement) {
        switch(action) {
            case 'approve':
                this.approveItem(studentId, itemId, buttonElement);
                break;
            case 'reject':
                this.rejectItem(studentId, itemId, buttonElement);
                break;
            case 'purchase':
                this.markAsPurchased(studentId, itemId, buttonElement);
                break;
        }
    },

    // 아이템 승인
    approveItem(studentId, itemId, buttonElement) {
        if (Utils.showConfirm('이 교구 신청을 승인하시겠습니까?')) {
            Utils.showLoading(buttonElement);
            
            setTimeout(() => {
                if (DataManager.updateItemStatus(studentId, itemId, 'approved')) {
                    this.refreshData();
                    Utils.showAlert('승인되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert('승인 처리 중 오류가 발생했습니다.');
                }
            }, 500);
        }
    },

    // 아이템 반려
    rejectItem(studentId, itemId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            setTimeout(() => {
                if (DataManager.updateItemStatus(studentId, itemId, 'rejected', reason.trim())) {
                    this.refreshData();
                    Utils.showAlert('반려 처리되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert('반려 처리 중 오류가 발생했습니다.');
                }
            }, 500);
        }
    },

    // 구매 완료 처리
    markAsPurchased(studentId, itemId, buttonElement) {
        if (Utils.showConfirm('이 교구의 구매가 완료되었습니까?')) {
            Utils.showLoading(buttonElement);
            
            setTimeout(() => {
                if (DataManager.updateItemStatus(studentId, itemId, 'purchased')) {
                    this.refreshData();
                    Utils.showAlert('구매완료로 처리되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert('구매완료 처리 중 오류가 발생했습니다.');
                }
            }, 500);
        }
    },

    // 검색 처리
    handleSearch(searchTerm) {
        this.currentSearchTerm = searchTerm.trim();
        this.loadApplications();
    },

    // Excel 내보내기 처리
    handleExport() {
        Utils.showLoading('#exportBtn');
        
        setTimeout(() => {
            try {
                const exportData = DataManager.prepareExportData();
                
                if (exportData.length === 0) {
                    Utils.showAlert('내보낼 데이터가 없습니다.');
                } else {
                    const filename = `sejong_applications_${this.getDateString()}.csv`;
                    Utils.downloadCSV(exportData, filename);
                    Utils.showAlert(`${exportData.length}건의 데이터를 내보냈습니다.`);
                }
            } catch (error) {
                Utils.showAlert('데이터 내보내기 중 오류가 발생했습니다.');
                console.error('Export error:', error);
            } finally {
                Utils.hideLoading('#exportBtn');
            }
        }, 1000);
    },

    // 결과 없음 HTML 생성
    createNoResultsHTML() {
        const message = this.currentSearchTerm ? 
            `'${this.currentSearchTerm}'에 대한 검색 결과가 없습니다.` : 
            '신청 내역이 없습니다.';
            
        return `
            <div class="no-results">
                ${Utils.createIcon('search', 'no-results-icon')}
                <p>${message}</p>
            </div>
        `;
    },

    // 데이터 새로고침
    refreshData() {
        this.loadStatistics();
        this.loadApplications();
    },

    // HTML 이스케이프
    escapeHtml(text) {
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

    // 상세 통계 보기
    showDetailedStats() {
        const stats = DataManager.getStats();
        const applications = DataManager.getAllApplications();
        
        let totalAmount = 0;
        let approvedAmount = 0;
        let purchasedAmount = 0;
        
        applications.forEach(app => {
            app.items.forEach(item => {
                totalAmount += item.price;
                if (item.status === 'approved' || item.status === 'purchased') {
                    approvedAmount += item.price;
                }
                if (item.status === 'purchased') {
                    purchasedAmount += item.price;
                }
            });
        });
        
        const message = `상세 통계\n\n` +
                       `전체 신청: ${stats.total}건\n` +
                       `승인: ${stats.approved}건\n` +
                       `반려: ${stats.rejected}건\n` +
                       `구매완료: ${stats.purchased}건\n\n` +
                       `전체 예산: ${Utils.formatPrice(totalAmount)}\n` +
                       `승인 예산: ${Utils.formatPrice(approvedAmount)}\n` +
                       `구매 완료: ${Utils.formatPrice(purchasedAmount)}`;
        
        alert(message);
    },

    // 일괄 승인 기능
    bulkApprove() {
        const pendingItems = this.getPendingItems();
        
        if (pendingItems.length === 0) {
            Utils.showAlert('승인할 대기 중인 항목이 없습니다.');
            return;
        }
        
        if (Utils.showConfirm(`${pendingItems.length}개의 대기 중인 항목을 모두 승인하시겠습니까?`)) {
            pendingItems.forEach(({studentId, itemId}) => {
                DataManager.updateItemStatus(studentId, itemId, 'approved');
            });
            
            this.refreshData();
            Utils.showAlert(`${pendingItems.length}개 항목이 승인되었습니다.`);
        }
    },

    // 대기 중인 항목 조회
    getPendingItems() {
        const items = [];
        DataManager.getAllApplications().forEach(app => {
            app.items.forEach(item => {
                if (item.status === 'pending') {
                    items.push({
                        studentId: app.studentId,
                        itemId: item.id
                    });
                }
            });
        });
        return items;
    },

    // 필터링 기능
    filterByStatus(status) {
        // 향후 구현 예정
        console.log('Filter by status:', status);
    },

    // 정렬 기능
    sortBy(criteria) {
        // 향후 구현 예정
        console.log('Sort by:', criteria);
    }
};