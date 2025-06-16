// 예산 설정 저장 - 기존 학생 예산 재계산 기능 추가
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
        let recalculationResults = [];
        
        // 예산 재계산 확인 메시지
        const shouldRecalculate = Utils.showConfirm(
            '예산 설정을 업데이트하시겠습니까?\n\n✅ 기존에 승인받은 학생들의 예산도 새로운 설정에 맞춰 자동으로 재계산됩니다.\n⚠️ 이미 사용한 예산이 새 배정 예산을 초과하는 경우 적절히 조정됩니다.'
        );
        
        if (!shouldRecalculate) {
            Utils.hideLoading(submitBtn);
            return;
        }
        
        for (const [field, settings] of Object.entries(updates)) {
            // 예산 설정 업데이트 (재계산 기능 포함)
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
        } else {
            Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
        }
        
    } catch (error) {
        Utils.hideLoading(submitBtn);
        Utils.showToast('예산 설정 저장 중 오류가 발생했습니다.', 'error');
        console.error('Budget settings error:', error);
    }
},

// 새로 추가: 분야별 예산 현황 보기 기능
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
        
        // 모달 창 생성
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
                                            <td>${this.escapeHtml(student.user_profiles.name)}</td>
                                            <td>${this.escapeHtml(student.user_profiles.sejong_institute)}</td>
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
        
    } catch (error) {
        console.error('Field budget status error:', error);
        Utils.showToast('예산 현황 조회 중 오류가 발생했습니다.', 'error');
    }
},