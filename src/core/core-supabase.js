/**
 * Supabase 핵심 시스템 - Claude 최적화 구조
 * 
 * @description Supabase 클라이언트 설정 및 API 관리
 * @dependencies CONFIG (config/app-config.js)
 * @author Claude AI
 * @date 2024-12-16
 */

// Supabase 클라이언트 설정 및 API 관리 - 초기화 오류 개선 버전
// JSON 객체 에러 및 single() 메서드 문제 해결 + 사용자 친화적 오류 메시지 강화
// 예산 재계산 시스템 통합 + 예산 배정 알고리즘 수정

// 설정 파일이 로드될 때까지 대기 - 개선된 버전
function waitForConfig() {
    return new Promise((resolve, reject) => {
        if (window.CONFIG) {
            resolve(window.CONFIG);
        } else {
            console.log('⏳ CONFIG 로드 대기 중...');
            let waitCount = 0;
            const maxWait = 100; // 10초 (100 * 100ms)
            
            const checkConfig = setInterval(() => {
                waitCount++;
                
                if (window.CONFIG) {
                    clearInterval(checkConfig);
                    console.log('✅ CONFIG 로드 완료');
                    resolve(window.CONFIG);
                } else if (waitCount >= maxWait) {
                    clearInterval(checkConfig);
                    console.error('❌ CONFIG 로드 타임아웃');
                    reject(new Error('시스템 설정을 불러올 수 없습니다. 페이지를 새로고침해주세요.'));
                }
            }, 100);
        }
    });
}

// Supabase 클라이언트 초기화
let supabaseClient = null;
let initializationPromise = null;
let connectionRetryCount = 0;
const MAX_RETRY_COUNT = 3;

// 클라이언트 초기화 함수 - 안정성 강화 + 사용자 친화적 메시지
async function initializeSupabaseClient() {
    if (supabaseClient) return supabaseClient;
    
    // 이미 초기화 중이라면 기다림
    if (initializationPromise) return initializationPromise;
    
    initializationPromise = (async () => {
        try {
            console.log('🚀 Supabase 클라이언트 초기화 시작...');
            
            // 네트워크 연결 상태 먼저 확인
            if (!navigator.onLine) {
                throw new Error('인터넷 연결이 없습니다. 네트워크 연결을 확인해주세요.');
            }
            
            const config = await waitForConfig();
            
            if (!config) {
                throw new Error('시스템 설정을 불러오지 못했습니다. 페이지를 새로고침해주세요.');
            }
            
            // Supabase 라이브러리 로드 확인
            if (!window.supabase || !window.supabase.createClient) {
                console.error('❌ Supabase 라이브러리를 찾을 수 없습니다');
                throw new Error('필수 라이브러리를 불러오지 못했습니다. 페이지를 새로고침해주세요.');
            }
            
            const { createClient } = window.supabase;
            
            // Supabase 클라이언트 생성
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
            
            // 연결 테스트
            const testQuery = await supabaseClient
                .from('system_settings')
                .select('setting_key')
                .limit(1);
            
            if (testQuery.error && testQuery.error.code !== 'PGRST116') {
                console.error('❌ Supabase 연결 테스트 실패:', testQuery.error);
                throw new Error('데이터베이스 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.');
            }
            
            console.log('✅ Supabase client initialized successfully');
            connectionRetryCount = 0; // 성공 시 재시도 카운트 리셋
            return supabaseClient;
        } catch (error) {
            console.error('❌ Supabase client initialization failed:', error);
            connectionRetryCount++;
            
            // 재시도 로직
            if (connectionRetryCount < MAX_RETRY_COUNT) {
                console.log(`🔄 재시도 중... (${connectionRetryCount}/${MAX_RETRY_COUNT})`);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2초 대기
                initializationPromise = null; // 재시도를 위해 초기화
                return initializeSupabaseClient();
            }
            
            // 최종 실패 시 사용자 친화적 메시지
            let userFriendlyMessage = error.message;
            
            if (error.message.includes('fetch') || error.message.includes('network')) {
                userFriendlyMessage = '네트워크 연결에 문제가 있습니다. 인터넷 연결을 확인하고 다시 시도해주세요.';
            } else if (error.message.includes('timeout')) {
                userFriendlyMessage = '서버 응답이 지연되고 있습니다. 잠시 후 다시 시도해주세요.';
            } else if (error.message.includes('설정')) {
                userFriendlyMessage = error.message; // 이미 사용자 친화적
            } else if (!error.message.includes('데이터베이스') && !error.message.includes('라이브러리')) {
                userFriendlyMessage = '서비스 연결에 문제가 있습니다. 페이지를 새로고침하거나 관리자에게 문의해주세요.';
            }
            
            const enhancedError = new Error(userFriendlyMessage);
            enhancedError.originalError = error;
            enhancedError.retryCount = connectionRetryCount;
            
            throw enhancedError;
        }
    })();
    
    return initializationPromise;
}

