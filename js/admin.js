// 관리자 기능 관리 모듈
const AdminManager = {
    currentSearchTerm: '',

    // 초기화
    init() {
        this.setupEventListeners();
        this.loadStatistics();
        this.loadBudgetOverview(); // 새로 추가
        this.loadApplications();
        this.loadLessonPlanManagement();
        this.loadBudgetSettings();
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

        // 예산 설정 버튼 (새로 추가)
        Utils.on('#budgetSettingsBtn', 'click', () => this.showBudgetSettingsModal());

        // 수업계획 관리 버튼 (새로 추가)
        Utils.on('#lessonPlanManagementBtn', 'click', () => this.showLessonPlanManagementModal());

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

    // 예산 설정 모달 표시
    showBudgetSettingsModal() {
        // 모달이 없으면 생성
        if (!Utils.$('#budgetSettingsModal')) {
            this.createBudgetSettingsModal();
        }

        const modal = Utils.$('#budgetSettingsModal');
        const settings = DataManager.getAllFieldBudgetSettings();
        
        // 현재 설정값으로 폼 채우기
        const tbody = modal.querySelector('#budgetSettingsTable tbody');
        tbody.innerHTML = '';
        
        Object.entries(settings).forEach(([field, setting]) => {
            const row = Utils.createElement('tr');
            row.innerHTML = `
                <td>${field}</td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="perLessonAmount" 
                           value="${setting.perLessonAmount}" 
                           min="0" step="1000" class="amount-input">
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="maxBudget" 
                           value="${setting.maxBudget}" 
                           min="0" step="10000" class="amount-input">
                </td>
            `;
            tbody.appendChild(row);
        });
        
        modal.classList.add('active');
    },

    // 예산 설정 모달 생성
    createBudgetSettingsModal() {
        const modalHTML = `
            <div id="budgetSettingsModal" class="modal">
                <div class="modal-content large">
                    <h3>분야별 예산 설정</h3>
                    <form id="budgetSettingsForm">
                        <div class="budget-settings-info">
                            <p>각 분야별로 회당 지원금과 최대 상한을 설정하세요. 학생의 수업계획이 승인되면 이 설정에 따라 자동으로 예산이 배정됩니다.</p>
                        </div>
                        
                        <div class="table-container">
                            <table id="budgetSettingsTable" class="budget-settings-table">
                                <thead>
                                    <tr>
                                        <th>분야</th>
                                        <th>회당 지원금 (원)</th>
                                        <th>최대 상한 (원)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <!-- 동적으로 생성됨 -->
                                </tbody>
                            </table>
                        </div>
                        
                        <div class="modal-actions">
                            <button type="button" id="budgetSettingsCancelBtn" class="btn secondary">취소</button>
                            <button type="submit" class="btn primary">설정 저장</button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 이벤트 리스너 추가
        Utils.on('#budgetSettingsCancelBtn', 'click', () => this.hideBudgetSettingsModal());
        Utils.on('#budgetSettingsModal', 'click', (e) => {
            if (e.target.id === 'budgetSettingsModal') {
                this.hideBudgetSettingsModal();
            }
        });
        Utils.on('#budgetSettingsForm', 'submit', (e) => {
            e.preventDefault();
            this.handleBudgetSettingsSubmit();
        });
    },

    // 예산 설정 모달 숨김
    hideBudgetSettingsModal() {
        const modal = Utils.$('#budgetSettingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 예산 설정 저장
    handleBudgetSettingsSubmit() {
        const form = Utils.$('#budgetSettingsForm');
        const inputs = form.querySelectorAll('.amount-input');
        const updates = {};
        
        inputs.forEach(input => {
            const field = input.dataset.field;
            const type = input.dataset.type;
            const value = parseInt(input.value) || 0;
            
            if (!updates[field]) {
                updates[field] = {};
            }
            updates[field][type] = value;
        });
        
        const submitBtn = form.querySelector('button[type="submit"]');
        Utils.showLoading(submitBtn);
        
        setTimeout(() => {
            try {
                Object.entries(updates).forEach(([field, settings]) => {
                    DataManager.updateFieldBudgetSettings(field, settings);
                });
                
                Utils.hideLoading(submitBtn);
                this.hideBudgetSettingsModal();
                Utils.showAlert('예산 설정이 저장되었습니다.');
                
                // 기존 예산 배정된 학생들의 예산 재계산
                this.recalculateAllBudgets();
                
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('예산 설정 저장 중 오류가 발생했습니다.');
                console.error('Budget settings error:', error);
            }
        }, 500);
    },

    // 모든 학생의 예산 재계산
    recalculateAllBudgets() {
        const lessonPlans = DataManager.getAllLessonPlans();
        let updatedCount = 0;
        
        lessonPlans.forEach(plan => {
            if (plan.approvalStatus === 'approved') {
                const result = DataManager.allocateBudgetToStudent(plan.studentId);
                if (result) {
                    updatedCount++;
                }
            }
        });
        
        if (updatedCount > 0) {
            Utils.showAlert(`${updatedCount}명의 학생 예산이 재계산되었습니다.`);
            // 예산 현황도 다시 로드
            this.loadBudgetOverview();
        }
    },

    // 수업계획 관리 모달 표시
    showLessonPlanManagementModal() {
        // 모달이 없으면 생성
        if (!Utils.$('#lessonPlanManagementModal')) {
            this.createLessonPlanManagementModal();
        }

        const modal = Utils.$('#lessonPlanManagementModal');
        this.loadLessonPlansForManagement();
        modal.classList.add('active');
    },

    // 수업계획 관리 모달 생성
    createLessonPlanManagementModal() {
        const modalHTML = `
            <div id="lessonPlanManagementModal" class="modal">
                <div class="modal-content large">
                    <h3>수업계획 승인 관리</h3>
                    <div class="lesson-plan-management-container">
                        <div class="management-header">
                            <div class="management-stats">
                                <span id="pendingPlansCount" class="stat-badge pending">대기 중: 0</span>
                                <span id="approvedPlansCount" class="stat-badge approved">승인됨: 0</span>
                                <span id="rejectedPlansCount" class="stat-badge rejected">반려됨: 0</span>
                            </div>
                            <div class="management-actions">
                                <button id="refreshPlansBtn" class="btn small secondary">
                                    <i data-lucide="refresh-cw"></i> 새로고침
                                </button>
                            </div>
                        </div>
                        
                        <div id="lessonPlansList" class="lesson-plans-list">
                            <!-- 동적으로 생성됨 -->
                        </div>
                    </div>
                    
                    <div class="modal-actions">
                        <button type="button" id="lessonPlanManagementCloseBtn" class="btn secondary">닫기</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // 이벤트 리스너 추가
        Utils.on('#lessonPlanManagementCloseBtn', 'click', () => this.hideLessonPlanManagementModal());
        Utils.on('#lessonPlanManagementModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanManagementModal') {
                this.hideLessonPlanManagementModal();
            }
        });
        Utils.on('#refreshPlansBtn', 'click', () => this.loadLessonPlansForManagement());
    },

    // 수업계획 관리 모달 숨김
    hideLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 수업계획 목록 로드 (관리용)
    loadLessonPlansForManagement() {
        const allPlans = DataManager.getAllLessonPlans();
        const students = DataManager.students;
        
        // 통계 계산
        const pendingCount = allPlans.filter(p => p.status === 'completed' && (!p.approvalStatus || p.approvalStatus === 'pending')).length;
        const approvedCount = allPlans.filter(p => p.approvalStatus === 'approved').length;
        const rejectedCount = allPlans.filter(p => p.approvalStatus === 'rejected').length;
        
        // 통계 업데이트
        Utils.$('#pendingPlansCount').textContent = `대기 중: ${pendingCount}`;
        Utils.$('#approvedPlansCount').textContent = `승인됨: ${approvedCount}`;
        Utils.$('#rejectedPlansCount').textContent = `반려됨: ${rejectedCount}`;
        
        // 수업계획 목록 생성
        const container = Utils.$('#lessonPlansList');
        container.innerHTML = '';
        
        if (allPlans.length === 0) {
            container.innerHTML = '<div class="no-plans">제출된 수업계획이 없습니다.</div>';
            return;
        }
        
        allPlans.forEach(plan => {
            const student = students.find(s => s.id === plan.studentId);
            const planCard = this.createLessonPlanCard(plan, student);
            container.appendChild(planCard);
        });
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        // 이벤트 리스너 재설정
        this.setupLessonPlanActionListeners();
    },

    // 수업계획 카드 생성
    createLessonPlanCard(plan, student) {
        const card = Utils.createElement('div', 'lesson-plan-card');
        
        const statusText = plan.status === 'completed' ? '제출완료' : '임시저장';
        const statusClass = plan.status === 'completed' ? 'completed' : 'draft';
        
        let approvalStatusText = '대기 중';
        let approvalStatusClass = 'pending';
        
        if (plan.approvalStatus === 'approved') {
            approvalStatusText = '승인됨';
            approvalStatusClass = 'approved';
        } else if (plan.approvalStatus === 'rejected') {
            approvalStatusText = '반려됨';
            approvalStatusClass = 'rejected';
        }
        
        // 예산 정보 계산
        const budgetInfo = DataManager.calculateBudgetFromLessonPlan(plan.studentId);
        
        card.innerHTML = `
            <div class="plan-card-header">
                <div class="plan-student-info">
                    <h4>${plan.studentName}</h4>
                    <p>${student?.instituteName || ''} • ${student?.specialization || ''}</p>
                    <div class="plan-meta">
                        <span>수업 횟수: ${plan.totalLessons}회</span>
                        <span>기간: ${plan.startDate} ~ ${plan.endDate}</span>
                    </div>
                </div>
                <div class="plan-status-info">
                    <span class="plan-status ${statusClass}">${statusText}</span>
                    <span class="approval-status ${approvalStatusClass}">${approvalStatusText}</span>
                </div>
            </div>
            
            ${budgetInfo.allocated > 0 ? `
                <div class="plan-budget-info">
                    <div class="budget-item">
                        <span class="budget-label">배정 예산:</span>
                        <span class="budget-value">${Utils.formatPrice(budgetInfo.allocated)}</span>
                    </div>
                    <div class="budget-calculation">
                        ${plan.totalLessons}회 × ${Utils.formatPrice(budgetInfo.perLessonAmount)} = ${Utils.formatPrice(budgetInfo.calculated)}
                        ${budgetInfo.isCapReached ? ` (상한 ${Utils.formatPrice(budgetInfo.maxBudget)} 적용)` : ''}
                    </div>
                </div>
            ` : ''}
            
            <div class="plan-card-content">
                <div class="plan-goals">
                    <strong>수업 목표:</strong>
                    <p>${plan.overallGoals || '목표가 설정되지 않았습니다.'}</p>
                </div>
                ${plan.specialNotes ? `
                    <div class="plan-notes">
                        <strong>특별 고려사항:</strong>
                        <p>${plan.specialNotes}</p>
                    </div>
                ` : ''}
            </div>
            
            ${plan.rejectionReason ? `
                <div class="plan-rejection-reason">
                    <strong>반려 사유:</strong>
                    <p>${plan.rejectionReason}</p>
                </div>
            ` : ''}
            
            <div class="plan-card-actions">
                ${this.createLessonPlanActionButtons(plan)}
            </div>
        `;
        
        return card;
    },

    // 수업계획 액션 버튼 생성
    createLessonPlanActionButtons(plan) {
        if (plan.status !== 'completed') {
            return '<span class="plan-action-note">수업계획이 제출되지 않았습니다.</span>';
        }
        
        if (plan.approvalStatus === 'approved') {
            return `
                <span class="plan-approved-info">
                    승인일: ${plan.approvedAt ? new Date(plan.approvedAt).toLocaleDateString('ko-KR') : '-'}
                    (승인자: ${plan.approvedBy || '관리자'})
                </span>
            `;
        }
        
        if (plan.approvalStatus === 'rejected') {
            return `
                <div class="plan-rejected-actions">
                    <span class="plan-rejected-info">
                        반려일: ${plan.rejectedAt ? new Date(plan.rejectedAt).toLocaleDateString('ko-KR') : '-'}
                    </span>
                    <button class="btn small approve" data-action="approve" data-student-id="${plan.studentId}">
                        재승인
                    </button>
                </div>
            `;
        }
        
        // 대기 중인 경우
        return `
            <button class="btn small approve" data-action="approve" data-student-id="${plan.studentId}">
                <i data-lucide="check"></i> 승인
            </button>
            <button class="btn small reject" data-action="reject" data-student-id="${plan.studentId}">
                <i data-lucide="x"></i> 반려
            </button>
        `;
    },

    // 수업계획 액션 이벤트 리스너 설정
    setupLessonPlanActionListeners() {
        const actionButtons = Utils.$$('#lessonPlansList button[data-action]');
        
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const action = e.target.closest('button').dataset.action;
                const studentId = parseInt(e.target.closest('button').dataset.studentId);
                
                this.handleLessonPlanAction(action, studentId, e.target);
            });
        });
    },

    // 수업계획 액션 처리
    handleLessonPlanAction(action, studentId, buttonElement) {
        switch(action) {
            case 'approve':
                this.approveLessonPlan(studentId, buttonElement);
                break;
            case 'reject':
                this.rejectLessonPlan(studentId, buttonElement);
                break;
        }
    },

    // 수업계획 승인
    approveLessonPlan(studentId, buttonElement) {
        if (Utils.showConfirm('이 수업계획을 승인하시겠습니까? 승인 시 자동으로 예산이 배정됩니다.')) {
            Utils.showLoading(buttonElement);
            
            setTimeout(() => {
                const result = DataManager.approveLessonPlan(studentId);
                
                if (result.success) {
                    this.loadLessonPlansForManagement();
                    this.loadBudgetOverview(); // 예산 현황 새로고침
                    
                    let message = '수업계획이 승인되었습니다.';
                    if (result.budgetInfo) {
                        message += `\\n배정된 예산: ${Utils.formatPrice(result.budgetInfo.allocated)}`;
                    }
                    Utils.showAlert(message);
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '승인 처리 중 오류가 발생했습니다.');
                }
            }, 500);
        }
    },

    // 수업계획 반려
    rejectLessonPlan(studentId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            setTimeout(() => {
                const result = DataManager.rejectLessonPlan(studentId, reason.trim());
                
                if (result.success) {
                    this.loadLessonPlansForManagement();
                    this.loadBudgetOverview(); // 예산 현황 새로고침
                    Utils.showAlert('수업계획이 반려되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '반려 처리 중 오류가 발생했습니다.');
                }
            }, 500);
        }
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

            // Ctrl/Cmd + B: 예산 설정 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                this.showBudgetSettingsModal();
            }

            // Ctrl/Cmd + L: 수업계획 관리 모달
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                this.showLessonPlanManagementModal();
            }
        });
    },

    // 업데이트된 통계 로드 - 새로운 요구사항 반영
    loadStatistics() {
        const stats = DataManager.getStats();
        
        // 기존 4개 통계를 새로운 3개 통계로 변경
        Utils.$('#applicantCount').textContent = stats.applicantCount;    // 구매 요청 신청자수
        Utils.$('#pendingCount').textContent = stats.pendingCount;        // 미승인 아이템
        Utils.$('#approvedCount').textContent = stats.approvedCount;      // 승인됨 (구매대기)
    },

    // 새로 추가: 예산 현황 로드 - 개선된 HTML 생성 (각 항목별 클래스 추가)
    loadBudgetOverview() {
        const budgetStats = DataManager.getBudgetOverviewStats();
        
        // 예산 현황 업데이트 - 각 항목별로 다른 클래스 적용
        Utils.$('#totalApprovedBudget').textContent = Utils.formatPrice(budgetStats.totalApprovedBudget);
        Utils.$('#approvedItemsTotal').textContent = Utils.formatPrice(budgetStats.approvedItemsTotal);
        Utils.$('#purchasedTotal').textContent = Utils.formatPrice(budgetStats.purchasedTotal);
        Utils.$('#averagePerPerson').textContent = Utils.formatPrice(budgetStats.averagePerPerson);

        // 각 예산 항목에 적절한 클래스 추가
        const totalBudgetItem = Utils.$('#totalApprovedBudget').closest('.budget-summary-item');
        const approvedItemsItem = Utils.$('#approvedItemsTotal').closest('.budget-summary-item');
        const purchasedItemsItem = Utils.$('#purchasedTotal').closest('.budget-summary-item');
        const averagePersonItem = Utils.$('#averagePerPerson').closest('.budget-summary-item');

        if (totalBudgetItem && !totalBudgetItem.classList.contains('primary')) {
            totalBudgetItem.classList.add('primary');
        }
        if (approvedItemsItem && !approvedItemsItem.classList.contains('approved-items')) {
            approvedItemsItem.classList.add('approved-items');
        }
        if (purchasedItemsItem && !purchasedItemsItem.classList.contains('purchased-items')) {
            purchasedItemsItem.classList.add('purchased-items');
        }
        if (averagePersonItem && !averagePersonItem.classList.contains('average-person')) {
            averagePersonItem.classList.add('average-person');
        }
    },

    // 수업계획 관리 정보 로드
    loadLessonPlanManagement() {
        const pendingPlans = DataManager.getPendingLessonPlans();
        
        // 수업계획 관리 버튼에 대기 중인 수업계획 개수 표시
        const btn = Utils.$('#lessonPlanManagementBtn');
        if (btn && pendingPlans.length > 0) {
            btn.innerHTML = `
                <i data-lucide="clipboard-check"></i>
                수업계획 관리 <span class="notification-badge">${pendingPlans.length}</span>
            `;
        }
    },

    // 예산 설정 로드
    loadBudgetSettings() {
        // 예산 설정 버튼이 없으면 생성
        const header = Utils.$('.header-content .header-actions');
        if (header && !Utils.$('#budgetSettingsBtn')) {
            const budgetBtn = Utils.createElement('button', 'btn secondary');
            budgetBtn.id = 'budgetSettingsBtn';
            budgetBtn.innerHTML = `
                <i data-lucide="dollar-sign"></i>
                예산 설정
            `;
            
            // 수업계획 설정 버튼 다음에 삽입
            const lessonPlanBtn = Utils.$('#lessonPlanSettingsBtn');
            if (lessonPlanBtn) {
                lessonPlanBtn.insertAdjacentElement('afterend', budgetBtn);
            } else {
                header.insertBefore(budgetBtn, header.firstChild);
            }
            
            // 이벤트 리스너 추가
            budgetBtn.addEventListener('click', () => this.showBudgetSettingsModal());
        }

        // 수업계획 관리 버튼도 없으면 생성
        if (header && !Utils.$('#lessonPlanManagementBtn')) {
            const managementBtn = Utils.createElement('button', 'btn secondary');
            managementBtn.id = 'lessonPlanManagementBtn';
            managementBtn.innerHTML = `
                <i data-lucide="clipboard-check"></i>
                수업계획 관리
            `;
            
            // 예산 설정 버튼 다음에 삽입
            const budgetBtn = Utils.$('#budgetSettingsBtn');
            if (budgetBtn) {
                budgetBtn.insertAdjacentElement('afterend', managementBtn);
            } else {
                header.insertBefore(managementBtn, header.firstChild);
            }
            
            // 이벤트 리스너 추가
            managementBtn.addEventListener('click', () => this.showLessonPlanManagementModal());
        }

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
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
        const budgetStatus = DataManager.getStudentBudgetStatus(application.studentId);
        
        // 수업계획 상태 표시
        let lessonPlanStatus = '';
        if (lessonPlan) {
            if (lessonPlan.approvalStatus === 'approved') {
                lessonPlanStatus = `<span class="lesson-plan-status approved">수업계획: 승인됨</span>`;
            } else if (lessonPlan.approvalStatus === 'rejected') {
                lessonPlanStatus = `<span class="lesson-plan-status rejected">수업계획: 반려됨</span>`;
            } else {
                const statusText = lessonPlan.status === 'completed' ? '승인대기' : '임시저장';
                const statusClass = lessonPlan.status === 'completed' ? 'pending' : 'draft';
                lessonPlanStatus = `<span class="lesson-plan-status ${statusClass}">수업계획: ${statusText}</span>`;
            }
        } else {
            lessonPlanStatus = `<span class="lesson-plan-status not-started">수업계획: 미작성</span>`;
        }

        // 예산 정보 표시
        let budgetInfo = '';
        if (budgetStatus && budgetStatus.allocated > 0) {
            budgetInfo = `
                <div class="budget-info-summary">
                    <span>예산: ${Utils.formatPrice(budgetStatus.used)} / ${Utils.formatPrice(budgetStatus.allocated)}</span>
                    <span>잔여: ${Utils.formatPrice(budgetStatus.remaining)}</span>
                </div>
            `;
        }
        
        card.innerHTML = `
            <div class="admin-application-header">
                <div class="student-info">
                    <div>
                        <h3>${this.escapeHtml(application.studentName)}</h3>
                        <p class="submission-date">신청일: ${submittedDate}</p>
                        ${student ? `<p class="institute-info">${student.instituteName} • ${student.specialization}</p>` : ''}
                        ${lessonPlanStatus}
                        ${budgetInfo}
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
        // 예산 확인
        const budgetStatus = DataManager.getStudentBudgetStatus(studentId);
        if (!budgetStatus.canApplyForEquipment) {
            Utils.showAlert('수업계획이 승인되지 않아 교구 신청을 승인할 수 없습니다.');
            return;
        }

        const application = DataManager.applications.find(app => app.studentId === studentId);
        const item = application?.items.find(i => i.id === itemId);
        
        if (item && budgetStatus.remaining < item.price) {
            Utils.showAlert(`예산이 부족합니다. 남은 예산: ${Utils.formatPrice(budgetStatus.remaining)}`);
            return;
        }

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

    // 데이터 새로고침 - 예산 현황도 포함
    refreshData() {
        this.loadStatistics();
        this.loadBudgetOverview(); // 새로 추가
        this.loadApplications();
        this.loadLessonPlanManagement();
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

    // 상세 통계 보기 - 업데이트됨
    showDetailedStats() {
        const stats = DataManager.getStats();
        const budgetStats = DataManager.getBudgetOverviewStats();
        const applications = DataManager.getAllApplications();
        const offlineStats = DataManager.getOfflinePurchaseStats();
        const budgetSettings = DataManager.getAllFieldBudgetSettings();
        
        // 분야별 통계
        const fieldStats = {};
        Object.keys(budgetSettings).forEach(field => {
            fieldStats[field] = { count: 0, amount: 0 };
        });
        
        applications.forEach(app => {
            const student = DataManager.students.find(s => s.id === app.studentId);
            
            app.items.forEach(item => {
                // 분야별 통계
                if (student && fieldStats[student.specialization]) {
                    fieldStats[student.specialization].count++;
                    fieldStats[student.specialization].amount += item.price;
                }
            });
        });
        
        let fieldStatsText = '';
        Object.entries(fieldStats).forEach(([field, stat]) => {
            if (stat.count > 0) {
                fieldStatsText += `- ${field}: ${stat.count}건, ${Utils.formatPrice(stat.amount)}\\n`;
            }
        });
        
        const message = `상세 통계\\n\\n` +
                       `신청자 수: ${stats.applicantCount}명\\n` +
                       `미승인 아이템: ${stats.pendingCount}건\\n` +
                       `승인된 아이템: ${stats.approvedCount}건\\n` +
                       `구매완료 아이템: ${stats.purchasedCount}건\\n` +
                       `반려된 아이템: ${stats.rejectedCount}건\\n\\n` +
                       `예산 현황:\\n` +
                       `- 배정된 총 예산: ${Utils.formatPrice(budgetStats.totalApprovedBudget)}\\n` +
                       `- 승인된 아이템 총액: ${Utils.formatPrice(budgetStats.approvedItemsTotal)}\\n` +
                       `- 구매 완료 총액: ${Utils.formatPrice(budgetStats.purchasedTotal)}\\n` +
                       `- 1인당 평균 지원금: ${Utils.formatPrice(budgetStats.averagePerPerson)}\\n\\n` +
                       `오프라인 구매 현황:\\n` +
                       `- 승인된 오프라인 구매: ${offlineStats.approvedOffline}건\\n` +
                       `- 영수증 제출 완료: ${offlineStats.withReceipt}건\\n` +
                       `- 영수증 제출 대기: ${offlineStats.pendingReceipt}건\\n\\n` +
                       `분야별 통계:\\n${fieldStatsText}`;
        
        alert(message);
    }
};