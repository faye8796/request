// Supabase 클라이언트 설정 및 API 관리 - 안정적인 버전 v4
// 🔧 라이브러리 로딩 문제 해결 - 간소화된 안정적 버전
// ✅ 학생 시스템 및 관리자 시스템 호환성 확보

// 설정 파일이 로드될 때까지 대기
function waitForConfig() {
    return new Promise((resolve, reject) => {
        if (window.CONFIG) {
            console.log('✅ CONFIG 즉시 사용 가능');
            resolve(window.CONFIG);
            return;
        }
        
        console.log('⏳ CONFIG 로드 대기 중...');
        let waitCount = 0;
        const maxWait = 100; // 10초
        
        const checkConfig = setInterval(() => {
            waitCount++;
            
            if (window.CONFIG) {
                clearInterval(checkConfig);
                console.log(`✅ CONFIG 로드 완료 (${waitCount * 100}ms 소요)`);
                resolve(window.CONFIG);
            } else if (waitCount >= maxWait) {
                clearInterval(checkConfig);
                console.error('❌ CONFIG 로드 타임아웃');
                reject(new Error('시스템 설정을 불러올 수 없습니다. 페이지를 새로고침해주세요.'));
            }
        }, 100);
    });
}

// Supabase 클라이언트 초기화 - 간소화된 안정적 버전
let supabaseClient = null;
let initializationPromise = null;
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// 간단한 Supabase 라이브러리 확인
function getSupabaseCreateClient() {
    // 방법 1: window.supabase (가장 일반적)
    if (window.supabase && typeof window.supabase.createClient === 'function') {
        console.log('📦 Supabase 라이브러리 감지: window.supabase');
        return window.supabase.createClient;
    }
    
    // 방법 2: 전역 supabase 변수
    if (typeof supabase !== 'undefined' && typeof supabase.createClient === 'function') {
        console.log('📦 Supabase 라이브러리 감지: global supabase');
        return supabase.createClient;
    }
    
    console.error('❌ Supabase 라이브러리를 찾을 수 없습니다.');
    return null;
}

