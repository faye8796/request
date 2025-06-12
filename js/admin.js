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

        // 수업계획 설정 버튼
        Utils.on('#lessonPlanSettingsBtn', 'click', () => this.showLessonPlanSettingsModal());

        // 수업계획 설정 모달 이벤트
        Utils.on('#planSettingsCancelBtn', 'click', () => this.hideLessonPlanSettingsModal());
        Utils.on('#lessonPlanSettingsModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanSettingsModal') {
                this.hideLessonPlanSettingsModal();
            }
        });
        Utils.on('#lessonPlanSettingsForm', 'submit', (e) => {
            e.preventDefault();
            this.handleLessonPlanSettingsSubmit();
        });

        // 영수증 보기 모달 이벤트
        Utils.on('#viewReceiptCloseBtn', 'click', () => this.hideViewReceiptModal());
        Utils.on('#viewReceiptModal', 'click', (e) => {
            if (e.target.id === 'viewReceiptModal') {
                this.hideViewReceiptModal();
            }
        });
        Utils.on('#downloadReceiptBtn', 'click', () => this.downloadReceiptImage());

        // 키보드 단축키
        this.setupKeyboardShortcuts();
    },

    // 영수증 보기 모달 표시
    showViewReceiptModal(studentId, itemId) {
        const application = DataManager.applications.find(app => app.studentId === studentId);
        if (!application) return;

        const item = application.items.find(item => item.id === itemId);
        if (!item || !item.receiptImage) return;

        const student = DataManager.students.find(s => s.id === studentId);
        const modal = Utils.$('#viewReceiptModal');

        // 영수증 정보 표시
        Utils.$('#viewReceiptItemName').textContent = item.name;
        Utils.$('#viewReceiptStudentName').textContent = application.studentName;
        Utils.$('#viewReceiptItemPrice').textContent = Utils.formatPrice(item.price);
        
        // 영수증 데이터에서 추가 정보 표시
        if (item.receiptImage && typeof item.receiptImage === 'object') {
            Utils.$('#viewReceiptPurchaseDate').textContent = item.receiptImage.purchaseDateTime ? 
                new Date(item.receiptImage.purchaseDateTime).toLocaleString('ko-KR') : '-';
            Utils.$('#viewReceiptStore').textContent = item.receiptImage.purchaseStore || '-';
            Utils.$('#viewReceiptNote').textContent = item.receiptImage.note || '-';
            
            // 이미지 표시
            const receiptImage = Utils.$('#viewReceiptImage');
            receiptImage.src = item.receiptImage.image || item.receiptImage;
        } else {
            // 기존 형식 (문자열)
            const receiptImage = Utils.$('#viewReceiptImage');
            receiptImage.src = item.receiptImage;
            Utils.$('#viewReceiptPurchaseDate').textContent = '-';
            Utils.$('#viewReceiptStore').textContent = '-';
            Utils.$('#viewReceiptNote').textContent = '-';
        }
        
        Utils.$('#viewReceiptSubmittedDate').textContent = item.receiptSubmittedAt ? 
            new Date(item.receiptSubmittedAt).toLocaleString('ko-KR') : '-';

        // 현재 보고 있는 영수증 정보 저장 (다운로드용)
        this.currentViewingReceipt = {
            studentName: application.studentName,
            itemName: item.name,
            image: typeof item.receiptImage === 'object' ? item.receiptImage.image : item.receiptImage,
            fileName: typeof item.receiptImage === 'object' && item.receiptImage.fileName ? 
                item.receiptImage.fileName : `receipt_${studentId}_${itemId}.jpg`
        };

        modal.classList.add('active');
    },

    // 영수증 보기 모달 숨김
    hideViewReceiptModal() {
        const modal = Utils.$('#viewReceiptModal');
        modal.classList.remove('active');
        this.currentViewingReceipt = null;
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
            
            Utils.showAlert('영수증 이미지가 다운로드되었습니다.');
        } catch (error) {
            Utils.showAlert('이미지 다운로드 중 오류가 발생했습니다.');
            console.error('Download error:', error);
        }
    },

    // 수업계획 설정 모달 표시
    showLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        const settings = DataManager.lessonPlanSettings;
        
        // 현재 설정값으로 폼 채우기
        Utils.$('#planEditDeadline').value = settings.editDeadline;
        Utils.$('#planEditTime').value = settings.editTime;
        Utils.$('#planEditNotice').value = settings.noticeMessage;
        
        // 테스트 모드 체크박스 설정
        const testModeCheckbox = Utils.$('#testModeEnabled');
        if (testModeCheckbox) {
            testModeCheckbox.checked = settings.testMode;
        }
        
        // 마감일 무시 체크박스 설정
        const overrideCheckbox = Utils.$('#allowOverrideDeadline');
        if (overrideCheckbox) {
            overrideCheckbox.checked = settings.allowOverrideDeadline;
        }
        
        modal.classList.add('active');
        
        setTimeout(() => {
            Utils.$('#planEditDeadline').focus();
        }, 100);
    },

    // 수업계획 설정 모달 숨김
    hideLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        modal.classList.remove('active');
        Utils.resetForm('#lessonPlanSettingsForm');
    },

    // 수업계획 설정 저장
    handleLessonPlanSettingsSubmit() {
        const deadline = Utils.$('#planEditDeadline').value;
        const time = Utils.$('#planEditTime').value;
        const notice = Utils.$('#planEditNotice').value.trim();
        const testMode = Utils.$('#testModeEnabled') ? Utils.$('#testModeEnabled').checked : false;
        const allowOverrideDeadline = Utils.$('#allowOverrideDeadline') ? Utils.$('#allowOverrideDeadline').checked : false;

        // 입력 검증 (테스트 모드가 아닌 경우)
        if (!testMode && !allowOverrideDeadline && !Utils.validateRequired(deadline, '수업계획 수정 마감일')) return;

        // 마감일이 과거인지 확인 (테스트 모드가 아닌 경우)
        if (!testMode && !allowOverrideDeadline && deadline) {
            const deadlineDate = new Date(`${deadline} ${time}`);
            const now = new Date();
            
            if (deadlineDate < now) {
                if (!Utils.showConfirm('마감일이 현재 시간보다 과거입니다. 이 경우 학생들이 수업계획을 수정할 수 없게 됩니다. 계속하시겠습니까?')) {
                    return;
                }
            }
        }

        const submitBtn = Utils.$('#lessonPlanSettingsForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                const newSettings = {
                    editDeadline: deadline || '2026-12-31', // 기본값 설정
                    editTime: time || '23:59',
                    noticeMessage: notice || `수업계획은 언제든지 수정 가능합니다. (테스트 모드)`,
                    testMode: testMode,
                    allowOverrideDeadline: allowOverrideDeadline
                };

                const updatedSettings = DataManager.updateLessonPlanSettings(newSettings);
                
                Utils.hideLoading(submitBtn);
                this.hideLessonPlanSettingsModal();
                
                let statusText = '수정 불가능';
                if (testMode) {
                    statusText = '테스트 모드 (항상 수정 가능)';
                } else if (allowOverrideDeadline) {
                    statusText = '마감일 무시 모드 (항상 수정 가능)';
                } else if (updatedSettings.isEditingAllowed) {
                    statusText = '수정 가능';
                }
                
                Utils.showAlert(`수업계획 설정이 저장되었습니다.\\n현재 상태: ${statusText}`);
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('설정 저장 중 오류가 발생했습니다.');
                console.error('Lesson plan settings error:', error);
            }
        }, 500);
    },

    // 테스트 모드 빠른 토글 (개발자용)
    quickToggleTestMode() {
        const newMode = DataManager.toggleTestMode();
        const statusText = newMode ? '테스트 모드 활성화 (항상 편집 가능)' : '테스트 모드 비활성화';
        Utils.showAlert(statusText);
        return newMode;
    },

    // 수업계획 현황 조회
    showLessonPlanStatus() {
        const lessonPlans = DataManager.getAllLessonPlans();
        const students = DataManager.students;
        const settings = DataManager.lessonPlanSettings;
        
        let completedCount = 0;
        let draftCount = 0;
        let notStartedCount = 0;
        
        const studentPlanMap = new Map();
        lessonPlans.forEach(plan => {
            studentPlanMap.set(plan.studentId, plan);
            if (plan.status === 'completed') {
                completedCount++;
            } else {
                draftCount++;
            }
        });
        
        notStartedCount = students.length - lessonPlans.length;
        
        let editStatus = '수정 불가능';
        if (settings.testMode) {
            editStatus = '테스트 모드 (항상 수정 가능)';
        } else if (settings.allowOverrideDeadline) {
            editStatus = '마감일 무시 모드 (항상 수정 가능)';
        } else if (settings.isEditingAllowed) {
            editStatus = '수정 가능';
        }
        
        const deadlineText = `${settings.editDeadline} ${settings.editTime}`;
        
        const message = `수업계획 현황\\n\\n` +
                       `전체 학생: ${students.length}명\\n` +
                       `완료: ${completedCount}명\\n` +
                       `임시저장: ${draftCount}명\\n` +
                       `미작성: ${notStartedCount}명\\n\\n` +
                       `수정 마감일: ${deadlineText}\\n` +
                       `현재 상태: ${editStatus}`;
        
        alert(message);
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

            // Ctrl/Cmd + T: 테스트 모드 토글 (숨겨진 기능)
            if ((event.ctrlKey || event.metaKey) && event.key === 't') {
                event.preventDefault();
                this.quickToggleTestMode();
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
        const student = DataManager.students.find(s => s.id === application.studentId);
        const lessonPlan = DataManager.getStudentLessonPlan(application.studentId);
        
        // 수업계획 상태 표시
        let lessonPlanStatus = '';
        if (lessonPlan) {
            const statusText = lessonPlan.status === 'completed' ? '완료' : '임시저장';
            const statusClass = lessonPlan.status === 'completed' ? 'completed' : 'draft';
            lessonPlanStatus = `<span class="lesson-plan-status ${statusClass}">수업계획: ${statusText}</span>`;
        } else {
            lessonPlanStatus = `<span class="lesson-plan-status not-started">수업계획: 미작성</span>`;
        }
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(application.studentName)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                        ${student ? `<p class="institute-info">${student.instituteName} • ${student.specialization}</p>` : ''}
                        ${lessonPlanStatus}
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

    // 아이템 카드 HTML 생성 - 영수증 관련 개선
    createItemCardHTML(studentId, item) {
        const statusClass = DataManager.getStatusClass(item.status);
        const statusText = DataManager.getStatusText(item.status);
        const purchaseMethodText = DataManager.getPurchaseMethodText(item.purchaseMethod);
        const purchaseMethodClass = DataManager.getPurchaseMethodClass(item.purchaseMethod);
        
        // 영수증 관련 표시 개선
        let receiptInfo = '';
        if (item.purchaseMethod === 'offline') {
            if (item.receiptImage) {
                const receiptData = typeof item.receiptImage === 'object' ? item.receiptImage : {};
                receiptInfo = `
                    <div class="receipt-info submitted">
                        <div class="receipt-info-header">
                            <span class="receipt-status submitted">
                                ${Utils.createIcon('check-circle')} 영수증 제출완료
                            </span>
                            <button class="btn small secondary view-receipt-btn" 
                                    data-student-id="${studentId}" data-item-id="${item.id}">
                                ${Utils.createIcon('eye')} 영수증 보기
                            </button>
                        </div>
                        <div class="receipt-details-summary">
                            <small>제출일: ${new Date(item.receiptSubmittedAt).toLocaleString('ko-KR')}</small>
                            ${receiptData.purchaseStore ? `<small>구매처: ${receiptData.purchaseStore}</small>` : ''}
                        </div>
                    </div>
                `;
            } else if (item.status === 'approved') {
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
            <div class="admin-item-card" data-student-id="${studentId}" data-item-id="${item.id}">
                <div class="admin-item-header">
                    <div class="admin-item-info">
                        <div class="item-title-row">
                            <h4>${this.escapeHtml(item.name)}</h4>
                            <div class="item-badges">
                                <span class="purchase-method-badge ${purchaseMethodClass}">
                                    ${Utils.createIcon(item.purchaseMethod === 'offline' ? 'store' : 'shopping-cart')} ${purchaseMethodText}
                                </span>
                                ${item.type ? `<span class="type-badge ${item.type}">${item.type === 'bundle' ? '묶음' : '단일'}</span>` : ''}
                            </div>
                        </div>
                        <p class="purpose">${this.escapeHtml(item.purpose)}</p>
                        <div class="admin-item-details">
                            <span><strong>가격:</strong> ${Utils.formatPrice(item.price)}</span>
                            ${item.link ? `
                                <span>
                                    <strong>${item.purchaseMethod === 'offline' ? '참고 링크:' : '구매 링크:'}</strong> 
                                    <a href="${this.escapeHtml(item.link)}" target="_blank" rel="noopener noreferrer">
                                        링크 보기 ${Utils.createIcon('external-link')}
                                    </a>
                                </span>
                            ` : ''}
                        </div>
                        ${receiptInfo}
                    </div>
                    
                    <div class="admin-item-actions">
                        ${this.createActionButtons(item.status, item.purchaseMethod)}
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

        // 영수증 보기 버튼
        const receiptButtons = Utils.$$('.view-receipt-btn');
        receiptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const studentId = parseInt(e.target.closest('button').dataset.studentId);
                const itemId = parseInt(e.target.closest('button').dataset.itemId);
                this.showViewReceiptModal(studentId, itemId);
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
        const offlineStats = DataManager.getOfflinePurchaseStats();
        
        let totalAmount = 0;
        let approvedAmount = 0;
        let purchasedAmount = 0;
        let onlineCount = 0;
        let offlineCount = 0;
        
        applications.forEach(app => {
            app.items.forEach(item => {
                totalAmount += item.price;
                if (item.status === 'approved' || item.status === 'purchased') {
                    approvedAmount += item.price;
                }
                if (item.status === 'purchased') {
                    purchasedAmount += item.price;
                }
                
                // 구매 방식별 통계
                if (item.purchaseMethod === 'offline') {
                    offlineCount++;
                } else {
                    onlineCount++;
                }
            });
        });
        
        const message = `상세 통계\\n\\n` +
                       `전체 신청: ${stats.total}건\\n` +
                       `- 온라인 구매: ${onlineCount}건\\n` +
                       `- 오프라인 구매: ${offlineCount}건\\n\\n` +
                       `승인: ${stats.approved}건\\n` +
                       `반려: ${stats.rejected}건\\n` +
                       `구매완료: ${stats.purchased}건\\n\\n` +
                       `오프라인 구매 현황:\\n` +
                       `- 승인된 오프라인 구매: ${offlineStats.approvedOffline}건\\n` +
                       `- 영수증 제출 완료: ${offlineStats.withReceipt}건\\n` +
                       `- 영수증 제출 대기: ${offlineStats.pendingReceipt}건\\n\\n` +
                       `전체 예산: ${Utils.formatPrice(totalAmount)}\\n` +
                       `승인 예산: ${Utils.formatPrice(approvedAmount)}\\n` +
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