// 예산 관리 전용 모듈 (admin-budget.js)
AdminManager.Budget = {
    // 초기화
    init() {
        console.log('💰 예산 관리 모듈 초기화');
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
        console.log('💰 예산 설정 모달 표시 요청');
        
        try {
            // 모달이 없으면 생성
            AdminManager.Modals.createBudgetSettingsModal();
            
            const modal = Utils.$('#budgetSettingsModal');
            if (!modal) {
                throw new Error('예산 설정 모달을 생성할 수 없습니다.');
            }

            // 현재 설정값으로 폼 채우기
            const settings = await SupabaseAPI.getAllFieldBudgetSettings();
            this.populateBudgetSettingsForm(settings);
            
            modal.classList.add('active');
            
            // 아이콘 재생성
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
            
            console.log('✅ 예산 설정 모달 표시 완료');
            
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
        console.log('💰 예산 설정 저장 시작');
        
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
            // 분야별 예산 설정 가져오기
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
            if (detailPerLessonAmount) detailPerLessonAmount.textContent = '0원';
            if (detailLessonCount) detailLessonCount.textContent = `${totalLessons}회`;
            if (detailTotalBudget) detailTotalBudget.textContent = '계산 중...';
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

    // 예산 설정 폼 채우기
    populateBudgetSettingsForm(settings) {
        const tbody = document.querySelector('#budgetSettingsTable tbody');
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        // 기본 분야들
        const defaultFields = {
            '한국어교육': { perLessonAmount: 15000, maxBudget: 400000 },
            '전통문화예술': { perLessonAmount: 25000, maxBudget: 600000 },
            'K-Pop 문화': { perLessonAmount: 10000, maxBudget: 300000 },
            '한국현대문화': { perLessonAmount: 18000, maxBudget: 450000 },
            '전통음악': { perLessonAmount: 30000, maxBudget: 750000 },
            '한국미술': { perLessonAmount: 22000, maxBudget: 550000 },
            '한국요리문화': { perLessonAmount: 35000, maxBudget: 800000 }
        };
        
        // settings와 기본값 병합
        const finalSettings = { ...defaultFields, ...settings };
        
        Object.entries(finalSettings).forEach(([field, setting]) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    ${field}
                    <button class="btn small secondary field-status-btn" 
                            data-field="${field}" 
                            title="분야별 예산 현황 보기"
                            style="margin-left: 8px;">
                        <i data-lucide="eye"></i>
                    </button>
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="perLessonAmount" 
                           value="${setting.perLessonAmount || 0}" 
                           min="0" step="1000" class="amount-input">
                </td>
                <td>
                    <input type="number" 
                           data-field="${field}" 
                           data-type="maxBudget" 
                           value="${setting.maxBudget || 0}" 
                           min="0" step="10000" class="amount-input">
                </td>
            `;
            tbody.appendChild(row);
        });

        // 분야별 예산 현황 보기 버튼 이벤트 리스너 추가
        const fieldStatusButtons = document.querySelectorAll('.field-status-btn');
        fieldStatusButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const field = e.target.closest('button').dataset.field;
                this.showFieldBudgetStatus(field);
            });
        });
    },

    // 새로고침 함수
    async refresh() {
        console.log('🔄 Budget 모듈 새로고침');
        await this.loadBudgetOverview();
        return true;
    }
};

// 전역 접근을 위한 별명
window.AdminBudget = AdminManager.Budget;

console.log('💰 AdminManager.Budget 모듈 로드 완료 (이벤트 리스너 문제 수정)');
