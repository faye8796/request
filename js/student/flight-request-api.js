// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.2.1
// 🆕 v8.2.1: 현지 활동기간 관리 API 기능 추가
// 🛠️ 여권 수정 관련 기능 점검 및 수정 완료
// 🔧 API 초기화 타이밍, 상태 변수 관리, 에러 처리 강화
// passport-info 기능 완전 통합 버전

class FlightRequestAPI {
    constructor() {
        this.user = null;
        this.supabase = null;
        this.core = null;
        this.storageUtils = null;
        this.isInitialized = false;
        
        // 🛠️ v8.8.0: 초기화 상태 추적 강화
        this.initializationAttempts = 0;
        this.maxInitializationAttempts = 5;
        
        this.initializationPromise = this.initialize();
    }

    // 🚀 v8.4.1: 퍼블릭 Storage 최적화된 연동
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.2.1 초기화 시작 (현지 활동기간 관리 API 기능 추가)...');
            
            // SupabaseCore v1.0.1 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            console.log('✅ FlightRequestAPI v8.2.1 초기화 완료 - 현지 활동기간 관리 API 기능 추가');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🔧 v8.4.1: SupabaseCore v1.0.1 최적화된 연결
    async connectToSupabaseCore() {
        try {
            // 이미 연결되어 있으면 스킵
            if (this.core && this.core.isInitialized && this.supabase) {
                console.log('✅ SupabaseCore 이미 연결됨');
                return;
            }

            // window.SupabaseAPI.core 확인
            if (window.SupabaseAPI?.core) {
                const core = window.SupabaseAPI.core;
                
                // 초기화 확인 및 대기
                if (!core.isInitialized) {
                    console.log('⏳ SupabaseCore 초기화 대기 중...');
                    const initialized = await core.ensureInitialized();
                    if (!initialized) {
                        throw new Error('SupabaseCore 초기화 실패');
                    }
                }

                this.core = core;
                this.supabase = core.getClient();
                console.log('✅ SupabaseCore v1.0.1 연결 성공');
                return;
            }

            // 폴백: 기존 window.SupabaseCore 확인
            if (window.SupabaseCore) {
                console.log('🔄 기존 SupabaseCore 사용 (폴백)');
                
                if (!window.SupabaseCore._initialized) {
                    await window.SupabaseCore.init();
                }

                this.supabase = window.SupabaseCore.client;
                
                if (!this.supabase) {
                    throw new Error('SupabaseCore 클라이언트를 찾을 수 없습니다');
                }

                console.log('✅ 기존 SupabaseCore 연결 성공');
                return;
            }

            // 마지막 시도: 직접 대기
            console.log('⏳ SupabaseCore 로딩 대기 중...');
            const startTime = Date.now();
            const timeout = 5000; // 5초로 단축

            while (Date.now() - startTime < timeout) {
                if (window.SupabaseAPI?.core?.isInitialized) {
                    this.core = window.SupabaseAPI.core;
                    this.supabase = this.core.getClient();
                    console.log('✅ SupabaseCore v1.0.1 대기 후 연결 성공');
                    return;
                }

                if (window.SupabaseCore?._initialized && window.SupabaseCore.client) {
                    this.supabase = window.SupabaseCore.client;
                    console.log('✅ 기존 SupabaseCore 대기 후 연결 성공');
                    return;
                }

                await new Promise(resolve => setTimeout(resolve, 100));
            }

            throw new Error('SupabaseCore 연결 타임아웃');

        } catch (error) {
            console.error('❌ SupabaseCore 연결 실패:', error);
            throw error;
        }
    }

    // StorageUtils 연결 (선택적)
    async connectToStorageUtils() {
        try {
            if (window.StorageUtils) {
                this.storageUtils = window.StorageUtils;
                console.log('✅ StorageUtils 연결 성공');
            } else {
                console.log('ℹ️ StorageUtils 없음 (선택적 기능, 계속 진행)');
                this.storageUtils = null;
            }
        } catch (error) {
            console.warn('⚠️ StorageUtils 연결 실패 (선택적 기능, 계속 진행):', error);
            this.storageUtils = null;
        }
    }

