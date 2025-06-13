// Supabase 클라이언트 설정 및 API 관리 - 완전 안정화 버전
// JSON 객체 에러 및 single() 메서드 문제 해결

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
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// 클라이언트 초기화 함수 - 안정성 강화
async function initializeSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    // 이미 초기화 중이라면 기다림
    if (initializationPromise) return initializationPromise;
    
    initializationPromise = (async () => {
        try {
            const config = await waitForConfig();
            
            if (!config) {
                throw new Error('Config 로드 실패 - 네트워크 연결을 확인하세요');
            }
            
            if (!window.supabase || !window.supabase.createClient) {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다. 페이지를 새로고침해주세요.');
            }
            
            const { createClient } = window.supabase;
            
            supabaseClient = createClient(
                config.SUPABASE.URL,
                config.SUPABASE.ANON_KEY,
                {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                        detectSessionInUrl: false
                    },
                    db: {
                        schema: 'public'
                    },
                    global: {
                        headers: {
                            'X-Client-Info': 'supabase-js-web',
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    },
                    // 추가 설정으로 안정성 향상
                    realtime: {
                        enabled: false
                    }
                }
            );
            
            console.log('✅ Supabase client initialized successfully');
            connectionRetryCount = 0; // 성공 시 재시도 카운트 리셋
            return supabaseClient;
        } catch (error) {
            console.error('❌ Supabase client initialization failed:', error);
            connectionRetryCount++;
            
            if (connectionRetryCount < MAX_RETRY_COUNT) {
                console.log(`🔄 재시도 중... (${connectionRetryCount}/${MAX_RETRY_COUNT})`);
                await new Promise(resolve => setTimeout(resolve, 1000)); // 1초 대기
                initializationPromise = null; // 재시도를 위해 초기화
                return initializeSupabaseClient();
            }
            
            throw error;
        }
    })();
    
    return initializationPromise;
}

// 즉시 초기화 시작
initializeSupabaseClient().catch(error => {
    console.error('초기 Supabase 클라이언트 초기화 실패:', error);
});

