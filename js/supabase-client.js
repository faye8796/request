// Supabase 클라이언트 설정 및 API 관리
const SUPABASE_URL = 'https://aazvopacnbbkvusihqva.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFhenZvcGFjbmJia3Z1c2locXZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk3OTQyMjQsImV4cCI6MjA2NTM3MDIyNH0.0NXI_tohwFCOl3xY4b1jIlxQR_zGTS9tWDM2OFxTq4s';

// Supabase 클라이언트 초기화
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase API 관리자
const SupabaseAPI = {
    client: supabaseClient,
    currentUser: null,
    currentUserType: null,

    // ===================
    // 인증 관련 함수들
    // ===================

    // 학생 인증 (이름 + 생년월일)
    async authenticateStudent(name, birthDate) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate)
                .single();

            if (error || !data) {
                console.error('Student authentication failed:', error);
                return { success: false, message: '학생 정보를 찾을 수 없습니다.' };
            }

            this.currentUser = data;
            this.currentUserType = 'student';
            
            return { success: true, user: data };
        } catch (error) {
            console.error('Authentication error:', error);
            return { success: false, message: '인증 중 오류가 발생했습니다.' };
        }
    },

    // 관리자 인증 (admin123 코드)
    async authenticateAdmin(code) {
        try {
            if (code !== 'admin123') {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            // 관리자 프로필 조회 또는 생성
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'admin')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('Admin authentication error:', error);
                return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
            }

            let adminUser = data;
            if (!adminUser) {
                // 관리자 계정이 없으면 생성
                const { data: newAdmin, error: createError } = await this.client
                    .from('user_profiles')
                    .insert([{
                        email: 'admin@sejong.or.kr',
                        name: '관리자',
                        user_type: 'admin'
                    }])
                    .select()
                    .single();

                if (createError) {
                    console.error('Admin creation error:', createError);
                    return { success: false, message: '관리자 계정 생성 중 오류가 발생했습니다.' };
                }

                adminUser = newAdmin;
            }

            this.currentUser = adminUser;
            this.currentUserType = 'admin';

            return { success: true, user: adminUser };
        } catch (error) {
            console.error('Admin authentication error:', error);
            return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
        }
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
    },

    // ===================
    // 예산 설정 관련 함수들
    // ===================

    // 모든 분야별 예산 설정 조회
    async getAllFieldBudgetSettings() {
        try {
            const { data, error } = await this.client
                .from('budget_settings')
                .select('*')
                .eq('is_active', true)
                .order('field');

            if (error) {
                console.error('Error fetching budget settings:', error);
                return {};
            }

            // 객체 형태로 변환 (기존 구조와 호환)
            const settings = {};
            data.forEach(item => {
                settings[item.field] = {
                    perLessonAmount: item.per_lesson_amount,
                    maxBudget: item.max_budget_limit
                };
            });

            return settings;
        } catch (error) {
            console.error('Error in getAllFieldBudgetSettings:', error);
            return {};
        }
    },

    // 분야별 예산 설정 업데이트
    async updateFieldBudgetSettings(field, settings) {
        try {
            const { data, error } = await this.client
                .from('budget_settings')
                .update({
                    per_lesson_amount: settings.perLessonAmount,
                    max_budget_limit: settings.maxBudget,
                    updated_at: new Date().toISOString()
                })
                .eq('field', field)
                .select();

            if (error) {
                console.error('Error updating budget settings:', error);
                return { success: false, message: '예산 설정 업데이트 중 오류가 발생했습니다.' };
            }

            // 기존 승인된 학생들의 예산 재계산
            await this.recalculateAllStudentBudgets();

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in updateFieldBudgetSettings:', error);
            return { success: false, message: '예산 설정 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // 모든 학생 예산 재계산
    async recalculateAllStudentBudgets() {
        try {
            // 승인된 수업계획이 있는 학생들 조회
            const { data: approvedPlans, error } = await this.client
                .from('lesson_plans')
                .select('user_id, lessons')
                .eq('status', 'approved');

            if (error) {
                console.error('Error fetching approved lesson plans:', error);
                return;
            }

            // 각 학생의 예산 재계산 및 업데이트
            for (const plan of approvedPlans) {
                await this.allocateBudgetForStudent(plan.user_id, plan.lessons);
            }
        } catch (error) {
            console.error('Error in recalculateAllStudentBudgets:', error);
        }
    },

    // ===================
    // 시스템 설정 관련 함수들
    // ===================

    // 시스템 설정 조회
    async getSystemSettings() {
        try {
            const { data, error } = await this.client
                .from('system_settings')
                .select('setting_key, setting_value, setting_type');

            if (error) {
                console.error('Error fetching system settings:', error);
                return {};
            }

            // 객체 형태로 변환
            const settings = {};
            data.forEach(item => {
                let value = item.setting_value;
                
                // 타입에 따라 변환
                if (item.setting_type === 'boolean') {
                    value = value === 'true';
                } else if (item.setting_type === 'number') {
                    value = parseInt(value);
                } else if (item.setting_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.error('Error parsing JSON setting:', item.setting_key, e);
                    }
                }

                settings[item.setting_key] = value;
            });

            return settings;
        } catch (error) {
            console.error('Error in getSystemSettings:', error);
            return {};
        }
    },

    // 시스템 설정 업데이트
    async updateSystemSetting(key, value) {
        try {
            let stringValue = value;
            if (typeof value === 'boolean') {
                stringValue = value.toString();
            } else if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
            } else if (typeof value === 'number') {
                stringValue = value.toString();
            }

            const { data, error } = await this.client
                .from('system_settings')
                .update({
                    setting_value: stringValue,
                    updated_at: new Date().toISOString()
                })
                .eq('setting_key', key)
                .select();

            if (error) {
                console.error('Error updating system setting:', error);
                return { success: false, message: '시스템 설정 업데이트 중 오류가 발생했습니다.' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in updateSystemSetting:', error);
            return { success: false, message: '시스템 설정 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // 테스트 모드 토글
    async toggleTestMode() {
        try {
            const settings = await this.getSystemSettings();
            const newValue = !settings.test_mode;
            
            const result = await this.updateSystemSetting('test_mode', newValue);
            if (result.success) {
                return newValue;
            }
            
            return settings.test_mode;
        } catch (error) {
            console.error('Error toggling test mode:', error);
            return false;
        }
    },

    // 수업계획 수정 가능 여부 확인
    async canEditLessonPlan() {
        try {
            const settings = await this.getSystemSettings();
            
            // 테스트 모드나 마감일 무시 모드가 활성화된 경우 항상 허용
            if (settings.test_mode || settings.ignore_deadline) {
                return true;
            }

            const deadline = new Date(`${settings.lesson_plan_deadline} 23:59:59`);
            const now = new Date();
            return now <= deadline;
        } catch (error) {
            console.error('Error checking lesson plan edit permission:', error);
            return false;
        }
    },

    // ===================
    // 학생 관련 함수들
    // ===================

    // 모든 학생 조회
    async getAllStudents() {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .order('name');

            if (error) {
                console.error('Error fetching students:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in getAllStudents:', error);
            return [];
        }
    },

    // 학생 정보 조회
    async getStudentById(studentId) {
        try {
            const { data, error } = await this.client
                .from('user_profiles')
                .select('*')
                .eq('id', studentId)
                .eq('user_type', 'student')
                .single();

            if (error) {
                console.error('Error fetching student:', error);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error in getStudentById:', error);
            return null;
        }
    },

    // 학생 예산 상태 조회
    async getStudentBudgetStatus(studentId) {
        try {
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) return null;

            // 학생의 예산 정보 조회
            const { data: budgetData, error: budgetError } = await this.client
                .from('student_budgets')
                .select('*')
                .eq('user_id', studentId)
                .single();

            // 수업계획 상태 조회
            const { data: lessonPlan, error: planError } = await this.client
                .from('lesson_plans')
                .select('status')
                .eq('user_id', studentId)
                .single();

            // 사용한 예산 계산 (승인됨 + 구매완료)
            const { data: approvedRequests, error: requestError } = await this.client
                .from('requests')
                .select('price')
                .eq('user_id', studentId)
                .in('status', ['approved', 'purchased', 'completed']);

            const usedBudget = approvedRequests?.reduce((sum, req) => sum + req.price, 0) || 0;

            const allocated = budgetData?.allocated_budget || 0;
            const lessonPlanStatus = lessonPlan?.status || 'draft';
            const canApplyForEquipment = lessonPlanStatus === 'approved';

            return {
                allocated: allocated,
                used: usedBudget,
                remaining: Math.max(0, allocated - usedBudget),
                field: student.field,
                lessonPlanStatus: lessonPlanStatus,
                canApplyForEquipment: canApplyForEquipment
            };
        } catch (error) {
            console.error('Error in getStudentBudgetStatus:', error);
            return null;
        }
    },

    // ===================
    // 수업계획 관련 함수들
    // ===================

    // 수업계획 저장/업데이트
    async saveLessonPlan(studentId, planData, isDraft = false) {
        try {
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            const lessonPlanData = {
                user_id: studentId,
                status: status,
                lessons: planData,
                submitted_at: submitTime,
                updated_at: new Date().toISOString()
            };

            // 기존 수업계획이 있는지 확인
            const { data: existing, error: findError } = await this.client
                .from('lesson_plans')
                .select('id')
                .eq('user_id', studentId)
                .single();

            let result;
            if (existing) {
                // 업데이트
                const { data, error } = await this.client
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
                
                result = { data, error };
            } else {
                // 새로 생성
                const { data, error } = await this.client
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
                
                result = { data, error };
            }

            if (result.error) {
                console.error('Error saving lesson plan:', result.error);
                return { success: false, message: '수업계획 저장 중 오류가 발생했습니다.' };
            }

            return { success: true, data: result.data[0] };
        } catch (error) {
            console.error('Error in saveLessonPlan:', error);
            return { success: false, message: '수업계획 저장 중 오류가 발생했습니다.' };
        }
    },

    // 학생 수업계획 조회
    async getStudentLessonPlan(studentId) {
        try {
            const { data, error } = await this.client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching lesson plan:', error);
                return null;
            }

            return data || null;
        } catch (error) {
            console.error('Error in getStudentLessonPlan:', error);
            return null;
        }
    },

    // 모든 수업계획 조회 (관리자용)
    async getAllLessonPlans() {
        try {
            const { data, error } = await this.client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching all lesson plans:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in getAllLessonPlans:', error);
            return [];
        }
    },

    // 대기 중인 수업계획 조회
    async getPendingLessonPlans() {
        try {
            const { data, error } = await this.client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .eq('status', 'submitted')
                .order('submitted_at');

            if (error) {
                console.error('Error fetching pending lesson plans:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in getPendingLessonPlans:', error);
            return [];
        }
    },

    // 수업계획 승인
    async approveLessonPlan(studentId) {
        try {
            const { data, error } = await this.client
                .from('lesson_plans')
                .update({
                    status: 'approved',
                    approved_at: new Date().toISOString(),
                    approved_by: this.currentUser?.id,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select()
                .single();

            if (error) {
                console.error('Error approving lesson plan:', error);
                return { success: false, message: '수업계획 승인 중 오류가 발생했습니다.' };
            }

            // 예산 배정
            const budgetInfo = await this.allocateBudgetForStudent(studentId, data.lessons);
            
            return { 
                success: true, 
                message: '수업계획이 승인되었습니다.',
                budgetInfo: budgetInfo
            };
        } catch (error) {
            console.error('Error in approveLessonPlan:', error);
            return { success: false, message: '수업계획 승인 중 오류가 발생했습니다.' };
        }
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, reason) {
        try {
            const { data, error } = await this.client
                .from('lesson_plans')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();

            if (error) {
                console.error('Error rejecting lesson plan:', error);
                return { success: false, message: '수업계획 반려 중 오류가 발생했습니다.' };
            }

            // 예산 회수
            await this.revokeBudgetForStudent(studentId);

            return { success: true, message: '수업계획이 반려되었습니다.' };
        } catch (error) {
            console.error('Error in rejectLessonPlan:', error);
            return { success: false, message: '수업계획 반려 중 오류가 발생했습니다.' };
        }
    },

    // 학생 예산 배정 (수업계획 승인 시)
    async allocateBudgetForStudent(studentId, lessonData) {
        try {
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) return null;

            // 예산 설정 조회
            const budgetSettings = await this.getAllFieldBudgetSettings();
            const fieldSettings = budgetSettings[student.field];
            if (!fieldSettings) return null;

            // 총 수업 횟수 계산
            const totalLessons = lessonData?.length || student.total_lessons || 0;
            const calculatedBudget = totalLessons * fieldSettings.perLessonAmount;
            const finalBudget = Math.min(calculatedBudget, fieldSettings.maxBudget);

            // 기존 예산 정보가 있는지 확인
            const { data: existingBudget, error: findError } = await this.client
                .from('student_budgets')
                .select('id')
                .eq('user_id', studentId)
                .single();

            let budgetResult;
            const budgetData = {
                user_id: studentId,
                field: student.field,
                allocated_budget: finalBudget,
                used_budget: 0,
                updated_at: new Date().toISOString()
            };

            if (existingBudget) {
                // 업데이트
                const { data, error } = await this.client
                    .from('student_budgets')
                    .update(budgetData)
                    .eq('user_id', studentId)
                    .select();
                budgetResult = { data, error };
            } else {
                // 새로 생성
                const { data, error } = await this.client
                    .from('student_budgets')
                    .insert([budgetData])
                    .select();
                budgetResult = { data, error };
            }

            if (budgetResult.error) {
                console.error('Error allocating budget:', budgetResult.error);
                return null;
            }

            return {
                allocated: finalBudget,
                calculated: calculatedBudget,
                perLessonAmount: fieldSettings.perLessonAmount,
                maxBudget: fieldSettings.maxBudget,
                isCapReached: calculatedBudget > fieldSettings.maxBudget
            };
        } catch (error) {
            console.error('Error in allocateBudgetForStudent:', error);
            return null;
        }
    },

    // 학생 예산 회수 (수업계획 반려 시)
    async revokeBudgetForStudent(studentId) {
        try {
            const { error } = await this.client
                .from('student_budgets')
                .update({
                    allocated_budget: 0,
                    used_budget: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId);

            if (error) {
                console.error('Error revoking budget:', error);
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error in revokeBudgetForStudent:', error);
            return false;
        }
    },

    // ===================
    // 에러 핸들링 유틸리티
    // ===================

    handleError(error, defaultMessage) {
        console.error('Supabase error:', error);
        return {
            success: false,
            message: error?.message || defaultMessage || '알 수 없는 오류가 발생했습니다.'
        };
    }
};

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;
