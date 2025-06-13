// Supabase 클라이언트 설정 및 API 관리 - 최적화 버전 + RLS 문제 해결
// 에러 핸들링 개선, 로깅 추가, 코드 안정성 향상

// 설정 파일이 로드될 때까지 대기
function waitForConfig() {
    return new Promise((resolve) => {
        if (window.CONFIG) {
            resolve(window.CONFIG);
        } else {
            // config.js가 로드될 때까지 100ms마다 확인
            const checkConfig = setInterval(() => {
                if (window.CONFIG) {
                    clearInterval(checkConfig);
                    resolve(window.CONFIG);
                }
            }, 100);
            
            // 30초 후 타임아웃
            setTimeout(() => {
                clearInterval(checkConfig);
                console.error('Config 로드 타임아웃');
                resolve(null);
            }, 30000);
        }
    });
}

// Supabase 클라이언트 초기화
let supabaseClient = null;
let initializationPromise = null;

// 클라이언트 초기화 함수
async function initializeSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    // 이미 초기화 중이라면 기다림
    if (initializationPromise) return initializationPromise;
    
    initializationPromise = (async () => {
        try {
            const config = await waitForConfig();
            
            if (!config) {
                throw new Error('Config 로드 실패');
            }
            
            if (!window.supabase || !window.supabase.createClient) {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다');
            }
            
            const { createClient } = window.supabase;
            
            supabaseClient = createClient(
                config.SUPABASE.URL,
                config.SUPABASE.ANON_KEY,
                {
                    auth: {
                        persistSession: false, // 세션 유지하지 않음 (브라우저 기반 인증 아님)
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    },
                    db: {
                        schema: 'public'
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'supabase-js-web'
                        }
                    }
                }
            );
            
            console.log('✅ Supabase client initialized successfully');
            return supabaseClient;
        } catch (error) {
            console.error('❌ Supabase client initialization failed:', error);
            throw error;
        }
    })();
    
    return initializationPromise;
}

// 즉시 초기화 시작
initializeSupabaseClient().catch(error => {
    console.error('초기 Supabase 클라이언트 초기화 실패:', error);
});

