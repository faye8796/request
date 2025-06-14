// Supabase 통합 클라이언트 - v3.0
// 실시간 기능, 파일 업로드, 고급 에러 핸들링 포함

class SupabaseManager {
    constructor() {
        this.client = null;
        this.currentUser = null;
        this.currentUserType = null;
        this.initializationPromise = null;
        this.connectionRetryCount = 0;
        this.realtimeSubscriptions = new Map();
        this.cache = new Map();
        this.eventBus = new EventTarget();
        
        // 에러 핸들링 통계
        this.errorStats = {
            total: 0,
            by_type: {},
            last_error: null
        };
    }

    // ===================
    // 초기화 및 연결 관리
    // ===================

    async initialize() {
        if (this.client) return this.client;
        
        if (this.initializationPromise) return this.initializationPromise;
        
        this.initializationPromise = this._initializeClient();
        return this.initializationPromise;
    }

    async _initializeClient() {
        try {
            const config = await this._waitForConfig();
            
            if (!config) {
                throw new Error('설정을 불러올 수 없습니다.');
            }
            
            if (!window.supabase?.createClient) {
                throw new Error('Supabase 라이브러리가 로드되지 않았습니다.');
            }
            
            const { createClient } = window.supabase;
            
            this.client = createClient(
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
                            'X-Client-Info': 'supabase-js-web-v3',
                            'Accept': 'application/json',
                            'Content-Type': 'application/json'
                        }
                    },
                    realtime: {
                        enabled: config.SUPABASE.REALTIME_ENABLED
                    }
                }
            );
            
            // 연결 상태 모니터링 시작
            this._startConnectionMonitoring();
            
            console.log('✅ Supabase 클라이언트 초기화 완료');\n            this.connectionRetryCount = 0;
            
            // 초기화 완료 이벤트 발생
            this._dispatchEvent('initialized', { success: true });
            
            return this.client;
        } catch (error) {
            console.error('❌ Supabase 클라이언트 초기화 실패:', error);
            this.connectionRetryCount++;
            
            if (this.connectionRetryCount < window.CONFIG?.UI?.MAX_RETRY_COUNT || 3) {
                console.log(`🔄 재시도 중... (${this.connectionRetryCount}/3)`);
                await this._delay(window.CONFIG?.UI?.RETRY_DELAY_MS || 1000);
                this.initializationPromise = null;
                return this._initializeClient();
            }
            
            this._dispatchEvent('initialization_failed', { error });
            throw error;
        }
    }

    async _waitForConfig() {
        return new Promise((resolve) => {
            if (window.CONFIG) {
                resolve(window.CONFIG);
            } else {
                const checkConfig = setInterval(() => {
                    if (window.CONFIG) {
                        clearInterval(checkConfig);
                        resolve(window.CONFIG);
                    }
                }, 100);
                
                setTimeout(() => {
                    clearInterval(checkConfig);
                    resolve(null);
                }, 30000);
            }
        });
    }

    async ensureClient() {
        if (!this.client) {
            await this.initialize();
        }
        if (!this.client) {
            throw new Error('Supabase 클라이언트를 초기화할 수 없습니다.');
        }
        return this.client;
    }

    // ===================
    // 안전한 API 호출 시스템
    // ===================

    async safeApiCall(operation, apiFunction, context = {}) {
        try {
            const startTime = Date.now();
            const result = await apiFunction();
            const duration = Date.now() - startTime;
            
            // 성능 로깅
            if (duration > 5000) {
                console.warn(`⚠️ 느린 API 호출 (${operation}): ${duration}ms`);
            }
            
            if (result.error) {
                return this._handleError(operation, result.error, context);
            }
            
            this._logSuccess(operation, result.data, duration);
            return { success: true, data: result.data };
        } catch (error) {
            return this._handleError(operation, error, context);
        }
    }

    async safeSingleQuery(query) {
        try {
            const { data, error } = await query;
            
            if (error) {
                if (error.code === 'PGRST116') {
                    return { data: null, error: null };
                }
                return { data: null, error };
            }
            
            if (Array.isArray(data)) {
                return { data: data.length > 0 ? data[0] : null, error: null };
            }
            
            return { data, error: null };
        } catch (error) {
            console.error('안전한 단일 조회 오류:', error);
            return { data: null, error };
        }
    }

    // ===================
    // 에러 핸들링 시스템
    // ===================

    _handleError(operation, error, context = {}) {
        this.errorStats.total++;
        this.errorStats.last_error = error;
        
        const errorType = this._classifyError(error);
        this.errorStats.by_type[errorType] = (this.errorStats.by_type[errorType] || 0) + 1;
        
        // 406 에러 특별 처리
        if (this._is406Error(error)) {
            return this._handle406Error(operation, error, context);
        }
        
        // 네트워크 에러 처리
        if (this._isNetworkError(error)) {
            return {
                success: false,
                message: '네트워크 연결을 확인하고 다시 시도해주세요.',
                error: error,
                isNetworkError: true
            };
        }
        
        this._logError(operation, error, context);
        
        // 에러 이벤트 발생
        this._dispatchEvent('api_error', { operation, error, context });
        
        return {
            success: false,
            message: this._getErrorMessage(error),
            error: error
        };
    }

    _classifyError(error) {
        if (this._isNetworkError(error)) return 'network';
        if (this._is406Error(error)) return '406_not_acceptable';
        if (error?.code === 'PGRST116') return 'not_found';
        if (error?.message?.includes('permission')) return 'permission';
        if (error?.message?.includes('duplicate')) return 'duplicate';
        return 'unknown';
    }

    _is406Error(error) {
        return error?.code === 406 || 
               error?.status === 406 || 
               error?.message?.includes('406') ||
               error?.message?.includes('Not Acceptable');
    }

    _isNetworkError(error) {
        return error?.message?.includes('fetch') ||
               error?.message?.includes('network') ||
               error?.message?.includes('Failed to fetch') ||
               error?.code === 'NETWORK_ERROR';
    }

    _handle406Error(operation, error, context) {
        console.warn(`406 에러 처리 중 (${operation}):`, error);
        
        // 기본값 반환 로직
        const defaultResponses = {
            '학생 예산 상태 조회': {
                allocated: 0, used: 0, remaining: 0,
                field: '전문분야', lessonPlanStatus: 'draft',
                canApplyForEquipment: false
            },
            '학생 수업계획 조회': null,
            '학생 신청 내역 조회': [],
            '시스템 설정 조회': {
                test_mode: false,
                lesson_plan_deadline: '2024-12-31',
                ignore_deadline: false
            }
        };
        
        if (defaultResponses[operation] !== undefined) {
            return { success: true, data: defaultResponses[operation] };
        }
        
        return {
            success: false,
            message: '일시적으로 서비스에 접근할 수 없습니다.',
            error: error,
            is406Error: true
        };
    }

    _getErrorMessage(error) {
        if (typeof error === 'string') return error;
        
        if (error?.message) {
            const friendlyMessages = {
                'PGRST116': '데이터를 찾을 수 없습니다.',
                'permission denied': '접근 권한이 없습니다.',
                'duplicate key': '이미 존재하는 데이터입니다.',
                'foreign key': '관련 데이터가 존재하지 않습니다.',
                'not null': '필수 정보가 누락되었습니다.',
                'JSON object requested, multiple': '데이터 조회 중 오류가 발생했습니다.'
            };
            
            for (const [key, message] of Object.entries(friendlyMessages)) {
                if (error.message.includes(key)) {
                    return message;
                }
            }
            
            return error.message;
        }
        
        return '알 수 없는 오류가 발생했습니다.';
    }

    // ===================
    // 캐시 시스템
    // ===================

    _getCacheKey(operation, params = {}) {
        return `${operation}_${JSON.stringify(params)}`;
    }

    _setCache(key, data, ttl = null) {
        const config = window.CONFIG;
        const cacheTTL = ttl || config?.PERFORMANCE?.CACHE_DURATION_MS || 300000;
        
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            ttl: cacheTTL
        });
        
        // 캐시 크기 제한 (100개)
        if (this.cache.size > 100) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
    }

    _getCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;
        
        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.cache.delete(key);
            return null;
        }
        
        return cached.data;
    }

    _clearCache(pattern = null) {
        if (!pattern) {
            this.cache.clear();
            return;
        }
        
        for (const key of this.cache.keys()) {
            if (key.includes(pattern)) {
                this.cache.delete(key);
            }
        }
    }

    // ===================
    // 실시간 기능
    // ===================

    subscribeToRealtime(table, filter = {}, callback) {
        const config = window.CONFIG;
        if (!config?.SUPABASE?.REALTIME_ENABLED) {
            console.warn('실시간 기능이 비활성화되어 있습니다.');
            return null;
        }

        try {
            const subscriptionKey = `${table}_${JSON.stringify(filter)}`;
            
            // 기존 구독 정리
            this.unsubscribeFromRealtime(subscriptionKey);
            
            const subscription = this.client
                .channel(`public:${table}`)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: table,
                        ...filter 
                    }, 
                    (payload) => {
                        console.log('실시간 데이터 수신:', payload);
                        callback(payload);
                        
                        // 관련 캐시 무효화
                        this._clearCache(table);
                        
                        // 실시간 이벤트 발생
                        this._dispatchEvent('realtime_update', { table, payload });
                    }
                )
                .subscribe();
            
            this.realtimeSubscriptions.set(subscriptionKey, subscription);
            console.log(`✅ 실시간 구독 설정: ${table}`);
            
            return subscriptionKey;
        } catch (error) {
            console.error('실시간 구독 설정 실패:', error);
            return null;
        }
    }

    unsubscribeFromRealtime(subscriptionKey) {
        const subscription = this.realtimeSubscriptions.get(subscriptionKey);
        if (subscription) {
            subscription.unsubscribe();
            this.realtimeSubscriptions.delete(subscriptionKey);
            console.log(`✅ 실시간 구독 해제: ${subscriptionKey}`);
        }
    }

    // ===================
    // 파일 업로드 기능
    // ===================

    async uploadFile(file, bucket = null, path = null) {
        const config = window.CONFIG;
        const bucketName = bucket || config?.SUPABASE?.STORAGE_BUCKET || 'files';
        
        try {
            // 파일 크기 검증
            const maxSize = (config?.UI?.MAX_FILE_SIZE_MB || 5) * 1024 * 1024;
            if (file.size > maxSize) {
                throw new Error(`파일 크기가 ${config?.UI?.MAX_FILE_SIZE_MB || 5}MB를 초과합니다.`);
            }
            
            // 파일 타입 검증
            const supportedTypes = config?.UI?.SUPPORTED_IMAGE_TYPES || 
                ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            
            if (!supportedTypes.includes(file.type)) {
                throw new Error('지원하지 않는 파일 형식입니다.');
            }
            
            // 파일 경로 생성
            const fileName = path || `${Date.now()}_${file.name}`;
            const filePath = `uploads/${fileName}`;
            
            const client = await this.ensureClient();
            
            // 파일 업로드
            const { data, error } = await client.storage
                .from(bucketName)
                .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false
                });
            
            if (error) {
                throw error;
            }
            
            // 공개 URL 생성
            const { data: urlData } = client.storage
                .from(bucketName)
                .getPublicUrl(filePath);
            
            return {
                success: true,
                data: {
                    path: data.path,
                    fullPath: data.fullPath,
                    publicUrl: urlData.publicUrl
                }
            };
        } catch (error) {
            console.error('파일 업로드 실패:', error);
            return {
                success: false,
                message: this._getErrorMessage(error),
                error
            };
        }
    }

    async deleteFile(path, bucket = null) {
        const config = window.CONFIG;
        const bucketName = bucket || config?.SUPABASE?.STORAGE_BUCKET || 'files';
        
        try {
            const client = await this.ensureClient();
            
            const { error } = await client.storage
                .from(bucketName)
                .remove([path]);
            
            if (error) {
                throw error;
            }
            
            return { success: true };
        } catch (error) {
            console.error('파일 삭제 실패:', error);
            return {
                success: false,
                message: this._getErrorMessage(error),
                error
            };
        }
    }

    // ===================
    // 인증 관련 기능들
    // ===================

    async authenticateStudent(name, birthDate) {
        const cacheKey = this._getCacheKey('authenticate_student', { name, birthDate });
        
        return await this.safeApiCall('학생 인증', async () => {
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
            
            if (user) {
                this.currentUser = user;
                this.currentUserType = 'student';
                this._setCache(cacheKey, user, 600000); // 10분 캐시
                
                // 로그인 이벤트 발생
                this._dispatchEvent('user_authenticated', { user, userType: 'student' });
            }
            
            return { data: user, error: null };
        }, { name, birthDate });
    }

    async authenticateAdmin(code) {
        try {
            const config = await this._waitForConfig();
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
                
                // 관리자 로그인 이벤트 발생
                this._dispatchEvent('admin_authenticated', { user: adminUser });
                
                return { success: true, user: adminUser };
            }

            return result;
        } catch (error) {
            this._logError('관리자 인증', error);
            return { success: false, message: '관리자 인증 중 오류가 발생했습니다.' };
        }
    }

    logout() {
        this.currentUser = null;
        this.currentUserType = null;
        this._clearCache();
        
        // 모든 실시간 구독 해제
        for (const [key, subscription] of this.realtimeSubscriptions) {
            subscription.unsubscribe();
        }
        this.realtimeSubscriptions.clear();
        
        // 로그아웃 이벤트 발생
        this._dispatchEvent('user_logout', {});
        
        this._logSuccess('로그아웃');
    }

    // ===================
    // 학생 관련 기능들
    // ===================

    async getStudentById(studentId) {
        const cacheKey = this._getCacheKey('student_by_id', { studentId });
        const cached = this._getCache(cacheKey);
        if (cached) return cached;
        
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

        if (result.success && result.data) {
            this._setCache(cacheKey, result.data, 300000); // 5분 캐시
        }

        return result.success ? result.data : null;
    }

    async getStudentBudgetStatus(studentId) {
        const cacheKey = this._getCacheKey('student_budget', { studentId });
        const cached = this._getCache(cacheKey);
        if (cached) return cached;
        
        const result = await this.safeApiCall('학생 예산 상태 조회', async () => {
            const client = await this.ensureClient();
            
            const student = await this.getStudentById(studentId);
            if (!student) {
                throw new Error('학생 정보를 찾을 수 없습니다');
            }

            const budgetResult = await client
                .from('student_budgets')
                .select('*')
                .eq('user_id', studentId);

            const planResult = await client
                .from('lesson_plans')
                .select('status')
                .eq('user_id', studentId);

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

            const budgetStatus = {
                allocated: allocated,
                used: usedBudget,
                remaining: Math.max(0, allocated - usedBudget),
                field: student.field,
                lessonPlanStatus: lessonPlanStatus,
                canApplyForEquipment: canApplyForEquipment
            };
            
            this._setCache(cacheKey, budgetStatus, 60000); // 1분 캐시 (자주 변경됨)
            return budgetStatus;
        }

        if (result.is406Error) {
            return result.data;
        }

        return null;
    }

    // ===================
    // 헬스 체크 및 모니터링
    // ===================

    async healthCheck() {
        try {
            const connectionTest = await this.testConnection();
            const settings = await this.getSystemSettings();
            
            return {
                status: connectionTest.success ? 'healthy' : 'unhealthy',
                connection: connectionTest.success,
                systemSettings: Object.keys(settings).length,
                timestamp: new Date().toISOString(),
                errorStats: this.errorStats,
                cacheSize: this.cache.size,
                realtimeSubscriptions: this.realtimeSubscriptions.size,
                error: connectionTest.success ? null : connectionTest.message
            };
        } catch (error) {
            this._logError('헬스 체크', error);
            return {
                status: 'error',
                connection: false,
                error: error.message,
                timestamp: new Date().toISOString()
            };
        }
    }

    async testConnection() {
        return await this.safeApiCall('연결 테스트', async () => {
            const client = await this.ensureClient();
            return await client
                .from('system_settings')
                .select('setting_key')
                .limit(1);
        });
    }

    _startConnectionMonitoring() {
        // 5분마다 연결 상태 확인
        setInterval(async () => {
            try {
                const health = await this.healthCheck();
                if (health.status !== 'healthy') {
                    console.warn('⚠️ 연결 상태 이상:', health);
                    this._dispatchEvent('connection_issue', health);
                }
            } catch (error) {
                console.error('연결 모니터링 오류:', error);
            }
        }, 300000); // 5분
    }

    // ===================
    // 유틸리티 함수들
    // ===================

    _delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    _dispatchEvent(type, detail = {}) {
        const event = new CustomEvent(type, { detail });
        this.eventBus.dispatchEvent(event);
        
        // 전역 이벤트도 발생
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent(`supabase_${type}`, { detail }));
        }
    }

    addEventListener(type, callback) {
        this.eventBus.addEventListener(type, callback);
    }

    removeEventListener(type, callback) {
        this.eventBus.removeEventListener(type, callback);
    }

    _logError(operation, error, context = {}) {
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
    }

    _logSuccess(operation, data = null, duration = null) {
        const config = window.CONFIG;
        if (config?.DEV?.ENABLE_CONSOLE_LOGS) {
            let message = `✅ ${operation} 성공`;
            if (duration) message += ` (${duration}ms)`;
            console.log(message, data ? data : '');
        }
    }

    // ===================
    // 기존 API 호환성 메서드들 (다른 파일들이 사용)
    // ===================

    // 수업계획 관련
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
    }

    async saveLessonPlan(studentId, planData, isDraft = false) {
        // 캐시 무효화
        this._clearCache('lesson_plan');
        this._clearCache('student_budget');
        
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

            const existingResult = await client
                .from('lesson_plans')
                .select('id')
                .eq('user_id', studentId);

            if (existingResult.data && existingResult.data.length > 0) {
                return await client
                    .from('lesson_plans')
                    .update(lessonPlanData)
                    .eq('user_id', studentId)
                    .select();
            } else {
                return await client
                    .from('lesson_plans')
                    .insert([lessonPlanData])
                    .select();
            }
        }, { studentId, isDraft });

        return result;
    }

    async canEditLessonPlan() {
        const result = await this.safeApiCall('수업계획 수정 가능 여부 확인', async () => {
            const settings = await this.getSystemSettings();
            
            if (settings.test_mode || settings.ignore_deadline) {
                return { data: true, error: null };
            }

            const deadline = new Date(`${settings.lesson_plan_deadline} 23:59:59`);
            const now = new Date();
            return { data: now <= deadline, error: null };
        });

        return result.success ? result.data : true;
    }

    // 신청 관련
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
    }

    async addApplication(studentId, itemData) {
        // 캐시 무효화
        this._clearCache('student_applications');
        this._clearCache('student_budget');
        
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
    }

    // 시스템 설정
    async getSystemSettings() {
        const cacheKey = this._getCacheKey('system_settings');
        const cached = this._getCache(cacheKey);
        if (cached) return cached;
        
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

            this._setCache(cacheKey, settings, 300000); // 5분 캐시
            return settings;
        }

        // 기본 설정 반환
        const config = await this._waitForConfig();
        return config?.APP?.DEFAULT_SYSTEM_SETTINGS || {
            test_mode: false,
            lesson_plan_deadline: '2024-12-31',
            ignore_deadline: false
        };
    }

    // 관리자 기능들 (기존 코드와 호환성 유지)
    async getAllLessonPlans() {
        const result = await this.safeApiCall('모든 수업계획 조회', async () => {
            const client = await this.ensureClient();
            return await client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });
        });

        return result.success ? (result.data || []) : [];
    }

    async getPendingLessonPlans() {
        const result = await this.safeApiCall('대기 중인 수업계획 조회', async () => {
            const client = await this.ensureClient();
            return await client
                .from('lesson_plans')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .eq('status', 'submitted')
                .is('approved_at', null)
                .order('submitted_at', { ascending: true });
        });

        return result.success ? (result.data || []) : [];
    }

    async approveLessonPlan(studentId) {
        // 캐시 무효화
        this._clearCache('lesson_plan');
        this._clearCache('student_budget');
        
        return await this.safeApiCall('수업계획 승인', async () => {
            const client = await this.ensureClient();
            const now = new Date().toISOString();
            
            const planResult = await client
                .from('lesson_plans')
                .update({
                    status: 'approved',
                    approved_at: now,
                    approved_by: this.currentUser?.id
                })
                .eq('user_id', studentId)
                .select();

            if (planResult.error) {
                return { data: null, error: planResult.error };
            }

            const student = await this.getStudentById(studentId);
            if (!student) {
                return { data: null, error: new Error('학생 정보를 찾을 수 없습니다.') };
            }

            const budgetSettingsResult = await client
                .from('budget_settings')
                .select('*')
                .eq('field', student.field)
                .eq('is_active', true);

            if (budgetSettingsResult.data && budgetSettingsResult.data.length > 0) {
                const settings = budgetSettingsResult.data[0];
                const allocatedBudget = Math.min(
                    student.total_lessons * settings.per_lesson_amount,
                    settings.max_budget_limit
                );

                const budgetData = {
                    user_id: studentId,
                    field: student.field,
                    allocated_budget: allocatedBudget,
                    used_budget: 0,
                    lesson_plan_id: planResult.data[0].id
                };

                const existingBudgetResult = await client
                    .from('student_budgets')
                    .select('id')
                    .eq('user_id', studentId);

                if (existingBudgetResult.data && existingBudgetResult.data.length > 0) {
                    await client
                        .from('student_budgets')
                        .update(budgetData)
                        .eq('user_id', studentId);
                } else {
                    await client
                        .from('student_budgets')
                        .insert([budgetData]);
                }

                return {
                    data: {
                        approved: true,
                        budgetInfo: {
                            allocated: allocatedBudget
                        }
                    },
                    error: null
                };
            }

            return { data: { approved: true }, error: null };
        }, { studentId });
    }

    async rejectLessonPlan(studentId, reason) {
        // 캐시 무효화
        this._clearCache('lesson_plan');
        
        return await this.safeApiCall('수업계획 반려', async () => {
            const client = await this.ensureClient();
            
            return await client
                .from('lesson_plans')
                .update({
                    status: 'rejected',
                    rejection_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('user_id', studentId)
                .select();
        }, { studentId, reason });
    }

    // 기타 관리자 기능들
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

        const config = await this._waitForConfig();
        return config?.APP?.DEFAULT_BUDGET_SETTINGS || {};
    }

    async updateFieldBudgetSettings(field, settings) {
        // 캐시 무효화
        this._clearCache('budget_settings');
        
        return await this.safeApiCall('분야별 예산 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
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

            if (existingResult.data && existingResult.data.length > 0) {
                return await client
                    .from('budget_settings')
                    .update(updateData)
                    .eq('field', field)
                    .select();
            } else {
                return await client
                    .from('budget_settings')
                    .insert([{ ...updateData, is_active: true }])
                    .select();
            }
        }, { field, settings });
    }

    async getBudgetOverviewStats() {
        const result = await this.safeApiCall('예산 현황 통계 조회', async () => {
            const client = await this.ensureClient();
            
            const budgetResult = await client
                .from('student_budgets')
                .select('allocated_budget');
            
            const approvedResult = await client
                .from('requests')
                .select('price')
                .in('status', ['approved', 'purchased', 'completed']);
            
            const purchasedResult = await client
                .from('requests')
                .select('price')
                .in('status', ['purchased', 'completed']);
            
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
    }

    async getStats() {
        const result = await this.safeApiCall('일반 통계 조회', async () => {
            const client = await this.ensureClient();
            
            const applicantResult = await client
                .from('requests')
                .select('user_id')
                .not('user_id', 'is', null);
            
            const pendingResult = await client
                .from('requests')
                .select('id', { count: 'exact' })
                .eq('status', 'pending');
            
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
    }

    async searchApplications(searchTerm = '') {
        const result = await this.safeApiCall('신청 내역 검색', async () => {
            const client = await this.ensureClient();
            
            let query = client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(
                        id,
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });
            
            if (searchTerm && searchTerm.trim()) {
                query = query.ilike('user_profiles.name', `%${searchTerm.trim()}%`);
            }
            
            return query;
        }, { searchTerm });

        return result.success ? (result.data || []) : [];
    }

    async updateItemStatus(requestId, status, reason = null) {
        // 캐시 무효화
        this._clearCache('applications');
        this._clearCache('student_budget');
        
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
    }

    async prepareExportData() {
        const result = await this.safeApiCall('내보내기 데이터 준비', async () => {
            const client = await this.ensureClient();
            return await client
                .from('requests')
                .select(`
                    *,
                    user_profiles!inner(
                        name,
                        field,
                        sejong_institute
                    )
                `)
                .order('created_at', { ascending: false });
        });

        if (result.success) {
            return (result.data || []).map(item => ({
                '신청일': new Date(item.created_at).toLocaleDateString('ko-KR'),
                '학생명': item.user_profiles.name,
                '세종학당': item.user_profiles.sejong_institute,
                '분야': item.user_profiles.field,
                '교구명': item.item_name,
                '사용목적': item.purpose,
                '가격': item.price,
                '구매방식': this.getPurchaseMethodText(item.purchase_type),
                '상태': this.getStatusText(item.status),
                '구매링크': item.purchase_link || '',
                '반려사유': item.rejection_reason || ''
            }));
        }

        return [];
    }

    async updateSystemSetting(key, value) {
        // 캐시 무효화
        this._clearCache('system_settings');
        
        return await this.safeApiCall('시스템 설정 업데이트', async () => {
            const client = await this.ensureClient();
            
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
                return await client
                    .from('system_settings')
                    .update(updateData)
                    .eq('setting_key', key)
                    .select();
            } else {
                return await client
                    .from('system_settings')
                    .insert([updateData])
                    .select();
            }
        }, { key, value });
    }

    async toggleTestMode() {
        const settings = await this.getSystemSettings();
        const newMode = !settings.test_mode;
        
        const result = await this.updateSystemSetting('test_mode', newMode);
        
        if (result.success) {
            return newMode;
        }
        
        return settings.test_mode;
    }

    async getReceiptByRequestId(requestId) {
        const result = await this.safeApiCall('영수증 조회', async () => {
            const client = await this.ensureClient();
            
            const receiptResult = await client
                .from('receipts')
                .select(`
                    *,
                    requests!inner(
                        item_name,
                        price
                    ),
                    user_profiles!inner(
                        name
                    )
                `)
                .eq('request_id', requestId);
            
            if (receiptResult.data && receiptResult.data.length > 0) {
                const receipt = receiptResult.data[0];
                return {
                    data: {
                        ...receipt,
                        item_name: receipt.requests.item_name,
                        student_name: receipt.user_profiles.name,
                        total_amount: receipt.requests.price
                    },
                    error: null
                };
            }
            
            return { data: null, error: null };
        }, { requestId });

        return result.success ? result.data : null;
    }

    // 유틸리티 메서드들 (기존 코드와 호환성)
    getStatusClass(status) {
        const statusMap = {
            'pending': 'warning',
            'approved': 'success', 
            'rejected': 'danger',
            'purchased': 'info',
            'completed': 'info'
        };
        return statusMap[status] || 'secondary';
    }

    getStatusText(status) {
        const statusMap = {
            'pending': '검토 중',
            'approved': '승인됨',
            'rejected': '반려됨',
            'purchased': '구매완료',
            'completed': '구매완료'
        };
        return statusMap[status] || status;
    }

    getPurchaseMethodClass(method) {
        return method === 'offline' ? 'offline' : 'online';
    }

    getPurchaseMethodText(method) {
        return method === 'offline' ? '오프라인' : '온라인';
    }
}

// 싱글톤 인스턴스 생성 및 전역 접근
const supabaseManager = new SupabaseManager();

// 기존 코드와의 호환성을 위해 SupabaseAPI로도 접근 가능
if (typeof window !== 'undefined') {
    window.SupabaseAPI = supabaseManager;
    window.SupabaseManager = supabaseManager;
}

// 즉시 초기화 시작
supabaseManager.initialize().catch(error => {
    console.error('Supabase 초기화 실패:', error);
});

console.log('🚀 Supabase Manager v3.0 로드됨 (통합 버전)');