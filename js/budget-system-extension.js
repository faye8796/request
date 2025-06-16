// 예산 재계산 시스템 통합 확장 - 기존 SupabaseAPI에 추가
// 이 파일을 supabase-client.js 뒤에 로드하여 기능을 확장합니다

(function() {
    'use strict';
    
    // SupabaseAPI가 로드될 때까지 대기
    function waitForSupabaseAPI() {
        return new Promise((resolve) => {
            const checkAPI = () => {
                if (window.SupabaseAPI) {
                    resolve(window.SupabaseAPI);
                } else {
                    setTimeout(checkAPI, 100);
                }
            };
            checkAPI();
        });
    }

    // 예산 재계산 기능 확장
    async function extendSupabaseAPI() {
        const SupabaseAPI = await waitForSupabaseAPI();
        
        console.log('🔧 예산 재계산 시스템 초기화 중...');

        // 기존 updateFieldBudgetSettings 함수를 재계산 기능이 포함된 버전으로 교체
        const originalUpdateFieldBudgetSettings = SupabaseAPI.updateFieldBudgetSettings;
        
        SupabaseAPI.updateFieldBudgetSettings = async function(field, settings) {
            return await this.safeApiCall('분야별 예산 설정 업데이트', async () => {
                const client = await this.ensureClient();
                
                // 기존 설정 확인
                const existingResult = await client
                    .from('budget_settings')
                    .select('id')
                    .eq('field', field);

                const updateData = {
                    field: field,
                    per_lesson_amount: settings.perLessonAmount,
                    max_budget_limit: settings.maxBudget,
                    updated_at: new Date().toISOString()
                };

                let result;
                if (existingResult.data && existingResult.data.length > 0) {
                    // 업데이트
                    result = await client
                        .from('budget_settings')
                        .update(updateData)
                        .eq('field', field)
                        .select();
                } else {
                    // 새로 생성
                    result = await client
                        .from('budget_settings')
                        .insert([{ ...updateData, is_active: true }])
                        .select();
                }

                // 예산 설정 업데이트 성공 시, 해당 분야 학생들의 예산 재계산
                if (result.data && result.data.length > 0) {
                    const recalcResult = await this.recalculateStudentBudgets(field, settings);
                    if (recalcResult.success) {
                        // 재계산 결과를 응답에 포함
                        return {
                            data: {
                                ...result.data[0],
                                recalculation: recalcResult.data
                            },
                            error: null
                        };
                    }
                }

                return result;
            }, { field, settings });
        };

        // 학생 예산 재계산 함수 추가
        SupabaseAPI.recalculateStudentBudgets = async function(field, newSettings) {
            return await this.safeApiCall('학생 예산 재계산', async () => {
                const client = await this.ensureClient();
                
                // 1. 해당 분야의 승인된 학생들 조회 (분리된 쿼리 방식)
                const budgetResult = await client
                    .from('student_budgets')
                    .select('id, user_id, allocated_budget, used_budget')
                    .eq('field', field);

                if (!budgetResult.data || budgetResult.data.length === 0) {
                    console.log(`📊 ${field} 분야에 재계산할 학생이 없습니다.`);
                    return { data: { updated: 0, total: 0, field: field }, error: null };
                }

                // 2. 각 학생의 수업 수 정보 조회
                const userIds = budgetResult.data.map(s => s.user_id);
                const profilesResult = await client
                    .from('user_profiles')
                    .select('id, total_lessons')
                    .in('id', userIds);

                const profilesMap = {};
                if (profilesResult.data) {
                    profilesResult.data.forEach(profile => {
                        profilesMap[profile.id] = profile;
                    });
                }

                console.log(`🔄 ${field} 분야 ${budgetResult.data.length}명의 예산 재계산 시작`);
                
                // 3. 각 학생의 새 예산 계산 및 업데이트
                const updatePromises = budgetResult.data.map(async (student) => {
                    const profile = profilesMap[student.user_id];
                    const totalLessons = profile?.total_lessons || 20; // 기본값
                    const newAllocatedBudget = Math.min(
                        totalLessons * newSettings.perLessonAmount,
                        newSettings.maxBudget
                    );

                    // 사용 예산이 새 배정 예산을 초과하지 않도록 체크
                    const adjustedUsedBudget = Math.min(student.used_budget, newAllocatedBudget);

                    return await client
                        .from('student_budgets')
                        .update({
                            allocated_budget: newAllocatedBudget,
                            used_budget: adjustedUsedBudget,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', student.id);
                });

                const results = await Promise.all(updatePromises);
                const successCount = results.filter(result => !result.error).length;
                
                console.log(`✅ ${successCount}/${budgetResult.data.length}명의 예산 재계산 완료`);
                
                return { 
                    data: { 
                        updated: successCount, 
                        total: budgetResult.data.length,
                        field: field,
                        newSettings: newSettings 
                    }, 
                    error: null 
                };
            }, { field, newSettings });
        };

        // 특정 분야의 모든 학생 예산 상태 조회 함수 추가
        SupabaseAPI.getFieldBudgetStatus = async function(field) {
            return await this.safeApiCall('분야별 예산 상태 조회', async () => {
                const client = await this.ensureClient();
                
                // 해당 분야 학생들의 예산 정보 조회 (분리된 쿼리 방식)
                const budgetResult = await client
                    .from('student_budgets')
                    .select('*')
                    .eq('field', field)
                    .order('allocated_budget', { ascending: false });

                if (!budgetResult.data || budgetResult.data.length === 0) {
                    return { data: { students: [], statistics: null }, error: null };
                }

                // 사용자 정보 별도 조회
                const userIds = budgetResult.data.map(b => b.user_id);
                const profilesResult = await client
                    .from('user_profiles')
                    .select('id, name, sejong_institute')
                    .in('id', userIds);

                const profilesMap = {};
                if (profilesResult.data) {
                    profilesResult.data.forEach(profile => {
                        profilesMap[profile.id] = profile;
                    });
                }

                // 데이터 병합
                const enrichedStudents = budgetResult.data.map(budget => ({
                    ...budget,
                    user_profiles: profilesMap[budget.user_id] || {
                        id: budget.user_id,
                        name: '사용자 정보 없음',
                        sejong_institute: '미설정'
                    }
                }));

                // 통계 계산
                const totalAllocated = enrichedStudents.reduce((sum, student) => sum + student.allocated_budget, 0);
                const totalUsed = enrichedStudents.reduce((sum, student) => sum + student.used_budget, 0);
                const averageAllocated = Math.round(totalAllocated / enrichedStudents.length);
                const averageUsed = Math.round(totalUsed / enrichedStudents.length);

                return {
                    data: {
                        students: enrichedStudents,
                        statistics: {
                            totalStudents: enrichedStudents.length,
                            totalAllocated,
                            totalUsed,
                            totalRemaining: totalAllocated - totalUsed,
                            averageAllocated,
                            averageUsed,
                            utilizationRate: totalAllocated > 0 ? Math.round((totalUsed / totalAllocated) * 100) : 0
                        }
                    },
                    error: null
                };
            }, { field });
        };

        console.log('✅ 예산 재계산 시스템 초기화 완료');
    }

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', extendSupabaseAPI);
    } else {
        extendSupabaseAPI();
    }

})();

// 관리자 대시보드 예산 설정 기능 확장
(function() {
    'use strict';

    // AdminManager가 로드될 때까지 대기
    function waitForAdminManager() {
        return new Promise((resolve) => {
            const checkManager = () => {
                if (window.AdminManager) {
                    resolve(window.AdminManager);
                } else {
                    setTimeout(checkManager, 100);
                }
            };
            checkManager();
        });
    }

    // 관리자 기능 확장
    async function extendAdminManager() {
        const AdminManager = await waitForAdminManager();
        
        console.log('🔧 관리자 예산 관리 기능 확장 중...');

        // 기존 예산 설정 저장 함수를 재계산 기능이 포함된 버전으로 교체
        AdminManager.handleBudgetSettingsSubmit = async function() {
            const form = Utils.$('#budgetSettingsForm');
            if (!form) {
                Utils.showToast('예산 설정 폼을 찾을 수 없습니다.', 'error');
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
        };

        // 분야별 예산 현황 보기 기능 추가
        AdminManager.showFieldBudgetStatus = async function(field) {
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
                    <div class="modal-content" style="max-width: 1000px; max-height: 80vh; overflow-y: auto;">
                        <div class="modal-header">
                            <h3>${field} 분야 예산 현황</h3>
                            <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="budget-statistics" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin-bottom: 2rem;">
                                <div class="stat-card" style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #666;">총 학생 수</h4>
                                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold; color: #333;">${statistics.totalStudents}명</span>
                                </div>
                                <div class="stat-card" style="background: #e3f2fd; padding: 1rem; border-radius: 8px; text-align: center;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #666;">총 배정 예산</h4>
                                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold; color: #1976d2;">${Utils.formatPrice(statistics.totalAllocated)}</span>
                                </div>
                                <div class="stat-card" style="background: #fff3e0; padding: 1rem; border-radius: 8px; text-align: center;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #666;">총 사용 예산</h4>
                                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold; color: #f57c00;">${Utils.formatPrice(statistics.totalUsed)}</span>
                                </div>
                                <div class="stat-card" style="background: #e8f5e8; padding: 1rem; border-radius: 8px; text-align: center;">
                                    <h4 style="margin: 0 0 0.5rem 0; color: #666;">예산 사용률</h4>
                                    <span class="stat-value" style="font-size: 1.5rem; font-weight: bold; color: #388e3c;">${statistics.utilizationRate}%</span>
                                </div>
                            </div>
                            
                            <div class="student-budget-list">
                                <h4>학생별 예산 현황</h4>
                                <div style="overflow-x: auto;">
                                    <table class="budget-table" style="width: 100%; border-collapse: collapse; margin-top: 1rem;">
                                        <thead>
                                            <tr style="background: #f5f5f5;">
                                                <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">학생명</th>
                                                <th style="padding: 0.75rem; text-align: left; border: 1px solid #ddd;">세종학당</th>
                                                <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">배정 예산</th>
                                                <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">사용 예산</th>
                                                <th style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">잔여 예산</th>
                                                <th style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">사용률</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${students.map(student => {
                                                const usageRate = student.allocated_budget > 0 ? 
                                                    Math.round((student.used_budget / student.allocated_budget) * 100) : 0;
                                                const remaining = student.allocated_budget - student.used_budget;
                                                
                                                return `
                                                    <tr>
                                                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${this.escapeHtml(student.user_profiles.name)}</td>
                                                        <td style="padding: 0.75rem; border: 1px solid #ddd;">${this.escapeHtml(student.user_profiles.sejong_institute)}</td>
                                                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${Utils.formatPrice(student.allocated_budget)}</td>
                                                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd;">${Utils.formatPrice(student.used_budget)}</td>
                                                        <td style="padding: 0.75rem; text-align: right; border: 1px solid #ddd; ${remaining < 0 ? 'color: red; font-weight: bold;' : ''}">${Utils.formatPrice(remaining)}</td>
                                                        <td style="padding: 0.75rem; text-align: center; border: 1px solid #ddd;">${usageRate}%</td>
                                                    </tr>
                                                `;
                                            }).join('')}
                                        </tbody>
                                    </table>
                                </div>
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
        };

        console.log('✅ 관리자 예산 관리 기능 확장 완료');
    }

    // DOM 로드 완료 후 초기화
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', extendAdminManager);
    } else {
        extendAdminManager();
    }

})();