// Supabase API 관리자
const SupabaseAPI = {
    get client() {
        return supabaseClient;
    },
    currentUser: null,
    currentUserType: null,

    // 클라이언트가 초기화될 때까지 대기하는 헬퍼 함수
    async ensureClient() {
        if (!this.client) {
            await initializeSupabaseClient();
        }
        if (!this.client) {
            throw new Error('Supabase 클라이언트 초기화 실패');
        }
        return this.client;
    },

    // 에러 로깅 헬퍼
    logError(operation, error, context = {}) {
        const config = window.CONFIG;
        if (config?.DEV?.ENABLE_CONSOLE_LOGS) {
            console.group(`❌ ${operation} 오류`);
            console.error('Error:', error);
            console.log('Context:', context);
            if (error?.message) console.log('Message:', error.message);
            if (error?.details) console.log('Details:', error.details);
            if (error?.hint) console.log('Hint:', error.hint);
            if (error?.code) console.log('Code:', error.code);
            console.groupEnd();
        }
    },

    // 성공 로깅 헬퍼
    logSuccess(operation, data = null) {
        const config = window.CONFIG;
        if (config?.DEV?.ENABLE_CONSOLE_LOGS) {
            console.log(`✅ ${operation} 성공`, data ? data : '');
        }
    },

    // ===================
    // 인증 관련 함수들
    // ===================

    // 학생 인증 (이름 + 생년월일)
    async authenticateStudent(name, birthDate) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate)
                .single();

            if (error || !data) {
                this.logError('학생 인증', error, { name, birthDate });
                return { 
                    success: false, 
                    message: error?.code === 'PGRST116' 
                        ? '일치하는 학생 정보를 찾을 수 없습니다.' 
                        : '학생 정보 조회 중 오류가 발생했습니다.'
                };
            }

            this.currentUser = data;
            this.currentUserType = 'student';
            this.logSuccess('학생 인증', { name: data.name, field: data.field });
            
            return { success: true, user: data };
        } catch (error) {
            this.logError('학생 인증', error, { name, birthDate });
            return { success: false, message: '인증 중 오류가 발생했습니다.' };
        }
    },

    // 관리자 인증 (관리자 코드)
    async authenticateAdmin(code) {
        try {
            const config = await waitForConfig();
            if (code !== config.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const client = await this.ensureClient();
            // 관리자 프로필 조회 또는 생성
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'admin')
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                this.logError('관리자 인증', error);
                return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
            }

            let adminUser = data;
            if (!adminUser) {
                // 관리자 계정이 없으면 생성
                const { data: newAdmin, error: createError } = await client
                    .from('user_profiles')
                    .insert([{
                        email: 'admin@sejong.or.kr',
                        name: '관리자',
                        user_type: 'admin'
                    }])
                    .select()
                    .single();

                if (createError) {
                    this.logError('관리자 계정 생성', createError);
                    return { success: false, message: '관리자 계정 생성 중 오류가 발생했습니다.' };
                }

                adminUser = newAdmin;
                this.logSuccess('관리자 계정 생성', { name: adminUser.name });
            }

            this.currentUser = adminUser;
            this.currentUserType = 'admin';
            this.logSuccess('관리자 인증', { name: adminUser.name });

            return { success: true, user: adminUser };
        } catch (error) {
            this.logError('관리자 인증', error);
            return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
        }
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        this.logSuccess('로그아웃');
    },

    // ===================
    // 예산 설정 관련 함수들
    // ===================

    // 모든 분야별 예산 설정 조회
    async getAllFieldBudgetSettings() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('budget_settings')
                .select('*')
                .eq('is_active', true)
                .order('field');

            if (error) {
                this.logError('예산 설정 조회', error);
                // 기본 설정 반환
                const config = await waitForConfig();
                return config?.APP?.DEFAULT_BUDGET_SETTINGS || {};
            }

            // 객체 형태로 변환 (기존 구조와 호환)
            const settings = {};
            data.forEach(item => {
                settings[item.field] = {
                    perLessonAmount: item.per_lesson_amount,
                    maxBudget: item.max_budget_limit
                };
            });

            this.logSuccess('예산 설정 조회', `${Object.keys(settings).length}개 분야`);
            return settings;
        } catch (error) {
            this.logError('예산 설정 조회', error);
            // 기본 설정 반환
            const config = await waitForConfig();
            return config?.APP?.DEFAULT_BUDGET_SETTINGS || {};
        }
    },

    // 분야별 예산 설정 업데이트
    async updateFieldBudgetSettings(field, settings) {
        try {
            const client = await this.ensureClient();
            
            // 먼저 해당 필드가 존재하는지 확인
            const { data: existing, error: findError } = await client
                .from('budget_settings')
                .select('id')
                .eq('field', field)
                .single();

            let result;
            const budgetData = {
                field: field,
                per_lesson_amount: settings.perLessonAmount,
                max_budget_limit: settings.maxBudget,
                is_active: true,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // 업데이트
                const { data, error } = await client
                    .from('budget_settings')
                    .update(budgetData)
                    .eq('field', field)
                    .select();
                result = { data, error };
            } else {
                // 새로 생성
                const { data, error } = await client
                    .from('budget_settings')
                    .insert([budgetData])
                    .select();
                result = { data, error };
            }

            if (result.error) {
                this.logError('예산 설정 업데이트', result.error, { field, settings });
                return { success: false, message: '예산 설정 업데이트 중 오류가 발생했습니다.' };
            }

            // 기존 승인된 학생들의 예산 재계산
            await this.recalculateAllStudentBudgets();
            this.logSuccess('예산 설정 업데이트', { field, settings });

            return { success: true, data: result.data[0] };
        } catch (error) {
            this.logError('예산 설정 업데이트', error, { field, settings });
            return { success: false, message: '예산 설정 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // 모든 학생 예산 재계산
    async recalculateAllStudentBudgets() {
        try {
            const client = await this.ensureClient();
            // 승인된 수업계획이 있는 학생들 조회
            const { data: approvedPlans, error } = await client
                .from('lesson_plans')
                .select('user_id, lessons')
                .eq('status', 'approved');

            if (error) {
                this.logError('승인된 수업계획 조회', error);
                return;
            }

            // 각 학생의 예산 재계산 및 업데이트
            for (const plan of approvedPlans) {
                await this.allocateBudgetForStudent(plan.user_id, plan.lessons);
            }

            this.logSuccess('전체 학생 예산 재계산', `${approvedPlans.length}명 처리`);
        } catch (error) {
            this.logError('전체 학생 예산 재계산', error);
        }
    },

    // ===================
    // 시스템 설정 관련 함수들
    // ===================

    // 시스템 설정 조회
    async getSystemSettings() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('system_settings')
                .select('setting_key, setting_value, setting_type');

            if (error) {
                this.logError('시스템 설정 조회', error);
                // 기본 설정 반환
                const config = await waitForConfig();
                return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {};
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
                        this.logError('JSON 설정 파싱', e, { key: item.setting_key, value: item.setting_value });
                    }
                }

                settings[item.setting_key] = value;
            });

            this.logSuccess('시스템 설정 조회', `${Object.keys(settings).length}개 설정`);
            return settings;
        } catch (error) {
            this.logError('시스템 설정 조회', error);
            // 기본 설정 반환
            const config = await waitForConfig();
            return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {};
        }
    },

    // 시스템 설정 업데이트
    async updateSystemSetting(key, value) {
        try {
            const client = await this.ensureClient();
            let stringValue = value;
            let settingType = 'string';

            if (typeof value === 'boolean') {
                stringValue = value.toString();
                settingType = 'boolean';
            } else if (typeof value === 'object') {
                stringValue = JSON.stringify(value);
                settingType = 'json';
            } else if (typeof value === 'number') {
                stringValue = value.toString();
                settingType = 'number';
            }

            // 먼저 기존 설정이 있는지 확인
            const { data: existing, error: findError } = await client
                .from('system_settings')
                .select('id')
                .eq('setting_key', key)
                .single();

            let result;
            const settingData = {
                setting_key: key,
                setting_value: stringValue,
                setting_type: settingType,
                updated_at: new Date().toISOString()
            };

            if (existing) {
                // 업데이트
                const { data, error } = await client
                    .from('system_settings')
                    .update(settingData)
                    .eq('setting_key', key)
                    .select();
                result = { data, error };
            } else {
                // 새로 생성
                const { data, error } = await client
                    .from('system_settings')
                    .insert([settingData])
                    .select();
                result = { data, error };
            }

            if (result.error) {
                this.logError('시스템 설정 업데이트', result.error, { key, value });
                return { success: false, message: '시스템 설정 업데이트 중 오류가 발생했습니다.' };
            }

            this.logSuccess('시스템 설정 업데이트', { key, value });
            return { success: true, data: result.data[0] };
        } catch (error) {
            this.logError('시스템 설정 업데이트', error, { key, value });
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
                this.logSuccess('테스트 모드 토글', `테스트 모드: ${newValue ? 'ON' : 'OFF'}`);
                return newValue;
            }
            
            return settings.test_mode;
        } catch (error) {
            this.logError('테스트 모드 토글', error);
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
            this.logError('수업계획 수정 가능 여부 확인', error);
            return false;
        }
    },

    // ===================
    // 학생 관련 함수들
    // ===================

    // 모든 학생 조회
    async getAllStudents() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .order('name');

            if (error) {
                this.logError('학생 목록 조회', error);
                return [];
            }

            this.logSuccess('학생 목록 조회', `${data.length}명`);
            return data;
        } catch (error) {
            this.logError('학생 목록 조회', error);
            return [];
        }
    },

    // 학생 정보 조회
    async getStudentById(studentId) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('id', studentId)
                .eq('user_type', 'student')
                .single();

            if (error) {
                if (error.code !== 'PGRST116') {
                    this.logError('학생 정보 조회', error, { studentId });
                }
                return null;
            }

            return data;
        } catch (error) {
            this.logError('학생 정보 조회', error, { studentId });
            return null;
        }
    },

    // 학생 예산 상태 조회
    async getStudentBudgetStatus(studentId) {
        try {
            const client = await this.ensureClient();
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) return null;

            // 학생의 예산 정보 조회
            const { data: budgetData, error: budgetError } = await client
                .from('student_budgets')
                .select('*')
                .eq('user_id', studentId)
                .single();

            // 수업계획 상태 조회
            const { data: lessonPlan, error: planError } = await client
                .from('lesson_plans')
                .select('status')
                .eq('user_id', studentId)
                .single();

            // 사용한 예산 계산 (승인됨 + 구매완료)
            const { data: approvedRequests, error: requestError } = await client
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
            this.logError('학생 예산 상태 조회', error, { studentId });
            return null;
        }
    },

    // ===================
    // 수업계획 관련 함수들 - 에러 핸들링 강화
    // ===================

    // 수업계획 저장/업데이트 - 개선된 버전
    async saveLessonPlan(studentId, planData, isDraft = false) {
        try {
            console.log('🔄 수업계획 저장 시작:', { studentId, isDraft, dataKeys: Object.keys(planData) });
            
            const client = await this.ensureClient();
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            const lessonPlanData = {
                user_id: studentId,
                status: status,
                lessons: planData,
                submitted_at: submitTime,
                updated_at: new Date().toISOString()
            };

            console.log('📝 저장할 데이터:', {
                user_id: studentId,
                status,
                lessonsDataType: typeof planData,
                lessonsDataSize: JSON.stringify(planData).length
            });

            // 기존 수업계획이 있는지 확인
            const { data: existing, error: findError } = await client
                .from('lesson_plans')
                .select('id')
                .eq('user_id', studentId)
                .single();

            if (findError && findError.code !== 'PGRST116') {
                console.error('기존 데이터 조회 오류:', findError);
                this.logError('기존 수업계획 조회', findError, { studentId });
            }

            let result;
            if (existing) {
                console.log('📄 기존 수업계획 업데이트 중...', existing.id);
                // 업데이트
                const { data, error } = await client
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select()
                    .single();
                result = { data, error };
            } else {
                console.log('📄 새 수업계획 생성 중...');
                // 새로 생성
                const { data, error } = await client
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select()
                    .single();
                result = { data, error };
            }

            if (result.error) {
                console.error('💥 수업계획 저장 실패:', result.error);
                this.logError('수업계획 저장', result.error, { studentId, isDraft });
                return { 
                    success: false, 
                    message: `수업계획 저장 중 오류가 발생했습니다: ${result.error.message || '알 수 없는 오류'}` 
                };
            }

            console.log('✅ 수업계획 저장 성공:', result.data.id);
            this.logSuccess('수업계획 저장', { studentId, status, isDraft, id: result.data.id });
            return { success: true, data: result.data };
        } catch (error) {
            console.error('🚨 수업계획 저장 예외 발생:', error);
            this.logError('수업계획 저장', error, { studentId, isDraft });
            return { 
                success: false, 
                message: `수업계획 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}` 
            };
        }
    },

    // 학생 수업계획 조회
    async getStudentLessonPlan(studentId) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId)
                .single();

            if (error && error.code !== 'PGRST116') {
                this.logError('학생 수업계획 조회', error, { studentId });
                return null;
            }

            return data || null;
        } catch (error) {
            this.logError('학생 수업계획 조회', error, { studentId });
            return null;
        }
    },

    // 모든 수업계획 조회 (관리자용)
    async getAllLessonPlans() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                this.logError('전체 수업계획 조회', error);
                return [];
            }

            this.logSuccess('전체 수업계획 조회', `${data.length}개`);
            return data;
        } catch (error) {
            this.logError('전체 수업계획 조회', error);
            return [];
        }
    },

    // 대기 중인 수업계획 조회
    async getPendingLessonPlans() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .eq('status', 'submitted')
                .order('submitted_at');

            if (error) {
                this.logError('대기 중인 수업계획 조회', error);
                return [];
            }

            this.logSuccess('대기 중인 수업계획 조회', `${data.length}개`);
            return data;
        } catch (error) {
            this.logError('대기 중인 수업계획 조회', error);
            return [];
        }
    },

    // 수업계획 승인
    async approveLessonPlan(studentId) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
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
                this.logError('수업계획 승인', error, { studentId });
                return { success: false, message: '수업계획 승인 중 오류가 발생했습니다.' };
            }

            // 예산 배정
            const budgetInfo = await this.allocateBudgetForStudent(studentId, data.lessons);
            this.logSuccess('수업계획 승인', { studentId, budgetInfo });
            
            return { 
                success: true, 
                message: '수업계획이 승인되었습니다.',
                budgetInfo: budgetInfo
            };
        } catch (error) {
            this.logError('수업계획 승인', error, { studentId });
            return { success: false, message: '수업계획 승인 중 오류가 발생했습니다.' };
        }
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, reason) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('lesson_plans')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();

            if (error) {
                this.logError('수업계획 반려', error, { studentId, reason });
                return { success: false, message: '수업계획 반려 중 오류가 발생했습니다.' };
            }

            // 예산 회수
            await this.revokeBudgetForStudent(studentId);
            this.logSuccess('수업계획 반려', { studentId, reason });

            return { success: true, message: '수업계획이 반려되었습니다.' };
        } catch (error) {
            this.logError('수업계획 반려', error, { studentId, reason });
            return { success: false, message: '수업계획 반려 중 오류가 발생했습니다.' };
        }
    },

    // 학생 예산 배정 (수업계획 승인 시)
    async allocateBudgetForStudent(studentId, lessonData) {
        try {
            const client = await this.ensureClient();
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) return null;

            // 예산 설정 조회
            const budgetSettings = await this.getAllFieldBudgetSettings();
            const fieldSettings = budgetSettings[student.field];
            if (!fieldSettings) return null;

            // 총 수업 횟수 계산
            const totalLessons = lessonData?.totalLessons || (Array.isArray(lessonData?.lessons) ? lessonData.lessons.length : 0);
            const calculatedBudget = totalLessons * fieldSettings.perLessonAmount;
            const finalBudget = Math.min(calculatedBudget, fieldSettings.maxBudget);

            // 기존 예산 정보가 있는지 확인
            const { data: existingBudget, error: findError } = await client
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
                const { data, error } = await client
                    .from('student_budgets')
                    .update(budgetData)
                    .eq('user_id', studentId)
                    .select()
                    .single();
                budgetResult = { data, error };
            } else {
                // 새로 생성
                const { data, error } = await client
                    .from('student_budgets')
                    .insert([budgetData])
                    .select()
                    .single();
                budgetResult = { data, error };
            }

            if (budgetResult.error) {
                this.logError('예산 배정', budgetResult.error, { studentId, finalBudget });
                return null;
            }

            const result = {
                allocated: finalBudget,
                calculated: calculatedBudget,
                perLessonAmount: fieldSettings.perLessonAmount,
                maxBudget: fieldSettings.maxBudget,
                isCapReached: calculatedBudget > fieldSettings.maxBudget
            };

            this.logSuccess('예산 배정', { studentId, ...result });
            return result;
        } catch (error) {
            this.logError('예산 배정', error, { studentId });
            return null;
        }
    },

    // 학생 예산 회수 (수업계획 반려 시)
    async revokeBudgetForStudent(studentId) {
        try {
            const client = await this.ensureClient();
            const { error } = await client
                .from('student_budgets')
                .update({
                    allocated_budget: 0,
                    used_budget: 0,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId);

            if (error) {
                this.logError('예산 회수', error, { studentId });
                return false;
            }

            this.logSuccess('예산 회수', { studentId });
            return true;
        } catch (error) {
            this.logError('예산 회수', error, { studentId });
            return false;
        }
    },

    // ===================
    // 교구 신청 관련 함수들
    // ===================

    // 학생 신청 내역 조회
    async getStudentApplications(studentId) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });

            if (error) {
                this.logError('학생 신청 내역 조회', error, { studentId });
                return [];
            }

            return data;
        } catch (error) {
            this.logError('학생 신청 내역 조회', error, { studentId });
            return [];
        }
    },

    // 교구 신청 추가
    async addApplication(studentId, itemData) {
        try {
            const client = await this.ensureClient();
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

            const { data, error } = await client
                .from('requests')
                .insert([requestData])
                .select()
                .single();

            if (error) {
                this.logError('교구 신청 추가', error, { studentId, itemName: itemData.name });
                return { success: false, message: '교구 신청 중 오류가 발생했습니다.' };
            }

            this.logSuccess('교구 신청 추가', { studentId, itemName: itemData.name, price: itemData.price });
            return { success: true, data: data };
        } catch (error) {
            this.logError('교구 신청 추가', error, { studentId, itemData });
            return { success: false, message: '교구 신청 중 오류가 발생했습니다.' };
        }
    },

    // 신청 아이템 수정
    async updateApplicationItem(studentId, itemId, updatedData) {
        try {
            const client = await this.ensureClient();
            // 먼저 해당 신청이 수정 가능한 상태인지 확인
            const { data: existing, error: checkError } = await client
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

            const { data, error } = await client
                .from('requests')
                .update(updateData)
                .eq('id', itemId)
                .eq('user_id', studentId)
                .select()
                .single();

            if (error) {
                this.logError('신청 아이템 수정', error, { studentId, itemId });
                return { success: false, message: '신청 수정 중 오류가 발생했습니다.' };
            }

            this.logSuccess('신청 아이템 수정', { studentId, itemId, itemName: updatedData.name });
            return { success: true, data: data };
        } catch (error) {
            this.logError('신청 아이템 수정', error, { studentId, itemId });
            return { success: false, message: '신청 수정 중 오류가 발생했습니다.' };
        }
    },

    // 신청 아이템 삭제
    async deleteApplicationItem(studentId, itemId) {
        try {
            const client = await this.ensureClient();
            // 먼저 해당 신청이 삭제 가능한 상태인지 확인
            const { data: existing, error: checkError } = await client
                .from('requests')
                .select('status, item_name')
                .eq('id', itemId)
                .eq('user_id', studentId)
                .single();

            if (checkError || !existing || existing.status !== 'pending') {
                return { success: false, message: '삭제할 수 없는 신청입니다.' };
            }

            const { error } = await client
                .from('requests')
                .delete()
                .eq('id', itemId)
                .eq('user_id', studentId);

            if (error) {
                this.logError('신청 아이템 삭제', error, { studentId, itemId });
                return { success: false, message: '신청 삭제 중 오류가 발생했습니다.' };
            }

            this.logSuccess('신청 아이템 삭제', { studentId, itemId, itemName: existing.item_name });
            return { success: true };
        } catch (error) {
            this.logError('신청 아이템 삭제', error, { studentId, itemId });
            return { success: false, message: '신청 삭제 중 오류가 발생했습니다.' };
        }
    },

    // 아이템 상태 업데이트 (관리자용)
    async updateItemStatus(requestId, status, rejectionReason = null) {
        try {
            const client = await this.ensureClient();
            const updateData = {
                status: status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: this.currentUser?.id
            };

            if (rejectionReason) {
                updateData.rejection_reason = rejectionReason;
            }

            const { data, error } = await client
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select()
                .single();

            if (error) {
                this.logError('아이템 상태 업데이트', error, { requestId, status });
                return { success: false, message: '상태 업데이트 중 오류가 발생했습니다.' };
            }

            this.logSuccess('아이템 상태 업데이트', { requestId, status, itemName: data.item_name });
            return { success: true, data: data };
        } catch (error) {
            this.logError('아이템 상태 업데이트', error, { requestId, status });
            return { success: false, message: '상태 업데이트 중 오류가 발생했습니다.' };
        }
    },

    // 전체 신청 목록 조회 (관리자용)
    async getAllApplications() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                this.logError('전체 신청 목록 조회', error);
                return [];
            }

            this.logSuccess('전체 신청 목록 조회', `${data.length}개`);
            return data;
        } catch (error) {
            this.logError('전체 신청 목록 조회', error);
            return [];
        }
    },

    // 신청 검색
    async searchApplications(searchTerm) {
        try {
            const client = await this.ensureClient();
            if (!searchTerm || !searchTerm.trim()) {
                return await this.getAllApplications();
            }

            const term = searchTerm.trim();
            const { data, error } = await client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute)
                `)
                .or(`item_name.ilike.%${term}%,purpose.ilike.%${term}%,user_profiles.name.ilike.%${term}%`)
                .order('created_at', { ascending: false });

            if (error) {
                this.logError('신청 검색', error, { searchTerm: term });
                return [];
            }

            this.logSuccess('신청 검색', `"${term}" 검색 결과: ${data.length}개`);
            return data;
        } catch (error) {
            this.logError('신청 검색', error, { searchTerm });
            return [];
        }
    },

    // ===================
    // 영수증 관리 관련 함수들
    // ===================

    // 영수증 제출
    async submitReceipt(requestId, receiptData) {
        try {
            const client = await this.ensureClient();
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

            const { data, error } = await client
                .from('receipts')
                .insert([receiptRecord])
                .select()
                .single();

            if (error) {
                this.logError('영수증 제출', error, { requestId });
                return { success: false, message: '영수증 제출 중 오류가 발생했습니다.' };
            }

            // 교구 신청 상태를 구매완료로 업데이트
            await this.updateItemStatus(requestId, 'purchased');
            this.logSuccess('영수증 제출', { requestId, receiptNumber: data.receipt_number });

            return { success: true, data: data };
        } catch (error) {
            this.logError('영수증 제출', error, { requestId });
            return { success: false, message: '영수증 제출 중 오류가 발생했습니다.' };
        }
    },

    // 영수증 조회 (특정 신청)
    async getReceiptByRequestId(requestId) {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('receipts')
                .select('*')
                .eq('request_id', requestId)
                .single();

            if (error && error.code !== 'PGRST116') {
                this.logError('영수증 조회', error, { requestId });
                return null;
            }

            return data || null;
        } catch (error) {
            this.logError('영수증 조회', error, { requestId });
            return null;
        }
    },

    // 영수증 검증 (관리자용)
    async verifyReceipt(receiptId, verified = true) {
        try {
            const client = await this.ensureClient();
            const updateData = {
                verified: verified,
                verified_at: new Date().toISOString(),
                verified_by: this.currentUser?.id
            };

            const { data, error } = await client
                .from('receipts')
                .update(updateData)
                .eq('id', receiptId)
                .select()
                .single();

            if (error) {
                this.logError('영수증 검증', error, { receiptId, verified });
                return { success: false, message: '영수증 검증 중 오류가 발생했습니다.' };
            }

            this.logSuccess('영수증 검증', { receiptId, verified });
            return { success: true, data: data };
        } catch (error) {
            this.logError('영수증 검증', error, { receiptId, verified });
            return { success: false, message: '영수증 검증 중 오류가 발생했습니다.' };
        }
    },

    // ===================
    // 통계 및 관리 함수들
    // ===================

    // 관리자용 통계 데이터
    async getStats() {
        try {
            const client = await this.ensureClient();
            
            // 병렬로 데이터 조회하여 성능 향상
            const [
                { count: totalStudents },
                { data: requests },
                { data: applicants }
            ] = await Promise.all([
                client.from('user_profiles').select('*', { count: 'exact', head: true }).eq('user_type', 'student'),
                client.from('requests').select('status'),
                client.from('requests').select('user_id').not('user_id', 'is', null)
            ]);

            const stats = {
                totalStudents: totalStudents || 0,
                applicantCount: 0,
                pendingCount: 0,
                approvedCount: 0,
                rejectedCount: 0,
                purchasedCount: 0
            };

            if (applicants) {
                const uniqueApplicants = new Set(applicants.map(r => r.user_id));
                stats.applicantCount = uniqueApplicants.size;
            }

            if (requests) {
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

            this.logSuccess('통계 데이터 조회', stats);
            return stats;
        } catch (error) {
            this.logError('통계 데이터 조회', error);
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
            const client = await this.ensureClient();
            
            // 병렬로 데이터 조회
            const [
                { data: budgets },
                { data: approvedRequests },
                { data: purchasedRequests },
                { data: applicants }
            ] = await Promise.all([
                client.from('student_budgets').select('allocated_budget'),
                client.from('requests').select('price').in('status', ['approved', 'purchased', 'completed']),
                client.from('requests').select('price').in('status', ['purchased', 'completed']),
                client.from('requests').select('user_id').not('user_id', 'is', null)
            ]);

            const totalApprovedBudget = budgets?.reduce((sum, b) => sum + b.allocated_budget, 0) || 0;
            const approvedItemsTotal = approvedRequests?.reduce((sum, r) => sum + r.price, 0) || 0;
            const purchasedTotal = purchasedRequests?.reduce((sum, r) => sum + r.price, 0) || 0;

            const uniqueApplicants = new Set(applicants?.map(r => r.user_id) || []);
            const applicantCount = uniqueApplicants.size;
            const averagePerPerson = applicantCount > 0 ? Math.round(approvedItemsTotal / applicantCount) : 0;

            const result = {
                totalApprovedBudget,
                approvedItemsTotal,
                purchasedTotal,
                averagePerPerson
            };

            this.logSuccess('예산 현황 통계 조회', result);
            return result;
        } catch (error) {
            this.logError('예산 현황 통계 조회', error);
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
            const client = await this.ensureClient();
            
            // 병렬로 데이터 조회
            const [
                { count: approvedOffline },
                { data: receipts }
            ] = await Promise.all([
                client.from('requests').select('*', { count: 'exact', head: true }).eq('purchase_type', 'offline').eq('status', 'approved'),
                client.from('receipts').select('request_id')
            ]);

            const withReceipt = receipts?.length || 0;
            const pendingReceipt = Math.max(0, (approvedOffline || 0) - withReceipt);

            const result = {
                approvedOffline: approvedOffline || 0,
                withReceipt,
                pendingReceipt
            };

            this.logSuccess('오프라인 구매 통계 조회', result);
            return result;
        } catch (error) {
            this.logError('오프라인 구매 통계 조회', error);
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
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(name, field, sejong_institute),
                    receipts(receipt_number, verified)
                `)
                .order('created_at', { ascending: false });

            if (error) {
                this.logError('내보내기 데이터 준비', error);
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

            this.logSuccess('내보내기 데이터 준비', `${exportData.length}개 항목`);
            return exportData;
        } catch (error) {
            this.logError('내보내기 데이터 준비', error);
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
    // 연결 테스트 및 상태 확인
    // ===================

    // API 연결 상태 테스트
    async testConnection() {
        try {
            const client = await this.ensureClient();
            const { data, error } = await client
                .from('system_settings')
                .select('setting_key')
                .limit(1);

            if (error) {
                this.logError('연결 테스트', error);
                return { success: false, message: '데이터베이스 연결 실패' };
            }

            this.logSuccess('연결 테스트', '데이터베이스 연결 성공');
            return { success: true, message: '데이터베이스 연결 성공' };
        } catch (error) {
            this.logError('연결 테스트', error);
            return { success: false, message: '연결 테스트 실패' };
        }
    },

    // 헬스 체크
    async healthCheck() {
        try {
            const connectionTest = await this.testConnection();
            const settings = await this.getSystemSettings();
            const budgetSettings = await this.getAllFieldBudgetSettings();
            
            return {
                status: connectionTest.success ? 'healthy' : 'unhealthy',
                connection: connectionTest.success,
                systemSettings: Object.keys(settings).length,
                budgetSettings: Object.keys(budgetSettings).length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            this.logError('헬스 체크', error);
            return {
                status: 'error',
                connection: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }
};

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;

// 초기화 완료 로그
console.log('🚀 SupabaseAPI loaded successfully - Enhanced version with RLS fix');