// 클라이언트 초기화 함수 - 간소화된 버전
async function initializeSupabaseClient() {
    if (supabaseClient) {
        console.log('✅ 기존 Supabase 클라이언트 재사용');
        return supabaseClient;
    }
    
    if (initializationPromise) {
        console.log('⏳ 진행 중인 초기화 프로세스 대기...');
        return initializationPromise;
    }
    
    initializationPromise = (async () => {
        try {
            console.log('🚀 Supabase 클라이언트 초기화 시작...');
            
            // 1. 네트워크 연결 확인
            if (!navigator.onLine) {
                throw new Error('인터넷 연결이 없습니다. 네트워크 연결을 확인해주세요.');
            }
            
            // 2. CONFIG 로드 대기
            console.log('⚙️ 설정 파일 로드 중...');
            const config = await waitForConfig();
            console.log('✅ 설정 파일 로드 완료');
            
            if (!config?.SUPABASE?.URL || !config?.SUPABASE?.ANON_KEY) {
                throw new Error('필수 Supabase 설정이 누락되었습니다.');
            }
            
            // 3. Supabase 라이브러리 확인 (간소화됨)
            console.log('📚 Supabase 라이브러리 확인 중...');
            const createClient = getSupabaseCreateClient();
            
            if (!createClient) {
                // 라이브러리가 아직 로드되지 않았을 수 있으니 잠시 대기
                console.log('⏳ Supabase 라이브러리 로드 대기...');
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                const retryCreateClient = getSupabaseCreateClient();
                if (!retryCreateClient) {
                    throw new Error('Supabase 라이브러리를 불러오지 못했습니다. 페이지를 새로고침해주세요.');
                }
                
                console.log('✅ Supabase 라이브러리 확인 완료 (재시도 성공)');
                
                // 4. 클라이언트 생성
                supabaseClient = retryCreateClient(
                    config.SUPABASE.URL,
                    config.SUPABASE.ANON_KEY,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                );
            } else {
                console.log('✅ Supabase 라이브러리 확인 완료');
                
                // 4. 클라이언트 생성
                supabaseClient = createClient(
                    config.SUPABASE.URL,
                    config.SUPABASE.ANON_KEY,
                    {
                        auth: {
                            persistSession: false,
                            autoRefreshToken: false,
                            detectSessionInUrl: false
                        }
                    }
                );
            }
            
            if (!supabaseClient) {
                throw new Error('Supabase 클라이언트 생성에 실패했습니다.');
            }
            
            console.log('✅ Supabase 클라이언트 생성 완료');
            
            // 5. 간단한 연결 테스트
            try {
                console.log('🔍 데이터베이스 연결 테스트 중...');
                const testQuery = await supabaseClient
                    .from('system_settings')
                    .select('setting_key')
                    .limit(1);
                
                // 테이블이 없어도 연결 자체는 성공으로 간주
                console.log('✅ 데이터베이스 연결 테스트 완료');
                
            } catch (testError) {
                console.warn('⚠️ 연결 테스트 중 오류 (클라이언트는 정상):', testError.message);
            }
            
            console.log('🎉 Supabase 클라이언트 초기화 완료');
            connectionRetryCount = 0; // 성공 시 재시도 카운트 리셋
            
            return supabaseClient;
            
        } catch (error) {
            console.error('❌ Supabase 클라이언트 초기화 실패:', error);
            connectionRetryCount++;
            
            // 재시도 로직
            if (connectionRetryCount < MAX_RETRY_COUNT) {
                const retryDelay = 2000 * connectionRetryCount;
                console.log(`🔄 재시도 중... (${connectionRetryCount}/${MAX_RETRY_COUNT}) - ${retryDelay}ms 후`);
                
                await new Promise(resolve => setTimeout(resolve, retryDelay));
                
                // 재시도를 위해 Promise 초기화
                initializationPromise = null;
                return initializeSupabaseClient();
            }
            
            // 최종 실패 시 사용자 친화적 메시지
            let userFriendlyMessage = error.message;
            if (error.message.includes('fetch') || error.message.includes('network')) {
                userFriendlyMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
            } else if (error.message.includes('라이브러리')) {
                userFriendlyMessage = 'Supabase 라이브러리 로딩에 문제가 있습니다. 페이지를 새로고침해주세요.';
            }
            
            const enhancedError = new Error(userFriendlyMessage);
            enhancedError.originalError = error;
            enhancedError.retryCount = connectionRetryCount;
            
            throw enhancedError;
        }
    })();
    
    return initializationPromise;
}

// 즉시 초기화 시작 (안전한 방식)
(async () => {
    try {
        // 페이지 로드 직후 약간 대기
        await new Promise(resolve => setTimeout(resolve, 200));
        await initializeSupabaseClient();
    } catch (error) {
        console.warn('⚠️ 초기 Supabase 클라이언트 초기화 지연됨:', error.message);
    }
})();

