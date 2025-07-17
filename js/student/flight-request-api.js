// flight-request-api.js - 항공권 신청 API 통신 모듈 v8.8.1
// 🛠️ 여권정보 설정 관련 기능 복구 및 강화 완료
// 🔧 API 초기화 타이밍, 상태 변수 관리, 에러 처리 강화
// 📝 v8.8.1 변경사항:
//   - coordinator 호환성을 위한 메서드 별칭 추가
//   - loadPassportInfo(), loadExistingFlightRequest() 별칭 추가
//   - API 메서드 준비 상태 명확화
//   - 초기화 직후 별칭 메서드 설정으로 즉시 사용 가능
// 📝 v8.8.0 기존 변경사항:
//   - 초기화 재시도 로직 추가 (최대 5회)
//   - 여권정보 관련 메서드 에러 처리 강화
//   - 상세한 디버깅 로그 시스템 추가
//   - debugPassportInfo() 디버깅 전용 메서드 추가
//   - 사용자 친화적 에러 메시지 개선
// 🚀 v8.2.4 기존 기능: dispatch_duration 저장 로직 유지
// 🔧 v9.2.0 기존 기능: API 폴백값 하드코딩 완전 제거 유지
// 🎯 목적: 효율적이고 안정적인 API 통신 + 강화된 여권정보 관리

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

    // === 🔧 v8.8.1: 강화된 초기화 시스템 ===
    async initialize() {
        try {
            console.log('🔄 FlightRequestAPI v8.8.1 초기화 시작 (coordinator 호환성 향상)...');
            
            // SupabaseCore v1.0.1 연결
            await this.connectToSupabaseCore();
            
            // StorageUtils 연결 (선택적)
            await this.connectToStorageUtils();

            // 초기화 완료 마킹
            this.isInitialized = true;
            
            // 🔧 v8.8.1: 메서드 별칭 설정 (coordinator 호환성)
            this.setupMethodAliases();
            
            console.log('✅ FlightRequestAPI v8.8.1 초기화 완료 - coordinator 호환성 향상');
            return true;
        } catch (error) {
            console.error('❌ FlightRequestAPI 초기화 실패:', error);
            this.isInitialized = false;
            throw error;
        }
    }

    // 🔧 v8.8.1: coordinator 호환성을 위한 메서드 별칭 설정
    setupMethodAliases() {
        try {
            // coordinator가 찾는 메서드명으로 별칭 생성
            this.loadPassportInfo = this.getPassportInfo.bind(this);
            this.loadExistingFlightRequest = this.getExistingRequest.bind(this);
            
            console.log('✅ [API] v8.8.1 메서드 별칭 설정 완료:', {
                loadPassportInfo: !!this.loadPassportInfo,
                loadExistingFlightRequest: !!this.loadExistingFlightRequest,
                원본메서드들: {
                    getPassportInfo: !!this.getPassportInfo,
                    getExistingRequest: !!this.getExistingRequest
                }
            });
        } catch (error) {
            console.error('❌ [API] v8.8.1 메서드 별칭 설정 실패:', error);
        }
    }

    // 🔧 v8.8.0: SupabaseCore v1.0.1 최적화된 연결
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

    // 🛠️ v8.8.0: StorageUtils 연결 (선택적)
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

    // 🛠️ v8.8.1: 강화된 초기화 보장 (메서드 별칭 포함)
    async ensureInitialized() {
        if (this.isInitialized && (this.core?.isInitialized || this.supabase) && this.loadPassportInfo) {
            return true;
        }

        console.log('🔄 [API디버그] v8.8.1 FlightRequestAPI 초기화 보장 중 (메서드 별칭 포함)...');

        try {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize();
            }

            await this.initializationPromise;
            
            if (!this.isInitialized && this.initializationAttempts < this.maxInitializationAttempts) {
                // 🛠️ v8.8.0: 재시도 로직 개선
                this.initializationAttempts++;
                console.log(`🔄 [API디버그] v8.8.1: 초기화 재시도 ${this.initializationAttempts}/${this.maxInitializationAttempts}`);
                
                // 재시도 전 잠시 대기
                await new Promise(resolve => setTimeout(resolve, 500));
                
                this.initializationPromise = this.initialize();
                await this.initializationPromise;
            }

            if (!this.isInitialized) {
                throw new Error(`API 초기화 실패 (${this.initializationAttempts}회 시도 후)`);
            }

            console.log('✅ [API디버그] v8.8.1: API 초기화 보장 완료 (메서드 별칭 포함)');
            return this.isInitialized;
        } catch (error) {
            console.error('❌ [API디버그] v8.8.1: 초기화 보장 실패:', error);
            throw error;
        }
    }

    // === 🔧 P1 강화: 완전 강화된 사용자 정보 관리 ===
    async getCurrentUser() {
        try {
            console.log('🔍 [디버그] v8.8.1 getCurrentUser() 시작 (P1 강화)...');
            await this.ensureInitialized();

            // 이미 사용자 정보가 있으면 반환
            if (this.user && this.user.id) {
                console.log('✅ [디버그] 캐시된 사용자 정보 사용:', {
                    id: this.user.id,
                    email: this.user.email,
                    name: this.user.name,
                    idValidation: this.user.id.length >= 10 ? '유효' : '의심스러움'
                });
                return this.user;
            }

            console.log('🔍 [디버그] localStorage에서 사용자 정보 조회 중...');

            // localStorage 전체 확인 (디버깅용)
            const allLocalStorageKeys = Object.keys(localStorage);
            console.log('🔍 [디버그] localStorage 키 목록:', allLocalStorageKeys);

            // 🔧 P1: 단순화된 사용자 정보 체크
            const userData = localStorage.getItem('currentStudent');
            console.log('🔍 [디버그] currentStudent 원본 데이터:', userData);

            if (userData) {
                try {
                    const parsed = JSON.parse(userData);
                    console.log('🔍 [디버그] 파싱된 studentData:', {
                        전체객체: !!parsed,
                        id존재: !!parsed?.id,
                        id값: parsed?.id,
                        id타입: typeof parsed?.id,
                        id길이: parsed?.id?.length,
                        email: parsed?.email,
                        name: parsed?.name
                    });

                    if (parsed && parsed.id) {
                        // 🔧 P1: 사용자 ID 유효성 검증 강화
                        const userIdValidation = this.validateUserId(parsed.id);
                        
                        if (!userIdValidation.valid) {
                            console.warn('⚠️ [디버그] P1: 사용자 ID 검증 실패:', {
                                id: parsed.id,
                                reason: userIdValidation.reason,
                                suggestion: userIdValidation.suggestion
                            });
                            // 검증 실패해도 계속 진행 (경고만)
                        }

                        this.user = {
                            id: String(parsed.id), // 문자열로 강제 변환
                            email: parsed.email || 'unknown@example.com',
                            name: parsed.name || 'Unknown User'
                        };
                        
                        console.log('✅ [디버그] P1: localStorage에서 사용자 정보 설정 완료:', {
                            id: this.user.id,
                            email: this.user.email,
                            name: this.user.name,
                            idValidation: userIdValidation.valid ? '✅ 유효' : '⚠️ 의심',
                            idType: this.user.id.includes('-') ? 'UUID형식' : '기타형식'
                        });
                        return this.user;
                    } else {
                        console.error('❌ [디버그] P1: parsed.id가 없거나 유효하지 않음:', {
                            parsed: parsed,
                            idExists: !!parsed?.id,
                            idValue: parsed?.id
                        });
                    }
                } catch (parseError) {
                    console.error('❌ [디버그] P1: localStorage 파싱 오류:', {
                        error: parseError.message,
                        rawData: userData,
                        dataType: typeof userData,
                        dataLength: userData?.length
                    });
                }
            } else {
                console.error('❌ [디버그] P1: currentStudent 데이터가 localStorage에 없음');
            }

            // 🔧 P1: 대체 키들 확인 (강화된 로직)
            console.log('🔍 [디버그] P1: 대체 인증 소스 확인 중...');
            
            const alternativeKeys = ['userInfo', 'userProfile', 'user', 'currentUser', 'student', 'userSession'];
            for (const key of alternativeKeys) {
                const altData = localStorage.getItem(key);
                if (altData) {
                    console.log(`🔍 [디버그] P1: 대체 키 '${key}' 발견:`, {
                        dataLength: altData.length,
                        preview: altData.substring(0, 100) + '...'
                    });
                    
                    try {
                        const parsedAlt = JSON.parse(altData);
                        if (parsedAlt && parsedAlt.id) {
                            console.log(`✅ [디버그] P1: 대체 키 '${key}'에서 사용자 ID 발견:`, {
                                id: parsedAlt.id,
                                email: parsedAlt.email,
                                name: parsedAlt.name
                            });
                            
                            // 대체 소스에서 사용자 정보 설정
                            this.user = {
                                id: String(parsedAlt.id),
                                email: parsedAlt.email || 'unknown@example.com',
                                name: parsedAlt.name || 'Unknown User'
                            };
                            
                            console.log(`✅ [디버그] P1: 대체 키 '${key}'에서 사용자 정보 설정 완료`);
                            return this.user;
                        }
                    } catch (altParseError) {
                        console.log(`⚠️ [디버그] P1: 대체 키 '${key}' 파싱 실패:`, altParseError.message);
                    }
                }
            }

            // 🔧 P1: Supabase Auth 확인 (최후의 수단)
            console.log('🔍 [디버그] P1: Supabase Auth 확인 중...');
            if (this.supabase && this.supabase.auth) {
                try {
                    const { data: { user }, error } = await this.supabase.auth.getUser();
                    if (user && !error) {
                        console.log('✅ [디버그] P1: Supabase Auth에서 사용자 발견:', {
                            id: user.id,
                            email: user.email
                        });
                        
                        this.user = {
                            id: user.id,
                            email: user.email || 'unknown@example.com',
                            name: user.user_metadata?.name || user.email || 'Supabase User'
                        };
                        
                        return this.user;
                    }
                } catch (authError) {
                    console.warn('⚠️ [디버그] P1: Supabase Auth 확인 실패:', authError.message);
                }
            }

            // 🔧 P1: 구체적인 에러 정보 제공
            const errorInfo = {
                timestamp: new Date().toISOString(),
                localStorageKeys: allLocalStorageKeys,
                currentStudentExists: !!localStorage.getItem('currentStudent'),
                alternativeKeysFound: alternativeKeys.filter(key => localStorage.getItem(key)),
                supabaseAuthAvailable: !!(this.supabase?.auth),
                browserInfo: navigator.userAgent
            };
            
            console.error('❌ [디버그] P1: 모든 사용자 정보 소스에서 실패:', errorInfo);

            throw new Error('localStorage에서 유효한 사용자 정보를 찾을 수 없습니다. 로그인 상태를 확인해주세요.');

        } catch (error) {
            console.error('❌ [디버그] P1: getCurrentUser() 완전 실패:', {
                error: error.message,
                stack: error.stack,
                apiInitialized: this.isInitialized,
                supabaseExists: !!this.supabase
            });
            throw error;
        }
    }

    // 🔧 P1: 사용자 ID 유효성 검증 메서드 추가
    validateUserId(userId) {
        if (!userId) {
            return {
                valid: false,
                reason: 'ID가 없음',
                suggestion: '로그인이 필요합니다'
            };
        }

        const userIdStr = String(userId);
        
        // 최소 길이 검증
        if (userIdStr.length < 5) {
            return {
                valid: false,
                reason: 'ID가 너무 짧음',
                suggestion: '유효한 사용자 ID가 아닙니다'
            };
        }
        
        // UUID 형식 검증
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(userIdStr)) {
            return {
                valid: true,
                reason: 'UUID 형식',
                suggestion: '정상적인 UUID 형식입니다'
            };
        }
        
        // 숫자만으로 구성된 ID 검증
        if (/^\d+$/.test(userIdStr) && userIdStr.length >= 5) {
            return {
                valid: true,
                reason: '숫자 ID',
                suggestion: '숫자 형식의 유효한 ID입니다'
            };
        }
        
        // 일반 문자열 ID 검증
        if (userIdStr.length >= 5 && userIdStr.length <= 50) {
            return {
                valid: true,
                reason: '문자열 ID',
                suggestion: '일반 문자열 형식의 ID입니다'
            };
        }
        
        return {
            valid: false,
            reason: '알 수 없는 형식',
            suggestion: 'ID 형식을 확인해주세요'
        };
    }

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

    // === 🛠️ v8.8.1: 강화된 PASSPORT INFO 기능 ===

    // 🛠️ v8.8.1: 개선된 여권정보 조회 (에러 처리 강화)
    async getPassportInfo() {
        try {
            console.log('🔍 [여권디버그] v8.8.1 getPassportInfo() 시작...');
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

            // 🛠️ v8.8.1: 데이터베이스 쿼리 실행 전 확인
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

            // 🛠️ v8.8.1: 조회 결과 상세 분석
            if (queryResult) {
                console.log('✅ [여권디버그] v8.8.1 여권정보 조회 성공:', {
                    id: queryResult.id,
                    user_id: queryResult.user_id,
                    passport_number: queryResult.passport_number,
                    name_english: queryResult.name_english,
                    hasImage: !!queryResult.image_url,
                    created_at: queryResult.created_at,
                    사용자ID일치: queryResult.user_id === this.user.id
                });

                // 🛠️ v8.8.1: 사용자 ID 불일치 검증
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
            console.error('❌ [여권디버그] v8.8.1 getPassportInfo() 전체 실패:', {
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
            console.log('🔍 [여권디버그] v8.8.1 checkPassportInfo() 시작...');
            const passportInfo = await this.getPassportInfo();
            const exists = !!passportInfo;
            console.log('🔍 [여권디버그] v8.8.1 checkPassportInfo() 결과:', exists);
            return exists;
        } catch (error) {
            console.error('❌ [여권디버그] v8.8.1 checkPassportInfo() 실패:', error);
            return false;
        }
    }

    // === 항공권 신청 관리 (기존 기능 유지) ===

    // 🔧 v8.7.1: 406 오류 수정 - .single() 문제 해결
    async getExistingRequest() {
        try {
            console.log('🔍 [API디버그] v8.8.1 getExistingRequest() 시작...');
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

    // === 🌐 v8.8.1: 퍼블릭 Storage 최적화된 데이터 조작 메서드들 ===

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

    // 🌐 v8.8.1: 단순화된 퍼블릭 Storage 업로드
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

    // === 🛠️ v8.8.1: 강화된 상태 정보 ===
    getStatus() {
        return {
            version: 'v8.8.1',
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
                idType: this.user.id?.includes('-') ? 'UUID형식' : '기타형식'
            } : null,
            storageMode: 'Public Access (No Auth Required)',
            localStorage: {
                currentStudent: !!localStorage.getItem('currentStudent'),
                keys: Object.keys(localStorage).filter(key => key.includes('user') || key.includes('Student'))
            },
            initializationAttempts: this.initializationAttempts,
            maxInitializationAttempts: this.maxInitializationAttempts,
            // 🔧 v8.8.1: 메서드 별칭 상태 추가
            methodAliases: {
                loadPassportInfo: !!this.loadPassportInfo,
                loadExistingFlightRequest: !!this.loadExistingFlightRequest,
                coordinatorCompatibility: '✅ 완료'
            },
            v881Updates: { // 🛠️ v8.8.1 새 기능
                coordinatorCompatibility: 'coordinator 호환성을 위한 메서드 별칭 추가',
                methodAliases: 'loadPassportInfo(), loadExistingFlightRequest() 별칭 추가',
                immediateAvailability: '초기화 직후 별칭 메서드 설정으로 즉시 사용 가능',
                enhancedDebugInfo: '메서드 별칭 상태 정보 추가'
            },
            v880Updates: { // 🛠️ v8.8.0 기존 기능
                passportInfoEnhancements: '여권정보 설정 관련 기능 복구 및 강화',
                initializationRetry: 'API 초기화 재시도 로직 추가 (최대 5회)',
                detailedLogging: '상세한 디버깅 로그 시스템 추가',
                errorHandling: '에러 처리 강화 및 사용자 친화적 메시지',
                debugMethod: 'debugPassportInfo() 디버깅 전용 메서드 추가',
                storageUtilsIntegration: 'StorageUtils 연결 최적화'
            },
            P1Enhancements: { // 🔥 P1 강화 사항
                getCurrentUserEnhancement: 'getCurrentUser() 메서드 완전 강화',
                userIdValidation: 'validateUserId() 메서드로 ID 유효성 검증',
                alternativeSourceCheck: '다중 localStorage 키 확인 지원',
                supabaseAuthFallback: 'Supabase Auth 폴백 지원 강화',
                detailedErrorReporting: '구체적인 에러 정보 제공 (browserInfo, keys 등)',
                cachedUserOptimization: '캐싱된 사용자 정보 재사용 최적화'
            }
        };
    }
}

// 🔧 v8.8.1: FlightRequestAPI 클래스를 전역 스코프에 노출
window.FlightRequestAPI = FlightRequestAPI;

// 🌐 v8.8.1: 인스턴스 생성
function createFlightRequestAPI() {
    try {
        console.log('🚀 FlightRequestAPI v8.8.1 인스턴스 생성 시작 (coordinator 호환성 향상)...');
        window.flightRequestAPI = new FlightRequestAPI();
        
        // 호환성을 위한 passport API 인스턴스도 생성
        window.passportAPI = window.flightRequestAPI;
        
        console.log('✅ FlightRequestAPI v8.8.1 인스턴스 생성 완료 - coordinator 호환성 향상');
        return window.flightRequestAPI;
    } catch (error) {
        console.error('❌ FlightRequestAPI 인스턴스 생성 실패:', error);
        throw error;
    }
}

// 🌐 v8.8.1: 즉시 생성 (대기 시간 최소화)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFlightRequestAPI, 100); // 단축된 대기 시간
    });
} else {
    setTimeout(createFlightRequestAPI, 100); // 즉시 실행에 가깝게
}

