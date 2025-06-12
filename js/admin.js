// 관리자 기능 관리 모듈
const AdminManager = {
    currentSearchTerm: '',
    currentViewingReceipt: null,
    currentLessonPlanDetail: null,

    // 초기화
    init() {
        this.setupEventListeners();
        this.loadStatistics();
        this.loadApplications();
    },

    // 이벤트 리스너 설정
    setupEventListeners() {
        // 기존 이벤트 리스너들
        this.setupBasicEventListeners();
        
        // 새로운 예산 배정 시스템 이벤트 리스너들
        this.setupBudgetConfigEventListeners();
        this.setupLessonPlanManagementEventListeners();
        this.setupBudgetStatusEventListeners();
    },

    // 기본 이벤트 리스너 설정
    setupBasicEventListeners() {
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

    // 예산 설정 이벤트 리스너 설정
    setupBudgetConfigEventListeners() {
        // 예산 설정 버튼
        Utils.on('#budgetConfigBtn', 'click', () => this.showBudgetConfigModal());
        
        // 예산 설정 모달 이벤트
        Utils.on('#budgetConfigModal', 'click', (e) => {
            if (e.target.id === 'budgetConfigModal') {
                this.hideBudgetConfigModal();
            }
        });

        // 탭 변경 이벤트
        Utils.on('.budget-config-tabs .tab-btn', 'click', (e) => {
            this.switchBudgetConfigTab(e.target.dataset.tab);
        });

        // 회당 지원금 설정 폼
        Utils.on('#supportRatesForm', 'submit', (e) => {
            e.preventDefault();
            this.handleSupportRatesSubmit();
        });
        Utils.on('#supportRatesCancelBtn', 'click', () => this.hideBudgetConfigModal());

        // 최대 상한 설정 폼
        Utils.on('#maxBudgetsForm', 'submit', (e) => {
            e.preventDefault();
            this.handleMaxBudgetsSubmit();
        });
        Utils.on('#maxBudgetsCancelBtn', 'click', () => this.hideBudgetConfigModal());
    },

    // 수업계획 관리 이벤트 리스너 설정
    setupLessonPlanManagementEventListeners() {
        // 수업계획 관리 버튼
        Utils.on('#lessonPlanManagementBtn', 'click', () => this.showLessonPlanManagementModal());
        
        // 수업계획 관리 모달 이벤트
        Utils.on('#lessonPlanManagementModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanManagementModal') {
                this.hideLessonPlanManagementModal();
            }
        });
        Utils.on('#lessonPlanManagementCloseBtn', 'click', () => this.hideLessonPlanManagementModal());

        // 수업계획 상세 모달 이벤트
        Utils.on('#lessonPlanDetailModal', 'click', (e) => {
            if (e.target.id === 'lessonPlanDetailModal') {
                this.hideLessonPlanDetailModal();
            }
        });
        Utils.on('#lessonPlanDetailCloseBtn', 'click', () => this.hideLessonPlanDetailModal());
        
        // 승인/반려 버튼 이벤트
        Utils.on('#approvePlanBtn', 'click', () => this.handleLessonPlanApproval(true));
        Utils.on('#rejectPlanBtn', 'click', () => this.showRejectionSection());
        Utils.on('#cancelRejectionBtn', 'click', () => this.hideRejectionSection());
        Utils.on('#confirmRejectionBtn', 'click', () => this.handleLessonPlanApproval(false));
    },

    // 예산 현황 이벤트 리스너 설정
    setupBudgetStatusEventListeners() {
        // 예산 현황 버튼
        Utils.on('#budgetStatusBtn', 'click', () => this.showBudgetStatusModal());
        
        // 예산 현황 모달 이벤트
        Utils.on('#budgetStatusModal', 'click', (e) => {
            if (e.target.id === 'budgetStatusModal') {
                this.hideBudgetStatusModal();
            }
        });
        Utils.on('#budgetStatusCloseBtn', 'click', () => this.hideBudgetStatusModal());
        Utils.on('#exportBudgetStatusBtn', 'click', () => this.exportBudgetStatus());
    },

    // === 예산 설정 관련 메소드들 ===

    // 예산 설정 모달 표시
    showBudgetConfigModal() {
        const modal = Utils.$('#budgetConfigModal');
        
        // 현재 설정값으로 폼 채우기
        this.loadCurrentBudgetSettings();
        
        modal.classList.add('active');
        
        // 첫 번째 탭으로 전환
        this.switchBudgetConfigTab('support-rates');
    },

    // 예산 설정 모달 숨김
    hideBudgetConfigModal() {
        const modal = Utils.$('#budgetConfigModal');
        modal.classList.remove('active');
    },

    // 예산 설정 탭 전환
    switchBudgetConfigTab(tabName) {
        // 탭 버튼 활성화
        const tabButtons = Utils.$$('.budget-config-tabs .tab-btn');
        tabButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // 탭 컨텐츠 표시
        const tabContents = Utils.$$('.tab-content');
        tabContents.forEach(content => {
            content.classList.toggle('active', content.id === tabName + 'Tab');
        });
    },

    // 현재 예산 설정값 로드
    loadCurrentBudgetSettings() {
        const supportRates = DataManager.fieldSupportRates;
        const maxBudgets = DataManager.fieldMaxBudgets;

        // 회당 지원금 설정 폼 채우기
        Object.keys(supportRates).forEach(field => {
            const input = Utils.$(`#supportRatesForm input[name="${field}"]`);
            if (input) {
                input.value = supportRates[field];
            }
        });

        // 최대 상한 설정 폼 채우기
        Object.keys(maxBudgets).forEach(field => {
            const input = Utils.$(`#maxBudgetsForm input[name="${field}"]`);
            if (input) {
                input.value = maxBudgets[field];
            }
        });
    },

    // 회당 지원금 설정 저장
    handleSupportRatesSubmit() {
        const form = Utils.$('#supportRatesForm');
        const formData = new FormData(form);
        const newRates = {};

        for (const [field, value] of formData.entries()) {
            const amount = parseInt(value);
            if (isNaN(amount) || amount < 0) {
                Utils.showAlert(`${field} 분야의 금액을 올바르게 입력해주세요.`);
                return;
            }
            newRates[field] = amount;
        }

        const submitBtn = Utils.$('#supportRatesForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                DataManager.updateFieldSupportRates(newRates);
                Utils.hideLoading(submitBtn);
                this.hideBudgetConfigModal();
                Utils.showAlert('분야별 회당 지원금이 업데이트되었습니다.');
                
                // 관련 데이터 새로고침
                this.refreshBudgetRelatedData();
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('설정 저장 중 오류가 발생했습니다.');
                console.error('Support rates update error:', error);
            }
        }, 500);
    },

    // 최대 상한 설정 저장
    handleMaxBudgetsSubmit() {
        const form = Utils.$('#maxBudgetsForm');
        const formData = new FormData(form);
        const newMaxBudgets = {};

        for (const [field, value] of formData.entries()) {
            const amount = parseInt(value);
            if (isNaN(amount) || amount < 0) {
                Utils.showAlert(`${field} 분야의 금액을 올바르게 입력해주세요.`);
                return;
            }
            newMaxBudgets[field] = amount;
        }

        const submitBtn = Utils.$('#maxBudgetsForm button[type="submit"]');
        Utils.showLoading(submitBtn);

        setTimeout(() => {
            try {
                DataManager.updateFieldMaxBudgets(newMaxBudgets);
                Utils.hideLoading(submitBtn);
                this.hideBudgetConfigModal();
                Utils.showAlert('분야별 최대 예산 상한이 업데이트되었습니다.');
                
                // 관련 데이터 새로고침
                this.refreshBudgetRelatedData();
            } catch (error) {
                Utils.hideLoading(submitBtn);
                Utils.showAlert('설정 저장 중 오류가 발생했습니다.');
                console.error('Max budgets update error:', error);
            }
        }, 500);
    },

    // === 수업계획 관리 관련 메소드들 ===

    // 수업계획 관리 모달 표시
    showLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        
        // 수업계획 목록 로드
        this.loadLessonPlansList();
        
        modal.classList.add('active');
    },

    // 수업계획 관리 모달 숨김
    hideLessonPlanManagementModal() {
        const modal = Utils.$('#lessonPlanManagementModal');
        modal.classList.remove('active');
    },

    // 수업계획 목록 로드
    loadLessonPlansList() {
        const lessonPlans = DataManager.getAllLessonPlans();
        const students = DataManager.students;
        
        let pendingCount = 0;
        let approvedCount = 0;
        let rejectedCount = 0;

        // 통계 계산
        lessonPlans.forEach(plan => {
            switch(plan.approvalStatus) {
                case 'approved': approvedCount++; break;
                case 'rejected': rejectedCount++; break;
                default: pendingCount++; break;
            }
        });

        // 통계 업데이트
        Utils.$('#pendingPlansCount').textContent = pendingCount;
        Utils.$('#approvedPlansCount').textContent = approvedCount;
        Utils.$('#rejectedPlansCount').textContent = rejectedCount;

        // 수업계획 목록 렌더링
        const container = Utils.$('#lessonPlansList');
        
        if (lessonPlans.length === 0) {
            container.innerHTML = `
                <div class="no-lesson-plans">
                    <i data-lucide="calendar"></i>
                    <p>제출된 수업계획이 없습니다.</p>
                </div>
            `;
            return;
        }

        container.innerHTML = lessonPlans.map(plan => this.createLessonPlanListItem(plan)).join('');

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }

        // 클릭 이벤트 추가
        container.querySelectorAll('.lesson-plan-item').forEach(item => {
            item.addEventListener('click', () => {
                const studentId = parseInt(item.dataset.studentId);
                this.showLessonPlanDetailModal(studentId);
            });
        });
    },

    // 수업계획 목록 아이템 생성
    createLessonPlanListItem(plan) {
        const student = DataManager.students.find(s => s.id === plan.studentId);
        const supportRate = DataManager.fieldSupportRates[student.specialization] || 0;
        const maxBudget = DataManager.fieldMaxBudgets[student.specialization] || 0;
        const estimatedBudget = Math.min(supportRate * plan.totalLessons, maxBudget);

        let statusClass, statusText, statusIcon;
        switch(plan.approvalStatus) {
            case 'approved':
                statusClass = 'approved';
                statusText = '승인됨';
                statusIcon = 'check-circle';
                break;
            case 'rejected':
                statusClass = 'rejected';
                statusText = '반려됨';
                statusIcon = 'x-circle';
                break;
            default:
                statusClass = 'pending';
                statusText = '승인 대기';
                statusIcon = 'clock';
                break;
        }

        return `
            <div class="lesson-plan-item ${statusClass}" data-student-id="${plan.studentId}">
                <div class="plan-item-header">
                    <div class="student-info">
                        <h4>${this.escapeHtml(plan.studentName)}</h4>
                        <p class="institute-field">${student.instituteName} • ${student.specialization}</p>
                    </div>
                    <div class="plan-status">
                        <span class="status-badge ${statusClass}">
                            <i data-lucide="${statusIcon}"></i>
                            ${statusText}
                        </span>
                    </div>
                </div>
                <div class="plan-item-details">
                    <div class="detail-row">
                        <span>파견 기간:</span>
                        <span>${plan.startDate} ~ ${plan.endDate}</span>
                    </div>
                    <div class="detail-row">
                        <span>총 수업 횟수:</span>
                        <span>${plan.totalLessons}회</span>
                    </div>
                    <div class="detail-row">
                        <span>예상 배정 예산:</span>
                        <span class="budget-amount">${Utils.formatPrice(estimatedBudget)}</span>
                    </div>
                    <div class="detail-row">
                        <span>제출일:</span>
                        <span>${Utils.formatDate(plan.submittedAt)}</span>
                    </div>
                </div>
                ${plan.rejectionReason ? `
                    <div class="rejection-reason">
                        <strong>반려 사유:</strong> ${this.escapeHtml(plan.rejectionReason)}
                    </div>
                ` : ''}
            </div>
        `;
    },

    // 수업계획 상세 모달 표시
    showLessonPlanDetailModal(studentId) {
        const plan = DataManager.getStudentLessonPlan(studentId);
        const student = DataManager.students.find(s => s.id === studentId);
        
        if (!plan || !student) {
            Utils.showAlert('수업계획을 찾을 수 없습니다.');
            return;
        }

        this.currentLessonPlanDetail = { studentId, plan, student };

        const supportRate = DataManager.fieldSupportRates[student.specialization] || 0;
        const maxBudget = DataManager.fieldMaxBudgets[student.specialization] || 0;
        const estimatedBudget = Math.min(supportRate * plan.totalLessons, maxBudget);

        // 모달 내용 채우기
        Utils.$('#lessonPlanDetailTitle').textContent = `${student.name}님의 수업계획`;
        Utils.$('#detailStudentName').textContent = student.name;
        Utils.$('#detailInstitute').textContent = student.instituteName;
        Utils.$('#detailSpecialization').textContent = student.specialization;
        Utils.$('#detailSupportRate').textContent = Utils.formatPrice(supportRate) + '/회';
        Utils.$('#detailPeriod').textContent = `${plan.startDate} ~ ${plan.endDate}`;
        Utils.$('#detailTotalLessons').textContent = plan.totalLessons + '회';
        Utils.$('#detailEstimatedBudget').textContent = Utils.formatPrice(estimatedBudget);
        Utils.$('#detailMaxBudget').textContent = Utils.formatPrice(maxBudget);
        Utils.$('#detailGoals').textContent = plan.overallGoals || '-';
        Utils.$('#detailNotes').textContent = plan.specialNotes || '-';

        // 승인/반려 버튼 상태 설정
        const approveBtn = Utils.$('#approvePlanBtn');
        const rejectBtn = Utils.$('#rejectPlanBtn');
        
        if (plan.approvalStatus === 'pending') {
            approveBtn.style.display = 'inline-flex';
            rejectBtn.style.display = 'inline-flex';
        } else {
            approveBtn.style.display = 'none';
            rejectBtn.style.display = 'none';
        }

        // 반려 섹션 숨김
        this.hideRejectionSection();

        const modal = Utils.$('#lessonPlanDetailModal');
        modal.classList.add('active');
    },

    // 수업계획 상세 모달 숨김
    hideLessonPlanDetailModal() {
        const modal = Utils.$('#lessonPlanDetailModal');
        modal.classList.remove('active');
        this.currentLessonPlanDetail = null;
    },

    // 반려 사유 입력 섹션 표시
    showRejectionSection() {
        Utils.$('#rejectionReasonSection').style.display = 'block';
        Utils.$('#rejectionReasonText').focus();
    },

    // 반려 사유 입력 섹션 숨김
    hideRejectionSection() {
        Utils.$('#rejectionReasonSection').style.display = 'none';
        Utils.$('#rejectionReasonText').value = '';
    },

    // 수업계획 승인/반려 처리
    handleLessonPlanApproval(isApproval) {
        if (!this.currentLessonPlanDetail) return;

        const { studentId, student } = this.currentLessonPlanDetail;

        if (isApproval) {
            if (!Utils.showConfirm(`${student.name}님의 수업계획을 승인하시겠습니까?\n승인 시 자동으로 예산이 배정됩니다.`)) {
                return;
            }

            const result = DataManager.approveLessonPlan(studentId);
            if (result) {
                const allocatedBudget = DataManager.calculateStudentBudget(studentId);
                Utils.showAlert(`수업계획이 승인되었습니다.\n배정 예산: ${Utils.formatPrice(allocatedBudget)}`);
                this.hideLessonPlanDetailModal();
                this.loadLessonPlansList();
                this.refreshBudgetRelatedData();
            } else {
                Utils.showAlert('승인 처리 중 오류가 발생했습니다.');
            }
        } else {
            const rejectionReason = Utils.$('#rejectionReasonText').value.trim();
            if (!rejectionReason) {
                Utils.showAlert('반려 사유를 입력해주세요.');
                return;
            }

            if (!Utils.showConfirm(`${student.name}님의 수업계획을 반려하시겠습니까?`)) {
                return;
            }

            const result = DataManager.rejectLessonPlan(studentId, rejectionReason);
            if (result) {
                Utils.showAlert('수업계획이 반려되었습니다.');
                this.hideLessonPlanDetailModal();
                this.loadLessonPlansList();
                this.refreshBudgetRelatedData();
            } else {
                Utils.showAlert('반려 처리 중 오류가 발생했습니다.');
            }
        }
    },

    // === 예산 현황 관련 메소드들 ===

    // 예산 현황 모달 표시
    showBudgetStatusModal() {
        const modal = Utils.$('#budgetStatusModal');
        
        // 예산 현황 데이터 로드
        this.loadBudgetStatusData();
        
        modal.classList.add('active');
    },

    // 예산 현황 모달 숨김
    hideBudgetStatusModal() {
        const modal = Utils.$('#budgetStatusModal');
        modal.classList.remove('active');
    },

    // 예산 현황 데이터 로드
    loadBudgetStatusData() {
        const budgetStatus = DataManager.getBudgetAllocationStatus();

        // 전체 현황 표시
        Utils.$('#totalAllocatedBudget').textContent = Utils.formatPrice(budgetStatus.totalAllocated);
        Utils.$('#approvedStudentsCount').textContent = budgetStatus.students.filter(s => s.hasApprovedPlan).length + '명';

        // 분야별 현황 차트
        this.renderFieldBudgetChart(budgetStatus.byField);

        // 학생별 현황 테이블
        this.renderStudentBudgetTable(budgetStatus.students);
    },

    // 분야별 예산 차트 렌더링
    renderFieldBudgetChart(byFieldData) {
        const container = Utils.$('#fieldBudgetChart');
        
        if (Object.keys(byFieldData).length === 0) {
            container.innerHTML = '<p class="no-data">배정된 예산이 없습니다.</p>';
            return;
        }

        container.innerHTML = Object.keys(byFieldData).map(field => {
            const data = byFieldData[field];
            const supportRate = DataManager.fieldSupportRates[field] || 0;
            const maxBudget = DataManager.fieldMaxBudgets[field] || 0;
            
            return `
                <div class="field-budget-item">
                    <div class="field-info">
                        <h5>${field}</h5>
                        <div class="field-details">
                            <span>회당 지원금: ${Utils.formatPrice(supportRate)}</span>
                            <span>최대 상한: ${Utils.formatPrice(maxBudget)}</span>
                        </div>
                    </div>
                    <div class="budget-stats">
                        <div class="stat">
                            <span class="label">배정 총액</span>
                            <span class="value">${Utils.formatPrice(data.totalAllocated)}</span>
                        </div>
                        <div class="stat">
                            <span class="label">학생 수</span>
                            <span class="value">${data.studentCount}명</span>
                        </div>
                        <div class="stat">
                            <span class="label">평균 배정</span>
                            <span class="value">${Utils.formatPrice(data.averageAllocation)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    },

    // 학생별 예산 테이블 렌더링
    renderStudentBudgetTable(students) {
        const container = Utils.$('#studentBudgetTable');
        
        if (students.length === 0) {
            container.innerHTML = '<p class="no-data">학생 데이터가 없습니다.</p>';
            return;
        }

        const tableHTML = `
            <table class="budget-table">
                <thead>
                    <tr>
                        <th>학생명</th>
                        <th>전공분야</th>
                        <th>수업계획</th>
                        <th>배정 예산</th>
                        <th>사용 예산</th>
                        <th>잔여 예산</th>
                        <th>사용률</th>
                    </tr>
                </thead>
                <tbody>
                    ${students.map(student => {
                        const usageRate = student.allocatedBudget > 0 ? 
                            Math.round((student.usedBudget / student.allocatedBudget) * 100) : 0;
                        const statusText = student.hasApprovedPlan ? '승인됨' : '미승인';
                        const statusClass = student.hasApprovedPlan ? 'approved' : 'pending';
                        
                        return `
                            <tr>
                                <td>${this.escapeHtml(student.name)}</td>
                                <td>${this.escapeHtml(student.specialization)}</td>
                                <td><span class="status-badge ${statusClass}">${statusText}</span></td>
                                <td>${Utils.formatPrice(student.allocatedBudget)}</td>
                                <td>${Utils.formatPrice(student.usedBudget)}</td>
                                <td>${Utils.formatPrice(student.availableBudget)}</td>
                                <td>
                                    <div class="usage-rate">
                                        <span>${usageRate}%</span>
                                        <div class="usage-bar">
                                            <div class="usage-fill" style="width: ${usageRate}%"></div>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        container.innerHTML = tableHTML;
    },

    // 예산 현황 내보내기
    exportBudgetStatus() {
        const budgetStatus = DataManager.getBudgetAllocationStatus();
        
        // CSV 데이터 준비
        const csvData = budgetStatus.students.map(student => ({
            '학생명': student.name,
            '전공분야': student.specialization,
            '수업계획승인여부': student.hasApprovedPlan ? '승인됨' : '미승인',
            '배정예산': student.allocatedBudget,
            '사용예산': student.usedBudget,
            '잔여예산': student.availableBudget,
            '사용률': student.allocatedBudget > 0 ? 
                Math.round((student.usedBudget / student.allocatedBudget) * 100) + '%' : '0%'
        }));

        const filename = `budget_status_${this.getDateString()}.csv`;
        Utils.downloadCSV(csvData, filename);
        Utils.showAlert('예산 현황이 내보내기되었습니다.');
    },

    // === 기존 메소드들 (영수증 관련) ===

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

    // === 기존 메소드들 (수업계획 설정) ===

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

    // === 키보드 단축키 설정 ===
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

            // Ctrl/Cmd + B: 예산 설정 모달 (새로 추가)
            if ((event.ctrlKey || event.metaKey) && event.key === 'b') {
                event.preventDefault();
                this.showBudgetConfigModal();
            }

            // Ctrl/Cmd + L: 수업계획 관리 모달 (새로 추가)
            if ((event.ctrlKey || event.metaKey) && event.key === 'l') {
                event.preventDefault();
                this.showLessonPlanManagementModal();
            }
        });
    },

    // === 기존 메소드들 ===

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
        
        // 수업계획 상태 및 예산 정보 표시
        let budgetInfo = '';
        let lessonPlanStatus = '';
        
        if (lessonPlan) {
            const statusText = lessonPlan.status === 'completed' ? '완료' : '임시저장';
            const statusClass = lessonPlan.status === 'completed' ? 'completed' : 'draft';
            
            let approvalStatus = '';
            if (lessonPlan.approvalStatus === 'approved') {
                approvalStatus = ' • 승인됨';
                const allocatedBudget = student.allocatedBudget || 0;
                const usedBudget = DataManager.getUsedBudget(application.studentId);
                budgetInfo = `
                    <div class="budget-info">
                        <span>배정예산: ${Utils.formatPrice(allocatedBudget)}</span>
                        <span>사용예산: ${Utils.formatPrice(usedBudget)}</span>
                        <span>잔여예산: ${Utils.formatPrice(allocatedBudget - usedBudget)}</span>
                    </div>
                `;
            } else if (lessonPlan.approvalStatus === 'rejected') {
                approvalStatus = ' • 반려됨';
            } else {
                approvalStatus = ' • 승인 대기';
            }
            
            lessonPlanStatus = `<span class="lesson-plan-status ${statusClass}">수업계획: ${statusText}${approvalStatus}</span>`;
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
        const student = DataManager.students.find(s => s.id === studentId);
        const lessonPlan = DataManager.getStudentLessonPlan(studentId);
        
        if (!lessonPlan || lessonPlan.approvalStatus !== 'approved') {
            Utils.showAlert('수업계획이 승인되지 않아 교구 신청을 승인할 수 없습니다.');
            return;
        }

        const application = DataManager.applications.find(app => app.studentId === studentId);
        const item = application.items.find(item => item.id === itemId);
        const availableBudget = DataManager.getAvailableBudget(studentId);

        if (item.price > availableBudget) {
            Utils.showAlert(`예산이 부족합니다.\n신청 금액: ${Utils.formatPrice(item.price)}\n사용 가능 예산: ${Utils.formatPrice(availableBudget)}`);
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

    // 예산 관련 데이터 새로고침
    refreshBudgetRelatedData() {
        this.loadStatistics();
        this.loadApplications();
        
        // 필요 시 예산 현황 모달도 새로고침
        if (Utils.$('#budgetStatusModal').classList.contains('active')) {
            this.loadBudgetStatusData();
        }
        
        // 필요 시 수업계획 관리 모달도 새로고침
        if (Utils.$('#lessonPlanManagementModal').classList.contains('active')) {
            this.loadLessonPlansList();
        }
    },

    // 데이터 새로고침
    refreshData() {
        this.refreshBudgetRelatedData();
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
        const budgetStatus = DataManager.getBudgetAllocationStatus();
        
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
        
        const approvedStudents = budgetStatus.students.filter(s => s.hasApprovedPlan).length;
        
        const message = `상세 통계\\n\\n` +
                       `=== 교구 신청 현황 ===\\n` +
                       `전체 신청: ${stats.total}건\\n` +
                       `- 온라인 구매: ${onlineCount}건\\n` +
                       `- 오프라인 구매: ${offlineCount}건\\n\\n` +
                       `승인: ${stats.approved}건\\n` +
                       `반려: ${stats.rejected}건\\n` +
                       `구매완료: ${stats.purchased}건\\n\\n` +
                       `=== 예산 배정 현황 ===\\n` +
                       `수업계획 승인 학생: ${approvedStudents}명\\n` +
                       `총 배정 예산: ${Utils.formatPrice(budgetStatus.totalAllocated)}\\n\\n` +
                       `=== 오프라인 구매 현황 ===\\n` +
                       `승인된 오프라인 구매: ${offlineStats.approvedOffline}건\\n` +
                       `영수증 제출 완료: ${offlineStats.withReceipt}건\\n` +
                       `영수증 제출 대기: ${offlineStats.pendingReceipt}건\\n\\n` +
                       `=== 금액 현황 ===\\n` +
                       `전체 신청 금액: ${Utils.formatPrice(totalAmount)}\\n` +
                       `승인 금액: ${Utils.formatPrice(approvedAmount)}\\n` +
                       `구매 완료 금액: ${Utils.formatPrice(purchasedAmount)}`;
        
        alert(message);
    }
};