// Supabase API 관리자 - 안정적이고 간소화된 버전
const SupabaseAPI = {
    get client() {
        return supabaseClient;
    },
    currentUser: null,
    currentUserType: null,

    // 클라이언트가 초기화될 때까지 대기하는 헬퍼 함수
    async ensureClient() {
        if (this.client) {
            return this.client;
        }
        
        if (initializationPromise) {
            try {
                await initializationPromise;
            } catch (error) {
                console.error('❌ 초기화 대기 중 오류:', error);
            }
        }
        
        if (!this.client) {
            try {
                console.log('🔄 클라이언트 재초기화 시도...');
                await initializeSupabaseClient();
            } catch (error) {
                console.error('❌ 클라이언트 재초기화 실패:', error);
                throw new Error(`서비스 연결 실패: ${error.message}`);
            }
        }
        
        if (!this.client) {
            throw new Error('데이터베이스 연결을 설정할 수 없습니다. 페이지를 새로고침해주세요.');
        }
        
        return this.client;
    },

    // 안전한 API 호출 래퍼
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            const result = await apiFunction();
            
            if (result.error) {
                this.logError(operation, result.error, context);
                return { 
                    success: false, 
                    message: this.getErrorMessage(result.error, operation), 
                    error: result.error 
                };
            }
            
            this.logSuccess(operation, result.data);
            return { success: true, data: result.data };
        } catch (error) {
            this.logError(operation, error, context);
            
            if (this.isNetworkError(error)) {
                return { 
                    success: false, 
                    message: '네트워크 연결을 확인하고 다시 시도해주세요.', 
                    error: error,
                    isNetworkError: true 
                };
            }
            
            return { 
                success: false, 
                message: this.getErrorMessage(error, operation), 
                error: error 
            };
        }
    },

    // 네트워크 에러 판별
    isNetworkError(error) {
        return error?.message?.includes('fetch') ||
               error?.message?.includes('network') ||
               error?.message?.includes('Failed to fetch') ||
               error?.message?.includes('timeout');
    },

    // 에러 메시지 처리
    getErrorMessage(error, operation = '') {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            if (error.message.includes('PGRST116')) {
                return '요청하신 데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied')) {
                return '접근 권한이 없습니다. 다시 로그인해주세요.';
            }
            if (error.message.includes('duplicate key')) {
                return '이미 존재하는 데이터입니다.';
            }
            if (error.message.includes('not null')) {
                return '필수 정보가 누락되었습니다.';
            }
            if (error.message.includes('timeout')) {
                return '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            }
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return '네트워크 연결을 확인하고 다시 시도해주세요.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다. 관리자에게 문의해주세요.';
    },

    // 에러 로깅 헬퍼
    logError(operation, error, context = {}) {
        const config = window.CONFIG;
        if (config?.DEV?.ENABLE_CONSOLE_LOGS) {
            console.group(`❌ ${operation} 오류`);
            console.error('Error:', error);
            console.log('Context:', context);
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
        const result = await this.safeApiCall('학생 인증', async () => {
            const client = await this.ensureClient();
            
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error) {
                return { data: null, error };
            }

            const user = data && data.length > 0 ? data[0] : null;
            return { data: user, error: null };
        }, { name, birthDate });

        // 인증 성공 시 현재 사용자 설정
        if (result.success && result.data) {
            this.currentUser = result.data;
            this.currentUserType = 'student';
            
            try {
                sessionStorage.setItem('userSession', JSON.stringify({
                    user: result.data,
                    userType: 'student',
                    loginTime: new Date().toISOString()
                }));
            } catch (error) {
                console.warn('세션 저장 실패:', error);
            }
            
            this.logSuccess('학생 인증 및 세션 설정', result.data.name);
        }

        return result;
    },

    // 관리자 인증 (관리자 코드)
    async authenticateAdmin(code) {
        try {
            const config = await waitForConfig();
            if (code !== config.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const result = await this.safeApiCall('관리자 인증', async () => {
                const client = await this.ensureClient();
                
                const { data, error } = await client
                    .from('user_profiles')
                    .select('*')
                    .eq('user_type', 'admin');

                if (error) {
                    return { data: null, error };
                }

                const admin = data && data.length > 0 ? data[0] : null;
                return { data: admin, error: null };
            });

            if (result.success) {
                let adminUser = result.data;
                if (!adminUser) {
                    // 관리자 계정이 없으면 생성
                    const createResult = await this.safeApiCall('관리자 계정 생성', async () => {
                        const client = await this.ensureClient();
                        return await client
                            .from('user_profiles')
                            .insert([{
                                email: 'admin@sejong.or.kr',
                                name: '관리자',
                                user_type: 'admin'
                            }])
                            .select();
                    });

                    if (createResult.success && createResult.data && createResult.data.length > 0) {
                        adminUser = createResult.data[0];
                    } else {
                        return { success: false, message: '관리자 계정 생성 중 오류가 발생했습니다.' };
                    }
                }

                this.currentUser = adminUser;
                this.currentUserType = 'admin';
                
                try {
                    sessionStorage.setItem('userSession', JSON.stringify({
                        user: adminUser,
                        userType: 'admin',
                        loginTime: new Date().toISOString()
                    }));
                } catch (error) {
                    console.warn('관리자 세션 저장 실패:', error);
                }
                
                return { success: true, data: adminUser };
            }

            return result;
        } catch (error) {
            this.logError('관리자 인증', error);
            return { 
                success: false, 
                message: this.getErrorMessage(error, '관리자 인증') 
            };
        }
    },

    // 로그아웃
    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        try {
            sessionStorage.removeItem('userSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
        this.logSuccess('로그아웃');
    },

    // ===================
    // 학생 관련 함수들
    // ===================

    // 학생 정보 조회
    async getStudentById(studentId) {
        const result = await this.safeApiCall('학생 정보 조회', async () => {
            const client = await this.ensureClient();
            
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('id', studentId)
                .eq('user_type', 'student');

            if (error) {
                return { data: null, error };
            }

            const student = data && data.length > 0 ? data[0] : null;
            return { data: student, error: null };
        }, { studentId });

        return result.success ? result.data : null;
    },

    // 학생 예산 상태 조회
    async getStudentBudgetStatus(studentId) {
        const result = await this.safeApiCall('학생 예산 상태 조회', async () => {
            const client = await this.ensureClient();
            
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) {
                throw new Error('학생 정보를 찾을 수 없습니다');
            }

            // 학생의 예산 정보 조회
            const budgetResult = await client
                .from('student_budgets')
                .select('*')
                .eq('user_id', studentId);

            // 수업계획 상태 조회
            const planResult = await client
                .from('lesson_plans')
                .select('status')
                .eq('user_id', studentId);

            // 사용한 예산 계산
            const requestsResult = await client
                .from('requests')
                .select('price')
                .eq('user_id', studentId)
                .in('status', ['approved', 'purchased', 'completed']);

            return {
                data: {
                    student,
                    budget: budgetResult.data && budgetResult.data.length > 0 ? budgetResult.data[0] : null,
                    plan: planResult.data && planResult.data.length > 0 ? planResult.data[0] : null,
                    requests: requestsResult.data || []
                },
                error: null
            };
        }, { studentId });

        if (result.success) {
            const { student, budget, plan, requests } = result.data;
            const usedBudget = requests.reduce((sum, req) => sum + req.price, 0);
            const allocated = budget?.allocated_budget || 0;
            const lessonPlanStatus = plan?.status || 'draft';
            const canApplyForEquipment = lessonPlanStatus === 'approved';

            return {
                allocated: allocated,
                used: usedBudget,
                remaining: Math.max(0, allocated - usedBudget),
                field: student.field,
                lessonPlanStatus: lessonPlanStatus,
                canApplyForEquipment: canApplyForEquipment
            };
        }

        return null;
    },

    // ===================
    // 수업계획 관련 함수들
    // ===================

    // 학생 수업계획 조회
    async getStudentLessonPlan(studentId) {
        const result = await this.safeApiCall('학생 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            const { data, error } = await client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            const plan = data && data.length > 0 ? data[0] : null;
            return { data: plan, error: null };
        }, { studentId });

        return result.success ? result.data : null;
    },

    // 수업계획 저장/업데이트
    async saveLessonPlan(studentId, planData, isDraft = false) {
        console.log('🔄 수업계획 저장 시작:', { studentId, isDraft, dataKeys: Object.keys(planData) });
        
        const result = await this.safeApiCall('수업계획 저장', async () => {
            const client = await this.ensureClient();
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            // 기존 수업계획 확인
            const existingResult = await client
                .from('lesson_plans')
                .select('id, status, approved_at, approved_by')
                .eq('user_id', studentId);

            const isReSubmission = existingResult.data && 
                                  existingResult.data.length > 0 && 
                                  existingResult.data[0].approved_at && 
                                  !isDraft;

            const lessonPlanData = {
                user_id: studentId,
                status: status,
                lessons: planData,
                submitted_at: submitTime,
                updated_at: new Date().toISOString()
            };

            // 재제출인 경우 승인 정보 초기화
            if (isReSubmission) {
                console.log('🔄 수업계획 재제출 감지 - 승인 정보 초기화');
                lessonPlanData.approved_at = null;
                lessonPlanData.approved_by = null;
                lessonPlanData.rejection_reason = null;
            }

            if (existingResult.data && existingResult.data.length > 0) {
                // 업데이트
                return await client
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
            } else {
                // 새로 생성
                return await client
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
            }
        }, { studentId, isDraft });

        return result;
    },

    // ===================
    // 교구 신청 관련 함수들
    // ===================

    // 학생 신청 내역 조회
    async getStudentApplications(studentId) {
        const result = await this.safeApiCall('학생 신청 내역 조회', async () => {
            const client = await this.ensureClient();
            return await client
                .from('requests')
                .select('*')
                .eq('user_id', studentId)
                .order('created_at', { ascending: false });
        }, { studentId });

        return result.success ? (result.data || []) : [];
    },

    // 교구 신청 생성
    async createApplication(studentId, formData) {
        console.log('🛒 교구 신청 생성:', { studentId, formData });
        
        return await this.safeApiCall('교구 신청 생성', async () => {
            const client = await this.ensureClient();
            
            const requestData = {
                user_id: studentId,
                item_name: formData.item_name,
                purpose: formData.purpose,
                price: formData.price,
                purchase_type: formData.purchase_type || 'online',
                purchase_link: formData.purchase_link || null,
                is_bundle: formData.is_bundle || false,
                status: 'pending',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            return await client
                .from('requests')
                .insert([requestData])
                .select();
        }, { studentId, itemName: formData.item_name });
    },

    // ===================
    // 시스템 설정 관련 함수들
    // ===================

    // 시스템 설정 조회
    async getSystemSettings() {
        const result = await this.safeApiCall('시스템 설정 조회', async () => {
            const client = await this.ensureClient();
            return await client
                .from('system_settings')
                .select('setting_key, setting_value, setting_type');
        });

        if (result.success) {
            const settings = {};
            (result.data || []).forEach(item => {
                let value = item.setting_value;
                
                if (item.setting_type === 'boolean') {
                    value = value === 'true';
                } else if (item.setting_type === 'number') {
                    value = parseInt(value);
                } else if (item.setting_type === 'json') {
                    try {
                        value = JSON.parse(value);
                    } catch (e) {
                        console.warn(`JSON 설정 파싱 오류 (${item.setting_key}):`, e);
                    }
                }

                settings[item.setting_key] = value;
            });

            return settings;
        }

        // 기본 설정 반환
        const config = await waitForConfig().catch(() => null);
        return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    },

    // ===================
    // 관리자 전용 함수들
    // ===================

    // 모든 수업계획 조회 (관리자용)
    async getAllLessonPlans() {
        const result = await this.safeApiCall('모든 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // 수업계획 데이터 조회
            const lessonPlansResult = await client
                .from('lesson_plans')
                .select('*')
                .order('created_at', { ascending: false });

            if (lessonPlansResult.error) {
                return { data: null, error: lessonPlansResult.error };
            }

            const lessonPlans = lessonPlansResult.data || [];
            
            if (lessonPlans.length === 0) {
                return { data: [], error: null };
            }

            // 사용자 ID 목록 추출
            const userIds = [...new Set(lessonPlans.map(plan => plan.user_id).filter(id => id))];
            
            // 사용자 프로필 데이터 별도 조회
            let userProfiles = {};
            if (userIds.length > 0) {
                const profilesResult = await client
                    .from('user_profiles')
                    .select('id, name, field, sejong_institute')
                    .in('id', userIds);

                if (profilesResult.data) {
                    profilesResult.data.forEach(profile => {
                        userProfiles[profile.id] = profile;
                    });
                }
            }

            // 데이터 병합
            const enrichedPlans = lessonPlans.map(plan => {
                let approval_status = 'pending';
                
                if (plan.status === 'draft') {
                    approval_status = 'draft';
                } else if (plan.status === 'submitted') {
                    if (plan.approved_at && plan.approved_by && !plan.rejection_reason) {
                        approval_status = 'approved';
                    } else if (plan.rejection_reason && plan.rejection_reason.trim() !== '') {
                        approval_status = 'rejected';
                    } else {
                        approval_status = 'pending';
                    }
                }
                
                const userProfile = userProfiles[plan.user_id] || {
                    id: plan.user_id,
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };
                
                return {
                    ...plan,
                    approval_status,
                    user_profiles: userProfile
                };
            });
            
            console.log('📋 수업계획 조회 결과:', enrichedPlans.length, '건');
            return { data: enrichedPlans, error: null };
        });

        return result.success ? result.data : [];
    },

    // 유틸리티 함수들
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

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    },

    // 연결 테스트
    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            const client = await this.ensureClient();
            return await client
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    }
};

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;

// 전역 supabase 객체 노출 (호환성을 위해)
Object.defineProperty(window, 'supabase', {
    get: function() {
        if (supabaseClient) {
            return supabaseClient;
        }
        console.warn('⚠️ Supabase 클라이언트가 아직 초기화되지 않았습니다.');
        return null;
    },
    enumerable: true,
    configurable: true
});

console.log('🚀 SupabaseAPI v4 loaded - simplified and stable version');
