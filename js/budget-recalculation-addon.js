// 분야별 예산 설정 업데이트 - 기존 학생 예산 재계산 기능 추가
async updateFieldBudgetSettings(field, settings) {
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
            await this.recalculateStudentBudgets(field, settings);
        }

        return result;
    }, { field, settings });
},

// 새로 추가: 해당 분야 학생들의 예산 재계산
async recalculateStudentBudgets(field, newSettings) {
    return await this.safeApiCall('학생 예산 재계산', async () => {
        const client = await this.ensureClient();
        
        // 1. 해당 분야의 승인된 학생들 조회
        const studentsResult = await client
            .from('student_budgets')
            .select(`
                id,
                user_id,
                allocated_budget,
                used_budget,
                user_profiles!inner(field, total_lessons)
            `)
            .eq('user_profiles.field', field);

        if (!studentsResult.data || studentsResult.data.length === 0) {
            console.log(`📊 ${field} 분야에 재계산할 학생이 없습니다.`);
            return { data: { updated: 0 }, error: null };
        }

        console.log(`🔄 ${field} 분야 ${studentsResult.data.length}명의 예산 재계산 시작`);
        
        // 2. 각 학생의 새 예산 계산 및 업데이트
        const updatePromises = studentsResult.data.map(async (student) => {
            const totalLessons = student.user_profiles?.total_lessons || 20; // 기본값
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
        
        console.log(`✅ ${successCount}/${studentsResult.data.length}명의 예산 재계산 완료`);
        
        return { 
            data: { 
                updated: successCount, 
                total: studentsResult.data.length,
                field: field,
                newSettings: newSettings 
            }, 
            error: null 
        };
    }, { field, newSettings });
},

// 새로 추가: 특정 분야의 모든 학생 예산 상태 조회
async getFieldBudgetStatus(field) {
    return await this.safeApiCall('분야별 예산 상태 조회', async () => {
        const client = await this.ensureClient();
        
        // 해당 분야 학생들의 예산 정보와 사용 현황 조회
        const result = await client
            .from('student_budgets')
            .select(`
                *,
                user_profiles!inner(id, name, field, sejong_institute)
            `)
            .eq('user_profiles.field', field)
            .order('allocated_budget', { ascending: false });

        if (result.data && result.data.length > 0) {
            // 통계 계산
            const totalAllocated = result.data.reduce((sum, student) => sum + student.allocated_budget, 0);
            const totalUsed = result.data.reduce((sum, student) => sum + student.used_budget, 0);
            const averageAllocated = Math.round(totalAllocated / result.data.length);
            const averageUsed = Math.round(totalUsed / result.data.length);

            return {
                data: {
                    students: result.data,
                    statistics: {
                        totalStudents: result.data.length,
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
        }

        return { data: { students: [], statistics: null }, error: null };
    }, { field });
},