// 즉시 초기화 시작 - 오류 처리 강화
initializeSupabaseClient().catch(error => {
    console.error('초기 Supabase 클라이언트 초기화 실패:', error);
    
    // 전역 이벤트로 초기화 실패 알림
    window.dispatchEvent(new CustomEvent('supabaseInitError', { 
        detail: { error: error.message, originalError: error.originalError } 
    }));
});

// Supabase API 관리자 - 안전한 단일/다중 결과 처리
const SupabaseAPI = {
    get client() {
        return supabaseClient;
    },
    currentUser: null,
    currentUserType: null,

    // 클라이언트가 초기화될 때까지 대기하는 헬퍼 함수 - 개선됨
    async ensureClient() {
        if (!this.client) {
            try {
                await initializeSupabaseClient();
            } catch (error) {
                console.error('클라이언트 초기화 실패:', error);
                throw new Error(`서비스 연결 실패: ${error.message}`);
            }
        }
        if (!this.client) {
            throw new Error('데이터베이스 연결을 설정할 수 없습니다. 페이지를 새로고침해주세요.');
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

    // 안전한 API 호출 래퍼 - 개선된 버전 (사용자 친화적 메시지)
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
            
            // 네트워크 오류 처리
            if (this.isNetworkError(error)) {
                return { 
                    success: false, 
                    message: '네트워크 연결을 확인하고 다시 시도해주세요.', 
                    error: error,
                    isNetworkError: true 
                };
            }
            
            // 초기화 오류 처리
            if (this.isInitializationError(error)) {
                return {
                    success: false,
                    message: error.message, // 이미 사용자 친화적
                    error: error,
                    isInitializationError: true
                };
            }
            
            return { 
                success: false, 
                message: this.getErrorMessage(error, operation), 
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
               error?.message?.includes('timeout') ||
               error?.code === 'NETWORK_ERROR';
    },

    // 초기화 에러 판별 - 새로 추가
    isInitializationError(error) {
        return error?.message?.includes('서비스 연결 실패') ||
               error?.message?.includes('데이터베이스 연결') ||
               error?.message?.includes('시스템 설정') ||
               error?.message?.includes('필수 라이브러리');
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
            case '배송지 정보 조회':
                return { success: true, data: null };
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

    // 에러 메시지 처리 - 개선됨 (더 구체적인 사용자 친화적 메시지)
    getErrorMessage(error, operation = '') {
        if (typeof error === 'string') {
            return error;
        }
        
        if (error?.message) {
            // 이미 사용자 친화적인 메시지인 경우
            if (error.message.includes('네트워크 연결') || 
                error.message.includes('서버 응답') ||
                error.message.includes('데이터베이스 연결') ||
                error.message.includes('시스템 설정') ||
                error.message.includes('필수 라이브러리')) {
                return error.message;
            }
            
            // 데이터베이스 에러 코드를 사용자 친화적 메시지로 변환
            if (error.message.includes('PGRST116')) {
                return '요청하신 데이터를 찾을 수 없습니다.';
            }
            if (error.message.includes('permission denied') || error.message.includes('RLS')) {
                return '접근 권한이 없습니다. 다시 로그인해주세요.';
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
            if (error.message.includes('timeout')) {
                return '서버 응답 시간이 초과되었습니다. 잠시 후 다시 시도해주세요.';
            }
            if (error.message.includes('fetch') || error.message.includes('network')) {
                return '네트워크 연결을 확인하고 다시 시도해주세요.';
            }
            
            // 작업별 특화 메시지
            if (operation) {
                if (operation.includes('로그인') || operation.includes('인증')) {
                    return '로그인 처리 중 문제가 발생했습니다. 입력 정보를 확인해주세요.';
                }
                if (operation.includes('저장') || operation.includes('등록')) {
                    return '데이터 저장 중 문제가 발생했습니다. 다시 시도해주세요.';
                }
                if (operation.includes('조회') || operation.includes('검색')) {
                    return '데이터를 불러오는 중 문제가 발생했습니다.';
                }
                if (operation.includes('삭제')) {
                    return '데이터 삭제 중 문제가 발생했습니다.';
                }
                if (operation.includes('업데이트') || operation.includes('수정')) {
                    return '데이터 수정 중 문제가 발생했습니다.';
                }
            }
            
            // 일반적인 경우 원본 메시지 사용 (단, 너무 길면 줄임)
            if (error.message.length > 100) {
                return '처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다. 관리자에게 문의해주세요.';
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
            if (error?.originalError) console.log('Original Error:', error.originalError);
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

    // 학생 인증 (이름 + 생년월일) - 버그 수정: 인증 상태 저장
    async authenticateStudent(name, birthDate) {
        const result = await this.safeApiCall('학생 인증', async () => {
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

        // 인증 성공 시 현재 사용자 설정 (버그 수정)
        if (result.success && result.data) {
            this.currentUser = result.data;
            this.currentUserType = 'student';
            
            // 세션 저장 (폴백용)
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
                
                // 관리자 세션 저장
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
        // 세션 스토리지 정리
        try {
            sessionStorage.removeItem('userSession');
        } catch (error) {
            console.warn('세션 정리 실패:', error);
        }
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

    // 학생 수업계획 조회 - 단순화된 버전 (한 학생당 1개 수업계획)
    async getStudentLessonPlan(studentId) {
        const result = await this.safeApiCall('학생 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // single() 대신 배열로 받아서 처리 - 한 학생당 1개만 있음
            const { data, error } = await client
                .from('lesson_plans')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            // 첫 번째 (유일한) 수업계획 반환
            const plan = data && data.length > 0 ? data[0] : null;
            return { data: plan, error: null };
        }, { studentId });

        return result.success ? result.data : null;
    },

    // 수업계획 저장/업데이트 - 수정된 버전 (재제출 시 승인 정보 초기화)
    async saveLessonPlan(studentId, planData, isDraft = false) {
        console.log('🔄 수업계획 저장 시작:', { studentId, isDraft, dataKeys: Object.keys(planData) });
        
        const result = await this.safeApiCall('수업계획 저장', async () => {
            const client = await this.ensureClient();
            const status = isDraft ? 'draft' : 'submitted';
            const submitTime = isDraft ? null : new Date().toISOString();

            // 기존 수업계획 확인 - single() 대신 배열로
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
                // 업데이트 - 모든 기존 수업계획을 업데이트 (정상적으로는 1개만 있어야 함)
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
    // 배송지 설정 관련 함수들 - 새로 추가
    // ===================

    // 배송지 정보 조회
    async getShippingInfo(studentId) {
        const result = await this.safeApiCall('배송지 정보 조회', async () => {
            const client = await this.ensureClient();
            
            // single() 대신 배열로 받아서 처리
            const { data, error } = await client
                .from('shipping_addresses')
                .select('*')
                .eq('user_id', studentId);

            if (error) {
                return { data: null, error };
            }

            // 첫 번째 (유일한) 배송지 정보 반환
            const shippingInfo = data && data.length > 0 ? data[0] : null;
            return { data: shippingInfo, error: null };
        }, { studentId });

        return result.success ? result.data : null;
    },

    // 배송지 정보 저장/업데이트
    async saveShippingInfo(studentId, shippingData) {
        const result = await this.safeApiCall('배송지 정보 저장', async () => {
            const client = await this.ensureClient();
            
            const shippingRecord = {
                user_id: studentId,
                recipient_name: shippingData.recipient_name,
                phone: shippingData.phone,
                address: shippingData.address,
                postal_code: shippingData.postal_code || null,
                delivery_note: shippingData.delivery_note || null,
                updated_at: new Date().toISOString()
            };

            // 기존 배송지 정보 확인
            const existingResult = await client
                .from('shipping_addresses')
                .select('id')
                .eq('user_id', studentId);

            if (existingResult.data && existingResult.data.length > 0) {
                // 업데이트
                return await client
                    .from('shipping_addresses')
                    .update(shippingRecord)
                    .eq('user_id', studentId)
                    .select();
            } else {
                // 새로 생성
                return await client
                    .from('shipping_addresses')
                    .insert([{ ...shippingRecord, created_at: new Date().toISOString() }])
                    .select();
            }
        }, { studentId, recipient: shippingData.recipient_name });

        return result;
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
        const config = await waitForConfig().catch(() => null);
        return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    },

    // ===================
    // 관리자 전용 함수들 - 관계 문제 해결: 분리된 쿼리 방식
    // ===================

    // 모든 수업계획 조회 (관리자용) - 분리된 쿼리로 안전하게 처리
    async getAllLessonPlans() {
        const result = await this.safeApiCall('모든 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // 1. 수업계획 데이터만 먼저 조회
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

            // 2. 사용자 ID 목록 추출
            const userIds = [...new Set(lessonPlans.map(plan => plan.user_id).filter(id => id))];
            
            // 3. 사용자 프로필 데이터 별도 조회
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

            // 4. 데이터 병합 및 approval_status 계산 (수정된 로직)
            const enrichedPlans = lessonPlans.map(plan => {
                let approval_status = 'pending';
                
                // 수정된 상태 판단 로직: status가 우선
                if (plan.status === 'draft') {
                    approval_status = 'draft';
                } else if (plan.status === 'submitted') {
                    // submitted 상태에서는 승인/반려 정보 확인
                    if (plan.approved_at && plan.approved_by && !plan.rejection_reason) {
                        approval_status = 'approved';
                    } else if (plan.rejection_reason && plan.rejection_reason.trim() !== '') {
                        approval_status = 'rejected';
                    } else {
                        approval_status = 'pending'; // 제출됨, 아직 처리 안됨
                    }
                } else if (plan.status === 'approved') {
                    approval_status = 'approved';
                } else if (plan.status === 'rejected') {
                    approval_status = 'rejected';
                }
                
                // 사용자 프로필 정보 추가
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

        if (result.success) {
            return result.data;
        }

        console.warn('⚠️ 수업계획 조회 실패:', result.message);
        return [];
    },

    // 대기 중인 수업계획 조회 (관리자용) - 분리된 쿼리로 처리
    async getPendingLessonPlans() {
        const result = await this.safeApiCall('대기 중인 수업계획 조회', async () => {
            const client = await this.ensureClient();
            
            // 1. 대기 중인 수업계획만 조회 (수정된 조건)
            const lessonPlansResult = await client
                .from('lesson_plans')
                .select('*')
                .eq('status', 'submitted')
                .order('submitted_at', { ascending: true });

            if (lessonPlansResult.error) {
                return { data: null, error: lessonPlansResult.error };
            }

            const lessonPlans = lessonPlansResult.data || [];
            
            // 실제로 대기 중인 계획만 필터링 (submitted 상태이면서 승인도 반려도 안된 것)
            const pendingPlans = lessonPlans.filter(plan => 
                plan.status === 'submitted' && 
                (!plan.approved_at || !plan.approved_by) && 
                (!plan.rejection_reason || plan.rejection_reason.trim() === '')
            );
            
            if (pendingPlans.length === 0) {
                return { data: [], error: null };
            }

            // 2. 사용자 ID 목록 추출
            const userIds = [...new Set(pendingPlans.map(plan => plan.user_id).filter(id => id))];
            
            // 3. 사용자 프로필 데이터 별도 조회
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

            // 4. 데이터 병합
            const enrichedPlans = pendingPlans.map(plan => {
                const userProfile = userProfiles[plan.user_id] || {
                    id: plan.user_id,
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };
                
                return {
                    ...plan,
                    user_profiles: userProfile
                };
            });
            
            console.log('⏳ 대기 중인 수업계획:', enrichedPlans.length, '건');
            return { data: enrichedPlans, error: null };
        });

        return result.success ? result.data : [];
    },

    // 수업계획 승인 - 예산 배정 알고리즘 수정
    async approveLessonPlan(studentId) {
        return await this.safeApiCall('수업계획 승인', async () => {
            const client = await this.ensureClient();
            const now = new Date().toISOString();
            
            console.log(`💰 수업계획 승인 및 예산 배정 시작 - 학생 ID: ${studentId}`);
            
            // 수업계획 승인 처리 및 수업 데이터 조회
            const planResult = await client
                .from('lesson_plans')
                .update({
                    status: 'approved',
                    approved_at: now,
                    approved_by: this.currentUser?.id,
                    rejection_reason: null // 승인 시 반려 사유 초기화
                })
                .eq('user_id', studentId)
                .select();

            if (planResult.error) {
                return { data: null, error: planResult.error };
            }

            // 승인된 수업계획에서 실제 수업 횟수 추출
            const approvedPlan = planResult.data[0];
            const lessonData = approvedPlan.lessons;
            const actualTotalLessons = parseInt(lessonData?.totalLessons) || 0;
            
            console.log(`📚 수업계획 데이터:`, {
                planId: approvedPlan.id,
                actualTotalLessons: actualTotalLessons,
                lessonData: lessonData
            });

            // 학생 정보 조회
            const student = await this.getStudentById(studentId);
            if (!student) {
                return { data: null, error: new Error('학생 정보를 찾을 수 없습니다.') };
            }

            console.log(`👤 학생 정보:`, {
                studentId: student.id,
                name: student.name,
                field: student.field,
                userProfileTotalLessons: student.total_lessons // 참고용
            });

            // 예산 설정 조회
            const budgetSettingsResult = await client
                .from('budget_settings')
                .select('*')
                .eq('field', student.field)
                .eq('is_active', true);

            if (budgetSettingsResult.data && budgetSettingsResult.data.length > 0) {
                const settings = budgetSettingsResult.data[0];
                
                console.log(`⚙️ 예산 설정:`, {
                    field: settings.field,
                    perLessonAmount: settings.per_lesson_amount,
                    maxBudgetLimit: settings.max_budget_limit
                });

                // 📊 수정된 예산 계산 로직: 수업계획의 실제 수업 횟수 사용
                const calculatedBudget = actualTotalLessons * settings.per_lesson_amount;
                const allocatedBudget = Math.min(calculatedBudget, settings.max_budget_limit);
                
                console.log(`💰 예산 계산:`, {
                    수업횟수: actualTotalLessons,
                    회당예산: settings.per_lesson_amount,
                    계산된예산: calculatedBudget,
                    최대한도: settings.max_budget_limit,
                    최종배정예산: allocatedBudget
                });

                // 학생 예산 생성/업데이트
                const budgetData = {
                    user_id: studentId,
                    field: student.field,
                    allocated_budget: allocatedBudget,
                    used_budget: 0,
                    lesson_plan_id: approvedPlan.id,
                    updated_at: now
                };

                // 기존 예산 확인
                const existingBudgetResult = await client
                    .from('student_budgets')
                    .select('id')
                    .eq('user_id', studentId);

                if (existingBudgetResult.data && existingBudgetResult.data.length > 0) {
                    // 업데이트
                    const updateResult = await client
                        .from('student_budgets')
                        .update(budgetData)
                        .eq('user_id', studentId);
                    
                    console.log(`🔄 예산 업데이트 결과:`, updateResult.error ? updateResult.error : '성공');
                } else {
                    // 새로 생성
                    const insertResult = await client
                        .from('student_budgets')
                        .insert([budgetData]);
                    
                    console.log(`➕ 예산 생성 결과:`, insertResult.error ? insertResult.error : '성공');
                }

                console.log(`✅ 수업계획 승인 및 예산 배정 완료 - ${student.name}: ${allocatedBudget.toLocaleString('ko-KR')}원`);

                return {
                    data: {
                        approved: true,
                        budgetInfo: {
                            allocated: allocatedBudget,
                            lessonCount: actualTotalLessons,
                            perLessonAmount: settings.per_lesson_amount,
                            maxBudgetLimit: settings.max_budget_limit
                        }
                    },
                    error: null
                };
            }

            console.log(`⚠️ 예산 설정을 찾을 수 없습니다 - 분야: ${student.field}`);
            return { data: { approved: true }, error: null };
        }, { studentId });
    },

    // 수업계획 반려
    async rejectLessonPlan(studentId, reason) {
        return await this.safeApiCall('수업계획 반려', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('lesson_plans')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    approved_at: null, // 반려 시 승인 정보 초기화
                    approved_by: null,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();
        }, { studentId, reason });
    },

    // 모든 분야 예산 설정 조회
    async getAllFieldBudgetSettings() {
        const result = await this.safeApiCall('모든 분야 예산 설정 조회', async () => {
            const client = await this.ensureClient();
            return await client
                .from('budget_settings')
                .select('*')
                .eq('is_active', true)
                .order('field');
        });

        if (result.success) {
            const settings = {};
            (result.data || []).forEach(item => {
                settings[item.field] = {
                    perLessonAmount: item.per_lesson_amount,
                    maxBudget: item.max_budget_limit
                };
            });
            return settings;
        }

        // 기본 설정 반환
        const config = await waitForConfig().catch(() => null);
        return config?.APP?.DEFAULT_BUDGET_SETTINGS || {};
    },

    // 분야별 예산 설정 업데이트 - 예산 재계산 기능 통합 + 수정된 재계산 로직
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
                const recalculationResult = await this.recalculateStudentBudgets(field, settings);
                return {
                    data: {
                        ...result.data[0],
                        recalculation: recalculationResult.success ? recalculationResult.data : null
                    },
                    error: null
                };
            }

            return result;
        }, { field, settings });
    },

    // 수정된 학생 예산 재계산 - 수업계획의 totalLessons 사용
    async recalculateStudentBudgets(field, newSettings) {
        return await this.safeApiCall('학생 예산 재계산', async () => {
            const client = await this.ensureClient();
            
            console.log(`🔄 ${field} 분야 학생 예산 재계산 시작`);
            
            // 1. 해당 분야의 승인된 학생들과 수업계획 정보 조회
            const studentsResult = await client
                .from('student_budgets')
                .select(`
                    id,
                    user_id,
                    allocated_budget,
                    used_budget,
                    lesson_plan_id,
                    user_profiles!inner(field)
                `)
                .eq('user_profiles.field', field);

            if (!studentsResult.data || studentsResult.data.length === 0) {
                console.log(`📊 ${field} 분야에 재계산할 학생이 없습니다.`);
                return { data: { updated: 0, total: 0 }, error: null };
            }

            console.log(`📚 ${field} 분야 ${studentsResult.data.length}명의 예산 재계산 진행`);
            
            // 2. 각 학생별로 수업계획의 totalLessons 조회 및 예산 재계산
            const updatePromises = studentsResult.data.map(async (student) => {
                try {
                    // 학생의 승인된 수업계획 조회
                    const lessonPlanResult = await client
                        .from('lesson_plans')
                        .select('lessons')
                        .eq('user_id', student.user_id)
                        .eq('status', 'approved');

                    let actualTotalLessons = 0;
                    if (lessonPlanResult.data && lessonPlanResult.data.length > 0) {
                        const lessonData = lessonPlanResult.data[0].lessons;
                        actualTotalLessons = parseInt(lessonData?.totalLessons) || 0;
                    }

                    // 새로운 예산 계산 (수업계획의 실제 수업 횟수 사용)
                    const calculatedBudget = actualTotalLessons * newSettings.perLessonAmount;
                    const newAllocatedBudget = Math.min(calculatedBudget, newSettings.maxBudget);

                    // 사용 예산이 새 배정 예산을 초과하지 않도록 체크
                    const adjustedUsedBudget = Math.min(student.used_budget, newAllocatedBudget);

                    console.log(`👤 ${student.user_id} 예산 재계산:`, {
                        actualTotalLessons,
                        calculatedBudget,
                        newAllocatedBudget,
                        oldAllocated: student.allocated_budget,
                        adjustedUsedBudget
                    });

                    return await client
                        .from('student_budgets')
                        .update({
                            allocated_budget: newAllocatedBudget,
                            used_budget: adjustedUsedBudget,
                            updated_at: new Date().toISOString()
                        })
                        .eq('id', student.id);
                } catch (error) {
                    console.error(`❌ 학생 ${student.user_id} 예산 재계산 실패:`, error);
                    return { error: error };
                }
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

    // 예산 현황 통계
    async getBudgetOverviewStats() {
        const result = await this.safeApiCall('예산 현황 통계 조회', async () => {
            const client = await this.ensureClient();
            
            // 전체 배정 예산
            const budgetResult = await client
                .from('student_budgets')
                .select('allocated_budget');
            
            // 승인된 교구 신청 총액
            const approvedResult = await client
                .from('requests')
                .select('price')
                .in('status', ['approved', 'purchased', 'completed']);
            
            // 구매 완료 총액
            const purchasedResult = await client
                .from('requests')
                .select('price')
                .in('status', ['purchased', 'completed']);
            
            // 학생 수
            const studentCountResult = await client
                .from('student_budgets')
                .select('user_id', { count: 'exact' });

            return {
                data: {
                    budgets: budgetResult.data || [],
                    approved: approvedResult.data || [],
                    purchased: purchasedResult.data || [],
                    studentCount: studentCountResult.count || 0
                },
                error: null
            };
        });

        if (result.success) {
            const { budgets, approved, purchased, studentCount } = result.data;
            
            const totalApprovedBudget = budgets.reduce((sum, b) => sum + (b.allocated_budget || 0), 0);
            const approvedItemsTotal = approved.reduce((sum, r) => sum + (r.price || 0), 0);
            const purchasedTotal = purchased.reduce((sum, r) => sum + (r.price || 0), 0);
            const averagePerPerson = studentCount > 0 ? Math.round(totalApprovedBudget / studentCount) : 0;
            
            return {
                totalApprovedBudget,
                approvedItemsTotal,
                purchasedTotal,
                averagePerPerson
            };
        }

        return {
            totalApprovedBudget: 0,
            approvedItemsTotal: 0,
            purchasedTotal: 0,
            averagePerPerson: 0
        };
    },

    // 일반 통계
    async getStats() {
        const result = await this.safeApiCall('일반 통계 조회', async () => {
            const client = await this.ensureClient();
            
            // 신청자 수
            const applicantResult = await client
                .from('requests')
                .select('user_id')
                .not('user_id', 'is', null);
            
            // 미승인 아이템
            const pendingResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');
            
            // 승인된 아이템
            const approvedResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'approved');

            return {
                data: {
                    applicants: applicantResult.data || [],
                    pendingCount: pendingResult.count || 0,
                    approvedCount: approvedResult.count || 0
                },
                error: null
            };
        });

        if (result.success) {
            const { applicants, pendingCount, approvedCount } = result.data;
            const uniqueApplicants = new Set(applicants.map(a => a.user_id));
            
            return {
                applicantCount: uniqueApplicants.size,
                pendingCount,
                approvedCount
            };
        }

        return {
            applicantCount: 0,
            pendingCount: 0,
            approvedCount: 0
        };
    },

    // 신청 내역 검색 - 분리된 쿼리로 처리
    async searchApplications(searchTerm = '') {
        const result = await this.safeApiCall('신청 내역 검색', async () => {
            const client = await this.ensureClient();
            
            // 1. 기본 requests 데이터 조회
            let requestsResult;
            if (searchTerm && searchTerm.trim()) {
                // 검색어가 있는 경우: 먼저 사용자를 찾고 그 사용자의 요청을 조회
                const usersResult = await client
                    .from('user_profiles')
                    .select('id')
                    .ilike('name', `%${searchTerm.trim()}%`);
                
                if (usersResult.data && usersResult.data.length > 0) {
                    const userIds = usersResult.data.map(user => user.id);
                    requestsResult = await client
                        .from('requests')
                        .select('*')
                        .in('user_id', userIds)
                        .order('created_at', { ascending: false });
                } else {
                    // 일치하는 사용자가 없으면 빈 결과 반환
                    requestsResult = { data: [], error: null };
                }
            } else {
                // 검색어가 없는 경우: 모든 요청 조회
                requestsResult = await client
                    .from('requests')
                    .select('*')
                    .order('created_at', { ascending: false });
            }

            if (requestsResult.error) {
                return { data: null, error: requestsResult.error };
            }

            const requests = requestsResult.data || [];
            
            if (requests.length === 0) {
                return { data: [], error: null };
            }

            // 2. 사용자 ID 목록 추출
            const userIds = [...new Set(requests.map(req => req.user_id).filter(id => id))];
            
            // 3. 사용자 프로필 데이터 별도 조회
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

            // 4. 데이터 병합
            const enrichedRequests = requests.map(request => {
                const userProfile = userProfiles[request.user_id] || {
                    id: request.user_id,
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };
                
                return {
                    ...request,
                    user_profiles: userProfile
                };
            });
            
            return { data: enrichedRequests, error: null };
        }, { searchTerm });

        return result.success ? result.data : [];
    },

    // 아이템 상태 업데이트
    async updateItemStatus(requestId, status, reason = null) {
        return await this.safeApiCall('아이템 상태 업데이트', async () => {
            const client = await this.ensureClient();
            
            const updateData = {
                status: status,
                reviewed_at: new Date().toISOString(),
                reviewed_by: this.currentUser?.id,
                updated_at: new Date().toISOString()
            };
            
            if (reason) {
                updateData.rejection_reason = reason;
            }
            
            return await client
                .from('requests')
                .update(updateData)
                .eq('id', requestId)
                .select();
        }, { requestId, status, reason });
    },

    // 내보내기 데이터 준비 - 분리된 쿼리로 처리
    async prepareExportData() {
        const result = await this.safeApiCall('내보내기 데이터 준비', async () => {
            const client = await this.ensureClient();
            
            // 1. 모든 requests 데이터 조회
            const requestsResult = await client
                .from('requests')
                .select('*')
                .order('created_at', { ascending: false });

            if (requestsResult.error) {
                return { data: null, error: requestsResult.error };
            }

            const requests = requestsResult.data || [];
            
            if (requests.length === 0) {
                return { data: [], error: null };
            }

            // 2. 사용자 ID 목록 추출
            const userIds = [...new Set(requests.map(req => req.user_id).filter(id => id))];
            
            // 3. 사용자 프로필 데이터 별도 조회
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

            // 4. 내보내기 형태로 데이터 변환
            const exportData = requests.map(item => {
                const userProfile = userProfiles[item.user_id] || {
                    name: '사용자 정보 없음',
                    field: '미설정',
                    sejong_institute: '미설정'
                };

                return {
                    '신청일': new Date(item.created_at).toLocaleDateString('ko-KR'),
                    '학생명': userProfile.name,
                    '세종학당': userProfile.sejong_institute,
                    '분야': userProfile.field,
                    '교구명': item.item_name,
                    '사용목적': item.purpose,
                    '가격': item.price,
                    '구매방식': this.getPurchaseMethodText(item.purchase_type),
                    '상태': this.getStatusText(item.status),
                    '구매링크': item.purchase_link || '',
                    '반려사유': item.rejection_reason || ''
                };
            });
            
            return { data: exportData, error: null };
        });

        return result.success ? result.data : [];
    },

    // 시스템 설정 업데이트
    async updateSystemSetting(key, value) {
        return await this.safeApiCall('시스템 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
            // 값의 타입 결정
            let settingType = 'string';
            let settingValue = value;
            
            if (typeof value === 'boolean') {
                settingType = 'boolean';
                settingValue = value.toString();
            } else if (typeof value === 'number') {
                settingType = 'number';
                settingValue = value.toString();
            } else if (typeof value === 'object') {
                settingType = 'json';
                settingValue = JSON.stringify(value);
            }
            
            // 기존 설정 확인
            const existingResult = await client
                .from('system_settings')
                .select('id')
                .eq('setting_key', key);
            
            const updateData = {
                setting_key: key,
                setting_value: settingValue,
                setting_type: settingType,
                updated_at: new Date().toISOString()
            };
            
            if (existingResult.data && existingResult.data.length > 0) {
                // 업데이트
                return await client
                    .from('system_settings')
                    .update(updateData)
                    .eq('setting_key', key)
                    .select();
            } else {
                // 새로 생성
                return await client
                    .from('system_settings')
                    .insert([updateData])
                    .select();
            }
        }, { key, value });
    },

    // 테스트 모드 토글
    async toggleTestMode() {
        const settings = await this.getSystemSettings();
        const newMode = !settings.test_mode;
        
        const result = await this.updateSystemSetting('test_mode', newMode);
        
        if (result.success) {
            return newMode;
        }
        
        return settings.test_mode;
    },

    // 영수증 조회 (요청 ID로) - 분리된 쿼리로 처리
    async getReceiptByRequestId(requestId) {
        const result = await this.safeApiCall('영수증 조회', async () => {
            const client = await this.ensureClient();
            
            // 1. 영수증 데이터 조회
            const receiptResult = await client
                .from('receipts')
                .select('*')
                .eq('request_id', requestId);
            
            if (receiptResult.error || !receiptResult.data || receiptResult.data.length === 0) {
                return { data: null, error: receiptResult.error || null };
            }
            
            const receipt = receiptResult.data[0];
            
            // 2. 관련 요청 정보 조회
            const requestResult = await client
                .from('requests')
                .select('item_name, price')
                .eq('id', requestId);
            
            // 3. 사용자 정보 조회
            const userResult = await client
                .from('user_profiles')
                .select('name')
                .eq('id', receipt.user_id);
            
            // 4. 데이터 병합
            const requestInfo = requestResult.data && requestResult.data.length > 0 ? 
                requestResult.data[0] : { item_name: '정보 없음', price: 0 };
            
            const userInfo = userResult.data && userResult.data.length > 0 ? 
                userResult.data[0] : { name: '사용자 정보 없음' };
            
            return {
                data: {
                    ...receipt,
                    item_name: requestInfo.item_name,
                    student_name: userInfo.name,
                    total_amount: requestInfo.price
                },
                error: null
            };
        }, { requestId });

        return result.success ? result.data : null;
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

    // 헬스 체크 - 개선됨
    async healthCheck() {
        try {
            const startTime = Date.now();
            
            // 기본 체크
            const basicChecks = {
                client: !!this.client,
                config: !!window.CONFIG,
                network: navigator.onLine
            };
            
            // 연결 테스트
            let connectionTest = { success: false, error: '클라이언트 없음' };
            if (basicChecks.client && basicChecks.network) {
                connectionTest = await this.testConnection();
            }
            
            // 시스템 설정 조회
            let settingsCount = 0;
            if (connectionTest.success) {
                try {
                    const settings = await this.getSystemSettings();
                    settingsCount = Object.keys(settings).length;
                } catch (error) {
                    console.warn('설정 조회 실패:', error);
                }
            }
            
            const responseTime = Date.now() - startTime;
            const status = connectionTest.success ? 'healthy' : 'unhealthy';
            
            return {
                status,
                basicChecks,
                connection: connectionTest.success,
                systemSettings: settingsCount,
                responseTimeMs: responseTime,
                timestamp: new Date().toISOString(),
                error: connectionTest.success ? null : connectionTest.error || connectionTest.message
            };
        } catch (error) {
            this.logError('헬스 체크', error);
            return {
                status: 'error',
                connection: false,
                error: this.getErrorMessage(error, '헬스 체크'),
                timestamp: new Date().toISOString()
            };
        }
    }
};

// 전역 접근을 위해 window 객체에 추가
window.SupabaseAPI = SupabaseAPI;

// 초기화 상태 이벤트 리스너
window.addEventListener('supabaseInitError', (event) => {
    console.error('Supabase 초기화 오류 이벤트:', event.detail);
    
    // 사용자에게 알림 (Utils가 로드된 경우에만)
    if (window.Utils && window.Utils.showAlert) {
        window.Utils.showAlert(event.detail.error, 'error');
    }
});

// 초기화 완료 로그
console.log('🚀 SupabaseAPI core system loaded successfully - Claude Optimized Structure');