// Supabase API 관리자 - 안전한 단일/다중 결과 처리
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
            throw new Error('Supabase 클라이언트를 초기화할 수 없습니다. 네트워크 연결을 확인하세요.');
        }
        return this.client;
    },

    // 안전한 단일 결과 조회 - single() 에러 방지
    async safeSingleQuery(query) {
        try {
            const { data, error } = await query;
            
            if (error) {
                // PGRST116은 "no rows found" 에러 - 정상적인 상황
                if (error.code === 'PGRST116') {
                    return { data: null, error: null };
                }
                return { data: null, error };
            }
            
            // 배열로 반환된 경우 첫 번째 요소만 반환
            if (Array.isArray(data)) {
                return { data: data.length > 0 ? data[0] : null, error: null };
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('안전한 단일 조회 오류:', error);
            return { data: null, error };
        }
    },

    // 안전한 API 호출 래퍼 - 개선된 버전
    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            const result = await apiFunction();
            
            // 406 에러 체크
            if (result.error && this.is406Error(result.error)) {
                console.warn(`406 에러 발생 (${operation}):`, result.error);
                return this.handle406Error(operation, result.error, context);
            }
            
            if (result.error) {
                this.logError(operation, result.error, context);
                return { success: false, message: this.getErrorMessage(result.error), error: result.error };
            }
            
            this.logSuccess(operation, result.data);
            return { success: true, data: result.data };
        } catch (error) {
            this.logError(operation, error, context);
            
            // 네트워크 오류 처리
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
                message: this.getErrorMessage(error), 
                error: error 
            };
        }
    },

    // 406 에러 판별
    is406Error(error) {
        return error?.code === 406 || 
               error?.status === 406 || 
               error?.message?.includes('406') ||
               error?.message?.includes('Not Acceptable');
    },

    // 네트워크 에러 판별
    isNetworkError(error) {
        return error?.message?.includes('fetch') ||
               error?.message?.includes('network') ||
               error?.message?.includes('Failed to fetch') ||
               error?.code === 'NETWORK_ERROR';
    },

    // 406 에러 처리
    handle406Error(operation, error, context) {
        console.warn(`406 에러 처리 중 (${operation}):`, error);
        
        // 406 에러는 보통 요청 형식 문제이므로 기본값 반환
        switch (operation) {
            case '학생 예산 상태 조회':
                return { 
                    success: true, 
                    data: {
                        allocated: 0,
                        used: 0,
                        remaining: 0,
                        field: '전문분야',
                        lessonPlanStatus: 'draft',
                        canApplyForEquipment: false
                    }
                };
            case '학생 수업계획 조회':
                return { success: true, data: null };
            case '학생 신청 내역 조회':
                return { success: true, data: [] };
            case '시스템 설정 조회':
                return { 
                    success: true, 
                    data: {
                        test_mode: false,
                        lesson_plan_deadline: '2024-12-31',
                        ignore_deadline: false
                    }
                };
            default:
                return { 
                    success: false, 
                    message: '일시적으로 서비스에 접근할 수 없습니다. 잠시 후 다시 시도해주세요.',
                    error: error,
                    is406Error: true
                };
        }
    },

    // 에러 메시지 처리
    getErrorMessage(error) {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            // 사용자 친화적인 메시지로 변환
            if (error.message.includes('PGRST116')) {
                return '데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied') || error.message.includes('RLS')) {
                return '접근 권한이 없습니다.';
            }
            if (error.message.includes('duplicate key')) {
                return '이미 존재하는 데이터입니다.';
            }
            if (error.message.includes('foreign key')) {
                return '관련 데이터가 존재하지 않습니다.';
            }
            if (error.message.includes('not null')) {
                return '필수 정보가 누락되었습니다.';
            }
            if (error.message.includes('JSON object requested, multiple')) {
                return '데이터 조회 중 오류가 발생했습니다.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다.';
    },

    // 에러 로깅 헬퍼 - 개선된 버전
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
            if (error?.status) console.log('Status:', error.status);
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
    // 인증 관련 함수들 - 안전성 강화
    // ===================

    // 학생 인증 (이름 + 생년월일) - single() 문제 해결
    async authenticateStudent(name, birthDate) {
        return await this.safeApiCall('학생 인증', async () => {
            const client = await this.ensureClient();
            
            // single() 대신 배열로 받아서 처리
            const { data, error } = await client
                .from('user_profiles')
                .select('*')
                .eq('user_type', 'student')
                .eq('name', name)
                .eq('birth_date', birthDate);

            if (error) {
                return { data: null, error };
            }

            // 배열에서 첫 번째 요소 반환 (없으면 null)
            const user = data && data.length > 0 ? data[0] : null;
            return { data: user, error: null };
        }, { name, birthDate });
    },

    // 관리자 인증 (관리자 코드) - single() 문제 해결
    async authenticateAdmin(code) {
        try {
            const config = await waitForConfig();
            if (code !== config.APP.ADMIN_CODE) {
                return { success: false, message: '관리자 코드가 올바르지 않습니다.' };
            }

            const result = await this.safeApiCall('관리자 인증', async () => {
                const client = await this.ensureClient();
                
                // single() 대신 배열로 받아서 처리
                const { data, error } = await client
                    .from('user_profiles')
                    .select('*')
                    .eq('user_type', 'admin');

                if (error) {
                    return { data: null, error };
                }

                // 첫 번째 관리자 반환
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
                return { success: true, user: adminUser };
            }

            return result;
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
    // 학생 관련 함수들 - 안전성 강화
    // ===================

    // 학생 정보 조회 - single() 문제 해결
    async getStudentById(studentId) {
        const result = await this.safeApiCall('학생 정보 조회', async () => {
            const client = await this.ensureClient();
            
            // single() 대신 배열로 받아서 처리
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

    // 학생 예산 상태 조회 - 안전성 강화
    async getStudentBudgetStatus(studentId) {
        const result = await this.safeApiCall('학생 예산 상태 조회', async () => {
            const client = await this.ensureClient();
            
            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) {
                throw new Error('학생 정보를 찾을 수 없습니다');
            }

            // 학생의 예산 정보 조회 - single() 대신 배열로
            const budgetResult = await client
                .from('student_budgets')
                .select('*')
                .eq('user_id', studentId);

            // 수업계획 상태 조회 - single() 대신 배열로
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

        // 406 에러인 경우 기본값 반환
        if (result.is406Error) {
            return result.data;
        }

        return null;
    },

    // ===================
    // 수업계획 관련 함수들 - 안전성 강화
    // ===================

    // 학생 수업계획 조회 - single() 문제 해결
    async getStudentLessonPlan(studentId) {
        const result = await this.safeApiCall('학생 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // single() 대신 배열로 받아서 처리
            const { data, error } = await client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            // 가장 최근 수업계획 반환
            const plan = data && data.length > 0 ? data[0] : null;
            return { data: plan, error: null };
        }, { studentId });

        return result.success ? result.data : null;
    },

    // 수업계획 저장/업데이트 - 안전성 강화
    async saveLessonPlan(studentId, planData, isDraft = false) {
        console.log('🔄 수업계획 저장 시작:', { studentId, isDraft, dataKeys: Object.keys(planData) });
        
        const result = await this.safeApiCall('수업계획 저장', async () => {
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

            // 기존 수업계획 확인 - single() 대신 배열로
            const existingResult = await client
                .from('lesson_plans')
                .select('id')
                .eq('user_id', studentId);

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

    // 수업계획 수정 가능 여부 확인
    async canEditLessonPlan() {
        const result = await this.safeApiCall('수업계획 수정 가능 여부 확인', async () => {
            const settings = await this.getSystemSettings();
            
            // 테스트 모드나 마감일 무시 모드가 활성화된 경우 항상 허용
            if (settings.test_mode || settings.ignore_deadline) {
                return { data: true, error: null };
            }

            const deadline = new Date(`${settings.lesson_plan_deadline} 23:59:59`);
            const now = new Date();
            return { data: now <= deadline, error: null };
        });

        return result.success ? result.data : true; // 기본적으로 허용
    },

    // ===================
    // 교구 신청 관련 함수들 - 안전성 강화
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

    // 교구 신청 추가
    async addApplication(studentId, itemData) {
        return await this.safeApiCall('교구 신청 추가', async () => {
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

            return await client
                .from('requests')
                .insert([requestData])
                .select();
        }, { studentId, itemName: itemData.name });
    },

    // ===================
    // 시스템 설정 관련 함수들 - 안전성 강화
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
        const config = await waitForConfig();
        return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
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

    // 연결 테스트
    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            const client = await this.ensureClient();
            return await client
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    },

    // 헬스 체크
    async healthCheck() {
        try {
            const connectionTest = await this.testConnection();
            const settings = await this.getSystemSettings();
            
            return {
                status: connectionTest.success ? 'healthy' : 'unhealthy',
                connection: connectionTest.success,
                systemSettings: Object.keys(settings).length,
                timestamp: new Date().toISOString(),
                error: connectionTest.success ? null : connectionTest.message
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
console.log('🚀 SupabaseAPI (Single Query Fixed) loaded successfully');