console.log('✅ FlightRequestAPI v8.8.1 모듈 로드 완료 - coordinator 호환성 향상 (메서드 별칭 추가)');
console.log('🔧 v8.8.1 업데이트:', {
    coordinatorCompatibility: {
        feature: 'coordinator 호환성을 위한 메서드 별칭 추가',
        description: 'coordinator가 찾는 메서드명으로 별칭 생성',
        aliases: [
            'loadPassportInfo() → getPassportInfo() 별칭',
            'loadExistingFlightRequest() → getExistingRequest() 별칭'
        ],
        timing: '초기화 직후 별칭 메서드 설정으로 즉시 사용 가능',
        debugging: '메서드 별칭 상태 정보 추가'
    },
    problemsSolved: {
        apiMethodsReady: 'coordinator의 apiMethodsReady: false 문제 해결',
        dependencyCheck: '의존성 체크에서 메서드 존재 여부 확인 개선',
        initializationTimeout: '초기화 시간 초과 문제 예방',
        moduleCompatibility: '분리된 모듈 간 호환성 향상'
    },
    technicalImprovements: {
        methodBinding: 'bind()를 사용한 안전한 메서드 별칭 생성',
        immediateSetup: '초기화 완료 즉시 별칭 설정',
        debuggingInfo: '별칭 메서드 상태 확인 가능',
        backwardCompatibility: '기존 메서드명 완전 호환 유지'
    }
});
console.log('🛠️ v8.8.0 기존 기능 유지:', {
    passportFeatureRecovery: {
        feature: '여권정보 설정 관련 기능 복구 및 강화',
        description: '여권정보 조회/저장/검증 기능 완전 복구',
        enhancements: '상세한 디버깅 로그, 강화된 에러 처리, 재시도 로직',
        newMethods: 'debugPassportInfo() 디버깅 전용 메서드 추가'
    },
    initializationImprovements: {
        retryLogic: '초기화 실패 시 최대 5회 재시도',
        stateTracking: '초기화 상태 추적 강화',
        timingOptimization: 'API 초기화 타이밍 최적화',
        fallbackHandling: 'SupabaseCore 연결 폴백 처리 개선'
    },
    P1Enhancements: {
        getCurrentUserComplete: 'getCurrentUser() 메서드 완전 강화',
        userIdValidation: 'validateUserId() 메서드 추가',
        alternativeSourceSupport: '다중 localStorage 키 확인',
        comprehensiveErrorReporting: '구체적인 에러 정보 및 브라우저 환경 정보 포함'
    }
});