    // 🛠️ v8.8.0: 강화된 초기화 보장 (재시도 로직 개선)
    async ensureInitialized() {
        if (this.isInitialized && (this.core?.isInitialized || this.supabase)) {
            return true;
        }

        console.log('🔄 [API디버그] v8.2.1 FlightRequestAPI 초기화 보장 중...');

        try {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize();
            }

            await this.initializationPromise;
            
            if (!this.isInitialized && this.initializationAttempts < this.maxInitializationAttempts) {
                // 🛠️ v8.8.0: 재시도 로직 개선
                this.initializationAttempts++;
                console.log(`🔄 [API디버그] v8.2.1: 초기화 재시도 ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
                
                // 재시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.initializationPromise = this.initialize();
                await this.initializationPromise;
            }

            if (!this.isInitialized) {
                throw new Error(`API 초기화 실패 (${this.initializationAttempts}회 시도 후)`);
            }

            console.log('✅ [API디버그] v8.2.1: API 초기화 보장 완료');
            return this.isInitialized;
        } catch (error) {
            console.error('❌ [API디버그] v8.2.1: 초기화 보장 실패:', error);
            throw error;
        }
    }

    // 🔧 v8.4.1: 강화된 사용자 정보 조회 (상세한 디버깅 로그)
    async getCurrentUser() {
        try {
            console.log('🔍 [디버그] getCurrentUser() 시작...');
            await this.ensureInitialized();

            // 이미 사용자 정보가 있으면 반환
            if (this.user) {
                console.log('✅ [디버그] 캐시된 사용자 정보 사용:', {
                    id: this.user.id,
                    email: this.user.email,
                    name: this.user.name
                });
                return this.user;
            }

            console.log('🔍 [디버그] localStorage에서 사용자 정보 조회 중...');

            // localStorage 전체 확인
            const allLocalStorageKeys = Object.keys(localStorage);
            console.log('🔍 [디버그] localStorage 키 목록:', allLocalStorageKeys);

            // currentStudent 확인
            const currentStudentData = localStorage.getItem('currentStudent');
            console.log('🔍 [디버그] currentStudent 원본 데이터:', currentStudentData);

            if (currentStudentData) {
                try {
                    const studentData = JSON.parse(currentStudentData);
                    console.log('🔍 [디버그] 파싱된 studentData:', {
                        전체: studentData,
                        id: studentData?.id,
                        email: studentData?.email,
                        name: studentData?.name,
                        id타입: typeof studentData?.id,
                        id길이: studentData?.id?.length
                    });

                    if (studentData?.id) {
                        // 🔧 v8.4.1: 사용자 ID 유효성 검증 강화
                        if (typeof studentData.id !== 'string' || studentData.id.length < 10) {
                            console.warn('⚠️ [디버그] 의심스러운 사용자 ID 형식:', studentData.id);
                        }

                        this.user = { 
                            id: studentData.id, 
                            email: studentData.email || 'no-email',
                            name: studentData.name || 'no-name'
                        };
                        
                        console.log('✅ [디버그] localStorage에서 사용자 정보 설정 완료:', {
                            id: this.user.id,
                            email: this.user.email,
                            name: this.user.name,
                            id검증: this.user.id.includes('-') ? 'UUID형식' : '기타형식'
                        });
                        return this.user;
                    } else {
                        console.error('❌ [디버그] studentData.id가 없음:', studentData);
                    }
                } catch (parseError) {
                    console.error('❌ [디버그] localStorage 파싱 오류:', parseError);
                    console.error('❌ [디버그] 파싱 실패한 데이터:', currentStudentData);
                }
            } else {
                console.error('❌ [디버그] currentStudent 데이터 없음');
            }

            // 🔧 v8.4.1: 다른 인증 소스도 확인 (폴백)
            console.log('🔍 [디버그] 대체 인증 소스 확인 중...');
            
            // userInfo, userProfile 등 다른 키 확인
            const alternativeKeys = ['userInfo', 'userProfile', 'user', 'currentUser'];
            for (const key of alternativeKeys) {
                const altData = localStorage.getItem(key);
                if (altData) {
                    console.log(`🔍 [디버그] 대체 키 '${key}' 발견:`, altData);
                    try {
                        const parsedAlt = JSON.parse(altData);
                        if (parsedAlt?.id) {
                            console.log(`✅ [디버그] 대체 키 '${key}'에서 사용자 ID 발견:`, parsedAlt.id);
                        }
                    } catch (e) {
                        console.log(`⚠️ [디버그] 대체 키 '${key}' 파싱 실패`);
                    }
                }
            }

            throw new Error('localStorage에서 유효한 사용자 정보를 찾을 수 없습니다');

        } catch (error) {
            console.error('❌ [디버그] getCurrentUser() 실패:', error);
            throw error;
        }
    }

    // 사용자 프로필 정보 가져오기
    async getUserProfile() {
        try {
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                const result = await this.core.select('user_profiles', '*', { id: this.user.id });
                
                if (!result.success) {
                    throw new Error(result.error);
                }

                return result.data?.length > 0 ? result.data[0] : null;
            }

            // 폴백: 직접 supabase 사용
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select('*')
                .eq('id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                throw error;
            }

            return data;
        } catch (error) {
            console.error('사용자 프로필 조회 실패:', error);
            throw error;
        }
    }

    // === 🆕 v8.2.1: 현지 활동기간 관리 API 기능 ===

    /**
     * 사용자의 현지 활동기간 정보를 user_profiles 테이블에 업데이트
     * @param {Object} activityData - 활동기간 데이터
     * @param {string} activityData.actualArrivalDate - 현지 도착일 (YYYY-MM-DD)
     * @param {string} activityData.actualWorkEndDate - 학당 근무 종료일 (YYYY-MM-DD)
     * @param {number} activityData.actualWorkDays - 계산된 활동일수
     * @param {number} activityData.minimumRequiredDays - 최소 요구 활동일 (선택적, 기본값: 180)
     * @returns {Object} API 응답 결과
     */
    async updateUserProfileActivityDates(activityData) {
        try {
            console.log('🗓️ [활동기간API] updateUserProfileActivityDates() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 🔍 입력 데이터 검증
            if (!activityData) {
                throw new Error('활동기간 데이터가 없습니다');
            }

            if (!activityData.actualArrivalDate || !activityData.actualWorkEndDate) {
                throw new Error('현지 도착일과 학당 근무 종료일을 모두 입력해주세요');
            }

            // 🔍 데이터 검증 로그
            console.log('🗓️ [활동기간API] 입력 데이터 검증:', {
                userId: this.user.id,
                userName: this.user.name,
                actualArrivalDate: activityData.actualArrivalDate,
                actualWorkEndDate: activityData.actualWorkEndDate,
                actualWorkDays: activityData.actualWorkDays,
                minimumRequiredDays: activityData.minimumRequiredDays || 180
            });

            // 🗓️ 업데이트할 데이터 준비
            const updateData = {
                actual_arrival_date: activityData.actualArrivalDate,
                actual_work_end_date: activityData.actualWorkEndDate,
                actual_work_days: activityData.actualWorkDays || 0,
                minimum_required_days: activityData.minimumRequiredDays || 180,
                updated_at: new Date().toISOString()
            };

            console.log('🗓️ [활동기간API] user_profiles 업데이트 데이터:', updateData);

            // 🗓️ SupabaseCore 사용 (가능하면)
            if (this.core?.update) {
                console.log('🗓️ [활동기간API] SupabaseCore로 업데이트 시도...');
                const result = await this.core.update('user_profiles', updateData, { 
                    auth_user_id: this.user.id 
                });
                
                if (!result.success) {
                    console.error('❌ [활동기간API] SupabaseCore 업데이트 실패:', result.error);
                    throw new Error(result.error);
                }

                console.log('✅ [활동기간API] SupabaseCore 업데이트 성공:', result.data[0]);
                return {
                    success: true,
                    data: result.data[0],
                    message: '활동기간 정보가 성공적으로 업데이트되었습니다'
                };
            }

            // 🗓️ 폴백: 직접 supabase 사용
            console.log('🗓️ [활동기간API] 직접 Supabase로 업데이트 시도...');
            const { data, error } = await this.supabase
                .from('user_profiles')
                .update(updateData)
                .eq('auth_user_id', this.user.id)
                .select()
                .single();

            if (error) {
                console.error('❌ [활동기간API] 직접 Supabase 업데이트 실패:', error);
                throw error;
            }

            console.log('✅ [활동기간API] 직접 Supabase 업데이트 성공:', data);

            return {
                success: true,
                data: data,
                message: '활동기간 정보가 성공적으로 업데이트되었습니다'
            };

        } catch (error) {
            console.error('❌ [활동기간API] updateUserProfileActivityDates() 실패:', error);
            
            // 🗓️ 에러 메시지 개선
            let enhancedError = error;
            if (error.message) {
                if (error.message.includes('사용자 정보')) {
                    enhancedError = new Error('사용자 인증이 만료되었습니다. 페이지를 새로고침 후 다시 시도해주세요.');
                } else if (error.message.includes('auth_user_id')) {
                    enhancedError = new Error('사용자 프로필을 찾을 수 없습니다. 관리자에게 문의해주세요.');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    enhancedError = new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
                }
            }
            
            return {
                success: false,
                error: enhancedError.message,
                originalError: error.message
            };
        }
    }

    /**
     * 현재 사용자의 활동기간 정보 조회
     * @returns {Object} 사용자의 활동기간 정보
     */
    async getUserProfileActivityDates() {
        try {
            console.log('🗓️ [활동기간API] getUserProfileActivityDates() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 🗓️ 활동기간 관련 컬럼만 조회
            const selectColumns = [
                'actual_arrival_date',
                'actual_work_end_date', 
                'actual_work_days',
                'minimum_required_days',
                'dispatch_start_date',
                'dispatch_end_date',
                'dispatch_duration',
                'updated_at'
            ].join(', ');

            console.log('🗓️ [활동기간API] 조회할 컬럼:', selectColumns);

            // 🗓️ SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                console.log('🗓️ [활동기간API] SupabaseCore로 조회 시도...');
                const result = await this.core.select('user_profiles', selectColumns, { 
                    auth_user_id: this.user.id 
                });
                
                if (!result.success) {
                    if (result.error.includes('PGRST116')) {
                        console.log('📅 [활동기간API] 사용자 프로필 없음');
                        return null;
                    }
                    throw new Error(result.error);
                }

                const profileData = result.data?.length > 0 ? result.data[0] : null;
                console.log('✅ [활동기간API] SupabaseCore 조회 성공:', profileData);
                return profileData;
            }

            // 🗓️ 폴백: 직접 supabase 사용
            console.log('🗓️ [활동기간API] 직접 Supabase로 조회 시도...');
            const { data, error } = await this.supabase
                .from('user_profiles')
                .select(selectColumns)
                .eq('auth_user_id', this.user.id)
                .single();

            if (error && error.code !== 'PGRST116') {
                console.error('❌ [활동기간API] 직접 Supabase 조회 실패:', error);
                throw error;
            }

            console.log('✅ [활동기간API] 직접 Supabase 조회 성공:', data);
            return data;

        } catch (error) {
            console.error('❌ [활동기간API] getUserProfileActivityDates() 실패:', error);
            throw error;
        }
    }

    /**
     * 사용자별 최소 요구 활동일 조회
     * @param {string} userId - 사용자 ID (선택적, 기본값: 현재 사용자)
     * @returns {number} 최소 요구 활동일
     */
    async getRequiredActivityDays(userId = null) {
        try {
            console.log('🗓️ [활동기간API] getRequiredActivityDays() 시작...');
            
            const targetUserId = userId || this.user?.id;
            if (!targetUserId) {
                await this.getCurrentUser();
                if (!this.user?.id) {
                    throw new Error('사용자 정보가 없습니다');
                }
            }

            // 🗓️ 사용자 프로필에서 설정된 최소 요구일 조회
            const profileData = await this.getUserProfileActivityDates();
            
            if (profileData && profileData.minimum_required_days) {
                console.log('✅ [활동기간API] 사용자별 설정된 최소 요구일:', profileData.minimum_required_days);
                return profileData.minimum_required_days;
            }

            // 🗓️ 기본값 반환 (180일)
            const defaultRequiredDays = 180;
            console.log('✅ [활동기간API] 기본 최소 요구일 사용:', defaultRequiredDays);
            return defaultRequiredDays;

        } catch (error) {
            console.error('❌ [활동기간API] getRequiredActivityDays() 실패:', error);
            // 에러 발생 시 기본값 반환
            return 180;
        }
    }

    /**
     * 활동기간 데이터의 서버 측 검증
     * @param {Object} activityData - 검증할 활동기간 데이터
     * @returns {Object} 검증 결과
     */
    async validateActivityPeriodAPI(activityData) {
        try {
            console.log('🔍 [활동기간검증] validateActivityPeriodAPI() 시작...');
            
            // 🔍 Utils 함수 활용하여 클라이언트 측 검증
            if (window.FlightRequestUtils && window.FlightRequestUtils.validateActivityDates) {
                const clientValidation = window.FlightRequestUtils.validateActivityDates(
                    activityData.departureDate,
                    activityData.actualArrivalDate,
                    activityData.actualWorkEndDate,
                    activityData.returnDate
                );

                console.log('🔍 [활동기간검증] 클라이언트 측 검증 결과:', clientValidation);

                // 🔍 최소 활동일 요구사항 확인
                const requiredDays = await this.getRequiredActivityDays();
                const minDaysValidation = window.FlightRequestUtils.validateMinimumActivityDays(
                    clientValidation.activityDays,
                    requiredDays
                );

                console.log('🔍 [활동기간검증] 최소 활동일 검증 결과:', minDaysValidation);

                return {
                    success: true,
                    clientValidation: clientValidation,
                    minDaysValidation: minDaysValidation,
                    serverValidation: {
                        requiredDays: requiredDays,
                        canSubmit: clientValidation.valid && minDaysValidation.valid,
                        timestamp: new Date().toISOString()
                    }
                };
            }

            // 🔍 Utils 함수가 없는 경우 기본 검증
            console.warn('⚠️ [활동기간검증] FlightRequestUtils 없음 - 기본 검증 수행');
            
            const arrivalDate = new Date(activityData.actualArrivalDate);
            const workEndDate = new Date(activityData.actualWorkEndDate);
            const activityDays = Math.ceil((workEndDate - arrivalDate) / (1000 * 60 * 60 * 24)) + 1;
            
            const requiredDays = await this.getRequiredActivityDays();
            const isValid = activityDays >= requiredDays;

            return {
                success: true,
                basicValidation: {
                    valid: isValid,
                    activityDays: activityDays,
                    requiredDays: requiredDays,
                    message: isValid ? '활동 기간이 요구사항을 충족합니다' : `최소 ${requiredDays}일이 필요합니다 (현재: ${activityDays}일)`
                }
            };

        } catch (error) {
            console.error('❌ [활동기간검증] validateActivityPeriodAPI() 실패:', error);
            return {
                success: false,
                error: error.message,
                canSubmit: false
            };
        }
    }

    /**
     * 활동기간 관련 종합 디버깅 정보
     * @param {Object} activityData - 디버깅할 활동기간 데이터 (선택적)
     * @returns {Object} 디버깅 정보
     */
    async debugActivityPeriod(activityData = null) {
        console.log('🔍 [활동기간디버그] debugActivityPeriod() 시작...');
        
        const debug = {
            timestamp: new Date().toISOString(),
            apiVersion: 'v8.2.1',
            user: this.user,
            inputData: activityData,
            databaseData: null,
            validationResults: null,
            utilsAvailable: !!window.FlightRequestUtils,
            errors: []
        };

        try {
            // 1. 사용자 정보 확인
            if (!this.user) {
                await this.getCurrentUser();
            }
            debug.user = this.user;

            // 2. 데이터베이스에서 현재 활동기간 정보 조회
            try {
                debug.databaseData = await this.getUserProfileActivityDates();
                console.log('🔍 [활동기간디버그] DB 조회 결과:', debug.databaseData);
            } catch (dbError) {
                debug.errors.push(`DB 조회 실패: ${dbError.message}`);
            }

            // 3. 입력 데이터가 있으면 검증 수행
            if (activityData) {
                try {
                    debug.validationResults = await this.validateActivityPeriodAPI(activityData);
                    console.log('🔍 [활동기간디버그] 검증 결과:', debug.validationResults);
                } catch (validationError) {
                    debug.errors.push(`검증 실패: ${validationError.message}`);
                }
            }

            // 4. Utils 함수 가용성 확인
            if (window.FlightRequestUtils) {
                debug.utilsInfo = {
                    hasCalculateActivityDays: typeof window.FlightRequestUtils.calculateActivityDays === 'function',
                    hasValidateActivityDates: typeof window.FlightRequestUtils.validateActivityDates === 'function',
                    hasValidateMinimumActivityDays: typeof window.FlightRequestUtils.validateMinimumActivityDays === 'function'
                };
            }

            console.log('✅ [활동기간디버그] 디버깅 완료:', debug);
            return debug;

        } catch (error) {
            console.error('❌ [활동기간디버그] debugActivityPeriod() 실패:', error);
            debug.errors.push(`전체 디버깅 실패: ${error.message}`);
            return debug;
        }
    }

    // === 🛠️ v8.8.0: 강화된 PASSPORT INFO 기능 ===

    // 🛠️ v8.8.0: 개선된 여권정보 조회 (에러 처리 강화)
    async getPassportInfo() {
        try {
            console.log('🔍 [여권디버그] v8.8.0 getPassportInfo() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) {
                console.log('🔍 [여권디버그] 사용자 정보 없음, getCurrentUser() 호출...');
                await this.getCurrentUser();
            }
            
            if (!this.user?.id) {
                console.error('❌ [여권디버그] 사용자 ID 없음:', this.user);
                throw new Error('사용자 정보가 없습니다');
            }

            console.log('🔍 [여권디버그] 여권정보 조회 대상 사용자:', {
                id: this.user.id,
                email: this.user.email,
                name: this.user.name
            });

            // 🛠️ v8.8.0: 데이터베이스 쿼리 실행 전 확인
            console.log('🔍 [여권디버그] Supabase 클라이언트 상태 확인...');
            console.log('🔍 [여권디버그] core 사용 가능:', !!this.core?.select);
            console.log('🔍 [여권디버그] supabase 클라이언트 사용 가능:', !!this.supabase);

            let queryResult = null;

            // SupabaseCore 사용 (가능하면)
            if (this.core?.select) {
                console.log('🔍 [여권디버그] SupabaseCore로 조회 시도...');
                const result = await this.core.select('passport_info', '*', { user_id: this.user.id });
                
                console.log('🔍 [여권디버그] SupabaseCore 조회 결과:', {
                    success: result.success,
                    dataLength: result.data?.length,
                    error: result.error,
                    rawResult: result
                });
                
                if (!result.success) {
                    if (result.error.includes('PGRST116')) {
                        console.log('✅ [여권디버그] 데이터 없음 (PGRST116)');
                        return null; // 데이터 없음
                    }
                    console.error('❌ [여권디버그] SupabaseCore 조회 오류:', result.error);
                    throw new Error(result.error);
                }

                queryResult = result.data?.length > 0 ? result.data[0] : null;
            } else {
                // 폴백: 직접 supabase 사용
                console.log('🔍 [여권디버그] 직접 Supabase 클라이언트로 조회 시도...');
                console.log('🔍 [여권디버그] 쿼리 조건 - user_id:', this.user.id);
                
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .select('*')
                    .eq('user_id', this.user.id)
                    .single();

                console.log('🔍 [여권디버그] 직접 Supabase 조회 결과:', {
                    data: data,
                    error: error,
                    errorCode: error?.code,
                    errorMessage: error?.message
                });

                if (error && error.code !== 'PGRST116') {
                    console.error('❌ [여권디버그] 직접 Supabase 조회 오류:', error);
                    throw error;
                }

                queryResult = data;
            }

            // 🛠️ v8.8.0: 조회 결과 상세 분석
            if (queryResult) {
                console.log('✅ [여권디버그] v8.8.0 여권정보 조회 성공:', {
                    id: queryResult.id,
                    user_id: queryResult.user_id,
                    passport_number: queryResult.passport_number,
                    name_english: queryResult.name_english,
                    hasImage: !!queryResult.image_url,
                    created_at: queryResult.created_at,
                    사용자ID일치: queryResult.user_id === this.user.id
                });

                // 🛠️ v8.8.0: 사용자 ID 불일치 검증
                if (queryResult.user_id !== this.user.id) {
                    console.error('❌ [여권디버그] 사용자 ID 불일치 감지!', {
                        현재사용자ID: this.user.id,
                        여권정보사용자ID: queryResult.user_id
                    });
                }
            } else {
                console.log('❌ [여권디버그] 여권정보 없음 - 신규 등록 필요');
            }

            return queryResult;

        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 getPassportInfo() 전체 실패:', {
                error: error,
                message: error.message,
                stack: error.stack,
                userId: this.user?.id,
                userName: this.user?.name
            });
            throw error;
        }
    }

    // 여권정보 확인 (존재 여부만 확인)
    async checkPassportInfo() {
        try {
            console.log('🔍 [여권디버그] v8.8.0 checkPassportInfo() 시작...');
            const passportInfo = await this.getPassportInfo();
            const exists = !!passportInfo;
            console.log('🔍 [여권디버그] v8.8.0 checkPassportInfo() 결과:', exists);
            return exists;
        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 checkPassportInfo() 실패:', error);
            return false;
        }
    }

    // 🛠️ v8.8.0: 강화된 여권정보 저장 (에러 처리 개선)
    async savePassportInfo(passportData, imageFile = null) {
        try {
            console.log('🔍 [여권디버그] v8.8.0 savePassportInfo() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            // 기존 정보 확인
            let existingInfo = null;
            try {
                existingInfo = await this.getPassportInfo();
                console.log('🔍 [여권디버그] v8.8.0: 기존 정보 확인:', !!existingInfo);
            } catch (error) {
                console.warn('⚠️ [여권디버그] v8.8.0: 기존 정보 확인 실패 (신규 등록으로 처리):', error);
                existingInfo = null;
            }
            
            let imageUrl = existingInfo?.image_url;

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                console.log('🔍 [여권디버그] v8.8.0: 새 이미지 업로드 시작...');
                
                // 기존 이미지 삭제 (가능하면)
                if (imageUrl && this.storageUtils) {
                    try {
                        const filePath = this.storageUtils.extractFilePathFromUrl(
                            imageUrl, 
                            this.storageUtils.BUCKETS.PASSPORTS
                        );
                        if (filePath) {
                            await this.deleteFile('passports', filePath);
                            console.log('✅ [여권디버그] v8.8.0: 기존 이미지 삭제 성공');
                        }
                    } catch (deleteError) {
                        console.warn('⚠️ [여권디버그] v8.8.0: 기존 이미지 삭제 실패 (계속 진행):', deleteError);
                    }
                }
                
                // 새 이미지 업로드
                imageUrl = await this.uploadPassportImage(imageFile);
                console.log('✅ [여권디버그] v8.8.0: 새 이미지 업로드 성공:', imageUrl);
            }

            const dataToSave = {
                user_id: this.user.id,
                passport_number: passportData.passport_number,
                name_english: passportData.name_english,
                issue_date: passportData.issue_date,
                expiry_date: passportData.expiry_date,
                image_url: imageUrl,
                updated_at: new Date().toISOString()
            };

            console.log('🔍 [여권디버그] v8.8.0: 저장할 데이터:', dataToSave);

            let result;
            let isUpdate = false;

            if (existingInfo) {
                // 수정
                console.log('🔍 [여권디버그] v8.8.0: 기존 정보 수정 모드');
                isUpdate = true;
                result = await this.updateData('passport_info', dataToSave, { id: existingInfo.id });
            } else {
                // 생성
                console.log('🔍 [여권디버그] v8.8.0: 신규 정보 생성 모드');
                isUpdate = false;
                result = await this.insertData('passport_info', dataToSave);
            }

            console.log('✅ [여권디버그] v8.8.0: 저장 성공:', { result, isUpdate });
            return { data: result, isUpdate: isUpdate };
        } catch (error) {
            console.error('❌ [여권디버그] v8.8.0 savePassportInfo() 실패:', error);
            
            // 🛠️ v8.8.0: 에러 처리 개선 - 구체적인 에러 메시지
            let enhancedError = error;
            if (error.message) {
                if (error.message.includes('사용자 정보')) {
                    enhancedError = new Error('사용자 인증이 만료되었습니다. 페이지를 새로고침 후 다시 시도해주세요.');
                } else if (error.message.includes('duplicate') || error.message.includes('unique')) {
                    enhancedError = new Error('이미 등록된 여권번호입니다.');
                } else if (error.message.includes('upload') || error.message.includes('storage')) {
                    enhancedError = new Error('이미지 업로드 중 오류가 발생했습니다. 파일 크기와 형식을 확인해주세요.');
                } else if (error.message.includes('network') || error.message.includes('fetch')) {
                    enhancedError = new Error('네트워크 연결을 확인하고 다시 시도해주세요.');
                }
            }
            
            throw enhancedError;
        }
    }

    // 🌐 v8.4.1: 퍼블릭 Storage 최적화 여권 이미지 업로드
    async uploadPassportImage(imageFile) {
        try {
            // 단순한 파일명 (퍼블릭 Storage이므로 복잡한 패턴 불필요)
            const fileName = `passport_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            console.log('📁 여권 이미지 업로드:', fileName);
            return await this.uploadFile('passports', fileName, imageFile, { upsert: true });
        } catch (error) {
            console.error('여권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 🛠️ v8.8.0: 개선된 여권 만료일 검증
    validateExpiryDate(expiryDate) {
        if (!expiryDate) {
            return { valid: false, message: '여권 만료일을 입력해주세요.' };
        }

        try {
            const today = new Date();
            const expiry = new Date(expiryDate);
            const sixMonthsFromNow = new Date();
            sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

            // 날짜 유효성 검사
            if (isNaN(expiry.getTime())) {
                return { valid: false, message: '올바른 날짜 형식이 아닙니다.' };
            }

            if (expiry < today) {
                return { valid: false, message: '여권이 이미 만료되었습니다. 새로운 여권을 발급받아주세요.' };
            }

            if (expiry < sixMonthsFromNow) {
                const remainingDays = Math.floor((expiry - today) / (1000 * 60 * 60 * 24));
                return { 
                    valid: true, 
                    warning: `⚠️ 여권 만료일이 6개월 이내입니다. (${remainingDays}일 남음) 파견 전 여권 갱신을 권장합니다.` 
                };
            }

            return { valid: true, message: '여권 만료일이 유효합니다.' };
        } catch (error) {
            console.error('여권 만료일 검증 오류:', error);
            return { valid: false, message: '만료일 검증 중 오류가 발생했습니다.' };
        }
    }

    // === FLIGHT REQUEST 기능 ===

    // 🔧 v8.7.1: 406 오류 수정 - .single() 문제 해결
    async getExistingRequest() {
        try {
            console.log('🔍 [API디버그] getExistingRequest() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            console.log('🔍 [API디버그] 항공권 신청 조회 대상 사용자:', this.user.id);

            // 🔧 v8.7.1: .single() 대신 일반 조회 사용하여 406 오류 해결
            const { data, error } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('user_id', this.user.id)
                .order('created_at', { ascending: false })
                .limit(1);

            if (error) {
                console.error('❌ [API디버그] 항공권 신청 조회 오류:', error);
                throw error;
            }

            // 결과 배열에서 첫 번째 요소 반환 (없으면 null)
            const result = data && data.length > 0 ? data[0] : null;
            
            console.log('✅ [API디버그] 항공권 신청 조회 완료:', {
                resultCount: data?.length || 0,
                hasResult: !!result,
                requestId: result?.id,
                status: result?.status
            });

            return result;

        } catch (error) {
            console.error('❌ [API디버그] getExistingRequest() 실패:', error);
            return null;
        }
    }

    // 🆕 v8.2.1: 현지 활동기간 데이터 포함 항공권 신청 생성
    async createFlightRequest(requestData, imageFile) {
        try {
            console.log('🆕 [항공권신청] v8.2.1 createFlightRequest() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let imageUrl = null;

            // 이미지 업로드
            if (imageFile) {
                imageUrl = await this.uploadFlightImage(imageFile);
            }

            const dataToSave = {
                user_id: this.user.id,
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                flight_image_url: imageUrl,
                purchase_link: requestData.purchase_link || null,
                // 🆕 v8.7.1: 가격 정보 추가
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: 'pending'
            };

            console.log('🆕 [항공권신청] v8.2.1 저장할 항공권 데이터:', dataToSave);

            // 🆕 v8.2.1: 항공권 신청 데이터 저장
            const flightRequestResult = await this.insertData('flight_requests', dataToSave);
            console.log('✅ [항공권신청] v8.2.1 항공권 신청 저장 성공:', flightRequestResult);

            // 🆕 v8.2.1: 활동기간 데이터가 있으면 user_profiles도 업데이트
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                console.log('🗓️ [항공권신청] v8.2.1 활동기간 데이터도 함께 저장...');
                
                const activityData = {
                    actualArrivalDate: requestData.actualArrivalDate,
                    actualWorkEndDate: requestData.actualWorkEndDate,
                    actualWorkDays: requestData.actualWorkDays || 0,
                    minimumRequiredDays: requestData.minimumRequiredDays || 180
                };

                try {
                    const activityUpdateResult = await this.updateUserProfileActivityDates(activityData);
                    console.log('✅ [항공권신청] v8.2.1 활동기간 업데이트 성공:', activityUpdateResult);
                } catch (activityError) {
                    console.warn('⚠️ [항공권신청] v8.2.1 활동기간 업데이트 실패 (항공권 신청은 성공):', activityError);
                    // 활동기간 업데이트 실패해도 항공권 신청은 성공으로 처리
                }
            }

            return flightRequestResult;

        } catch (error) {
            console.error('❌ [항공권신청] v8.2.1 createFlightRequest() 실패:', error);
            throw error;
        }
    }

    // 🌐 v8.4.1: 퍼블릭 Storage 최적화 항공권 이미지 업로드
    async uploadFlightImage(imageFile) {
        try {
            // 단순한 파일명 (퍼블릭 Storage이므로 폴더 구조 불필요)
            const fileName = `flight_${this.user.id}_${Date.now()}.${imageFile.name.split('.').pop()}`;
            console.log('📁 항공권 이미지 업로드:', fileName);
            return await this.uploadFile('flight-images', fileName, imageFile);
        } catch (error) {
            console.error('항공권 이미지 업로드 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.2.1: 현지 활동기간 데이터 포함 항공권 신청 수정
    async updateFlightRequest(requestId, requestData, imageFile = null) {
        try {
            console.log('🔄 [항공권신청] v8.2.1 updateFlightRequest() 시작...');
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            let updateData = {
                purchase_type: requestData.purchase_type,
                departure_date: requestData.departure_date,
                return_date: requestData.return_date,
                departure_airport: requestData.departure_airport,
                arrival_airport: requestData.arrival_airport,
                purchase_link: requestData.purchase_link || null,
                // 🆕 v8.7.1: 가격 정보 추가
                ticket_price: requestData.ticket_price || null,
                currency: requestData.currency || 'KRW',
                price_source: requestData.price_source || null,
                status: requestData.status || 'pending',
                updated_at: new Date().toISOString(),
                version: (requestData.version || 0) + 1
            };

            // 새 이미지가 있으면 업로드
            if (imageFile) {
                updateData.flight_image_url = await this.uploadFlightImage(imageFile);
            }

            console.log('🔄 [항공권신청] v8.2.1 업데이트할 항공권 데이터:', updateData);

            // 복잡한 조건이 있는 업데이트는 직접 supabase 사용
            const { data, error } = await this.supabase
                .from('flight_requests')
                .update(updateData)
                .eq('id', requestId)
                .eq('user_id', this.user.id)
                .in('status', ['pending', 'rejected'])
                .select()
                .single();

            if (error) throw error;
            
            console.log('✅ [항공권신청] v8.2.1 항공권 신청 수정 성공:', data);

            // 🆕 v8.2.1: 활동기간 데이터가 있으면 user_profiles도 업데이트
            if (requestData.actualArrivalDate && requestData.actualWorkEndDate) {
                console.log('🗓️ [항공권신청] v8.2.1 활동기간 데이터도 함께 업데이트...');
                
                const activityData = {
                    actualArrivalDate: requestData.actualArrivalDate,
                    actualWorkEndDate: requestData.actualWorkEndDate,
                    actualWorkDays: requestData.actualWorkDays || 0,
                    minimumRequiredDays: requestData.minimumRequiredDays || 180
                };

                try {
                    const activityUpdateResult = await this.updateUserProfileActivityDates(activityData);
                    console.log('✅ [항공권신청] v8.2.1 활동기간 업데이트 성공:', activityUpdateResult);
                } catch (activityError) {
                    console.warn('⚠️ [항공권신청] v8.2.1 활동기간 업데이트 실패 (항공권 수정은 성공):', activityError);
                    // 활동기간 업데이트 실패해도 항공권 수정은 성공으로 처리
                }
            }

            return data;
        } catch (error) {
            console.error('❌ [항공권신청] v8.2.1 updateFlightRequest() 실패:', error);
            throw error;
        }
    }

    // 🗑️ v8.7.2: 항공권 신청 삭제 (삭제하고 재신청 버튼용)
    async deleteFlightRequest(requestId) {
        try {
            console.log('🗑️ [API디버그] v8.2.1 deleteFlightRequest() 시작...', requestId);
            await this.ensureInitialized();
            
            if (!this.user) await this.getCurrentUser();
            
            if (!this.user?.id) {
                throw new Error('사용자 정보가 없습니다');
            }

            if (!requestId) {
                throw new Error('삭제할 신청 ID가 없습니다');
            }

            // 1. 먼저 해당 신청 정보를 조회하여 권한 및 상태 확인
            const { data: existingRequest, error: fetchError } = await this.supabase
                .from('flight_requests')
                .select('*')
                .eq('id', requestId)
                .eq('user_id', this.user.id) // 본인 신청만 삭제 가능
                .single();

            if (fetchError) {
                console.error('❌ [API디버그] v8.2.1 삭제 대상 신청 조회 실패:', fetchError);
                throw new Error('삭제할 신청을 찾을 수 없습니다');
            }

            if (!existingRequest) {
                throw new Error('삭제할 신청이 존재하지 않거나 권한이 없습니다');
            }

            console.log('🔍 [API디버그] v8.2.1 삭제 대상 신청 정보:', {
                id: existingRequest.id,
                status: existingRequest.status,
                user_id: existingRequest.user_id,
                hasImage: !!existingRequest.flight_image_url
            });

            // 2. 삭제 가능한 상태인지 확인 (pending, rejected만 삭제 가능)
            if (!['pending', 'rejected'].includes(existingRequest.status)) {
                throw new Error(`${existingRequest.status} 상태의 신청은 삭제할 수 없습니다`);
            }

            // 3. 관련 이미지 파일이 있으면 삭제 시도 (실패해도 계속 진행)
            if (existingRequest.flight_image_url) {
                try {
                    console.log('🗑️ [API디버그] v8.2.1 관련 이미지 파일 삭제 시도:', existingRequest.flight_image_url);
                    
                    // URL에서 파일 경로 추출
                    const urlParts = existingRequest.flight_image_url.split('/');
                    const fileName = urlParts[urlParts.length - 1];
                    
                    if (fileName && fileName.includes('flight_')) {
                        await this.deleteFile('flight-images', fileName);
                        console.log('✅ [API디버그] v8.2.1 관련 이미지 파일 삭제 성공');
                    }
                } catch (imageDeleteError) {
                    console.warn('⚠️ [API디버그] v8.2.1 이미지 파일 삭제 실패 (계속 진행):', imageDeleteError);
                    // 이미지 삭제 실패는 치명적이지 않으므로 계속 진행
                }
            }

            // 4. 데이터베이스에서 신청 레코드 삭제
            console.log('🗑️ [API디버그] v8.2.1 데이터베이스에서 신청 레코드 삭제 시도...');
            const { error: deleteError } = await this.supabase
                .from('flight_requests')
                .delete()
                .eq('id', requestId)
                .eq('user_id', this.user.id); // 추가 보안을 위한 사용자 ID 확인

            if (deleteError) {
                console.error('❌ [API디버그] v8.2.1 신청 레코드 삭제 실패:', deleteError);
                throw new Error('신청 삭제 중 오류가 발생했습니다: ' + deleteError.message);
            }

            console.log('✅ [API디버그] v8.2.1 항공권 신청 삭제 완료:', {
                requestId: requestId,
                userId: this.user.id,
                status: existingRequest.status
            });

            return {
                success: true,
                deletedRequest: {
                    id: existingRequest.id,
                    status: existingRequest.status,
                    departure_date: existingRequest.departure_date,
                    return_date: existingRequest.return_date
                }
            };

        } catch (error) {
            console.error('❌ [API디버그] v8.2.1 deleteFlightRequest() 실패:', error);
            throw error;
        }
    }

    // === 🌐 v8.4.1: 퍼블릭 Storage 최적화된 데이터 조작 메서드들 ===

    async insertData(table, data) {
        if (this.core?.insert) {
            const result = await this.core.insert(table, data);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data[0];
        }

        // 폴백
        const { data: result, error } = await this.supabase
            .from(table)
            .insert(data)
            .select()
            .single();
        
        if (error) throw error;
        return result;
    }

    async updateData(table, data, filters) {
        if (this.core?.update) {
            const result = await this.core.update(table, data, filters);
            if (!result.success) {
                throw new Error(result.error);
            }
            return result.data[0];
        }

        // 폴백
        let query = this.supabase.from(table).update(data);
        Object.entries(filters).forEach(([key, value]) => {
            query = query.eq(key, value);
        });
        
        const { data: result, error } = await query.select().single();
        if (error) throw error;
        return result;
    }

    // 🌐 v8.4.1: 단순화된 퍼블릭 Storage 업로드
    async uploadFile(bucket, path, file, options = {}) {
        try {
            console.log(`📤 퍼블릭 Storage 업로드: ${bucket}/${path}`);
            
            if (this.core?.uploadFile) {
                const result = await this.core.uploadFile(bucket, path, file, options);
                if (!result.success) {
                    throw new Error(result.error);
                }

                // 공개 URL 생성
                const urlResult = await this.core.getFileUrl(bucket, path);
                if (!urlResult.success) {
                    throw new Error(urlResult.error);
                }

                console.log(`✅ 업로드 성공: ${urlResult.url}`);
                return urlResult.url;
            }

            // 폴백: 직접 Supabase Storage 사용
            const { data, error } = await this.supabase.storage
                .from(bucket)
                .upload(path, file, {
                    cacheControl: '3600',
                    upsert: options.upsert || false,
                    ...options
                });

            if (error) {
                console.error(`❌ Storage 업로드 오류 (${bucket}/${path}):`, error);
                throw error;
            }

            const { data: urlData } = this.supabase.storage
                .from(bucket)
                .getPublicUrl(path);

            console.log(`✅ 퍼블릭 업로드 성공: ${urlData.publicUrl}`);
            return urlData.publicUrl;

        } catch (error) {
            console.error(`❌ 파일 업로드 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    async deleteFile(bucket, path) {
        try {
            if (this.core?.deleteFile) {
                const result = await this.core.deleteFile(bucket, path);
                if (!result.success) {
                    throw new Error(result.error);
                }
                return result;
            }

            // 폴백
            const { error } = await this.supabase.storage
                .from(bucket)
                .remove([path]);

            if (error) throw error;
            return { success: true };
        } catch (error) {
            console.error(`❌ 파일 삭제 실패 (${bucket}/${path}):`, error);
            throw error;
        }
    }

    // === 유틸리티 메서드들 ===

    // 이미지 미리보기 생성
    async createImagePreview(file) {
        try {
            if (this.storageUtils?.createImagePreview) {
                return await this.storageUtils.createImagePreview(file);
            }
            
            // 폴백: 기본 FileReader 사용
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = () => reject(new Error('이미지 미리보기 생성 실패'));
                reader.readAsDataURL(file);
            });
        } catch (error) {
            console.error('이미지 미리보기 생성 실패:', error);
            throw error;
        }
    }

    // 파일 유효성 검증
    validateFile(file, fileType = 'image') {
        try {
            if (this.storageUtils?.validateFile) {
                return this.storageUtils.validateFile(file, fileType);
            }
            
            // 기본 검증
            const maxSize = fileType === 'image' ? 5 * 1024 * 1024 : 10 * 1024 * 1024; // 5MB or 10MB
            const allowedTypes = fileType === 'image' 
                ? ['image/jpeg', 'image/png', 'image/jpg']
                : ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];

            if (file.size > maxSize) {
                throw new Error(`파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다.`);
            }

            if (!allowedTypes.includes(file.type)) {
                throw new Error(`지원하지 않는 파일 형식입니다. (${allowedTypes.join(', ')})`);
            }

            return { isValid: true };
        } catch (error) {
            console.error('파일 검증 실패:', error);
            throw error;
        }
    }

    // 🆕 v8.2.1: 강화된 디버깅 메서드
    getStatus() {
        return {
            version: 'v8.2.1',
            isInitialized: this.isInitialized,
            hasCore: !!this.core,
            hasSupabase: !!this.supabase,
            hasStorageUtils: !!this.storageUtils,
            hasUser: !!this.user,
            coreInitialized: this.core?.isInitialized,
            supabaseAPI: !!window.SupabaseAPI,
            supabaseCore: !!window.SupabaseCore,
            userInfo: this.user ? { 
                id: this.user.id, 
                email: this.user.email, 
                name: this.user.name,
                idLength: this.user.id?.length,
                idType: this.user.id?.includes('-') ? 'UUID' : 'Other'
            } : null,
            storageMode: 'Public Access (No Auth Required)',
            localStorage: {
                currentStudent: !!localStorage.getItem('currentStudent'),
                keys: Object.keys(localStorage).filter(key => key.includes('user') || key.includes('Student'))
            },
            initializationAttempts: this.initializationAttempts,
            maxInitializationAttempts: this.maxInitializationAttempts,
            // 🆕 v8.2.1: 활동기간 관리 관련 상태
            activityPeriodFeatures: {
                hasUtils: !!window.FlightRequestUtils,
                hasCalculateActivityDays: !!(window.FlightRequestUtils?.calculateActivityDays),
                hasValidateActivityDates: !!(window.FlightRequestUtils?.validateActivityDates),
                hasUpdateUserProfileActivityDates: typeof this.updateUserProfileActivityDates === 'function',
                hasGetUserProfileActivityDates: typeof this.getUserProfileActivityDates === 'function',
                hasValidateActivityPeriodAPI: typeof this.validateActivityPeriodAPI === 'function'
            }
        };
    }

    // 🛠️ v8.8.0: 여권정보 디버깅 전용 메서드 (강화)
    async debugPassportInfo() {
        console.log('🔍 [디버그] v8.2.1 여권정보 종합 진단 시작...');
        
        try {
            // 1. 초기화 상태 확인
            console.log('1️⃣ API 초기화 상태:', {
                version: 'v8.2.1',
                isInitialized: this.isInitialized,
                hasSupabase: !!this.supabase,
                hasCore: !!this.core,
                initializationAttempts: this.initializationAttempts
            });

            // 2. 사용자 정보 확인
            await this.getCurrentUser();
            console.log('2️⃣ 사용자 정보:', this.user);

            // 3. 직접 DB 조회
            if (this.supabase && this.user?.id) {
                const { data, error } = await this.supabase
                    .from('passport_info')
                    .select('*')
                    .eq('user_id', this.user.id);

                console.log('3️⃣ 직접 DB 조회 결과:', {
                    data: data,
                    error: error,
                    dataCount: data?.length
                });
            }

            // 4. 여권정보 조회 테스트
            const passportInfo = await this.getPassportInfo();
            console.log('4️⃣ getPassportInfo() 결과:', passportInfo);

            return {
                success: true,
                version: 'v8.2.1',
                userInfo: this.user,
                passportInfo: passportInfo,
                message: 'v8.2.1 디버깅 완료 - 현지 활동기간 관리 기능 포함'
            };

        } catch (error) {
            console.error('❌ v8.2.1 여권정보 디버깅 실패:', error);
            return {
                success: false,
                version: 'v8.2.1',
                error: error.message,
                userInfo: this.user,
                initializationAttempts: this.initializationAttempts
            };
        }
    }
}

// 🔧 v8.2.1: FlightRequestAPI 클래스를 전역 스코프에 노출
window.FlightRequestAPI = FlightRequestAPI;

// 🌐 v8.2.1: 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.2.1 인스턴스 생성 시작 (현지 활동기간 관리 API 기능 추가)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.2.1 인스턴스 생성 완료 - 현지 활동기간 관리 API 기능 추가');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🌐 v8.2.1: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100); // 단축된 대기 시간
    });
} else {
    setTimeout(createFlightRequestAPI, 100); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.2.1 모듈 로드 완료 - 현지 활동기간 관리 API 기능 추가 (user_profiles 테이블 활동기간 컬럼 업데이트, 서버 측 검증, 항공권 신청과 활동기간 통합 저장)');
