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
    // 교구 신청 관련 함수들
    // ===================

    // 학생 신청 내역 조회
    async getStudentApplications(studentId) {
        try {
            const { data, error } = await this.client
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching student applications:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in getStudentApplications:', error);
            return [];
        }
    },

    // 교구 신청 추가
    async addApplication(studentId, itemData) {
        try {
            const requestData = {
                user_id: studentId,
                item_name: itemData.name,
                purpose: itemData.purpose,
                price: itemData.price,
                purchase_type: itemData.purchaseMethod || 'online',
                purchase_link: itemData.link || null,
                is_bundle: itemData.type === 'bundle',
                bundle_info: itemData.bundleInfo || null,
                shipping_address: itemData.shippingAddress || null,
                notes: itemData.notes || null,
                status: 'pending'
            };

            const { data, error } = await this.client
                .from('requests')
                .insert([requestData])
                .select()
                .single();

            if (error) {
                console.error('Error adding application:', error);
                return { success: false, message: '교구 신청 중 오류가 발생했습니다.' };
            }

            return { success: true, data: data };
        } catch (error) {
            console.error('Error in addApplication:', error);
            return { success: false, message: '교구 신청 중 오류가 발생했습니다.' };
        }
    },

    // 신청 아이템 수정
    async updateApplicationItem(studentId, itemId, updatedData) {
        try {
            // 먼저 해당 신청이 수정 가능한 상태인지 확인
            const { data: existing, error: checkError } = await this.client
                .from('requests')
                .select('status')
                .eq('id', itemId)
                .eq('user_id', studentId)
                .single();

            if (checkError || !existing || existing.status !== 'pending') {
                return { success: false, message: '수정할 수 없는 신청입니다.' };
            }

            const updateData = {
                item_name: updatedData.name,
                purpose: updatedData.purpose,
                price: updatedData.price,
                purchase_type: updatedData.purchaseMethod || 'online',
                purchase_link: updatedData.link || null,
                is_bundle: updatedData.type === 'bundle',
                bundle_info: updatedData.bundleInfo || null,
                notes: updatedData.notes || null,
                updated_at: new Date().toISOString()
            };

            const { data, error } = await this.client
                .from('requests')
                .update(updateData)
                .eq('id', itemId)
                .eq('user_id', studentId)
                .select();

            if (error) {
                console.error('Error updating application:', error);
                return { success: false, message: '신청 수정 중 오류가 발생했습니다.' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in updateApplicationItem:', error);
            return { success: false, message: '신청 수정 중 오류가 발생했습니다.' };
        }
    },

    // 신청 아이템 삭제
    async deleteApplicationItem(studentId, itemId) {
        try {
            // 먼저 해당 신청이 삭제 가능한 상태인지 확인
            const { data: existing, error: checkError } = await this.client
                .from('requests')
                .select('status')
                .eq('id', itemId)
                .eq('user_id', studentId)
                .single();

            if (checkError || !existing || existing.status !== 'pending') {
                return { success: false, message: '삭제할 수 없는 신청입니다.' };
            }

            const { error } = await this.client
                .from('requests')
                .delete()
                .eq('id', itemId)
                .eq('user_id', studentId);

            if (error) {
                console.error('Error deleting application:', error);
                return { success: false, message: '신청 삭제 중 오류가 발생했습니다.' };
            }

            return { success: true };
        } catch (error) {
            console.error('Error in deleteApplicationItem:', error);
            return { success: false, message: '신청 삭제 중 오류가 발생했습니다.' };
        }
    },

    // 아이템 상태 업데이트 (관리자용)
    async updateItemStatus(requestId, status, rejectionReason = null) {
        try {
            const updateData = {
                status: status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: this.currentUser?.id
            };

            if (rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { data, error } = await this.client
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select();

            if (error) {
                console.error('Error updating item status:', error);
                return { success: false, message: '상태 업데이트 중 오류가 발생했습니다.' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in updateItemStatus:', error);
            return { success: false, message: '상태 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // 전체 신청 목록 조회 (관리자용)
    async getAllApplications() {
        try {
            const { data, error } = await this.client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching all applications:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in getAllApplications:', error);
            return [];
        }
    },

    // 신청 검색
    async searchApplications(searchTerm) {
        try {
            if (!searchTerm || !searchTerm.trim()) {
                return await this.getAllApplications();
            }

            const term = searchTerm.trim();
            const { data, error } = await this.client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .or(`item_name.ilike.%${term}%,purpose.ilike.%${term}%,user_profiles.name.ilike.%${term}%`)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error searching applications:', error);
                return [];
            }

            return data;
        } catch (error) {
            console.error('Error in searchApplications:', error);
            return [];
        }
    },

    // ===================
    // 영수증 관리 관련 함수들
    // ===================

    // 영수증 제출
    async submitReceipt(requestId, receiptData) {
        try {
            const receiptRecord = {
                request_id: requestId,
                user_id: this.currentUser?.id,
                receipt_number: `RCP-${Date.now()}`,
                image_path: receiptData.image, // Base64 문자열
                purchase_date: receiptData.purchaseDateTime,
                store_name: receiptData.purchaseStore,
                total_amount: receiptData.amount || 0,
                notes: receiptData.note,
                verified: false
            };

            const { data, error } = await this.client
                .from('receipts')
                .insert([receiptRecord])
                .select()
                .single();

            if (error) {
                console.error('Error submitting receipt:', error);
                return { success: false, message: '영수증 제출 중 오류가 발생했습니다.' };
            }

            // 교구 신청 상태를 구매완료로 업데이트
            await this.updateItemStatus(requestId, 'purchased');

            return { success: true, data: data };
        } catch (error) {
            console.error('Error in submitReceipt:', error);
            return { success: false, message: '영수증 제출 중 오류가 발생했습니다.' };
        }
    },

    // 영수증 조회 (특정 신청)
    async getReceiptByRequestId(requestId) {
        try {
            const { data, error } = await this.client
                .from('receipts')
                .select('*')
                .eq('request_id', requestId)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('Error fetching receipt:', error);
                return null;
            }

            return data || null;
        } catch (error) {
            console.error('Error in getReceiptByRequestId:', error);
            return null;
        }
    },

    // 영수증 검증 (관리자용)
    async verifyReceipt(receiptId, verified = true) {
        try {
            const updateData = {
                verified: verified,
                verified_at: new Date().toISOString(),
                verified_by: this.currentUser?.id
            };

            const { data, error } = await this.client
                .from('receipts')
                .update(updateData)
                .eq('id', receiptId)
                .select();

            if (error) {
                console.error('Error verifying receipt:', error);
                return { success: false, message: '영수증 검증 중 오류가 발생했습니다.' };
            }

            return { success: true, data: data[0] };
        } catch (error) {
            console.error('Error in verifyReceipt:', error);
            return { success: false, message: '영수증 검증 중 오류가 발생했습니다.' };
        }
    },

    // ===================
    // 통계 및 관리 함수들
    // ===================

    // 관리자용 통계 데이터
    async getStats() {
        try {
            // 총 학생 수
            const { count: totalStudents } = await this.client
                .from('user_profiles')
                .select('*', { count: 'exact', head: true })
                .eq('user_type', 'student');

            // 신청 현황 통계
            const { data: requests } = await this.client
                .from('requests')
                .select('status');

            const stats = {
                totalStudents: totalStudents || 0,
                applicantCount: 0, // 신청한 학생 수 (중복 제거)
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                purchasedCount: 0
            };

            if (requests) {
                // 신청한 학생 수 계산
                const { data: applicants } = await this.client
                    .from('requests')
                    .select('user_id', { count: 'exact' })
                    .not('user_id', 'is', null);

                const uniqueApplicants = new Set(applicants?.map(r => r.user_id) || []);
                stats.applicantCount = uniqueApplicants.size;

                // 상태별 카운트
                requests.forEach(req => {
                    switch (req.status) {
                        case 'pending':
                            stats.pendingCount++;
                            break;
                        case 'approved':
                            stats.approvedCount++;
                            break;
                        case 'rejected':
                            stats.rejectedCount++;
                            break;
                        case 'purchased':
                        case 'completed':
                            stats.purchasedCount++;
                            break;
                    }
                });
            }

            return stats;
        } catch (error) {
            console.error('Error in getStats:', error);
            return {
                totalStudents: 0,
                applicantCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                purchasedCount: 0
            };
        }
    },

    // 예산 현황 통계
    async getBudgetOverviewStats() {
        try {
            // 총 배정 예산
            const { data: budgets } = await this.client
                .from('student_budgets')
                .select('allocated_budget');

            const totalApprovedBudget = budgets?.reduce((sum, b) => sum + b.allocated_budget, 0) || 0;

            // 승인된 신청의 총액
            const { data: approvedRequests } = await this.client
                .from('requests')
                .select('price')
                .in('status', ['approved', 'purchased', 'completed']);

            const approvedItemsTotal = approvedRequests?.reduce((sum, r) => sum + r.price, 0) || 0;

            // 구매완료된 총액
            const { data: purchasedRequests } = await this.client
                .from('requests')
                .select('price')
                .in('status', ['purchased', 'completed']);

            const purchasedTotal = purchasedRequests?.reduce((sum, r) => sum + r.price, 0) || 0;

            // 신청한 학생 수 (평균 계산용)
            const { data: applicants } = await this.client
                .from('requests')
                .select('user_id')
                .not('user_id', 'is', null);

            const uniqueApplicants = new Set(applicants?.map(r => r.user_id) || []);
            const applicantCount = uniqueApplicants.size;
            const averagePerPerson = applicantCount > 0 ? Math.round(approvedItemsTotal / applicantCount) : 0;

            return {
                totalApprovedBudget,
                approvedItemsTotal,
                purchasedTotal,
                averagePerPerson
            };
        } catch (error) {
            console.error('Error in getBudgetOverviewStats:', error);
            return {
                totalApprovedBudget: 0,
                approvedItemsTotal: 0,
                purchasedTotal: 0,
                averagePerPerson: 0
            };
        }
    },

    // 오프라인 구매 통계
    async getOfflinePurchaseStats() {
        try {
            // 오프라인 승인된 신청 수
            const { count: approvedOffline } = await this.client
                .from('requests')
                .select('*', { count: 'exact', head: true })
                .eq('purchase_type', 'offline')
                .eq('status', 'approved');

            // 영수증이 있는 신청 수
            const { data: receipts } = await this.client
                .from('receipts')
                .select('request_id');

            const withReceipt = receipts?.length || 0;
            const pendingReceipt = Math.max(0, (approvedOffline || 0) - withReceipt);

            return {
                approvedOffline: approvedOffline || 0,
                withReceipt,
                pendingReceipt
            };
        } catch (error) {
            console.error('Error in getOfflinePurchaseStats:', error);
            return {
                approvedOffline: 0,
                withReceipt: 0,
                pendingReceipt: 0
            };
        }
    },

    // Excel 내보내기 데이터 준비
    async prepareExportData() {
        try {
            const { data, error } = await this.client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute),
                    receipts(receipt_number, verified)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error preparing export data:', error);
                return [];
            }

            const exportData = [];
            
            for (const request of data) {
                const budgetStatus = await this.getStudentBudgetStatus(request.user_id);
                const lessonPlan = await this.getStudentLessonPlan(request.user_id);
                
                exportData.push({
                    '학생명': request.user_profiles.name,
                    '소속기관': request.user_profiles.sejong_institute || '',
                    '전공분야': request.user_profiles.field || '',
                    '교구명': request.item_name,
                    '사용목적': request.purpose,
                    '가격': request.price,
                    '구매방식': request.purchase_type === 'offline' ? '오프라인' : '온라인',
                    '신청유형': request.is_bundle ? '묶음' : '단일',
                    '상태': this.getStatusText(request.status),
                    '신청일': new Date(request.created_at).toLocaleDateString('ko-KR'),
                    '수업계획상태': lessonPlan?.status || '미작성',
                    '배정예산': budgetStatus?.allocated || 0,
                    '사용예산': budgetStatus?.used || 0,
                    '잔여예산': budgetStatus?.remaining || 0,
                    '구매링크': request.purchase_link || '',
                    '반려사유': request.rejection_reason || '',
                    '영수증제출': request.receipts?.[0] ? 'Y' : 'N',
                    '영수증검증': request.receipts?.[0]?.verified ? 'Y' : 'N'
                });
            }

            return exportData;
        } catch (error) {
            console.error('Error in prepareExportData:', error);
            return [];
        }
    },

    // ===================
    // 유틸리티 함수들
    // ===================

    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    },

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    },

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    },

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
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
