// 예산 관리 전용 모듈 (admin-budget.js)
// 🔧 v4.3.1 - 하드코딩 제거, 100% DB 기반 예산 설정 시스템
AdminManager.Budget = {
    // 초기화
    init() {
        console.log('💰 예산 관리 모듈 초기화 (v4.3.1 DB 전용)');
        this.setupEventListeners();
        this.loadBudgetOverview();
    },

    // 🛠️ 이벤트 리스너 설정 (모달 관련 제거)
    setupEventListeners() {
        // 예산 설정 버튼 (모달 호출만)
        Utils.on('#budgetSettingsBtn', 'click', () => this.showBudgetSettingsModal());

        // 🛠️ 모달 내부 이벤트는 모달 생성 시점에 설정됨 (admin-modals.js에서 처리)
        // 기존의 모달 이벤트 리스너 설정 코드 제거
    },

    // 예산 현황 로드
    async loadBudgetOverview() {
        try {
            console.log('📊 예산 현황 로드 중...');
            const budgetStats = await SupabaseAPI.getBudgetOverviewStats();
            
            const totalApprovedBudgetEl = Utils.$('#totalApprovedBudget');
            const approvedItemsTotalEl = Utils.$('#approvedItemsTotal');
            const purchasedTotalEl = Utils.$('#purchasedTotal');
            const averagePerPersonEl = Utils.$('#averagePerPerson');
            
            if (totalApprovedBudgetEl) totalApprovedBudgetEl.textContent = Utils.formatPrice(budgetStats.totalApprovedBudget);
            if (approvedItemsTotalEl) approvedItemsTotalEl.textContent = Utils.formatPrice(budgetStats.approvedItemsTotal);
            if (purchasedTotalEl) purchasedTotalEl.textContent = Utils.formatPrice(budgetStats.purchasedTotal);
            if (averagePerPersonEl) averagePerPersonEl.textContent = Utils.formatPrice(budgetStats.averagePerPerson);
            
            console.log('✅ 예산 현황 로드 완료');
        } catch (error) {
            console.error('❌ 예산 현황 로드 실패:', error);
        }
    },

    // 예산 설정 모달 표시
    async showBudgetSettingsModal() {
        console.log('💰 예산 설정 모달 표시 요청 (v4.3.1 DB 전용)');
        
        try {
            // 모달이 없으면 생성
            AdminManager.Modals.createBudgetSettingsModal();
            
            const modal = Utils.$('#budgetSettingsModal');
            if (!modal) {
                throw new Error('예산 설정 모달을 생성할 수 없습니다.');
            }

            // 현재 설정값으로 폼 채우기 (DB 데이터만 사용)
            const settings = await SupabaseAPI.getAllFieldBudgetSettings();
            this.populateBudgetSettingsForm(settings);
            
            modal.classList.add('active');
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ 예산 설정 모달 표시 완료 (DB 데이터:', Object.keys(settings).length, '개 분야)');
            
        } catch (error) {
            console.error('❌ 예산 설정 모달 표시 실패:', error);
            Utils.showToast('예산 설정 모달을 열 수 없습니다.', 'error');
        }
    },

    // 예산 설정 모달 숨김
    hideBudgetSettingsModal() {
        const modal = Utils.$('#budgetSettingsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    // 🛠️ 예산 설정 저장 (폼 제출 핸들러)
    async handleBudgetSettingsSubmit() {
        console.log('💰 예산 설정 저장 시작 (v4.3.1 DB 전용)');
        
        const form = Utils.$('#budgetSettingsForm');
        if (!form) {
            console.error('❌ 예산 설정 폼을 찾을 수 없습니다');
            Utils.showToast('폼을 찾을 수 없습니다.', 'error');
            return;
        }

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
            // 예산 재계산 확인 메시지
            const shouldRecalculate = Utils.showConfirm(
                '예산 설정을 업데이트하시겠습니까?\n\n✅ 기존에 승인받은 학생들의 예산도 새로운 설정에 맞춰 자동으로 재계산됩니다.\n⚠️ 이미 사용한 예산이 새 배정 예산을 초과하는 경우 적절히 조정됩니다.'
            );
            
            if (!shouldRecalculate) {
                Utils.hideLoading(submitBtn);
                return;
            }
            
            let successCount = 0;
            let recalculationResults = [];
            
            for (const [field, settings] of Object.entries(updates)) {
                const result = await SupabaseAPI.updateFieldBudgetSettings(field, settings);
                if (result.success) {
                    successCount++;
                    
                    // 재계산 결과 수집
                    if (result.data && result.data.recalculation) {
                        recalculationResults.push({
                            field: field,
                            updated: result.data.recalculation.updated,
                            total: result.data.recalculation.total
                        });
                    }
                }
            }
            
            Utils.hideLoading(submitBtn);
            this.hideBudgetSettingsModal();
            
            if (successCount > 0) {
                let message = `${successCount}개 분야의 예산 설정이 저장되었습니다.`;
                
                // 재계산 결과 메시지 추가
                if (recalculationResults.length > 0) {
                    const totalRecalculated = recalculationResults.reduce((sum, result) => sum + result.updated, 0);
                    message += `\n\n📊 ${totalRecalculated}명의 학생 예산이 자동으로 재계산되었습니다:`;
                    recalculationResults.forEach(result => {
                        message += `\n• ${result.field}: ${result.updated}/${result.total}명`;
                    });
                }
                
                Utils.showToast(message, 'success');
                await this.loadBudgetOverview();
                
                // 다른 모듈에 알림
                AdminManager.emit('budget-updated', { type: 'settings', results: recalculationResults });
            } else {
                Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
            }
            
        } catch (error) {
            Utils.hideLoading(submitBtn);
            Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
            console.error('Budget settings error:', error);
        }
    },

    // 분야별 예산 현황 보기
    async showFieldBudgetStatus(field) {
        try {
            const statusResult = await SupabaseAPI.getFieldBudgetStatus(field);
            
            if (!statusResult.success || !statusResult.data) {
                Utils.showToast('예산 현황을 불러올 수 없습니다.', 'error');
                return;
            }
            
            const { students, statistics } = statusResult.data;
            
            if (!students || students.length === 0) {
                Utils.showToast(`${field} 분야에 승인받은 학생이 없습니다.`, 'info');
                return;
            }
            
            this.createFieldBudgetStatusModal(field, students, statistics);
            
        } catch (error) {
            console.error('Field budget status error:', error);
            Utils.showToast('예산 현황 조회 중 오류가 발생했습니다.', 'error');
        }
    },

    // 예산 배정 정보 표시 (수업계획 상세보기에서 사용)
    async displayBudgetAllocationInfo(field, totalLessons) {
        try {
            // 분야별 예산 설정 가져오기 (DB 전용)
            const budgetSettings = await SupabaseAPI.getAllFieldBudgetSettings();
            const fieldSetting = budgetSettings[field] || { perLessonAmount: 0, maxBudget: 0 };

            // 예산 계산
            const perLessonAmount = fieldSetting.perLessonAmount || 0;
            const maxBudget = fieldSetting.maxBudget || 0;
            const calculatedBudget = perLessonAmount * totalLessons;
            const finalBudget = maxBudget > 0 ? Math.min(calculatedBudget, maxBudget) : calculatedBudget;

            // 화면에 표시
            const detailField = Utils.$('#detailField');
            const detailPerLessonAmount = Utils.$('#detailPerLessonAmount');
            const detailLessonCount = Utils.$('#detailLessonCount');
            const detailTotalBudget = Utils.$('#detailTotalBudget');

            if (detailField) detailField.textContent = field || '미설정';
            if (detailPerLessonAmount) detailPerLessonAmount.textContent = Utils.formatPrice(perLessonAmount);
            if (detailLessonCount) detailLessonCount.textContent = `${totalLessons}회`;
            if (detailTotalBudget) detailTotalBudget.textContent = Utils.formatPrice(finalBudget);

            // 상한선 적용 여부 표시
            const calculationNote = Utils.$('#viewLessonPlanModal .budget-calculation-note small');
            if (calculationNote) {
                if (maxBudget > 0 && calculatedBudget > maxBudget) {
                    calculationNote.innerHTML = `
                        <i data-lucide="info"></i> 
                        계산된 예산: ${Utils.formatPrice(calculatedBudget)} → 
                        최대 상한 적용: ${Utils.formatPrice(finalBudget)}
                    `;
                } else {
                    calculationNote.innerHTML = `
                        <i data-lucide="info"></i> 
                        총 예산 = ${Utils.formatPrice(perLessonAmount)} × ${totalLessons}회 = ${Utils.formatPrice(finalBudget)}
                    `;
                }
            }

        } catch (error) {
            console.error('❌ Error displaying budget allocation info:', error);
            // 오류 시 기본값 표시
            const detailField = Utils.$('#detailField');
            const detailPerLessonAmount = Utils.$('#detailPerLessonAmount');
            const detailLessonCount = Utils.$('#detailLessonCount');
            const detailTotalBudget = Utils.$('#detailTotalBudget');

            if (detailField) detailField.textContent = field || '미설정';
            if (detailPerLessonAmount) detailPerLessonAmount.textContent = '설정 없음';
            if (detailLessonCount) detailLessonCount.textContent = `${totalLessons}회`;
            if (detailTotalBudget) detailTotalBudget.textContent = '설정 필요';
        }
    },

    // 분야별 예산 현황 모달 생성
    createFieldBudgetStatusModal(field, students, statistics) {
        // 기존 모달 제거
        const existingModal = document.querySelector('.budget-status-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'modal budget-status-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${field} 분야 예산 현황</h3>
                    <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="budget-statistics">
                        <div class="stat-card">
                            <h4>총 학생 수</h4>
                            <span class="stat-value">${statistics.totalStudents}명</span>
                        </div>
                        <div class="stat-card">
                            <h4>총 배정 예산</h4>
                            <span class="stat-value">${Utils.formatPrice(statistics.totalAllocated)}</span>
                        </div>
                        <div class="stat-card">
                            <h4>총 사용 예산</h4>
                            <span class="stat-value">${Utils.formatPrice(statistics.totalUsed)}</span>
                        </div>
                        <div class="stat-card">
                            <h4>예산 사용률</h4>
                            <span class="stat-value">${statistics.utilizationRate}%</span>
                        </div>
                    </div>
                    
                    <div class="student-budget-list">
                        <h4>학생별 예산 현황</h4>
                        <table class="budget-table">
                            <thead>
                                <tr>
                                    <th>학생명</th>
                                    <th>세종학당</th>
                                    <th>배정 예산</th>
                                    <th>사용 예산</th>
                                    <th>잔여 예산</th>
                                    <th>사용률</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${students.map(student => {
                                    const usageRate = student.allocated_budget > 0 ? 
                                        Math.round((student.used_budget / student.allocated_budget) * 100) : 0;
                                    const remaining = student.allocated_budget - student.used_budget;
                                    
                                    return `
                                        <tr>
                                            <td>${AdminManager.Utils.escapeHtml(student.user_profiles.name)}</td>
                                            <td>${AdminManager.Utils.escapeHtml(student.user_profiles.sejong_institute)}</td>
                                            <td>${Utils.formatPrice(student.allocated_budget)}</td>
                                            <td>${Utils.formatPrice(student.used_budget)}</td>
                                            <td class="${remaining < 0 ? 'over-budget' : ''}">${Utils.formatPrice(remaining)}</td>
                                            <td class="usage-rate">${usageRate}%</td>
                                        </tr>
                                    `;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        modal.classList.add('active');
    },

    // 🔧 v4.3.1 예산 설정 폼 채우기 - 100% DB 기반으로 변경
    populateBudgetSettingsForm(settings) {
        const tbody = document.querySelector('#budgetSettingsTable tbody');
        if (!tbody) {
            console.error('❌ 예산 설정 테이블을 찾을 수 없습니다');
            return;
        }
        
        tbody.innerHTML = '';
        
        console.log('🔧 v4.3.1 예산 설정 폼 채우기 - DB 전용:', settings);
        
        // ❌ 하드코딩된 defaultFields 완전 제거
        // ✅ 오직 DB에서 조회한 settings만 사용
        
        if (!settings || Object.keys(settings).length === 0) {
            // DB에 설정이 없으면 안내 메시지와 새 분야 추가 옵션 제공
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 2rem;">
                        <div class="empty-settings-notice">
                            <i data-lucide="info" style="color: #3182ce; margin-bottom: 1rem;"></i>
                            <h4 style="margin: 0.5rem 0; color: #2d3748;">예산 설정이 없습니다</h4>
                            <p style="color: #718096; margin: 0.5rem 0;">
                                분야별 예산 설정을 추가하려면 새 분야 추가 버튼을 사용하세요.
                            </p>
                            <button class="btn primary" onclick="AdminManager.Budget.showAddNewFieldDialog()" style="margin-top: 1rem;">
                                <i data-lucide="plus"></i>
                                새 분야 추가
                            </button>
                        </div>
                    </td>
                </tr>
            `;
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('📋 예산 설정이 비어있음 - 새 분야 추가 안내 표시');
            return;
        }
        
        // DB에서 조회한 분야들만 표시
        Object.entries(settings).forEach(([field, setting]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <span>${field}</span>
                        <button class="btn small secondary field-status-btn" 
                                data-field="${field}" 
                                title="분야별 예산 현황 보기">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="btn small danger delete-field-btn" 
                                data-field="${field}" 
                                title="분야 삭제"
                                onclick="AdminManager.Budget.confirmDeleteField('${field}')">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="perLessonAmount" 
                           value="${setting.perLessonAmount || 0}" 
                           min="0" step="1000" class="amount-input"
                           placeholder="수업당 금액">
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="maxBudget" 
                           value="${setting.maxBudget || 0}" 
                           min="0" step="10000" class="amount-input"
                           placeholder="최대 예산 상한">
                </td>
            `;
            tbody.appendChild(row);
        });

        // 새 분야 추가 행
        const addRow = document.createElement('tr');
        addRow.innerHTML = `
            <td colspan="3" style="text-align: center; padding: 1rem;">
                <button class="btn secondary" onclick="AdminManager.Budget.showAddNewFieldDialog()">
                    <i data-lucide="plus"></i>
                    새 분야 추가
                </button>
            </td>
        `;
        tbody.appendChild(addRow);

        // 분야별 예산 현황 보기 버튼 이벤트 리스너 추가
        const fieldStatusButtons = document.querySelectorAll('.field-status-btn');
        fieldStatusButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const field = e.target.closest('button').dataset.field;
                this.showFieldBudgetStatus(field);
            });
        });

        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        console.log('✅ v4.3.1 예산 설정 폼 채우기 완료 - DB 전용 (', Object.keys(settings).length, '개 분야)');
    },

    // 🆕 새 분야 추가 대화상자
    showAddNewFieldDialog() {
        const fieldName = prompt('새로 추가할 분야명을 입력하세요:', '');
        
        if (!fieldName || !fieldName.trim()) {
            return;
        }
        
        const cleanFieldName = fieldName.trim();
        
        // 기존 분야인지 확인
        const tbody = document.querySelector('#budgetSettingsTable tbody');
        const existingFields = Array.from(tbody.querySelectorAll('input[data-field]'))
            .map(input => input.dataset.field);
        
        if (existingFields.includes(cleanFieldName)) {
            Utils.showToast('이미 존재하는 분야입니다.', 'warning');
            return;
        }
        
        // 새 분야 행 추가
        const newRow = document.createElement('tr');
        newRow.innerHTML = `
            <td>
                <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span>${cleanFieldName}</span>
                    <button class="btn small secondary field-status-btn" 
                            data-field="${cleanFieldName}" 
                            title="분야별 예산 현황 보기">
                        <i data-lucide="eye"></i>
                    </button>
                    <button class="btn small danger delete-field-btn" 
                            data-field="${cleanFieldName}" 
                            title="분야 삭제"
                            onclick="AdminManager.Budget.confirmDeleteField('${cleanFieldName}')">
                        <i data-lucide="trash-2"></i>
                    </button>
                </div>
            </td>
            <td>
                <input type="number" 
                       data-field="${cleanFieldName}" 
                       data-type="perLessonAmount" 
                       value="0" 
                       min="0" step="1000" class="amount-input"
                       placeholder="수업당 금액">
            </td>
            <td>
                <input type="number" 
                       data-field="${cleanFieldName}" 
                       data-type="maxBudget" 
                       value="0" 
                       min="0" step="10000" class="amount-input"
                       placeholder="최대 예산 상한">
            </td>
        `;
        
        // 마지막 행(새 분야 추가 버튼) 앞에 삽입
        const addButtonRow = tbody.querySelector('tr:last-child');
        tbody.insertBefore(newRow, addButtonRow);
        
        // 이벤트 리스너 추가
        const statusButton = newRow.querySelector('.field-status-btn');
        statusButton.addEventListener('click', (e) => {
            e.preventDefault();
            this.showFieldBudgetStatus(cleanFieldName);
        });
        
        // 아이콘 재생성
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
        
        Utils.showToast(`"${cleanFieldName}" 분야가 추가되었습니다. 설정을 저장해주세요.`, 'success');
    },

    // 🆕 분야 삭제 확인
    confirmDeleteField(field) {
        const shouldDelete = confirm(`"${field}" 분야를 삭제하시겠습니까?\n\n⚠️ 이 분야의 모든 예산 설정이 삭제됩니다.`);
        
        if (shouldDelete) {
            this.deleteField(field);
        }
    },

    // 🆕 분야 삭제 처리
    async deleteField(field) {
        try {
            // UI에서 해당 행 제거
            const tbody = document.querySelector('#budgetSettingsTable tbody');
            const rows = tbody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const fieldInput = row.querySelector(`input[data-field="${field}"]`);
                if (fieldInput) {
                    row.remove();
                }
            });
            
            Utils.showToast(`"${field}" 분야가 삭제되었습니다. 설정을 저장해주세요.`, 'success');
            
        } catch (error) {
            console.error('❌ 분야 삭제 처리 오류:', error);
            Utils.showToast('분야 삭제 중 오류가 발생했습니다.', 'error');
        }
    },

    // 새로고침 함수
    async refresh() {
        console.log('🔄 Budget 모듈 새로고침 (v4.3.1 DB 전용)');
        await this.loadBudgetOverview();
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminBudget = AdminManager.Budget;

console.log('💰 AdminManager.Budget v4.3.1 모듈 로드 완료 - 하드코딩 제거, 100% DB 기반 예산 설정');
