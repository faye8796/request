// 관리자 기능 관리 모듈 (Supabase 연동)
const AdminManager = {
    currentSearchTerm: '',

    // 초기화
    async init() {
        this.setupEventListeners();
        await this.loadStatistics();
        await this.loadBudgetOverview();
        await this.loadApplications();
        await this.loadLessonPlanManagement();
        await this.loadBudgetSettings();
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

        // 예산 설정 버튼
        Utils.on('#budgetSettingsBtn', 'click', () => this.showBudgetSettingsModal());

        // 수업계획 관리 버튼
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
    async showBudgetSettingsModal() {
        // 모달이 없으면 생성
        if (!Utils.$('#budgetSettingsModal')) {
            this.createBudgetSettingsModal();
        }

        const modal = Utils.$('#budgetSettingsModal');
        const settings = await SupabaseAPI.getAllFieldBudgetSettings();
        
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
    async handleBudgetSettingsSubmit() {
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
        
        try {
            let successCount = 0;
            for (const [field, settings] of Object.entries(updates)) {
                const result = await SupabaseAPI.updateFieldBudgetSettings(field, settings);
                if (result.success) {
                    successCount++;
                }
            }
            
            Utils.hideLoading(submitBtn);
            this.hideBudgetSettingsModal();
            
            if (successCount > 0) {
                Utils.showAlert(`${successCount}개 분야의 예산 설정이 저장되었습니다.`);
                await this.loadBudgetOverview();
            } else {
                Utils.showAlert('예산 설정 저장 중 오류가 발생했습니다.');
            }
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showAlert('예산 설정 저장 중 오류가 발생했습니다.');
            console.error('Budget settings error:', error);
        }
    },

    // 수업계획 관리 모달 표시
    async showLessonPlanManagementModal() {
        // 모달이 없으면 생성
        if (!Utils.$('#lessonPlanManagementModal')) {
            this.createLessonPlanManagementModal();
        }

        const modal = Utils.$('#lessonPlanManagementModal');
        await this.loadLessonPlansForManagement();
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
    async loadLessonPlansForManagement() {
        try {
            const allPlans = await SupabaseAPI.getAllLessonPlans();
            
            // 통계 계산
            const pendingCount = allPlans.filter(p => p.status === 'submitted' && (!p.approval_status || p.approval_status === 'pending')).length;
            const approvedCount = allPlans.filter(p => p.approval_status === 'approved').length;
            const rejectedCount = allPlans.filter(p => p.approval_status === 'rejected').length;
            
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
                const planCard = this.createLessonPlanCard(plan);
                container.appendChild(planCard);
            });
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            // 이벤트 리스너 재설정
            this.setupLessonPlanActionListeners();
            
        } catch (error) {
            console.error('Error loading lesson plans for management:', error);
            Utils.showAlert('수업계획 목록을 불러오는 중 오류가 발생했습니다.');
        }
    },

    // 수업계획 카드 생성
    createLessonPlanCard(plan) {
        const card = Utils.createElement('div', 'lesson-plan-card');
        
        const statusText = plan.status === 'submitted' ? '제출완료' : '임시저장';
        const statusClass = plan.status === 'submitted' ? 'completed' : 'draft';
        
        let approvalStatusText = '대기 중';
        let approvalStatusClass = 'pending';
        
        if (plan.approval_status === 'approved') {
            approvalStatusText = '승인됨';
            approvalStatusClass = 'approved';
        } else if (plan.approval_status === 'rejected') {
            approvalStatusText = '반려됨';
            approvalStatusClass = 'rejected';
        }
        
        // 수업 데이터에서 총 수업 횟수 계산
        const totalLessons = plan.lessons?.totalLessons || 0;
        const startDate = plan.lessons?.startDate || '';
        const endDate = plan.lessons?.endDate || '';
        
        card.innerHTML = `
            <div class="plan-card-header">
                <div class="plan-student-info">
                    <h4>${plan.user_profiles?.name || '알 수 없음'}</h4>
                    <p>${plan.user_profiles?.sejong_institute || ''} • ${plan.user_profiles?.field || ''}</p>
                    <div class="plan-meta">
                        <span>수업 횟수: ${totalLessons}회</span>
                        <span>기간: ${startDate} ~ ${endDate}</span>
                    </div>
                </div>
                <div class="plan-status-info">
                    <span class="plan-status ${statusClass}">${statusText}</span>
                    <span class="approval-status ${approvalStatusClass}">${approvalStatusText}</span>
                </div>
            </div>
            
            <div class="plan-card-content">
                <div class="plan-goals">
                    <strong>수업 목표:</strong>
                    <p>${plan.lessons?.overallGoals || '목표가 설정되지 않았습니다.'}</p>
                </div>
                ${plan.lessons?.specialNotes ? `
                    <div class="plan-notes">
                        <strong>특별 고려사항:</strong>
                        <p>${plan.lessons.specialNotes}</p>
                    </div>
                ` : ''}
            </div>
            
            ${plan.rejection_reason ? `
                <div class="plan-rejection-reason">
                    <strong>반려 사유:</strong>
                    <p>${plan.rejection_reason}</p>
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
        if (plan.status !== 'submitted') {
            return '<span class="plan-action-note">수업계획이 제출되지 않았습니다.</span>';
        }
        
        if (plan.approval_status === 'approved') {
            return `
                <span class="plan-approved-info">
                    승인일: ${plan.approved_at ? new Date(plan.approved_at).toLocaleDateString('ko-KR') : '-'}
                </span>
            `;
        }
        
        if (plan.approval_status === 'rejected') {
            return `
                <div class="plan-rejected-actions">
                    <span class="plan-rejected-info">
                        반려일: ${plan.updated_at ? new Date(plan.updated_at).toLocaleDateString('ko-KR') : '-'}
                    </span>
                    <button class="btn small approve" data-action="approve" data-student-id="${plan.user_id}">
                        재승인
                    </button>
                </div>
            `;
        }
        
        // 대기 중인 경우
        return `
            <button class="btn small approve" data-action="approve" data-student-id="${plan.user_id}">
                <i data-lucide="check"></i> 승인
            </button>
            <button class="btn small reject" data-action="reject" data-student-id="${plan.user_id}">
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
    async approveLessonPlan(studentId, buttonElement) {
        if (Utils.showConfirm('이 수업계획을 승인하시겠습니까? 승인 시 자동으로 예산이 배정됩니다.')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.approveLessonPlan(studentId);
                
                if (result.success) {
                    await this.loadLessonPlansForManagement();
                    await this.loadBudgetOverview();
                    
                    let message = '수업계획이 승인되었습니다.';
                    if (result.budgetInfo) {
                        message += `\n배정된 예산: ${Utils.formatPrice(result.budgetInfo.allocated)}`;
                    }
                    Utils.showAlert(message);
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '승인 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showAlert('승인 처리 중 오류가 발생했습니다.');
                console.error('Approve lesson plan error:', error);
            }
        }
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.rejectLessonPlan(studentId, reason.trim());
                
                if (result.success) {
                    await this.loadLessonPlansForManagement();
                    await this.loadBudgetOverview();
                    Utils.showAlert('수업계획이 반려되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '반려 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showAlert('반려 처리 중 오류가 발생했습니다.');
                console.error('Reject lesson plan error:', error);
            }
        }
    },

    // 영수증 보기 모달 표시
    async showViewReceiptModal(requestId) {
        try {
            const receipt = await SupabaseAPI.getReceiptByRequestId(requestId);
            if (!receipt) {
                Utils.showAlert('영수증을 찾을 수 없습니다.');
                return;
            }

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
            Utils.showAlert('영수증을 불러오는 중 오류가 발생했습니다.');
        }
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
    async showLessonPlanSettingsModal() {
        const modal = Utils.$('#lessonPlanSettingsModal');
        const settings = await SupabaseAPI.getSystemSettings();
        
        // 현재 설정값으로 폼 채우기
        Utils.$('#planEditDeadline').value = settings.lesson_plan_deadline || '2026-12-31';
        Utils.$('#planEditTime').value = '23:59';
        Utils.$('#planEditNotice').value = settings.notice_message || '';
        
        // 테스트 모드 체크박스 설정
        const testModeCheckbox = Utils.$('#testModeEnabled');
        if (testModeCheckbox) {
            testModeCheckbox.checked = settings.test_mode || false;
        }
        
        // 마감일 무시 체크박스 설정
        const overrideCheckbox = Utils.$('#allowOverrideDeadline');
        if (overrideCheckbox) {
            overrideCheckbox.checked = settings.ignore_deadline || false;
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
    async handleLessonPlanSettingsSubmit() {
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

        try {
            // 각 설정을 개별적으로 업데이트
            await SupabaseAPI.updateSystemSetting('lesson_plan_deadline', deadline || '2026-12-31');
            await SupabaseAPI.updateSystemSetting('test_mode', testMode);
            await SupabaseAPI.updateSystemSetting('ignore_deadline', allowOverrideDeadline);
            await SupabaseAPI.updateSystemSetting('notice_message', notice || '수업계획을 자유롭게 작성하세요.');

            Utils.hideLoading(submitBtn);
            this.hideLessonPlanSettingsModal();
            
            let statusText = '수정 불가능';
            if (testMode) {
                statusText = '테스트 모드 (항상 수정 가능)';
            } else if (allowOverrideDeadline) {
                statusText = '마감일 무시 모드 (항상 수정 가능)';
            } else {
                const canEdit = await SupabaseAPI.canEditLessonPlan();
                statusText = canEdit ? '수정 가능' : '수정 불가능';
            }
            
            Utils.showAlert(`수업계획 설정이 저장되었습니다.\n현재 상태: ${statusText}`);
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showAlert('설정 저장 중 오류가 발생했습니다.');
            console.error('Lesson plan settings error:', error);
        }
    },

    // 테스트 모드 빠른 토글 (개발자용)
    async quickToggleTestMode() {
        try {
            const newMode = await SupabaseAPI.toggleTestMode();
            const statusText = newMode ? '테스트 모드 활성화 (항상 편집 가능)' : '테스트 모드 비활성화';
            Utils.showAlert(statusText);
            return newMode;
        } catch (error) {
            console.error('Error toggling test mode:', error);
            Utils.showAlert('테스트 모드 변경 중 오류가 발생했습니다.');
            return false;
        }
    },

    // 키보드 단축키 설정
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            if (SupabaseAPI.currentUserType !== 'admin') return;

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

    // 통계 로드
    async loadStatistics() {
        try {
            const stats = await SupabaseAPI.getStats();
            
            Utils.$('#applicantCount').textContent = stats.applicantCount;
            Utils.$('#pendingCount').textContent = stats.pendingCount;
            Utils.$('#approvedCount').textContent = stats.approvedCount;
        } catch (error) {
            console.error('Error loading statistics:', error);
        }
    },

    // 예산 현황 로드
    async loadBudgetOverview() {
        try {
            const budgetStats = await SupabaseAPI.getBudgetOverviewStats();
            
            Utils.$('#totalApprovedBudget').textContent = Utils.formatPrice(budgetStats.totalApprovedBudget);
            Utils.$('#approvedItemsTotal').textContent = Utils.formatPrice(budgetStats.approvedItemsTotal);
            Utils.$('#purchasedTotal').textContent = Utils.formatPrice(budgetStats.purchasedTotal);
            Utils.$('#averagePerPerson').textContent = Utils.formatPrice(budgetStats.averagePerPerson);
        } catch (error) {
            console.error('Error loading budget overview:', error);
        }
    },

    // 수업계획 관리 정보 로드
    async loadLessonPlanManagement() {
        try {
            const pendingPlans = await SupabaseAPI.getPendingLessonPlans();
            
            // 수업계획 관리 버튼에 대기 중인 수업계획 개수 표시
            const btn = Utils.$('#lessonPlanManagementBtn');
            if (btn && pendingPlans.length > 0) {
                btn.innerHTML = `
                    <i data-lucide="clipboard-check"></i>
                    수업계획 관리 <span class="notification-badge">${pendingPlans.length}</span>
                `;
            }
        } catch (error) {
            console.error('Error loading lesson plan management:', error);
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
    async loadApplications() {
        try {
            const applications = await SupabaseAPI.searchApplications(this.currentSearchTerm);
            this.renderApplications(applications);
        } catch (error) {
            console.error('Error loading applications:', error);
            Utils.showAlert('신청 내역을 불러오는 중 오류가 발생했습니다.');
        }
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
                const requestId = parseInt(itemCard.dataset.requestId);
                
                this.handleItemAction(action, requestId, e.target);
            });
        });

        // 영수증 보기 버튼
        const receiptButtons = Utils.$$('.view-receipt-btn');
        receiptButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const requestId = parseInt(e.target.closest('button').dataset.requestId);
                this.showViewReceiptModal(requestId);
            });
        });
    },

    // 아이템 액션 처리
    async handleItemAction(action, requestId, buttonElement) {
        switch(action) {
            case 'approve':
                await this.approveItem(requestId, buttonElement);
                break;
            case 'reject':
                await this.rejectItem(requestId, buttonElement);
                break;
            case 'purchase':
                await this.markAsPurchased(requestId, buttonElement);
                break;
        }
    },

    // 아이템 승인
    async approveItem(requestId, buttonElement) {
        if (Utils.showConfirm('이 교구 신청을 승인하시겠습니까?')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'approved');
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showAlert('승인되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '승인 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showAlert('승인 처리 중 오류가 발생했습니다.');
                console.error('Approve item error:', error);
            }
        }
    },

    // 아이템 반려
    async rejectItem(requestId, buttonElement) {
        const reason = Utils.showPrompt('반려 사유를 입력하세요:', '');
        
        if (reason && reason.trim()) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'rejected', reason.trim());
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showAlert('반려 처리되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '반려 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showAlert('반려 처리 중 오류가 발생했습니다.');
                console.error('Reject item error:', error);
            }
        }
    },

    // 구매 완료 처리
    async markAsPurchased(requestId, buttonElement) {
        if (Utils.showConfirm('이 교구의 구매가 완료되었습니까?')) {
            Utils.showLoading(buttonElement);
            
            try {
                const result = await SupabaseAPI.updateItemStatus(requestId, 'purchased');
                
                if (result.success) {
                    await this.refreshData();
                    Utils.showAlert('구매완료로 처리되었습니다.');
                } else {
                    Utils.hideLoading(buttonElement);
                    Utils.showAlert(result.message || '구매완료 처리 중 오류가 발생했습니다.');
                }
            } catch (error) {
                Utils.hideLoading(buttonElement);
                Utils.showAlert('구매완료 처리 중 오류가 발생했습니다.');
                console.error('Mark as purchased error:', error);
            }
        }
    },

    // 검색 처리
    handleSearch(searchTerm) {
        this.currentSearchTerm = searchTerm.trim();
        this.loadApplications();
    },

    // Excel 내보내기 처리
    async handleExport() {
        Utils.showLoading('#exportBtn');
        
        try {
            const exportData = await SupabaseAPI.prepareExportData();
            
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
    async refreshData() {
        await this.loadStatistics();
        await this.loadBudgetOverview();
        await this.loadApplications();
        await this.loadLessonPlanManagement();
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
    }
};